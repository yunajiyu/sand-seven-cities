// Run: node tests/haemu-scene.test.cjs
// Uses the actual haemu.html script. Checks the dialogue engine: one AI call per action, line-by-line reading,
// ??? name plates, time cards, failure handling, late replies and summary timing.
const assert=require('node:assert/strict');
const {fixture,geminiReplies,test,done}=require('./_haemu-fixture.cjs');
const scene=(o={})=>({lines:[{who:'',text:'복도는 비어 있었다.'},{who:'???',mood:'웃음',text:'신입이야?'},{who:'유민',text:'나 유민. 2병동이야.'}],choices:['인사한다','고개만 끄덕인다','왜 여기 있었는지 묻는다'],place:'hall',met:['유민'],end:false,...o});
const start=f=>{f.run("UI.speed='instant';newGame('서윤')");assert.equal(f.run('G.char.name'),'서윤')};
const readAll=f=>{for(let i=0;i<30&&!f.run('sceneDone()');i++)f.run('advance()')};

(async()=>{
await test('A new game opens on the fixed opening without any AI call or unknown names',async()=>{
  const f=fixture();geminiReplies(f,[]);start(f);
  assert.equal(f.run('sent.length'),0);
  assert.equal(f.run('G.scene.i'),0);assert.equal(f.run('sceneDone()'),false);
  const text=f.run('JSON.stringify(G.scene)');assert.doesNotMatch(text,/유민/,'the opening never names someone the player has not met');
  readAll(f);assert.equal(f.run('sceneDone()'),true);
  assert.match(f.el('choices').innerHTML,/문을 열고 복도를 내다본다/);assert.match(f.el('choices').innerHTML,/직접 쓰기/);
});
await test('Choices stay hidden until the last line is read',async()=>{
  const f=fixture();geminiReplies(f,[]);start(f);f.run('render()');
  assert.equal(f.el('choices').innerHTML,'');
  assert.equal(await f.run("act('아무거나')"),false,'cannot act before reaching the choices');
  assert.equal(f.run('sent.length'),0);
});
await test('One action makes exactly one story call and the reply is shown line by line',async()=>{
  const f=fixture();geminiReplies(f,[scene()]);start(f);readAll(f);
  assert.equal(await f.run('act(G.scene.choices[0])'),true);
  assert.equal(f.run('sent.length'),1);assert.equal(f.run('sent[0].model'),'gemini-3.8-flash');
  assert.equal(f.run('G.scene.lines.length'),3);assert.equal(f.run('G.scene.i'),0);assert.equal(f.run('G.place'),'hall');
  assert.equal(f.el('choices').innerHTML,'');
  f.run('advance()');assert.equal(f.run('G.scene.i'),1);
  readAll(f);assert.match(f.el('choices').innerHTML,/왜 여기 있었는지 묻는다/);
});
await test('The prompt carries the rules, recent scenes and the action, and never the hidden-name answer as known',async()=>{
  const f=fixture();geminiReplies(f,[scene()]);start(f);readAll(f);
  await f.run("act('복도로 나가 본다')");
  const sys=f.run('sent[0].messages[0].content'),user=f.run('sent[0].messages[1].content');
  assert.match(sys,/성인/);assert.match(sys,/성적 묘사/);assert.match(sys,/\?\?\?/);assert.match(sys,/"lines"/);
  assert.match(sys,/유민 \(플레이어는 아직 이름을 모름\)/);
  assert.match(user,/1일째 · 아침/);assert.match(user,/복도로 나가 본다/);assert.match(user,/\[이름을 아는 인물\] \(아직 없음\)/);
});
await test('Name plates show ??? until the scene reveals the name, then the name',async()=>{
  const f=fixture();geminiReplies(f,[scene({met:[]}),scene()]);start(f);readAll(f);
  await f.run("act('a')");f.run('advance()');f.run('advance()');
  assert.equal(f.run('displayWho(G.scene.lines[2].who)'),'???','an AI line that names someone not yet introduced still shows ???');
  assert.equal(f.el('who').textContent,'???');
  readAll(f);await f.run("act('b')");
  assert.deepEqual(f.obj('G.known'),['유민']);assert.equal(f.run('displayWho("유민")'),'유민');
  assert.equal(f.run('displayWho("나")'),'서윤');assert.equal(f.run('displayWho("")'),'');
});
await test('With a typing speed set, the first tap completes the line and the next tap moves on',async()=>{
  const f=fixture();f.run("UI.speed='normal';newGame('서윤')");
  assert.equal(f.run('typing'),true);assert.notEqual(f.el('text').textContent,f.run('G.scene.lines[0].text'));
  f.run('advance()');assert.equal(f.run('typing'),false);assert.equal(f.run('G.scene.i'),0);assert.equal(f.el('text').textContent,f.run('G.scene.lines[0].text'));
  f.run('advance()');assert.equal(f.run('G.scene.i'),1);
});
await test('Malformed replies are cleaned: speaker labels, the player name, quotes, too many choices',async()=>{
  const f=fixture();start(f);
  const sc=f.obj(`normalizeScene({lines:[{who:'지문',text:' 바람이 분다 '},{who:'서윤',text:'안녕'},{who:'「유민」:',text:'「응」'},{who:'아주아주아주긴이름의인물입니다',text:'x'},{text:''},null],choices:['1','2',{text:'3'},'4','5'],place:'nowhere',met:['유민','???','나'],end:'yes'})`);
  assert.deepEqual(sc.lines.map(l=>l.who),['','나','유민','']);assert.equal(sc.lines[0].text,'바람이 분다');assert.equal(sc.lines[2].text,'응');
  assert.equal(sc.choices.length,4);assert.equal(sc.place,'');assert.deepEqual(sc.met,['유민']);assert.equal(sc.end,false);
  assert.equal(f.run('normalizeScene({lines:[]})'),null);
});
await test('A plain-text reply becomes narration instead of being lost, with fallback choices',async()=>{
  const f=fixture();geminiReplies(f,['안개가 짙어졌다.\n\n멀리서 종이 울렸다.']);start(f);readAll(f);
  assert.equal(await f.run("act('기다린다')"),true);
  assert.deepEqual(f.obj('G.scene.lines.map(l=>l.text)'),['안개가 짙어졌다.','멀리서 종이 울렸다.']);
  assert.equal(f.run('G.scene.choices.length'),2);
});
await test('Ending a time slot adds a time card that moves the clock only when it is reached',async()=>{
  const f=fixture();geminiReplies(f,[scene({end:true})]);start(f);readAll(f);
  await f.run("act('a')");
  assert.equal(f.run('G.scene.lines.length'),4);assert.equal(f.run('G.slot'),0,'the clock waits for the card');
  readAll(f);assert.equal(f.run('G.slot'),1);assert.equal(f.el('when').textContent,'1일째 · 오전');
  f.run('G.slot=WORLD.slots.length-1');assert.deepEqual(f.obj('nextTime(1,G.slot)'),{day:2,slot:0});
});
await test('A failed call changes nothing, keeps the choices and does not use an undo slot',async()=>{
  const f=fixture();start(f);readAll(f);
  f.run("SET.keys.gemini='k';SET.roles.story={provider:'gemini',model:'m'};setTimeout=fn=>{fn();return 0};fetch=async()=>({ok:false,status:401,json:async()=>({error:{message:'bad key'}})})");
  const before=f.run('JSON.stringify(G)');
  assert.equal(await f.run("act('a')"),false);
  assert.equal(f.run('JSON.stringify(G)'),before);assert.equal(f.run('busy'),false);assert.equal(f.run('undoSnap'),null);
  assert.match(f.run('notices.at(-1)'),/bad key/);assert.match(f.el('choices').innerHTML,/문을 열고/);
});
await test('Without any AI key the player is told how to connect',async()=>{
  const f=fixture();start(f);readAll(f);f.run('SET.keys={}');
  assert.equal(await f.run("act('a')"),false);assert.match(f.run('notices.at(-1)'),/AI 연결/);
});
await test('A late reply from a game that was replaced is ignored',async()=>{
  const f=fixture();start(f);readAll(f);
  f.run("SET.keys.gemini='k';SET.roles.story={provider:'gemini',model:'m'};var release;fetch=()=>new Promise(r=>{release=()=>r({ok:true,status:200,json:async()=>({choices:[{message:{content:JSON.stringify("+JSON.stringify(scene())+")}}]})})})");
  const pending=f.run("act('a')");f.run("newGame('다른 사람')");f.run('release()');
  assert.equal(await pending,false);assert.equal(f.run('G.char.name'),'다른 사람');assert.equal(f.run('G.recent.length'),0);
});
await test('Backlog records only lines already read, never the rest of the scene',async()=>{
  const f=fixture();geminiReplies(f,[scene()]);start(f);readAll(f);await f.run("act('a')");
  assert.ok(!f.run("G.log.some(e=>/2병동이야/.test(e.text))"));
  readAll(f);assert.ok(f.run("G.log.some(e=>e.who==='유민'&&/2병동이야/.test(e.text))"));
  assert.ok(f.run("G.log.some(e=>e.who==='▶'&&e.text==='a')"));
});
await test('Old scenes are summarized in the background only after enough have piled up',async()=>{
  const f=fixture();const replies=[];for(let i=0;i<9;i++)replies.push(scene({lines:[{who:'',text:'장면 '+i}]}));geminiReplies(f,replies);start(f);
  for(let i=0;i<8;i++){readAll(f);await f.run(`act('행동 ${i}')`)}
  assert.equal(f.run('sent.length'),8,'no summary call while the recent memory is short');
  f.ctx.__replies.unshift(JSON.stringify(scene({lines:[{who:'',text:'장면 8'}]})),'요약: 당신은 섬에 왔다.');
  readAll(f);await f.run("act('행동 8')");await new Promise(r=>setImmediate(r));
  assert.equal(f.run('sent.length'),10);assert.match(f.run('sent[9].messages[0].content'),/줄거리 기록자/);
  assert.equal(f.run('G.summary'),'요약: 당신은 섬에 왔다.');assert.equal(f.run('G.recent.length'),10);
  assert.match(f.run("userPrompt('x')"),/요약: 당신은 섬에 왔다/);
});
done('scene engine');
})().catch(e=>{console.error(e);process.exitCode=1});

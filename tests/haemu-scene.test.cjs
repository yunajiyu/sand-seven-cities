// Run: node tests/haemu-scene.test.cjs
// Uses the actual haemu.html script. Checks the text story engine: one AI call per action, the story log,
// ??? speaker names, time dividers, failure handling, late replies and summary timing.
const assert=require('node:assert/strict');
const {fixture,geminiReplies,test,done}=require('./_haemu-fixture.cjs');
const scene=(o={})=>({lines:[{who:'',text:'복도는 비어 있었다.'},{who:'???',mood:'웃음',text:'신입이야?'},{who:'유민',text:'나 유민. 2병동이야.'}],choices:['인사한다','고개만 끄덕인다','왜 여기 있었는지 묻는다'],place:'hall',met:['유민'],end:false,...o});
const start=f=>{f.run("newGame('서윤')");assert.equal(f.run('G.char.name'),'서윤')};
const logText=f=>f.el('logInner').innerHTML;

(async()=>{
await test('A new game shows the whole fixed opening as text with choices, without any AI call or unknown names',async()=>{
  const f=fixture();geminiReplies(f,[]);start(f);
  assert.equal(f.run('sent.length'),0);
  assert.equal(f.run('G.log.length'),5);assert.match(logText(f),/안개에 반쯤 잠겨/);assert.match(logText(f),/다시 멀어졌다/);
  assert.doesNotMatch(f.run('JSON.stringify(G.log)'),/유민/,'the opening never names someone the player has not met');
  assert.match(f.el('choices').innerHTML,/문을 열고 복도를 내다본다/);assert.match(f.el('choices').innerHTML,/직접 쓰기/);
  assert.equal(f.el('when').textContent,'1일째 · 아침 · 숙소 방');
});
await test('One action makes exactly one story call and the whole scene is added to the story at once',async()=>{
  const f=fixture();geminiReplies(f,[scene()]);start(f);
  assert.equal(await f.run('act(G.scene.choices[0])'),true);
  assert.equal(f.run('sent.length'),1);assert.equal(f.run('sent[0].model'),'gemini-3.8-flash');
  assert.deepEqual(f.obj('G.log.slice(5).map(e=>e.who)'),['▶','','???','유민']);
  assert.equal(f.run('G.place'),'hall');assert.equal(f.el('when').textContent,'1일째 · 아침 · 병동 복도');
  const html=logText(f);
  assert.match(html,/class="act new">문을 열고 복도를 내다본다/);
  assert.match(html,/<span class="w">유민<\/span>「나 유민\. 2병동이야\.」/);
  assert.doesNotMatch(html,/class="narr new">배가 포구에/,'earlier text is not re-animated');
  assert.match(f.el('choices').innerHTML,/왜 여기 있었는지 묻는다/);
});
await test('While waiting, choices disappear and a waiting line is shown',async()=>{
  const f=fixture();start(f);
  f.run("SET.keys.gemini='k';SET.roles.story={provider:'gemini',model:'m'};var release;fetch=()=>new Promise(r=>{release=()=>r({ok:true,status:200,json:async()=>({choices:[{message:{content:JSON.stringify("+JSON.stringify(scene())+")}}]})})})");
  const pending=f.run("act('기다린다')");
  assert.equal(f.el('choices').innerHTML,'');assert.match(logText(f),/class="waiting"/);
  assert.equal(await f.run("act('또 누른다')"),false,'a second action is refused while waiting');
  f.run('release()');assert.equal(await pending,true);assert.doesNotMatch(logText(f),/class="waiting"/);
});
await test('The prompt carries the rules, recent scenes and the action, and marks unmet people as unknown',async()=>{
  const f=fixture();geminiReplies(f,[scene()]);start(f);
  await f.run("act('복도로 나가 본다')");
  const sys=f.run('sent[0].messages[0].content'),user=f.run('sent[0].messages[1].content');
  assert.match(sys,/텍스트 연애 시뮬레이션/);assert.match(sys,/성인/);assert.match(sys,/성적 묘사/);assert.match(sys,/\?\?\?/);assert.match(sys,/"lines"/);
  assert.match(sys,/유민 \(플레이어는 아직 이름을 모름\)/);
  assert.match(user,/1일째 · 아침/);assert.match(user,/복도로 나가 본다/);assert.match(user,/\[이름을 아는 인물\] \(아직 없음\)/);
});
await test('Speaker names stay ??? until the scene reveals the name, and earlier ??? lines stay ???',async()=>{
  const f=fixture();geminiReplies(f,[scene({met:[]}),scene({lines:[{who:'유민',text:'또 보네.'}],met:[]})]);start(f);
  await f.run("act('a')");
  assert.equal(f.run('G.log.at(-1).who'),'???','an AI line that names someone not yet introduced still shows ???');
  assert.doesNotMatch(logText(f),/class="w">유민/);
  f.ctx.__replies.push(JSON.stringify(scene()));
  await f.run("act('b')");await f.run("act('c')");
  assert.deepEqual(f.obj('G.known'),['유민']);assert.equal(f.run('G.log.at(-1).who'),'유민');
  assert.equal(f.run("G.log.filter(e=>e.text==='나 유민. 2병동이야.')[0].who"),'???','the first meeting is kept as it was read');
});
await test('The player speaks under their own name',async()=>{
  const f=fixture();geminiReplies(f,[{lines:[{who:'서윤',text:'안녕하세요.'},{who:'나',text:'잘 부탁드려요.'}],choices:['가','나']}]);start(f);
  await f.run("act('a')");
  assert.deepEqual(f.obj('G.log.slice(-2).map(e=>e.who)'),['나','나']);
  assert.match(logText(f),/class="say me new"><span class="w">서윤<\/span>「잘 부탁드려요\.」/);
});
await test('Malformed replies are cleaned: speaker labels, the player name, quotes, too many choices',async()=>{
  const f=fixture();start(f);
  const sc=f.obj(`normalizeScene({lines:[{who:'지문',text:' 바람이 분다 '},{who:'서윤',text:'안녕'},{who:'「유민」:',text:'「응」'},{who:'아주아주아주긴이름의인물입니다',text:'x'},{text:''},null],choices:['1','2',{text:'3'},'4','5'],place:'nowhere',met:['유민','???','나'],end:'yes'})`);
  assert.deepEqual(sc.lines.map(l=>l.who),['','나','유민','']);assert.equal(sc.lines[0].text,'바람이 분다');assert.equal(sc.lines[2].text,'응');
  assert.equal(sc.choices.length,4);assert.equal(sc.place,'');assert.deepEqual(sc.met,['유민']);assert.equal(sc.end,false);
  assert.equal(f.run('normalizeScene({lines:[]})'),null);
});
await test('A plain-text reply becomes narration instead of being lost, with fallback choices',async()=>{
  const f=fixture();geminiReplies(f,['안개가 짙어졌다.\n\n멀리서 종이 울렸다.']);start(f);
  assert.equal(await f.run("act('기다린다')"),true);
  assert.deepEqual(f.obj('G.log.slice(-2).map(e=>e.text)'),['안개가 짙어졌다.','멀리서 종이 울렸다.']);
  assert.equal(f.run('G.scene.choices.length'),2);
});
await test('Ending a time slot adds a divider and moves the clock, wrapping to the next day',async()=>{
  const f=fixture();geminiReplies(f,[scene({end:true}),scene({end:true})]);start(f);
  await f.run("act('a')");
  assert.deepEqual(f.obj('G.log.at(-1)'),{who:'§',text:'1일째 · 오전'});assert.equal(f.run('G.slot'),1);
  assert.match(logText(f),/class="time new">1일째 · 오전/);
  f.run('G.slot=WORLD.slots.length-1');await f.run("act('b')");
  assert.equal(f.run('G.day'),2);assert.equal(f.run('G.slot'),0);assert.equal(f.run('G.log.at(-1).text'),'2일째 · 아침');
});
await test('A failed call changes nothing, keeps the choices and does not use an undo slot',async()=>{
  const f=fixture();start(f);
  f.run("SET.keys.gemini='k';SET.roles.story={provider:'gemini',model:'m'};setTimeout=fn=>{fn();return 0};fetch=async()=>({ok:false,status:401,json:async()=>({error:{message:'bad key'}})})");
  const before=f.run('JSON.stringify(G)');
  assert.equal(await f.run("act('a')"),false);
  assert.equal(f.run('JSON.stringify(G)'),before);assert.equal(f.run('busy'),false);assert.equal(f.run('undoSnap'),null);
  assert.match(f.run('notices.at(-1)'),/bad key/);assert.match(f.el('choices').innerHTML,/문을 열고/);
});
await test('Without any AI key the player is told how to connect',async()=>{
  const f=fixture();start(f);f.run('SET.keys={}');
  assert.equal(await f.run("act('a')"),false);assert.match(f.run('notices.at(-1)'),/AI 연결/);
});
await test('A late reply from a game that was replaced is ignored',async()=>{
  const f=fixture();start(f);
  f.run("SET.keys.gemini='k';SET.roles.story={provider:'gemini',model:'m'};var release;fetch=()=>new Promise(r=>{release=()=>r({ok:true,status:200,json:async()=>({choices:[{message:{content:JSON.stringify("+JSON.stringify(scene())+")}}]})})})");
  const pending=f.run("act('a')");f.run("newGame('다른 사람')");f.run('release()');
  assert.equal(await pending,false);assert.equal(f.run('G.char.name'),'다른 사람');assert.equal(f.run('G.recent.length'),0);
});
await test('Free writing sends the typed text as the action and hides the choices while typing',async()=>{
  const f=fixture();geminiReplies(f,[scene()]);start(f);
  f.run('openFree()');assert.match(f.el('choices').innerHTML,/freeText/);
  f.run('render()');assert.match(f.el('choices').innerHTML,/freeText/,'a re-render keeps the text box open');
  f.el('freeText').value='  창문을 닫는다 ';await f.run('sendFree()');await new Promise(r=>setImmediate(r));
  assert.equal(f.run("G.log.find(e=>e.who==='▶').text"),'창문을 닫는다');assert.match(f.el('choices').innerHTML,/인사한다/);
});
await test('Old scenes are summarized in the background only after enough have piled up',async()=>{
  const f=fixture();const replies=[];for(let i=0;i<8;i++)replies.push(scene({lines:[{who:'',text:'장면 '+i}]}));geminiReplies(f,replies);start(f);
  for(let i=0;i<8;i++)await f.run(`act('행동 ${i}')`);
  assert.equal(f.run('sent.length'),8,'no summary call while the recent memory is short');
  f.ctx.__replies.push(JSON.stringify(scene({lines:[{who:'',text:'장면 8'}]})),'요약: 당신은 섬에 왔다.');
  await f.run("act('행동 8')");await new Promise(r=>setImmediate(r));
  assert.equal(f.run('sent.length'),10);assert.match(f.run('sent[9].messages[0].content'),/줄거리 기록자/);
  assert.equal(f.run('G.summary'),'요약: 당신은 섬에 왔다.');assert.equal(f.run('G.recent.length'),10);
  assert.match(f.run("userPrompt('x')"),/요약: 당신은 섬에 왔다/);
});
done('text story engine');
})().catch(e=>{console.error(e);process.exitCode=1});

// Run: node tests/lumia-quest.test.cjs
// Uses the actual lumia.html script. Checks the case-solving frame: quests and stages are tracked by code,
// the AI only reports finished quest ids in the same single call, failed rolls never complete anything,
// future stages stay hidden on screen, and saves validate the new fields.
const assert=require('node:assert/strict');
const {fixture,geminiReplies,test,done}=require('./_lumia-fixture.cjs');
const sc=(o={})=>({lines:[{who:'',text:'방 안은 조용했다.'}],choices:['가','나'],place:'',met:[],done:[],clue:'',end:false,...o});
const start=f=>f.run("newGame('서윤')");

(async()=>{
await test('A new game starts at stage 1 with two open quests, shown as a goal bar and a quest list',async()=>{
  const f=fixture();start(f);
  assert.equal(f.run('stageIndex()'),0);assert.deepEqual(f.obj('activeQuests().map(q=>q.id)'),['dorm','meet']);
  assert.deepEqual(f.obj('G.qdone'),[]);assert.deepEqual(f.obj('G.clues'),[]);assert.equal(f.run('G.v'),4);
  assert.match(f.el('goal').innerHTML,/숙소 단말기의 첫 업무 지시를 확인한다/);assert.match(f.el('goal').innerHTML,/외 1/);
  f.run('openQuests()');const html=f.run('modalHTML');
  assert.match(html,/1 \/ 6 단계 · 도착/);assert.match(html,/☐ 숲에서 바람을 일으킨 존재를 마주친다/);
});
await test('The screen never shows later stages, quest answers, or the name of someone not met yet',async()=>{
  const f=fixture();start(f);f.run('openQuests()');const html=f.run('modalHTML');
  assert.doesNotMatch(html,/지워진 이름|손을 잡다|금지 구역|진상|매듭|접근 권한/);assert.match(html,/○ 2\. ？？？/);
  assert.doesNotMatch(html+f.el('goal').innerHTML+f.run('JSON.stringify(G.log)'),/유민|지워진 실험체들의 이름/);
  f.run("G.qdone=['dorm','meet']");f.run('openQuests()');
  assert.match(f.run('modalHTML'),/그 사람이 지워진 기록 이야기에 굳어지는 이유를 알아낸다/,'unmet name shows as 그 사람');
  f.run("G.known=['유민']");f.run('openQuests()');assert.match(f.run('modalHTML'),/유민이 지워진 기록 이야기에 굳어지는 이유/);
});
await test('The AI reports finished quests in the same call; the code logs them and opens the next stage',async()=>{
  const f=fixture();geminiReplies(f,[sc({done:['dorm'],clue:'기록 세 줄이 일부러 비어 있다'}),sc({done:['meet','blank']})]);start(f);
  await f.run("act('단말기를 켠다')");
  assert.equal(f.run('sent.length'),1);assert.deepEqual(f.obj('G.qdone'),['dorm']);assert.deepEqual(f.obj('G.clues'),['기록 세 줄이 일부러 비어 있다']);
  assert.deepEqual(f.obj("G.log.filter(e=>e.who==='📋').map(e=>e.text)"),['✔ 달성 — 숙소 단말기의 첫 업무 지시를 확인한다','＋ 단서 — 기록 세 줄이 일부러 비어 있다']);
  assert.match(f.el('goal').innerHTML,/숲에서 바람을 일으킨/);assert.match(f.el('logInner').innerHTML,/class="quest new">✔ 달성/);
  await f.run("act('인사한다')");
  assert.equal(f.run('stageIndex()'),1,'stage 1 finished; "left" is not open yet so it is ignored');
  assert.deepEqual(f.obj('G.qdone'),['dorm','meet']);assert.equal(f.run('G.log.at(-1).text'),'새 단계 — 2. 지워진 이름');
  assert.match(f.run('questBlock()'),/단계 2\/6 「지워진 이름」\n- blank:.*\n- yumin:/);assert.match(f.run('questBlock()'),/알아낸 단서: 기록/);
});
await test('Unknown or already finished ids are ignored, and a failed roll completes nothing',async()=>{
  const f=fixture();
  const risky=sc({choices:['돌아간다',{text:'기록 보관함을 연다',check:'기록',dc:'보통'}]});
  geminiReplies(f,[risky,sc({done:['dorm','nope','proof'],clue:'보관함이 비어 있다'}),sc({done:['dorm']}),sc({done:['dorm']})]);start(f);
  assert.deepEqual(f.obj("normalizeScene({lines:[{text:'x'}],done:['dorm','nope',3,'dorm','proof','end','meet']}).done"),['dorm','proof','end']);
  await f.run("act('a')");f.run("Math.random=(()=>{const q=[0.01,0.01];return ()=>q.length?q.shift():0.5})()");
  await f.run('pick(1)');assert.deepEqual(f.obj('G.qdone'),[],'a failed check never completes a quest nor adds a clue');assert.deepEqual(f.obj('G.clues'),[]);
  await f.run("act('b')");assert.deepEqual(f.obj('G.qdone'),['dorm']);await f.run("act('c')");assert.deepEqual(f.obj('G.qdone'),['dorm'],'no duplicates');
});
await test('Quests are in the prompt with their conditions, and the truth is only given to the AI',async()=>{
  const f=fixture();geminiReplies(f,[sc()]);start(f);await f.run("act('a')");
  const sys=f.run('sent[0].messages[0].content'),user=f.run('sent[0].messages[1].content');
  assert.match(sys,/지워진 실험체/);assert.match(sys,/지워지는 기록의 진실/);assert.match(sys,/유민은 플레이어의 눈을 피할 대상이 아니라/);assert.match(sys,/"done":\[\]/);
  assert.match(user,/\[지금 풀어야 할 일\]\n단계 1\/6 「도착」\n- dorm: 숙소 단말기의 첫 업무 지시를 확인한다 \(달성 조건:/);
  f.run("G.qdone=QUESTS.map(q=>q.id)");assert.match(f.run('userPrompt("x")'),/모든 일이 끝났다/);assert.match(f.el('goal')?f.run('(renderGoal(),document.getElementById("goal").innerHTML)'):'',/모든 일을 마쳤다/);
});
await test('Saves keep quests and clues; broken quest data is refused',async()=>{
  const f=fixture();geminiReplies(f,[sc({done:['dorm'],clue:'단서'})]);start(f);await f.run("act('a')");
  const good=f.obj('G');
  assert.deepEqual(f.obj(`prepareSavedGame(${JSON.stringify(JSON.stringify(good))}).qdone`),['dorm']);
  for(const bad of [{...good,qdone:['nope']},{...good,qdone:['dorm','dorm']},{...good,qdone:undefined},{...good,clues:[3]},{...good,clues:'x'},{...good,v:2}])
    assert.throws(()=>f.run(`prepareSavedGame(${JSON.stringify(JSON.stringify(bad))})`),e=>/손상|아닙니다/.test(e.message));
});
await test('The quest list is reachable from the menu and from the menu',async()=>{
  const f=fixture();start(f);f.run('openMenu()');assert.match(f.run('modalHTML'),/openQuests\(\)">📋 퀘스트 · 진행도/);
});
done('quest');
})().catch(e=>{console.error(e);process.exitCode=1});

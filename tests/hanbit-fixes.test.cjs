// Run: node tests/hanbit-fixes.test.cjs
// 검사 후 수정: 휴식 호감 구역당 1회 · 키보드 진행 · 사건/대화 중 지도 안내 · AI 대기 중 닫힘 복구 · busy 경합.
const assert=require('node:assert/strict');
const {fixture,geminiReplies,test,done}=require('./_hanbit-fixture.cjs');
function game(){
  const f=fixture();
  f.run(`G=newState('도현');migrate();busy=false;resetQueue();UI.speed='off';render=()=>{};rng=()=>0.99;console.warn=()=>{};aiReady=()=>false;var flush=()=>{while(Q.pending.length)nextLine()}`);
  return f;
}
(async()=>{
await test('Resting raises Yumin\'s affection only once per zone',()=>{
  const {run}=game();
  run("G.comp.yumin={met:true,joined:true,aff:5};G.loc='room';restHere();flush()");
  assert.equal(run('G.comp.yumin.aff'),6);
  run("restHere();flush();restHere();flush()");
  assert.equal(run('G.comp.yumin.aff'),6,'same zone again: no bonus');
  run("G.loc='stairs';restHere();flush()");
  assert.equal(run('G.comp.yumin.aff'),7,'a new zone gives one more');
  run("var s=JSON.parse(JSON.stringify(G));s.zs.room.rested='x'");
  assert.throws(()=>run('prepareSavedGame(JSON.stringify(s))'),/구역 정보/);
});

await test('Dev scene buttons are gone from the menu',()=>{
  const f=game(); f.run('openMenu()');
  assert.doesNotMatch(f.run('modalHTML'),/더미|AI 장면 시험/);
  assert.equal(f.run('typeof demoScene+typeof aiDemo'),'undefinedundefined');
});

await test('Map tap during an open event or talk menu explains itself; talk menu closes and moves',()=>{
  const f=game();
  f.run("G.loc='unit702';G.zs.unit702.seen=true;lookAround();flush()");
  assert.equal(f.run('G.ev'),'unit702');
  f.run("notices.length=0;mapTap('stairs')");
  assert.equal(f.run('G.loc'),'unit702'); assert.match(f.run('notices[0]'),/눈앞의 일/);
  f.run("pick('ev:1');flush()");
  f.run("G.loc='stairs';G.comp.yumin={met:true,joined:true,aff:5};TALK_OPEN='yumin';mapTap('room');flush()");
  assert.equal(f.run('G.loc'),'room');
});

await test('A scene still waiting for the AI is replayed with its default lines after reload',async()=>{
  const f=game();
  f.run("aiReady=()=>true;callAI=()=>new Promise(()=>{});goZone('stairs')");
  assert.ok(f.run('G.fb&&G.fb.length')>0,'fallback lines are stored while the AI is pending');
  f.run("var snap=JSON.stringify(G)");
  f.run("aiReady=()=>false;var g2=prepareSavedGame(snap);openLoadedGame(g2);flush()");
  assert.equal(f.run('G.fb'),null);
  assert.ok(f.run("G.log.some(e=>e.type==='dialog'&&e.who==='yumin')"),'the first-meeting dialogue is not lost');
  f.run("save();var again=prepareSavedGame(localStorage.getItem(SAVE_KEY))");
});

await test('A late AI reply from a replaced game does not clear busy for the new game',async()=>{
  const f=game(); geminiReplies(f,[JSON.stringify([{t:'n',text:'x'}])]);
  f.run("aiReady=()=>true;var _c=callAI;callAI=async(...a)=>{const r=await _c(...a);G=newState('새판');migrate();busy=true;return r}");
  await f.run("aiScene('t',{})");
  assert.equal(f.run('busy'),true,'new game keeps its own busy flag');
});

done();
})();

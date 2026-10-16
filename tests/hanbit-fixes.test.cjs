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

await test('Stricter save validation: duplicate items, odd endings, huge resources, bad zone flags, impossible last-chance flag',()=>{
  const {run}=game();
  run("save();var s=JSON.parse(localStorage.getItem(SAVE_KEY))");
  const bad=m=>assert.throws(()=>run(`var t=JSON.parse(JSON.stringify(s));${m};prepareSavedGame(JSON.stringify(t))`),/손상|올바르지/,m);
  bad("t.items=['map','map']"); bad("t.ending='hacked'"); bad("t.food=100000"); bad("t.maxhp=999");
  bad("t.zs.room.seen='yes'"); bad("t.zs.room.searched=1"); bad("t.last=true");
  assert.doesNotThrow(()=>run("t.ending='dead';t.last=false;prepareSavedGame(JSON.stringify(t))"),'old ending names still load');
  run("var u=JSON.parse(JSON.stringify(s));Object.assign(u,{day:LAST_DAY,slot:3,loc:'gate',route:'rear',items:['gateKey','cutter'],last:true})");
  assert.doesNotThrow(()=>run('prepareSavedGame(JSON.stringify(u))'),'a genuine last chance loads');
});

await test('Custom provider without a server address fails with a clear message',async()=>{
  const f=game();
  f.run("SET.keys.custom='k';SET.roles.story={provider:'custom',model:'m'};SET.baseUrl='';fetch=async()=>{throw new Error('should not be called')}");
  await assert.rejects(()=>f.run("callAIRaw('s','u')"),/서버 주소/);
});

await test('Encounter chance depends on the time of day: safer by day, riskier at night, flashlight helps more at night',()=>{
  const {run}=game();
  run("G.noise.shop=0");
  const at=slot=>{ run(`G.slot=${slot}`); return +run("encounterChance('shop')").toFixed(4) };
  const base=at(2);
  assert.equal(at(0),+(base-0.03).toFixed(4)); assert.equal(at(1),+(base-0.03).toFixed(4)); assert.equal(at(3),+(base+0.08).toFixed(4));
  assert.equal(run("encounterChance('room')"),0,'safe room stays safe');
  run("G.items=['flashlight']");
  assert.equal(at(2),+(base-0.1).toFixed(4)); assert.equal(at(3),+(base+0.08-0.15).toFixed(4));
});

done();
})();

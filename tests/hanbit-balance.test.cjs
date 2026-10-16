// Run: node tests/hanbit-balance.test.cjs
// 난이도 후보 D 적용과 시뮬레이션 보고서에서 나온 규칙 경계 수정.
const assert=require('node:assert/strict');
const {fixture,test,done}=require('./_hanbit-fixture.cjs');
function game(){
  const f=fixture();
  f.run(`G=newState('도현');migrate();busy=false;resetQueue();UI.speed='off';render=()=>{};rng=()=>0.99;console.warn=()=>{};aiReady=()=>false`);
  f.run("var flush=()=>{while(Q.pending.length)nextLine()}");
  return f;
}
(async()=>{
await test('Candidate D values: infection clock 5, one zombie on the roof, and a safe joke gives +1',()=>{
  const {run}=game();
  assert.equal(run('INFECT_SLOTS'),5); assert.equal(run('ZOMBIE_START.roof'),1); assert.equal(run('G.zombies.roof'),1);
  run("rng=()=>0;G.loc='stairs';restHere();flush()"); assert.equal(run('G.infection.left'),4,'5 at the bite, one slot passes');
});

await test('Old saves with an 8-slot infection clock are still accepted',()=>{
  const {run}=game();
  run("G.infection={left:8};save();var s=localStorage.getItem(SAVE_KEY);prepareSavedGame(s)");
  assert.throws(()=>run("var t=JSON.parse(s);t.infection.left=9;prepareSavedGame(JSON.stringify(t))"),/감염/);
});

await test('There is no day limit: the game goes on past day 8 and can still be escaped from',()=>{
  const {run}=game();
  run("G.day=8;G.slot=3;G.food=9;G.water=9;G.loc='room';restHere();flush()");
  assert.equal(run('G.ending'),null); assert.equal(run('G.day'),9); assert.equal(run('G.slot'),0);
  run("G.day=40;G.slot=3;G.loc='garden';G.zs.gate.seen=true;G.route='rear';G.items=['gateKey','cutter'];goZone('gate');flush()");
  assert.equal(run('G.ending'),null); assert.equal(run('G.day'),41);
  run("pick('escape:');flush()"); assert.match(run('G.ending'),/^escape_/);
});

await test('Old saves that stood at the last chance still load and simply continue; the old flag is dropped',()=>{
  const {run}=game();
  run("G.day=8;G.slot=3;G.loc='gate';G.route='rear';G.items=['gateKey','cutter'];save();var s=JSON.parse(localStorage.getItem(SAVE_KEY));s.last=true");
  run("var m=prepareSavedGame(JSON.stringify(s))");
  assert.equal(run('m.last'),undefined); assert.equal(run('m.day'),8);
  run("openLoadedGame(m)"); assert.ok(run("buildChoices().some(c=>c.id==='escape:')"));
});

await test('An old save where a survivor is already a friend does not give the gift again',()=>{
  const {run}=game();
  run("save();var s=JSON.parse(localStorage.getItem(SAVE_KEY));for(const k in s.surv) delete s.surv[k].gift;s.surv.pharm.aff=5;s.surv.guard.aff=1");
  run("var m=prepareSavedGame(JSON.stringify(s))");
  assert.equal(run('m.surv.pharm.gift'),true,'friend: gift counted as received');
  assert.equal(run('m.surv.guard.gift'),false);
});

done();
})();

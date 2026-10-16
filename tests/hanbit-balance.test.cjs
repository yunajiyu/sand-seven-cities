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

await test('Arriving at the exit on the very last action leaves one chance to escape instead of a time-out',()=>{
  const {run,obj}=game();
  run("G.day=LAST_DAY;G.slot=3;G.loc='garden';G.zs.gate.seen=true;G.route='rear';G.items=['gateKey','cutter']");
  run("goZone('gate');flush()");
  assert.equal(run('G.ending'),null); assert.equal(run('G.last'),true);
  assert.deepEqual(obj("buildChoices().map(c=>c.id)"),['escape:']);
  run("pick('escape:');flush()"); assert.match(run('G.ending'),/^escape_/);
});

await test('Without the exit and tools the last action still ends in a time-out',()=>{
  const {run}=game();
  run("G.day=LAST_DAY;G.slot=3;G.loc='garden';G.route='rear';G.items=[]");
  run("goZone('gate');flush()"); assert.equal(run('G.ending'),'last_night'); assert.equal(run('G.last'),false);
});

await test('The last chance is saved, loaded, and old saves without the field get false',()=>{
  const {run}=game();
  run("G.day=LAST_DAY;G.slot=3;G.loc='garden';G.zs.gate.seen=true;G.route='rear';G.items=['gateKey','cutter'];goZone('gate');flush();save();var s=JSON.parse(localStorage.getItem(SAVE_KEY))");
  assert.equal(run('s.last'),true);
  run("openLoadedGame(prepareSavedGame(JSON.stringify(s)))"); assert.equal(run('G.last'),true);
  run("delete s.last;var m=prepareSavedGame(JSON.stringify(s))"); assert.equal(run('m.last'),false);
  assert.throws(()=>run("var t=JSON.parse(JSON.stringify(s));t.last='yes';prepareSavedGame(JSON.stringify(t))"),/시간/);
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

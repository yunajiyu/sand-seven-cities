// Run: node tests/hanbit-events.test.cjs
// 새 구역 사건: 첫 수색 때 한 번, 고를 때까지 다른 행동 잠김, 결과는 코드 확정, 저장 검증.
const assert=require('node:assert/strict');
const {fixture,test,done}=require('./_hanbit-fixture.cjs');

function game(){
  const f=fixture();
  f.run(`G=newState('도현');migrate();busy=false;resetQueue();UI.speed='off';render=()=>{};rng=()=>0.99;console.warn=()=>{};aiReady=()=>false`);
  f.run("var flush=()=>{while(Q.pending.length)nextLine()}; var look=()=>{pick('look:');flush()}; var ch=i=>{pick('ev:'+i);flush()}");
  return f;
}
const at=(zone)=>`G.loc='${zone}';G.zs.${zone}.seen=true;G.zombies.${zone}=0`;
const ZONES7=['unit702','senior','block2','unit2f','gym','trash','boiler'];

(async()=>{
await test('Exactly the seven new zones have an event, each with two options and a fixed result',()=>{
  const {obj}=game();
  const ev=obj('EVENTS');
  assert.deepEqual(Object.keys(ev).sort(),[...ZONES7].sort());
  for(const e of Object.values(ev)){ assert.ok(e.text); assert.equal(e.opts.length,2); for(const o of e.opts){ assert.ok(o.label&&o.text&&o.fx) } }
});

await test('The first search starts the event; only its options are offered until one is chosen',()=>{
  const {run,obj}=game();
  for(const z of ZONES7){
    run(`${at(z)};G.ev=null;G.zs.${z}.searched=false`);
    run('G.noise.'+z+'=0;look()');
    assert.equal(run('G.ev'),z,z+' event opens');
    assert.deepEqual(obj('buildChoices().map(c=>c.id)'),['ev:0','ev:1'],'moves/rest are locked');
    run("pick('move:stairs');pick('look:')"); assert.equal(run('G.loc'),z,'locked actions are ignored');
    run('pick("ev:5");pick("ev:x")'); assert.equal(run('G.ev'),z,'bad option ignored');
    run('ch(0)'); assert.equal(run('G.ev'),null);
    assert.ok(obj('buildChoices().length')>2);
  }
});

await test('The event happens once: searching again or other zones never reopen it',()=>{
  const {run}=game();
  run(`${at('block2')}`); run('look()'); run('ch(1)');
  run('look()'); assert.equal(run('G.ev'),null,'second search has no event');
  run(`${at('shop')}`); run('look()'); assert.equal(run('G.ev'),null,'zones without an event stay plain');
});

await test('Choosing costs no time and the results are applied by code (resources, noise, danger)',()=>{
  const {run}=game();
  run(`${at('boiler')};G.noise.boiler=0;look()`);
  const slot=run('G.slot'), day=run('G.day'), water=run('G.water'), noise=run('G.noise.boiler');
  run('ch(0)');
  assert.equal(run('G.slot'),slot); assert.equal(run('G.day'),day);
  assert.equal(run('G.water'),water+2); assert.equal(run('G.noise.boiler'),noise+3);
  assert.match(run("G.log.filter(l=>l.type==='sys').map(l=>l.text).join('|')"),/물 \+2 · 소음 \+3/);
  run(`${at('unit2f')};look()`);
  const hp=run('G.hp'), z=run('G.zombies.unit2f'), food=run('G.food'), meds=run('G.meds');
  run('ch(0)');
  assert.equal(run('G.hp'),hp-1); assert.equal(run('G.zombies.unit2f'),z+1); assert.equal(run('G.food'),food+1); assert.equal(run('G.meds'),meds+1);
});

await test('A deducting choice never drives resources below zero, and a lethal one can end the game',()=>{
  const {run}=game();
  run(`${at('trash')};look()`); run('G.food=0'); run('ch(0)'); assert.equal(run('G.food'),0);
  run(`${at('gym')};look()`); run('G.hp=1'); run('ch(0)');
  assert.equal(run('G.hp'),0); assert.equal(run('G.ending'),'last_night');
});

await test('An open event survives save and load; a bogus event id is refused; old saves without the field load',()=>{
  const {run}=game();
  run(`${at('senior')};look()`); run('save()');
  run("var s=JSON.parse(localStorage.getItem(SAVE_KEY));var m=prepareSavedGame(JSON.stringify(s))");
  assert.equal(run('m.ev'),'senior');
  assert.throws(()=>run("var t=JSON.parse(JSON.stringify(s));t.ev='nope';prepareSavedGame(JSON.stringify(t))"),/사건 정보/);
  assert.throws(()=>run("var t=JSON.parse(JSON.stringify(s));t.ev=3;prepareSavedGame(JSON.stringify(t))"),/사건 정보/);
  run("var u=JSON.parse(JSON.stringify(s));delete u.ev;var m2=prepareSavedGame(JSON.stringify(u))");
  assert.equal(run('m2.ev'),null);
});

done('event');
})().catch(e=>{console.error(e);process.exitCode=1});

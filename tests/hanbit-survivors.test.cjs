// Run: node tests/hanbit-survivors.test.cjs
// 추가 생존자 3명: 첫 만남·말 걸기·친구 단계 선물·저장 검증·AI 대사 1회/폴백.
const assert=require('node:assert/strict');
const {fixture,test,done}=require('./_hanbit-fixture.cjs');

function game(){
  const f=fixture();
  f.run(`G=newState('도현');migrate();busy=false;resetQueue();UI.speed='off';render=()=>{};rng=()=>0.99;console.warn=()=>{};aiReady=()=>false`);
  f.run("var flush=()=>{while(Q.pending.length)nextLine()}; var go=id=>{goZone(id);flush()}; var chat=(id,t)=>{pick('chat:'+id);pick('chat:'+id+':'+t);flush()}");
  return f;
}
const at=(zone)=>`G.loc='${zone}';G.zs.${zone}.seen=true`;

(async()=>{
await test('Each survivor is met once, on first entering their own zone, and stays there',()=>{
  const {run,obj}=game();
  for(const [id,zone,from] of [['guard','office','shop'],['pharm','shop','stairs'],['rider','garage','stairs']]){
    run(`${at(from)};go('${zone}')`);
    assert.equal(run(`G.surv.${id}.met`),true); assert.equal(run(`G.surv.${id}.aff`),1);
    assert.ok(run(`G.log.some(l=>l.type==='dialog'&&l.who==='${id}')`));
    assert.equal(run(`survHere('${id}')`),true);
    const n=run(`G.log.filter(l=>l.who==='${id}').length`); run(`${at(from)};go('${zone}')`);
    assert.equal(run(`G.log.filter(l=>l.who==='${id}').length`),n,'no second meeting');
    assert.equal(run(`survHere('${id}')`),true);
    run(`${at(from)}`); assert.equal(run(`survHere('${id}')`),false,'not available elsewhere');
  }
});

await test('Talking opens a topic menu for that person only, costs one slot, and bogus topics are ignored',()=>{
  const {run,obj}=game();
  run(`${at('stairs')};go('shop')`);
  assert.ok(obj("buildChoices().some(c=>c.id==='chat:pharm')"));
  run("pick('chat:pharm')");
  assert.deepEqual(obj("buildChoices().map(c=>c.id)"),['chat:pharm:ask','chat:pharm:info','chat:pharm:joke','chat:pharm:x']);
  const t=run('G.day*10+G.slot');
  run("pick('chat:pharm:bogus')"); assert.equal(run('G.day*10+G.slot'),t);
  run("pick('chat:pharm:x')"); assert.ok(obj("buildChoices().some(c=>c.id==='move:stairs')"));
  run("pick('chat:pharm');pick('chat:pharm:info');flush()"); assert.ok(run('G.day*10+G.slot')>t);
  run("pick('chat:guard')"); assert.ok(!obj("buildChoices().some(c=>/guard/.test(c.id))"),'guard is not here');
});

await test('Affection is judged by code: asking pays more when hurt, jokes land only when quiet',()=>{
  const {run}=game();
  run(`${at('stairs')};go('shop');G.noise.shop=0;G.hp=G.maxhp`);
  run("G.surv.pharm.aff=0;chat('pharm','ask')"); assert.equal(run('G.surv.pharm.aff'),1);
  run("G.hp=4;G.surv.pharm.aff=0;chat('pharm','ask')"); assert.equal(run('G.surv.pharm.aff'),2);
  run("G.noise.shop=0;G.surv.pharm.aff=2;chat('pharm','joke')"); assert.equal(run('G.surv.pharm.aff'),4);
  run("G.noise.shop=6;G.surv.pharm.aff=3;chat('pharm','joke')"); assert.equal(run('G.surv.pharm.aff'),2);
  run("G.surv.pharm.aff=0;G.noise.shop=6;chat('pharm','joke')"); assert.equal(run('G.surv.pharm.aff'),0,'never below zero');
  run("G.surv.pharm.aff=6;G.hp=1;chat('pharm','ask')"); assert.ok(run('G.surv.pharm.aff')<=run('SURV_MAX'));
});

await test('Becoming friends gives one gift each, once; friendship never touches Yumin affection',()=>{
  const {run}=game();
  run(`${at('stairs')};go('shop');G.hp=3;G.surv.pharm.aff=2;chat('pharm','ask')`);
  assert.equal(run('G.meds'),1); assert.equal(run('G.surv.pharm.gift'),true);
  run("G.surv.pharm.aff=2;chat('pharm','ask')"); assert.equal(run('G.meds'),1,'gift only once');
  run(`${at('shop')};go('office');G.surv.guard.aff=3;G.hp=3;chat('guard','ask')`);
  assert.ok(run("hasItem('flashlight')"));
  run(`${at('stairs')};go('garage');G.surv.rider.aff=3;G.hp=3;chat('rider','ask')`);
  assert.ok(run("hasItem('fuel')"));
  assert.equal(run('G.comp.yumin.aff'),0);
});

await test('If the item is already owned the gift is a small supply instead',()=>{
  const {run}=game();
  run(`G.items.push('flashlight');${at('shop')};go('office');G.surv.guard.aff=3;G.hp=3;const f0=G.food;chat('guard','ask')`);
  assert.equal(run('G.surv.guard.gift'),true); assert.ok(run('G.items.filter(x=>x==="flashlight").length')===1);
  assert.ok(run('G.food')>=run('f0'));
});

await test('Old saves without the gift field are repaired; broken survivor data is refused',()=>{
  const {run}=game();
  run("save();var s=JSON.parse(localStorage.getItem(SAVE_KEY));for(const k in s.surv) delete s.surv[k].gift");
  run("var m=prepareSavedGame(JSON.stringify(s))");
  assert.equal(run('m.surv.guard.gift'),false);
  for(const bad of ["met:1","rescued:'x'","aff:-1","aff:99","gift:'y'"]){
    assert.throws(()=>run(`var t=JSON.parse(JSON.stringify(s));Object.assign(t.surv.rider,{${bad}});prepareSavedGame(JSON.stringify(t))`),/생존자 정보/);
  }
});

await test('With an AI connection one call is made and the code-decided changes are already applied; failure uses built-in lines',async()=>{
  const {run}=game();
  run(`${at('stairs')};go('shop');G.noise.shop=0;G.surv.pharm.aff=0`);
  run("aiReady=()=>true;var calls=0;callAI=async()=>{calls++;return JSON.stringify([{t:'d',who:'pharm',emo:'smile',text:'네, 괜찮아요.'}])}");
  run("pick('chat:pharm');pick('chat:pharm:ask')");
  assert.equal(run('G.surv.pharm.aff'),1);
  for(let i=0;i<30&&(run('calls')<1||run('busy'));i++) await new Promise(r=>setImmediate(r));
  run('flush()'); assert.equal(run('calls'),1);
  assert.ok(run("G.log.some(l=>l.type==='dialog'&&l.text==='네, 괜찮아요.')"));
  run("callAI=async()=>{throw Error('x')};toast=()=>{};pick('chat:pharm');pick('chat:pharm:ask')");
  for(let i=0;i<30&&run('busy');i++) await new Promise(r=>setImmediate(r));
  run('flush()'); assert.ok(run("G.log.some(l=>l.who==='pharm'&&/환자|들켰/.test(l.text))"));
});

done();
})();

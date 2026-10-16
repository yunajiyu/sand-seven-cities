// Run: node tests/hanbit-ending.test.cjs
// 4단계: 탈출 실행 조건·엔딩 5종 판정(호감 갈림)·엔딩 화면·저장.
const assert=require('node:assert/strict');
const {fixture,test,done}=require('./_hanbit-fixture.cjs');

function game(){
  const f=fixture();
  f.run(`G=newState('도현');migrate();busy=false;resetQueue();UI.speed='off';render=()=>{};rng=()=>0.99;console.warn=()=>{};aiReady=()=>false`);
  f.run("var flush=()=>{while(Q.pending.length)nextLine()}");
  return f;
}
const ready=(route)=>{ const at={front:'gate',rear:'gate',roof:'roof'}[route], need={front:['carKey','fuel'],rear:['gateKey'],roof:['signal']}[route];
  return `G.route='${route}';G.items=${JSON.stringify(need)};G.loc='${at}'` };

(async()=>{
await test('The escape choice appears only with a route, all its tools, and the right place',()=>{
  const {run,obj}=game();
  const has=()=>obj("buildChoices().some(c=>c.id==='escape:')");
  assert.equal(has(),false);
  run("G.route='front';G.loc='gate'"); assert.equal(has(),false,'no tools');
  run("G.items=['carKey'];"); assert.equal(has(),false,'missing fuel');
  run("G.items=['carKey','fuel'];G.loc='garage'"); assert.equal(has(),false,'wrong place');
  run("G.loc='gate'"); assert.equal(has(),true);
  run(ready('rear')); assert.equal(has(),true); run(ready('roof')); assert.equal(has(),true);
  run("G.items=[]"); assert.equal(has(),false);
});

await test('Escaping with her at a high level ends in the together ending, and the end card replaces the choices',()=>{
  const {run,obj}=game();
  run(ready('front')+";G.comp.yumin.met=true;G.comp.yumin.joined=true;G.comp.yumin.aff=12");
  run("pick('escape:');flush()");
  assert.equal(run('G.ending'),'escape_together');
  assert.ok(run("G.log.some(l=>l.type==='dialog'&&l.who==='yumin')"));
  assert.ok(run("G.log.some(l=>l.type==='sys'&&/함께 나간 아침/.test(l.text))"));
  assert.deepEqual(obj('buildChoices()'),[]);
  run('renderChoices()');
  assert.match(run("document.getElementById('choices').innerHTML"),/함께 나간 아침[\s\S]*toTitle/);
});

await test('Escaping with low affection, without her, or without ever meeting her gives the alone ending with different lines',()=>{
  const lines=[];
  for(const setup of ["G.comp.yumin.met=true;G.comp.yumin.joined=true;G.comp.yumin.aff=1","G.comp.yumin.met=true;G.comp.yumin.aff=3","G.comp.yumin.met=false"]){
    const {run}=game(); run(ready('rear')+';'+setup); run("pick('escape:');flush()");
    assert.equal(run('G.ending'),'escape_alone'); lines.push(run("G.log.filter(l=>l.type!=='action').map(l=>l.text).join('|')"));
  }
  assert.equal(new Set(lines).size,3);
});

await test('Each route has its own escape line',()=>{
  const seen=new Set();
  for(const r of ['front','rear','roof']){ const {run}=game(); run(ready(r)); run("pick('escape:');flush()"); seen.add(run("G.log.find(l=>l.type==='scene').text")) }
  assert.equal(seen.size,3);
});

await test('The four endings all have the designed names, and the failure causes share one ending with its own last line',()=>{
  const {run}=game();
  assert.deepEqual(run("Object.values(ENDING_NAME).sort().join()"),['단지의 마지막 밤','동료로 탈출','함께 나간 아침','혼자 나온 날'].sort().join());
  const lines=new Set();
  for(const k of ['dead','infected','timeout']){
    const g=game(); g.run(`finish('${k}',[]);`); assert.equal(g.run('G.ending'),'last_night');
    g.run('renderChoices()');
    assert.match(g.run("document.getElementById('choices').innerHTML"),/단지의 마지막 밤/);
    lines.add(g.run(`ENDING_TEXT.${k}`));
  }
  assert.equal(lines.size,3);
  assert.equal(game().run("OLD_ENDING.dead+OLD_ENDING.infected+OLD_ENDING.timeout"),'last_nightlast_nightlast_night');
});

await test('Old saves with the retired failure endings load as the new ending',()=>{
  const {run}=game();
  run("save();var s=JSON.parse(localStorage.getItem(SAVE_KEY));s.ending='infected'");
  run("var m=prepareSavedGame(JSON.stringify(s))"); assert.equal(run('m.ending'),'last_night');
});

await test('Companion level decides the escape ending: high → together, middle → comrade, low or not joined → alone',()=>{
  const cases=[[12,true,'escape_together'],[16,true,'escape_together'],[5,true,'escape_comrade'],[11,true,'escape_comrade'],[1,true,'escape_alone'],[20,false,'escape_alone']];
  for(const [aff,joined,want] of cases){
    const {run}=game(); run(ready('rear')+`;G.comp.yumin.met=true;G.comp.yumin.joined=${joined};G.comp.yumin.aff=${aff}`);
    run("pick('escape:');flush()"); assert.equal(run('G.ending'),want,`${aff}/${joined}`);
  }
});

await test('Escaping costs no extra time or AI call, ignores a finished game, and the ending survives a save',()=>{
  const {run}=game();
  run("var calls=0;callAI=async()=>{calls++;return ''};callAIRaw=callAI");
  run(ready('roof')+";G.comp.yumin.aff=0");
  const t=run('G.day*10+G.slot'); run("pick('escape:');flush()");
  assert.equal(run('G.day*10+G.slot'),t); assert.equal(run('calls'),0);
  const n=run('G.log.length'); run("escapeNow()"); assert.equal(run('G.log.length'),n,'nothing happens after the ending');
  run("save();var s=localStorage.getItem(SAVE_KEY);prepareSavedGame(s)");
  assert.equal(run("JSON.parse(s).ending"),'escape_alone');
});

await test('A rear-gate escape is reachable inside the time limit by walking and searching (no luck needed)',()=>{
  const {run}=game();
  run("pick('route:rear');flush()");
  for(const st of ["move:stairs","move:shop","move:office","look:","move:garden","move:gate","escape:"]){ run(`pick('${st}');flush()`) }
  assert.equal(run('G.ending'),'escape_alone');
  assert.ok(run('G.day*10+G.slot')<=44);
});

done();
})();

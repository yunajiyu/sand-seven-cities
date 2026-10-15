// Run: node tests/hanbit-yumin.test.cjs
// 3단계: 유민 첫 만남·호감 6단계·대화 선택지·동행·보호·AI 대사 1회(폴백 포함)·저장 검증.
const assert=require('node:assert/strict');
const {fixture,test,done,geminiReplies}=require('./_hanbit-fixture.cjs');

function game(r=0.99){
  const f=fixture();
  f.run(`G=newState('도현');migrate();busy=false;resetQueue();UI.speed='off';render=()=>{};rng=()=>${r};console.warn=()=>{};aiReady=()=>false`);
  f.run("var flush=()=>{while(Q.pending.length)nextLine()}; var go=id=>{goZone(id);flush()}; var talk=t=>{pick('talk:');pick('talk:'+t);flush()}");
  return f;
}

(async()=>{
await test('Levels: six steps with fixed thresholds, and the first meeting happens once on the stairs',()=>{
  const {run,obj}=game();
  assert.deepEqual(obj('[0,1,2,4,5,7,8,11,12,15,16,20].map(affLevel)'),[0,0,1,1,2,2,3,3,4,4,5,5]);
  assert.equal(run('AFF_NAMES.length'),6);
  assert.equal(run('yuminHere()'),false);
  run("go('stairs')");
  assert.equal(run('G.comp.yumin.met'),true); assert.equal(run('G.comp.yumin.aff'),1);
  assert.ok(run("G.log.some(l=>l.type==='dialog'&&l.who==='yumin')"));
  assert.equal(run('yuminHere()'),true);
  const n=run('G.log.length'); run("go('room');go('stairs')");
  assert.equal(run("G.log.filter(l=>/5층 사는 유민/.test(l.text)).length"),1,'meeting never repeats');
  assert.equal(run('G.comp.yumin.aff'),1);
});

await test('She is only available on the stairs until she joins; talking offers three topics and costs one time slot',()=>{
  const {run,obj}=game();
  run("go('stairs')"); const slot=run('G.day*10+G.slot');
  assert.ok(obj("buildChoices().some(c=>c.id==='talk:')"));
  run("pick('talk:')");
  assert.deepEqual(obj("buildChoices().map(c=>c.id)"),['talk:comfort','talk:concern','talk:joke','talk:x']);
  assert.equal(run('G.day*10+G.slot'),slot,'opening the menu is free');
  run("pick('talk:x')"); assert.ok(obj("buildChoices().some(c=>c.id==='move:room')"));
  run("pick('talk:');pick('talk:comfort');flush()");
  assert.equal(run('G.day*10+G.slot')>slot,true);
  run("pick('talk:bogus')");
  run("go('room')"); run("G.comp.yumin.joined=false");
  assert.ok(!obj("buildChoices().some(c=>c.id==='talk:')"),'not offered away from the stairs');
});

await test('Reactions are judged by code: comfort fails in noise, concern pays more when hurt, jokes only land in safe quiet places',()=>{
  const {run}=game();
  run("go('stairs');G.comp.yumin.aff=3;G.noise.stairs=0");
  run("talk('comfort')"); assert.equal(run('G.comp.yumin.aff'),4);
  run("G.noise.stairs=7;talk('comfort')"); assert.equal(run('G.comp.yumin.aff'),4,'too loud: no gain');
  run("G.hp=G.maxhp;G.infection=null;G.comp.yumin.aff=3;talk('concern')"); assert.equal(run('G.comp.yumin.aff'),4,'unhurt: +1');
  run("G.hp=3;G.comp.yumin.aff=3;talk('concern')"); assert.equal(run('G.comp.yumin.aff'),5,'hurt: +2');
  run("G.hp=10;G.comp.yumin.aff=3;G.noise.stairs=0;talk('joke')"); assert.equal(run('G.comp.yumin.aff'),4,'risk 2 and quiet: +1');
  run("G.comp.yumin.aff=3;G.comp.yumin.joined=false;G.noise.stairs=6;talk('joke')"); assert.equal(run('G.comp.yumin.aff'),2,'noisy: −1');
});

await test('A joke in a dangerous place hurts and affection never goes below zero or above the cap',()=>{
  const {run}=game();
  run("go('stairs');G.comp.yumin.aff=0;G.comp.yumin.joined=true;G.loc='garage';talk('joke')");
  assert.equal(run('G.comp.yumin.aff'),0);
  run("G.comp.yumin.aff=19;G.loc='stairs';G.noise.stairs=0;G.comp.yumin.joined=true;talk('joke')");
  assert.ok(run('G.comp.yumin.aff')<=run('AFF_MAX'));
});

await test('She joins automatically at level 2, follows the player, and the status bar says so; hidden numbers never appear on screen',()=>{
  const {run}=game();
  run("go('stairs');G.noise.stairs=0");
  run("G.comp.yumin.aff=4;talk('concern')");
  assert.equal(run('G.comp.yumin.joined'),true);
  assert.ok(run("G.log.some(l=>l.type==='sys'&&/합류/.test(l.text))"));
  run("go('room')"); assert.equal(run('yuminHere()'),true);
  assert.ok(!run("G.log.some(l=>/호감/.test(l.text)&&/\\d/.test(l.text))"),'no affection numbers in the log');
});

await test('Resting together and entering a dangerous place together for the first time raise affection',()=>{
  const {run}=game();
  run("go('stairs');G.comp.yumin.joined=true;G.comp.yumin.aff=6");
  run("restHere();flush()"); assert.equal(run('G.comp.yumin.aff'),7);
  run("go('shop')"); assert.equal(run('G.comp.yumin.aff'),8,'first visit to a risk-3 zone');
  run("go('stairs');go('shop')"); assert.equal(run('G.comp.yumin.aff'),8,'no gain for going back and forth');
});

await test('Protecting her in an encounter costs extra health and raises affection; a near miss raises it a little',()=>{
  const {run}=game(0.0);
  run("go('stairs');G.comp.yumin.joined=true;G.comp.yumin.aff=6;G.hp=10;G.infection=null;G.noise.stairs=0;G.zombies.stairs=3");
  run("restHere();flush()");
  assert.equal(run('G.hp'),10-3,'bite 2 + protecting 1');
  assert.equal(run('G.comp.yumin.aff')>=9,true);
  const g=game(); g.run("go('stairs');G.comp.yumin.joined=true;G.comp.yumin.aff=6;G.hp=10;G.zombies.stairs=3;var seq=[0.0,0.9];rng=()=>seq.length?seq.shift():0.99;restHere();flush()");
  assert.equal(g.run('G.hp'),10); assert.ok(g.run('G.comp.yumin.aff')>=7);
});

await test('With an AI connection, a talk makes exactly one AI call and the code-decided changes are already applied',async()=>{
  const f=game(); const {run}=f;
  run("go('stairs');G.noise.stairs=0;G.comp.yumin.aff=3");
  run("aiReady=()=>true;var calls=0;callAI=async()=>{calls++;return JSON.stringify([{t:'d',who:'yumin',emo:'smile',text:'고마워요, 도현 씨.'}])}");
  run("pick('talk:');pick('talk:comfort')");
  assert.equal(run('G.comp.yumin.aff'),4,'affection decided before the AI answers');
  for(let i=0;i<20&&run('calls')<1;i++) await new Promise(r=>setImmediate(r));
  for(let i=0;i<20&&run('busy');i++) await new Promise(r=>setImmediate(r));
  assert.equal(run('calls'),1);
  run('flush()');
  assert.ok(run("G.log.some(l=>l.type==='dialog'&&l.text==='고마워요, 도현 씨.')"));
  assert.ok(!run("G.log.some(l=>l.type==='dialog'&&/괜찮을 거예요/.test(l.text))"),'the static lines are replaced, not doubled');
});

await test('If the AI call fails, the built-in dialogue is used and nothing else changes',async()=>{
  const {run}=game();
  run("go('stairs');G.noise.stairs=0;G.comp.yumin.aff=3");
  run("aiReady=()=>true;callAI=async()=>{throw Error('x')};toast=()=>{}");
  run("pick('talk:');pick('talk:comfort')");
  for(let i=0;i<30&&run('busy');i++) await new Promise(r=>setImmediate(r));
  run('flush()');
  assert.equal(run('G.comp.yumin.aff'),4);
  assert.ok(run("G.log.some(l=>l.type==='dialog'&&l.who==='yumin'&&/숨|기억|버틸|낫네요/.test(l.text))"));
});

await test('Saves validate her state: wrong types or an out-of-range score are refused',()=>{
  const {run}=game();
  run("save();var s=JSON.parse(localStorage.getItem(SAVE_KEY))");
  for(const bad of ["met:'yes'","joined:1","aff:-1","aff:99","aff:'3'"]){
    assert.throws(()=>run(`var t=JSON.parse(JSON.stringify(s));Object.assign(t.comp.yumin,{${bad}});prepareSavedGame(JSON.stringify(t))`),/동행자 정보/);
  }
  run("prepareSavedGame(JSON.stringify(s))");
});

done();
})();

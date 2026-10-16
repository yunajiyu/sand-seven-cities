// Run: node tests/hanbit-time.test.cjs
// 2단계: 행동 1번=시간대 1개, 조우·물림·감염, 수색, 휴식, 하루 소비, 종료 조건(사망·감염·시간 초과), 경로 선택. rng는 하나뿐이라 값을 고정해 검증한다.
const assert=require('node:assert/strict');
const {fixture,test,done}=require('./_hanbit-fixture.cjs');

function game(r=0.99){
  const f=fixture();
  f.run(`G=newState('도현');migrate();busy=false;resetQueue();UI.speed='off';render=()=>{};rng=()=>${r};console.warn=()=>{}`);
  f.run("var go=(id)=>{goZone(id);while(Q.pending.length)nextLine()}; var flush=()=>{while(Q.pending.length)nextLine()}");
  return f;
}

(async()=>{
await test('Every action costs exactly one time slot; the day rolls over after night and eats one food and water',()=>{
  const {run}=game();
  assert.equal(run('G.day*10+G.slot'),12,'day 1 evening');
  run("go('stairs')"); assert.equal(run('G.day*10+G.slot'),13);
  run("go('room')"); assert.equal(run('G.day'),2); assert.equal(run('G.slot'),0);
  assert.equal(run('G.food'),3); assert.equal(run('G.water'),3);
  run("restHere();flush()"); assert.equal(run('G.slot'),1);
  run("lookAround();flush()"); assert.equal(run('G.slot'),2);
});

await test('Choosing a route is free (no time) and can be changed later',()=>{
  const {run,obj}=game();
  run("pick('route:rear')"); assert.equal(run('G.route'),'rear'); assert.equal(run('G.slot'),2);
  run("flush()");
  assert.deepEqual(obj("buildChoices().map(c=>c.id).filter(x=>x.startsWith('route'))"),['route:']);
  run("pick('route:')"); assert.equal(run('G.route'),null);
  run("flush();pick('route:bogus')"); assert.equal(run('G.route'),null);
});

await test('Searching finds a zone\'s loot once; searching again finds nothing',()=>{
  const {run,obj}=game();
  run("G.loc='shop';G.slot=0;lookAround();flush()");
  assert.equal(run('G.food'),6); assert.equal(run('G.water'),6); assert.equal(run('G.meds'),1); assert.equal(run('G.zs.shop.searched'),true);
  run("lookAround();flush()"); assert.equal(run('G.food'),6,'second search gives nothing');
  run("G.loc='garage';lookAround();flush()");
  assert.deepEqual(obj("G.items.sort()"),['fuel']);
  run("G.loc='garage';G.zs.garage.searched=false;lookAround();flush()"); assert.equal(run('G.items.length'),1,'items never duplicate');
});

await test('Encounter chance rises with zombies, noise and danger, drops with a flashlight, and is zero in the room',()=>{
  const {run}=game();
  assert.equal(run("encounterChance('room')"),0);
  const a=run("encounterChance('garage')"); run("addNoise('garage',5)"); const b=run("encounterChance('garage')");
  assert.ok(b>a);
  run("G.items.push('flashlight')"); assert.ok(run("encounterChance('garage')")<b);
  assert.ok(run("encounterChance('garage')")<=0.9);
  assert.equal(run("G.zombies.garage=0;encounterChance('garage')"),0);
});

await test('A bad roll lets a zombie bite: health drops and the infection clock starts once; a good roll changes nothing',()=>{
  const {run}=game(0.0);   // 조우하고 물린다
  run("G.loc='stairs';restHere();flush()");
  assert.equal(run('G.hp'),8,'rest caps at full health first, then the bite takes 2');
  assert.ok(run('G.infection')&&run('G.infection.left')<=7);
  const left=run('G.infection.left');
  run("restHere();flush()"); assert.equal(run('G.infection.left'),left-1,'a second bite does not reset the clock');
  const f2=game(0.99); f2.run("G.loc='stairs';restHere();flush()");
  assert.equal(f2.run('G.hp'),10); assert.equal(f2.run('G.infection'),null);
});

await test('A near miss only adds noise and never hurts',()=>{
  const {run}=game();
  run("var seq=[0.0,0.9];rng=()=>seq.length?seq.shift():0.99;G.loc='stairs';restHere();flush()");
  assert.equal(run('G.hp'),10); assert.equal(run('G.infection'),null);
  assert.ok(run('G.log.some(l=>/간신히/.test(l.text))'));
});

await test('Medicine cures infection and is only offered when needed',()=>{
  const {run,obj}=game();
  assert.ok(!obj("buildChoices().some(c=>c.id==='cure:')"));
  run("G.meds=1;G.infection={left:5}");
  assert.ok(obj("buildChoices().some(c=>c.id==='cure:')"));
  run("pick('cure:');flush()"); assert.equal(run('G.infection'),null); assert.equal(run('G.meds'),0);
  assert.ok(!obj("buildChoices().some(c=>c.id==='cure:')"));
});

await test('The infection clock reaching zero ends the game',()=>{
  const {run}=game();
  run("G.infection={left:1};restHere();flush()");
  assert.equal(run('G.ending'),'last_night'); assert.ok(run("G.log.some(l=>/감염이 몸을/.test(l.text))")); assert.deepEqual(run('JSON.stringify(buildChoices())'),'[]');
});

await test('Starvation hurts after the food runs out, and zero health ends the game',()=>{
  const {run}=game();
  run("G.loc='stairs';G.food=0;G.water=0;G.slot=3;G.hp=1;restHere();flush()");
  assert.equal(run('G.ending'),'last_night');
  const g2=game(); g2.run("G.food=0;G.water=2;G.slot=3;restHere();flush()");
  assert.equal(g2.run('G.hp'),9,'no food: −1'); assert.equal(g2.run('G.ending'),null); assert.equal(g2.run('G.food'),0);
  const g3=game(); g3.run("G.food=0;G.water=2;G.slot=3;G.hp=5;restHere();flush()");
  assert.equal(g3.run('G.hp'),6,'rest +2 in the room, then −1 for having no food'); 
  assert.equal(g2.run('G.water'),1);
});

await test('Day 8 is not the end: resting through its last slot starts day 9 and nothing ends',()=>{
  const {run}=game();
  run("G.day=8;G.slot=3;G.food=5;G.water=5;restHere();flush()");
  assert.equal(run('G.ending'),null); assert.equal(run('G.day'),9);
  run("validateSaveData(JSON.parse(JSON.stringify(G)))");
});

await test('Action results are written as ordinary lines (narration plus a short status line) with no AI call',()=>{
  const {run,obj}=game();
  run("var aiCalls=0;callAI=async()=>{aiCalls++;return ''};callAIRaw=callAI;G.loc='shop';lookAround();flush()");
  assert.equal(run('aiCalls'),0);
  const types=obj("G.log.map(l=>l.type)"); assert.ok(types.includes('sys')&&types.includes('scene'));
});

done();
})();

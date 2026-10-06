// Run with: node tests/hanbit-balance.test.cjs
// Executes the real embedded game script; only DOM, storage and AI boundaries are stubbed.
const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../hanbit.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
new vm.Script(script); // Check the entire script, including UI bootstrap.
const element={style:{},dataset:{},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},querySelectorAll(){return []},setAttribute(){},getAttribute(){return null}};
const ctx=vm.createContext({console,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},
  localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return element},querySelector(){return element},querySelectorAll(){return []},addEventListener(){},documentElement:element},
  window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math:Object.create(Math)});
vm.runInContext(script.slice(0,script.indexOf('/* 시작: 화면 설정 적용')),ctx);
vm.runInContext(`
  const testLogs=[];
  addLog=(type,text)=>testLogs.push({type,text}); toast=()=>{}; render=()=>{}; save=()=>{}; sfx=()=>{};
  maybeIncoming=()=>{}; apptSync=()=>{}; askConfirm=async()=>true;
  aiTurn=async()=>{};
  function seed(day=1,time='방과 후',dayStep=0,loc='site'){
    G={v:1,_phoneLightVersion:1,_fearBalanceVersion:1,_relVersion:2,_clockVersion:2,char:{name:'테스트',age:17,stats:{str:1,wis:1,cha:1,sur:1},traits:[]},
      day,time,dayStep,loc,steps:0,hp:12,maxhp:12,calm:10,battery:6,torch:0,cash:100,
      items:[],mat:{metal:0,ply:0,wire:0,keepsake:0},act:1,fragments:0,sitesDone:0,
      comp:{met:true,joined:false,aff:10},rel:{},chronicle:[],site:{name:'검증 구역',pos:{x:225,y:180},depth:1,
        cur:'r1',rooms:[{id:'r1',name:'입구',lv:0,danger:0,visited:true,exits:['r2']},{id:'r2',name:'복도',lv:1,danger:0,visited:false,exits:['r1']}]}};
    busy=false; PENDING={note:'',flags:{}}; testLogs.length=0; migrate(); syncSchedule();
  }
`,ctx);
const run=x=>vm.runInContext(x,ctx);
const obj=x=>JSON.parse(JSON.stringify(run(x)));
let count=0;
async function test(name,fn){await fn();count++;console.log('PASS',name)}
(async()=>{
await test('All 147 clock positions: prediction equals actual movement, weekdays and weekend',()=>{
  for(let day=1;day<=7;day++) for(const [time,len] of [['낮',9],['방과 후',4],['야간',4],['새벽',4]]) for(let slot=0;slot<len;slot++){
    run(`seed(${day},'${time}',${slot});`);
    const expected=obj('clockAfter(6)'); run('travelTimeShift(3)');
    assert.deepEqual(obj('({day:G.day,time:G.time,dayStep:G.dayStep})'),expected);
  }
  run("seed(5,'새벽',3); advanceClock(1,{resources:false,quiet:true})");
  assert.deepEqual(obj('({day:G.day,time:G.time,slot:G.dayStep,classes:CLASS_SLOTS.length})'),{day:6,time:'낮',slot:0,classes:0});
});
await test('Zero-length travel charges no time; event split totals exactly one leg',async()=>{
  run("seed(1,'방과 후',0,'campus'); tripEvent=()=>{}; arriveDest=()=>{}; beginTrip({kind:'hood',key:'south',name:'학원가',pos:hoodPos('south')},1,{event:'yumin'})");
  assert.equal(run('G.dayStep'),0); assert.equal(run('G.trip.left'),1);
  await run('continueTrip()'); assert.equal(run('G.dayStep'),2);
  assert.equal(run('testLogs.filter(x=>x.text.includes("이동하는 동안")).length'),1);
});
await test('Travel crosses real class slots; weekends and excused days do not count absences',()=>{
  run("seed(1,'낮',0,'campus'); travelTimeShift(4)"); assert.equal(run('G.cls.absent'),4); assert.equal(run('G.cls.skip'),0);
  run("seed(6,'낮',0,'campus'); travelTimeShift(4)"); assert.equal(run('G.cls?.absent||0'),0);
  run("seed(1,'낮',0,'site'); G.excuse={day:1}; travelTimeShift(4)"); assert.equal(run('G.cls.absent'),0);
});
await test('Direct input, choice and fixed investigations have identical time cost',()=>{
  const times=[];
  for(const src of ['free','choice','fixed']){run(`seed(); for(let i=0;i<6;i++) story('조사한다',{src:'${src}'});`); times.push(obj('({day:G.day,time:G.time,step:G.dayStep,steps:G.steps})'))}
  assert.deepEqual(times[0],times[1]);assert.deepEqual(times[0],times[2]); assert.equal(times[0].step,3);
});
await test('Room move costs half a tick; dark room move costs one full tick',()=>{
  run("seed(); moveTo('r2')"); assert.equal(run('G.dayStep'),0); run("moveTo('r1')");assert.equal(run('G.dayStep'),1);
  run("seed(); G.battery=0;G.textUse=0; Math.random=()=>0.99; moveTo('r2')");assert.equal(run('G.dayStep'),1);
});
await test('A small weekday expedition fits before next morning',()=>{
  run("seed(1,'방과 후',0,'road'); travelTimeShift(1); G.loc='site'; for(let i=0;i<10;i++) tick(true); advanceClock(1); G.loc='road'; travelTimeShift(1)");
  assert.deepEqual(obj('({day:G.day,time:G.time,step:G.dayStep})'),{day:1,time:'새벽',step:2});
});
await test('Soft action counter resets across zones and days',()=>{
  run("seed(); tick(true); G.site.name='새 구역'; tick(true)");assert.equal(run('G.dayStep'),0);
  run("seed(1,'새벽',3); tick(true); tick(true); tick(true)");assert.equal(run('G.dayStep'),0);assert.equal(run('G.day'),2);
});
await test('Deep exit is capped at two ticks and forecast includes actual exit',async()=>{
  run("seed(1,'새벽',2); G.site.depth=8; const predicted=returnForecast().clock; const savedReturn=predicted; archiveSite=()=>{}; returnBase=()=>{};");
  const predicted=obj('savedReturn'); await run('returnToCampus(true)');
  assert.deepEqual(obj('({day:G.day,time:G.time,dayStep:G.dayStep})'),predicted);
  run('seed(); G.site.depth=8; exitZone()'); assert.equal(run('G.dayStep'),2);
});
await test('Off-campus dorm sleep cannot heal, remove demerits or change date',()=>{
  run("seed(1,'방과 후',0,'hood'); G.hood='south'; G.hp=2; G.demerit=5; campusRest()");
  assert.deepEqual(obj('({day:G.day,hp:G.hp,demerit:G.demerit})'),{day:1,hp:2,demerit:5});
});
await test('Paid local lodging stays in the district; dawn sleep advances to the same next morning',async()=>{
  run("seed(1,'새벽',3,'hood'); G.hood='south'; G.hp=2; G.demerit=5; Math.random=()=>0.99;");
  await run('hoodRest()'); assert.deepEqual(obj('({day:G.day,time:G.time,step:G.dayStep,hp:G.hp,cash:G.cash,loc:G.loc,demerit:G.demerit})'),{day:2,time:'낮',step:0,hp:10,cash:85,loc:'hood',demerit:5});
});
await test('Shelter never rewinds time, never heals on setup, and blocks danger 3',()=>{
  run("seed(1,'새벽',2); G.hp=2; G.site.rooms[0].danger=3; shelterHere()");assert.equal(run('G.loc'),'site');
  run("G.site.rooms[0].danger=0; shelterHere()");assert.equal(run('G.time'),'새벽');assert.equal(run('G.hp'),2);
  const forecast=obj('returnForecast().clock'); run('breakCamp()');assert.equal(run('G.day'),2);assert.equal(run('G.hp'),7);
  assert.equal(forecast.day,2); const hp=run('G.hp');run('breakCamp()');assert.equal(run('G.hp'),hp);
});
await test('Roll-call missed once; sleeping late cannot cancel it',()=>{
  run("seed(1,'방과 후',3); advanceClock(1); const oldDemerit=G.demerit; outsideNightCheck('임시 쉼터')");assert.equal(run('G.demerit'),run('oldDemerit'));
  run("G.loc='campus'; campusRest()");assert.equal(run('G.demerit'),run('oldDemerit'));
});
await test('Cumulative absences survive date change and migration',()=>{
  run("seed(1,'낮',0); advanceClock(21,{resources:false,quiet:true}); migrate()");assert.equal(run('G.attendance.missed'),4);assert.equal(run('G.attendance.days'),1);
});
await test('Old friendship saves never become lovers, confirmed romance saves stay lovers, migration is idempotent',()=>{
  run("seed(); delete G._relVersion; G.rel={유민:{stage:5,aff:300,adult:true,engagedDay:1}}; G.chronicle=[{day:1,text:'유민과 둘도 없는 친구가 되었다'}]; migrate()");assert.equal(run("G.rel['유민'].stage"),2); assert.equal(run("'adult' in G.rel['유민']"),false);assert.equal(run("G.rel['유민'].romanceEligible"),true);
  const before=obj('G.rel');run('migrate()');assert.deepEqual(obj('G.rel'),before);
  run("seed(); delete G._relVersion; G.rel={유민:{stage:5,aff:300,adult:true,engagedDay:1}}; G.chronicle=[{day:1,text:'유민과 연인이 되었다'}]; migrate()");assert.equal(run("G.rel['유민'].stage"),5);assert.equal(run("G.rel['유민'].romanceConfirmed"),true);
});
await test('Romance actions cannot bypass relationship progress or promise cash prerequisites',()=>{
  run("seed(); G.loc='campus'; G.cash=0; G.rel={유민:{stage:0,aff:10,romanceEligible:true}}; promiseWith('유민'); proposeTo('유민')");
  assert.equal(run("G.rel['유민'].stage"),0);assert.equal(run('G.cash'),0);assert.equal(run('G.relEvt'),null);
});
await test('Narration-only confirmation changes no clock',()=>{
  run("seed(); story('의도를 설명한다',{src:'free',storyOnly:true,noTime:true})");assert.equal(run('G.dayStep'),0);assert.equal(run('G._softN||0'),0);
});
await test('Travel duration labels use clock units, including zero and full day',()=>{
  assert.equal(run('durText(0)'),'시간 경과 없음');assert.equal(run('durText(1)'),'2칸');assert.equal(run('durText(11)'),'1일 + 1칸');
});
await test('Investigation and district screens show real return forecasts; travel/guide templates render',()=>{
  run("seed(); modal=(title,body)=>{globalThis.testModal=body};");
  assert.match(run('fixedHTML()'),/귀교 예상/);
  run("G.loc='hood'; G.hood='south'");
  assert.match(run('fixedHTML()'),/현지 숙박/); assert.doesNotMatch(run('hoodFixedHTML().ac'),/기숙사/);
  run('openTravel()');assert.match(run('testModal'),/예상 귀교|예상 도착/);
  run('openGuide()');assert.doesNotMatch(run('testModal'),/반나절|직접 입력은 1걸음|아침 → 낮 → 밤/);
});
await test('Longer trips crossing several days retain all skipped classes exactly once',()=>{
  run("seed(4,'낮',0); travelTimeShift(25)");
  assert.equal(run('G.day'),6); assert.equal(run('G.attendance.missed'),8);assert.equal(run('CLASS_SLOTS.length'),0);
});
await test('Cancellation before expedition departure consumes no time, supplies or demerits',async()=>{
  run("seed(1,'야간',0,'campus'); askConfirm=async()=>false;");
  const before=obj('({day:G.day,time:G.time,dayStep:G.dayStep,hp:G.hp,calm:G.calm,battery:G.battery,demerit:G.demerit,torch:G.torch})');
  await run('startExpedition()');
  assert.deepEqual(obj('({day:G.day,time:G.time,dayStep:G.dayStep,hp:G.hp,calm:G.calm,battery:G.battery,demerit:G.demerit,torch:G.torch})'),before);
  run('askConfirm=async()=>true;');
});
console.log(`${count} scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

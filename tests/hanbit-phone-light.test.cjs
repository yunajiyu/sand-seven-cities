// Run: node tests/hanbit-phone-light.test.cjs
const crypto=require('node:crypto');
// Uses the actual game script. DOM/storage and network AI calls are stubbed.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../hanbit.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
new vm.Script(script);
function fixture(){
  const el={style:{},dataset:{},value:'',insertAdjacentHTML(){},remove(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},querySelectorAll(){return []},setAttribute(){},getAttribute(){return null}};
  const ctx=vm.createContext({console,crypto:crypto.webcrypto,TextEncoder,URLSearchParams,AbortSignal,atob,btoa,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return el},querySelector(){return el},querySelectorAll(){return []},addEventListener(){},documentElement:el},window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math:Object.create(Math)});
  vm.runInContext(script.slice(0,script.indexOf('/* 시작: 화면 설정 적용')),ctx);
  const run=s=>vm.runInContext(s,ctx),obj=s=>JSON.parse(JSON.stringify(run(s)));
  run(`const liveSave=save;const calls=[],notices=[]; let chipHTML='',modalHTML='';
    addLog=()=>{};toast=s=>notices.push(s);render=()=>{};renderSides=()=>{};save=()=>{};sfx=()=>{};
    maybeIncoming=()=>{};closeModal=()=>{};apptRefresh=()=>{};renderChat=()=>{};askConfirm=async()=>true;const liveAiTurn=aiTurn;aiTurn=async(...args)=>calls.push(args);
    chip=s=>{chipHTML=s};hideChip=()=>{};modal=(title,s)=>{modalHTML=s};
    function seed(loc='site'){
      G={v:1,_phoneLightVersion:1,_fearBalanceVersion:1,_relVersion:2,_clockVersion:2,_affLv:2,char:{name:'테스트',age:17,stats:{str:1,wis:1,cha:1,sur:1},traits:[]},day:1,time:'방과 후',dayStep:0,loc,steps:0,hp:12,maxhp:12,calm:10,battery:6,torch:0,cash:100,items:[],mat:{metal:0,ply:0,wire:0,keepsake:0},act:1,fragments:0,sitesDone:0,district:'music',comp:{met:false,joined:false,aff:10},rel:{},chronicle:[],site:loc==='site'?{name:'피아노 괴담 구역',pos:{x:225,y:180},depth:1,cur:'r1',rooms:[{id:'r1',name:'입구',lv:0,danger:0,visited:true,exits:['r2','r3']},{id:'r2',name:'피아노실',lv:1,danger:0,visited:true,exits:['r1']},{id:'r3',name:'방송실',lv:1,danger:0,visited:true,exits:['r1']},{id:'r4',name:'창고',lv:2,danger:0,visited:true,exits:['r3']}]}:null};
      busy=false;PENDING={note:'',flags:{}};migrate();syncSchedule();Math.random=()=>0.99;calls.length=notices.length=0;chipHTML=modalHTML='';
    }
    seed('campus');G.comp.met=true;getRel('유민');getRel('서연');G.comp.spot='market';G.comp.spotKey=yKey();
  `);
  return {run,obj,input:el,ctx};
}



let count=0;
async function test(name,fn){await fn(fixture());count++;console.log('PASS',name)}
(async()=>{
await test('New saves start with fear capacity 10 without inferred free upgrades',({run})=>{run("seed('campus');G.calm=9;delete G._capInit;G.cap.w=0;migrate()");assert.equal(run('fearMax()'),10);assert.equal(run('fearNow()'),1);assert.equal(run('G.cap.w'),0)});
await test('Legacy migration preserves current fear and all bought mental upgrades',({run})=>{run("seed('campus');delete G._fearBalanceVersion;delete G._phoneLightVersion;G.calm=2;G.cap.w=2;const oldFear=6+G.cap.w*2-G.calm;migrate();migrate()");assert.equal(run('fearMax()'),14);assert.equal(run('fearNow()'),run('oldFear'));assert.equal(run('G.calm'),6)});
await test('Old flashlight supplies convert to batteries and casing costs refund once',({run})=>{run("seed('home');delete G._phoneLightVersion;G.torch=3;G.cap.t=2;G.home.stock={torch:2,battery:3,calm:4};G.canon=[{text:'확정 기록'}];migrate();migrate()");assert.equal(run('G.reservePacks'),3);assert.equal(run('G.home.stock.battery'),5);assert.equal(run('G.home.stock.calm'),4);assert.equal(run('G.home.stock.torch'),undefined);assert.equal(run('G.cash'),190);assert.equal(run('G.torch'),0);assert.equal(run('G.cap.t'),0);assert.equal(run('G.canon[0].text'),'확정 기록')});
await test('Converted battery reserves actually recharge and cannot be reused',({run})=>{run('seed();G.reservePacks=1;G.battery=1;useReserveBattery()');assert.equal(run('G.reservePacks'),0);assert.equal(run('G.battery'),2);run('useReserveBattery()');assert.equal(run('G.battery'),2)});
await test('Auto light turns on in darkness and off in fixed light without a button',({run})=>{run('seed();tick(true)');assert.equal(run('phoneLightOn()'),true);assert.equal(run('batteryPct()'),99);run("G.site.rooms[0].light='lit';tick(true)");assert.equal(run('phoneLightOn()'),false);assert.equal(run('inDark()'),false);assert.equal(run('batteryPct()'),99)});
await test('Daytime outdoors and night vision do not consume illumination power',({run})=>{run("seed();G.site.rooms[0].light='outdoor';G.time='낮';tick(true)");assert.equal(run('batteryPct()'),100);run("G.time='야간';tick(true)");assert.equal(run('batteryPct()'),99);run("seed();G.char.traits=['밤눈'];tick(true)");assert.equal(run('batteryPct()'),100)});
await test('Phone discharge and confiscation disable illumination but ambient light still works',({run})=>{run("seed();G.phoneBan=G.day+':'+G.time");assert.equal(run('phoneLightOn()'),false);assert.equal(run('inDark()'),true);run("G.site.rooms[0].light='lit'");assert.equal(run('inDark()'),false);run("seed();G.battery=0");assert.equal(run('inDark()'),true)});
await test('Unlit actions accrue one additional fear per four actions',({run})=>{run('seed();G.battery=0;for(let i=0;i<3;i++)tick(true)');assert.equal(run('fearNow()'),0);run('tick(true)');assert.equal(run('fearNow()'),1);assert.equal(run('G.hp'),12)});
await test('Dark movement counts one player action despite its extra time cost',({run})=>{run("seed();G.battery=0;Math.random=()=>0.99;for(let i=0;i<4;i++)moveTo(i%2?'r1':'r2')");assert.equal(run('G.site.darkActions'),4);assert.equal(run('fearNow()'),1);assert.equal(run('G.dayStep'),0);assert.equal(run('G.day'),1);assert.equal(run('G.time'),'야간')});
await test('Dark accumulation is action based and unaffected by rendering or save reload',({run})=>{run('seed();G.battery=0;tick(true);tick(true);const snap=JSON.stringify(G);for(let i=0;i<20;i++)lightStatus();G=JSON.parse(snap);migrate();tick(true);tick(true)');assert.equal(run('fearNow()'),1);assert.equal(run('G.site.darkActions'),4)});
await test('Daylight and introductory scenes do not accrue dark fear',({run})=>{run("seed();G.battery=0;G.site.rooms[0].light='lit';for(let i=0;i<4;i++)tick(true)");assert.equal(run('fearNow()'),0);run('seed();G.battery=0;G.site.intro=true;for(let i=0;i<20;i++)tick(true)');assert.equal(run('fearNow()'),0);assert.equal(run('G.hp'),12)});
await test('AI darkness fear cannot double count automatic darkness; real lit-event fear is capped at one',({run})=>{run('seed();G.battery=0;applyEffects({공포:2},{flags:{}})');assert.equal(run('fearNow()'),0);run("seed();G.site.rooms[0].light='lit';applyEffects({공포:2},{flags:{}})");assert.equal(run('fearNow()'),1)});
await test('Credits can defer automatic dark fear without consuming two credits per action',({run})=>{run('seed();G.battery=0;G._wCredit=1;for(let i=0;i<4;i++)tick(true)');assert.equal(run('fearNow()'),0);assert.equal(run('G._wCredit'),0);run('for(let i=0;i<4;i++)tick(true)');assert.equal(run('fearNow()'),1)});
await test('Twelve-action excursion consumes 15% battery and two fear before story events',({run})=>{run("seed();const zone=G.site;G.loc='road';travelPay({days:1,calm:1,battery:1,feed:0});G.loc='site';G.site=zone;for(let i=0;i<12;i++)tick(true);G.loc='road';travelPay({days:1,calm:1,battery:1,feed:0})");assert.equal(run('batteryPct()'),85);assert.equal(run('fearNow()'),2);assert.equal(run('G.hp'),12)});
await test('Same excursion without illumination adds three fear but return remains possible',({run})=>{run("seed();G.battery=0;const zone=G.site;G.loc='road';travelPay({days:1,calm:1,battery:1,feed:0});G.loc='site';G.site=zone;for(let i=0;i<12;i++)tick(true);G.loc='road';travelPay({days:1,calm:1,battery:1,feed:0})");assert.equal(run('fearNow()'),5);assert.equal(run('G.hp'),12);assert.equal(run('batteryPct()'),0)});
await test('Legacy torch effects and purchases cannot recreate a second lighting resource',({run})=>{run("seed('campus');G.torch=0;const cash=G.cash;applyEffects({손전등:5},{flags:{}});buy('torch',5);buyCap('t')");assert.equal(run('G.torch'),0);assert.equal(run('G.cash'),run('cash'))});
await test('UI has one power resource and no flashlight shop, storage or expansion',({run})=>{run("seed('home');G.home.built.locker=true;openShop()");assert.equal(run('modalHTML.includes("손전등 건전지")'),false);assert.equal(run('modalHTML.includes("건전지 케이스")'),false);assert.equal(run('lockerHTML().includes("손전등")'),false);assert.equal(run('leftHTML().includes("🔦 손전등")'),false);run('openGuide()');assert.equal(run('modalHTML.includes("공포 한계 10")'),true)});
await test('Mental recovery scales with new capacity while preserving actual costs',async({run})=>{run("seed('campus');G.calm=0;campusRest()");assert.equal(run('G.calm'),3);run("seed('home');G.calm=0;homeRest()");assert.equal(run('G.calm'),5);run("seed('hood');G.hood='south';G.calm=0");await run('hoodRest()');assert.equal(run('G.calm'),3);assert.equal(run('G.cash'),85)});

await test('AI cannot double-charge illumination already consumed by a dark-room action',({run})=>{run('seed();tick(true);const before=batteryEnergy();applyEffects({배터리:-2},{flags:{}})');assert.equal(run('batteryEnergy()'),run('before'));assert.equal(run('batteryPct()'),99)});
console.log(`${count} phone-light/balance scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

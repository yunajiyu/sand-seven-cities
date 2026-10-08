// Run: node tests/hanbit-leave-midway.test.cjs
// The player can always leave midway: out of a zone before the case is done, and back home from the middle of a trip.
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
await test('Inside a zone the exit and return buttons come first in the move row, even before the case is solved',async({run})=>{
  run("seed('site')");assert.ok(run('G.site&&G.site.rooms.length>0'));
  const h=run('fixedHTML()'), m=h.match(/<div class="hscroll[^"]*">/), row=h.slice(m.index+m[0].length);
  assert.match(row,/^<button[^>]*onclick="exitZone\(\)"/,'exit is the first button');
  assert.ok(row.indexOf('returnToCampus()')<row.indexOf('→ '),'return comes before the room moves');
  assert.ok(run("gameActions().some(a=>a.id==='zone:exit')&&gameActions().some(a=>a.id==='zone:return')"));
});
await test('Halfway to a destination the player can turn back: pays only the way already walked and lands where they left',async({run})=>{
  run("seed('campus');G.district='hall';G.calm=10;G.battery=6;const before={calm:G.calm,day:G.day,time:G.time,dayStep:G.dayStep};G.loc='road';G.trip={dest:{kind:'big',key:'lacuna',name:'라쿠나 구역',pos:LACUNA_POS,base:null},left:2,days:3,calm:2,from:'중앙 캠퍼스 지구',fromPos:curPos(),origin:{loc:'campus',district:'hall'}}");
  const h=run('fixedHTML()');assert.match(h,/continueTrip\(\)/);assert.match(h,/onclick="turnBackTrip\(\)">↩ 중앙 캠퍼스 지구로 돌아가기/);
  assert.ok(run("gameActions().some(a=>a.id==='trip:back')"));
  await run('turnBackTrip()');
  assert.equal(run('G.trip'),null);assert.equal(run('G.loc'),'campus');assert.equal(run('G.site'),null);
  assert.equal(run('before.calm-G.calm'),run('travelNeedFed(1).calm'),'one stage walked back');
});
await test('Turning back right after leaving costs nothing, and a trip from another district returns there',async({run})=>{
  const hood=run('Object.keys(HOODS)[0]');
  run(`seed('campus');G.loc='road';const c0=G.calm;G.trip={dest:{kind:'big',key:'lacuna',name:'라쿠나 구역',pos:LACUNA_POS,base:'${hood}'},left:3,days:3,calm:3,from:HOODS['${hood}'].n,fromPos:{x:0,y:0},origin:{loc:'hood',hood:'${hood}'}}`);
  assert.doesNotMatch(run('fixedHTML()'),/돌아가기 \(/,'no travel time shown when nothing was walked');
  await run('turnBackTrip()');assert.equal(run('G.loc'),'hood');assert.equal(run('G.hood'),hood);assert.equal(run('G.calm'),run('c0'));
  // 예전 저장본(origin 없음)도 출발 지구로 돌아간다
  run(`G.loc='road';G.trip={dest:{kind:'big',key:'lacuna',name:'라쿠나 구역',pos:LACUNA_POS,base:'${hood}'},left:1,days:2,calm:1,from:'x',fromPos:{x:0,y:0}}`);await run('turnBackTrip()');assert.equal(run('G.loc'),'hood');
});
await test('No turn back while thugs block the road or on the way home from a zone',async({run})=>{
  run("seed('campus');G.loc='road';G.trip={dest:{kind:'big',key:'lacuna',name:'라쿠나 구역',pos:LACUNA_POS},left:1,days:2,from:'a',bandit:true}");
  assert.doesNotMatch(run('fixedHTML()'),/turnBackTrip/);
  run("G.trip={dest:{kind:'campus',name:'중앙 캠퍼스 지구',ret:true},left:1,days:2,from:'a'}");assert.doesNotMatch(run('fixedHTML()'),/turnBackTrip/);
});
console.log(`${count} leave-midway scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

// Run: node tests/hanbit-school-slots.test.cjs
// Uses the actual game script. Story actions during school hours follow the clock (class / break) instead of drifting from it.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../hanbit.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
new vm.Script(script);
function fixture(){
  const el={style:{},dataset:{},value:'',insertAdjacentHTML(){},remove(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},querySelectorAll(){return []},setAttribute(){},getAttribute(){return null}};
  const ctx=vm.createContext({console,crypto:crypto.webcrypto,TextEncoder,URLSearchParams,AbortSignal,atob,btoa,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return el},querySelector(){return el},querySelectorAll(){return []},addEventListener(){},documentElement:el},window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math:Object.create(Math)});
  vm.runInContext(script.slice(0,script.indexOf('/* 시작: 화면 설정 적용')),ctx);
  const run=s=>vm.runInContext(s,ctx),obj=s=>JSON.parse(JSON.stringify(run(s)));
  run(`const calls=[],notices=[]; let chipHTML='',modalHTML='';
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
async function test(name,fn){const f=fixture();f.run("PENDING={note:'',flags:{}};const logs=[];addLog=(t,x)=>logs.push(String(x));const contextAt=()=>HOOKS.context.map(h=>{try{return h.fn()||''}catch(e){return ''}}).join('')");await fn(f);count++;console.log('PASS',name)}
const at=(f,slot,district='classroom',day=1)=>f.run(`seed('campus');G.day=${day};G.time='낮';G.dayStep=${slot};G.district='${district}';G.spot=null;G.site=null;G.excuse=null;syncSchedule();PENDING={note:'',flags:{}};calls.length=0;`);
(async()=>{
await test('A story action in the classroom at class time starts the class automatically',async f=>{
  at(f,1);f.run("story('필기를 한다')");
  assert.ok(f.run('!!classActive()'));assert.equal(f.run('G.dayStep'),1);
  assert.match(f.run('PENDING.note'),/\[수업 시작\]/);
  assert.ok(f.run('logs.some(l=>/수업 시간이라 이 행동은 수업 중 행동으로/.test(l))'));
});
await test('The second action finishes the class and the clock moves to the break',async f=>{
  at(f,1);f.run("story('필기를 한다')");f.run("PENDING={note:'',flags:{}}");f.run("story('질문을 한다')");
  assert.match(f.run('PENDING.note'),/\[수업 끝/);assert.equal(f.run('G.dayStep'),2);assert.equal(f.run('slotLabel()'),'쉬는 시간');
});
await test('Break time: the first action keeps the break, the second rings the bell and moves to the next class',async f=>{
  at(f,2);f.run("story('복도를 둘러본다')");
  assert.equal(f.run('G.dayStep'),2);assert.match(f.run('PENDING.note'),/\[쉬는 시간 1\/2\].*수업이 시작되었거나 수업을 들었다고 서술하지 말 것/);
  f.run("PENDING={note:'',flags:{}}");f.run("story('매점에 간다')");
  assert.equal(f.run('G.dayStep'),3);assert.match(f.run('PENDING.note'),/\[쉬는 시간 끝 2\/2\].*수업 내용.*쓰지 말 것/);
  assert.match(f.run('slotLabel()'),/^2교시/);assert.equal(f.run('G._brk'),null);
});
await test('Second break (6) works the same and the break counter resets each break',async f=>{
  at(f,6);f.run("story('친구와 수다를 떤다')");f.run("story('창가에 선다')");assert.equal(f.run('G.dayStep'),7);
  at(f,2);f.run("story('복도를 둘러본다')");assert.equal(f.run('G._brk.n'),1);
  f.run('G.dayStep=6');f.run("story('창가에 선다')");assert.equal(f.run('G._brk.slot'),6);assert.equal(f.run('G._brk.n'),1);assert.equal(f.run('G.dayStep'),6);
});
await test('Outside the classroom, weekends, excused days and zones are left alone',async f=>{
  at(f,1,'gate');f.run("story('정문을 바라본다')");assert.equal(f.run('G.dayStep'),1);assert.equal(f.run('!!classActive()'),false);assert.doesNotMatch(f.run('PENDING.note'),/수업 시작/);
  at(f,2,'classroom',6);f.run("story('늦잠을 잔다')");assert.equal(f.run('G.dayStep'),2);assert.doesNotMatch(f.run('PENDING.note'),/쉬는 시간/);
  at(f,2);f.run("G.excuse={day:G.day};story('쉬는 시간이다')");assert.equal(f.run('G.dayStep'),2);assert.doesNotMatch(f.run('PENDING.note'),/쉬는 시간/);
});
await test('The story AI is told not to narrate lessons while the player is not in class',async f=>{
  at(f,2);assert.match(f.run("contextAt()"),/\[수업 전\] 지금은 수업을 듣고 있지 않다/);
  at(f,1);f.run("story('필기를 한다')");assert.doesNotMatch(f.run("contextAt()"),/\[수업 전\]/);
});
console.log(`${count} school-slot scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

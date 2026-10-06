// Run: node tests/hanbit-undo.test.cjs
// Uses the actual game script. Undo keeps the two most recent actions and survives reload.
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
function test(name,fn){fn();count++;console.log('PASS',name)}
function setup(){
  const f=fixture();
  f.run(`const disk=new Map();localStorage={getItem:k=>disk.has(k)?disk.get(k):null,setItem:(k,v)=>{if(globalThis.failOlder&&k===UNDO_KEY&&v.includes('"older"'))throw new Error('quota');disk.set(k,String(v))},removeItem:k=>disk.delete(k)};
    save=()=>persistGameSnapshot();G.cash=10;persistGameSnapshot();resetUndo();
    function act(label,cash){pushUndo(label);G.cash=cash;persistGameSnapshot()}`);
  return f;
}
const asyncTests=[];
const later=(name,fn)=>asyncTests.push([name,fn]);
later('Undo steps back through two actions and then stops',async f=>{
  f.run("act('A',20);act('B',30)");
  f.run('updateUndoBtn()');assert.match(f.input.title||'',/되돌리기: 「B」.*2번/);
  assert.equal(f.input.textContent,'↩ 되돌리기 (2)');
  await f.run('undoLast()');assert.equal(f.run('G.cash'),20);
  assert.equal(f.run('undoOlder.length'),0);assert.ok(f.run('!!undoSnap'));
  await f.run('undoLast()');assert.equal(f.run('G.cash'),10);
  assert.equal(f.run('undoSnap'),null);
  await f.run('undoLast()');assert.equal(f.run('G.cash'),10);
});
later('Only the two most recent actions are kept',async f=>{
  f.run("act('A',20);act('B',30);act('C',40)");
  assert.equal(f.run('undoOlder.length'),1);assert.equal(f.run('undoLabel'),'C');assert.equal(f.run('undoOlder[0].label'),'B');
  await f.run('undoLast()');await f.run('undoLast()');
  assert.equal(f.run('G.cash'),20);assert.equal(f.run('undoSnap'),null);
});
later('Acting again after one undo keeps the chain consistent',async f=>{
  f.run("act('A',20);act('B',30)");await f.run('undoLast()');
  f.run("act('C',99)");
  await f.run('undoLast()');assert.equal(f.run('G.cash'),20);
  await f.run('undoLast()');assert.equal(f.run('G.cash'),10);
});
later('Repeated attempts that change nothing do not consume an undo slot',async f=>{
  f.run("pushUndo('retry');pushUndo('retry again');pushUndo('third try')");
  assert.equal(f.run('undoOlder.length'),0);assert.equal(f.run('undoLabel'),'third try');
  f.run("act('A',20)");assert.equal(f.run('undoOlder.length'),0);
  await f.run('undoLast()');assert.equal(f.run('G.cash'),10);
});
later('Both steps are written to storage and restored on reload',async f=>{
  f.run("act('A',20);act('B',30)");
  const stored=JSON.parse(f.run("disk.get(UNDO_KEY)"));assert.equal(stored.older.length,1);assert.equal(stored.label,'B');
});
later('When storage is tight the latest step is still stored without the older one',async f=>{
  f.run("globalThis.failOlder=true;act('A',20);act('B',30)");
  const stored=JSON.parse(f.run("disk.get(UNDO_KEY)"));assert.equal(stored.label,'B');assert.equal(stored.older,undefined);
  assert.equal(f.run('undoOlder.length'),1);
});
later('Combat and reset clear every undo step',async f=>{
  f.run("act('A',20);act('B',30);clearUndo()");
  assert.equal(f.run('undoSnap'),null);assert.equal(f.run('undoOlder.length'),0);assert.equal(f.run('disk.has(UNDO_KEY)'),false);
  f.run("act('C',40);act('D',50);resetUndo()");assert.equal(f.run('undoOlder.length'),0);assert.equal(f.run('undoSnap'),null);
});
(async()=>{
  for(const [name,fn] of asyncTests){const f=setup();await fn(f);count++;console.log('PASS',name)}
  console.log(`${count} undo scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

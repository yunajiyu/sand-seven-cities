// Run: node tests/hanbit-bank.test.cjs
// Uses the actual game script. The reservoir bank is more than a one-button screen: look around, earn cash, buy the hideout.
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
function test(name,fn){const f=fixture();fn(f);count++;console.log('PASS',name)}
const setup=(f,cash)=>f.run(`G.loc='campus';G.district='bank';G.spot=null;G.time='방과 후';G.dayStep=0;G.cash=${cash};G.home.built={};migrate();syncSchedule();calls.length=0`);
test('Bank offers looking around, a part-time job and the hideout with a cash hint',f=>{
  setup(f,36);const ac=f.run('campusFixedHTML().ac');
  assert.match(ac,/🔎 저수지 둑길 둘러보기/);assert.match(ac,/💼 둑길 정리 도우미 \(💳5~8/);
  assert.match(ac,/아지트 마련하기 \(캐시 부족 💳36\/60\)/);assert.match(ac,/아지트를 마련하려면 캐시 60이 필요합니다.*아르바이트로 캐시를 모을 수 있어요/);
  assert.doesNotMatch(ac,/class="primary" onclick="goHome\(\)"/);   // 아직 살 수 없으면 강조하지 않음
});
test('With enough cash the hideout button is highlighted; once owned the hint disappears',f=>{
  setup(f,60);assert.match(f.run('campusFixedHTML().ac'),/class="primary" onclick="goHome\(\)">🏠 아지트 마련하기 \(💳60\)/);
  f.run("G.home.built.clubroom=true");const ac=f.run('campusFixedHTML().ac');assert.match(ac,/🏠 아지트로</);assert.doesNotMatch(ac,/캐시 60이 필요합니다/);assert.match(ac,/둘러보기/);
});
test('The bank job pays cash and spends a time slot; looking around starts a scene',f=>{
  setup(f,36);f.run("aiTurn=async(...a)=>{calls.push(a)}");const t0=f.run('G.dayStep');
  f.run("doJob('bank')");const cash=f.run('G.cash');assert.ok(cash>=41&&cash<=44,String(cash));assert.equal(f.run('G.dayStep'),t0+1);assert.equal(f.obj('calls[0]')[0],'둑길 정리 도우미를 한다');
  f.run("calls.length=0;browsePlace('bank')");assert.match(f.obj('calls[0]')[0],/저수지 둑길을 둘러본다/);assert.match(f.obj('calls[0]')[1],/\[저수지 둑길 둘러보기\].*가로등·물가·산책하는 사람/);
});
test('Other places still show their own buttons',f=>{
  setup(f,36);f.run("G.district='ground'");assert.match(f.run('campusFixedHTML().ac'),/운동장 둘러보기/);assert.doesNotMatch(f.run('campusFixedHTML().ac'),/아지트 마련/);
});
console.log(`${count} bank scenario groups passed.`);

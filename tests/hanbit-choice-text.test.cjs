// Run: node tests/hanbit-choice-text.test.cjs
// Uses the actual game script. A chosen dialogue option must reach the story AI instead of a fixed "talk" scene.
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
const setup=f=>f.run("G.comp.joined=true;G.comp.spot='with';G.loc='campus';G.district='hall1';G.spot=null;migrate();syncSchedule();calls.length=0;canMeetHere=()=>true");
const pick=(f,text,type='story',actionId='talk:yumin')=>{f.run(`G.choices=[${JSON.stringify(text)}];G.choiceMeta={${JSON.stringify(text)}:{type:${JSON.stringify(type)},actionId:${JSON.stringify(actionId)}}};calls.length=0;pickChoice(0)`);return f.obj('calls[0]')};
test('Different Yumin dialogue choices produce different actions instead of one fixed scene',f=>{
  setup(f);f.run("aiTurn=async(...a)=>{calls.push(a)}");
  const a=pick(f,'저수지 소문에 대해 더 묻는다'),b=pick(f,'출석부에 대해 슬쩍 떠본다');
  assert.equal(a[0],'저수지 소문에 대해 더 묻는다');assert.equal(b[0],'출석부에 대해 슬쩍 떠본다');
  assert.match(a[1],/\[플레이어가 고른 말·행동\] "저수지 소문에 대해 더 묻는다".*되풀이하지 말고/);assert.match(b[1],/"출석부에 대해 슬쩍 떠본다"/);
  assert.match(a[1],/\[장소\].*장면의 배경은 반드시 이곳/);   // 장소 고정은 그대로
  assert.doesNotMatch(a[1],/노래 한 곡과 함께 소식을 들려준다/);
});
test('The plain talk button still starts the standard Yumin scene',f=>{
  setup(f);f.run("aiTurn=async(...a)=>{calls.push(a)}");
  f.run("dispatchGameAction('talk:yumin')");let c=f.obj('calls[0]');assert.match(c[0],/유민에게 말을 건다$/);assert.match(c[1],/노래 한 곡과 함께 소식을 들려준다/);assert.doesNotMatch(c[1],/플레이어가 고른 말·행동/);
  f.run("calls.length=0;talkYumin()");c=f.obj('calls[0]');assert.match(c[0],/유민에게 말을 건다$/);
  f.run("calls.length=0;G.choices=['유민과 대화'];G.choiceMeta={'유민과 대화':{type:'story',actionId:'talk:yumin'}};pickChoice(0)");c=f.obj('calls[0]');assert.match(c[0],/유민에게 말을 건다$/);   // 버튼 이름과 같은 선택지는 고정 장면
});
test('Other characters keep the chosen words too',f=>{
  setup(f);f.run("aiTurn=async(...a)=>{calls.push(a)};getRel('서연')");
  f.run("visitNPC('서연','학교 소문을 슬쩍 물어본다')");let c=f.obj('calls[0]');
  assert.equal(c[0],'학교 소문을 슬쩍 물어본다');assert.match(c[1],/\[인물 방문\].*\[플레이어가 고른 말·행동\] "학교 소문을 슬쩍 물어본다"/s);
  f.run("calls.length=0;visitNPC('서연')");c=f.obj('calls[0]');assert.match(c[0],/서연.* 찾아간다$/);assert.doesNotMatch(c[1],/플레이어가 고른 말·행동/);
});
console.log(`${count} choice-text scenario groups passed.`);

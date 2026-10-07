// Run: node tests/hanbit-invite-answer.test.cjs
// An invitation text from a contact shows accept/decline buttons, so the player can make the appointment without typing a reply.
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
async function test(name,fn){const f=fixture();f.run("G.comp.met=true;getRel('유민');G.chats={};G.inbox=[];G.social=null;G.time='방과 후';G.dayStep=0;G.loc='campus';G.district='hall';G.spot=null;G.battery=6;G.phoneBan=null;G.demerit=0;G.char.name='박도현';migrate();syncSchedule();const prompts=[],systems=[];addLog=()=>{};render=()=>{};renderSocialTabs=()=>{};save=()=>{};let replies=[];callAI=async(sys,user)=>{systems.push(sys);prompts.push(user);const r=replies.length?replies.shift():'응 알겠어';if(r instanceof Error)throw r;return typeof r==='string'?JSON.stringify({reply:r,narration:r,affinity:0,hint:'',appointment:null}):JSON.stringify(r)};");await fn(f);count++;console.log('PASS',name)}
(async()=>{
await test('The invite from the screenshot gets buttons; accepting books the appointment',async f=>{
  f.run("G.day=7;replies=['도현아, 방에만 있으니까 심심하지 않아? 내일 아침에 매점 앞에서 볼까~']");await f.run("chatIncoming('유민','invite')");
  const m=f.obj("chatSt('유민').at(-1)");assert.ok(m.inv,'invite recognised');
  const html=f.run("bubbleHTML(chatSt('유민').at(-1),'유민')");assert.match(html,/answerInvite\(this\.dataset\.name,\+this\.dataset\.n,true\)">👍 좋아, 갈게/);assert.match(html,/🙅 이번엔 어려워/);
  assert.equal(f.run('answerInvite("유민",'+m.n+',true)'),true);
  const a=f.obj("(G.appts||[]).find(a=>a.name==='유민')");assert.ok(a,'appointment booked');assert.equal(a.where,m.inv.where);assert.equal(Math.floor(a.ord/20),8,'tomorrow');
  assert.equal(f.run("chatSt('유민').at(-1).t"),'좋아, 그때 보자!');assert.doesNotMatch(f.run("bubbleHTML(chatSt('유민').find(x=>x.n==="+m.n+"),'유민')"),/answerInvite/,'buttons gone after answering');
  assert.equal(f.run('answerInvite("유민",'+m.n+',true)'),false,'cannot answer twice');
});
await test('Declining leaves no appointment; an invite from an earlier day no longer shows buttons',async f=>{
  f.run("replies=['내일 아침에 매점 앞에서 볼까?']");await f.run("chatIncoming('유민','invite')");const n=f.run("chatSt('유민').at(-1).n");
  assert.equal(f.run('answerInvite("유민",'+n+',false)'),true);assert.equal(f.run("(G.appts||[]).some(a=>a.name==='유민')"),false);assert.match(f.run("chatSt('유민').at(-1).t"),/이번엔 어려울/);
  f.run("replies=['내일 아침에 매점 앞에서 볼까?']");await f.run("chatIncoming('유민','invite')");const n2=f.run("chatSt('유민').at(-1).n");
  f.run('G.day++');assert.doesNotMatch(f.run("bubbleHTML(chatSt('유민').at(-1),'유민')"),/answerInvite/);assert.equal(f.run('answerInvite("유민",'+n2+',true)'),false);
  // 약속 제안이 아닌 문자에는 버튼이 없다
  f.run("replies=['오늘 급식 맛있더라']");await f.run("chatIncoming('유민','chat')");assert.doesNotMatch(f.run("bubbleHTML(chatSt('유민').at(-1),'유민')"),/answerInvite/);
});
console.log(`${count} invite-answer scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

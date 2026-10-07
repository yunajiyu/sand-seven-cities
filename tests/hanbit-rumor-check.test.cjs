// Run: node tests/hanbit-rumor-check.test.cjs
// Rumors on the case board can be checked in person and end up confirmed, refuted or partly true instead of staying rumors forever.
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
// 매 테스트: 캠퍼스 학생회관 쪽 사건에 소문 하나, 도서관 쪽에 소문 하나. AI 응답은 queue로 준다
const setup=`seed('campus');G.time='방과 후';G.district='hall';G.spot=null;let pendingStory,prompts=[],logs=[];const queue=[];
  aiTurn=(...args)=>pendingStory=liveAiTurn(...args);queueLex=()=>{};maybeSummarize=async()=>{};addLog=(t,x)=>logs.push([t,x]);
  callAI=async(sys,user)=>{prompts.push(user);return JSON.stringify(queue.length?queue.shift():{narration:'둘러본다.',choices:[],effects:{}})};
  const here=knowledgePlace(), other='campus:'+Object.keys(DISTRICTS).find(k=>k!==G.district&&!needDormCheck(k));
  const R1=addCanon('밤마다 계단 거울에 다른 사람이 비친다는 소문',true,true,{scope:'local',placeId:here,kind:'rumor'});
  const R2=addCanon('그곳 사물함 하나는 열면 비어 있다는 소문',true,true,{scope:'local',placeId:other,kind:'rumor'});`;
(async()=>{
await test('A rumor shows a check button, and checking it in person turns it into a confirmed fact that leaves the rumor list',async({run,obj})=>{
  run(setup);
  assert.equal(run('notebookCategory(R1)'),'rumor');
  assert.match(run('notebookGroupsHTML(notebookRecords(),true)'),/checkRumor\(this\.dataset\.ev\)[^<]*>🔎 직접 확인하기/);
  run("queue.push({narration:'거울 앞에 서자 뒤편 창문에 비친 내 그림자가 겹쳐 보인다.',choices:[],effects:{rumor_check:{result:'partial',fact:'거울에 비친 건 다른 사람이 아니라 뒤편 창문에 겹친 내 그림자였다.'}}})");
  assert.equal(run('checkRumor(R1.id)'),true);await run('pendingStory');
  assert.match(run('prompts.at(-1)'),/\[소문 확인\].*밤마다 계단 거울/);
  assert.deepEqual(obj('[R1.checked.result,notebookCategory(R1)]'),['partial','background']);
  const fact=obj('G.evidence.find(e=>e.id===R1.checked.factId)');
  assert.equal(fact.kind,'fact');assert.equal(fact.caseId,run('R1.caseId'),'the fact joins the same case');assert.match(fact.text,/그림자/);
  assert.ok(obj('logs').some(([t,x])=>t==='fx'&&/소문 확인 — 일부만 사실/.test(x)));
  const html=run('notebookGroupsHTML(notebookRecords(),true)');assert.match(html,/소문 → 일부만 사실/);assert.doesNotMatch(html,/data-ev="[^"]*"[^>]*>🔎 직접 확인하기<\/button>[^]*밤마다/);
  assert.equal(run('checkRumor(R1.id)'),false,'a checked rumor cannot be checked again');
});
await test('A rumor about another campus place moves the player there first, then checks it',async({run})=>{
  run(setup);
  assert.match(run('rumorCheckButton(R2)'),/에서 확인하기/);
  run("queue.push({narration:'사물함을 열자 안에 낡은 체육복이 들어 있다.',choices:[],effects:{rumor_check:{result:'refuted',fact:'사물함 안에는 낡은 체육복이 그대로 들어 있었다.'}}})");
  assert.equal(run('checkRumor(R2.id)'),true);await run('pendingStory');
  assert.equal(run('knowledgePlace()'),run('other'));assert.equal(run('R2.checked.result'),'refuted');
  assert.equal(run('G.evidence.find(e=>e.id===R2.checked.factId).role'),'refutes');
});
await test('No clear answer from the AI keeps the rumor open to try again; places far away only show where to go',async({run})=>{
  run(setup);
  run("queue.push({narration:'둘러봤지만 잘 모르겠다.',choices:[],effects:{rumor_check:{result:'unknown',fact:''}}})");
  run('checkRumor(R1.id)');await run('pendingStory');
  assert.equal(run('R1.checked'),undefined);assert.equal(run('R1.checkTries'),1);assert.equal(run('notebookCategory(R1)'),'rumor');
  assert.ok(run("logs.some(([t,x])=>/다시 확인할 수 있습니다/.test(x))"));
  assert.equal(run("PENDING.flags.rumorCheck"),undefined,'the check flag does not leak into the next turn');
  // 다른 동네 소문은 거기 가야 확인할 수 있다
  run("const R3=addCanon('강 건너 동네 버스 정류장에 밤마다 막차가 선다는 소문',true,true,{scope:'local',placeId:'hood:'+Object.keys(HOODS)[0],kind:'rumor'})");
  assert.match(run('rumorCheckButton(R3)'),/📍 .*에서 확인 가능/);assert.equal(run('checkRumor(R3.id)'),false);
  // 고정 사건(비공개 미스터리)의 기록과 이미 사실인 기록에는 버튼이 없다
  run("const F=addCanon('복도 끝 창문이 열려 있었다',true,true,{scope:'local',placeId:here,kind:'fact'})");assert.equal(run('rumorCheckButton(F)'),'');
});
console.log(`${count} rumor-check scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

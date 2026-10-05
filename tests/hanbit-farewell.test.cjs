// Run: node tests/hanbit-cases-actions.test.cjs
// Uses the actual game script. DOM/storage and network AI calls are stubbed.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../hanbit.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
new vm.Script(script);
function fixture(){
  const el={style:{},dataset:{},value:'',insertAdjacentHTML(){},remove(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},querySelectorAll(){return []},setAttribute(){},getAttribute(){return null}};
  const ctx=vm.createContext({console,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return el},querySelector(){return el},querySelectorAll(){return []},addEventListener(){},documentElement:el},window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math:Object.create(Math)});
  vm.runInContext(script.slice(0,script.indexOf('/* 시작: 화면 설정 적용')),ctx);
  const run=s=>vm.runInContext(s,ctx),obj=s=>JSON.parse(JSON.stringify(run(s)));
  run(`const calls=[],notices=[]; let chipHTML='',modalHTML='';
    addLog=()=>{};toast=s=>notices.push(s);render=()=>{};renderSides=()=>{};save=()=>{};sfx=()=>{};
    maybeIncoming=()=>{};closeModal=()=>{};apptRefresh=()=>{};renderChat=()=>{};askConfirm=async()=>true;const liveAiTurn=aiTurn;aiTurn=async(...args)=>calls.push(args);
    chip=s=>{chipHTML=s};hideChip=()=>{};modal=(title,s)=>{modalHTML=s};
    function seed(loc='site'){
      G={v:1,_relVersion:2,_clockVersion:2,_affLv:2,char:{name:'테스트',age:17,stats:{str:1,wis:1,cha:1,sur:1},traits:[]},day:1,time:'방과 후',dayStep:0,loc,steps:0,hp:12,maxhp:12,calm:6,battery:6,torch:5,cash:100,items:[],mat:{metal:0,ply:0,wire:0,keepsake:0},act:1,fragments:0,sitesDone:0,district:'music',comp:{met:false,joined:false,aff:10},rel:{},chronicle:[],site:loc==='site'?{name:'피아노 괴담 구역',pos:{x:225,y:180},depth:1,cur:'r1',rooms:[{id:'r1',name:'입구',lv:0,danger:0,visited:true,exits:['r2','r3']},{id:'r2',name:'피아노실',lv:1,danger:0,visited:true,exits:['r1']},{id:'r3',name:'방송실',lv:1,danger:0,visited:true,exits:['r1']},{id:'r4',name:'창고',lv:2,danger:0,visited:true,exits:['r3']}]}:null};
      busy=false;PENDING={note:'',flags:{}};migrate();syncSchedule();Math.random=()=>0.99;calls.length=notices.length=0;chipHTML=modalHTML='';
    }
    seed('campus');G.comp.met=true;getRel('유민');getRel('서연');G.comp.spot='market';G.comp.spotKey=yKey();
  `);
  return {run,obj,input:el};
}
let count=0;
async function test(name,fn){await fn(fixture());count++;console.log('PASS',name)}
function setup(run,kind){run(`seed('site');G.comp.met=true;G.comp.joined=${kind==='yumin'};G.comp.spot='${kind==='yumin'?'with':'market'}';getRel('유민').stage=5;getRel('유민').romanceConfirmed=true;getRel('서연').stage=2;${kind==='guest'?"G.guest={name:'서연',zone:G.site.name,day:G.day};G.rel['서연'].where=placeKey();G.rel['서연'].visitZone=G.site.name;":''}aiTurn=liveAiTurn;maybeSummarize=async()=>{};checkState=()=>{};const logEvents=[];addLog=(type,text)=>logEvents.push({type,text,joined:G.comp.joined,guest:!!G.guest});`)}
(async()=>{
for(const kind of ['yumin','guest']){
await test(kind+' stays joined while AI writes and leaves only after the farewell scene',async({run})=>{
  setup(run,kind);run("let reply;let farewellPrompt='';callAI=(sys,prompt)=>{farewellPrompt=prompt;return new Promise(r=>reply=r)};const before=JSON.stringify({day:G.day,time:G.time,slot:G.dayStep,hp:G.hp,calm:G.calm});");const pending=run(kind==='yumin'?'partYumin()':'partGuest()');assert.equal(run('busy'),true);assert.equal(run(kind==='yumin'?'G.comp.joined':'!!G.guest'),true);
  await run(kind==='yumin'?'partYumin()':'partGuest()');assert.equal(run("logEvents.filter(e=>e.type==='action').length"),1);
  run("reply(JSON.stringify({narration:'서로 손을 흔들며 작별 인사를 나눈다.',칸종료:true,effects:{공포:2,유민호감:-5,relations:[{name:'서연',delta:-5}],companion_join:true},choices:[],약속:{인물:'유민',장소:'음악실',때:'내일'}}))");await pending;
  assert.equal(run(kind==='yumin'?'G.comp.joined':'!!G.guest'),false);assert.equal(run('busy'),false);assert.equal(run('before'),run('JSON.stringify({day:G.day,time:G.time,slot:G.dayStep,hp:G.hp,calm:G.calm})'));
  const events=JSON.parse(JSON.stringify(run('logEvents'))),scene=events.find(e=>e.type==='scene'),ended=events.findIndex(e=>e.type==='sys'&&/헤어졌습니다/.test(e.text));assert.equal(kind==='yumin'?scene.joined:scene.guest,true);assert.ok(ended>events.findIndex(e=>e.type==='scene'));
  assert.equal(run("G.rel['유민'].stage"),5);assert.equal(run('(G.appts||[]).length'),0);assert.match(run('farewellPrompt'),/아직 떠나지 않았다/);
});
await test(kind+' gets a local farewell before leaving when AI is unavailable',async({run})=>{setup(run,kind);run("callAI=async()=>{throw new Error('NO_KEY')}");await run(kind==='yumin'?'partYumin()':'partGuest()');assert.equal(run(kind==='yumin'?'G.comp.joined':'!!G.guest'),false);assert.match(run("logEvents.find(e=>e.type==='scene').text"),/인사를 나눈다/)});
}
await test('Departing one ordinary NPC leaves other invited companions present',async({run})=>{setup(run,'guest');run("getRel('지훈').where=placeKey();G.rel['지훈'].visitZone=G.site.name;callAI=async()=>JSON.stringify({narration:'서연과 인사를 나누고 잠시 헤어진다.',choices:[]})");await run('partGuest()');assert.equal(run('G.guest.name'),'지훈');assert.equal(run("canMeetHere('지훈')"),true);assert.equal(run("canMeetHere('서연')"),false)});
await test('Replies for an old game cannot detach companions in a replacement game',async({run})=>{setup(run,'yumin');run('let reply;callAI=()=>new Promise(r=>reply=r)');const pending=run('partYumin()');run("seed('site');G.comp.met=true;G.comp.joined=true;reply(JSON.stringify({narration:'작별한다.',choices:[]}))");await pending;assert.equal(run('G.comp.joined'),true)});
await test('No active companion and busy turns do not start a farewell',async({run})=>{run('G.comp.joined=false;G.guest=null;let n=0;callAI=async()=>{n++;return JSON.stringify({narration:"작별"})};aiTurn=liveAiTurn;');await run('partYumin()');await run('partGuest()');assert.equal(run('n'),0);run('G.comp.joined=true;busy=true');await run('partYumin()');assert.equal(run('n'),0)});
await test('A second click cannot restart departure while post-scene summary is pending',async({run})=>{
  setup(run,'yumin');run("let finishSummary;let n=0;callAI=async()=>{n++;return JSON.stringify({narration:'작별 인사를 나눈다.',choices:[]})};maybeSummarize=()=>new Promise(r=>finishSummary=r)");const pending=run('partYumin()');await new Promise(r=>setImmediate(r));assert.equal(run('busy'),false);await run('partYumin()');assert.equal(run('n'),1);run('finishSummary()');await pending;assert.equal(run('G.comp.joined'),false);assert.equal(run('farewellPending'),null);
});
console.log(`${count} farewell scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

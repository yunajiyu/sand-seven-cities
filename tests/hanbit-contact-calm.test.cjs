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
      G={v:1,_phoneLightVersion:1,_fearBalanceVersion:1,_relVersion:2,_clockVersion:2,_affLv:2,char:{name:'테스트',age:17,stats:{str:1,wis:1,cha:1,sur:1},traits:[]},day:1,time:'방과 후',dayStep:0,loc,steps:0,hp:12,maxhp:12,calm:10,battery:6,torch:0,cash:100,items:[],mat:{metal:0,ply:0,wire:0,keepsake:0},act:1,fragments:0,sitesDone:0,district:'music',comp:{met:false,joined:false,aff:10},rel:{},chronicle:[],site:loc==='site'?{name:'피아노 괴담 구역',pos:{x:225,y:180},depth:1,cur:'r1',rooms:[{id:'r1',name:'입구',lv:0,danger:0,visited:true,exits:['r2','r3']},{id:'r2',name:'피아노실',lv:1,danger:0,visited:true,exits:['r1']},{id:'r3',name:'방송실',lv:1,danger:0,visited:true,exits:['r1']},{id:'r4',name:'창고',lv:2,danger:0,visited:true,exits:['r3']}]}:null};
      busy=false;PENDING={note:'',flags:{}};migrate();syncSchedule();Math.random=()=>0.99;calls.length=notices.length=0;chipHTML=modalHTML='';
    }
    seed('campus');G.comp.met=true;getRel('유민');getRel('서연');G.comp.spot='market';G.comp.spotKey=yKey();
  `);
  return {run,obj,input:el};
}
let count=0;
async function test(name,fn){await fn(fixture());count++;console.log('PASS',name)}
function setup(run,name='유민',loc='site'){
  run(`seed('${loc}');G.comp.met=true;G.comp.joined=${name==='유민'};G.comp.spot='with';getRel('유민').stage=2;getRel('서연').stage=2;G.rel['서연'].where=placeKey();G.rel['서연'].whereKey=yKey();G.calm=capW()-3;`);
}
const effect=(name='유민',kind='hand_hold',accepted=true,calm=0)=>`applyEffects({공포:${-calm},안심접촉:{name:'${name}',kind:'${kind}',accepted:${accepted}}},{flags:{},action:'손을 잡는다'})`;
(async()=>{
for(const name of ['유민','서연'])await test(name+' accepted hand holding calms fear at the real site',({run})=>{setup(run,name);const before=run('G.calm');run(effect(name));assert.equal(run('G.calm'),before+1);assert.equal(run('G.contactCalm.total'),1);assert.equal(run(`getRel('${name}').stage`),2)});
await test('Repeated contact is capped per person even if AI also proposes recovery',({run})=>{setup(run);run(effect());const once=run('G.calm');run(effect('유민','shoulder_touch',true,2));assert.equal(run('G.calm'),once);assert.equal(run('G.contactCalm.total'),1)});
await test('Global daily limit is two and resets next day',({run})=>{setup(run);run(effect());run(effect('서연'));run("getRel('지훈').stage=2;G.rel['지훈'].where=placeKey();G.rel['지훈'].whereKey=yKey()");const before=run('G.calm');run(effect('지훈','hand_hold',true,1));assert.equal(run('G.calm'),before);assert.equal(run('G.contactCalm.total'),2);run('G.day++;G.calm=capW()-3;');run(effect());assert.equal(run('G.contactCalm.total'),1)});
await test('Refusal, request alone and absent NPCs cannot heal',({run})=>{setup(run);const before=run('G.calm');run(effect('유민','hand_hold',false,1));assert.equal(run('G.calm'),before);run("G.comp.joined=false;G.comp.spot='market';G.comp.spotKey=yKey()");run(effect('유민','hand_hold',true,1));assert.equal(run('G.calm'),before);assert.equal(run('G.contactCalm||null'),null)});
await test('Friendship is required and hug requires a confirmed lover',({run})=>{setup(run);const before=run('G.calm');run("G.rel['유민'].stage=1");run(effect('유민','hand_hold',true,1));assert.equal(run('G.calm'),before);run("G.rel['유민'].stage=2");run(effect('유민','hug',true,1));assert.equal(run('G.calm'),before);run("G.rel['유민'].stage=5;G.rel['유민'].romanceConfirmed=true");run(effect('유민','hug'));assert.equal(run('G.calm'),before+1)});
await test('Unknown kind, nonexistent person and malformed acceptance are rejected',({run})=>{setup(run);const before=run('G.calm');run(effect('유민','unknown',true,1));run(effect('없는 사람','hand_hold',true,1));run("applyEffects({공포:-1,안심접촉:{name:'유민',kind:'hand_hold',accepted:'true'}},{flags:{}})");assert.equal(run('G.calm'),before);assert.equal(run("G.rel['없는 사람']||null"),null)});
await test('Phone, story-only and zero-supply turns cannot recover from contact',({run})=>{for(const flag of ['remoteContact','storyOnly','zeroSupply']){setup(run);const before=run('G.calm');run(`applyEffects({공포:-1,안심접촉:{name:'유민',kind:'hand_hold',accepted:true}},{flags:{${flag}:true}})`);assert.equal(run('G.calm'),before);assert.equal(run('G.contactCalm||null'),null)}});
await test('Full calm does not consume contact quota; health and supplies are unchanged',({run})=>{setup(run);run('G.calm=capW();const supplies=JSON.stringify({hp:G.hp,battery:G.battery,torch:G.torch});');run(effect());assert.equal(run('G.calm'),run('capW()'));assert.equal(run('G.contactCalm||null'),null);run('G.calm--');run(effect());assert.equal(run('G.calm'),run('capW()'));assert.equal(run('supplies'),run('JSON.stringify({hp:G.hp,battery:G.battery,torch:G.torch})'))});
await test('Contact and AI negative fear do not double-count, while real danger is preserved',({run})=>{setup(run);const before=run('G.calm');run(effect('유민','hand_hold',true,1));assert.equal(run('G.calm'),before+1);setup(run);const start=run('G.calm');run(effect('유민','hand_hold',true,-2));assert.equal(run('G.calm'),start-1)});
await test('Campus and temporary-place contact use the same cap',({run})=>{setup(run,'서연','campus');run("setSpot('강당');G.rel['서연'].where=placeKey();G.rel['서연'].whereKey=yKey()");const before=run('G.calm');run(effect('서연'));run(effect('서연','hand_hold',true,2));assert.equal(run('G.calm'),before+1)});
await test('Real AI response handles contact metadata and publishes the remaining allowance',async({run})=>{setup(run);run("aiTurn=liveAiTurn;callAI=async()=>JSON.stringify({narration:'유민이 고개를 끄덕이고 네 손을 잡는다. 온기가 전해지며 조금 안심한다.',effects:{공포:0,안심접촉:{name:'유민',kind:'hand_hold',accepted:true}},choices:[]});maybeSummarize=async()=>{};checkState=()=>{};");const before=run('G.calm');await run("aiTurn('유민에게 손을 잡아 달라고 부탁한다')");assert.equal(run('G.calm'),before+1);assert.equal(run('G.contactCalm.total'),1);assert.match(run("buildPrompt('이야기한다','')"),/오늘 1\/2회 사용/);assert.equal(run('busy'),false);run('openGuide()');assert.match(run('modalHTML'),/안심 접촉/);assert.match(run('modalHTML'),/같은 상대는 하루 1회/)});
await test('Ordinary unsupported recovery remains blocked in a wild zone',({run})=>{setup(run);const before=run('G.calm');run("applyEffects({공포:-1},{flags:{}})");assert.equal(run('G.calm'),before)});
console.log(`${count} contact/calm scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

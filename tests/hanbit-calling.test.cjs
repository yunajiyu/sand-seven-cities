// Run: node tests/hanbit-calling.test.cjs
// Characters call the player by the given name ("도현아"), never by surname + name ("박도현아") — in the story, texts and relationship scenes.
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
await test('fixCalling turns "박도현아" into "도현아" for any surname length and ending sound',f=>{
  assert.equal(f.run("fixCalling('박도현아, 어디 가? 박도현야 아니고 박도현아!')"),'도현아, 어디 가? 도현아 아니고 도현아!');
  f.run("G.char.name='남궁민수'");assert.equal(f.run("fixCalling('남궁민수야, 잠깐만')"),'민수야, 잠깐만');
  f.run("G.char.name='김하나'");assert.equal(f.run("fixCalling('김하나아~ 김하나야')"),'하나야~ 하나야');
  f.run("G.char.name='박도현';G.char.callName='현'");assert.equal(f.run("fixCalling('박도현아')"),'현아');
  f.run("delete G.char.callName;G.char.name='도현'");assert.equal(f.run("fixCalling('도현아')"),'도현아','two-letter names are left alone');
  f.run("G.char.name='박도현'");assert.equal(f.run("fixCalling('박도현 학생, 교무실로 오세요. 박도현이 왔다.')"),'박도현 학생, 교무실로 오세요. 박도현이 왔다.','formal use is kept');
  assert.match(f.run('callRule()'),/"도현아"\(O\), "박도현아"\(X\)/);f.run("G.char.name='도현'");assert.equal(f.run('callRule()'),'');
});
await test('The companion profile itself no longer instructs the AI to say 박도현아',f=>{
  const p=f.run('yuminProfile()');assert.match(p,/상대 이름을 알게 된 뒤에는 "도현아" \+ "너"로 부르고/);assert.doesNotMatch(p,/"박도현아"\s*\+/);
  f.run("G.char.name='김하나'");assert.match(f.run('yuminProfile()'),/"하나야" \+ "너"/);
  f.run("G.char.name='도현'");assert.match(f.run('yuminProfile()'),/"도현아" \+ "너"/,'two-letter names still work');
  f.run("G.char.name='박도현';G.char.callName='현'");assert.match(f.run('yuminProfile()'),/"현아" \+ "너"/);
});
await test('Story narration and choices are corrected (existing path stays working)',f=>{
  const r=f.obj("normalizeTurn({narration:'유민이 말한다. \"박도현아, 이쪽이야.\"',choices:['박도현아라고 불러 본다',{text:'박도현아, 괜찮아?',type:'story'}]})");
  assert.ok(r.narration.includes('"도현아, 이쪽이야."'));assert.ok(!JSON.stringify(r).includes('박도현아'));
});
await test('Text messages: the prompt tells the AI the short name, and a surname+name reply is corrected before it is stored',async f=>{
  f.run("replies=['박도현아 오늘 뭐 해?']");await f.run("sendFreeMessage('유민','안녕')");
  assert.match(f.run('prompts[0]'),/부를 때는 성을 빼고 "도현아"처럼 이름만 쓴다/);assert.doesNotMatch(f.run('prompts[0]'),/"박도현아"/);
  assert.equal(f.run("chatSt('유민').at(-1).t"),'도현아 오늘 뭐 해?');
  f.run("G.chats={};replies=['박도현야 이따 볼래?']");await f.run("chatIncoming('유민','invite')");assert.equal(f.run("chatSt('유민')[0].t"),'도현아 이따 볼래?');
  // 플레이어가 직접 쓴 문자는 그대로 둔다
  f.run("chatPush('유민','me','박도현아라고 불러 줘')");assert.equal(f.run("chatSt('유민').at(-1).t"),'박도현아라고 불러 줘');
});
await test('Messages already saved with the old form are shown corrected without rewriting the saved data',f=>{
  f.run("G.chats={'유민':[{f:'them',t:'박도현아 어디야?',when:'1일째',n:1,who:'유민'},{f:'me',t:'박도현아 아니고 도현이라고',when:'1일째',n:2}]}");
  const html=f.run("chatSt('유민').map(m=>bubbleHTML(m,'유민')).join('')");assert.match(html,/>도현아 어디야\?</);assert.match(html,/박도현아 아니고 도현이라고/);
  assert.equal(f.run("chatSt('유민')[0].t"),'박도현아 어디야?','stored text is untouched');
});
await test('Scene log entries are shown corrected, including ones saved before the fix',f=>{
  f.run("const made=[];document.createElement=()=>{const e={className:'',set innerHTML(v){this._h=v},get innerHTML(){return this._h},textContent:''};made.push(e);return e};const realGet=document.getElementById;document.getElementById=id=>id==='logInner'?{appendChild(){}}:realGet(id);");
  f.run("appendLogEl({type:'scene',text:'유민이 웃는다. \"박도현아, 가자!\"'});appendLogEl({type:'sys',text:'박도현아 시스템'})");
  assert.match(f.run("made[0].innerHTML"),/&quot;도현아, 가자!&quot;/);assert.doesNotMatch(f.run('made[0].innerHTML'),/박도현아/);assert.equal(f.run('made[1].textContent'),'박도현아 시스템','non-scene entries are not touched');
});
await test('Relationship scenes carry the calling rule and are corrected',async f=>{
  f.run(`const a={id:'s1',name:'유민',kind:'outing',where:placeKey(),step:0,status:'active',scenes:[],choices:[]};G.social={session:a,plans:[],history:[],day:{}};socialPhaseAt=()=>({title:'t',cue:'',choices:[]});replies=[{narration:'유민이 손을 흔든다. "박도현아!"'}];`);
  await f.run("socialScene(G.social.session,'함께 걷는다')");
  assert.match(f.run('systems[0]'),/"도현아"\(O\), "박도현아"\(X\)/);assert.deepEqual(f.obj('G.social.session.scenes'),['유민이 손을 흔든다. "도현아!"']);
  assert.ok(f.run("socialSessionHTML(G.social.session)").includes('도현아!'));
});
console.log(`${count} calling scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

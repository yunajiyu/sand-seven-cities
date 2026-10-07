// Run: node tests/hanbit-chat-meta.test.cjs
// Characters text like real people: no game-feature talk in first messages, replies, fallbacks or the history sent to the AI.
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
async function test(name,fn){const f=fixture();f.run("G.comp.met=true;getRel('유민');G.chats={};G.inbox=[];G.social=null;G.time='방과 후';G.dayStep=0;G.loc='campus';G.district='hall';G.spot=null;G.battery=6;G.phoneBan=null;G.demerit=0;G.rumors=[{region:'음악실',belief:'밤마다 피아노가 혼자 울린다'}];G.heardRumors=[];migrate();syncSchedule();const prompts=[],systems=[];const logs=[];addLog=(t,x)=>logs.push({t,x:String(x)});render=()=>{};renderSocialTabs=()=>{};save=()=>{};let replies=[];callAI=async(sys,user)=>{systems.push(sys);prompts.push(user);const r=replies.length?replies.shift():'응 알겠어! 이따 봐';if(r instanceof Error)throw r;return JSON.stringify({reply:r,affinity:1,hint:'',appointment:null})};");await fn(f);count++;console.log('PASS',name)}
const META=/약속\s*요청|도움\s*요청|요청 화면|메뉴에서|버튼|기능|시스템|선택해|골라 줘|수첩|조사 후보|호감도/;
const OLD=['약속 장소에서 기다렸어. 다음에는 시간과 장소를 다시 확인해 줘.','시간이 맞으면 함께 보자. 약속 요청에서 장소와 시간을 골라 줘.','휴대폰을 쓸 수 있는 시간인지 확인하고 조심해.','필요한 일이 있으면 약속이나 도움 요청으로 알려 줘.'];
(async()=>{
await test('Every first-message topic is written by the AI, not a fixed UI line',async f=>{
  for(const topic of ['missed','invite','warn','rumor','chat']){
    f.run("G.chats={};replies=['오늘 좀 늦게 봐도 돼?'];prompts.length=0");await f.run(`chatIncoming('유민','${topic}')`);
    const sent=f.obj("chatSt('유민').map(m=>m.t)");assert.deepEqual(sent,['오늘 좀 늦게 봐도 돼?'],topic);
    assert.ok(!OLD.some(t=>sent.includes(t)),topic);assert.equal(f.run('prompts.length'),1,topic);assert.match(f.run('prompts[0]'),/유민이\(가\) 플레이어에게 먼저 문자를 보낸다/);
  }
  assert.match(f.run('systems[0]'),/^너는 유민이다\. 같은 학교 학생\/교직원으로서 휴대폰 문자를 보낸다\. JSON만 출력한다\.$/);
  assert.ok(!f.run('systems.join()').includes('게임'));
});
await test('A rumor text carries the rumor itself; progress hints go to the system log, not the character',async f=>{
  f.run("replies=['음악실 피아노 얘기 들었어? 밤마다 혼자 울린대'];G.site={mystery:{}};mysteryPublic=()=>({v2:true,next:['준비실: 녹음기를 틀어 본다'],verification:{room:'장비실'},conclusion:null})");
  await f.run("chatIncoming('유민','rumor')");
  assert.match(f.run('prompts[0]'),/소문 하나를 전한다: 음악실에 대해 도는 이야기 — 밤마다 피아노가 혼자 울린다/);
  assert.doesNotMatch(f.run("chatSt('유민').map(m=>m.t).join()"),/조사 후보|수첩/);
  assert.ok(f.obj('logs').some(l=>l.t==='sys'&&l.x.startsWith('💡 ')&&l.x.includes('조사할 곳')));
});
await test('With no key or a failing API, topic fallbacks stay in-world',async f=>{
  for(const topic of ['missed','invite','warn','rumor','chat']){
    for(const err of ['NO_KEY','HTTP 500']){f.run(`G.chats={};replies=[new Error('${err}')]`);await f.run(`chatIncoming('유민','${topic}')`);const t=f.run("chatSt('유민')[0].t");assert.doesNotMatch(t,META,topic+' '+t);assert.ok(f.run('CHAT_TOPIC_FALLBACK').hasOwnProperty(topic))}
  }
  for(const list of Object.values(f.obj('CHAT_TOPIC_FALLBACK')))for(const t of list){assert.doesNotMatch(t,META,t);assert.doesNotMatch(t,f.run('CHAT_META_RX'),t)}
});
await test('A meta reply is regenerated once, then replaced by an in-world fallback',async f=>{
  f.run("replies=['약속 요청에서 장소와 시간을 골라 줘','그럼 이따 매점 앞에서 볼까?']");const o=await f.run("chatAI('유민','invite','')");
  assert.equal(o.reply,'그럼 이따 매점 앞에서 볼까?');assert.equal(o.confirmed,true);assert.equal(f.run('prompts.length'),2);assert.match(f.run('prompts[1]'),/\[다시 작성\]/);
  f.run("prompts.length=0;replies=['도움 요청 버튼을 눌러 봐','수첩에 적힌 조사 후보를 확인해']");const o2=await f.run("chatAI('유민','warn','')");
  assert.equal(f.run('prompts.length'),2);assert.equal(o2.confirmed,false);assert.equal(o2.aff,0);assert.ok(f.obj('CHAT_TOPIC_FALLBACK.warn').includes(o2.reply));
  // 자유 문자 답장도 같은 검사를 거친다
  f.run("replies=['게임 메뉴에서 선택해 줘','게임 시스템 기능으로 골라 줘']");assert.equal(await f.run("sendFreeMessage('유민','뭐 해?')"),true);assert.doesNotMatch(f.run("chatSt('유민').at(-1).t"),f.run('CHAT_META_RX'));
});
await test('The meta check is narrow: everyday talk about games, menus and buttons passes',f=>{
  const rx=f.run('CHAT_META_RX');
  for(const ok of ['어제 휴대폰 게임 했어? 나 또 졌어 ㅋㅋ','오늘 급식 메뉴 뭐야?','교복 단추 떨어졌어 ㅠ','버스 정류장에서 기다릴게','게임 끝나고 연락할게','이따 볼래? 시간 되면 골라서 말해'])assert.doesNotMatch(ok,rx,ok);
  for(const bad of OLD.filter((t,i)=>i!==2).slice(1).concat(['도움 요청으로 알려 줘','메뉴에서 약속을 선택해 줘','버튼을 눌러 봐','수첩에 적어 둬','조사 후보부터 가 봐','호감도가 올랐네','시스템상 안 돼']))assert.match(bad,rx,bad);
});
await test('Old fixed lines in saved history are kept but not sent to the AI',async f=>{
  f.run(`G.chats={'유민':${JSON.stringify(OLD.map((t,i)=>({f:'them',t,when:'1일째',n:i+1,who:'유민'})))}};chatPush('유민','them','수첩에 적힌 다음 조사 후보 준비실부터 해 봐. 소문과 확인한 사실을 구분해.');chatPush('유민','me','시간이 맞으면 함께 보자. 약속 요청에서 장소와 시간을 골라 줘.');chatPush('유민','them','어제 노래 진짜 좋더라')`);
  const p=f.run("chatPrompt('유민',null,'')");
  for(const t of OLD)assert.ok(!p.includes('유민: '+t),t);assert.ok(!p.includes('유민: 수첩에 적힌'));assert.ok(p.includes('유민: 어제 노래 진짜 좋더라'));assert.ok(p.includes('테스트: 시간이 맞으면'),'player lines are never filtered');
  assert.equal(f.run("chatSt('유민').length"),7,'saved data is untouched');
});
await test('The reply prompt forbids game terms and no longer explains game code',f=>{
  const p=f.run("chatPrompt('유민',null,'')");
  assert.match(p,/게임 용어를 쓰지 않는다\. 플레이어에게 무엇을 누르거나 고르라고 하지 않는다\. 인물이 실제로 보낼 법한 문자만 쓴다\./);
  assert.doesNotMatch(p,/게임 코드가/);assert.match(p,/약속 장소에 실제로 오는 건 그 시간이 됐을 때다/);
});
const settle=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r))};
await test('Help request: the character answers in its own voice; the progress hint goes to the system log',async f=>{
  f.run("replies=['3층 음악실 쪽이 수상하다던데, 한번 들어 봐'];G.site={mystery:{}};mysteryPublic=()=>({v2:true,question:'빈 방에서 소리가 반복되는 이유는?',next:['준비실: 녹음기를 틀어 본다'],verification:{room:'장비실'},conclusion:null})");
  const before=f.run("relAff('유민')");assert.equal(f.run("sendSocialMessage('유민','help')"),true);
  assert.equal(f.run("relAff('유민')-"+before),f.run('AFF_RATE'),'reward unchanged');
  await settle();
  const msgs=f.obj("chatSt('유민').map(m=>[m.f,m.t])");assert.deepEqual(msgs.at(-1),['them','3층 음악실 쪽이 수상하다던데, 한번 들어 봐']);
  assert.doesNotMatch(msgs.map(m=>m[1]).join('|'),f.run('CHAT_META_RX'));assert.doesNotMatch(msgs.map(m=>m[1]).join('|'),/조사 후보|확인해 줘/);
  assert.ok(f.obj('logs').some(l=>l.t==='sys'&&l.x.startsWith('💡 ')&&l.x.includes('조사할 곳')));
  const p=f.run('prompts.at(-1)');assert.match(p,/뭐부터 보면 좋을지 물었다/);assert.match(p,/빈 방에서 소리가 반복되는 이유는\?/);assert.doesNotMatch(p,/준비실: 녹음기를 틀어 본다/);assert.match(p,/만나자는 제안·약속을 넣지 않고/);
});
await test('Help request falls back to an in-world line when the AI fails or keeps using game terms',async f=>{
  for(const r of ["[new Error('NO_KEY')]","['수첩에 적힌 조사 후보부터 해 봐','도움 요청 버튼을 눌러']"]){
    f.run("G.chats={};replies="+r);f.run("sendSocialMessage('유민','help')");await settle();
    const t=f.run("chatSt('유민').at(-1).t");assert.ok(f.obj('CHAT_TOPIC_FALLBACK.help').includes(t),t);assert.doesNotMatch(t,f.run('CHAT_META_RX'));
  }
});
await test('Location check names the place only, without telling the player how to move',f=>{
  f.run("G.comp.joined=false;G.comp.spot='market';sendSocialMessage('유민','location')");const t=f.run("chatSt('유민').at(-1).t");
  assert.match(t,/^지금 .+에 있어\.$/);assert.doesNotMatch(t,/지도|선택지|이동하려면|중앙 캠퍼스 지구|「/);
  f.run("G.comp.joined=true");assert.equal(f.run("chatLocationReply('유민')"),'나 지금 너랑 같이 있잖아 ㅋㅋ');
  f.run("npcWhereText=()=>'어디 있는지 알 수 없음';getRel('서연')");assert.doesNotMatch(f.run("chatLocationReply('서연')"),/알 수 없음/);
  // 예전 위치 답장은 AI에 보내는 최근 문자에서 빠진다
  f.run("chatPush('유민','them','지금은 중앙 캠퍼스 지구의 「매점」에 있어. 이동하려면 지도와 이동 선택지를 확인해 줘.')");assert.ok(!f.run("chatPrompt('유민',null,'')").includes('이동 선택지'));
});
console.log(`${count} chat-meta scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

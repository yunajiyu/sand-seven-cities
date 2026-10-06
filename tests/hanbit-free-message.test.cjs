// Run: node tests/hanbit-free-message.test.cjs
// Uses the actual game script. The player can write free text messages to a contact and get an AI reply.
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
async function test(name,fn){const f=fixture();f.run("G.comp.met=true;getRel('유민');G.chats={};G.inbox=[];G.social=null;G.time='방과 후';G.dayStep=0;G.loc='campus';G.district='hall';G.spot=null;G.battery=6;G.phoneBan=null;G.demerit=0;migrate();syncSchedule();const prompts=[];const toasts=[];toast=s=>toasts.push(s);const logs=[];addLog=(t,x)=>logs.push(String(x));render=()=>{};renderSocialTabs=()=>{};save=()=>{};callAI=async(sys,user)=>{prompts.push(user);return JSON.stringify({reply:'응 알겠어! 이따 봐',affinity:1,hint:'',appointment:null})};");await fn(f);count++;console.log('PASS',name)}
(async()=>{
await test('The phone panel offers a free text box for the selected contact',async f=>{
  f.run("socialContact='유민'");const html=f.run('phonePanelHTML()');
  assert.match(html,/✍ 자유롭게 문자 보내기/);assert.match(html,/<input id="freeMsg" data-name="유민" maxlength="120"/);assert.match(html,/onclick="sendFreeFromInput\(\)">보내기/);assert.doesNotMatch(html,/id="freeMsg"[^>]*disabled/);
  f.run('G.battery=0;G.textUse=0');assert.match(f.run('phonePanelHTML()'),/id="freeMsg"[^>]*disabled/);
});
await test('A free message is sent, costs battery, gets a reply and does not move time',async f=>{
  const e0=f.run('batteryEnergy()'),step0=f.run('G.dayStep');
  assert.equal(await f.run("sendFreeMessage('유민','  오늘   급식 뭐야?  ')"),true);
  assert.deepEqual(f.obj("chatSt('유민').map(m=>[m.f,m.t])"),[['me','오늘 급식 뭐야?'],['them','응 알겠어! 이따 봐']]);
  assert.ok(f.run('batteryEnergy()')<e0);assert.equal(f.run('G.dayStep'),step0);assert.equal(f.run('busy'),false);assert.equal(f.run('_chatBusy'),false);
  assert.match(f.run('prompts[0]'),/유민:|오늘 급식 뭐야\?/);assert.match(f.run('prompts[0]'),/플레이어의 마지막 문자에 대한 답장을 쓴다/);
  assert.ok(f.run("G.recent.some(m=>/\\[문자\\].*오늘 급식 뭐야\\?.*응 알겠어/.test(m.text))"));
});
await test('Messages are trimmed to 120 characters and blank ones are refused',async f=>{
  assert.equal(await f.run("sendFreeMessage('유민','   ')"),false);assert.equal(f.run("chatSt('유민').length"),0);assert.match(f.run('toasts.pop()'),/보낼 문자를 입력해 주세요/);
  await f.run("sendFreeMessage('유민','가'.repeat(300))");assert.equal(f.run("chatSt('유민')[0].t.length"),120);
});
await test('If the AI is unavailable a short canned reply still arrives',async f=>{
  f.run("callAI=async()=>{throw new Error('NO_KEY')}");
  assert.equal(await f.run("sendFreeMessage('유민','뭐 해?')"),true);
  assert.equal(f.run("chatSt('유민').length"),2);assert.ok(f.run("CHAT_FALLBACK.includes(chatSt('유민')[1].t)"));
});
await test('The affinity reward is given once per contact per day',async f=>{
  const a0=f.run('relAff("유민")');await f.run("sendFreeMessage('유민','안녕')");const a1=f.run('relAff("유민")');await f.run("sendFreeMessage('유민','또 안녕')");
  assert.ok(a1>a0);assert.equal(f.run('relAff("유민")'),a1);assert.equal(f.run("logs.filter(l=>/문자 교류 · 호감 \\+1/.test(l)).length"),1);
});
await test('Unknown contacts, no battery and phone bans block sending without side effects',async f=>{
  assert.equal(await f.run("sendFreeMessage('없는사람','안녕')"),false);
  f.run('G.battery=0;G.textUse=0');assert.equal(await f.run("sendFreeMessage('유민','안녕')"),false);assert.match(f.run('toasts.pop()'),/배터리가 없어/);
  f.run("G.battery=6;G.phoneBan=G.day+':'+G.time");assert.equal(await f.run("sendFreeMessage('유민','안녕')"),false);assert.match(f.run('toasts.pop()'),/압수/);
  assert.equal(f.run("chatSt('유민').length"),0);assert.equal(f.run('busy'),false);
});
await test('Texting during class can get the phone confiscated (same rule as other texts)',async f=>{
  f.run("G.time='낮';G.dayStep=1;G.district='classroom';syncSchedule();Math.random=()=>0");
  assert.equal(f.run('phoneRestricted()'),'수업 중');
  assert.equal(await f.run("sendFreeMessage('유민','수업 중인데 심심해')"),false);
  assert.equal(f.run('G.demerit'),1);assert.ok(f.run('!!G.phoneBan'));assert.equal(f.run("chatSt('유민').length"),0);
});
await test('A real appointment worded in the text is recorded',async f=>{
  f.run("G.chats={};Math.random=()=>0.99;callAI=async()=>JSON.stringify({reply:'좋아, 방과 후에 도서관에서 보자.',affinity:0,hint:'',appointment:{place:'도서관',when:'방과 후'}})");
  await f.run("sendFreeMessage('유민','방과 후에 도서관에서 만나자')");
  assert.equal(f.run("(G.appts||[]).length"),1);assert.equal(f.run("G.appts[0].name"),'유민');
});
console.log(`${count} free-message scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

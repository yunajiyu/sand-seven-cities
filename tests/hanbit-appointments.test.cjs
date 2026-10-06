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
(async()=>{
for(const name of ['유민','서연']){
await test(name+' waits at the exact temporary place at the scheduled time',({run})=>{
  run(`setSpot('강당');const dest=placeKey();G.spot=null;setAppt('${name}','강당','내일 방과 후');apptSync()`);
  assert.equal(run(`G.appts[0].arrived`),false);assert.equal(run(`canMeetHere('${name}')`),false);
  run('G.day=2;apptSync();');assert.equal(run('G.appts[0].arrived'),true);
  assert.equal(run(name==='유민'?'G.comp.spot':`npcWhere('${name}')`),run('dest'));assert.equal(run(`canMeetHere('${name}')`),false);
  run("setSpot('강당');apptSync()");assert.equal(run(`canMeetHere('${name}')`),true);assert.ok(run(`gameActions().some(a=>a.id==='${name==='유민'?'talk:yumin':'talk:'+encodeURIComponent(name)}')`));
  assert.equal(run('G.appts[0].met'),true);if(name==='유민') assert.equal(run('yuminHere()'),true);
});
await test(name+' receives real text agreement for a temporary place without AI redirect',async({run,input})=>{
  run(`setSpot('강당');const dest=placeKey();_chatWith='${name}';callAI=async()=>JSON.stringify({reply:'좋아, 내일 방과 후 강당에서 보자.',appointment:{place:'도서관',when:'저녁'}});`);
  run(`sendSocialMessage('${name}','meet',{where:dest,ord:50})`);assert.equal(run('G.appts[0].where'),run('dest'));assert.equal(run('G.appts[0].ord'),50);assert.equal(run('G.appts[0].arrived'),false);
  run('G.day=2;apptSync();');assert.equal(run(`canMeetHere('${name}')`),true);
});
await test(name+' reaches a rumored zone after its lead has been consumed',async({run,input})=>{
  run(`G.leads=[{id:'l1',name:'푸른 터널'}];_chatWith='${name}';callAI=async()=>JSON.stringify({reply:'좋아, 내일 방과 후 터널 입구에서 보자.',appointment:{place:'푸른 터널',when:'내일 방과 후'}})`);
  run(`sendSocialMessage('${name}','meet',{where:'lead:푸른 터널',ord:50})`);assert.equal(run('G.appts[0].where'),'lead:푸른 터널');
  run("G.day=2;G.leads=[];G.loc='site';G.site={name:'푸른 터널',uid:'z123',cur:'r1',rooms:[{id:'r1',name:'입구',exits:[],danger:0}]};apptSync();updateYuminSpot()");
  assert.equal(run(`canMeetHere('${name}')`),true);assert.equal(run(name==='유민'?'G.comp.spot':`npcWhere('${name}')`),'lead:푸른 터널');assert.ok(run(`gameActions().some(a=>a.id==='${name==='유민'?'talk:yumin':'talk:'+encodeURIComponent(name)}')`));
  run("G.loc='shelter'");assert.equal(run(`canMeetHere('${name}')`),true);
  run("G.loc='campus';G.site=null;guestCheck()");assert.equal(run(`canMeetHere('${name}')`),false);
});
await test(name+' refuses even if AI accidentally supplies appointment metadata',async({run,input})=>{
  run(`setSpot('강당');_chatWith='${name}';Math.random=()=>0;callAI=async()=>JSON.stringify({reply:'좋아, 지금 갈게.',appointment:{place:'강당',when:'지금'}});`);
  run(`sendSocialMessage('${name}','meet',{where:placeKey(),ord:apptOrd()})`);assert.equal(run('(G.appts||[]).length'),0);assert.equal(run(`canMeetHere('${name}')`),false);
});
await test(name+' cancellation and missed meetings remove temporary location claims',({run})=>{
  run(`setSpot('강당');setAppt('${name}','강당','지금');apptSync();G.spot=null;apptCancel(0)`);assert.equal(run('(G.appts||[]).length'),0);assert.ok(!run(name==='유민'?"String(G.comp.spot).startsWith('spot:')":`String(npcWhere('${name}')).startsWith('spot:')`));
  run(`setAppt('${name}','강당','지금');apptSync();G.time='야간';apptSync()`);assert.equal(run('G.appts.length'),0);assert.equal(run('G.missed.length'),1);assert.ok(!run(name==='유민'?"String(G.comp.spot).startsWith('spot:')":`String(npcWhere('${name}')).startsWith('spot:')`));
});
}
await test('Same temporary name in two districts cannot place an NPC in both',({run})=>{
  run("setSpot('강당');const musicSpot=placeKey();setAppt('서연',musicSpot,'지금');apptSync();G.spot=null;G.district='library';setSpot('강당');const librarySpot=placeKey()");assert.notEqual(run('musicSpot'),run('librarySpot'));assert.equal(run("canMeetHere('서연')"),false);assert.equal(run('apptPlaceKey("강당")'),run('librarySpot'));assert.match(run('apptWhereName(musicSpot)'),/음악/);
});
await test('Old name-only spot saves gain persistent keys and retain destinations after leaving',({run})=>{
  run("G.spot={name:'강당'};const before=placeKey();G.spot=null;G.district='library';migrate();const after=apptPlaceKey('강당')");assert.equal(run('before'),run('after'));assert.equal(run('G.tempPlaces.length'),1);run('migrate();tempPlaces()');assert.equal(run('G.tempPlaces.length'),1);
});
await test('Functional requests use discovered temporary places and cannot invent a destination',({run})=>{
  assert.equal(run("sendSocialMessage('서연','meet',{where:'spot:music:unknown',ord:50})"),false);run("setSpot('강당');const registered=placeKey();sendSocialMessage('서연','meet',{where:registered,ord:50})");assert.equal(run('G.tempPlaces[0].name'),'강당');assert.equal(run('G.appts[0].where'),run('G.tempPlaces[0].id'));assert.equal(run('G.tempPlaces.length'),1);
  assert.equal(run("apptPlaceKey('지금 와줘')"),null);assert.equal(run("apptPlaceKey('응 좋아')"),null);
});
await test('Invalid movement keys and unregistered external locations cannot become appointments',({run})=>{
  run("G.loc='hood';G.hood='south'");for(const target of ['lead:없는 구역','spot:music:unknown','campus:invalid','없는 구역'])assert.equal(run(`setAppt('서연',${JSON.stringify(target)},'지금')`),false);assert.equal(run('(G.appts||[]).length'),0);
});
await test('Functional text binds the exact saved place rather than interpreting AI location names',({run})=>{
  run("setSpot('강당');const dest=placeKey();sendSocialMessage('유민','meet',{where:dest,ord:apptOrd()});G.spot=null;G.district='library';chatPrompt('서연')");
  assert.equal(run('G.comp.spot'),run('dest'));assert.equal(run('G.appts[0].where'),run('dest'));assert.equal(run("canMeetHere('유민')"),false);run("G.district='music';setSpot('강당')");assert.equal(run("canMeetHere('유민')"),true);
});
await test('Incoming proposals become appointments only after selecting the functional request',({run})=>{
  run("setSpot('강당');const dest=placeKey();chatPush('서연','them','내일 방과 후 강당에서 만나자')");assert.equal(run('(G.appts||[]).length'),0);run("sendSocialMessage('서연','meet',{where:dest,ord:50})");assert.equal(run('G.appts[0].where'),run('dest'));
});
await test('Arbitrary text no longer creates appointments or spends resources',async({run,input})=>{
  run("setSpot('강당');_chatWith='유민';const batteryBefore=G.battery");input.value='지금 강당으로 와줘';await run('sendChat()');assert.equal(run('(G.appts||[]).length'),0);assert.equal(run('G.battery'),run('batteryBefore'));
});
await test('Late arrival cannot meet an NPC after the rumored-place deadline',({run})=>{
  run("G.leads=[{name:'푸른 터널'}];setAppt('유민','푸른 터널','지금');G.day+=3;G.loc='site';G.site={name:'푸른 터널'};G.leads=[];apptSync()");assert.equal(run('G.appts.length'),0);assert.equal(run('G._apptMeet||null'),null);assert.equal(run("canMeetHere('유민')"),false);assert.equal(run('G.missed.length'),1);
});
await test('Waiting Yumin remains at a lead across time slots and joins at the normal affinity threshold',({run})=>{
  run("G.leads=[{name:'푸른 터널'}];setAppt('유민','푸른 터널','지금');apptSync();G.time='야간';updateYuminSpot()");assert.equal(run('G.comp.spot'),'lead:푸른 터널');assert.equal(run('G.comp.joined'),false);
  run("G.comp.aff=1000;G.loc='site';G.site={name:'푸른 터널'};apptSync()");assert.equal(run('G.comp.joined'),true);assert.equal(run("canMeetHere('유민')"),true);
});
await test('Temporary appointment screen and text prompt show the concrete destination',({run})=>{
  run("setSpot('강당');setAppt('서연','강당','내일 방과 후')");assert.match(run('apptListHTML()'),/강당/);assert.match(run('apptListHTML()'),/spot:music:/);assert.match(run("chatPrompt('서연')"),/강당 \(음악실 안 임시장소\)/);assert.match(run("TURN_SCHEMA"),/임시장소/);
});
await test('Normal appointments keep their place restrictions and duplicate handling',({run})=>{
  assert.equal(run("setAppt('유민','아지트','내일 방과 후')"),false);assert.equal(run("setAppt('서연','급식실','내일 방과 후')"),false);assert.equal(run("setAppt('서연','급식실','내일 점심')"),true);
  run("setAppt('서연','도서관','내일 방과 후');setAppt('서연','도서관','내일 방과 후')");assert.equal(run('G.appts.length'),1);run("G.day=2;G.district='library';apptSync()");assert.equal(run("canMeetHere('서연')"),true);
});
await test('Story agreement reaches a real temporary NPC location and rejects refused requests',async({run})=>{
  run("setSpot('강당');aiTurn=liveAiTurn;callAI=async()=>JSON.stringify({narration:'서연은 강당에서 내일 방과 후에 만나기로 했다.',약속:{인물:'서연',장소:'강당',때:'내일 방과 후'},choices:[]});maybeSummarize=async()=>{};checkState=()=>{};");await run("aiTurn('서연에게 내일 강당으로 와달라고 한다')");assert.equal(run('G.appts[0].where'),run('placeKey()'));run('G.day=2;apptSync()');assert.equal(run("canMeetHere('서연')"),true);
  run("G.appts=[];applyAppt({narration:'서연은 갈 수 없다고 거절했다.',appt:{name:'서연',place:'강당',when:'내일'}},'서연에게 강당으로 와줘라고 한다')");assert.equal(run('G.appts.length'),0);
});
await test('Phone dialogue effects cannot teleport a remote NPC and visit buttons enforce presence',({run})=>{
  run("setSpot('강당');const r=getRel('서연');r.where='campus:library';r.whereKey=yKey();applyEffects({relations:[{name:'서연',aff:1}]},{flags:{remoteContact:true},action:'서연에게 전화를 건다'});");assert.equal(run("G.rel['서연'].where"),'campus:library');run("visitNPC('서연')");assert.equal(run('calls.length'),0);
});
await test('Phone meet button opens functional requests without teleporting or confirming an appointment',({run})=>{
  run("setSpot('강당');phoneAct('유민','meet')");assert.equal(run('(G.appts||[]).length'),0);assert.equal(run('G.comp.spot'),'market');assert.equal(run('gameTab'),'messages');run("sendSocialMessage('유민','meet',{where:placeKey(),ord:50})");assert.equal(run('G.appts[0].where'),run('placeKey()'));assert.equal(run('G.comp.spot'),'market');
});
await test('Several invited NPCs are present together and all leave with the zone',({run})=>{
  run("getRel('지훈');G.leads=[{name:'푸른 터널'}];setAppt('서연','푸른 터널','지금');setAppt('지훈','푸른 터널','지금');G.loc='site';G.site={name:'푸른 터널'};apptSync();");assert.equal(run("canMeetHere('서연')&&canMeetHere('지훈')"),true);
  const context=run("HOOKS.context.find(h=>h.fn.toString().includes('[함께하는 인물:')).fn()");assert.match(context,/서연/);assert.match(context,/지훈/);assert.equal(run("Object.keys(G.rel).includes('서연, 지훈')"),false);
  run("G.loc='campus';G.site=null;guestCheck();G.loc='site';G.site={name:'푸른 터널'}");assert.equal(run("canMeetHere('서연')||canMeetHere('지훈')"),false);
});
for(const name of ['유민','서연']){
await test(name+' actual dialogue remains at the temporary destination across its time cost',async({run})=>{
  run(`setSpot('강당');const dest=placeKey();setAppt('${name}','강당','지금');apptSync();let dialoguePrompt='';aiTurn=liveAiTurn;callAI=async(sys,prompt)=>{dialoguePrompt=prompt;return JSON.stringify({narration:'강당에서 약속한 상대와 이야기를 나눈다.',choices:[]})};maybeSummarize=async()=>{};checkState=()=>{};dispatchGameAction('${name==='유민'?'talk:yumin':'talk:'+encodeURIComponent(name)}');`);
  await new Promise(r=>setImmediate(r));assert.equal(run('busy'),false);assert.match(run('dialoguePrompt'),/강당/);assert.equal(run(name==='유민'?'G.comp.spot':`npcWhere('${name}')`),run('dest'));assert.equal(run(`canMeetHere('${name}')`),true);
  if(name==='유민') assert.match(run('dialoguePrompt'),/지금 함께 있음: 예/);
});
}
console.log(`${count} appointment/text scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

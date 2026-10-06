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
await test('Gameplay and messages expose no arbitrary action composer',({run})=>{
 assert.ok(!/<input[^>]*id="freeInput"/.test(html));assert.ok(!/<textarea[^>]*id="chatIn"/.test(run('phonePanelHTML()')));assert.match(run('phonePanelHTML()'),/sendSocialMessage/);assert.match(run('sysBase()'),/선택지만/);
 run('const before=G.steps;freeAct();sendChat()');assert.equal(run('G.steps'),run('before'));assert.equal(run('calls.length'),0);
});
await test('Tabs and legacy outing buttons only change view',({run})=>{
 run("const before=G.steps;switchGameTab('messages');openOuting()");assert.equal(run('gameTab'),'outings');assert.equal(run('G.steps'),run('before'));assert.equal(run('G.cash'),100);
});
await test('Message forms have separate IDs per contact and purpose',({run})=>{
 const a=run("socialMessageFormHTML('유민','outing')"),b=run("socialMessageFormHTML('서연','outing')"),c=run("socialMessageFormHTML('유민','date')");const ids=x=>[...x.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set([...ids(a),...ids(b),...ids(c)]).size,6);
});
await test('Help rewards once per contact per day and drains each delivered message',({run})=>{
 run("const before=relAff('유민');const steps=G.steps;sendSocialMessage('유민','help');sendSocialMessage('유민','help')");assert.equal(run("relAff('유민')-before"),run('AFF_RATE'));assert.equal(run('G.textUse'),2);assert.equal(run('G.steps'),run('steps'));run("G.day++;sendSocialMessage('유민','help')");assert.equal(run("relAff('유민')-before"),run('2*AFF_RATE'));
});
await test('Help uses only the public mystery view',({run})=>{
 run("G.site={mystery:{answer:'비공개 범인'}};mysteryPublic=()=>({next:['공개 복도'],conclusion:null})");assert.match(run('socialHelpText()'),/공개 복도/);assert.doesNotMatch(run('socialHelpText()'),/비공개 범인/);
});
await test('Invalid place or ordinal cannot charge a message or create an appointment',({run})=>{
 for(const expression of ["{where:'campus:missing',ord:50}","{where:'campus:market',ord:999}","{where:'campus:market',ord:1}"]){assert.equal(run("sendSocialMessage('유민','meet',"+expression+")"),false)}assert.equal(run('G.battery'),6);assert.equal(run('(G.appts||[]).length'),0);
});
await test('Accepted future outing waits at the exact place and can be cancelled',({run})=>{
 assert.equal(run("sendSocialMessage('서연','outing',{where:'campus:market',ord:50})"),true);assert.equal(run('G.appts[0].arrived'),false);assert.equal(run("canMeetHere('서연')"),false);assert.equal(run('G.social.plans[0].kind'),'outing');run("sendSocialMessage('서연','cancel')");assert.equal(run('G.appts.length'),0);assert.equal(run('G.social.plans[0].status'),'cancelled');
});
await test('Refusal and repeated identical proposal never create an agreement',({run})=>{
 run('Math.random=()=>0');assert.equal(run("sendSocialMessage('서연','outing',{where:'campus:market',ord:50})"),false);run('Math.random=()=>0.99');assert.equal(run("sendSocialMessage('서연','outing',{where:'campus:market',ord:50})"),false);assert.equal(run('(G.appts||[]).length'),0);assert.equal(run('G.textUse'),1);
});
await test('Date requests require an eligible close relationship',({run})=>{
 assert.equal(run("sendSocialMessage('서연','date',{where:'campus:market',ord:50})"),false);run("getRel('서연').stage=5;getRel('서연').romanceConfirmed=true;getRel('서연').romanceEligible=false");assert.equal(run("socialDateEligible('서연')"),false);run("getRel('서연').romanceEligible=true");assert.equal(run("sendSocialMessage('서연','date',{where:'campus:market',ord:50})"),true);
});
await test('Remote contact cannot start an activity or teleport',async({run})=>{
 assert.equal(await run("startSocialActivity('서연','outing')"),false);assert.equal(run('G.cash'),100);assert.equal(run('G.social.session'),null);assert.equal(run("canMeetHere('서연')"),false);
});
for(const name of ['유민','서연']){
await test(name+' local outing pins real presence, charges once and applies selected outcome once',async({run})=>{
 run(`G.district='market';setAppt('${name}','campus:market','지금');apptSync();const before=relAff('${name}');let scenes=0;callAI=async()=>{scenes++;return JSON.stringify({narration:'함께 이야기한다',effects:{호감:999,캐시:999},choices:['악성 이동']})};const clock=G.dayStep`);
 assert.equal(await run(`startSocialActivity('${name}','outing')`),true);assert.equal(run('G.cash'),95);assert.equal(run(`canMeetHere('${name}')`),true);assert.equal(run(`relAff('${name}')`),run('before'));assert.equal(run('G.dayStep'),run('clock+1'));assert.equal(run('G.calm'),10);
 run('const sessionId=activeSocial().id');await run("chooseSocialActivity(sessionId,'listen')");await run("chooseSocialActivity(sessionId,'care')");await run("chooseSocialActivity(sessionId,'thanks')");assert.equal(run(`relAff('${name}')-before`),run('3*AFF_RATE'));assert.equal(run('G.dayStep'),run('clock+2'));assert.equal(run('G.calm'),10);assert.equal(run('G.cash'),95);assert.equal(run('G.social.history.length'),1);assert.equal(run('G.social.session.status'),'done');assert.match(run("socialActivityHTML('outing')"),/함께 이야기한다/);assert.equal(await run("chooseSocialActivity(sessionId,'thanks')"),false);assert.equal(run('G.social.history.length'),1);assert.equal(await run(`startSocialActivity('${name}','outing')`),false);
});
}
await test('Confirmed date has distinct cost and shares the outing quota',async({run})=>{
 run("G.district='market';getRel('서연').stage=5;getRel('서연').romanceEligible=true;getRel('서연').romanceConfirmed=true;setAppt('서연','campus:market','지금');apptSync();callAI=async()=>JSON.stringify({narration:'연인과 나란히 앉는다'})");assert.equal(await run("startSocialActivity('서연','date')"),true);assert.equal(run('G.cash'),92);run('const id=activeSocial().id');for(let i=0;i<3;i++)await run("chooseSocialActivity(id,socialPhaseAt(activeSocial()).choices.slice().sort((a,b)=>a.score-b.score)[0].id)");assert.equal(run('G.social.history[0].aff'),-2);assert.equal(await run("startSocialActivity('서연','outing')"),false);
});
await test('Network failure leaves a playable local scene',async({run})=>{
 run("G.district='market';setAppt('유민','campus:market','지금');apptSync();callAI=async()=>{throw Error('offline')}");await run("startSocialActivity('유민','outing')");assert.equal(run('busy'),false);assert.equal(run('activeSocial().scenes.length'),1);assert.match(run('socialSessionHTML(activeSocial())'),/chooseSocialActivity/);
});
await test('Concurrent double start and double choice cannot repeat costs or rewards',async({run})=>{
 run("G.district='market';setAppt('유민','campus:market','지금');apptSync();let finish;callAI=()=>new Promise(r=>finish=r)");const pending=run("startSocialActivity('유민','outing')");assert.equal(await run("startSocialActivity('유민','outing')"),false);assert.equal(run('G.cash'),95);assert.equal(await run("chooseSocialActivity(activeSocial().id,'listen')"),false);run("finish(JSON.stringify({narration:'기다렸다가 시작한다'}))");await pending;assert.equal(run('busy'),false);assert.equal(run('G.social.session.step'),0);
});
await test('Forged session or phase choice never advances the activity',async({run})=>{
 run("G.district='market';setAppt('서연','campus:market','지금');apptSync();callAI=async()=>''");await run("startSocialActivity('서연','outing')");assert.equal(await run("chooseSocialActivity('forged','listen')"),false);assert.equal(await run("chooseSocialActivity(activeSocial().id,'thanks')"),false);assert.equal(run('activeSocial().step'),0);
});
await test('Leaving the venue cancels without affinity reward or activity fee refund',async({run})=>{
 run("G.district='market';setAppt('유민','campus:market','지금');apptSync();const before=relAff('유민');callAI=async()=>''");await run("startSocialActivity('유민','outing')");run("G.district='library';renderSocialTabs()");assert.equal(run('activeSocial()'),null);assert.equal(run('G.social.session.status'),'cancelled');assert.equal(run("relAff('유민')"),run('before'));assert.equal(run('G.cash'),95);
});
await test('Active activity survives save reload with choices, scenes and quota',async({run,obj})=>{
 run("G.district='market';setAppt('유민','campus:market','지금');apptSync();callAI=async()=>''");await run("startSocialActivity('유민','outing')");await run("chooseSocialActivity(activeSocial().id,'listen')");run('G=JSON.parse(JSON.stringify(G));migrate();socialState()');assert.equal(run('activeSocial().step'),1);assert.equal(run('activeSocial().scenes.length'),2);assert.equal(run('G.social.day.activity'),true);assert.equal(run("canMeetHere('유민')"),true);
});
await test('Old saves gain social state without losing clues or relationships',({run})=>{
 run("G.threads=[{id:'keep',text:'저장 단서'}];getRel('서연').aff=45;delete G.social;socialState()");assert.equal(run('G.threads[0].text'),'저장 단서');assert.equal(run("getRel('서연').aff"),45);assert.equal(run('G.social.version'),1);assert.equal(run('G.social.plans.length'),0);
});
await test('New day resets quota but preserves history and plans',({run})=>{
 run("const s=socialState();s.day.activity=true;s.history.push({name:'유민',result:'완료'});s.plans.push({id:'keep'});G.day++;socialState()");assert.equal(run('G.social.day.activity'),false);assert.equal(run('G.social.history.length'),1);assert.equal(run('G.social.plans[0].id'),'keep');
});
await test('Cancelled and missed appointments update social plan status',({run})=>{
 run("sendSocialMessage('서연','outing',{where:'campus:market',ord:apptOrd()});G.time='야간';apptSync()");assert.equal(run('G.social.plans[0].status'),'missed');
});
console.log(`${count} choice/social scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

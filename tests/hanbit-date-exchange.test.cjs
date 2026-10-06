// Run: node tests/hanbit-date-exchange.test.cjs
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
async function start(run,{where='campus:market',stage=2,lover=false,random=0,day=1}={}){
 run(`G.day=${day};G.time='방과 후';G.dayStep=0;G.cash=100;G.loc='${where.split(':')[0]}';G.district='${where.split(':')[1]}';G.hood='${where.split(':')[1]}';getRel('유민').stage=${stage};getRel('유민').romanceConfirmed=${lover};G.comp.aff=lvTotal(50);setAppt('유민','${where}','지금');apptSync();Math.random=()=>${random};callAI=async()=>{throw Error('offline')}`);
 assert.equal(await run("startSocialActivity('유민','date')"),true);
}
async function choose(run,id){assert.equal(await run(`chooseSocialActivity(activeSocial().id,${JSON.stringify(id)})`),true)}
async function good(run){const id=run('socialPhaseAt(activeSocial()).choices.find(c=>dateChoiceOutcome(activeSocial(),activeSocial().step,c.id).score>0)?.id||socialPhaseAt(activeSocial()).choices[0].id');await choose(run,id)}
async function finish(run){while(run('!!activeSocial()'))await good(run)}
(async()=>{
await test('New dates keep three local choices and unchanged cost, time and resource rules',async({run})=>{
 run('const clock=G.dayStep;const calm=G.calm;const battery=G.battery');await start(run);
 assert.equal(run('G.cash'),92);assert.equal(run('G.dayStep'),1);assert.equal(run('G.calm'),run('calm'));assert.equal(run('G.battery'),run('battery'));
 assert.equal(run('socialPhaseAt(activeSocial()).choices.length'),3);await finish(run);assert.equal(run('G.dayStep'),2);assert.equal(run('G.social.session.choices.length'),3);assert.equal(run('G.social.day.activity'),true);
});
await test('Venue-specific cues differ and remain visible when AI is offline',async({run})=>{
 await start(run,{where:'campus:library'});assert.equal(run('activeSocial().exchange.phases[0].card'),'shelf');assert.match(run('socialSessionHTML(activeSocial())'),/서가|작은 목소리/);
 run('G.social.session=null;G.social.day.activity=false');await start(run,{where:'campus:ground',day:2});assert.equal(run('activeSocial().exchange.phases[0].card'),'pace');assert.match(run('socialSessionHTML(activeSocial())'),/걸음이 조금 느려/);
});
await test('Same venue has multiple situations and choices are not sorted by reward',async({run,obj})=>{
 const cards=new Set(),orders=new Set();for(const random of [0,0.3,0.6,0.99]){run('G.social=null');await start(run,{random});cards.add(run('activeSocial().exchange.phases[0].card'));orders.add(obj('socialPhaseAt(activeSocial()).choices.map(c=>c.id)').join(','))}
 assert.ok(cards.size>=2);assert.ok(orders.size>=3);
});
await test('Asking again is neutral when a visible cue already calls for a rest',async({run})=>{
 await start(run,{where:'campus:ground'});assert.equal(run("socialChoiceAt(activeSocial(),0,'pace:ask').score"),0);assert.equal(run("socialChoiceAt(activeSocial(),0,'pace:rest').score"),1);
});
await test('Lover-only situations require an existing confirmed relationship',async({run})=>{
 await start(run,{random:0.99});assert.equal(run('activeSocial().exchange.phases[0].card'),'pause');run('G.social=null');await start(run,{stage:5,lover:true,random:0.99});assert.equal(run('activeSocial().exchange.phases[0].card'),'reunion');
});
await test('Closer pre-confession stages unlock a different emotional conversation',async({run})=>{
 await start(run,{stage:3,random:0.99});await choose(run,'pause:quiet');assert.equal(run('activeSocial().exchange.phases[1].card'),'special');assert.equal(run("getRel('유민').romanceConfirmed"),false);
});
await test('Issued IDs are revalidated; legacy, foreign-stage and invented choices do nothing',async({run})=>{
 await start(run);for(const id of ['listen','thanks:specific','browse:forged','romance:confess:유민'])assert.equal(await run(`chooseSocialActivity(activeSocial().id,${JSON.stringify(id)})`),false);
 assert.equal(run('activeSocial().step'),0);assert.equal(run('activeSocial().choices.length'),0);assert.equal(run('G.cash'),92);
});
await test('AI effects, choices, invented taste and memory fields cannot mutate state',async({run,obj})=>{
 await start(run);run("callAI=async()=>JSON.stringify({narration:'서로 말을 나눈다',effects:{호감:999,캐시:999},choices:[{id:'teleport',score:999}],dateMemory:{events:['가짜 추억']},likes:{invented:true}})");await good(run);
 assert.equal(run('G.cash'),92);assert.equal(run("dateMemory('유민').events.length"),0);assert.deepEqual(obj('G.comp.likes'),{drink:false,fan:false,instr:false});assert.equal(run('socialPhaseAt(activeSocial()).choices.length'),3);
});
await test('A completed date stores only canonical actual actions and grants progress once',async({run,obj})=>{
 await start(run);await finish(run);assert.equal(run("dateMemory('유민').events.length"),3);assert.equal(run("romanceProgress('유민').closeness"),3);
 const before=obj("dateMemory('유민')");run('recordDateMemory(G.social.session);recordDateProgress(G.social.session)');assert.deepEqual(obj("dateMemory('유민')"),before);assert.equal(run('G.social.history[0].aff'),3);
 assert.equal(await run("chooseSocialActivity(G.social.session.id,G.social.session.choices[2].id)"),false);
});
await test('Interrupted choices do not create memories or change persistent friction',async({run})=>{
 await start(run);await choose(run,'browse:decide');assert.equal(run("dateMemory('유민').tension"),0);run('cancelSocialActivity(activeSocial().id)');assert.equal(run("dateMemory('유민').events.length"),0);assert.equal(run("romanceProgress('유민').closeness"),0);assert.equal(run('G.cash'),92);
});
await test('Leaving the venue does not record the partially played date',async({run})=>{
 await start(run);await good(run);run("G.district='library';renderSocialTabs()");assert.equal(run('activeSocial()'),null);assert.equal(run("dateMemory('유민').events.length"),0);
});
await test('Completed memories lead to a selectable real shared recollection next time',async({run})=>{
 await start(run);await finish(run);await start(run,{day:2,random:0.99});await good(run);
 assert.equal(run('activeSocial().exchange.phases[1].card'),'memory');assert.match(run('socialPhaseAt(activeSocial()).cue'),/지난 1일/);assert.match(run("dateMemoryText('유민')"),/실제 완료한/);
 assert.equal(run('activeSocial().exchange.memory.text'),run("dateMemory('유민').events.at(-1).text"));
});
await test('Preferences appear only after the existing game has discovered them',async({run})=>{
 await start(run,{random:0.99});assert.notEqual(run('activeSocial().exchange.phases[0].card'),'taste');assert.doesNotMatch(run("dateMemoryText('유민')"),/이어폰/);
 run("cancelSocialActivity(activeSocial().id);G.comp.likes.fan=true");await start(run,{day:2,random:0.99});assert.equal(run('activeSocial().exchange.phases[0].card'),'taste');assert.match(run('socialPhaseAt(activeSocial()).cue'),/이어폰/);assert.doesNotMatch(run('socialPhaseAt(activeSocial()).cue'),/악기/);
});
await test('Familiar repeated attitudes lose bonus without an affinity penalty',async({run})=>{
 run("dateMemory('유민').events=[{tag:'space',card:'pace',day:1,where:'campus:ground',text:'곁에서 기다렸다',reaction:'편했다'},{tag:'space',card:'pace',day:2,where:'campus:ground',text:'기다렸다',reaction:'편했다'},{tag:'share',card:'pause',day:2,where:'campus:ground',text:'함께 이야기했다',reaction:'편했다'}]");await start(run,{where:'campus:ground',day:3});
 await choose(run,'pace:slow');assert.equal(run('activeSocial().score'),0);assert.match(run('activeSocial().lastReaction'),/익숙한 교류/);assert.equal(run('dateChoiceOutcome(activeSocial(),0,"pace:slow").repeat'),true);
});
await test('A negative choice offers immediate recovery and explains why it felt awkward',async({run})=>{
 await start(run);await choose(run,'browse:decide');assert.equal(run('activeSocial().exchange.phases[1].card'),'repair');assert.match(run('socialSessionHTML(activeSocial())'),/의견을 보탤 틈/);
 await choose(run,'repair:sorry');assert.equal(run('dateCurrentTension(activeSocial())'),0);assert.notEqual(run('activeSocial().exchange.phases[2].card'),'repair-end');await good(run);assert.equal(run("dateMemory('유민').tension"),0);assert.equal(run('G.social.history[0].aff'),1);
});
await test('Persistent awkwardness carries forward and repairs do not erase everything at once',async({run})=>{
 run("dateMemory('유민').tension=3;dateMemory('유민').events=[{tag:'repair'},{tag:'repair'}]");await start(run);await good(run);assert.equal(run('activeSocial().exchange.phases[1].card'),'repair');
 await choose(run,'repair:sorry');assert.equal(run('activeSocial().score'),2);assert.equal(run('activeSocial().exchange.phases[2].card'),'repair-end');await choose(run,'repair-end:sorry');assert.equal(run("dateMemory('유민').tension"),1);
});
await test('Dismissive behavior persists but remains bounded and available for later recovery',async({run})=>{
 await start(run);await choose(run,'browse:decide');await choose(run,'repair:blame');await choose(run,'repair-end:erase');assert.equal(run("dateMemory('유민').tension"),3);assert.equal(run('G.social.history[0].aff'),-2);assert.match(run('G.social.session.dateFeeling'),/큰 변화|달라진/);
 // At the lower bound, no actual progress was lost: the abstract feedback must remain neutral.
 await start(run,{day:2});await good(run);assert.equal(run('activeSocial().exchange.phases[1].card'),'repair');
});
await test('Memories and friction belong to each partner and do not enable other NPC romances',async({run})=>{
 await start(run);await finish(run);assert.equal(run("getRel('서연').dateMemory||null"),null);assert.equal(run("socialDateEligible('서연')"),false);assert.equal(run("getRel('서연').romanceEligible"),false);
});
await test('Legacy in-progress dates retain their old choices and finish without conversion',async({run})=>{
 run("G.district='market';getRel('유민').stage=2;G.comp.aff=lvTotal(50);setAppt('유민','campus:market','지금');apptSync();socialState().session={id:'legacy',name:'유민',kind:'date',where:placeKey(),startDay:1,status:'active',step:1,choices:[{phase:0,id:'listen',text:'기존 선택'}],scenes:['저장 장면'],score:1};callAI=async()=>''");
 assert.equal(run('socialPhaseAt(activeSocial()).choices[0].id'),'care');await choose(run,'care');await choose(run,'thanks');assert.equal(run("romanceProgress('유민').closeness"),3);assert.equal(run("getRel('유민').dateMemory||null"),null);assert.match(run('G.social.session.scenes.join(" ")'),/저장 장면/);
});
await test('Save/reload preserves the exact current situation and choice order',async({run,obj})=>{
 await start(run);await choose(run,'browse:decide');const before=obj('socialPhaseAt(activeSocial())');run('G=JSON.parse(JSON.stringify(G));migrate();socialState()');assert.deepEqual(obj('socialPhaseAt(activeSocial())'),before);assert.equal(run('G.social.day.activity'),true);await choose(run,'repair:space');await finish(run);
});
await test('Stored memories, confirmed lover and old clues survive save migration',async({run,obj})=>{
 run("G.threads=[{text:'기존 단서'}]");await start(run,{lover:true,stage:5});await finish(run);const before=obj("dateMemory('유민')");run('G=JSON.parse(JSON.stringify(G));migrate()');assert.deepEqual(obj("dateMemory('유민')"),before);assert.equal(run("getRel('유민').romanceConfirmed"),true);assert.equal(run('G.threads[0].text'),'기존 단서');
});
await test('UI and AI memory context never expose hidden progress, scores or readiness thresholds',async({run})=>{
 await start(run);assert.doesNotMatch(run('socialSessionHTML(activeSocial())'),/romanceProgress|closeness|recentTags|score|친밀감.*6/);await finish(run);
 assert.doesNotMatch(run('dateMemoriesHTML()'),/romanceProgress|closeness|tension|score|태도.*보상/);assert.doesNotMatch(run("dateMemoryText('유민')"),/romanceProgress|closeness|tension|score/);
});
await test('Registered cards reject incompatible place, lover and corrupt choice ordering',async({run})=>{
 await start(run);run("activeSocial().exchange.phases[0].card='shelf'");assert.equal(await run("chooseSocialActivity(activeSocial().id,'shelf:notice')"),false);
 run("activeSocial().exchange.phases[0].card='reunion'");assert.equal(await run("chooseSocialActivity(activeSocial().id,'reunion:share')"),false);
 run("activeSocial().exchange.phases[0]={card:'browse',order:[0,0,0]}");assert.equal(await run("chooseSocialActivity(activeSocial().id,'browse:notice')"),false);assert.equal(run('activeSocial().step'),0);
});
await test('Date feelings vary, follow actual capped change and persist exactly once after closing',async({run})=>{
 run("romanceProgress('유민').closeness=11");await start(run);await finish(run);assert.equal(run("romanceProgress('유민').closeness"),12);assert.match(run('G.social.session.dateFeeling'),/조금/);
 const last=run('G.social.session.dateFeeling'),size=run('G.social.session.scenes.length');await run('socialClosingScene(G.social.session)');assert.equal(run('G.social.session.scenes.length'),size);assert.equal(run('G.social.session.scenes.filter(t=>t===G.social.session.dateFeeling).length'),1);
 run('G=JSON.parse(JSON.stringify(G));migrate()');assert.equal(run('G.social.session.dateFeeling'),last);
});
await test('Memory record window is bounded without discarding clues or relationship history',async({run})=>{
 run("dateMemory('유민').events=Array.from({length:24},(_,i)=>({tag:'old',card:'old',day:1,where:'campus:market',text:'기존 기억',reaction:'기억'}));G.threads=[{text:'기존 단서'}]");await start(run);await finish(run);assert.equal(run("dateMemory('유민').events.length"),24);assert.equal(run('G.threads[0].text'),'기존 단서');assert.equal(run('G.social.history.length'),1);assert.equal(run("romanceProgress('유민').completed.length"),1);
});
await test('Different situations still reward listening; repetition applies to the same situation',async({run})=>{
 run("dateMemory('유민').events=[{tag:'space',card:'hesitate'},{tag:'space',card:'tease'}]");await start(run,{where:'campus:ground'});assert.equal(run("dateChoiceOutcome(activeSocial(),0,'pace:slow').score"),1);
});
await test('Older completed choices remain archived after the recent recall window fills up',async({run,obj})=>{
 let first;for(let day=1;day<=9;day++){await start(run,{day});await finish(run);if(day===1)first=obj('G.social.history[0].memories')}
 assert.equal(run("dateMemory('유민').events.length"),24);assert.equal(run('G.social.history.length'),9);assert.deepEqual(obj('G.social.history[0].memories'),first);assert.equal(run('G.social.history.reduce((n,h)=>n+h.memories.length,0)'),27);
});
await test('Scene and closing prompts carry grounded memory and personality but no hidden values',async({run})=>{
 await start(run);await finish(run);await start(run,{day:2});run("const prompts=[];callAI=async(sys,prompt)=>{prompts.push(prompt);return JSON.stringify({narration:'함께한 시간을 돌아본다'})}");await finish(run);
 assert.match(run('prompts.join(" ")'),/실제 완료한 데이트의 기억/);assert.match(run('prompts.join(" ")'),/겉 성격/);assert.match(run('prompts.at(-1)'),/아직 연인이 아니/);assert.doesNotMatch(run('prompts.join(" ")'),/closeness|recentTags|romanceProgress|친밀감.*6/);
 assert.ok(run('stateFacts().함께한데이트기억.length')>0);run("G.district='library'");assert.equal(run('stateFacts().함께한데이트기억||null'),null);
});
console.log(`${count} emotional date scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

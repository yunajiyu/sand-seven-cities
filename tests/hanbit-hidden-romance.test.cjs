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
function ready(run,name='유민'){
 run(`G.district='market';getRel('${name}').stage=2;getRel('${name}').romanceEligible=true;${name==='유민'?"G.comp.aff=lvTotal(50)":`getRel('${name}').aff=lvTotal(50)`};setAppt('${name}','campus:market','지금');apptSync();romanceProgress('${name}').closeness=6;G.choices=[];G.choiceMeta={}`);
}
(async()=>{
await test('Pre-confession close friends can date without an existing romance',({run})=>{
 run("getRel('유민').stage=2;G.comp.aff=lvTotal(20)");assert.equal(run("socialDateEligible('유민')"),true);assert.equal(run("getRel('유민').romanceConfirmed||false"),false);run("getRel('유민').stage=1");assert.equal(run("socialDateEligible('유민')"),false);run("getRel('유민').stage=2;G.comp.aff=lvTotal(19)");assert.equal(run("socialDateEligible('유민')"),false);
});
await test('Both affinity and date-choice progress are required independently',({run})=>{
 ready(run);assert.equal(run("romanceReady('유민')"),true);run("G.comp.aff=lvTotal(49)");assert.equal(run("romanceReady('유민')"),false);run("G.comp.aff=lvTotal(50);romanceProgress('유민').closeness=5");assert.equal(run("romanceReady('유민')"),false);
});
await test('Confession needs no home or gift and has no management button or hidden meter',({run})=>{
 ready(run);run("G.items=[];G.home={};G.mat.keepsake=0;openRel()");assert.equal(run("romanceReady('유민')"),true);assert.doesNotMatch(run('modalHTML'),/proposeTo|고백하기|closeness|romanceProgress/);assert.doesNotMatch(run("socialActivityHTML('date')"),/closeness|romanceProgress|친밀감.*6/);
});
await test('Ready choice is a typed story action and revalidation rejects a remote partner',({run})=>{
 ready(run);run('sanitizeChoices()');assert.equal(run('G.choices.length'),1);assert.equal(run('metaOf(G.choices[0]).actionId'),run("romanceActionId('유민')"));assert.equal(run('metaOf(G.choices[0]).type'),'story');assert.match(run('choicesHTML()'),/좋아하는 마음/);run("G.district='library'");assert.equal(run("dispatchGameAction(romanceActionId('유민'))"),false);assert.equal(run('calls.length'),0);run('sanitizeChoices()');assert.equal(run("G.choices.some(c=>metaOf(c)?.actionId===romanceActionId('유민'))"),false);
});
await test('AI can supply a new confession phrase through the registered target ID',({run})=>{
 ready(run);run("const turn=normalizeTurn({choices:[{text:'오늘은 장난이 아니라, 네가 좋다고 말한다',action_id:romanceActionId('유민')}]});G.choices=turn.choices;sanitizeChoices();pickChoice(0)");assert.equal(run('G.relEvt.type'),'propose');assert.equal(run('G.relEvt.authorized'),true);assert.match(run('calls[0][0]'),/장난이 아니라/);assert.equal(run('G.items.length'),0);assert.equal(run('G.mat.keepsake'),0);
});
await test('Successful selected confession confirms a lover and unlocks continued dates',({run})=>{
 ready(run);run("proposeTo('유민');resolveRelEvt(true,[])");assert.equal(run("getRel('유민').stage"),5);assert.equal(run("getRel('유민').romanceConfirmed"),true);assert.equal(run("getRel('유민').engagedDay"),1);assert.equal(run("socialDateEligible('유민')"),true);assert.equal(run("romanceReady('유민')"),false);run("resolveRelEvt(true,[])");assert.equal(run("getRel('유민').stage"),5);
});
await test('Refusal and pending keep the player single and refusal applies cooldown',({run})=>{
 ready(run);run("proposeTo('유민')");assert.equal(run("getRel('유민').romanceConfirmed||false"),false);assert.equal(run('G.relEvt.type'),'propose');run('resolveRelEvt(false,[])');assert.equal(run("getRel('유민').stage"),2);assert.equal(run("getRel('유민').romanceConfirmed||false"),false);assert.equal(run("getRel('유민').cool"),4);assert.equal(run("romanceReady('유민')"),false);
});
await test('Only valid completed date choices contribute; outings, partial dates and replay do not',({run})=>{
 run("const a={id:'date1',name:'유민',kind:'date',status:'active',choices:[{phase:0,id:'listen'},{phase:1,id:'care'},{phase:2,id:'thanks'}]};recordDateProgress(a)");assert.equal(run("romanceProgress('유민').closeness"),0);run("a.status='done';a.kind='outing';recordDateProgress(a)");assert.equal(run("romanceProgress('유민').closeness"),0);run("a.kind='date';recordDateProgress(a);recordDateProgress(a)");assert.equal(run("romanceProgress('유민').closeness"),3);run("a.id='bad';a.choices[1].id='forged';recordDateProgress(a)");assert.equal(run("romanceProgress('유민').closeness"),3);
});
await test('Selected care and dismissive behavior change hidden progress, independently per person',({run})=>{
 run("romanceProgress('유민').closeness=3;recordDateProgress({id:'d1',name:'유민',kind:'date',status:'done',choices:[{phase:0,id:'quiet'},{phase:1,id:'dismiss'},{phase:2,id:'rush'}]})");assert.equal(run("romanceProgress('유민').closeness"),1);assert.equal(run("romanceProgress('서연').closeness"),0);
});
await test('Two completed dates offer an AI-written confession in the finishing scene',async({run})=>{
 ready(run);run("romanceProgress('유민').closeness=0;callAI=async(sys,prompt)=>JSON.stringify({narration:'둘 사이에 편안한 침묵이 흐른다',choices:[{text:'함께했던 시간이 소중했다며 사귀고 싶다고 말한다',action_id:romanceActionId('유민')}]})");
 for(let day=1;day<=2;day++){
 run(`G.day=${day};G.time='방과 후';G.dayStep=0;setAppt('유민','campus:market','지금');apptSync()`);assert.equal(await run("startSocialActivity('유민','date')"),true);await run("chooseSocialActivity(activeSocial().id,'listen')");await run("chooseSocialActivity(activeSocial().id,'care')");await run("chooseSocialActivity(activeSocial().id,'thanks')");
 if(day===1){assert.equal(run("romanceReady('유민')"),false);assert.equal(run('G.social.session.confessionChoice||null'),null)}
 }
 assert.equal(run("romanceProgress('유민').closeness"),6);assert.match(run("socialActivityHTML('date')"),/함께했던 시간이 소중했다며/);assert.equal(run("getRel('유민').romanceConfirmed||false"),false);run("startStoryConfession(romanceActionId('유민'))");assert.equal(run('gameTab'),'play');assert.match(run('calls[0][0]'),/함께했던 시간이 소중했다며/);
});
await test('AI closing metadata cannot offer the wrong partner or bypass insufficient progress',async({run})=>{
 ready(run);run("romanceProgress('유민').closeness=0;const a={id:'closed',name:'유민',kind:'date',where:placeKey(),status:'done',choices:[],scenes:[]};socialState().session=a;callAI=async()=>JSON.stringify({narration:'마무리한다',choices:[{text:'강제로 고백',action_id:romanceActionId('유민')}]})");await run('socialClosingScene(a)');assert.equal(run('a.confessionChoice||null'),null);assert.doesNotMatch(run("socialActivityHTML('date')"),/강제로 고백/);
});
await test('AI outage preserves a natural ready choice and hidden progress survives save',async({run})=>{
 ready(run);run("const a={id:'closed',name:'유민',kind:'date',where:placeKey(),status:'done',choices:[],scenes:[]};socialState().session=a;callAI=async()=>{throw Error('offline')}");await run('socialClosingScene(a)');assert.match(run('a.confessionChoice'),/좋아하는 마음/);run('G=JSON.parse(JSON.stringify(G));migrate()');assert.equal(run("romanceProgress('유민').closeness"),6);assert.equal(run("romanceReady('유민')"),true);
});
await test('Actual story response resolves the selected confession and records a confirmed romance',async({run})=>{
 ready(run);run("aiTurn=liveAiTurn;callAI=async()=>JSON.stringify({narration:'유민은 조심스럽게 마음을 받아들이고 연인으로 지내자고 답한다.',effects:{relation_event:{name:'유민',result:'success'}},choices:[]});maybeSummarize=async()=>{};checkState=()=>{};proposeTo('유민','유민에게 좋아한다고 말한다')");await new Promise(r=>setImmediate(r));assert.equal(run('busy'),false);assert.equal(run("getRel('유민').stage"),5);assert.equal(run("getRel('유민').romanceConfirmed"),true);assert.equal(run('G.relEvt'),null);
});
await test('Existing confirmed romances remain intact without retrospective progress',({run})=>{
 ready(run);run("getRel('유민').stage=5;getRel('유민').romanceConfirmed=true;delete getRel('유민').romanceProgress;migrate()");assert.equal(run("socialDateEligible('유민')"),true);assert.equal(run("romanceReady('유민')"),false);assert.equal(run("getRel('유민').romanceConfirmed"),true);
});
await test('Date feelings describe relative change without exposing scores or thresholds',({run})=>{
 assert.match(run('dateFeeling(1)'),/조금 더 가까워진/);assert.match(run('dateFeeling(3)'),/한층 가까워진/);assert.match(run('dateFeeling(0)'),/큰 변화가 없는/);assert.match(run('dateFeeling(-1)'),/멀어진/);
 for(const n of [-2,0,1,3])assert.doesNotMatch(run(`dateFeeling(${n})`),/\d|점수|진행도|기준|해금/);
});
await test('Completed date appends its abstract feeling after the AI closing scene even offline',async({run})=>{
 ready(run);run("const a={id:'feel',name:'유민',kind:'date',where:placeKey(),status:'done',choices:[],scenes:[],dateFeeling:dateFeeling(1)};socialState().session=a;callAI=async()=>{throw Error('offline')}");await run('socialClosingScene(a)');assert.equal(run('a.scenes.at(-1)'),run('a.dateFeeling'));assert.match(run("socialActivityHTML('date')"),/조금 더 가까워진/);await run('socialClosingScene(a)');assert.equal(run('a.scenes.filter(t=>t===a.dateFeeling).length'),1);
});
await test('Relative feedback uses the actual capped change and cannot report duplicate gains',({run})=>{
 run("romanceProgress('유민').closeness=11;const a={id:'cap',name:'유민',kind:'date',status:'done',choices:[{phase:0,id:'listen'},{phase:1,id:'care'},{phase:2,id:'thanks'}]};const change=recordDateProgress(a)");assert.equal(run('change'),1);assert.match(run('dateFeeling(change)'),/조금 더 가까워진/);assert.equal(run('recordDateProgress(a)'),undefined);
});
console.log(`${count} hidden-romance scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

// Run: node tests/hanbit-cases-actions.test.cjs
// Uses the actual game script. DOM/storage and network AI calls are stubbed.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../hanbit.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
new vm.Script(script);
function fixture(){
  const el={style:{},dataset:{},value:'',remove(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},querySelectorAll(){return []},setAttribute(){},getAttribute(){return null}};
  const ctx=vm.createContext({console,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return el},querySelector(){return el},querySelectorAll(){return []},addEventListener(){},documentElement:el},window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math:Object.create(Math)});
  vm.runInContext(script.slice(0,script.indexOf('/* 시작: 화면 설정 적용')),ctx);
  const run=s=>vm.runInContext(s,ctx),obj=s=>JSON.parse(JSON.stringify(run(s)));
  run(`const calls=[],notices=[]; let chipHTML='',modalHTML='';
    addLog=()=>{};toast=s=>notices.push(s);render=()=>{};renderSides=()=>{};save=()=>{};sfx=()=>{};
    maybeIncoming=()=>{};apptSync=()=>{};askConfirm=async()=>true;const liveAiTurn=aiTurn;aiTurn=async(...args)=>calls.push(args);
    chip=s=>{chipHTML=s};hideChip=()=>{};modal=(title,s)=>{modalHTML=s};
    function seed(loc='site'){
      G={v:1,_phoneLightVersion:1,_fearBalanceVersion:1,_relVersion:2,_clockVersion:2,_affLv:2,char:{name:'테스트',age:17,stats:{str:1,wis:1,cha:1,sur:1},traits:[]},day:1,time:'방과 후',dayStep:0,loc,steps:0,hp:12,maxhp:12,calm:10,battery:6,torch:0,cash:100,items:[],mat:{metal:0,ply:0,wire:0,keepsake:0},act:1,fragments:0,sitesDone:0,district:'music',comp:{met:false,joined:false,aff:10},rel:{},chronicle:[],site:loc==='site'?{name:'피아노 괴담 구역',pos:{x:225,y:180},depth:1,cur:'r1',rooms:[{id:'r1',name:'입구',lv:0,danger:0,visited:true,exits:['r2','r3']},{id:'r2',name:'피아노실',lv:1,danger:0,visited:true,exits:['r1']},{id:'r3',name:'방송실',lv:1,danger:0,visited:true,exits:['r1']},{id:'r4',name:'창고',lv:2,danger:0,visited:true,exits:['r3']}]}:null};
      busy=false;PENDING={note:'',flags:{}};migrate();syncSchedule();Math.random=()=>0.99;calls.length=notices.length=0;chipHTML=modalHTML='';
    }
    seed();
  `);
  return {run,obj};
}
let count=0;
async function test(name,fn){await fn(fixture());count++;console.log('PASS',name)}
(async()=>{
await test('Fixed button, AI action ID, legacy destination and direct movement have identical state costs',({run,obj})=>{
  const states=[];
  for(const action of [`moveTo('r2')`,`G.choices=['소리를 따라 문을 넘는다'];G.choiceMeta={'소리를 따라 문을 넘는다':{type:'move',actionId:roomActionId('move','r2')}};pickChoice(0)`,`G.choices=['피아노실로 들어간다'];G.choiceMeta={'피아노실로 들어간다':{type:'story',to:'피아노실'}};pickChoice(0)`,`act('피아노실로 간다',{src:'free'})`]){
    run('seed();'+action);states.push(obj('({cur:G.site.cur,loc:G.loc,day:G.day,time:G.time,slot:G.dayStep,steps:G.steps,torch:G.torch,battery:G.battery,calm:G.calm,hp:G.hp})'));
  }
  states.forEach(s=>assert.deepEqual(s,states[0]));assert.equal(states[0].cur,'r2');
});
await test('Unavailable, nonadjacent and stale zone IDs cannot move or consume time',({run,obj})=>{
  run("const stale=roomActionId('move','r2');G.site.uid='z999';const before=JSON.stringify({cur:G.site.cur,steps:G.steps,torch:G.torch});dispatchGameAction(stale);moveTo('r4');dispatchGameAction(roomActionId('move','r4'));act('창고로 간다',{src:'free'});");
  assert.equal(run('before'),run('JSON.stringify({cur:G.site.cur,steps:G.steps,torch:G.torch})'));assert.equal(run('calls.length'),0);
  run("G.choices=['창고로 간다'];G.choiceMeta={'창고로 간다':{to:'창고',type:'move'}};pickChoice(0)");assert.equal(run('calls.length'),0);
});
await test('AI location field cannot teleport; fixed and AI class departure have the same penalty',({run,obj})=>{
  const states=[];
  for(const action of [`goDistrict('music')`,`G.choices=['음악실로 나선다'];G.choiceMeta={'음악실로 나선다':{actionId:'district:music',type:'move'}};pickChoice(0)`,`act('음악실로 간다',{src:'free'})`]){
    run("seed('campus');G.district='classroom';G.time='낮';G.dayStep=1;syncSchedule();"+action);
    states.push(obj('({d:G.district,slot:G.dayStep,skip:G.cls.skip,done:G.cls.done,demerit:G.demerit})'));
  }
  states.forEach(s=>assert.deepEqual(s,states[0]));assert.equal(states[0].skip,1);
  run("applyPlace({place:'도서관'});");assert.equal(run('G.district'),'music');
});
await test('New wording is preserved for registered investigation and unregistered narrative attempts',({run})=>{
  run("G.choices=['피아노 아래를 살핀다'];G.choiceMeta={'피아노 아래를 살핀다':{actionId:roomActionId('investigate','r1')}};pickChoice(0)");assert.equal(run('calls[0][0]'),'피아노 아래를 살핀다');
  run("seed();G.choices=['노래를 거꾸로 흥얼거린다'];G.choiceMeta={'노래를 거꾸로 흥얼거린다':{actionId:'story'}};pickChoice(0)");assert.equal(run('calls[0][0]'),'노래를 거꾸로 흥얼거린다');assert.equal(run('G.site.cur'),'r1');
});
await test('Current campus investigation matches fixed browse costs and preserves input',({run,obj})=>{
  const states=[];
  for(const action of [`browsePlace('music')`,`dispatchGameAction('investigate:campus:music','피아노 아래를 조사한다')`,`act('피아노 아래를 조사한다',{src:'free'})`]){
    run("seed('campus');"+action);states.push(obj('({slot:G.dayStep,steps:G.steps,brw:G.brw})'));
  }
  states.forEach(s=>assert.deepEqual(s,states[0]));assert.equal(run('calls[0][0]'),'피아노 아래를 조사한다');
  run("seed('campus');browsePlace('library')");assert.equal(run('calls.length'),0);
});
await test('Negated, interrogative, ambiguous and compound input never silently moves or investigates',({run})=>{
  for(const text of ['피아노실로 가지 않는다','피아노실로 가는 길을 물어본다']){run('seed();act('+JSON.stringify(text)+",{src:'free'})");assert.equal(run('G.site.cur'),'r1')}
  run("seed();act('피아노실이나 방송실로 간다',{src:'free'})");assert.equal(run('G.steps'),0);assert.equal(run('calls.length'),0);assert.match(run('chipHTML'),/이동할 장소/);
  run("seed();act('피아노실로 가서 조사한다',{src:'free'})");assert.equal(run('G.steps'),0);assert.equal(run('calls.length'),0);assert.match(run('chipHTML'),/피아노실/);
  run("runMovementOption(roomActionId('move','r2'))");assert.equal(run('G.site.cur'),'r2');assert.equal(run('calls.length'),1);
});
await test('Unknown choice IDs are filtered and exact metadata never matches a prefix',({run})=>{
  run("const r=normalizeTurn({choices:[{text:'문을 넘는다',action_id:'move:unknown:r2',type:'move'},{text:'소리를 따라간다',action_id:'story'},{text:'소리를 따라간다',action_id:'zone:exit'}]});G.choices=r.choices;sanitizeChoices()");
  assert.ok(!run("G.choices.includes('문을 넘는다')"));assert.ok(run("G.choices.includes('소리를 따라간다')"));assert.equal(run("metaOf('소리를 따라간다 잠시')"),null);
});
await test('Every location exposes only real runtime functions and schema is valid JSON',({run})=>{
  for(const loc of ['campus','hood','home','road','shelter','site']){run('seed('+JSON.stringify(loc)+');G.hood="east";gameActions()');assert.match(run('actionsBlock()'),/story:/)}
  run('seed();');const schema=run("TURN_SCHEMA.slice(TURN_SCHEMA.indexOf('{'),TURN_SCHEMA.indexOf('\\n[effects]'))");assert.doesNotThrow(()=>JSON.parse(schema));
  assert.match(run("buildPrompt('조사한다','')"),/실행 가능한 행동/);
});
await test('Nine local observations occupy one case and never close the question',({run})=>{
  run("seed('campus');caseRecord('음악실 피아노 소리의 원인은 무엇인가?');for(let i=1;i<=9;i++) addCanon('음악실 피아노 녹음에는 '+i+'번 음이 남아 있다',true);");
  assert.equal(run('threadsOpen().length'),1);assert.equal(run('G.evidence.length'),9);assert.equal(run('G.threads[0].status'),'open');assert.ok(run("selectedEvidence().some(e=>e.text.includes('1번 음'))"));
});
await test('Similar prefixes with different numbers survive while exact duplicates do not',({run})=>{
  run("addCanon('피아노실 출석부의 마지막 장 3번 칸이 지워졌다',true);addCanon('피아노실 출석부의 마지막 장 5번 칸이 지워졌다',true);addCanon('피아노실 출석부의 마지막 장 3번 칸이 지워졌다',true)");assert.equal(run('G.evidence.length'),2);
});
await test('Ten active cases still accept existing-case evidence; local independent cases stop at three',({run})=>{
  run("for(let i=0;i<10;i++)caseRecord('독립 질문 '+i+' 원인은?',{scope:'local',placeId:'campus:place'+i,newCase:true});const t=G.threads[0];applyCaseUpdates([{case_id:t.id,evidence:[{text:'기존 사건의 원인 후보가 한 가지 줄었다',kind:'fact',role:'narrows'}]}]);caseRecord('새로운 독립 질문의 원인은?',{newCase:true});");assert.equal(run('clueLoad()'),10);assert.equal(run('G.evidence.length'),1);
  run("seed('campus');for(let i=0;i<5;i++)caseRecord('서로 독립된 질문 '+i+'?',{newCase:true})");assert.equal(run('threadsOpen().length'),3);
});
await test('Structured updates need a reason; only one independent case is created per turn',({run})=>{
  run("applyCaseUpdates([{new_case:true,question:'그 소리의 원인은?'},{new_case:true,question:'녹음의 주인은?',reason:'독립적인 인물 목표',scope:'personal'}]);");assert.equal(run('threadsOpen().length'),1);
  run("seed();applyCaseUpdates([{new_case:true,question:'소리의 원인은?',reason:'소리 사건',scope:'local'},{new_case:true,question:'문서의 주인은?',reason:'문서 사건',scope:'local'}])");assert.equal(run('threadsOpen().length'),1);
});
await test('Main, current, other-place and personal context survive a flood of local evidence',({run,obj})=>{
  run("seed('campus');const m=caseRecord('출석부 이름이 사라진 이유?',{scope:'main',placeId:'main'}),o=caseRecord('도서관 편지의 주인은?',{scope:'local',placeId:'campus:library'}),p=caseRecord('유민의 가족은 어디에 있는가?',{scope:'personal',placeId:'person:yumin'}),l=caseRecord('음악실 소리의 원인은?',{scope:'local',placeId:'campus:music'});for(const t of [m,o,p])addCanon(t.text+' 관련 관찰 기록',true,false,{caseId:t.id,scope:t.scope,placeId:t.placeId});for(let i=0;i<9;i++)addCanon('피아노 건반에 '+i+'번 흔적이 남았다',true,false,{caseId:l.id});");
  const cases=obj('selectedCases().map(t=>t.id)'),ev=obj('selectedEvidence()');for(const id of ['t1','t2','t3','t4'])assert.ok(cases.includes(id));for(const scope of ['main','personal'])assert.ok(ev.some(e=>e.scope===scope));assert.ok(ev.some(e=>e.placeId==='campus:library'));assert.ok(ev.filter(e=>e.caseId==='t4').length<=2);
});
await test('A conclusion needs same-case fact/testimony IDs; rumor and ID-only closure do not suffice',({run})=>{
  run("const t=caseRecord('피아노 소리의 원인은 무엇인가?');const e=addCanon('전원을 뽑아도 소리가 계속 반복됐다',true,false,{caseId:t.id,kind:'fact'});const r=addCanon('귀신이 건반을 친다는 소문이 있다',true,false,{caseId:t.id,kind:'rumor'});applyThreads(G,{threads_closed:[t.id]});applyBoardLedger({threadsDone:[t.id]});");assert.equal(run('G.threads[0].status'),'open');
  assert.equal(run("resolveCase(t.id,'소리가 나는 원인은 반복 재생 장치였다',[r.id])"),false);assert.equal(run("resolveCase(t.id,'소리가 나는 원인은 반복 재생 장치였다',['e999'])"),false);
  assert.equal(run("resolveCase(t.id,t.text,[e.id])"),false);assert.equal(run("resolveCase(t.id,'피아노 아래의 반복 재생 장치가 소리의 원인이었다',[e.id])"),true);assert.match(run('G.threads[0].conclusion'),/반복 재생/);assert.ok(!run('G.canon.some(c=>c.text.startsWith("해결된 단서:"))'));
});
await test('Evidence types and places are validated; malformed AI metadata cannot crash recording',({run})=>{
  run("const t=caseRecord('소리의 원인은?');applyCaseUpdates([{case_id:t.id,evidence:[{text:'모르는 추정 내용',kind:'madeup',role:'observation'},{text:'귀신이 친다는 소문',kind:'rumor',role:'observation',related_places:[42,'unknown','campus:library']}]}]);");assert.equal(run('G.evidence.length'),1);assert.equal(run('G.evidence[0].kind'),'rumor');assert.equal(run('G.evidence[0].relatedPlaces.length'),1);
});
await test('Legacy local questions consolidate without losing originals; migration is idempotent',({run,obj})=>{
  run("seed('campus');delete G._caseVersion;G.threads=Array.from({length:9},(_,i)=>({id:'t'+(i+1),text:'음악실 피아노 질문 '+i,day:1,status:'open'}));G.canon=[{day:1,text:'음악실 피아노 아래 녹음기를 발견했다'},{day:1,text:'옛 요약에 적힌 이름',sum:true}];migrateCases();");
  assert.equal(run('threadsOpen().length'),1);assert.equal(run('G.threads.length'),9);assert.equal(run('G.legacyThreads.length'),9);assert.equal(run('G.legacyCanon.length'),2);assert.equal(run('G.evidence.length'),1);const before=obj('G');run('migrateCases()');assert.deepEqual(obj('G'),before);assert.match(run("buildPrompt('조사한다','')"),/옛 요약에 적힌 이름/);
});
await test('Raw evidence survives past 30 entries and summaries, and same text at different places stays separate',async({run})=>{
  run("seed('campus');for(let i=0;i<45;i++)addCanon('음악실 자료의 '+i+'번 이름을 확인했다',true);G.district='library';addCanon('문서에 남은 같은 표시를 확인했다',true);G.district='music';addCanon('문서에 남은 같은 표시를 확인했다',true)");await run('canonCompact()');await run('canonTidy()');assert.equal(run('G.evidence.length'),47);assert.equal(run('G.canon.length'),47);assert.equal(run('G.threads.filter(t=>!t.parentId).length'),2);assert.equal(run('calls.length'),0);
});
await test('Background extraction retains its source district after the player moves',async({run})=>{
  run("seed('campus');const t=caseRecord('음악실 소리의 원인은?');const q={placeId:'campus:music',zone:null,items:[{a:'소리를 조사한다',n:'녹음기에 3번 표시가 있었다',placeId:'campus:music'}]};G.district='library';callAI=async()=>JSON.stringify({case_updates:[{case_id:t.id,evidence:[{text:'녹음기에 3번 표시가 있었다',kind:'fact',role:'narrows'}],resolution:{conclusion:'소리의 원인은 반복 재생 장치였다',support_ids:['e1']}}],lexicon:[]});");await run('extractLex(q)');assert.equal(run('G.evidence[0].placeId'),'campus:music');assert.equal(run('G.threads[0].status'),'open');assert.equal(run('lexKey()'),'campus:library');
});
await test('Prepared room clues use one zone case and remain locked until a real investigation',({run})=>{
  run("const d=G.site;G.ancient=[{id:'era1',name:'방송반 시대',fig:'방송반',zones:[]}];attachLore(G.ancient[0],{lore:{who:'방송반',what:'녹음을 반복 재생했다',fate:'방이 폐쇄됐다',record:'방송반의 오래된 녹음 장치가 피아노 소리를 반복했다'},clues:[{room:'r1',text:'입구에 3번 녹음 표시가 남아 있다'},{room:'r2',text:'피아노 아래 반복 재생기가 있다'},{room:'r3',text:'방송실에 같은 녹음 장치가 남아 있다'}]},false);");
  assert.equal(run('G.evidence.length'),0);run("revealClue(d,d.rooms[0]);revealClue(d,d.rooms[1]);revealClue(d,d.rooms[0])");assert.equal(run('G.evidence.length'),2);assert.equal(run('new Set(G.evidence.map(e=>e.caseId)).size'),1);assert.equal(run('G.threads[0].status'),'open');
  run("revealClue(d,d.rooms[2])");assert.equal(run('G.threads[0].status'),'closed');assert.equal(run("G.evidence.filter(e=>e.source==='prepared-room').length"),3);
});
await test('Management and guide templates render with evidence details and explicit conclusions',({run})=>{
  run("const t=caseRecord('음악실 괴담의 원인은?');addCanon('음악실에 반복되는 소리가 남았다',true,false,{caseId:t.id});openThreads()");assert.match(run('modalHTML'),/증거 원문 1개/);assert.match(run('modalHTML'),/결론 기록/);assert.ok(!run('modalHTML.includes(".replace(")'));run('openGuide()');assert.match(run('modalHTML'),/관찰 추가만으로 사건이 해결되지/);
});
await test('Real AI response flow retains valid movement IDs and records structured evidence without teleporting',async({run})=>{
  run("const t=caseRecord('피아노 소리의 원인은?');aiTurn=liveAiTurn;callAI=async()=>JSON.stringify({narration:'문 너머에서 녹음된 소리가 들린다.',choices:[{text:'피아노실로 들어간다',action_id:roomActionId('move','r2'),type:'move'},{text:'창고로 들어간다',action_id:roomActionId('move','r4'),type:'move'}],위치:'음악실',effects:{사건진행:[{case_id:t.id,evidence:[{text:'문 너머에서 녹음된 소리가 들렸다',kind:'fact',role:'narrows'}]}]}});maybeSummarize=async()=>{};checkState=()=>{};");
  await run("aiTurn('소리에 귀를 기울인다')");assert.equal(run('G.site.cur'),'r1');assert.equal(run('G.evidence.length'),1);assert.equal(run('G.threads[0].status'),'open');assert.ok(run("G.choices.includes('피아노실로 들어간다')"));assert.ok(!run("G.choices.includes('창고로 들어간다')"));assert.equal(run('busy'),false);
  run('pickChoice(G.choices.indexOf("피아노실로 들어간다"))');await new Promise(resolve=>setImmediate(resolve));assert.equal(run('G.site.cur'),'r2');assert.equal(run('busy'),false);
});
await test('Narration-only AI replies cannot write clue progress or enqueue extraction',async({run})=>{
  run("aiTurn=liveAiTurn;const t=caseRecord('피아노 소리의 원인은?');callAI=async()=>JSON.stringify({narration:'잠시 생각을 정리한다.',choices:[],단서:'새로운 문서 사실이 있다',effects:{사건진행:[{case_id:t.id,evidence:[{text:'새로운 기록을 발견했다',kind:'fact',role:'observation'}]}]}});maybeSummarize=async()=>{};checkState=()=>{};pend('',{storyOnly:true});");await run("aiTurn('생각한다')");assert.equal(run('G.evidence.length'),0);assert.equal(run('G._lexQ||null'),null);
});
await test('New AI and legacy temporary-place choices match direct input and preserve return to district',({run,obj})=>{
  const states=[];
  for(const action of [`const response=normalizeTurn({choices:[{text:'강당으로 간다',action_id:'spot:enter',type:'move',to:'강당'}]});G.choices=response.choices;pickChoice(0)`,`dispatchGameAction('spot:enter','강당으로 간다',{target:'강당',src:'choice',narrate:true})`,`G.choices=['강당으로 간다'];G.choiceMeta={'강당으로 간다':{type:'move',to:'강당'}};pickChoice(0)`,`act('강당으로 간다',{src:'free',confirmed:true})`]){
    run("seed('campus');G.district='classroom';G.time='낮';G.dayStep=1;syncSchedule();"+action);
    states.push(obj('({spot:G.spot,district:G.district,loc:G.loc,slot:G.dayStep,skip:G.cls.skip,demerit:G.demerit})'));
    assert.equal(run('calls.length'),1);assert.equal(run('calls[0][0]'),'강당으로 간다');
  }
  states.forEach(s=>assert.deepEqual(s,states[0]));assert.equal(states[0].spot.name,'강당');assert.equal(states[0].skip,1);
  assert.equal(run("gameActions().some(a=>a.id==='trade:shop')"),false);assert.equal(run("gameActions().some(a=>a.id==='expedition:start')"),false);
  run("dispatchGameAction('district:classroom')");assert.equal(run('G.spot'),null);
});
await test('Temporary-place movement validates targets, campus scope and nighttime gates',({run,obj})=>{
  run("seed('campus');for(const name of ['음악실','라쿠나 구역','<>',''])dispatchGameAction('spot:enter','이동한다',{target:name})");assert.equal(run('G.spot||null'),null);assert.equal(run('calls.length'),0);
  run("seed();dispatchGameAction('spot:enter','강당으로 간다',{target:'강당'})");assert.equal(run('G.loc'),'site');assert.equal(run('calls.length'),0);
  run("seed('campus');G.district='dorm';G.time='야간';Math.random=()=>0;dispatchGameAction('spot:enter','강당으로 간다',{target:'강당'})");assert.equal(run('G.spot||null'),null);assert.equal(run('G.district'),'dorm');assert.ok(run('G.demerit>0'));
  run("seed('campus');const r=normalizeTurn({choices:[{text:'강당으로 간다',type:'move',action_id:'spot:enter',to:'강당'},{text:'없는 곳으로 간다',type:'move',action_id:'spot:enter'}]});G.choices=r.choices;sanitizeChoices()");assert.ok(run("G.choices.includes('강당으로 간다')"));assert.ok(!run("G.choices.includes('없는 곳으로 간다')"));
});
await test('Rumored destinations register dynamically and use expedition actions instead of temporary places',async({run})=>{
  run("seed('campus');aiTurn=liveAiTurn;callAI=async()=>JSON.stringify({narration:'행인이 담장 너머 「폐창고」로 가는 길을 알려 준다.',event:{type:'place_lead',name:'폐창고',hint:'담장 너머 골목 끝'},choices:[],effects:{}});maybeSummarize=async()=>{};checkState=()=>{};");
  await run("aiTurn('새로운 소문을 듣는다')");assert.equal(run('G.leads.length'),1);assert.equal(run('G.leads[0].name'),'폐창고');assert.ok(run("gameActions().some(a=>a.id==='lead:l1')"));
  assert.equal(run("dispatchGameAction('spot:enter','폐창고로 간다',{target:'폐창고'})"),false);assert.equal(run('G.spot||null'),null);
  run("let expeditionTarget=null;startExpedition=id=>{expeditionTarget=id};");await run("startLead('l1')");assert.equal(run('expeditionTarget'),'l1');
});
console.log(count+' case/action scenario groups passed.');
})().catch(e=>{console.error(e);process.exitCode=1});

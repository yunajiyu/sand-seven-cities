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
const legacyCandidate={question:'빈 방에서 소리가 반복되는 이유는?',opening:'낡은 입구의 공기는 차갑고 조용하다.',truth:'PRIVATE_TRUTH_735 비공개 원인은 예약 재생 장치다.',conclusion:'PRIVATE_CONCLUSION_912 예약 장치가 다른 방으로 녹음을 전송했다.',room_views:['r1','r2','r3','r4'].map(room=>({room,text:'빛이 닿은 바닥과 오래된 문틀이 보인다.'})),evidence:[{id:'e1',room:'r1',text:'종이에 03:15라는 시간이 세 번 적혀 있다.',meaning:'반복되는 시간이 조사 기준이 된다.'},{id:'e2',room:'r2',text:'음원이 매번 정확히 같은 구간에서 끊긴다.',meaning:'연주보다 동일한 기록의 반복을 뒷받침한다.'},{id:'e3',room:'r3',text:'두 방 사이를 연결한 선에 같은 번호가 붙어 있다.',meaning:'소리가 이동하는 경로를 추적할 근거다.'}],verification:{room:'r3',action:'번호가 같은 선의 전송을 끊고 소리가 멎는지 확인한다',requires:['e1','e2','e3'],result:'PRIVATE_RESULT_624 전송을 끊자 반복되던 소리가 함께 멎었다.'}};
// 새 스키마(v2) 사건: 행동별 증거·실마리(leads)·함정 증거(d1)·무효과 행동(dead_ends). 테스트 고정 데이터.
const candidate={question:'빈 방에서 소리가 반복되는 이유는?',opening:'낡은 입구의 공기는 차갑고 조용하다.',truth:'PRIVATE_TRUTH_735 비공개 원인은 예약 재생 장치다.',conclusion:'PRIVATE_CONCLUSION_912 예약 장치가 다른 방으로 녹음을 전송했다.',room_views:['r1','r2','r3','r4'].map(room=>({room,text:'빛이 닿은 바닥과 오래된 문틀이 보인다.'})),
 evidence:[
  {id:'e1',role:'core',room:'r1',action:'게시판에 붙은 종이를 한 장씩 넘겨 본다',text:'종이에 03:15라는 시간이 세 번 적혀 있다.',meaning:'반복되는 시간이 조사 기준이 된다.',leads:['e2','d1']},
  {id:'e2',role:'core',room:'r2',action:'피아노 옆 녹음기를 끝까지 틀어 본다',text:'음원이 매번 정확히 같은 구간에서 끊긴다.',meaning:'연주보다 동일한 기록의 반복을 뒷받침한다.',leads:['e3']},
  {id:'e3',role:'core',room:'r3',action:'책상 밑으로 이어진 선을 따라가 본다',text:'두 방 사이를 연결한 선에 같은 번호가 붙어 있다.',meaning:'소리가 이동하는 경로를 추적할 근거다.',leads:[]},
  {id:'d1',role:'decoy',room:'r2',action:'건반 위 먼지를 손가락으로 쓸어 본다',text:'건반 위 먼지에 누가 누른 듯한 손가락 자국이 있다.',meaning:'누군가 밤에 직접 연주했을 수도 있다.',points_to:'h1',refuted_by:'e2',leads:[]}],
 start_leads:['e1'],dead_ends:[{room:'r3',action:'창문 틈에 귀를 대고 바깥 소리를 듣는다'}],
 verification:{room:'r3',action:'번호가 같은 선의 전송을 끊고 소리가 멎는지 확인한다',requires:['e1','e2','e3'],result:'PRIVATE_RESULT_624 전송을 끊자 반복되던 소리가 함께 멎었다.'},
 deduction:{hypotheses:[{id:'h1',text:'누군가 밤마다 몰래 피아노를 친다'},{id:'h2',text:'녹음된 소리가 정해진 시간에 다른 방으로 보내진다'},{id:'h3',text:'창문 틈 바람이 울려 소리가 난다'}],answer_id:'h2',supports:['e2','e3'],explanation:'PRIVATE_EXPLANATION_208 같은 구간 반복과 같은 번호의 선이 전송을 입증한다.'}};
async function prepared(f){f.run("seed('site');G._deductionVersion=1;G.secret={truth:'WORLD_SECRET_479',detail:'아직 알려지지 않은 세계의 진상'};G.site.rooms.forEach(r=>r.desc='ROOM_SECRET_381');const events=[],api=[];addLog=(type,text)=>events.push({type,text});let proposal="+JSON.stringify(candidate)+";callAI=async(sys,user)=>{api.push({sys,user});return JSON.stringify(sys.includes('독립 검토자')?{valid:true,issues:[]}:proposal)};");await f.run('ensureMystery()');f.run("aiTurn=liveAiTurn;callAI=async(sys,user)=>{api.push({sys,user});return JSON.stringify({narration:'공간에 남은 흔적을 살펴본다.',choices:[],effects:{사건진행:[{case_id:G.site.caseId,evidence:[{text:'AI가 지어낸 새로운 핵심 증거',kind:'fact',role:'narrows'}]}]}})};maybeSummarize=async()=>{};checkState=()=>{};");}
// 예전 저장본(v1): 같은 사건 기록에 구버전 봉인 사건을 넣는다. 구버전은 INV_RX 조사·기존 판정을 그대로 쓴다.
async function legacy(f){await prepared(f);f.run("{const S=JSON.stringify("+JSON.stringify(legacyCandidate)+");G.site.deductionRequired=false;G.site.mystery={version:1,status:'ready',sealed:S,hash:mysteryHash(S),state:{found:[],evidenceIds:{},solved:false,attempts:[]}}}")}
const settle=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setImmediate(r))};
const choices=f=>f.obj("gameActions().filter(a=>a.kind==='investigate').map(a=>({id:a.id,label:a.label}))");
async function pick(f,room,text){f.run('G.site.cur='+JSON.stringify(room));const a=choices(f).find(a=>a.label.includes(text));assert.ok(a,'choice: '+text);f.run('dispatchGameAction('+JSON.stringify(a.id)+')');await settle();return a}
async function proofV2(f,guess,ids){f.run("G.site.cur='r3';submitMysteryProof("+JSON.stringify(guess)+','+JSON.stringify(ids)+')');await settle()}
let count=0;async function test(name,fn){const f=fixture();await fn(f);count++;console.log('PASS',name)}
(async()=>{
await test('Hidden generation passes structural and independent semantic review before locking',async f=>{await prepared(f);assert.equal(f.run('G.site.mystery.status'),'ready');assert.equal(f.run('api.length'),2);assert.equal(f.run('G.evidence.length'),0);assert.equal(f.run('G.site.mystery.state.solved'),false);assert.equal(f.run('mysteryPlan().truth'),candidate.truth)});
await test('Narrator and journal do not receive the answer, unseen clues, private room memo or world secret',async f=>{await prepared(f);const prompt=f.run("buildPrompt('입구를 바라본다','')");for(const value of [candidate.truth,candidate.conclusion,candidate.verification.result,candidate.evidence[0].text,'ROOM_SECRET_381','WORLD_SECRET_479'])assert.ok(!prompt.includes(value),value);f.run('openZoneJournal()');assert.ok(!f.run('modalHTML').includes(candidate.truth));assert.ok(!f.run('modalHTML').includes(candidate.evidence[0].text));});
await test('Malformed plans are rejected before review; retry is bounded',async f=>{f.run('seed();let n=0;callAI=async()=>{n++;return JSON.stringify({question:"不完全"})}');await f.run('ensureMystery()');assert.equal(f.run('n'),3);assert.equal(f.run('G.site.mystery.status'),'pending');assert.equal(f.run('G.site.caseId||null'),null)});
await test('Bad references, inaccessible evidence, duplicates and insufficient verification are rejected',f=>{
 f.run('seed();let p='+JSON.stringify(candidate));assert.equal(f.run('validateMystery(p,G.site).length'),0);
 for(const mutation of ["p.evidence[0].room='unknown'","p.evidence[1].id='e1'","p.evidence[1].room='r1'","p.verification.requires=['e1']","p.room_views.pop()","p.verification.room='r4'"]){f.run('p='+JSON.stringify(candidate)+';'+mutation);assert.ok(f.run('validateMystery(p,G.site).length')>0,mutation)}
});
await test('Shape tells are rejected without AI calls: an answer candidate or decoy whose length gives it away',f=>{
 f.run('seed();G.site.deductionRequired=true;let p='+JSON.stringify(candidate));assert.equal(f.run('validateMystery(p,G.site).length'),0);
 f.run('p.deduction.hypotheses[1].text="녹음된 소리가 매일 같은 시각 방송실 예약 장치를 거쳐 선을 따라 다른 방 스피커로 다시 보내진다"');assert.ok(f.run('validateMystery(p,G.site).join()').includes('정답 후보만'));
 f.run('p='+JSON.stringify(candidate)+';p.evidence[3].text="손자국이 있다."');assert.ok(f.run('validateMystery(p,G.site).join()').includes('함정 증거 문장 길이'));
 f.run('p='+JSON.stringify(candidate)+';p.evidence[3].text="건반 위 먼지에 누가 밤늦게 몰래 들어와 여러 번 세게 누른 듯한 손가락 자국이 길게 줄지어 남아 있고 의자도 살짝 밀려 있다."');assert.ok(f.run('validateMystery(p,G.site).join()').includes('함정 증거 문장 길이'));
});
await test('Failed review shows only a generic notice, never the reviewer issues',async f=>{f.run('seed();let reviews=0;callAI=async(sys)=>{if(sys.includes("독립 검토자")){reviews++;return JSON.stringify({valid:false,issues:["PRIVATE_REVIEW_552 정답은 예약 장치"]})}return JSON.stringify('+JSON.stringify(candidate)+')};const events=[];addLog=(type,text)=>events.push({type,text})');await f.run('ensureMystery()');assert.equal(f.run('G.site.mystery.status'),'pending');const log=JSON.stringify(f.obj('events'));assert.ok(log.includes('검토 불합격'));assert.ok(!log.includes('PRIVATE_REVIEW_552'))});
await test('Independent review rejection triggers regeneration and never prints private issues',async f=>{f.run('seed();let designs=0;let reviews=0;callAI=async(sys)=>{if(sys.includes("독립 검토자")){reviews++;return JSON.stringify({valid:reviews>1,issues:["PRIVATE_REVIEW_714 정답 유출"]})} designs++;return JSON.stringify('+JSON.stringify(candidate)+')};const events=[];addLog=(type,text)=>events.push({type,text})');await f.run('ensureMystery()');assert.equal(f.run('designs'),2);assert.equal(f.run('reviews'),2);assert.equal(f.run('G.site.mystery.status'),'ready');assert.ok(!JSON.stringify(f.obj('events')).includes('PRIVATE_REVIEW_714'));});
await test('Prepared facts stay fixed through save/load and repeat preparation consumes no AI calls',async f=>{await prepared(f);const sealed=f.run('G.site.mystery.sealed');f.run('G=JSON.parse(JSON.stringify(G));migrate();const before=api.length');await f.run('ensureMystery()');assert.equal(f.run('G.site.mystery.sealed'),sealed);assert.equal(f.run('api.length'),f.run('before'));});
await test('Tampered locked facts stop play instead of generating another answer',async f=>{await prepared(f);f.run('G.site.mystery.sealed+=" ";const before=api.length');await f.run('ensureMystery()');assert.equal(f.run('api.length'),f.run('before'));assert.equal(f.run('mysteryPlan()'),null)});
await test('Preparation cannot write to a replacement game while awaiting AI',async f=>{f.run('seed();let finish;callAI=()=>new Promise(r=>finish=r)');const job=f.run('ensureMystery()');f.run('seed();finish(JSON.stringify('+JSON.stringify(candidate)+'))');await job;assert.equal(f.run('G.site.mystery||null'),null)});
await test('Concurrent preparation shares one generation and review',async f=>{f.run('seed();let callsN=0;let finish;callAI=async(sys)=>{callsN++;if(sys.includes("독립 검토자"))return JSON.stringify({valid:true});return new Promise(r=>finish=r)}');const a=f.run('ensureMystery()'),b=f.run('ensureMystery()');f.run('finish(JSON.stringify('+JSON.stringify(candidate)+'))');await Promise.all([a,b]);assert.equal(f.run('callsN'),2);});
await test('[v1 저장본] Investigation publishes only the current prepared fact and its contribution',async f=>{await legacy(f);await f.run("aiTurn('周囲를 조사한다')");assert.equal(f.run('G.site.mystery.state.found.length'),1);assert.equal(f.run('G.evidence[0].text'),legacyCandidate.evidence[0].text);const last=f.obj('api').at(-1).user;assert.ok(last.includes(legacyCandidate.evidence[0].text));assert.ok(!last.includes(legacyCandidate.evidence[1].text));assert.ok(!last.includes(legacyCandidate.truth));assert.ok(f.obj('events').some(e=>e.text.includes('사건 진행:')));});
await test('[v1 저장본] Repeated investigation reports no extra finding without inventing evidence',async f=>{await legacy(f);await f.run("aiTurn('입구를 조사한다')");await f.run("aiTurn('입구를 다시 조사한다')");assert.equal(f.run('G.evidence.length'),1);assert.ok(f.obj('events').some(e=>e.text.includes('추가 발견 없음')));});
await test('[v1 저장본] Darkness and story-only turns cannot reveal prepared evidence',async f=>{await legacy(f);f.run('G.battery=0;G.textUse=0');await f.run("aiTurn('입구를 조사한다')");assert.equal(f.run('G.evidence.length'),0);assert.ok(f.obj('events').some(e=>e.text.includes('관찰 불가')));f.run("G.battery=6;G.textUse=0;pend('',{storyOnly:true})");await f.run("aiTurn('입구를 조사한다')");assert.equal(f.run('G.evidence.length'),0)});
await test('[v1 저장본] Registered investigation reveals evidence even with new display wording',async f=>{await legacy(f);f.run("dispatchGameAction(roomActionId('investigate','r1'),'소리에 집중한다')");await new Promise(r=>setImmediate(r));assert.equal(f.run('G.evidence.length'),1)});
await test('[v1 저장본] Evidence collection does not solve the case; verified action does',async f=>{await legacy(f);for(const room of ['r1','r2','r3']){f.run('G.site.cur='+JSON.stringify(room));await f.run("aiTurn('이 공간을 조사한다')");}assert.equal(f.run('G.evidence.length'),3);assert.equal(f.run('G.threads.find(t=>t.id===G.site.caseId).status'),'open');assert.equal(f.run('G.site.mystery.state.solved'),false);assert.equal(f.run('canVerifyMystery()'),true);assert.ok(f.run('gameActions().some(a=>a.id===mysteryVerifyId())'));f.run('verifyMystery()');await new Promise(r=>setImmediate(r));assert.equal(f.run('G.site.mystery.state.solved'),true);assert.equal(f.run('G.threads.find(t=>t.id===G.site.caseId).status'),'closed');assert.equal(f.run('mysteryPublic().conclusion'),legacyCandidate.conclusion)});
await test('[v1 저장본] Manual conclusion, AI case updates and legacy lore finalize cannot bypass verification',async f=>{await legacy(f);await f.run("aiTurn('입구를 조사한다')");assert.equal(f.run('resolveCase(G.site.caseId,'+JSON.stringify(legacyCandidate.conclusion)+',[G.evidence[0].id],true)'),false);f.run('applyCaseUpdates([{case_id:G.site.caseId,resolution:{conclusion:'+JSON.stringify(legacyCandidate.conclusion)+',support_ids:[G.evidence[0].id]}}]);G.site.lore={recorded:false,record:"LEAK_PRIVATE_LORE_647"};finalizeZone(G.site);');assert.equal(f.run('G.site.mystery.state.solved'),false);assert.ok(!JSON.stringify(f.obj('G.lexicon')).includes('LEAK_PRIVATE_LORE_647'));});
await test('Visiting every room keeps unsolved zones resumable',async f=>{await prepared(f);f.run('G.site.rooms.forEach(r=>r.visited=true);const sealed=G.site.mystery.sealed');assert.equal(f.run('siteProg().done'),false);f.run('archiveSite()');assert.equal(f.run('G.pausedZones.length'),1);assert.equal(f.run('G.pausedZones[0].mystery.sealed'),f.run('sealed'));});
await test('Generation failure blocks investigation without consuming another clock tick',async f=>{f.run("seed();callAI=async()=>{throw new Error('NO_KEY')};const before=JSON.stringify({day:G.day,time:G.time,steps:G.steps})");await f.run('ensureMystery()');f.run("story('입구를 조사한다')");assert.equal(f.run('before'),f.run('JSON.stringify({day:G.day,time:G.time,steps:G.steps})'));assert.equal(f.run('G.evidence.length'),0);});
await test('[v1 저장본] AI outage during play still publishes the prepared fact',async f=>{await legacy(f);f.run("callAI=async()=>{throw new Error('NO_KEY')}");await f.run("aiTurn('입구를 조사한다')");assert.equal(f.run('G.evidence[0].text'),legacyCandidate.evidence[0].text);assert.ok(f.obj('events').some(e=>e.type==='scene'&&e.text.includes(legacyCandidate.evidence[0].text)));});
await test('Management cannot park a fixed case or offer a misleading manual resolution',async f=>{await prepared(f);f.run('const t=G.threads.find(t=>t.id===G.site.caseId);closeThread(t.id)');assert.equal(f.run('t.status'),'open');assert.ok(!f.run('caseCard(t)').includes('결론 기록'));assert.match(f.run('caseCard(t)'),/추리를 확인/)});
await test('Legacy observed records survive conversion into a fixed mystery',async f=>{f.run('seed();const t=caseRecord("기존에 조사한 질문",{scope:"local",placeId:knowledgePlace()});G.site.caseId=t.id;addCanon("이미 확인한 낡은 흔적이 남아 있다",true,true,{caseId:t.id});G.site.lore={what:"기존의 확정된 경위가 있다",fate:"폐쇄 후 버려졌다"};const original=JSON.stringify(G.evidence);callAI=async(sys)=>JSON.stringify(sys.includes("독립 검토자")?{valid:true}:'+JSON.stringify(candidate)+')');await f.run('ensureMystery()');assert.equal(f.run('JSON.stringify(G.evidence)'),f.run('original'));assert.equal(f.run('G.site.caseId'),f.run('t.id'));assert.equal(f.run('G.site.mystery.status'),'ready');});
await test('A generated ordinary zone prepares and reviews its hidden case before returning the public introduction',async f=>{
 f.run('seed();ensureAncient=async()=>{};G.ancient=[];let generation=0;callAI=async(sys)=>{if(sys.includes("독립 검토자"))return JSON.stringify({valid:true});if(sys.includes("비공개 미스터리 설계자"))return JSON.stringify('+JSON.stringify(candidate)+');generation++;return JSON.stringify({name:"음원이 반복되는 별관",theme:"OLD_PRIVATE_THEME",intro:"UNREVIEWED_INTRO",rooms:G.site.rooms})};');const intro=await f.run('genSite()');assert.equal(intro,candidate.opening);assert.equal(f.run('G.site.mystery.status'),'ready');assert.equal(f.run('generation'),1);assert.ok(!f.run("buildPrompt('조사한다','')").includes('OLD_PRIVATE_THEME'));
});
await test('[v1 저장본] Verification is unavailable before all evidence and outside the registered room',async f=>{await legacy(f);assert.equal(f.run('canVerifyMystery()'),false);for(const room of ['r1','r2','r3']){f.run('G.site.cur='+JSON.stringify(room));await f.run("aiTurn('이 공간을 조사한다')");}f.run("G.site.cur='r1'");assert.equal(f.run('canVerifyMystery()'),false);f.run('verifyMystery()');assert.equal(f.run('G.site.mystery.state.solved'),false)});
await test('Damaged progress state stops a locked case without regenerating it',async f=>{await prepared(f);f.run('delete G.site.mystery.state;const before=api.length');assert.equal(f.run('mysteryPlan()'),null);await f.run('ensureMystery()');assert.equal(f.run('api.length'),f.run('before'))});
await test('A main ward also prepares its case before exposing an introduction',async f=>{f.run('seed();G.wards=[{terrain:Object.keys(WARD_TYPES)[0],id:"testward",name:"고요한 구역",mood:"침묵",lore:"WARD_PRIVATE_SECRET"}];wardArrive=()=>{};callAI=async(sys)=>JSON.stringify(sys.includes("독립 검토자")?{valid:true}:sys.includes("비공개 미스터리 설계자")?'+JSON.stringify(candidate)+':{theme:"OLD_WARD_THEME",intro:"UNREVIEWED_WARD_INTRO",rooms:G.site.rooms});');const intro=await f.run('genBigZone({key:"testward",terrain:Object.keys(WARD_TYPES)[0],campus:G.wards[0],pos:[0,0]})');assert.equal(intro,candidate.opening);assert.equal(f.run('G.site.mystery.status'),'ready');assert.ok(!f.run("buildPrompt('조사한다','')").includes('WARD_PRIVATE_SECRET'))});
await test('[v1 저장본] Notebook distinguishes prepared core evidence from rumor, hypothesis and legacy facts without mutating records',async f=>{await legacy(f);await f.run("aiTurn('입구를 조사한다')");f.run('const beforeNotes=JSON.stringify({canon:G.canon,evidence:G.evidence});const samples=[G.evidence[0],{kind:"rumor",text:"소문이 떠돈다"},{kind:"hypothesis",text:"아직은 추정이다"},{kind:"fact",source:"legacy",text:"오래된 확인 기록"},{kind:"testimony",source:"scene",text:"친구가 한 증언이다"}];const classified=samples.map(notebookCategory);const grouped=notebookGroupsHTML(samples)');assert.deepEqual(f.obj('classified'),['core','rumor','rumor','background','background']);assert.match(f.run('grouped'),/확인한 사실 · 1개/);assert.match(f.run('grouped'),/소문·가설 · 2개/);assert.match(f.run('grouped'),/배경 기록 · 2개/);assert.equal(f.run('beforeNotes'),f.run('JSON.stringify({canon:G.canon,evidence:G.evidence})'))});
await test('Notebook preserves old records beyond 50 entries and escapes their content',f=>{f.run('seed();G.canon=Array.from({length:55},(_,i)=>({text:"OLD_NOTE_"+i}));G.evidence=[{id:"standalone",text:"<script>alert(1)</script>",kind:"rumor"}];const beforeNotes=JSON.stringify(G.canon);openThreads()');assert.match(f.run('modalHTML'),/OLD_NOTE_0/);assert.match(f.run('modalHTML'),/OLD_NOTE_54/);assert.match(f.run('modalHTML'),/&lt;script&gt;/);assert.ok(!f.run('modalHTML').includes('<script>'));assert.equal(f.run('notebookRecords().length'),56);assert.equal(f.run('beforeNotes'),f.run('JSON.stringify(G.canon)'))});
await test('[v1 저장본] Core evidence cannot be deleted and old reference notes remain removable at their original index',async f=>{await legacy(f);await f.run("aiTurn('입구를 조사한다')");f.run('const coreId=G.evidence[0].id;delCanon(0)');assert.equal(f.run('G.evidence[0].deleted||false'),false);assert.equal(f.run('G.canon[0].id'),f.run('coreId'));f.run('G.canon.push({text:"OLD_REMOVABLE_RECORD"});const html=notebookGroupsHTML(notebookRecords(),true)');assert.ok(!f.run('html').includes('delCanon(0)'));assert.ok(f.run('html').includes('delCanon(1)'));f.run('delCanon(1)');assert.equal(f.run('G.canon.length'),1);assert.equal(f.run('G.canon[0].id'),f.run('coreId'))});
await test('System instructions use fixed answers and remove obsolete compact-campaign targets',f=>{
 f.run('seed();G.campaign={version:1};const instructions=sysBase()');
 assert.ok(!f.run('instructions').includes('진상(구역이 지워진 이유, 출석부의 정체, 교표의 비밀, 엔딩)은 정해져 있지 않다'));
 assert.ok(!f.run('instructions').includes('플레이 중 네가 일관되게 정하되'));
 assert.ok(!f.run('instructions').includes('6개 모으기'));
 assert.ok(!f.run('instructions').includes('애시우드 구역'));
 assert.ok(f.run('instructions').includes('정답·핵심 증거는 비공개 설계에 미리 정해져 있다'));
 f.run('delete G.campaign');assert.ok(f.run('sysBase()').includes('기념 메달 조각 6개 모으기'));
});
await test('[v1 저장본] A matching scene is reviewed before display without disclosing unseen evidence or answers',async f=>{
 await legacy(f);f.run(`const core=${JSON.stringify(legacyCandidate.evidence[0].text)};callAI=async(sys,user)=>{api.push({sys,user});return JSON.stringify(sys.includes('본문 일치 검토자')?{valid:true,issues:[]}:{narration:'바람이 문틈을 스친다. '+core,choices:[],effects:{}})}`);
 await f.run("aiTurn('입구를 조사한다')");assert.ok(f.obj('events').some(e=>e.type==='scene'&&e.text.includes('바람이')));
 const review=f.obj('api').at(-1);assert.match(review.sys,/본문 일치 검토자/);assert.ok(review.user.includes(legacyCandidate.evidence[0].text));
 for(const privateValue of [legacyCandidate.truth,legacyCandidate.conclusion,legacyCandidate.evidence[1].text,legacyCandidate.verification.result,'ROOM_SECRET_381','WORLD_SECRET_479'])assert.ok(!review.user.includes(privateValue),privateValue);
 assert.equal(f.run('G.site.mystery.state.found.length'),1);
});
await test('[v1 저장본] Omitted or numerically altered core text is replaced without needing reviewer approval',async f=>{
 await legacy(f);f.run("let reviewCalls=0;callAI=async(sys)=>{if(sys.includes('본문 일치 검토자'))reviewCalls++;return JSON.stringify({narration:'종이에 04:15라는 시간이 세 번 적혀 있다.',choices:['잘못된 시간을 입력한다'],chronicle:'잘못된 시간을 발견했다',effects:{체력:-9}})}");
 await f.run("aiTurn('입구를 조사한다')");const scene=f.obj('events').find(e=>e.type==='scene');assert.ok(scene.text.includes(legacyCandidate.evidence[0].text));assert.ok(!scene.text.includes('04:15'));assert.equal(f.run('reviewCalls'),0);assert.equal(f.run('G.hp'),12);assert.ok(!JSON.stringify(f.obj('G.recent')).includes('04:15'));assert.ok(!JSON.stringify(f.obj('G.chronicle')).includes('잘못된 시간'));
});
await test('Reviewer rejection discards invented discoveries, choices, chronology and effects',async f=>{
 await prepared(f);f.run("callAI=async(sys)=>JSON.stringify(sys.includes('본문 일치 검토자')?{valid:false,issues:['추가 발견은 공개 기록에 없음']}:{narration:'벽에서 HALLUCINATED_KEY를 발견한다.',choices:['HALLUCINATED_KEY로 문을 연다'],chronicle:'HALLUCINATED_KEY를 얻었다',effects:{items_add:[{name:'HALLUCINATED_KEY',key:true}]}})");
 await f.run("aiTurn('문 앞에서 잠시 기다린다')");assert.ok(!JSON.stringify(f.obj('events')).includes('HALLUCINATED_KEY'));assert.ok(!JSON.stringify(f.obj('G.recent')).includes('HALLUCINATED_KEY'));assert.ok(!JSON.stringify(f.obj('G.items')).includes('HALLUCINATED_KEY'));assert.equal(f.run('G.evidence.length'),0);assert.equal(f.run('busy'),false);
});
await test('Missing verdict, nonboolean verdict and connection failure use canonical fallback',async f=>{
 await prepared(f);f.run(`const core=${JSON.stringify(candidate.evidence[0].text)};const turn={g:G,loc:'site',action:'조사',flags:{privateMystery:true},mysteryOutcome:{d:G.site,type:'evidence',e:mysteryPlan().evidence[0]}};const submission={narration:core+' UNSAFE_EXTRA',choices:[],effects:{hp:-3}}`);
 for(const verdict of ['{}','{valid:"true",issues:[]}','{valid:true}','{valid:true,issues:["문제"]}','null']){
  f.run('callAI=async()=>JSON.stringify('+verdict+')');const result=await f.run('guardMysteryNarration(submission,turn,true)');assert.ok(result.narration.includes(candidate.evidence[0].text));assert.ok(!result.narration.includes('UNSAFE_EXTRA'));assert.deepEqual(Object.keys(result.effects),[]);
 }
 f.run('callAI=async()=>{throw Error("network failure")}');const result=await f.run('guardMysteryNarration(submission,turn,true)');assert.ok(!result.narration.includes('UNSAFE_EXTRA'));
});
await test('Exact private-answer leakage is blocked locally and never sent to the reviewer',async f=>{
 await prepared(f);f.run('let reviewCalls=0;callAI=async()=>{reviewCalls++;return JSON.stringify({valid:true,issues:[]})};const turn={g:G,loc:"site",action:"기다린다",flags:{}}');
 const result=await f.run('guardMysteryNarration({narration:'+JSON.stringify(candidate.truth)+',choices:[],effects:{}},turn,true)');assert.ok(!result.narration.includes(candidate.truth));assert.equal(f.run('reviewCalls'),0);
});
await test('[v1 저장본] Late narration review cannot mutate or unlock a replacement game',async f=>{
 await legacy(f);f.run(`let releaseReview;const core=${JSON.stringify(legacyCandidate.evidence[0].text)};callAI=async(sys)=>sys.includes('본문 일치 검토자')?new Promise(r=>releaseReview=r):JSON.stringify({narration:core,choices:[],effects:{}});const pending=aiTurn('입구를 조사한다')`);
 await new Promise(r=>setImmediate(r));assert.equal(f.run('typeof releaseReview'),'function');f.run('seed("campus");busy=true;const replacementTurn={g:G};curTurn=replacementTurn;G.choiceMeta={keep:{type:"story"}};releaseReview(JSON.stringify({valid:false,issues:["문제"]}))');await f.run('pending');assert.equal(f.run('busy'),true);assert.equal(f.run('curTurn===replacementTurn'),true);assert.equal(f.run('G.choiceMeta.keep.type'),'story');assert.equal(f.run('G.evidence.length'),0);
});
await test('Medal completion pays cash and bonus XP once, independently of main progress',f=>{
 f.run('seed("campus");G.campaign={version:1,links:{},introSolved:false};G.fragments=5;G.xp=0;G.growth=0;const beforeCash=G.cash');assert.equal(f.run('grantMedalReward()'),false);f.run('G.fragments=6');assert.equal(f.run('grantMedalReward()'),true);assert.equal(f.run('G.cash'),f.run('beforeCash')+300);assert.equal(f.run('G.xp'),3);assert.equal(f.run('G.medalRewardClaimed'),true);assert.equal(f.run('G.campaign.introSolved'),false);assert.equal(f.run('G.actDone||false'),false);assert.equal(f.run('grantMedalReward()'),false);assert.equal(f.run('G.cash'),f.run('beforeCash')+300);
});
await test('Completed old saves receive the medal bonus once; reload and recovered medals do not repay',f=>{
 f.run('seed("campus");G.fragments=8;delete G.medalRewardClaimed;migrate();const beforeCash=G.cash;grantMedalReward();G=JSON.parse(JSON.stringify(G));migrate();G.fragments=5');assert.equal(f.run('grantMedalReward()'),false);f.run('G.fragments=6');assert.equal(f.run('grantMedalReward()'),false);assert.equal(f.run('G.cash'),f.run('beforeCash')+300);assert.equal(f.run('G.xp'),3);
});
await test('[v1 저장본] A code-selected optional medal survives canonical fallback without becoming core evidence',async f=>{
 await legacy(f);f.run('G.fragments=5;G._fragMax=5;G.xp=0;G.site.rooms[0].fragment=true;Math.random=()=>0;const sealed=G.site.mystery.sealed;const beforeCash=G.cash');await f.run("aiTurn('입구를 조사한다')");assert.equal(f.run('G.fragments'),6);assert.equal(f.run('G.site.rooms[0].fragTaken'),true);assert.equal(f.run('G.evidence.length'),1);assert.equal(f.run('G.evidence[0].text'),legacyCandidate.evidence[0].text);assert.equal(f.run('G.site.mystery.sealed'),f.run('sealed'));assert.equal(f.run('G.cash'),f.run('beforeCash')+300);f.run('fragXpCheck();grantMedalReward()');assert.equal(f.run('G.xp'),4);await f.run("aiTurn('입구를 다시 조사한다')");assert.equal(f.run('G.fragments'),6);assert.equal(f.run('G.cash'),f.run('beforeCash')+300);
});
await test('[v1 저장본] Dark and story-only actions cannot acquire optional medals from forged narrative or effects',async f=>{
 await legacy(f);f.run('G.fragments=0;G.site.rooms[0].fragment=true;Math.random=()=>0;G.battery=0;G.textUse=0;callAI=async(sys)=>JSON.stringify(sys.includes("본문 일치 검토자")?{valid:true,issues:[]}:{narration:"기념 메달 조각을 발견하고 손에 넣었다.",choices:[],effects:{메달조각:true}})');await f.run("aiTurn('입구를 조사한다')");assert.equal(f.run('G.fragments'),0);f.run('G.battery=6;G.textUse=0;pend("",{storyOnly:true})');await f.run("aiTurn('입구를 조사한다')");assert.equal(f.run('G.fragments'),0);assert.equal(f.run('G.site.rooms[0].fragTaken||false'),false);
 f.run('callAI=async(sys)=>JSON.stringify(sys.includes("본문 일치 검토자")?{valid:true,issues:[]}:{narration:"너는 조용히 기다린다.",choices:[],effects:{items_add:[{name:"기념 메달 조각",key:true}],메달조각:true}})');await f.run("aiTurn('조용히 기다린다')");assert.equal(f.run('G.fragments'),0);assert.ok(!f.obj('G.items').includes('기념 메달 조각'));
});
await test('Both medal and old emblem effect labels are compatible while public UI uses medals',f=>{
 assert.equal(f.run('koEffects({메달조각:true}).fragment'),true);assert.equal(f.run('koEffects({교표조각:true}).fragment'),true);assert.equal(f.run('fragFoundIn("기념 메달 조각을 발견하고 손에 넣었다.")'),true);assert.equal(f.run('fragFoundIn("기념 메달 조각을 발견한 줄 알았지만 가짜였다.")'),false);assert.ok(!html.includes('교표 조각'));assert.ok(html.includes('6개 완성 보상: 캐시'));
});
// ---- v2: 함정 증거·행동별 증거·실마리 ----
const tok=(f,id)=>f.run("mysteryHash(G.site.mystery.hash+':'+"+JSON.stringify(id)+")");
await test('[v2] Validator rejects decoys in requires/supports, bad refuted_by/points_to, unreachable evidence and too many dead ends',f=>{
 f.run('seed();G.site.deductionRequired=true;let p='+JSON.stringify(candidate));assert.deepEqual(f.obj('validateMystery(p,G.site)'),[]);
 const bad={"p.verification.requires.push('d1')":/requires/,"p.deduction.supports.push('d1')":/supports/,"p.evidence[3].refuted_by='h2'":/refuted_by/,"p.evidence[3].refuted_by='d1'":/refuted_by/,"p.evidence[3].points_to='h2'":/points_to/,
  "p.evidence[0].leads=['e2']":/도달할 수 없는/,"p.start_leads=[]":/start_leads/,"p.dead_ends.push({room:'r1',action:'바닥 타일을 두드려 본다'},{room:'r2',action:'의자 밑을 들여다본다'})":/30%/,
  "p.dead_ends=[]":/dead_ends/,"p.dead_ends.push({room:'r3',action:'천장을 올려다본다'})":/dead_ends/,"p.evidence[3].action=p.evidence[1].action":/action/,"p.evidence[3].role='core'":/./,"delete p.evidence[0].role":/role/,"p.evidence.pop()":/함정 증거/,"p.evidence[3].id='e4'":/./};
 for(const [m,re] of Object.entries(bad)){f.run('p='+JSON.stringify(candidate)+';'+m);const errs=f.obj('validateMystery(p,G.site)');assert.ok(errs.length&&errs.some(e=>re.test(e)),m+' → '+errs.join('|'))}
 // 함정은 핵심 증거와 같은 공간에 있어도 된다(행동만 다르면)
 f.run('p='+JSON.stringify(candidate)+";p.evidence[3].room='r1'");assert.deepEqual(f.obj('validateMystery(p,G.site)'),[]);
});
await test('[v2] Intro validator: three rooms, three core facts over at least two rooms, one decoy; one room may hold no core fact',f=>{
 f.run(`seed();G.site={intro:true,deductionRequired:true,name:'소문',cur:'r1',rooms:[{id:'r1',name:'입구',exits:['r2']},{id:'r2',name:'준비실',exits:['r1','r3']},{id:'r3',name:'장비실',exits:['r2']}]};let p=${JSON.stringify(candidate)};p.room_views=p.room_views.slice(0,3)`);
 assert.deepEqual(f.obj('validateMystery(p,G.site)'),[]);
 f.run("p.evidence[2].room='r2';p.verification.room='r2'");assert.deepEqual(f.obj('validateMystery(p,G.site)'),[],'core facts may share a room in the intro');
 f.run("p.evidence.forEach(e=>e.room='r1');p.dead_ends=[{room:'r3',action:'창문 틈에 귀를 대고 바깥 소리를 듣는다'}]");assert.ok(f.obj('validateMystery(p,G.site)').some(e=>/입문/.test(e)));
 f.run('p='+JSON.stringify(candidate)+';p.room_views=p.room_views.slice(0,3);p.evidence.pop()');assert.ok(f.obj('validateMystery(p,G.site)').some(e=>/입문|함정/.test(e)));
});
await test('[v2] Only opened actions are offered; the old look/search buttons are gone; dead ends and free text give nothing',async f=>{
 await prepared(f);assert.equal(f.run('mysteryPlan().v'),2);
 let list=choices(f).map(a=>a.label);assert.ok(list.some(l=>l.includes(candidate.evidence[0].action)));assert.ok(!list.some(l=>/현재 공간 (살펴보기|조사하기)/.test(l)));assert.doesNotMatch(f.run('fixedHTML()'),/👁 살펴보기/);
 f.run("G.site.cur='r2'");list=choices(f).map(a=>a.label).join('|');assert.ok(!list.includes(candidate.evidence[1].action),'e2 not yet opened');assert.ok(!list.includes(candidate.evidence[3].action),'d1 not yet opened');
 // 열리지 않은 행동을 토큰으로 위조해도 지급되지 않는다
 f.run("pend('',{mysteryAct:{site:siteIdentity(G.site),token:"+JSON.stringify(tok(f,'e2'))+"}})");await f.run("aiTurn('피아노 옆 녹음기를 끝까지 틀어 본다')");assert.equal(f.run('G.evidence.length'),0);
 await pick(f,'r1',candidate.evidence[0].action);assert.equal(f.run('G.evidence.length'),1);assert.deepEqual(f.obj('G.site.mystery.state.found'),['e1']);
 f.run("G.site.cur='r2'");list=choices(f).map(a=>a.label);assert.ok(list.some(l=>l.includes(candidate.evidence[1].action)&&l.includes('앞서 확인한')),'opened with a reason');
 // 자유 서술은 같은 문장이라도 증거를 주지 않는다
 await f.run("aiTurn('피아노 옆 녹음기를 끝까지 틀어 확인해 본다')");assert.equal(f.run('G.evidence.length'),1);assert.ok(f.obj('events').some(e=>e.text.includes('추가 발견 없음')));
 f.run("act('피아노 옆 녹음기를 꼼꼼히 조사한다',{src:'free'})");await settle();assert.equal(f.run('G.evidence.length'),1);
 await pick(f,'r2',candidate.evidence[1].action);await pick(f,'r3',candidate.dead_ends[0].action);assert.equal(f.run('G.evidence.length'),2,'dead end in the same room as e3 gives nothing');
 assert.ok(!choices(f).some(a=>a.label.includes(candidate.dead_ends[0].action)),'dead end is not offered again');assert.ok(choices(f).some(a=>a.label.includes(candidate.evidence[2].action)));
 const log=f.obj('events').filter(e=>e.type==='fx').map(e=>e.text).join('\n');for(const k of ['확인한 사실:','사건에 미친 영향:','남은 의문:','조사할 거리가 남은 곳:'])assert.ok(log.includes(k),k);
});
await test('[v2] A decoy is granted, logged and shown exactly like any other fact',async f=>{
 await prepared(f);await pick(f,'r1',candidate.evidence[0].action);await pick(f,'r2',candidate.evidence[3].action);await pick(f,'r2',candidate.evidence[1].action);
 assert.deepEqual(f.obj('G.site.mystery.state.found'),['e1','d1','e2']);
 const panel=f.run('mysteryPanel()'),fixed=f.run('fixedHTML()'),deduce=f.run("G.site.cur='r3';mysteryDeductionHTML()"),acts=JSON.stringify(f.obj('gameActions().map(a=>a.id)'));
 const row=e=>'<p>'+e.text+'<br><span class="muted">'+e.meaning+'</span></p>';for(const e of [candidate.evidence[0],candidate.evidence[3],candidate.evidence[1]])assert.ok(panel.includes(row(e)),e.id);
 assert.ok(panel.indexOf(candidate.evidence[3].text)<panel.indexOf(candidate.evidence[1].text),'acquisition order');
 const shown=[panel,fixed,deduce,acts,JSON.stringify(f.obj('events')),JSON.stringify(f.obj('notices')),f.run("buildPrompt('살펴본다','')")].join('\n');
 for(const bad of ['decoy','함정','points_to','refuted_by','"d1"','value="d1"','value="e1"',':d1',':e2'])assert.ok(!shown.includes(bad),bad);
 const scope=f.obj("(()=>{const s=mysteryNarrationScope({g:G,loc:'site',action:'',flags:{},mysteryOutcome:{d:G.site,type:'decoy',e:mysteryPlan().evidence[3]}});return s.public})()");assert.equal(scope.outcome.type,'evidence');
});
await test('[v2] No progress denominators, phases or scale hints on the player screen',async f=>{
 await prepared(f);await pick(f,'r1',candidate.evidence[0].action);
 const t=f.run('G.threads.find(t=>t.id===G.site.caseId)');const screens=[f.run('mysteryPanel()'),f.run('fixedHTML()'),f.run('caseCard(G.threads.find(t=>t.id===G.site.caseId))')];
 for(const h of screens){assert.doesNotMatch(h,/(핵심 증거|확인한 사실|증거)\s*\d+\s*\/\s*\d+/);assert.doesNotMatch(h,/증거 수집|검증 가능|핵심 증거를 모두 확인하면/)}
 assert.match(screens[0],/진행: 조사 중/);assert.match(screens[0],/의심되는 원인/);assert.match(screens[1],/확인한 사실 1개/);
});
await test('[v2] Submission with partial facts is allowed at the verification room; wrong answers can be retried without any limit',async f=>{
 await prepared(f);await pick(f,'r1',candidate.evidence[0].action);assert.equal(f.run("G.site.cur='r3';canVerifyMystery()"),false,'needs two facts');
 await pick(f,'r2',candidate.evidence[1].action);f.run("G.site.cur='r1'");assert.equal(f.run('canVerifyMystery()'),false,'only at the verification room');
 f.run("G.site.cur='r3'");assert.equal(f.run('canVerifyMystery()'),true);assert.ok(f.run('fixedHTML()').includes('🧩 추리 제출'));assert.ok(!f.run('fixedHTML()').includes('남은 기회'));
 await proofV2(f,'h2',['e1','e2']);assert.equal(f.run('G.site.mystery.state.solved'),false,'missing required fact → refuted');
 await pick(f,'r2',candidate.evidence[3].action);await pick(f,'r3',candidate.evidence[2].action);
 // 화면 값(토큰)으로 전부 체크하면 함정이 섞여 실패
 const all=f.obj("G.site.mystery.state.found.map(id=>mysteryFactToken(G.site,id))");await proofV2(f,'h2',all);assert.equal(f.run('G.site.mystery.state.solved'),false);
 await proofV2(f,'h1',['e2','e3']);assert.equal(f.run('G.site.mystery.state.solved'),false,'wrong hypothesis');
 await proofV2(f,'h2',['e2','e3','d1']);assert.equal(f.run('G.site.mystery.state.solved'),false,'decoy in the reasons');
 // 네 번 틀린 뒤에도 추리 버튼이 남아 있고, 다시 살펴보기를 하지 않아도 바로 다시 추리할 수 있다
 assert.equal(f.run('canVerifyMystery()'),true);assert.ok(f.run('fixedHTML()').includes('verifyMystery()'));assert.ok(!choices(f).some(a=>a.label.startsWith('다시 살펴보기')));
 assert.ok(!f.run('mysteryDeductionHTML()').includes('기회'));
 assert.ok(f.obj('events').some(e=>/원인과 이유를 다시 골라 추리해 보세요/.test(e.text)));assert.ok(!f.obj('events').some(e=>/남은 기회/.test(e.text)));
 assert.equal(f.run('G.site.mystery.state.attempts.length'),4);
 await proofV2(f,'h2',f.obj("['e2','e3','e1'].map(id=>mysteryFactToken(G.site,id))"));assert.equal(f.run('G.site.mystery.state.solved'),true);
 assert.equal(f.run('G.threads.find(t=>t.id===G.site.caseId).status'),'closed');
});
await test('[v2] An old save that already ran out of chances can deduce again right away',async f=>{
 await prepared(f);await pick(f,'r1',candidate.evidence[0].action);await pick(f,'r2',candidate.evidence[1].action);await pick(f,'r3',candidate.evidence[2].action);f.run("G.site.mystery.state.chances=0;G.site.cur='r3'");
 assert.equal(f.run('canVerifyMystery()'),true);await proofV2(f,'h2',f.obj("['e1','e2','e3'].map(id=>mysteryFactToken(G.site,id))"));assert.equal(f.run('G.site.mystery.state.solved'),true);
});
await test('[v2] Medal fragments still drop from investigation choices (including dead ends) but not from free text',async f=>{
 await prepared(f);f.run('G.fragments=0;G.site.rooms.forEach(r=>r.fragment=true);Math.random=()=>0');
 await f.run("aiTurn('입구를 조사한다')");assert.equal(f.run('G.fragments'),0);
 await pick(f,'r1',candidate.evidence[0].action);assert.equal(f.run('G.fragments'),1);
 await pick(f,'r3',candidate.dead_ends[0].action);assert.equal(f.run('G.fragments'),2);
});
await test('[v1 저장본] An old sealed case keeps the old flow, screens and judgement',async f=>{
 await legacy(f);assert.equal(f.run('mysteryPlan().v'),1);assert.ok(choices(f).some(a=>a.label==='현재 공간 조사하기'));
 for(const room of ['r1','r2','r3']){f.run('G.site.cur='+JSON.stringify(room));await f.run("aiTurn('이 공간을 조사한다')")}
 assert.equal(f.run('G.evidence.length'),3);assert.match(f.run('mysteryPanel()'),/핵심 증거 3\/3개/);assert.match(f.run('fixedHTML()'),/원인 후보·증거 연결 검증/);
 f.run('G=JSON.parse(JSON.stringify(G));migrate()');assert.equal(f.run('mysteryPlan().v'),1);f.run('verifyMystery()');await settle();assert.equal(f.run('G.site.mystery.state.solved'),true);
});
await test('[v2] Room totals are hidden in the status bar, return button and paused-zone list; old cases and plain zones keep them',async f=>{
 await prepared(f);f.run("G.site.rooms.forEach(r=>r.visited=r.id!=='r4');renderNeed()");
 const need=f.run("document.getElementById('needBar').innerHTML"),fixed=f.run('fixedHTML()');
 assert.match(need,/둘러본 공간 3곳/);assert.match(fixed,/둘러본 공간 3곳/);
 for(const h of [need,fixed]){assert.doesNotMatch(h,/\d+\s*\/\s*4\s*공간|조사 \d+\/\d+|조사도|아직 못 찾은/);}
 f.run('G.pausedZones=[JSON.parse(JSON.stringify(G.site))];openZones()');assert.match(f.run('modalHTML'),/둘러본 공간 3곳/);assert.doesNotMatch(f.run('modalHTML'),/3\/4공간/);
 // 구버전 사건 저장본은 예전 표시 그대로
 await (async()=>{const S=JSON.stringify(legacyCandidate);f.run("{const S="+JSON.stringify(S)+";G.site.mystery={version:1,status:'ready',sealed:S,hash:mysteryHash(S),state:{found:[],evidenceIds:{},solved:false,attempts:[]}}};renderNeed()")})();
 assert.match(f.run("document.getElementById('needBar').innerHTML"),/3\/4공간/);assert.match(f.run('fixedHTML()'),/조사 3\/4/);
 f.run('G.pausedZones=[JSON.parse(JSON.stringify(G.site))];openZones()');assert.match(f.run('modalHTML'),/3\/4공간/);
 // 사건이 없는 일반 구역도 그대로
 f.run('delete G.site.mystery;renderNeed()');assert.match(f.run("document.getElementById('needBar').innerHTML"),/3\/4공간/);
});
await test('[v2] Broken lead links in a draft are repaired without touching any fact, and the case is prepared on the first try',async f=>{
 f.run('seed();G.site.deductionRequired=true');
 const cases={
  'decoy never opened':"p.evidence[0].leads=['e2']",
  'terminal evidence has no leads field':"delete p.evidence[2].leads;delete p.evidence[3].leads",
  'cycle cut off from the start':"p.evidence[0].leads=['d1'];p.evidence[1].leads=['e3'];p.evidence[2].leads=['e2']",
  'unknown and self ids':"p.evidence[0].leads=['e2','d1','zzz','e1',7];p.evidence[1].leads=['e2','nope']",
  'start_leads empty':"p.start_leads=[]","start_leads missing":"delete p.start_leads",
  'start_leads has three and unknown':"p.start_leads=['e1','e2','e3','zzz']",
  'nothing links anywhere':"p.evidence.forEach(e=>e.leads=[])",
 };
 for(const [name,mut] of Object.entries(cases)){
  f.run('globalThis.p='+JSON.stringify(candidate)+';'+mut);
  const before=f.obj('p.evidence.map(e=>[e.id,e.text,e.meaning,e.action,e.room,e.role])');
  f.run('p=normalizeMysteryDraft(p,G.site)');
  assert.deepEqual(f.obj('validateMystery(p,G.site)'),[],name);
  assert.deepEqual(f.obj('p.evidence.map(e=>[e.id,e.text,e.meaning,e.action,e.room,e.role])'),before,name+': facts untouched');
  assert.ok(f.run('p.start_leads.length>=1&&p.start_leads.length<=2'),name);
 }
 // 이미 올바른 연결은 그대로
 f.run('globalThis.p='+JSON.stringify(candidate)+';p=normalizeMysteryDraft(p,G.site)');assert.deepEqual(f.obj('p.evidence.map(e=>e.leads)'),candidate.evidence.map(e=>e.leads));assert.deepEqual(f.obj('p.start_leads'),['e1']);
 // 끝까지: 생성 → 정규화 → 검증 → 검토가 한 번에 통과하고 봉인된 사건에서 모든 증거가 열린다
 const broken=JSON.parse(JSON.stringify(candidate));broken.evidence[0].leads=['e2'];delete broken.evidence[3].leads;
 f.run('seed();G.site.deductionRequired=true;let designs=0;callAI=async(sys)=>{if(sys.includes("독립 검토자"))return JSON.stringify({valid:true,issues:[]});designs++;return JSON.stringify('+JSON.stringify(broken)+')}');
 await f.run('ensureMystery()');assert.equal(f.run('G.site.mystery.status'),'ready');assert.equal(f.run('designs'),1,'no retry needed');
 f.run("const st=G.site.mystery.state,pl=mysteryPlan();for(let i=0;i<8;i++){const open=mysteryOpenIds(pl,st);const e=pl.evidence.find(e=>open.has(e.id)&&!st.found.includes(e.id));if(!e)break;st.found.push(e.id)}");
 assert.equal(f.run('mysteryPlan().evidence.every(e=>G.site.mystery.state.found.includes(e.id))'),true,'every fact can be reached by playing');
});
await test('[v2] A truly unrepairable lead problem is reported with the evidence ids so the retry can fix it',f=>{
 f.run('seed();G.site.deductionRequired=true;let p='+JSON.stringify(candidate)+";p.evidence[0].leads=['e2'];");
 const errs=f.obj('validateMystery(p,G.site)');assert.ok(errs.some(e=>/도달할 수 없는 증거\(d1, e3|도달할 수 없는 증거\(d1/.test(e)||/도달할 수 없는 증거\(.*d1/.test(e)),errs.join('|'));
 assert.match(f.run('mysteryPrompt(G.site)'),/다른 증거의 leads에 한 번도 나오지 않는 증거는 반드시 start_leads에 있어야 한다/);
});
await test('[v2] Reachability is checked over the whole lead graph: a valid branching chain is never rejected (regression)',f=>{
 f.run('seed();G.site.deductionRequired=true');
 // 분기와 사슬이 섞인 올바른 연결. 예전 검사는 대기열을 증거마다 한 칸씩 꺼내 이런 사건을 "도달 불가"로 거절했다.
 for(const mut of ["p.evidence[0].leads=['e3','e2'];p.evidence[2].leads=['d1'];p.evidence[1].leads=[]",
                   "p.evidence[0].leads=['d1','e2','e3'];p.evidence[1].leads=[];p.evidence[2].leads=[]",
                   "p.start_leads=['e1','e3'];p.evidence[0].leads=['e2'];p.evidence[1].leads=['d1'];p.evidence[2].leads=[]",
                   "p.evidence[0].leads=['e2'];p.evidence[1].leads=['e3'];p.evidence[2].leads=['d1']"]){
  f.run('p='+JSON.stringify(candidate)+';'+mut);assert.deepEqual(f.obj('validateMystery(p,G.site)'),[],mut);
 }
 // 정말 닿지 않는 경우는 여전히 거절한다
 f.run('p='+JSON.stringify(candidate)+";p.evidence[0].leads=['e2'];p.evidence[1].leads=[]");assert.ok(f.obj('validateMystery(p,G.site)').some(e=>/도달할 수 없는 증거\(.*e3.*d1|도달할 수 없는 증거\(.*d1.*e3/.test(e)));
});
await test('[v2] A free action that finds nothing gets a short notice, not empty "없음" fields, and multi-line notices keep their line breaks',async f=>{
 await prepared(f);f.run('events.length=0');await f.run("aiTurn('입구를 자세히 살펴본다')");
 const t=f.obj('events').filter(e=>e.type==='fx').map(e=>e.text).join('\n');
 assert.equal(t,'🔎 조사 결과 — 추가 발견 없음','only the one-line notice');
 assert.doesNotMatch(t,/확인한 사실: 없음|사건에 미친 영향: 없음/);
 assert.match(html,/\.entry\.sys,\.entry\.fx\{white-space:pre-line\}/);
});
await test('[v2] Outside the room, hints name only places: no actions, and rooms not yet visited stay unnamed (no spoilers)',async f=>{
 await prepared(f);f.run('G.site.rooms.forEach(r=>r.visited=r.id==="r1");G.site.cur="r1";events.length=0');
 const all=[...candidate.evidence.slice(1).map(e=>e.action),...candidate.dead_ends.map(x=>x.action)];   // e1은 플레이어가 직접 한 행동
 const hidden=f.obj('G.site.rooms.filter(r=>!r.visited).map(r=>r.name)');
 await pick(f,'r1',candidate.evidence[0].action);
 f.run("G.site.rooms.forEach(r=>{if(r.id!=='r1')r.visited=false})");
 const outside=[f.obj('mysteryPublic().next').join('|'),f.obj('events').filter(e=>e.type!=='action').map(e=>e.text).join('|'),f.run('socialHelpText()'),f.run('campaignPublic()?campaignPublic().next:""'),
   f.obj('(G.threads||[]).map(t=>(t.next||[]).join("|"))').join('|')].join('\n');
 f.run("openZoneJournal()");const journal=f.run('modalHTML');
 for(const a of all){assert.ok(!outside.includes(a),'action leaked: '+a);assert.ok(!journal.includes(a),'action in journal: '+a)}
 for(const n of hidden){assert.ok(!outside.includes(n),'unvisited room named: '+n)}
 assert.match(f.obj('mysteryPublic().next').join('|'),/아직 가 보지 않은 공간/);
 // 그 공간에 들어가면 행동은 조사 선택지로 그대로 보인다
 f.run("G.site.cur='r2';G.site.rooms.find(r=>r.id==='r2').visited=true");assert.ok(choices(f).some(c=>c.label.includes(candidate.evidence[1].action)));
 assert.ok(f.obj('mysteryPublic().next').includes(f.run("G.site.rooms.find(r=>r.id==='r2').name")),'a visited room is named');
});
console.log(`${count} private-mystery scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

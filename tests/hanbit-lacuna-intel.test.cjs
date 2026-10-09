// Run: node tests/hanbit-lacuna-intel.test.cjs
// 라쿠나 정보 3단계, 아직 모르는 이름 숨기기, 사건 구역의 사전·장부 필터, 곁가지 지역 단계 공개
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
function setupAI(f){f.run(`
 const events=[],api=[];addLog=(type,text)=>events.push({type,text});
 function worldDraft(){return {truth:'ROOT_SECRET_853 보존 대상은 폐기된 학적 기록이다.',detail:'ROOT_DETAIL_793 기록을 옮겨 감춘 경위가 있다.',opening:'복도에 서면 교실 문 너머에서 목소리가 들린다.',roster:'안개 기숙사와 방송 시설의 빈 칸이 남아 있다.',lacuna_intel:['INTEL_0 출석부 첫 줄은 옛 기숙사 구역의 이름이다.','INTEL_1 그 구역은 동남쪽 저수지 아래에 있다.','INTEL_2 수위가 낮아지는 날에만 옛길이 드러난다.'],rumors:[HOME_REGION,HOODS.east.n,HOODS.south.n,HOODS.north.n].map(region=>({region,belief:'이곳에는 지워진 기록에 관한 엇갈린 소문이 돈다.'})),chapters:['lacuna','c0','c1'].map((key,i)=>({key,role:'담당 부분 '+i,fragment:'PRIVATE_FRAGMENT_'+key,link:'LINK_'+key+' 기록에 같은 식별자가 남아 있다.',riddle:'이 공간에서 되풀이되는 현상이 있다.',lore:'PRIVATE_LORE_'+key+' 닫힌 교실의 사연과 교칙이 있다.'}))}}
 function smallRooms(){return Array.from({length:4},(_,i)=>({id:'r'+(i+1),name:'공간 '+(i+1),danger:0,exits:i===0?['r2']:i===3?['r3']:['r'+i,'r'+(i+2)]}))}
 function caseDraft(){const d=G.site;return {question:d.name+'의 반복 현상은 왜 일어나는가?',opening:'문틀과 낡은 바닥이 조용히 빛을 받는다.',truth:'CASE_SECRET_'+d.name+'의 원인은 예약 장치다.',conclusion:'예약된 기록이 선을 통해 다른 공간으로 전달되었다.',room_views:d.rooms.map(r=>({room:r.id,text:'바닥과 벽에 오래된 흔적이 남아 있다.'})),evidence:[{id:'e1',role:'core',room:'r1',action:'입구 시간표를 한 줄씩 짚어 읽는다',text:d.name+' 입구의 시간표에는 같은 시각이 세 번 적혀 있다.',meaning:'반복 주기를 비교할 기준이다.',leads:['e2','d1']},{id:'e2',role:'core',room:'r2',action:'준비실 녹음기를 끝까지 틀어 본다',text:d.name+' 준비실의 음원은 매번 같은 구간에서 끊긴다.',meaning:'동일한 기록이 반복된다는 근거다.',leads:['e3']},{id:'e3',role:'core',room:'r3',action:'장비실 선을 따라 번호표를 확인한다',text:d.name+' 장비실의 전송선에 같은 번호가 붙어 있다.',meaning:'음원의 이동 경로를 확인할 근거다.',leads:[]},{id:'d1',role:'decoy',room:'r2',action:'준비실 악보대 위 먼지를 쓸어 본다',text:d.name+' 준비실 악보대에 누가 넘긴 듯한 손자국이 남아 있다.',meaning:'누군가 직접 연주했을 수도 있다.',points_to:'h1',refuted_by:'e2',leads:[]}],start_leads:['e1'],dead_ends:[{room:'r1',action:'입구 신발장 안쪽을 들여다본다'}],verification:{room:'r3',action:'같은 번호의 전송선을 분리하고 소리가 멎는지 확인한다',requires:['e1','e2','e3'],result:'선을 분리하자 반복되는 소리가 함께 멎었다.'},deduction:{hypotheses:[{id:'h1',text:'빈 공간에서 새 연주가 시작된다'},{id:'h2',text:'기록된 음원이 정해진 경로로 반복 전송된다'},{id:'h3',text:'바람이 울려 소리가 반복된다'}],answer_id:'h2',supports:['e2','e3'],explanation:'같은 구간의 반복과 번호가 같은 선이 기록의 전송을 입증한다.'},...(d.big?{main_link:campaignChapter(d.key).link}:{})}}
 callAI=async(sys,user)=>{api.push({sys,user});if(sys.includes('독립 검토자'))return JSON.stringify({valid:true,issues:[]});if(sys.includes('비공개 본편 설계자'))return JSON.stringify(worldDraft());if(sys.includes('비공개 미스터리 설계자'))return JSON.stringify(caseDraft());if(sys.includes('공간 생성')||sys.includes('구역 생성')||user.includes('JSON만 출력:'))return JSON.stringify({name:'새 시설',theme:'반복 현상',rooms:smallRooms()});return JSON.stringify({narration:'남은 기록을 조용히 비교한다.',choices:[],effects:{}})};
 aiTurn=liveAiTurn;maybeSummarize=async()=>{};checkState=checkState;
 seed('campus');G.campaign={version:1,links:{},introSolved:false,introHeard:true};G._deductionVersion=1;G._privateMysteryVersion=1;
 `)}
async function root(f){setupAI(f);assert.equal(await f.run('genCampaignWorld()'),true)}
async function intro(f){await root(f);await f.run('startIntroMystery()')}
// v2: 열린 증거 행동을 하나씩 골라 모은다(함정 증거 포함). 끝나면 검증 공간에 선다.
async function collect(f){for(let i=0;i<8;i++){const a=f.obj("(()=>{for(const r of G.site.rooms){const x=mysteryRoomActions(G.site,r.id).find(a=>a.kind==='evidence');if(x)return {room:r.id,token:x.token,action:x.action}}return null})()");if(!a)break;f.run('G.site.cur='+JSON.stringify(a.room)+";pend('',{mysteryAct:{site:siteIdentity(G.site),token:"+JSON.stringify(a.token)+"}})");await f.run('aiTurn('+JSON.stringify(a.action)+')')}f.run('G.site.cur=mysteryPlan().verification.room')}
async function repeatOne(f){const a=f.obj("mysteryRoomActions().find(a=>a.kind==='repeat')||null");assert.ok(a,'repeat action');f.run("pend('',{mysteryAct:{site:siteIdentity(G.site),token:"+JSON.stringify(a.token)+"}})");await f.run('aiTurn('+JSON.stringify(a.action)+')')}
async function proof(f,guess='h2',ids=['e2','e3']){f.run('submitMysteryProof('+JSON.stringify(guess)+','+JSON.stringify(ids)+')');await new Promise(r=>setImmediate(r))}
let count=0;async function test(name,fn){const f=fixture();await fn(f);count++;console.log('PASS',name)}
const settle=async()=>{for(let i=0;i<12;i++)await new Promise(r=>setImmediate(r))};
async function solvedIntro(f){await intro(f);await collect(f);await proof(f);f.run('leaveIntroMystery()')}
(async()=>{
await test('Lacuna stays nameless and closed until three pieces are learned from the intro, inquiries and days',async f=>{
 await solvedIntro(f);
 assert.equal(f.run('G.campaign.introSolved'),true);assert.equal(f.run('lacunaIntelCount()'),0);
 assert.equal(f.run("G.lexicon.some(l=>l.name==='라쿠나 구역')"),false,'no lexicon entry before learning anything');
 assert.match(f.run("buildPrompt('복도를 걷는다','')"),/\[플레이어가 아직 모르는 이름\][^\n]*라쿠나/);
 await f.run('actComplete()');
 assert.equal(f.run('lacunaIntelCount()'),1);assert.match(f.run("G.lexicon.find(l=>l.name==='라쿠나 구역').desc"),/INTEL_0/);
 assert.doesNotMatch(f.run("buildPrompt('복도를 걷는다','')"),/\[플레이어가 아직 모르는 이름\][^\n]*라쿠나/);
 assert.equal(f.run('lacunaReady()'),false);assert.equal(f.run("tripDests().some(d=>d.key==='lacuna')"),false);
 f.run('notices.length=0');await f.run("startBig('lacuna',true)");assert.match(f.obj('notices').join('|'),/아직 그곳으로 가는 길을 모릅니다/);assert.equal(f.run('G.site'),null);
 assert.equal(f.run('lacunaOnMap()'),false);
 f.run("G.loc='campus';G.district='hall';G.spot=null;busy=false");
 assert.match(f.run('fixedHTML()'),/라쿠나에 대해 수소문하기/);
 const before=f.run('api.length');assert.equal(f.run('askLacuna()'),true);await settle();
 assert.equal(f.run('lacunaIntelCount()'),2);assert.equal(f.run('lacunaOnMap()'),true);
 const asked=f.obj('api').slice(before).map(x=>x.user).join('\n');assert.match(asked,/INTEL_1/);assert.doesNotMatch(asked,/ROOT_SECRET_853|ROOT_DETAIL_793|INTEL_2/);
 f.run('busy=false');assert.equal(f.run('askLacuna()'),false,'one inquiry per day');assert.equal(f.run('lacunaIntelCount()'),2);
 assert.doesNotMatch(f.run('fixedHTML()'),/수소문하기/);
 f.run('G.day++;busy=false');assert.equal(f.run('askLacuna()'),true);await settle();
 assert.equal(f.run('lacunaIntelCount()'),3);assert.equal(f.run('lacunaReady()'),true);assert.equal(f.run("tripDests().some(d=>d.key==='lacuna')"),true);
 const panel=f.run('campaignPanel()');for(const t of ['INTEL_0','INTEL_1','INTEL_2'])assert.match(panel,new RegExp(t));
 assert.doesNotMatch(panel,/\/3|현재 목표|다음 행동|ROOT_SECRET/);assert.doesNotMatch(f.run('campaignPublic().next'),/하세요|떠나세요/);
});
await test('Saves that had already opened Lacuna keep it open after the update',async f=>{
 await root(f);
 // 라쿠나 정보 단계 이전 설계본(lacuna_intel 없음)에서 1막을 마친 예전 저장
 f.run("{const p=campaignPlan();delete p.lacuna_intel;const S=JSON.stringify(p);G.campaign.world.sealed=S;G.campaign.world.hash=mysteryHash(S)}");
 f.run('G.campaign.introSolved=true;G.actDone=true;delete G.campaign.lacunaIntel;delete G.campaign._intelFix;migrate()');
 assert.equal(f.run('lacunaIntelCount()'),3);assert.equal(f.run('lacunaReady()'),true);
});
await test('Solving the intro never hands over all Lacuna intel silently, even if a save/migrate runs before the intel is written',async f=>{
 await root(f);f.run('delete G.campaign.lacunaIntel;delete G.campaign._intelFix;G.campaign.introSolved=true;G.actDone=true;migrate()');
 assert.equal(f.run('lacunaIntelCount()'),0);
 await f.run('actComplete()');
 assert.equal(f.run('lacunaIntelCount()'),1);assert.equal(f.run('lacunaReady()'),false);
 assert.doesNotMatch(f.run('campaignPublic().next'),/들어가는 길을 짐작/);
});
await test('Saves already hit by that bug keep only what was really learned',async f=>{
 await root(f);
 f.run("G.campaign.introSolved=true;G.actDone=true;G.campaign.lacunaIntel=[0,1,2].map(i=>({i,day:1,how:'legacy'}));delete G.campaign._intelFix;migrate()");
 assert.equal(f.run('lacunaIntelCount()'),1);assert.equal(f.run("G.campaign.lacunaIntel[0].how"),'intro');
 assert.equal(f.run('lacunaReady()'),false);assert.equal(f.run('lacunaOnMap()'),false);
 assert.match(f.run("G.lexicon.find(l=>l.name==='라쿠나 구역').desc"),/INTEL_0/);assert.doesNotMatch(f.run("G.lexicon.find(l=>l.name==='라쿠나 구역').desc"),/INTEL_1/);
 f.run("G.campaign.lacunaIntel.push({i:1,day:2,how:'ask'});migrate()");assert.equal(f.run('lacunaIntelCount()'),2,'repair runs only once');
});
await test('Case-zone notes keep world facts but drop hidden case sentences and answer claims',async f=>{
 await intro(f);
 const hidden=f.run('mysteryPlan().evidence.find(e=>!G.site.mystery.state.found.includes(e.id)).text');
 const hook=f.run("HOOKS.effects.find(h=>String(h.fn).includes('caseSecretFilter'))?1:0");assert.equal(hook,1);
 f.run(`var E={caseUpdates:[{case_id:'x'}],board:[{q:'y'}],threadsDone:[{id:'z'}],lexAdd:[{cat:'인물',name:'관리인 박씨',desc:'특별교실동 열쇠 꾸러미를 가진 늙은 관리인'},{cat:'괴담',name:'숨은 단서',desc:${JSON.stringify('사람들 말로는 '+hidden)}}],ledgerAdd:['교칙 = 종이 두 번 울리면 복도에 서지 말 것','범인 = 관리인',${JSON.stringify(hidden)}]};
   HOOKS.effects.find(h=>String(h.fn).includes('caseSecretFilter')).fn(E,{T:{flags:{privateMystery:true},res:null}})`);
 assert.deepEqual(f.obj('E.caseUpdates.concat(E.board,E.threadsDone)'),[]);
 assert.deepEqual(f.obj('E.lexAdd.map(x=>x.name)'),['관리인 박씨']);
 assert.deepEqual(f.obj('E.ledgerAdd'),['교칙 = 종이 두 번 울리면 복도에 서지 말 것']);
 f.run('G.site.mystery.state.found=mysteryPlan().evidence.map(e=>e.id)');
 assert.equal(f.run(`caseSecretFilter(G.site)(${JSON.stringify(hidden)})`),false,'a fact the player already found is no longer secret');
});
await test('Side regions open one or two at a time, each after its rumor is heard',async f=>{
 await root(f);f.run("G.act=3;G.discovered=G.discovered.filter(id=>!MAP_PLACES.find(p=>p.id===id&&p.far));delete G.branchOpenIds;G.loc='campus';branchOpen()");
 const far="MAP_PLACES.filter(p=>p.far)";
 assert.equal(f.run(far+".filter(p=>G.discovered.includes(p.id)).length"),1);assert.equal(f.run(far+".filter(p=>hoodOpen(p.id)).length"),1);
 assert.equal(f.run("tripDests().filter(d=>BRANCH[d.key]).length"),1);
 f.run('revealNextPlace()');assert.equal(f.run(far+".filter(p=>hoodOpen(p.id)).length"),2);
 f.run('revealNextPlace()');assert.equal(f.run(far+".filter(p=>G.discovered.includes(p.id)).length"),3);assert.equal(f.run(far+".filter(p=>hoodOpen(p.id)).length"),2,'at most two open and unfinished');
 const unknown=f.run(far+".find(p=>!G.discovered.includes(p.id)).n");
 f.run('openBranch()');assert.ok(!f.run('modalHTML').includes(unknown),'unheard places stay nameless');assert.match(f.run('modalHTML'),/소문조차 듣지 못한 곳/);assert.doesNotMatch(f.run('modalHTML'),/여덟|\/8/);
 assert.match(f.run("buildPrompt('길을 걷는다','')"),new RegExp('\\[플레이어가 아직 모르는 이름\\][^\\n]*'+unknown));
 f.run('branchGrant(G.branchOpenIds[0])');
 assert.equal(f.run(far+".filter(p=>G.discovered.includes(p.id)).length"),4,'solving one brings a new rumor');assert.equal(f.run(far+".filter(p=>hoodOpen(p.id)&&!hasBranch(p.id)).length"),2);
});
await test('Saves already in act 3 keep every side region open',async f=>{
 await root(f);f.run("G.act=3;delete G.branchOpenIds;G.discovered=[];migrate()");
 assert.equal(f.run("MAP_PLACES.filter(p=>p.far&&hoodOpen(p.id)).length"),f.run("MAP_PLACES.filter(p=>p.far).length"));
});
console.log(`${count} lacuna-intel scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

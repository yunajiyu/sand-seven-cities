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
function setupAI(f){f.run(`
 const events=[],api=[];addLog=(type,text)=>events.push({type,text});
 function worldDraft(){return {truth:'ROOT_SECRET_853 보존 대상은 폐기된 학적 기록이다.',detail:'ROOT_DETAIL_793 기록을 옮겨 감춘 경위가 있다.',opening:'복도에 서면 교실 문 너머에서 목소리가 들린다.',roster:'안개 기숙사와 방송 시설의 빈 칸이 남아 있다.',rumors:[HOME_REGION,HOODS.east.n,HOODS.south.n,HOODS.north.n].map(region=>({region,belief:'이곳에는 지워진 기록에 관한 엇갈린 소문이 돈다.'})),chapters:['lacuna','c0','c1'].map((key,i)=>({key,role:'담당 부분 '+i,fragment:'PRIVATE_FRAGMENT_'+key,link:'LINK_'+key+' 기록에 같은 식별자가 남아 있다.',riddle:'이 공간에서 되풀이되는 현상이 있다.',lore:'PRIVATE_LORE_'+key+' 닫힌 교실의 사연과 교칙이 있다.'}))}}
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
(async()=>{
await test('New campaign is designed and reviewed before locking; three private links are absent from public context',async f=>{await root(f);assert.equal(f.run('campaignPlan().chapters.length'),3);assert.equal(f.run('api.length'),2);const prompt=f.run("buildPrompt('교실을 바라본다','')");for(const sentinel of ['ROOT_SECRET_853','PRIVATE_FRAGMENT_','LINK_lacuna','PRIVATE_LORE_'])assert.ok(!prompt.includes(sentinel),sentinel);assert.ok(!f.run('sysBase()').includes('일곱'));assert.match(f.run('sysBase()'),/주요 지역 세 곳/)});
await test('World design rejects broken plans and failed independent reviews without saving answers',async f=>{setupAI(f);f.run('let callsN=0;callAI=async()=>{callsN++;return JSON.stringify({truth:"broken"})}');assert.equal(await f.run('genCampaignWorld()'),false);assert.equal(f.run('callsN'),3);assert.equal(f.run('G.campaign.world.status'),'pending');assert.equal(f.run('G.secret||null'),null);await f.run('startIntroMystery()');assert.equal(f.run('G.site'),null);});
await test('Intro case place is the same in the design prompt, story context, goal text and buttons',async f=>{
  await root(f);
  const design=f.run("api[0].user");assert.match(design,/입문 사건은 본편과 독립된 작은 사건이며 장소는 항상 교내 「방과 후 특별교실동」/);assert.match(design,/중앙 캠퍼스 지구의 소문은 이 특별교실동 이야기로 쓴다/);
  const prompt=f.run("buildPrompt('교실을 바라본다','')");assert.match(prompt,/\[입문 사건 장소\] 입문 사건은 항상 교내 「방과 후 특별교실동」/);
  assert.match(f.run('campaignPublic().next'),/「방과 후 특별교실동」의 소문을 확인하러 가세요/);
  assert.match(f.run("fixedHTML()"),/소문의 장소로 가기 · 방과 후 특별교실동/);
  await f.run('startIntroMystery()');assert.equal(f.run('G.site.name'),'방과 후 특별교실동');
  f.run('G.campaign.introSolved=true');assert.doesNotMatch(f.run("buildPrompt('교실을 바라본다','')"),/\[입문 사건 장소\]/);
});
await test('The rumor trip never spoils the case type in player-facing labels',async f=>{
  await root(f);
  assert.doesNotMatch(f.run('fixedHTML()'),/입문 사건/);assert.doesNotMatch(f.run('campaignPublic().next+campaignPublic().stage'),/입문 사건/);
  assert.ok(f.run("gameActions().some(a=>/소문의 장소로 가기 — 방과 후 특별교실동/.test(a.label||a.name||a.text||''))")||f.run("JSON.stringify(gameActions()).includes('소문의 장소로 가기')"));
  await f.run('startIntroMystery()');assert.match(f.run('fixedHTML()'),/🧭 교내 소문/);assert.doesNotMatch(f.run('fixedHTML()'),/입문 사건/);
  assert.match(f.run("buildPrompt('교실을 바라본다','')"),/"입문 사건"이라는 게임 용어는 쓰지 말고 "소문"으로 표현한다/);
});
await test('Starting the rumor trip during class time carries no skipping, absence or demerit penalty',async f=>{
  await root(f);f.run('G.time="낮";G.dayStep=CLASS_SLOTS[0];G.district="classroom";G.demerit=0');
  const before=f.run('JSON.stringify({d:G.demerit,skip:G.cls?.skip||0,abs:G.cls?.absent||0,n:G.cls?.n||0})');
  await f.run('startIntroMystery()');assert.equal(f.run('G.loc'),'site');
  f.run('for(let i=0;i<14;i++)tick(false)');
  assert.equal(f.run('JSON.stringify({d:G.demerit,skip:G.cls?.skip||0,abs:G.cls?.absent||0,n:G.cls?.n||0})'),before);
  assert.equal(f.run('G.attendance?.missed||0'),0);
});
await test('Leaving for the rumor place during class asks first; declining changes nothing',async f=>{
  await root(f);f.run('G.time="낮";G.dayStep=CLASS_SLOTS[0];G.district="classroom";const asks=[];askConfirm=async m=>{asks.push(m);return false}');
  await f.run('startIntroMystery()');
  assert.equal(f.run('asks.length'),1);assert.match(f.run('asks[0]'),/1교시.*이번 수업을 듣지 못하고.*땡땡이·결석·벌점은 없습니다.*그래도 갈까요\?/s);
  assert.equal(f.run('G.loc'),'campus');assert.equal(f.run('G.site'),null);assert.equal(f.run('busy'),false);assert.equal(f.run('G.dayStep'),f.run('CLASS_SLOTS[0]'));
  f.run('askConfirm=async m=>{asks.push(m);return true}');await f.run('startIntroMystery()');
  assert.equal(f.run('asks.length'),2);assert.equal(f.run('G.loc'),'site');
});
await test('No confirmation outside class time (break, after school, weekend, excused day)',async f=>{
  await root(f);f.run('const asks=[];askConfirm=async m=>{asks.push(m);return true}');
  for(const setup of ['G.time="낮";G.dayStep=2','G.time="방과 후";G.dayStep=0','G.day=6;G.time="낮";G.dayStep=1','G.excuse={day:G.day};G.time="낮";G.dayStep=1']){
    f.run('G.loc="campus";G.site=null;G.campaign.introSite=null;G.district="classroom";'+setup);await f.run('startIntroMystery()');assert.equal(f.run('G.loc'),'site',setup);
  }
  assert.equal(f.run('asks.length'),0);
});
const unheard=async f=>{await root(f);f.run('G.campaign.introHeard=false;G.heardRumors=G.heardRumors.filter(r=>r!==HOME_REGION)')};
await test('Before the rumor is heard the place is not offered, named or revealed',async f=>{
  await unheard(f);
  assert.doesNotMatch(f.run('fixedHTML()'),/소문의 장소|특별교실동|입문/);assert.equal(f.run("gameActions().some(a=>a.id==='campaign:intro')"),false);
  const next=f.run('campaignPublic().next');assert.doesNotMatch(next,/특별교실동|입문/);assert.match(next,/귀를 기울여/);
  await f.run('startIntroMystery()');assert.equal(f.run('G.loc'),'campus');assert.equal(f.run('G.site'),null);
  const ctx=f.run("buildPrompt('교실을 바라본다','')");assert.match(ctx,/\[교내 소문 미청취\]/);assert.doesNotMatch(ctx,/\[입문 사건 장소\]/);
  assert.equal(f.run('G.lexicon.some(l=>l.name===HOME_REGION+"의 괴담")'),false);assert.equal(f.run('G.heardRumors.includes(HOME_REGION)'),false);
});
await test('Homeroom from day 2 tells the rumor once and then opens the trip',async f=>{
  await unheard(f);f.run('G.day=2;G.time="낮";G.dayStep=0;G.loc="campus";G.district="classroom";G.comp.met=true;syncSchedule();const told=[];aiTurn=async(a,e)=>{told.push(e)}');
  f.run('homeroom()');assert.equal(f.run('G.campaign.introHeard'),true);
  assert.match(f.run('told[0]'),/방과 후 특별교실동.*소문이 돈다.*특별교실동 이야기라는 것이 서술에서 분명히 드러나게/s);
  assert.equal(f.run('G.lexicon.some(l=>l.name===HOME_REGION+"의 괴담")'),true);
  f.run('G.dayStep=0;G.cls.done=[];homeroom()');assert.doesNotMatch(f.run('told[1]'),/소문이 돈다.*특별교실동/s);
  f.run('G.time="방과 후";G.dayStep=0');assert.match(f.run('fixedHTML()'),/소문의 장소로 가기 · 방과 후 특별교실동/);
  assert.equal(f.run("gameActions().some(a=>a.id==='campaign:intro')"),true);
});
await test('Day 1 homeroom does not tell it; the first break time does',async f=>{
  await unheard(f);f.run('G.day=2;G.time="낮";G.dayStep=2;G.loc="campus";G.district="classroom";syncSchedule();const told=[];aiTurn=async(a,e)=>{told.push(e)};homeroom=()=>{}');
  f.run('breakTime()');assert.equal(f.run('G.campaign.introHeard'),true);assert.match(f.run('told[0]'),/복도에서 아이들이 수군거린다.*방과 후 특별교실동/s);
});
await test('The canteen rumor also tells it first',async f=>{
  await unheard(f);f.run('G.time="낮";G.dayStep=4;G.loc="campus";G.district="canteen";syncSchedule();const told=[];aiTurn=async(a,e)=>{told.push(e)}');
  f.run('campusRumor(true)');assert.equal(f.run('G.campaign.introHeard'),true);assert.match(f.run('told[0]'),/교내에 도는 소문을 들려준다.*방과 후 특별교실동/s);
});
await test('Saves made before this rule keep working: started games count as heard, unstarted ones do not',async f=>{
  await root(f);f.run('delete G.campaign.introHeard;G.campaign.introSite=null;migrate()');assert.equal(f.run('G.campaign.introHeard'),false);
  f.run('delete G.campaign.introHeard;G.campaign.introSite={intro:true};migrate()');assert.equal(f.run('G.campaign.introHeard'),true);
  f.run('delete G.campaign.introHeard;G.campaign.introSite=null;G.campaign.introSolved=true;migrate()');assert.equal(f.run('G.campaign.introHeard'),true);
});
await test('Minor AI format slips in public room views are repaired instead of failing the case',async f=>{
  await intro(f);
  const fix=mut=>{f.run('globalThis.cdraft=caseDraft();'+mut);return f.obj('(()=>{cdraft=normalizeMysteryDraft(cdraft,G.site);return validateMystery(cdraft,G.site)})()')};
  assert.deepEqual(fix(''),[]);
  assert.deepEqual(fix('cdraft.room_views.forEach(v=>{v.room=G.site.rooms.find(r=>r.id===v.room).name})'),[]);
  assert.deepEqual(fix("cdraft.room_views.forEach(v=>{v.text='가'.repeat(700)+'다. 마지막 문장'})"),[]);
  assert.ok(f.run('cdraft.room_views.every(v=>v.text.length<=400)'));
  assert.deepEqual(fix('cdraft.room_views.forEach(v=>{v.room="  "+v.room+" "})'),[]);
});
await test('Remaining room-view failures say exactly what is wrong',async f=>{
  await intro(f);
  const why=mut=>{f.run('globalThis.cdraft=caseDraft();'+mut);return f.obj('(()=>{cdraft=normalizeMysteryDraft(cdraft,G.site);return validateMystery(cdraft,G.site)})()').join('|')};
  assert.match(why('cdraft.room_views.pop()'),/공개 공간 묘사\(공간 3개 중 2개만 있음\)/);
  assert.match(why('cdraft.room_views[0].room="없는방ZZ"'),/공개 공간 묘사\(room에 공간 ID가 아닌 값이 있음\)/);
  assert.match(why("cdraft.room_views[0].text='응'"),/공개 공간 묘사\(각 text는 4~400자여야 함\)/);
  assert.match(why('cdraft.room_views=null'),/room_views가 목록이 아님/);
});
await test('A draft with room names and over-long views still becomes a sealed case end to end',async f=>{
  await root(f);
  f.run("const orig=callAI;callAI=async(sys,user)=>{if(sys.includes('비공개 미스터리 설계자')){const c=caseDraft();c.room_views.forEach(v=>{v.room=G.site.rooms.find(r=>r.id===v.room).name;v.text='가'.repeat(700)+'다.'});return JSON.stringify(c)}return orig(sys,user)}");
  await f.run('startIntroMystery()');assert.equal(f.run('G.site.mystery.status'),'ready');assert.ok(f.run('!!mysteryPlan(G.site)'));
});
await test('The design prompt spells out the room-view rules',async f=>{
  await intro(f);assert.match(f.run('mysteryPrompt(G.site)'),/room_views는 위 공간 목록의 모든 공간마다 정확히 하나씩 쓰고 room에는 공간 ID\(r1 등\)를 그대로 넣으며 text는 400자 이하/);
});
await test('Room IDs in case text are shown as room names with correct particles',async f=>{
  await intro(f);
  assert.equal(f.run("plainRoomIds('r2의 셔터가 r3를 울리고 r1은 조용하다. r9는 없다. er2 그대로',G.site)"),'비어 있는 준비실의 셔터가 방송 장비실을 울리고 특별교실동 입구는 조용하다. r9는 없다. er2 그대로');
  assert.equal(f.run("plainRoomIds('r3로 간다, r1로 간다',G.site)"),'방송 장비실로 간다, 특별교실동 입구로 간다');
});
await test('New and already sealed cases never show raw room IDs in plain text',async f=>{
  await root(f);
  f.run("const orig=callAI;callAI=async(sys,user)=>{if(sys.includes('비공개 미스터리 설계자')){const c=caseDraft();c.deduction.hypotheses[0].text='r2의 셔터가 흔들려 r3를 울린다';c.evidence[0].text='r1 게시판에 r2와 r3가 이어진다고 적혀 있다';c.verification.action='r2의 셔터를 고정하고 r3를 확인한다';return JSON.stringify(c)}return orig(sys,user)}");
  await f.run('startIntroMystery()');
  const plan=f.obj('mysteryPlan(G.site)'),all=JSON.stringify([plan.deduction.hypotheses.map(h=>h.text),plan.evidence.map(e=>e.text+e.meaning),plan.verification.action]);
  assert.doesNotMatch(all,/(^|[^A-Za-z0-9])r\d/);assert.match(plan.deduction.hypotheses[0].text,/준비실의 셔터가 흔들려 방송 장비실을 울린다/);
  // 예전에 봉인된 사건: 봉인 원문은 그대로 두고 화면용 읽기에서만 바꾼다
  f.run("const o=JSON.parse(G.site.mystery.sealed);o.evidence[0].text='r2의 셔터가 느슨하다';G.site.mystery.sealed=JSON.stringify(o);G.site.mystery.hash=mysteryHash(G.site.mystery.sealed)");
  assert.equal(f.run('mysteryPlan(G.site).evidence[0].text'),'비어 있는 준비실의 셔터가 느슨하다');assert.match(f.run('G.site.mystery.sealed'),/r2의 셔터가 느슨하다/);
});
await test('Deduction dialog and failure messages use plain wording',async f=>{
  await intro(f);f.run('G.site.mystery.state.found=mysteryPlan(G.site).evidence.map(e=>e.id)');
  const html=f.run('mysteryDeductionHTML(G.site)');
  for(const ok of ['하나 고르고','이유로 삼을 사실','이 추리로 확인해 보기'])assert.ok(html.includes(ok),ok);
  assert.ok(!html.includes('틀려도 괜찮습니다'));
  for(const bad of ['정답과 증거는 바뀌지 않으며','연결할 핵심 증거','선택한 가설과 근거로 검증'])assert.ok(!html.includes(bad),bad);
  for(const ok of ['아직 앞뒤가 맞지 않습니다','해 봤지만 생각대로 되지 않는다','지난번 추리는 앞뒤가 맞지 않았습니다'])assert.ok(script.includes(ok),ok);
  for(const bad of ['가설 또는 증거 연결이 충분하지 않습니다','핵심 증거의 기여를 다시 비교해 주세요'])assert.ok(!script.includes(bad),bad);
});
await test('The design prompt asks for short, plain high-school wording and no room IDs',async f=>{
  await intro(f);const pr=f.run('mysteryPrompt(G.site)');
  assert.match(pr,/\[문체\] 읽는 사람은 고등학생이다\. 전문용어·한자어·학술 말투/);assert.match(pr,/r1·r2 같은 ID는 어떤 문장에도 쓰지 않는다/);
});
await test('Failed world preparation tells the player the cause in plain words',async f=>{
  setupAI(f);f.run('callAI=async()=>{throw new Error("NO_KEY")}');assert.equal(await f.run('genCampaignWorld()'),false);
  assert.match(f.run('events.filter(e=>e.type==="sys").pop().text'),/본편을 준비하지 못했습니다 \(AI 키가 설정되어 있지 않습니다\)/);
  assert.doesNotMatch(f.run('events.filter(e=>e.type==="sys").pop().text'),/비공개|검증하지 못했습니다/);
});
await test('A truncated world answer is reported as a cut-off response',async f=>{
  setupAI(f);f.run('callAI=async()=>"{\\"truth\\":\\"잘린"');assert.equal(await f.run('genCampaignWorld()'),false);
  assert.match(f.run('events.filter(e=>e.type==="sys").pop().text'),/JSON 형식이 아니거나 중간에 잘림/);
});
await test('A case that cannot be prepared adds no out-of-game narration and explains why',async f=>{
  await root(f);f.run('events.length=0;callAI=async()=>"not json"');await f.run('startIntroMystery()');
  assert.equal(f.run('events.filter(e=>e.type==="scene").length'),0);
  assert.match(f.run('events.filter(e=>e.type==="sys").pop().text'),/사건을 준비하지 못했습니다 \(응답이 JSON 형식이 아니거나 중간에 잘림\)\. 「사건 준비 재시도」/);
  assert.doesNotMatch(f.run('events.map(e=>e.text).join("|")'),/기다린다|임의로 만들지/);
});
await test('A world design that keeps failing review shows only a generic notice, never the reviewer issues',async f=>{setupAI(f);f.run('const goodAI=callAI;callAI=async(sys,user)=>sys.includes("본편의 독립 검토자")?JSON.stringify({valid:false,issues:["PRIVATE_REVIEW_ROOT_331 정답은 학적 기록"]}):goodAI(sys,user)');assert.equal(await f.run('genCampaignWorld()'),false);const log=JSON.stringify(f.obj('events'));assert.ok(log.includes('검토 불합격'));assert.ok(!log.includes('PRIVATE_REVIEW_ROOT_331'));assert.ok(!log.includes('ROOT_SECRET_853'))});
await test('Review failure retries world generation; fixed world and local mysteries survive reload without new AI calls',async f=>{setupAI(f);f.run('const goodAI=callAI;let reviews=0;callAI=async(sys,user)=>sys.includes("본편의 독립 검토자")&&++reviews===1?JSON.stringify({valid:false,issues:["PRIVATE_REVIEW_ROOT"]}):goodAI(sys,user)');assert.equal(await f.run('genCampaignWorld()'),true);assert.equal(f.run('reviews'),2);await f.run('startIntroMystery()');const sealed=f.run('G.site.mystery.sealed'),world=f.run('G.campaign.world.sealed');f.run('G=JSON.parse(JSON.stringify(G));migrate();const apiBefore=api.length');await f.run('genCampaignWorld()');await f.run('ensureMystery()');assert.equal(f.run('G.campaign.world.sealed'),world);assert.equal(f.run('G.site.mystery.sealed'),sealed);assert.equal(f.run('apiBefore'),f.run('api.length'));assert.equal(f.run('G.fragments'),0)});
await test('World generation cannot overwrite a replacement game',async f=>{setupAI(f);f.run('let finish;callAI=()=>new Promise(resolve=>finish=resolve);const rootCandidate=worldDraft()');const job=f.run('genCampaignWorld()');f.run('seed("campus");finish(JSON.stringify(rootCandidate))');await job;assert.equal(f.run('G.campaign||null'),null);assert.equal(f.run('G.secret||null'),null)});
await test('Tampered fixed world is not regenerated or used to begin a new case',async f=>{await root(f);f.run('G.campaign.world.sealed+=" ";const apiBefore=api.length');assert.equal(await f.run('genCampaignWorld()'),false);assert.equal(f.run('apiBefore'),f.run('api.length'));await f.run('startIntroMystery()');assert.equal(f.run('G.site'),null)});
await test('Intro has exactly three reachable rooms and facts, no resource drain or darkness block, and survives leaving',async f=>{await intro(f);assert.equal(f.run('G.site.rooms.length'),3);assert.equal(f.run("mysteryPlan().evidence.filter(e=>e.role==='core').length"),3);f.run('G.battery=0;G.textUse=0;const resourcesBefore=JSON.stringify({hp:G.hp,calm:G.calm,torch:G.torch,battery:G.battery});const introId=siteIdentity(G.site)');await collect(f);assert.equal(f.run('G.evidence.length'),4);assert.equal(f.run('resourcesBefore'),f.run('JSON.stringify({hp:G.hp,calm:G.calm,torch:G.torch,battery:G.battery})'));f.run('leaveIntroMystery()');assert.equal(f.run('G.loc'),'campus');assert.equal(f.run('G.district'),'music');await f.run('startIntroMystery()');assert.equal(f.run('siteIdentity(G.site)'),f.run('introId'));assert.equal(f.run('G.site.mystery.state.found.length'),4)});
await test('Suspected causes are shown from the start as rumors and never include answer metadata in journal or public prompt',async f=>{await intro(f);assert.ok(f.run('mysteryPanel()').includes('기록된 음원'));assert.match(f.run('mysteryPanel()'),/의심되는 원인/);await collect(f);const ui=f.run('mysteryDeductionHTML()');assert.match(ui,/기록된 음원이/);assert.ok(!ui.includes('answer_id'));assert.ok(!ui.includes('CASE_SECRET_'));const prompt=f.run("buildPrompt('단서를 비교한다','')");assert.ok(!prompt.includes('CASE_SECRET_'));assert.ok(!prompt.includes('ROOT_SECRET_'));f.run('verifyMystery()');assert.match(f.run('modalHTML'),/mysterySupport/);assert.equal(f.run('G.site.mystery.state.solved'),false)});
await test('Wrong candidate and insufficient evidence never lock deduction; retries are unlimited and reveal no truth',async f=>{await intro(f);await collect(f);const sealed=f.run('G.site.mystery.sealed');await proof(f,'h1');assert.equal(f.run('G.site.mystery.state.solved'),false);await proof(f,'h2',['e1','e2']);assert.equal(f.run('G.site.mystery.state.solved'),false);await proof(f,'h3');assert.equal(f.run('G.site.mystery.state.solved'),false);assert.equal(f.run('G.site.mystery.state.attempts.length'),3);assert.equal(f.run('canVerifyMystery()'),true);assert.equal(f.run("mysteryRoomActions().some(a=>a.kind==='repeat')"),false,'no repeat look needed');assert.equal(f.run('G.site.mystery.sealed'),sealed);assert.ok(!JSON.stringify(f.obj('events')).includes('CASE_SECRET_'));assert.ok(!JSON.stringify(f.obj('events')).includes('예약된 기록'));await proof(f);assert.equal(f.run('G.site.mystery.state.solved'),true);assert.equal(f.run('G.campaign.introSolved'),true);assert.equal(f.run('G.actDone'),true);assert.equal(f.run('G.fragments'),0)});
await test('Unknown, unrevealed, too few and duplicate proof IDs cannot consume time or solve',async f=>{await intro(f);await collect(f);const before=f.run('JSON.stringify({day:G.day,time:G.time,steps:G.steps})');for(const [g,ids] of [['h9',['e2','e3']],['h2',['e2']],['h2',['e2','e2']],['h2',['e2','future']]])await proof(f,g,ids);assert.equal(f.run('JSON.stringify({day:G.day,time:G.time,steps:G.steps})'),before);assert.equal(f.run('G.site.mystery.state.solved'),false)});
await test('Old automatic verification flag cannot bypass a new deduction; forged proof cannot solve before collecting evidence',async f=>{await intro(f);await collect(f);f.run("pend('',{mysteryVerify:siteIdentity(G.site)})");await f.run("aiTurn('확보한 근거로 원인을 검증한다')");assert.equal(f.run('G.site.mystery.state.solved'),false);f.run('G.site.mystery.state.found=[]');await proof(f);assert.equal(f.run('G.site.mystery.state.solved'),false)});
await test('New case validation rejects missing deduction, duplicate candidates and wrong main connection',async f=>{await intro(f);f.run('let p=caseDraft()');assert.equal(f.run('validateMystery(p,G.site).length'),0);f.run('delete p.deduction');assert.ok(f.run('validateMystery(p,G.site).length'));f.run('p=caseDraft();p.deduction.hypotheses[1].id="h1"');assert.ok(f.run('validateMystery(p,G.site).length'));f.run('p=caseDraft();G.site.big=true;G.site.key="lacuna";p.main_link="invented_connection"');assert.ok(f.run('validateMystery(p,G.site).length'))});
await test('Fragments and direct main calls cannot skip intro or a main case',async f=>{await root(f);f.run('G.fragments=8;checkState()');assert.equal(f.run('G.actDone||false'),false);await f.run('startBig("lacuna",true)');assert.equal(f.run('G.act'),1);f.run('G.site={big:true,key:"lacuna",rooms:[]};decodeRoster("진행 우회","")');assert.equal(f.run('G.act'),1);assert.equal(f.run('G.wards||null'),null);f.run('G.site={big:true,key:"c0",rooms:[]};wardFound("진행 우회","")');assert.equal(f.run('G.act'),1)});
await test('Full compact route solves intro and three main cases, publishes only earned links and reaches fixed ending',async f=>{
 await intro(f);await collect(f);await proof(f);f.run('leaveIntroMystery();G.act=2;G.torch=5;G.loc="site"');
 for(const key of ['lacuna','c0','c1']){
  f.run('G.loc="site"');await f.run('genBigZone(bigSpec('+JSON.stringify(key)+'))');assert.equal(f.run('G.site.rooms.length'),4);assert.equal(f.run('G.site.mystery.status'),'ready');assert.equal(f.run('G.campaign.links['+JSON.stringify(key)+']||null'),null);await collect(f);await proof(f);assert.equal(f.run('G.site.mystery.state.solved'),true);assert.equal(f.run('G.campaign.links['+JSON.stringify(key)+'].text'),'LINK_'+key+' 기록에 같은 식별자가 남아 있다.');f.run('G.site.cur=G.site.rooms.find(r=>r.heart).id');await f.run('openHeart()');await new Promise(r=>setImmediate(r));
  if(key==='lacuna'){assert.equal(f.run('G.act'),3);assert.equal(f.run('G.wards.length'),2);assert.equal(f.run('mainWardCount()'),2);assert.equal(f.run('campaignPublic().links.length'),1);assert.ok(!f.run('campaignPanel()').includes('LINK_c0'));assert.ok(!f.run("buildPrompt('검증 기록을 정리한다','')").includes('PRIVATE_LORE_c0'))}
 }
 assert.equal(f.run('G.act'),4);assert.equal(f.run('campaignPublic().links.length'),3);f.run('openEnding()');assert.match(f.run('modalHTML'),/ROOT_SECRET_853/);assert.match(f.run('modalHTML'),/LINK_lacuna/);assert.equal(f.run('G.wards.filter(c=>c.found).length'),2);
});
await test('Legacy seven-region saves retain their scale and old fixed answer, and new local cases can use deduction',f=>{f.run('seed();G.act=3;G.wards=WARD_ORDER.map((terrain,i)=>({id:"c"+i,terrain,found:i===0}));G._deductionVersion=1;const before=JSON.stringify(G.wards);migrate()');assert.equal(f.run('compactCampaign()'),false);assert.equal(f.run('mainWardCount()'),6);assert.equal(f.run('mainWardOrder().length'),6);assert.equal(f.run('JSON.stringify(G.wards)'),f.run('before'))});
await test('Intro clock passes class and roll-call boundaries without absence or demerits and offers no shelter detour',async f=>{await intro(f);f.run('G.time="낮";G.dayStep=CLASS_SLOTS[0];const beforeNotes=JSON.stringify({hp:G.hp,calm:G.calm,torch:G.torch,battery:G.battery,demerit:G.demerit});for(let i=0;i<35;i++)tick(false)');assert.equal(f.run('G.cls?.absent||0'),0);assert.equal(f.run('G.attendance?.totalAbsent||0'),0);assert.equal(f.run('beforeNotes'),f.run('JSON.stringify({hp:G.hp,calm:G.calm,torch:G.torch,battery:G.battery,demerit:G.demerit})'));assert.equal(f.run('gameActions().some(a=>a.id==="shelter:setup")'),false);f.run('shelterHere()');assert.equal(f.run('G.loc'),'site')});
await test('Current goal, fixed controls and guide render for compact game and stale deduction dialogs cannot submit',async f=>{await intro(f);await collect(f);f.run('const fixed=fixedHTML();const side=leftHTML();openGuide()');assert.match(f.run('fixed'),/교내로 돌아가기/);assert.match(f.run('fixed'),/🧩 추리 제출</);assert.match(f.run('side'),/선택 수집/);assert.match(f.run('modalHTML'),/총 3곳/);const before=f.run('JSON.stringify(G.site.mystery.state)');f.run('submitMysteryDeduction("old-zone-id")');assert.equal(f.run('JSON.stringify(G.site.mystery.state)'),before)});
console.log(`${count} campaign-overhaul scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

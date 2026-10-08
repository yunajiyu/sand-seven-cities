// Run: node tests/hanbit-ui-simplify.test.cjs
// 화면 간소화: 타이틀 버튼, 상태 줄, 캐릭터 패널, 탭, 설정 통합, 가이드 요약
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
(async()=>{
await test('Title keeps four buttons and settings hold screen, sound, AI and save management',async f=>{
 const title=html.slice(html.indexOf('<section id="title">'),html.indexOf('</section>',html.indexOf('<section id="title">')));
 assert.equal((title.match(/<button/g)||[]).length,4);assert.match(title,/⚙ 설정/);assert.doesNotMatch(title,/가져오기 이전|저장 파일 불러오기|AI 설정/);
 await root(f);f.run('openPrefs()');const m=f.run('modalHTML');
 for(const t of ['AI 연결 설정 열기','토큰 사용량','서술 분량','저장 파일 불러오기'])assert.ok(m.includes(t),t);
});
await test('Status bar uses short values and the character panel shows no structure counts',async f=>{
 await root(f);f.run("G.loc='campus'");
 const side=f.run('leftHTML()');assert.doesNotMatch(side,/본편 연결|현재 목표|\/3 보기/);assert.match(side,/🧭 조사 기록/);assert.match(side,/<h4>상태<\/h4>/);
 assert.doesNotMatch(side,/철제 부품/,'empty materials are hidden');f.run('G.mat.metal=2');assert.match(f.run('leftHTML()'),/철제 부품/);
 assert.doesNotMatch(f.run('rightHTML()'),/서술 분량|토큰 사용량|어둡게|개 중 .*개 표시/);
});
await test('Dates and outings tabs appear only when someone can join',async f=>{
 await root(f);f.run("G.loc='campus';G.comp.met=false;G.rel={};gameTab='play';const nav={innerHTML:''};document.getElementById=id=>id==='gameNav'?nav:{style:{},classList:{toggle(){},add(){},remove(){},contains(){return false}},querySelectorAll(){return []}};renderSocialTabs()");
 assert.doesNotMatch(f.run('nav.innerHTML'),/데이트|외출/);
 f.run("getRel('서연');renderSocialTabs()");assert.match(f.run('nav.innerHTML'),/외출/);assert.doesNotMatch(f.run('nav.innerHTML'),/데이트/);
});
await test('Default opening speaks to the player as 당신, and guide starts with a short summary',async f=>{
 assert.doesNotMatch(html,/너, \$\{G\.char\.name\}/);assert.match(html,/당신은 학기 중간에 2학년 7반으로 전학 온/);
 await root(f);f.run('openGuide()');const g=f.run('modalHTML');assert.ok(g.indexOf('처음 하는 분께')<g.indexOf('자세한 규칙'));assert.match(g,/<details[^>]*><summary>📚 자세한 규칙 보기<\/summary>/);
});
console.log(`${count} ui-simplify scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

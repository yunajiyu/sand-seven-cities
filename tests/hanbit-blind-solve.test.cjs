// Run: node tests/hanbit-blind-solve.test.cjs
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
    maybeIncoming=()=>{};closeModal=()=>{};apptRefresh=()=>{};renderChat=()=>{};askConfirm=async()=>true;const liveAiTurn=aiTurn;const liveBlind=blindSolveIssues;blindSolveIssues=async()=>[];aiTurn=async(...args)=>calls.push(args);
    chip=s=>{chipHTML=s};hideChip=()=>{};modal=(title,s)=>{modalHTML=s};
    function seed(loc='site'){
      G={v:1,_phoneLightVersion:1,_fearBalanceVersion:1,_relVersion:2,_clockVersion:2,_affLv:2,char:{name:'테스트',age:17,stats:{str:1,wis:1,cha:1,sur:1},traits:[]},day:1,time:'방과 후',dayStep:0,loc,steps:0,hp:12,maxhp:12,calm:10,battery:6,torch:0,cash:100,items:[],mat:{metal:0,ply:0,wire:0,keepsake:0},act:1,fragments:0,sitesDone:0,district:'music',comp:{met:false,joined:false,aff:10},rel:{},chronicle:[],site:loc==='site'?{name:'피아노 괴담 구역',pos:{x:225,y:180},depth:1,cur:'r1',rooms:[{id:'r1',name:'입구',lv:0,danger:0,visited:true,exits:['r2','r3']},{id:'r2',name:'피아노실',lv:1,danger:0,visited:true,exits:['r1']},{id:'r3',name:'방송실',lv:1,danger:0,visited:true,exits:['r1']},{id:'r4',name:'창고',lv:2,danger:0,visited:true,exits:['r3']}]}:null};
      busy=false;PENDING={note:'',flags:{}};migrate();syncSchedule();Math.random=()=>0.99;calls.length=notices.length=0;chipHTML=modalHTML='';
    }
    seed('campus');G.comp.met=true;getRel('유민');getRel('서연');G.comp.spot='market';G.comp.spotKey=yKey();
  `);
  return {run,obj,input:el};
}
const candidate={question:'빈 방에서 소리가 반복되는 이유는?',opening:'낡은 입구의 공기는 차갑고 조용하다.',truth:'PRIVATE_TRUTH_735 비공개 원인은 예약 재생 장치다.',conclusion:'PRIVATE_CONCLUSION_912 예약 장치가 다른 방으로 녹음을 전송했다.',room_views:['r1','r2','r3','r4'].map(room=>({room,text:'빛이 닿은 바닥과 오래된 문틀이 보인다.'})),
 evidence:[
  {id:'e1',role:'core',room:'r1',action:'게시판에 붙은 종이를 한 장씩 넘겨 본다',text:'종이에 03:15라는 시간이 세 번 적혀 있다.',meaning:'반복되는 시간이 조사 기준이 된다.',leads:['e2','d1']},
  {id:'e2',role:'core',room:'r2',action:'피아노 옆 녹음기를 끝까지 틀어 본다',text:'음원이 매번 정확히 같은 구간에서 끊긴다.',meaning:'연주보다 동일한 기록의 반복을 뒷받침한다.',leads:['e3']},
  {id:'e3',role:'core',room:'r3',action:'책상 밑으로 이어진 선을 따라가 본다',text:'두 방 사이를 연결한 선에 같은 번호가 붙어 있다.',meaning:'소리가 이동하는 경로를 추적할 근거다.',leads:[]},
  {id:'d1',role:'decoy',room:'r2',action:'건반 위 먼지를 손가락으로 쓸어 본다',text:'건반 위 먼지에 누가 누른 듯한 손가락 자국이 있다.',meaning:'누군가 밤에 직접 연주했을 수도 있다.',points_to:'h1',refuted_by:'e2',leads:[]}],
 start_leads:['e1'],dead_ends:[{room:'r3',action:'창문 틈에 귀를 대고 바깥 소리를 듣는다'}],
 verification:{room:'r3',action:'번호가 같은 선의 전송을 끊고 소리가 멎는지 확인한다',requires:['e1','e2','e3'],result:'PRIVATE_RESULT_624 전송을 끊자 반복되던 소리가 함께 멎었다.'},
 deduction:{hypotheses:[{id:'h1',text:'누군가 밤마다 몰래 피아노를 친다'},{id:'h2',text:'녹음된 소리가 정해진 시간에 다른 방으로 보내진다'},{id:'h3',text:'창문 틈 바람이 울려 소리가 난다'}],answer_id:'h2',supports:['e2','e3'],explanation:'PRIVATE_EXPLANATION_208 같은 구간 반복과 같은 번호의 선이 전송을 입증한다.'}};

// 눈가림 풀이자 흉내: 공개 기록 묶음만 읽고 답한다. mode를 바꿔 여러 실패 유형을 만든다.
const ANSWER=candidate.deduction.hypotheses.find(h=>h.id===candidate.deduction.answer_id).text;
const LURE=candidate.deduction.hypotheses.find(h=>h.id==='h1').text;
const SUPPORT=candidate.deduction.supports.map(id=>candidate.evidence.find(e=>e.id===id).text);
const DECOY=candidate.evidence.find(e=>e.role==='decoy').text;
const PRIVATE=[candidate.truth,candidate.conclusion,candidate.verification.result,candidate.deduction.explanation];
function install(f,cfg={}){
 f.run(`seed('site');G._deductionVersion=1;blindSolveIssues=liveBlind;const events=[],designs=[],solves=[];addLog=(type,text)=>events.push({type,text});`);
 f.ctx.__solver=(user)=>{
  const pack=JSON.parse(user.slice(user.indexOf('[공개 기록]')+7,user.indexOf('[/공개 기록]')));
  const lab=t=>pack.원인_후보.find(h=>h.내용===t).번호, ev=pack.확인한_단서||[], num=t=>ev.find(e=>e.내용===t)?.번호;
  const mode=!pack.확인한_단서?'guess':SUPPORT.every(t=>num(t))?'full':'necessity';
  const r=(cfg[mode]||{
    full:{answer:'ok',supports:'support',confidence:5},
    guess:{answer:'ok',confidence:2},
    necessity:{answer:'lure',confidence:3}}[mode]);
  if(r==='garbage') return '정답은 아마 두 번째';
  const supports=r.supports==='support'?SUPPORT.map(num):r.supports==='decoy'?[num(SUPPORT[0]),num(DECOY)]:[];
  return JSON.stringify({reason:'공개 기록 비교',answer:lab(r.answer==='ok'?ANSWER:LURE),supports,confidence:r.confidence});
 };
 f.run(`callAI=async(sys,user)=>{if(sys.includes('눈가림 풀이자')){solves.push(user);return __solver(user)}if(sys.includes('독립 검토자'))return JSON.stringify({valid:true,issues:[]});designs.push(user);return JSON.stringify(${JSON.stringify(candidate)})};`);
}
let count=0;async function test(name,fn){const f=fixture();f.ctx=f.run('this');await fn(f);count++;console.log('PASS',name)}
const noLeak=f=>{const log=JSON.stringify(f.obj('events'));for(const v of PRIVATE)assert.ok(!log.includes(v),'log leak');assert.ok(!log.includes(ANSWER));};
(async()=>{
await test('A logically sound case passes 2 full solves, the guess test and the necessity test, then locks',async f=>{install(f);await f.run('ensureMystery()');assert.equal(f.run('G.site.mystery.status'),'ready');assert.equal(f.run('solves.length'),4);assert.equal(f.run('designs.length'),1);assert.deepEqual(f.obj('G.site.mystery.audit'),{blind:2,retries:0});assert.ok(f.obj('events').some(e=>e.text.includes('추리 검증 통과')));noLeak(f)});
await test('Solver packs carry only public records: no answer, ids, roles, truth or verification result',async f=>{install(f);await f.run('ensureMystery()');for(const u of f.obj('solves')){for(const v of [...PRIVATE,'answer_id','"decoy"','"core"','"h2"','"e2"','"d1"','points_to','refuted_by'])assert.ok(!u.includes(v),'solver sees '+v);assert.ok(u.includes(ANSWER)&&u.includes(LURE))}
 const s=f.obj('solves');assert.equal(s.filter(u=>!u.includes('확인한_단서')).length,1,'one guess test without evidence');const nec=s.filter(u=>u.includes('확인한_단서')&&!SUPPORT.every(t=>u.includes(t)));assert.equal(nec.length,1,'one necessity test');assert.ok(nec[0].includes(DECOY));assert.equal(s.filter(u=>SUPPORT.every(t=>u.includes(t))&&u.includes(DECOY)).length,2,'two full solves include the decoy')});
await test('If the solver falls for the decoy, the case is redesigned and finally left unprepared — without leaking content',async f=>{install(f,{full:{answer:'lure',supports:'none',confidence:4}});await f.run('ensureMystery()');assert.equal(f.run('G.site.mystery.status'),'pending');assert.equal(f.run('designs.length'),3);assert.ok(f.run('designs[1]').includes('함정 증거의 오답 후보를 골랐다'));const log=JSON.stringify(f.obj('events'));assert.ok(log.includes('추리 검증 불합격'));noLeak(f)});
await test('Correct answer reached with low confidence is rejected',async f=>{install(f,{full:{answer:'ok',supports:'support',confidence:2}});await f.run('ensureMystery()');assert.equal(f.run('G.site.mystery.status'),'pending');assert.ok(f.run('designs[1]').includes('확신이 낮다'))});
await test('Guess test: an answer guessable from candidate wording alone is rejected',async f=>{install(f,{guess:{answer:'ok',confidence:5}});await f.run('ensureMystery()');assert.equal(f.run('G.site.mystery.status'),'pending');assert.ok(f.run('designs[1]').includes('찍기 시험'))});
await test('Necessity test: an answer reachable without the supporting evidence is rejected',async f=>{install(f,{necessity:{answer:'ok',confidence:5}});await f.run('ensureMystery()');assert.equal(f.run('G.site.mystery.status'),'pending');assert.ok(f.run('designs[1]').includes('필요성 시험'))});
await test('Decoy evidence read as support for the answer is rejected',async f=>{install(f,{full:{answer:'ok',supports:'decoy',confidence:5}});await f.run('ensureMystery()');assert.equal(f.run('G.site.mystery.status'),'pending');assert.ok(f.run('designs[1]').includes('함정 증거가 정답의 근거처럼'))});
await test('Unreadable solver replies are retried once, then count as a failed check (never as a pass)',async f=>{install(f,{full:'garbage'});await f.run('ensureMystery()');assert.equal(f.run('G.site.mystery.status'),'pending');assert.ok(f.run('designs[1]').includes('응답 오류'));assert.ok(f.run('solves.length')>=3*(2*2+2))});
await test('A failed first design followed by a sound redesign locks the redesign and records the retry count',async f=>{install(f);f.run(`{let n=0;const real=__solver;__solver=u=>{n++;return n<=4&&u.includes('확인한_단서')&&${JSON.stringify(SUPPORT)}.every(t=>u.includes(t))?JSON.stringify({answer:JSON.parse(u.slice(u.indexOf('[공개 기록]')+7,u.indexOf('[/공개 기록]'))).원인_후보.find(h=>h.내용===${JSON.stringify(LURE)}).번호,supports:[],confidence:4}):real(u)}}`);await f.run('ensureMystery()');assert.equal(f.run('G.site.mystery.status'),'ready');assert.equal(f.run('designs.length'),2);assert.deepEqual(f.obj('G.site.mystery.audit'),{blind:2,retries:1})});
await test('Cases without a deduction step (legacy saves) skip the blind check',async f=>{install(f);const issues=await f.run('blindSolveIssues({question:"q",evidence:[]})');assert.deepEqual(JSON.parse(JSON.stringify(issues)),[]);assert.equal(f.run('solves.length'),0)});
console.log(`${count} tests passed`);
})().catch(e=>{console.error(e);process.exit(1)});

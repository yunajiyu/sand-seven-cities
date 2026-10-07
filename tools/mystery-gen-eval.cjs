#!/usr/bin/env node
// 개발 전용: 실제 AI 키로 입문 사건(v2)을 N번 생성해 통계만 출력한다.
// 게임과 같은 경로(ensureMystery: 생성 → 정규화 → v2 검증 → AI 검토)를 그대로 탄다.
// 사건 내용(질문·진상·증거·가설·정답·검토 의견)은 화면·파일·로그 어디에도 남기지 않고, 통과한 사건도 바로 버린다.
//
// 사용법:
//   HANBIT_PROVIDER=anthropic HANBIT_API_KEY=... node tools/mystery-gen-eval.cjs [--n 10] [--no-judge]
// 환경 변수:
//   HANBIT_PROVIDER   anthropic | gemini | openai | openrouter | deepseek | custom (기본 gemini)
//   HANBIT_API_KEY    해당 제공자의 API 키 (필수)
//   HANBIT_MODEL      생성·검토에 쓸 모델 (기본: 게임의 역할별 기본값)
//   HANBIT_BASE_URL   provider=custom일 때의 OpenAI 호환 주소
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');

const argv=process.argv.slice(2), opt=k=>{const i=argv.indexOf(k);return i>=0?argv[i+1]:undefined};
const N=Math.max(1,Math.min(100,parseInt(opt('--n')||'10',10)||10)), JUDGE=!argv.includes('--no-judge');
const provider=process.env.HANBIT_PROVIDER||'gemini', key=process.env.HANBIT_API_KEY, model=process.env.HANBIT_MODEL;
if(!key){console.error('HANBIT_API_KEY가 없습니다. 사용법은 파일 머리말을 보세요.');process.exit(2)}

const html=fs.readFileSync(path.join(__dirname,'../hanbit.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const role=model?{provider,model}:{provider};
const settings={provider,keys:{[provider]:key},baseUrl:process.env.HANBIT_BASE_URL||'',roles:{site:role,world:role}};
const quiet={log(){},warn(){},error(){},info(){},debug(){}};   // 게임 쪽 출력은 모두 버린다(내용 누설 방지)
const el={style:{},dataset:{},value:'',innerHTML:'',insertAdjacentHTML(){},remove(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},querySelectorAll(){return []},setAttribute(){},getAttribute(){return null}};
const ctx=vm.createContext({console:quiet,setTimeout,clearTimeout,setInterval(){return 0},clearInterval(){},fetch,AbortSignal,AbortController,
  localStorage:{getItem(k){return k==='sand7_settings'?JSON.stringify(settings):null},setItem(){},removeItem(){}},
  document:{getElementById(){return el},querySelector(){return el},querySelectorAll(){return []},addEventListener(){},documentElement:el},
  window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math});
vm.runInContext(script.slice(0,script.indexOf('/* 시작: 화면 설정 적용')),ctx);
const run=s=>vm.runInContext(s,ctx);
run(`addLog=()=>{};toast=()=>{};render=()=>{};renderSides=()=>{};save=()=>{};sfx=()=>{};maybeIncoming=()=>{};closeModal=()=>{};modal=()=>{};`);

// 호출 관찰: 내용은 보지 않고 종류·길이·형식 판정만 센다.
const stat={design:0,review:0,lengths:[],cats:{}};
const cat=c=>{stat.cats[c]=(stat.cats[c]||0)+1};
ctx.__observe=async(sys,user,max,roleName,o,real)=>{
  const designer=sys.includes('비공개 미스터리 설계자'), reviewer=sys.includes('미스터리의 독립 검토자');
  let text;
  try{ text=await real(sys,user,max,roleName,o) }
  catch(e){ if(designer||reviewer) cat(e.message==='NO_KEY'?'키 없음':'API·연결 오류'); throw e }
  if(designer){ stat.design++; stat.lengths.push(String(text).length); if(!run('parseJSON')(text)) cat('JSON 아님·잘림') }
  if(reviewer){ stat.review++; const v=run('parseJSON')(text); if(!v||v.valid!==true) cat('AI 검토 불합격') }
  return text;
};
run(`{const real=callAI;callAI=(s,u,m,r,o)=>__observe(s,u,m,r,o,real)}`);
ctx.__validated=errs=>{ for(const e of errs) cat('구성 검증: '+String(e).replace(/\(.*$/,'').trim()) };
run(`{const real=validateMystery;validateMystery=(p,d)=>{const e=real(p,d);__validated(e);return e}}`);

function seed(){run(`
  G={v:1,_phoneLightVersion:1,_fearBalanceVersion:1,_relVersion:2,_clockVersion:2,_affLv:2,_deductionVersion:1,char:{name:'시험',age:17,stats:{str:1,wis:1,cha:1,sur:1},traits:[]},day:1,time:'방과 후',dayStep:0,loc:'site',steps:0,hp:12,maxhp:12,calm:10,battery:6,torch:0,cash:100,items:[],mat:{metal:0,ply:0,wire:0,keepsake:0},act:1,fragments:0,sitesDone:0,district:'music',comp:{met:false,joined:false,aff:10},rel:{},chronicle:[],
    site:{intro:true,name:INTRO_SITE_NAME,theme:INTRO_SITE_THEME,pos:{...CAMPUS_POS},rooms:normRooms([{id:'r1',name:'특별교실동 입구',danger:0,exits:['r2']},{id:'r2',name:'비어 있는 준비실',danger:0,exits:['r1','r3']},{id:'r3',name:'방송 장비실',danger:0,exits:['r2']}],3),cur:'r1',depth:0}};
  busy=false;PENDING={note:'',flags:{}};migrate();G.site.rooms[0].visited=true;`)}

// 함정 품질 판정: 사건 내용은 VM 안에서만 프롬프트로 만들고, 바깥으로는 점수만 받는다.
run(`function __judgePrompt(){
  const p=mysteryPlan(G.site),q=p.deduction,core=p.evidence.filter(e=>e.role==='core'),decoy=p.evidence.find(e=>e.role==='decoy');
  const avg=a=>a.reduce((s,x)=>s+x,0)/Math.max(1,a.length);
  const ratio={decoy:decoy?decoy.text.length/avg(core.map(e=>e.text.length)):null,
    answer:q?q.hypotheses.find(h=>h.id===q.answer_id).text.length/avg(q.hypotheses.filter(h=>h.id!==q.answer_id).map(h=>h.text.length)):null};
  const shuffled=[...p.evidence].sort(()=>Math.random()-0.5).map(e=>({text:e.text,meaning:e.meaning,action:e.action}));
  const prompt='미스터리의 함정 증거 품질을 채점한다. 내용을 다시 쓰거나 설명하지 말고 JSON 점수만 출력한다.\\n'+
    '(a) 함정 증거만 보면 그것이 가리키는 오답 후보가 얼마나 그럴듯한가 1~5 (5=매우 그럴듯)\\n'+
    '(b) 함정 증거를 반박 증거와 함께 보면 그 오답이 실제로 반박되는가 true/false\\n'+
    '(c) 아래 "섞인 증거 목록"만 보고, 길이·구체성·문장 모양으로 어느 것이 함정인지 구별할 수 있는가 true/false\\n'+
    '(d) 세 원인 후보 중 정답만 유독 길거나 구체적인가 true/false\\n'+
    JSON.stringify({함정:decoy&&{text:decoy.text,meaning:decoy.meaning},가리키는_오답:q&&decoy&&q.hypotheses.find(h=>h.id===decoy.points_to)?.text,
      반박_증거:decoy&&(p.evidence.find(e=>e.id===decoy.refuted_by)||{}).text,원인_후보:q&&q.hypotheses.map(h=>h.text),정답:q&&q.hypotheses.find(h=>h.id===q.answer_id)?.text,섞인_증거_목록:shuffled})+
    '\\nJSON: {"a":3,"b":true,"c":false,"d":false}';
  return {prompt,ratio};
}`);

(async()=>{
  const rows=[],judge=[],ratios={decoy:[],answer:[]};
  console.log(`입문 사건 생성 시험: ${N}회 · 제공자 ${provider}${model?' · 모델 '+model:''}${JUDGE?' · 함정 품질 판정 포함':''}`);
  for(let i=1;i<=N;i++){
    seed();const before=stat.design,t0=Date.now();
    let ok=false;try{ ok=!!(await run('ensureMystery(G.site)'))&&!!run('mysteryPlan(G.site)') }catch(e){ cat('예외') }
    const calls=stat.design-before;
    rows.push({ok,calls});
    console.log(`#${i} ${ok?'통과':'실패'} · 설계 호출 ${calls}회(재시도 ${Math.max(0,calls-1)}회) · ${((Date.now()-t0)/1000).toFixed(1)}초`);
    if(ok&&JUDGE){
      const j=run('__judgePrompt()');
      if(j.ratio.decoy!=null)ratios.decoy.push(j.ratio.decoy);if(j.ratio.answer!=null)ratios.answer.push(j.ratio.answer);
      try{ const v=run('parseJSON')(await run('callAI')('너는 미스터리 품질 채점자다. JSON만 출력한다.',j.prompt,300,'world'));
        if(v&&Number.isFinite(+v.a))judge.push({a:Math.max(1,Math.min(5,+v.a)),b:v.b===true,c:v.c===true,d:v.d===true});else cat('품질 판정 응답 오류') }
      catch(e){ cat('품질 판정 API 오류') }
    }
    run('G=null');   // 통과한 사건도 저장하지 않고 버린다
  }
  const pass=rows.filter(r=>r.ok).length,avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN,pct=(n,d)=>d?Math.round(n/d*100)+'%':'-';
  console.log('\n== 요약 ==');
  console.log(`통과율 ${pass}/${N} (${pct(pass,N)}) · 평균 설계 호출 ${avg(rows.map(r=>r.calls)).toFixed(2)}회 · 첫 시도 통과 ${rows.filter(r=>r.ok&&r.calls===1).length}회`);
  console.log(`설계 응답 평균 길이 ${Math.round(avg(stat.lengths))||0}자 (호출 ${stat.design}회) · 검토 호출 ${stat.review}회`);
  console.log('실패 사유(설계·검토 호출 단위, 한 호출에 여러 개 가능):');
  const cats=Object.entries(stat.cats).sort((a,b)=>b[1]-a[1]);
  console.log(cats.length?cats.map(([k,v])=>`  ${v}회 · ${k}`).join('\n'):'  없음');
  if(JUDGE){
    const n=judge.length;
    console.log(`함정 품질 판정 (${n}건):`);
    if(n){
      console.log(`  (a) 함정만 볼 때 오답의 그럴듯함 평균 ${avg(judge.map(x=>x.a)).toFixed(2)} / 5`);
      console.log(`  (b) 반박 증거와 함께 보면 반박됨: ${pct(judge.filter(x=>x.b).length,n)}`);
      console.log(`  (c) 문장 모양으로 함정이 구별됨: ${pct(judge.filter(x=>x.c).length,n)}`);
      console.log(`  (d) 정답 후보만 유독 길거나 구체적임: ${pct(judge.filter(x=>x.d).length,n)}`);
    }
    if(ratios.decoy.length)console.log(`  길이 비율(참고): 함정/핵심 평균 ${avg(ratios.decoy).toFixed(2)} · 정답 후보/오답 후보 평균 ${avg(ratios.answer).toFixed(2)}`);
  }
})().catch(e=>{console.error('시험 중단: '+(e&&e.message||e));process.exitCode=1});

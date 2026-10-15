#!/usr/bin/env node
'use strict';
// 사용: node tools/sim/run.cjs --games 5000 --seed 1 [--specs a,b] [--variant 이름] [--examples] [--out 파일.md] [--json]
const fs=require('node:fs'),path=require('node:path');
const {createGame}=require('./loader.cjs');
const {playGame}=require('./engine.cjs');
const {BOTS,DEFAULT_SPECS}=require('./bots.cjs');
const {gameSeed}=require('./prng.cjs');
const {ENDINGS,summarize,table,pct,f1,f2}=require('./stats.cjs');
const {VARIANTS}=require('./variants.cjs');

function parseArgs(argv){
  const o={games:5000,seed:1,specs:null,variant:null,examples:false,json:false,out:null,quiet:false};
  for(let i=2;i<argv.length;i++){
    const a=argv[i], next=()=>argv[++i];
    if(a==='--games') o.games=+next(); else if(a==='--seed') o.seed=+next(); else if(a==='--specs') o.specs=next().split(',');
    else if(a==='--variant') o.variant=next(); else if(a==='--examples') o.examples=true; else if(a==='--json') o.json=true;
    else if(a==='--out') o.out=next(); else if(a==='--quiet') o.quiet=true;
    else if(a==='--help'||a==='-h'){ console.log(fs.readFileSync(__filename,'utf8').split('\n')[2]); process.exit(0) }
    else throw new Error('알 수 없는 옵션: '+a);
  }
  if(!(o.games>0)||!Number.isFinite(o.seed)) throw new Error('--games와 --seed는 숫자여야 합니다');
  return o;
}
/* 전략 하나를 N판 돌린다. 판마다 시드가 다르고, 같은 (seed, i)면 전략이 달라도 같은 시드 묶음을 쓴다. */
function runSpec(h,spec,games,seed){
  if(!BOTS[spec]) throw new Error('알 수 없는 전략: '+spec+' (가능: '+Object.keys(BOTS).join(', ')+')');
  const recs=[];
  for(let i=0;i<games;i++) recs.push(playGame(h,BOTS[spec](),gameSeed(seed,i)));
  return recs;
}
function runAll({games,seed,specs,variant}){
  const patches=variant?(VARIANTS[variant]||(()=>{throw new Error('알 수 없는 변형: '+variant)})()).patches:[];
  const h=createGame({patches});
  const out={};
  for(const s of specs) out[s]=runSpec(h,s,games,seed);
  return {h,out};
}

const WHO={me:'나',yumin:'유민',guard:'경비원',pharm:'약사',rider:'라이더'};
const ROUTE_KO={front:'정문',rear:'후문',roof:'옥상'};
function specRoute(spec){ const m=spec.match(/(?::|-)(front|rear|roof)$/); return m?ROUTE_KO[m[1]]:(spec==='greedy-escape'?'후문':spec==='random'?'(자유)':'자동(가장 안전)') }

function report(o,res,sums){
  const specs=Object.keys(sums), L=[];
  L.push(`# 한빛 난이도 시뮬레이션 (${o.variant?'변형: '+o.variant:'현재 규칙'} · 전략당 ${o.games}판 · seed ${o.seed})\n`);
  L.push('## 1. 엔딩 분포 (%)\n');
  L.push(table(['전략','경로','판수',...ENDINGS,'탈출률'],specs.map(s=>{ const m=sums[s]; return [s,specRoute(s),m.n,...ENDINGS.map(e=>f1(pct(m.c[e],m.n))),'**'+f1(m.escRate)+'**'] })));
  L.push('## 2. 진행 지표 (탈출한 판 기준: 소요·남는 시간대 / 전체 판 기준: 체력·감염·약·물림)\n');
  L.push(table(['전략','평균 소요 시간대','평균 남는 시간대','탈출 시 평균 체력','판 끝 평균 체력','감염 발생률 %','응급약 사용(판당)','물림(판당)'],
    specs.map(s=>{ const m=sums[s]; return [s,f1(m.turnsEsc),f1(m.leftEsc),f1(m.hpEsc),f1(m.hpEnd),f1(m.infRate),f2(m.cures),f2(m.bites)] })));
  L.push('## 3. 유민 — 「함께 나선 아침」 도달과 호감 속도\n');
  L.push(table(['전략','함께 나선 아침 %','동행(호감 5↑) %','호감 12↑ %','동행까지 평균 행동','호감 12까지 평균 행동','함께 탈출한 최소 소요','친구 3명 모두 %'],
    specs.map(s=>{ const m=sums[s]; return [s,'**'+f1(m.togRate)+'**',f1(m.joinRate),f1(m.a12Rate),f1(m.joinTurns),f1(m.a12Turns),Number.isFinite(m.minTog)?m.minTog:'-',f1(m.friendsAll)] })));
  // 호감 증가 원인(유민 우선 계열 합산)
  const yspecs=specs.filter(s=>/^yumin-first/.test(s));
  if(yspecs.length){
    const agg={}; for(const s of yspecs) for(const k of Object.keys(sums[s].aff)){ const a=agg[k]||(agg[k]={n:0,sum:0}); a.n+=sums[s].aff[k].n; a.sum+=sums[s].aff[k].sum }
    L.push('### 호감이 오른 원인 (유민 우선 전략 합산, addAff 호출 기준)\n');
    L.push(table(['원인','호출 횟수','호출당 평균 호감 변화','전체 증가분 비중 %'],
      Object.keys(agg).sort((a,b)=>agg[b].sum-agg[a].sum).map(k=>{ const tot=Object.values(agg).reduce((s,x)=>s+x.sum,0); return [k,agg[k].n,f2(agg[k].sum/agg[k].n),f1(pct(agg[k].sum,tot))] })));
  }
  // 구역별
  const zsum=(names)=>{ const z={}; for(const s of names) for(const k of Object.keys(sums[s].zones)){ const o=z[k]||(z[k]={exp:0,pSum:0,enc:0,bite:0,evade:0}); const a=sums[s].zones[k]; for(const f of Object.keys(o)) o[f]+=a[f] } return z };
  const bots=specs.filter(s=>s!=='random'), groups=[['봇 전체(random 제외)',bots],['random',specs.filter(s=>s==='random')]].filter(g=>g[1].length);
  for(const [title,names] of groups){
    const z=zsum(names), ids=Object.keys(z);
    if(!ids.length) continue;
    L.push(`## 4. 구역별 조우·물림 — ${title}\n`);
    L.push(table(['구역','머문 시간대(조우 판정 횟수)','계산상 조우 확률 평균 %','실제 조우율 %','조우 시 물림율 %','시간대당 물림율 %'],
      ids.sort((a,b)=>z[b].bite-z[a].bite).map(k=>{ const a=z[k]; return [k,a.exp,f1(100*a.pSum/a.exp),f1(pct(a.enc,a.exp)),f1(pct(a.bite,a.enc)),f1(pct(a.bite,a.exp))] })));
  }
  // 사망·실패 원인
  const cz={}; for(const s of specs) for(const k of Object.keys(sums[s].causes)) cz[k]=(cz[k]||0)+sums[s].causes[k];
  L.push('## 5. 실패 원인 (dead·infected·timeout, 전체 전략 합산 상위)\n');
  L.push(table(['엔딩 / 원인','판수'],Object.keys(cz).sort((a,b)=>cz[b]-cz[a]).slice(0,14).map(k=>[k,cz[k]])));
  // 경로별 비교
  const rr=[['rush-front','정문'],['greedy-escape','후문'],['rush-roof','옥상']].filter(([s])=>sums[s]);
  if(rr.length){
    L.push('## 6. 경로 비교 (경로별 최단 봇, 유민 무시)\n');
    L.push(table(['경로','봇','탈출률 %','평균 소요 시간대','탈출 시 평균 체력','물림(판당)','감염 발생률 %'],
      rr.map(([s,k])=>{ const m=sums[s]; return [k,s,f1(m.escRate),f1(m.turnsEsc),f1(m.hpEsc),f2(m.bites),f1(m.infRate)] })));
  }
  // 기준 판정
  L.push('## 7. 판정 기준 대비\n'); L.push(criteria(sums));
  L.push(`\n무결성: 예외 ${specs.reduce((s,k)=>s+sums[k].errs,0)}판 · 진행 정지 ${specs.reduce((s,k)=>s+sums[k].stalls,0)}판 · 네트워크/AI 호출 ${specs.reduce((s,k)=>s+sums[k].net,0)}회 · 아이템 중복 ${specs.reduce((s,k)=>s+sums[k].dup,0)}판\n`);
  return L.join('\n');
}
/* 제안 기준(지시서 4)을 숫자로 판정 */
function criteria(sums){
  const specs=Object.keys(sums), rows=[];
  const best=specs.filter(s=>s!=='random').reduce((b,s)=>!b||sums[s].escRate>sums[b].escRate?s:b,null);
  const ok=(v,lo,hi)=>v>=lo&&v<=hi?'✅ 통과':(v<lo?'❌ 낮음':'❌ 높음');
  if(best) rows.push(['최적 전략 탈출률 70~90%',`${best} ${f1(sums[best].escRate)}%`,ok(sums[best].escRate,70,90)]);
  if(sums.random) rows.push(['random 탈출률 5% 이하',`${f1(sums.random.escRate)}%`,sums.random.escRate<=5?'✅ 통과':'❌ 높음']);
  const ys=specs.filter(s=>/^yumin-first/.test(s));
  if(ys.length){ const b=ys.reduce((a,s)=>sums[s].togRate>sums[a].togRate?s:a,ys[0]); rows.push(['유민 우선 「함께 나선 아침」 30~60%',`${b} ${f1(sums[b].togRate)}%`,ok(sums[b].togRate,30,60)]) }
  const others=specs.filter(s=>!/^yumin-first/.test(s)); if(others.length){ const b=others.reduce((a,s)=>sums[s].togRate>sums[a].togRate?s:a,others[0]); rows.push(['그 밖의 전략 「함께 나선 아침」 10% 이하',`${b} ${f1(sums[b].togRate)}%`,sums[b].togRate<=10?'✅ 통과':'❌ 높음']) }
  const rr=[['정문','rush-front'],['후문','greedy-escape'],['옥상','rush-roof']].filter(([,s])=>sums[s]);
  if(rr.length===3){
    const dom=[];
    for(const [na,sa] of rr) for(const [nb,sb] of rr){ if(sa===sb) continue; const A=sums[sa],B=sums[sb];
      if(A.escRate>=B.escRate&&A.turnsEsc<=B.turnsEsc&&A.bites<=B.bites&&(A.escRate>B.escRate||A.turnsEsc<B.turnsEsc||A.bites<B.bites)) dom.push(`${na} ≫ ${nb}`) }
    rows.push(['어떤 경로도 다른 경로를 완전히 압도하지 않음',dom.length?dom.join(', '):'압도 관계 없음',dom.length?'❌ 압도':'✅ 통과']);
  }
  return table(['기준','측정','판정'],rows);
}

function examples(h,res,sums){
  const want={escape_together:['yumin-first','yumin-first:roof'],escape_alone:['greedy-escape','cautious'],infected:['yumin-first:front','cautious:front','random'],dead:['yumin-first:front','cautious:front','completionist:front','random'],timeout:['completionist','yumin-first:front','random']};
  const L=['## 엔딩별 대표 로그\n'];
  for(const e of ENDINGS){
    let pick=null;
    for(const s of [...want[e],...Object.keys(res.out)]){ if(!res.out[s]) continue; const r=res.out[s].filter(x=>x.ending===e).sort((a,b)=>a.turns-b.turns)[0]; if(r){ pick={s,r}; break } }
    if(!pick){ L.push(`### ${e}\n(이 실행에서는 도달한 판이 없습니다)\n`); continue }
    const rec=playGame(h,BOTS[pick.s](),pick.r.seed,{keepLog:true});
    L.push(`### ${e} — 전략 \`${pick.s}\` · seed ${pick.r.seed} · 소요 ${rec.turns}시간대\n`);
    L.push('```');
    for(const l of rec.log.slice(-90)) L.push(({action:'▶ ',dialog:'  「',scene:'  ',sys:'  [시스템] '})[l.type]+(l.type==='dialog'?(WHO[l.who]||l.who)+': '+l.text+'」':l.text));
    L.push('```\n');
  }
  return L.join('\n');
}

if(require.main===module){
  const o=parseArgs(process.argv);
  const specs=o.specs||DEFAULT_SPECS;
  const t0=Date.now();
  const res=runAll({games:o.games,seed:o.seed,specs,variant:o.variant});
  const sums=Object.fromEntries(Object.keys(res.out).map(s=>[s,summarize(res.out[s])]));
  let text;
  if(o.json) text=JSON.stringify(Object.fromEntries(Object.keys(sums).map(s=>{ const {zones,aff,causes,...m}=sums[s]; return [s,m] })),null,1);
  else{ text=report(o,res,sums); if(o.examples) text+='\n'+examples(res.h,res,sums) }
  if(o.out) fs.writeFileSync(o.out,text+'\n'); else console.log(text);
  if(!o.quiet) console.error(`(${specs.length}개 전략 × ${o.games}판, ${((Date.now()-t0)/1000).toFixed(1)}초)`);
  const bad=Object.values(sums).reduce((s,m)=>s+m.errs+m.stalls+m.net,0);
  if(bad) { console.error('경고: 예외/정지/네트워크 호출이 있었습니다'); process.exit(1) }
}
module.exports={runAll,runSpec,report,criteria,examples,parseArgs};

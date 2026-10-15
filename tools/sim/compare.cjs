#!/usr/bin/env node
'use strict';
// 수치 조정 후보를 판정 기준에 비춰 한 표로 보여 준다(적용하지 않는다).
// 사용: node tools/sim/compare.cjs [--games 1500] [--seed 1] [--variants infect4,A,B] [--out 파일.md]
const fs=require('node:fs');
const {runAll}=require('./run.cjs');
const {summarize,table,f1,f2}=require('./stats.cjs');
const {VARIANTS}=require('./variants.cjs');
const SPECS=['random','greedy-escape','rush-front','rush-roof','yumin-first','yumin-first:front','yumin-first:rear','yumin-first:roof','cautious','cautious:front','cautious:rear','cautious:roof','completionist','completionist:front','completionist:rear','completionist:roof'];
function row(name,desc,sums){
  const pool=SPECS.filter(s=>s!=='random'&&sums[s]);
  const best=pool.reduce((b,s)=>sums[s].escRate>sums[b].escRate?s:b,pool[0]);
  const ys=pool.filter(s=>/^yumin-first/.test(s)), yb=ys.reduce((b,s)=>sums[s].togRate>sums[b].togRate?s:b,ys[0]);
  const others=pool.filter(s=>!/^yumin-first/.test(s)), ob=others.reduce((b,s)=>sums[s].togRate>sums[b].togRate?s:b,others[0]);
  const r=['front','greedy-escape','rush-roof'].map(s=>sums[s]);
  const ok=(v,lo,hi)=>v>=lo&&v<=hi;
  const flags=[ok(sums[best].escRate,70,90),sums.random.escRate<=5,ok(sums[yb].togRate,30,60),sums[ob].togRate<=10];
  return {cells:[name,desc,`${f1(sums[best].escRate)} (${best})`,f1(sums.random.escRate),`${f1(sums[yb].togRate)} (${yb})`,f1(sums[ob].togRate),
    `${f1(sums['rush-front'].escRate)} / ${f1(sums['greedy-escape'].escRate)} / ${f1(sums['rush-roof'].escRate)}`,
    `${f1(sums['rush-front'].turnsEsc)} / ${f1(sums['greedy-escape'].turnsEsc)} / ${f1(sums['rush-roof'].turnsEsc)}`,flags.filter(Boolean).length+'/4'],flags};
}
if(require.main===module){
  const a=process.argv, arg=(k,d)=>{ const i=a.indexOf(k); return i<0?d:a[i+1] };
  const games=+arg('--games',1500), seed=+arg('--seed',1), names=(arg('--variants',null)||['base',...Object.keys(VARIANTS)].join(',')).split(','), out=arg('--out',null);
  const rows=[];
  for(const n of names){
    const t0=Date.now();
    const {out:res}=runAll({games,seed,specs:SPECS,variant:n==='base'?null:n});
    const sums=Object.fromEntries(Object.keys(res).map(s=>[s,summarize(res[s])]));
    rows.push(row(n,n==='base'?'현재 규칙':VARIANTS[n].desc,sums));
    console.error(`${n} ${((Date.now()-t0)/1000).toFixed(0)}s`);
  }
  const text=`# 수치 조정 후보 비교 (적용하지 않음 · 전략당 ${games}판 · seed ${seed})\n\n`+
    table(['후보','변경','최고 탈출률 % (봇)','random 탈출률 %','유민 우선 함께 탈출 % (봇)','그 밖 전략 함께 탈출 % (최대)','경로별 탈출률 % 정문/후문/옥상','경로별 평균 소요 정문/후문/옥상','기준 통과'],rows.map(r=>r.cells))+
    '\n기준: 최고 탈출률 70~90 · random ≤5 · 유민 우선 함께 탈출 30~60 · 그 밖 ≤10.\n';
  if(out) fs.writeFileSync(out,text); else console.log(text);
}

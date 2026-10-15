'use strict';
// 판 기록들을 표로 요약한다.
const ENDINGS=['dead','infected','timeout','escape_alone','escape_together'];
const ENDING_KO={dead:'dead(쓰러짐)',infected:'infected(감염)',timeout:'timeout(시간 초과)',escape_alone:'escape_alone',escape_together:'escape_together'};
const pct=(x,n)=>n?100*x/n:0, f1=x=>Number.isFinite(x)?x.toFixed(1):'-', f2=x=>Number.isFinite(x)?x.toFixed(2):'-';
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN;
const isEsc=r=>r.ending==='escape_alone'||r.ending==='escape_together';

function summarize(recs){
  const n=recs.length, c=Object.fromEntries(ENDINGS.map(e=>[e,0]));
  for(const r of recs) c[r.ending]=(c[r.ending]||0)+1;
  const esc=recs.filter(isEsc), tog=recs.filter(r=>r.ending==='escape_together');
  const joined=recs.filter(r=>r.aff5!==null), a12=recs.filter(r=>r.aff12!==null);
  const z={};   // 구역 통계
  for(const r of recs) for(const k of Object.keys(r.exp)){
    const o=z[k]||(z[k]={exp:0,pSum:0,enc:0,bite:0,evade:0});
    o.exp+=r.exp[k]; o.pSum+=r.pSum[k]||0; o.enc+=r.enc[k]||0; o.bite+=r.bite[k]||0; o.evade+=r.evade[k]||0;
  }
  const aff={};
  for(const r of recs) for(const k of Object.keys(r.affBy)){ const o=aff[k]||(aff[k]={n:0,sum:0}); o.n+=r.affBy[k].n; o.sum+=r.affBy[k].sum }
  const causes={};
  for(const r of recs) if(r.cause) { const k=r.ending+' / '+r.cause; causes[k]=(causes[k]||0)+1 }
  return {n,c,escRate:pct(esc.length,n),togRate:pct(tog.length,n),
    turnsEsc:mean(esc.map(r=>r.turns)),leftEsc:mean(esc.map(r=>r.left)),hpEnd:mean(recs.map(r=>r.hp)),hpEsc:mean(esc.map(r=>r.hp)),
    infRate:pct(recs.filter(r=>r.inf>0).length,n),cures:mean(recs.map(r=>r.cures)),bites:mean(recs.map(r=>r.bites)),
    joinRate:pct(joined.length,n),a12Rate:pct(a12.length,n),joinTurns:mean(joined.map(r=>r.aff5)),a12Turns:mean(a12.map(r=>r.aff12)),
    minTog:tog.length?Math.min(...tog.map(r=>r.turns)):NaN,
    friends:mean(recs.map(r=>r.friends)),friendsAll:pct(recs.filter(r=>r.friends===3).length,n),
    zones:z,aff,causes,errs:recs.filter(r=>r.err).length,stalls:recs.filter(r=>r.stall).length,net:recs.reduce((s,r)=>s+r.net,0),
    dup:recs.filter(r=>r.dupItems).length,
    routes:(()=>{ const o={}; for(const r of recs){ const k=r.route||'(없음)'; const t=o[k]||(o[k]={n:0,esc:0,tog:0}); t.n++; if(isEsc(r)) t.esc++; if(r.ending==='escape_together') t.tog++ } return o })()};
}
function table(head,rows){
  return '| '+head.join(' | ')+' |\n|'+head.map((_,i)=>i?'---:':':---').join('|')+'|\n'+rows.map(r=>'| '+r.join(' | ')+' |').join('\n')+'\n';
}
module.exports={ENDINGS,ENDING_KO,summarize,table,pct,f1,f2,mean,isEsc};

'use strict';
// 판 하나를 끝까지 돌리고 기록을 돌려준다. 게임 규칙은 전부 실제 코드(vm)가 처리한다.
const {mulberry32}=require('./prng.cjs');
const MAX_STEPS=400, MAX_FREE=60;

function makeView(h,botRng){
  const W=h.world, risk=Object.fromEntries(W.zones.map(z=>[z.id,z.risk]));
  const V={h,W,risk,ids:[],rnd:botRng,
    has:id=>V.ids.includes(id),G:()=>h.G(),enc:z=>h.encChance(z),peek:(k,a)=>h.peek(k,a),left:()=>h.turnsLeft()};
  return V;
}
function whyTimeout(h,W){
  const G=h.G();
  if(!G.route) return '탈출 경로를 정하지 않음';
  const miss=W.routes[G.route].need.filter(x=>!G.items.includes(x));
  if(miss.length) return `${W.routes[G.route].n} · 도구 부족(${miss.join(',')})`;
  return `${W.routes[G.route].n} · 도구는 갖췄지만 출구에 서지 못함`;
}
/* bot: {decide(V)}. 반환 기록은 JSON으로 바로 직렬화할 수 있다. */
function playGame(h,bot,seed,opts={}){
  const botRng=mulberry32((seed^0x9e3779b9)>>>0);
  h.begin(seed);
  if(opts.keepLog) h.S().keepLog=true;
  const V=makeView(h,botRng);
  let steps=0,free=0,maxFree=0,stall=null,err=null;
  const W=h.world, total=(W.lastDay-W.start.day)*W.times+(W.times-W.start.slot);
  try{
    while(!h.G().ending){
      V.ids=h.choices();
      if(!V.ids.length){ stall='선택지가 비었음'; break }
      const id=bot.decide(V);
      if(!V.ids.includes(id)) throw new Error(`bot picked an unavailable choice: ${id} (choices: ${V.ids.join(' ')})`);
      if(opts.picks) opts.picks.push(id);
      const t0=h.S().turns; h.pick(id); h.drain(); steps++;
      if(h.S().turns===t0&&!h.G().ending){ free++; if(free>maxFree) maxFree=free } else free=0;
      if(free>MAX_FREE){ stall='시간이 흐르지 않는 행동이 '+MAX_FREE+'번 넘게 반복됨'; break }
      if(steps>MAX_STEPS){ stall='행동 수가 '+MAX_STEPS+'을 넘음'; break }
    }
  }catch(e){ err=String(e&&e.stack||e) }
  const G=h.G(), S=h.S(), y=G.comp.yumin;
  const rec={seed,ending:G.ending,turns:S.turns,left:total-S.turns,route:G.route,hp:G.hp,aff:y.aff,met:y.met,joined:y.joined,
    aff5:S.aff5,aff12:S.aff12,bites:S.bites,inf:S.infStarted,cures:S.cures,meds:G.meds,starve:S.starve,net:S.net,rngCalls:h.ctx.__calls,
    exp:S.exp,pSum:S.pSum,enc:S.enc,bite:S.bite,evade:S.evade,affBy:S.affBy,maxFree,
    friends:Object.values(G.surv).filter(s=>s.gift).length,items:G.items.length,dupItems:G.items.length!==new Set(G.items).size};
  if(G.ending==='dead') rec.cause=S.hpLoss.length?S.hpLoss[S.hpLoss.length-1]:'?';
  else if(G.ending==='infected') rec.cause='infection@'+S.infZone;
  else if(G.ending==='timeout') rec.cause=whyTimeout(h,W);
  if(stall) rec.stall=stall;
  if(err) rec.err=err;
  if(opts.keepLog) rec.log=JSON.parse(JSON.stringify(G.log));
  return rec;
}
module.exports={playGame};

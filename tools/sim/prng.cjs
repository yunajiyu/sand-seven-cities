'use strict';
// 시드 있는 난수 (mulberry32). 같은 시드 → 같은 수열. 상태는 한 숫자라 저장·복원이 쉽다.
function mulberry32(seed){
  let a=seed>>>0;
  const f=()=>{ a=(a+0x6D2B79F5)>>>0; let t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296 };
  f.get=()=>a; f.set=v=>{ a=v>>>0 };
  return f;
}
// 판마다 독립된 시드를 만든다 (전략끼리 같은 시드 묶음을 쓰면 비교가 짝지어진다)
function gameSeed(base,i){ return (Math.imul((base>>>0)+1,2654435761)+Math.imul(i+1,40503))>>>0 }
module.exports={mulberry32,gameSeed};

'use strict';
// 수치 조정 "후보"를 시험하기 위한 변형 표. 메모리에 올린 게임 스크립트 복사본에만 글자 치환을 적용한다(hanbit.html은 그대로).
// 각 항목: {desc, patches:[[찾을 글자, 바꿀 글자], ...]} — 찾을 글자는 스크립트에 정확히 한 번만 있어야 한다.
// 이 표의 값은 "시험용"이며 게임에 적용된 것이 아니다. 적용 여부는 사용자가 정한다.
const P={
  infect:n=>['const INFECT_SLOTS=8;',`const INFECT_SLOTS=${n};`],
  bite:x=>['const BITE_CHANCE=0.5;',`const BITE_CHANCE=${x};`],
  dmg:n=>['const BITE_DAMAGE=2;',`const BITE_DAMAGE=${n};`],
  protect:n=>['const PROTECT_COST=1;',`const PROTECT_COST=${n};`],
  enc:(a,b,c)=>['let p=0.12*n+0.04*(G.noise[id]||0)+0.05*(z.risk-1);',`let p=${a}*n+${b}*(G.noise[id]||0)+${c}*(z.risk-1);`],
  days:n=>['const LAST_DAY=4;',`const LAST_DAY=${n};`],
  base:(hp,food,water)=>['const BASE={hp:10,food:6,water:6};',`const BASE={hp:${hp},food:${food},water:${water}};`],
  zombies:o=>['const ZOMBIE_START={room:0,roof:0,stairs:1,office:1,shop:2,garden:2,garage:3,gate:3};',`const ZOMBIE_START=${JSON.stringify({room:0,roof:0,stairs:1,office:1,shop:2,garden:2,garage:3,gate:3,...o}).replace(/"/g,'')};`],
  joke:d=>['return safe?{d:2,good:true}:{d:-1,good:false};',`return safe?{d:${d},good:true}:{d:-1,good:false};`],
  aff:t=>['AFF_LV=[0,2,5,8,12,16]',`AFF_LV=${JSON.stringify(t)}`],
  esc:n=>['const ESC_LEVEL=4;',`const ESC_LEVEL=${n};`],
  signalAtOffice:()=>["office:{items:['gateKey','map']},","office:{items:['gateKey','map','signal']},"],
  noSignalAtRoof:()=>["roof:  {items:['signal']},","roof:  {},"],
};
const V=(desc,...patches)=>({desc,patches});
const VARIANTS={
  // 한 번에 하나만 바꾼 단일 후보
  'infect4':V('감염 시계 8→4시간대',P.infect(4)),
  'infect5':V('감염 시계 8→5시간대',P.infect(5)),
  'bite70':V('BITE_CHANCE 0.5→0.7',P.bite(0.7)),
  'dmg3':V('BITE_DAMAGE 2→3',P.dmg(3)),
  'enc150':V('조우 계수 ×1.5 (0.12/0.04/0.05→0.18/0.06/0.075)',P.enc(0.18,0.06,0.075)),
  'roof-zombie1':V('옥상 좀비 0→1마리',P.zombies({roof:1})),
  'days3':V('마지막 날 4→3일차 (행동 14→10번)',P.days(3)),
  'joke1':V('농담의 호감 +2→+1 (안전할 때)',P.joke(1)),
  'esc-lv5':V('함께 탈출 문턱 호감 12→16(5단계)',P.esc(5)),
  'supply-low':V('시작 식량·물 6→2',P.base(10,2,2)),
  'signal-office':V('구조 신호 도구를 옥상이 아닌 관리사무소에서 획득',P.signalAtOffice(),P.noSignalAtRoof()),
  // 묶음 후보 (지시서 4의 기준을 맞추려는 시도)
  'A':V('후보 A: 감염 5시간대 + 옥상 좀비 1마리 + 마지막 날 3일차',P.infect(5),P.zombies({roof:1}),P.days(3)),
  'B':V('후보 B: 물림 0.7 + 조우 ×1.5 + 감염 6시간대',P.bite(0.7),P.enc(0.18,0.06,0.075),P.infect(6)),
  'C':V('후보 C: 감염 5시간대 + 조우 ×1.5 + 옥상 좀비 1마리 + 마지막 날 3일차',P.infect(5),P.enc(0.18,0.06,0.075),P.zombies({roof:1}),P.days(3)),
  'D':V('후보 D: 감염 3시간대 + 옥상 좀비 1마리 + 농담 호감 +1',P.infect(3),P.zombies({roof:1}),P.joke(1)),
  'E':V('후보 E: 감염 4시간대 + 조우 ×1.5 + 옥상 좀비 1마리 + 농담 호감 +1',P.infect(4),P.enc(0.18,0.06,0.075),P.zombies({roof:1}),P.joke(1)),
  'F':V('후보 F: 감염 4시간대 + 물림 피해 3 + 옥상 좀비 1마리 + 농담 호감 +1',P.infect(4),P.dmg(3),P.zombies({roof:1}),P.joke(1)),
};
module.exports={VARIANTS,P,V};

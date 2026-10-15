#!/usr/bin/env node
'use strict';
// 버그·안정성 검사. 사용: node tools/sim/check.cjs [--seed 1] [--save 120] [--fuzz 3000] [--explore 8] [--out 파일.md]
// 게임 코드를 고치지 않는다. 문제를 찾으면 재현 시드·선택 순서와 함께 보고만 한다.
const fs=require('node:fs');
const {createGame}=require('./loader.cjs');
const {playGame}=require('./engine.cjs');
const {BOTS}=require('./bots.cjs');
const {mulberry32,gameSeed}=require('./prng.cjs');

const findings=[];                       // {check,title,detail,repro}
const note=(check,title,detail,repro)=>{ if(!findings.some(f=>f.check===check&&f.title===title)) findings.push({check,title,detail,repro,count:1}); else findings.find(f=>f.check===check&&f.title===title).count++ };

/* ---------- 1. 저장 → 불러오기 → 이어서 진행이 같은가 ---------- */
function recordRun(h,spec,seed){
  const picks=[],fps=[];
  playGame(h,BOTS[spec](),seed,{picks});
  // 같은 판을 다시 돌리며 매 수 뒤의 상태 지문을 기록한다(줄은 끝까지 넘긴 뒤)
  h.begin(seed);
  for(const id of picks){ h.pick(id); h.tap(); fps.push(h.fp()) }
  return {picks,fps};
}
function replay(h,seed,picks,fps,k,{speed,when}){
  h.begin(seed); h.run(`UI.speed=${JSON.stringify(speed)}`);
  for(let i=0;i<picks.length;i++){
    h.pick(picks[i]);
    if(i===k&&when==='pending'){
      const pre=h.fp(), expect=h.qtexts();
      h.run('continueGame()');
      const post=h.fp();
      if(post!==pre) return `불러온 직후 상태가 저장 전과 다름 (수 ${i+1}, 줄 ${expect.length}개 남음)`;
      const got=h.qafter();
      if(JSON.stringify(got)!==JSON.stringify(expect)) return `남은 줄 복원이 다름 (수 ${i+1}): 저장 전 ${JSON.stringify(expect).slice(0,120)} / 복원 ${JSON.stringify(got).slice(0,120)}`;
    }
    h.tap();
    if(i===k&&when==='tapped'){
      const pre=h.fp(); h.run('continueGame()'); h.tap();
      if(h.fp()!==pre) return `줄을 다 넘긴 뒤 불러온 상태가 저장 전과 다름 (수 ${i+1})`;
    }
    if(h.fp()!==fps[i]) return `이어서 진행한 결과가 원래 판과 다름 (수 ${i+1}, 선택 ${picks[i]})`;
  }
  return null;
}
function checkSaveLoad(h,{seed,games,specs}){
  let runs=0,fail=0;
  for(const spec of specs) for(let g=0;g<games;g++){
    const s=gameSeed(seed,g), ref=recordRun(h,spec,s);
    for(const speed of ['off','mid']) for(const when of ['pending','tapped']){
      for(let k=0;k<ref.picks.length;k++){
        runs++; const bad=replay(h,s,ref.picks,ref.fps,k,{speed,when});
        if(bad){ fail++; note('저장/불러오기',bad.replace(/\(수 \d+.*?\)/,'').trim().slice(0,60),bad,`전략 ${spec} · seed ${s} · 속도 ${speed} · ${when} · ${k+1}번째 수 뒤에 불러오기`) }
      }
    }
  }
  // 엔딩 직후·엔딩 뒤 불러오기
  for(const spec of specs){ const s=gameSeed(seed,0), ref=recordRun(h,spec,s); h.begin(s); for(const id of ref.picks){ h.pick(id); h.tap() }
    const end=h.G().ending; h.run('continueGame()'); h.tap();
    if(h.G().ending!==end) note('저장/불러오기','엔딩이 불러온 뒤 사라짐',`${end} → ${h.G().ending}`,`전략 ${spec} · seed ${s}`);
    if(h.choices().length) note('저장/불러오기','엔딩 뒤 불러오면 선택지가 남음',h.choices().join(','),`전략 ${spec} · seed ${s}`);
    runs++ }
  return {runs,fail};
}

/* ---------- 2. 옛 저장 ---------- */
function checkOldSaves(h,{seed}){
  const variants={
    'gift 없음':g=>{ for(const k of Object.keys(g.surv)) delete g.surv[k].gift },
    'pend 없음':g=>{ delete g.pend },
    'gift·pend 없음':g=>{ delete g.pend; for(const k of Object.keys(g.surv)) delete g.surv[k].gift },
    'meds 없음':g=>{ delete g.meds },
    'items 없음':g=>{ delete g.items },
    'infection 없음':g=>{ delete g.infection },
    'route 없음':g=>{ delete g.route },
    'ending 없음':g=>{ delete g.ending },
    'log 없음':g=>{ delete g.log; delete g.pend },
    '가장 옛 형식(선택 항목 전부 없음)':g=>{ for(const k of ['pend','meds','items','infection','route','ending','log']) delete g[k]; for(const o of Object.values(g.surv)) delete o.gift },
  };
  let n=0;
  for(const spec of ['yumin-first','completionist','cautious:front']) for(const k of [2,5,9]){
    const s=gameSeed(seed,k), picks=[]; playGame(h,BOTS[spec](),s,{picks});
    for(const [name,mut] of Object.entries(variants)){
      h.begin(s); let i=0; for(const id of picks){ if(h.G().ending||i>=k) break; h.pick(id); h.tap(); i++ }
      const g=JSON.parse(JSON.stringify(h.G())); mut(g);
      h.run('notices.length=0'); h.ctx.__old=JSON.stringify(g);
      h.run('localStorage.setItem(SAVE_KEY,__old);continueGame()');
      const msgs=h.run('notices').join('|'); n++;
      if(/불러오지 못했습니다/.test(msgs)){ note('옛 저장',`${name}: 불러오기 실패`,msgs,`전략 ${spec} · seed ${s} · ${i}수째 저장을 변형`); continue }
      // 이어서 끝까지 진행해도 예외·불변식 위반이 없어야 한다
      const rr=mulberry32(s), guard=300; let st=0;
      while(!h.G().ending&&st++<guard){ const ids=h.choices(); if(!ids.length){ note('옛 저장',`${name}: 불러온 뒤 선택지가 비었음`,'',`전략 ${spec} · seed ${s}`); break } h.pick(ids[Math.floor(rr()*ids.length)]); h.tap();
        const bad=h.inv(); if(bad.length){ note('옛 저장',`${name}: 이어 하다 불변식 위반`,bad.join('; '),`전략 ${spec} · seed ${s}`); break } }
    }
  }
  // 옛 저장(gift 없음)에서 호감이 이미 4 이상인 생존자는 다음 대화에서 선물을 또 받는지(의도 확인용)
  h.begin(1); h.run("G.surv.pharm.met=true;G.surv.pharm.aff=5;G.surv.pharm.gift=true;G.loc='shop';G.zs.shop.seen=true;G.meds=0");
  const g=JSON.parse(JSON.stringify(h.G())); delete g.surv.pharm.gift; h.ctx.__old=JSON.stringify(g);
  h.run("localStorage.setItem(SAVE_KEY,__old);continueGame();TALK_OPEN='pharm'"); h.pick('chat:pharm:info'); h.tap();
  if(h.G().meds>0) note('옛 저장','gift 없는 옛 저장에서 호감 4↑ 생존자가 선물을 한 번 더 줌 (응급약 +1)','migrate()가 gift를 false로 채우므로, 이미 친구가 된 옛 저장은 다음 대화에서 선물을 다시 받는다. 옛 저장에 이미 받은 선물이 있었다면 중복 지급이다. 의도인지 확인 필요(낮은 심각도).','seed 1 · 약사 호감 5, gift 필드 삭제 후 불러와 「단지 사정을 묻는다」');
  // 일부러 깨진 저장은 거절되고 현재 게임이 그대로여야 한다
  const bads={'체력이 최대보다 큼':g=>{ g.hp=g.maxhp+1 },'호감이 범위 밖':g=>{ g.comp.yumin.aff=99 },'구역 항목 없음':g=>{ delete g.zs.gate },'알 수 없는 아이템':g=>{ g.items=['x'] },'NaN 체력':g=>{ g.hp=NaN },'위치가 없는 구역':g=>{ g.loc='nowhere' },'pend가 로그보다 큼':g=>{ g.pend=9999 }};
  for(const [name,mut] of Object.entries(bads)){
    h.begin(2); h.pick('move:stairs'); h.tap(); const before=h.fp(); const g=JSON.parse(JSON.stringify(h.G())); mut(g);
    h.ctx.__old=JSON.stringify(g); h.run("localStorage.setItem(SAVE_KEY,__old);continueGame()"); n++;
    const rejected=h.fp()===before;
    if(!rejected) note('옛 저장',`깨진 저장이 받아들여짐: ${name}`,'validateSaveData가 걸러야 한다','seed 2');
  }
  return {runs:n};
}

/* ---------- 3. 이상한 입력 ---------- */
function checkBadInput(h){
  const calls=["goZone('__proto__')","goZone('constructor')","goZone(null)","goZone(123)","goZone('gate')","goZone('')","talkTo('toString')","talkTo('__proto__')","talkTo('comfort')",
    "chatTo('guard:ask')","chatTo('constructor:x')","chatTo('')","chatTo('guard:__proto__')","chatTo('__proto__:ask')","setRoute('toString')","setRoute('__proto__')","setRoute(undefined)","escapeNow()",
    "pick('__proto__')","pick('constructor:')","pick('move:__proto__')","pick(null)","pick(undefined)","pick(5)","pick('')","pick('escape:')","pick('cure:')","pick('talk:joke')","pick('chat:guard:ask')"];
  let n=0;
  for(const c of calls){
    h.begin(7); h.tap(); const before=h.fp(), turns=h.S().turns;
    try{ h.run(c); h.tap() }catch(e){ note('이상한 입력',`${c}에서 예외`,String(e),'seed 7 · 새 게임 직후'); continue }
    n++;
    if(h.fp()!==before||h.S().turns!==turns) note('이상한 입력',`${c}가 상태를 바꿈`,'잘못된 입력은 아무 일도 없어야 한다','seed 7 · 새 게임 직후');
  }
  // 줄이 남아 있는 동안은 선택이 무시되는지
  h.begin(7); h.run("say([{t:'n',text:'a'},{t:'n',text:'b'},{t:'n',text:'c'}])"); const t0=h.S().turns; h.pick('look:');
  if(h.S().turns!==t0) note('이상한 입력','줄이 남은 상태에서 선택이 실행됨','pick은 줄이 남으면 무시해야 한다','seed 7'); n++;
  return {runs:n};
}

/* ---------- 4. 퍼즈: 무작위 행동을 많이 돌리며 매 단계 검사 ---------- */
function checkFuzz(h,{seed,games}){
  let steps=0,maxTurns=0;
  const rr=mulberry32(seed^0xabcdef);
  for(let g=0;g<games;g++){
    const s=gameSeed(seed+77,g); h.begin(s); const trail=[]; let lastTime=0,free=0,turnsAtFree=0;
    let st=0;
    while(!h.G().ending&&st++<500){
      const ids=h.choices();
      if(!ids.length){ note('퍼즈','진행 불가: 선택지가 비었음',h.fp().slice(0,200),`seed ${s} · 선택 ${trail.join(' ')}`); break }
      const id=ids[Math.floor(rr()*ids.length)]; trail.push(id);
      const before=h.fp(), logLen=h.G().log.length, talk=h.run('TALK_OPEN'), turns=h.S().turns;
      try{ h.pick(id); h.tap() }catch(e){ note('퍼즈','선택 실행 중 예외: '+id,String(e&&e.stack||e).slice(0,300),`seed ${s} · 선택 ${trail.join(' ')}`); break }
      steps++;
      if(h.fp()===before&&h.run('TALK_OPEN')===talk&&h.G().log.length===logLen) note('퍼즈',`아무 일도 일어나지 않는 선택지: ${id}`,'목록에 있는데 실행해도 상태·기록이 그대로','seed '+s+' · 선택 '+trail.join(' '));
      const bad=h.inv(); if(bad.length){ for(const b of bad) note('퍼즈','불변식 위반: '+b.replace(/[0-9]+/g,'#').slice(0,50),b,`seed ${s} · 선택 ${trail.join(' ')}`); break }
      const G=h.G(), t=G.day*10+G.slot; if(t<lastTime) note('퍼즈','시간이 거꾸로 감',`${lastTime}→${t}`,`seed ${s} · 선택 ${trail.join(' ')}`); lastTime=t;
      if(h.S().turns===turns){ free++; if(free>20) { note('퍼즈','시간이 흐르지 않는 행동이 20번 넘게 이어짐',trail.slice(-5).join(' '),`seed ${s}`); break } } else free=0;
    }
    if(!h.G().ending&&st>=500) note('퍼즈','500수 안에 판이 끝나지 않음','',`seed ${s} · 선택 ${trail.slice(0,20).join(' ')}…`);
    maxTurns=Math.max(maxTurns,h.S().turns);
  }
  return {runs:steps,maxTurns};
}

/* ---------- 5. 전수 탐색: 모든 구역·선택지·엔딩을 한 번씩 밟는다 ---------- */
// 난수를 세 가지로 고정해 판정을 결정적으로 만든다: never(조우 없음) · evade(조우하지만 안 물림) · bite(조우하면 항상 물림)
function explore(opts){
  const {mode,fullDepth,beam}=opts;
  const h=createGame(); h.run('save=()=>true'); h.begin(1); h.ctx.__c=0;
  h.run(mode==='never'?'rng=()=>0.99':mode==='bite'?'rng=()=>0':'rng=()=>(__c++%2===0?0:0.99)');
  const W=h.world, snap=()=>JSON.stringify(h.G()), tk=()=>h.run('TALK_OPEN');
  const keyOf=()=>{ const {log,pend,char,...r}=h.G(); return JSON.stringify(r)+'|'+tk() };
  const restore=(s,t)=>{ h.ctx.__s=s; h.ctx.__t=t; h.run('G=JSON.parse(__s);TALK_OPEN=__t;resetQueue();G.pend=0;__c=0') };
  const seen=new Set([keyOf()]), pairs=new Set(), ends={}, zonesSeen=new Set(), gifts=new Set(), routes=new Set();
  let layer=[[snap(),false]], turn=0, total=1, truncated=false, bad=0;
  const rr=mulberry32(123);
  const note2=(why,detail)=>note('전수 탐색('+mode+')',why,detail,'탐색 중 발견');
  while(layer.length){
    const next=[]; let cur=layer;
    while(cur.length){
      const [s,t]=cur.pop(); restore(s,t);
      const loc=h.G().loc, ids=h.choices();
      if(!ids.length&&!h.G().ending) note2('진행 불가: 선택지가 비었음',s.slice(0,160));
      for(const id of ids){
        pairs.add((/^move:|^look:|^rest:/.test(id)?loc:'*')+'|'+id);
        restore(s,t); const before=h.S().turns;
        try{ h.pick(id); h.drain() }catch(e){ note2('선택 실행 중 예외: '+id,String(e&&e.stack||e).slice(0,200)); continue }
        const consumed=h.S().turns!==before, k=keyOf();
        if(seen.has(k)) continue; seen.add(k); total++;
        const b=h.inv(false); if(b.length&&bad<20){ bad++; for(const x of b) note2('불변식 위반: '+x.replace(/[0-9]+/g,'#').slice(0,50),x) }
        const g=h.G(); zonesSeen.add(g.loc); for(const sv of Object.keys(g.surv)) if(g.surv[sv].gift) gifts.add(sv);
        if(g.ending){ const e=ends[g.ending]; const tt=turn+(consumed?1:0); if(e===undefined||tt<e.turns) ends[g.ending]={turns:tt,route:g.route,trail:null}; routes.add(g.ending+'@'+g.route) ; continue }
        (consumed?next:cur).push([snap(),tk()]);
      }
    }
    turn++;
    layer=next;
    if(layer.length>beam&&turn>=fullDepth){ truncated=true; for(let i=layer.length-1;i>0;i--){ const j=Math.floor(rr()*(i+1)); [layer[i],layer[j]]=[layer[j],layer[i]] } layer.length=beam }
    if(turn>W.times*W.lastDay) break;
  }
  return {mode,total,turns:turn,truncated,ends,pairs,zonesSeen:[...zonesSeen],gifts:[...gifts],routes:[...routes]};
}
function expectedPairs(W){
  const e=new Set();
  for(const z of Object.keys(W.adj)){ for(const n of W.adj[z]) e.add(z+'|move:'+n); e.add(z+'|look:'); e.add(z+'|rest:') }
  for(const id of ['talk:','talk:comfort','talk:concern','talk:joke','talk:x','escape:','cure:','route:front','route:rear','route:roof','route:']) e.add('*|'+id);
  for(const sv of W.survivors){ e.add('*|chat:'+sv.id); for(const t of ['ask','info','joke','x']) e.add(`*|chat:${sv.id}:${t}`) }
  return e;
}
function checkExplore({fullDepth,beam}){
  const modes=['never','evade','bite'], res=modes.map(m=>explore({mode:m,fullDepth,beam}));
  const W=createGame().world, exp=expectedPairs(W), got=new Set(); for(const r of res) for(const p of r.pairs) got.add(p);
  const missing=[...exp].filter(p=>!got.has(p));
  for(const m of missing) note('전수 탐색','한 번도 밟지 못한 (구역|선택지): '+m,'세 가지 난수 고정 모드 어디서도 목록에 나타나지 않음 — 도달 불가이거나 탐색이 잘렸을 수 있음','explore');
  return {res,missing,expected:exp.size,covered:exp.size-missing.length};
}


/* ---------- 6. 규칙 경계 점검(코드 규칙이 낳는 어색한 상황을 재현) ---------- */
function checkProbes(h){
  let n=0;
  // (1) 마지막 시간대의 행동으로 출구에 도착하면, 탈출 선택지를 보기도 전에 timeout이 된다
  h.begin(1); h.run("G.day=LAST_DAY;G.slot=TIMES.length-1;G.loc='garden';G.items=['gateKey'];G.route='rear';G.zs.garden.seen=true;rng=()=>0.99"); h.pick('move:gate'); h.tap(); n++;
  if(h.G().ending==='timeout'&&h.G().loc==='gate'&&h.G().items.includes('gateKey')) note('규칙 경계','마지막 행동으로 출구에 도착하면 탈출하지 못하고 timeout (탈출 버튼이 나오지 않음)','4일차 밤에 열쇠를 들고 놀이터에서 후문으로 이동하면 도착과 동시에 시간이 끝나 「닫힌 단지」가 된다. 탈출은 시간이 들지 않는 행동인데도 마지막 행동 뒤에는 누를 수 없다. 의도라면 안내 문구가 필요하고, 아니라면 timeout 판정 전에 canEscape()를 확인하면 된다.','h.begin(1) 후 day=4, slot=3, loc=garden, items=[gateKey], route=rear 로 두고 move:gate (시드 무관)');
  // (2) 식량·물로 체력이 깎이는 일이 가능한가: 아무것도 하지 않고 쉬기만 해 본다
  h.begin(1); h.run('rng=()=>0.99'); let guard=0; while(!h.G().ending&&guard++<30){ h.pick('rest:'); h.tap() } n++;
  const g=h.G(); if(h.S().starve===0) note('규칙 경계',`굶주림·갈증 피해는 도달할 수 없음 (끝까지 쉬어도 식량 ${g.food}·물 ${g.water} 남음)`,`시작 식량·물 6, 하루가 바뀌는 횟수는 최대 3번이라 식량·물은 최소 3이 남는다. 식량·물을 얻는 수색(상가 +2, 자취방 +1, 정원 +1 등)과 BASE 수치가 사실상 장식이다.`,'아무것도 하지 않고 rest:만 14번 (조우 없는 난수)');
  return {runs:n};
}

/* ---------- 실행 ---------- */
function main(){
  const a=process.argv, arg=(k,d)=>{ const i=a.indexOf(k); return i<0?d:+a[i+1] };
  const o={seed:arg('--seed',1),save:arg('--save',60),fuzz:arg('--fuzz',3000),explore:arg('--explore',9),beam:arg('--beam',40000)};
  const outIdx=a.indexOf('--out'), out=outIdx<0?null:a[outIdx+1];
  const h=createGame(), L=[], t0=Date.now(), sec=()=>((Date.now()-t0)/1000).toFixed(0)+'s';
  L.push(`# 한빛 안정성 검사 (seed ${o.seed})\n`);
  const r1=checkSaveLoad(h,{seed:o.seed,games:o.save,specs:['yumin-first','completionist','cautious:front','random']});
  L.push(`- 저장→불러오기→이어하기: ${r1.runs}회 시험, 불일치 ${r1.fail}회`); console.error('저장 검사 끝',sec());
  const r2=checkOldSaves(h,{seed:o.seed}); L.push(`- 옛 저장·깨진 저장: ${r2.runs}회 시험`);
  const r3=checkBadInput(h); L.push(`- 이상한 입력: ${r3.runs}가지 시험`);
  const r4=checkFuzz(h,{seed:o.seed,games:o.fuzz}); L.push(`- 퍼즈: 무작위 선택 ${r4.runs}수, 판 ${o.fuzz}개(가장 긴 판 ${r4.maxTurns}시간대)`); console.error('퍼즈 끝',sec());
  const r6=checkProbes(h); L.push(`- 규칙 경계 점검: ${r6.runs}가지`);
  const r5=checkExplore({fullDepth:o.explore,beam:o.beam});
  for(const r of r5.res) L.push(`- 전수 탐색(${r.mode}): 서로 다른 상태 ${r.total}개${r.truncated?` (깊어지면 층마다 ${o.beam}개만 표본 탐색)`:' 전부 탐색'}, 도달 엔딩 ${Object.entries(r.ends).map(([k,v])=>`${k}(최소 ${v.turns}시간대)`).join(', ')||'없음'}, 선물 받은 생존자 ${r.gifts.join('·')||'없음'}`);
  L.push(`- 선택지 덮개: 밟은 (구역|선택지) ${r5.covered}/${r5.expected}`);
  L.push(`- 방문한 구역: ${[...new Set(r5.res.flatMap(r=>r.zonesSeen))].length}/${h.world.zones.length}`);
  L.push('\n## 발견 사항\n');
  if(!findings.length) L.push('발견된 문제 없음.'); else for(const f of findings) L.push(`- **[${f.check}] ${f.title}** (${f.count}회)\n  - 내용: ${f.detail||'-'}\n  - 재현: ${f.repro||'-'}`);
  const text=L.join('\n')+'\n'; if(out) fs.writeFileSync(out,text); else console.log(text);
  console.error(`끝 (${sec()}) 발견 ${findings.length}건`);
  process.exit(findings.length&&!process.argv.includes('--report-only')?1:0);
}
if(require.main===module) main();
module.exports={checkProbes,checkSaveLoad,checkOldSaves,checkBadInput,checkFuzz,checkExplore,explore,findings};

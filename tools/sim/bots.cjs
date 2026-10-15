'use strict';
// 봇 전략. 봇은 buildChoices()가 준 선택지 id 중에서만 고른다. 규칙은 복제하지 않고,
// 필요한 판단(대화 효과 등)은 V.peek()로 실제 게임 코드를 한 수 앞서 돌려 보고 정한다.
// V: { h, W, ids, has(id), G(), rnd(), enc(zone), peek(kind,arg), left() }
const ROUTE_IDS=['front','rear','roof'];

/* ---------- 길 찾기 ---------- */
function shortest(V,from,to,cost){
  const adj=V.W.adj, c=cost||(n=>1+0.001*V.risk[n]);
  const dist={[from]:0}, prev={}, todo=new Set([from]);
  while(todo.size){
    let u=null; for(const x of todo) if(u===null||dist[x]<dist[u]) u=x;
    todo.delete(u); if(u===to) break;
    for(const n of adj[u]){ const d=dist[u]+c(n); if(dist[n]===undefined||d<dist[n]-1e-12){ dist[n]=d; prev[n]=u; todo.add(n) } }
  }
  if(dist[to]===undefined) return null;
  const path=[]; for(let x=to;x!==from;x=prev[x]) path.unshift(x);
  return path;                       // from을 뺀 경로
}
const steps=(V,a,b)=>a===b?0:shortest(V,a,b).length;
function stepToward(V,to,cost){
  const G=V.G(); if(G.loc===to) return null;
  const id='move:'+shortest(V,G.loc,to,cost)[0];
  return V.has(id)?id:null;
}

/* ---------- 탈출 준비 ---------- */
const missingItems=(V,route)=>V.W.routes[route].need.filter(x=>!V.G().items.includes(x));
const itemZone=(V,item)=>Object.keys(V.W.loot).find(z=>(V.W.loot[z].items||[]).includes(item));
/* 탈출까지 필요한 시간대 행동 수(이동+수색). 방법이 없으면 Infinity */
function needActions(V,route){
  const G=V.G(), R=V.W.routes[route];
  let loc=G.loc, n=0;
  const zs=[...new Set(missingItems(V,route).map(i=>itemZone(V,i)))];
  while(zs.length){
    zs.sort((a,b)=>steps(V,loc,a)-steps(V,loc,b));
    const z=zs.shift(); if(G.zs[z].searched) return Infinity;
    n+=steps(V,loc,z)+1; loc=z;
  }
  return n+steps(V,loc,R.at);
}
function routePathZones(V,route){            // 방을 뺀, 경로상의 구역들
  const G=V.G(), R=V.W.routes[route]; let loc=G.loc; const out=[];
  const zs=[...new Set(missingItems(V,route).map(i=>itemZone(V,i)))];
  while(zs.length){ zs.sort((a,b)=>steps(V,loc,a)-steps(V,loc,b)); const z=zs.shift(); out.push(...shortest(V,loc,z)); loc=z }
  out.push(...shortest(V,loc,R.at)); return out;
}
function chooseRoute(V,spec){
  if(ROUTE_IDS.includes(spec)) return spec;
  let best=null,bc=Infinity;                  // 'safest': 경로에 놓인 구역들의 조우 확률 합이 가장 작은 길
  for(const r of ROUTE_IDS){ const c=routePathZones(V,r).reduce((s,z)=>s+V.enc(z),0)+0.001*needActions(V,r); if(c<bc){ bc=c; best=r } }
  return best;
}
function setRouteChoice(V,route){
  const G=V.G(); if(G.route===route) return null;
  if(V.has('route:'+route)) return 'route:'+route;
  if(G.route&&V.has('route:')) return 'route:';
  return stepToward(V,'room');               // 경로는 자취방에서만 정할 수 있다
}
function stepEscape(V,route,cost){
  const G=V.G(), R=V.W.routes[route];
  const r=setRouteChoice(V,route); if(r) return r;
  const miss=missingItems(V,route);
  if(!miss.length){ if(G.loc===R.at) return V.has('escape:')?'escape:':null; return stepToward(V,R.at,cost) }
  const zs=[...new Set(miss.map(i=>itemZone(V,i)))].sort((a,b)=>steps(V,G.loc,a)-steps(V,G.loc,b));
  const z=zs[0];
  if(G.loc===z) return !G.zs[z].searched&&V.has('look:')?'look:':null;
  return stepToward(V,z,cost);
}

/* ---------- 감염 대처 ----------
   반환: 선택지 id, 'ESCAPE'(약을 못 구하니 서둘러 나간다), 또는 null(신경 쓰지 않음) */
function infection(V,route,eager){
  const G=V.G(); if(!G.infection) return null;
  const left=G.infection.left, need=needActions(V,route);
  if(G.meds>0&&V.has('cure:')&&(eager||need>left-1)) return 'cure:';
  if(G.meds===0&&(eager||need>left-1)){
    if(!G.zs.shop.searched&&steps(V,G.loc,'shop')+2<=left){            // 상가에서 응급약을 구한다
      if(G.loc==='shop'&&V.has('look:')) return 'look:';
      const m=stepToward(V,'shop'); if(m) return m;
    }
    if(eager) return 'ESCAPE';
  }
  return null;
}
const infStep=(V,route,eager)=>{ const r=infection(V,route,eager); return r==='ESCAPE'?(stepEscape(V,route)||'rest:'):r };

/* ---------- 대화 고르기(미리보기) ---------- */
const YUMIN_OPTS=[['talk','joke'],['talk','concern'],['talk','comfort'],['rest','']];
function bestYumin(V){
  let best=null;
  for(const [k,a] of YUMIN_OPTS){
    const p=V.peek(k,a), s=p.dAff*100+p.dHp*5;
    if(!best||s>best.s) best={k,a,s,dAff:p.dAff};
  }
  return best;
}
const inMenu=V=>V.ids.some(i=>i==='talk:x'||/^chat:\w+:x$/.test(i));
function menuPick(V){                          // 열려 있는 대화 메뉴에서 호감이 가장 오르는 항목
  const G=V.G(); let best=null;
  for(const id of V.ids){
    if(/:x$/.test(id)||!/^(talk|chat):/.test(id)) continue;
    const m=id.match(/^talk:(\w+)$/), c=id.match(/^chat:(\w+):(\w+)$/);
    let d;
    if(m){ d=V.peek('talk',m[1]).dAff }
    else if(c){ d=V.peek('chat',c[1]+':'+c[2]).survAff[c[1]]-G.surv[c[1]].aff }
    else continue;
    if(!best||d>best.d) best={id,d};
  }
  const close=V.ids.find(i=>/:x$/.test(i));
  return best&&best.d>0?best.id:close;
}

/* ---------- 전략 ---------- */
const BOTS={};

BOTS['random']=()=>({ decide:V=>V.ids[Math.floor(V.rnd()*V.ids.length)] });

// 후문(또는 지정한 길)로 최단 거리 수색 후 탈출. 유민은 무시. = 경로별 최적(휴리스틱) 봇
function rush(route){ return ()=>({ decide:V=>{
  if(inMenu(V)) return V.ids.find(i=>/:x$/.test(i));
  const inf=infStep(V,route,false); if(inf) return inf;
  return stepEscape(V,route)||'rest:';
}})}
BOTS['greedy-escape']=rush('rear');
BOTS['rush-front']=rush('front');
BOTS['rush-rear']=rush('rear');
BOTS['rush-roof']=rush('roof');

// 유민을 먼저 설득해 동행시키고 호감을 올린 뒤, 가장 안전한 길로 탈출
function yuminFirst(spec){ return ()=>{ let route=null; return { decide:V=>{
  const G=V.G(), y=G.comp.yumin, thr=V.W.affLv[V.W.escLevel];
  if(inMenu(V)) return menuPick(V);
  if(!route) route=chooseRoute(V,spec);
  const inf=infStep(V,route,true); if(inf) return inf;
  const need=needActions(V,route), left=V.left();
  const ready=y.joined&&y.aff>=thr;
  if(ready||left-1<=need) return stepEscape(V,route)||'rest:';
  if(G.route!==route){ const r=setRouteChoice(V,route); if(r) return r }
  if(!y.met||(!y.joined&&G.loc!=='stairs')) return stepToward(V,'stairs')||'rest:';
  if(y.joined){                                // 동행 중이면 가장 안전한(좀비 0마리) 곳에서 호감을 올린다
    const calm=V.W.zones.map(z=>z.id).filter(z=>V.enc(z)===0);
    if(!calm.includes(G.loc)){
      calm.sort((a,b)=>steps(V,G.loc,a)-steps(V,G.loc,b)||(a===V.W.routes[route].at?-1:0));
      if(calm.length&&G.hp>=4) return stepToward(V,calm[0])||'rest:';
    }
  }
  const b=bestYumin(V);
  if(b.k==='rest') return 'rest:';
  return V.has('talk:')?'talk:':'rest:';
}}}}
for(const s of ['safest',...ROUTE_IDS]) BOTS[s==='safest'?'yumin-first':'yumin-first:'+s]=yuminFirst(s);

// 위험도가 낮은 곳 위주로 움직이고, 소음이 높거나 다쳤으면 쉬는 봇
function cautious(spec){ return ()=>{ let route=null; return { decide:V=>{
  const G=V.G();
  if(inMenu(V)) return V.ids.find(i=>/:x$/.test(i));
  if(!route) route=chooseRoute(V,spec);
  const inf=infStep(V,route,true); if(inf) return inf;
  const need=needActions(V,route), left=V.left();
  if(left-1<=need+1) return stepEscape(V,route)||'rest:';
  if(G.route!==route){ const r=setRouteChoice(V,route); if(r) return r }
  const noise=G.noise[G.loc]||0;
  if(noise>=3||G.hp<=6) return 'rest:';
  const cost=n=>1+10*V.enc(n);
  const nextZ=G.route&&G.loc!==V.W.routes[route].at?shortest(V,G.loc,V.W.routes[route].at,cost)[0]:null;
  // 위험도 낮은 곳에서 하는 수색(손전등·약)은 먼저 챙긴다
  if(V.W.zones.find(z=>z.id===G.loc).risk<=2&&!G.zs[G.loc].searched&&left-1>need+2&&V.has('look:')&&G.loc!=='room') return 'look:';
  if(nextZ&&V.W.zones.find(z=>z.id===nextZ).risk>=3&&G.hp<8) return 'rest:';
  return stepEscape(V,route,cost)||'rest:';
}}}}
for(const s of ['safest',...ROUTE_IDS]) BOTS[s==='safest'?'cautious':'cautious:'+s]=cautious(s);

// 생존자 3명과 모두 친해진(선물을 받은) 뒤 탈출. 시간이 모자라면 포기하고 탈출
function completionist(spec){ return ()=>{ let route=null; return { decide:V=>{
  const G=V.G();
  if(inMenu(V)){ const close=V.ids.find(i=>/:x$/.test(i)); return menuPick(V)||close }
  if(!route) route=chooseRoute(V,spec);
  const inf=infStep(V,route,true); if(inf) return inf;
  const need=needActions(V,route), left=V.left();
  const todo=V.W.survivors.filter(s=>!G.surv[s.id].gift);
  if(!todo.length||left-1<=need+1) return stepEscape(V,route)||'rest:';
  if(G.route!==route){ const r=setRouteChoice(V,route); if(r) return r }
  todo.sort((a,b)=>steps(V,G.loc,a.zone)-steps(V,G.loc,b.zone));
  const t=todo[0];
  if(G.loc===t.zone&&G.surv[t.id].met&&V.has('chat:'+t.id)) return 'chat:'+t.id;
  return stepToward(V,t.zone)||'rest:';
}}}}
for(const s of ['safest',...ROUTE_IDS]) BOTS[s==='safest'?'completionist':'completionist:'+s]=completionist(s);

const DEFAULT_SPECS=['random','greedy-escape','rush-front','rush-roof',
  'yumin-first','yumin-first:front','yumin-first:rear','yumin-first:roof',
  'cautious','cautious:front','cautious:rear','cautious:roof',
  'completionist','completionist:front','completionist:rear','completionist:roof'];
module.exports={BOTS,DEFAULT_SPECS,ROUTE_IDS};

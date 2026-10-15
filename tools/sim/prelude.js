/* 시뮬레이터 전용 보조 코드 — hanbit.html의 게임 스크립트 뒤에 같은 vm 컨텍스트에서 실행된다.
   게임 파일은 수정하지 않는다. 게임 함수를 감싸서 "무슨 일이 있었는지"만 센다(판정·수치는 그대로). */
var __S;
function __resetStats(){
  __S={turns:0,net:0,peek:false,cur:null,log:[],exp:{},pSum:{},enc:{},bite:{},evade:{},hpLoss:[],starve:0,bites:0,infStarted:0,infZone:null,
       cures:0,affBy:{},aff5:null,aff12:null,rngCalls:0};
}
__resetStats();
(function(){
  const oTT=takeTurn,oEnc=encounter,oAdv=advanceTime,oAff=addAff;
  let cause='';
  const bump=(o,k,v)=>{ o[k]=(o[k]||0)+(v===undefined?1:v) };
  takeTurn=function(kind,arg,logText,effect,opts){
    if(__S.peek) return oTT.apply(this,arguments);
    const g=G,y=g.comp.yumin,rec={k:kind,a:arg,z:g.loc,hp0:g.hp,aff0:y.aff,day:g.day,slot:g.slot,inf0:!!g.infection};
    __S.cur=rec; cause=kind+':'+arg;
    const r=oTT.apply(this,arguments);
    __S.cur=null;
    if(r!==false){
      __S.turns++;
      const y1=G.comp.yumin; rec.hp1=G.hp; rec.aff1=y1.aff; rec.z1=G.loc;
      if(__S.aff5===null&&y1.joined&&y1.aff>=AFF_LV[JOIN_LEVEL]) __S.aff5=__S.turns;
      if(__S.aff12===null&&y1.aff>=AFF_LV[ESC_LEVEL]) __S.aff12=__S.turns;
      if(kind==='cure'&&rec.inf0&&!G.infection) __S.cures++;
      if(__S.keepLog) __S.log.push(rec);
    }
    return r;
  };
  encounter=function(id,out){
    if(__S.peek) return oEnc(id,out);
    const n=out.length,p=encounterChance(id),hp0=G.hp,inf0=!!G.infection;
    bump(__S.exp,id); bump(__S.pSum,id,p);
    const prev=cause; cause='encounter';
    oEnc(id,out); cause=prev;
    if(out.length>n){
      bump(__S.enc,id);
      if(G.hp<hp0){
        bump(__S.bite,id); __S.bites++; __S.hpLoss.push('bite@'+id);
        if(!inf0&&G.infection){ __S.infStarted++; if(__S.infZone===null) __S.infZone=id }
      } else bump(__S.evade,id);
    }
  };
  advanceTime=function(out){
    if(__S.peek) return oAdv(out);
    const n=out.length; oAdv(out);
    for(let i=n;i<out.length;i++) if(/굶주림/.test(out[i].text)){ __S.starve++; __S.hpLoss.push('starve') }
  };
  addAff=function(n,out){
    if(__S.peek) return oAff(n,out);
    const y=G.comp.yumin,b=y.aff; oAff(n,out);
    let c=cause; if(c==='encounter') c=n>=2?'encounter(bite,protect)':'encounter(evade)'; else if(/^move:/.test(c)) c='move(first risk>=3 together)';
    const a=__S.affBy[c]||(__S.affBy[c]={n:0,sum:0}); a.n++; a.sum+=y.aff-b;
  };
})();
// 화면 그리기는 건너뛴다(속도). 줄 큐·저장·판정은 실제 코드 그대로.
render=()=>{}; renderChoices=()=>{}; paintText=()=>{}; paintName=()=>{}; paintMark=()=>{}; renderCast=()=>{}; paintStatic=()=>{}; castSpeak=()=>{};
// AI와 네트워크는 쓰지 않는다. 호출이 생기면 세어서 실패로 처리한다.
aiReady=()=>false;
fetch=async()=>{ __S.net++; throw new Error('sim: network call is forbidden') };
function __begin(){ busy=false; TALK_OPEN=false; UI.speed='off'; UI.auto=false; resetQueue(); __resetStats(); finishCreation(); __drain() }
function __drain(){ resetQueue(); if(G) G.pend=0 }          // 줄 큐 비우기(속도용)
function __tap(){ let n=0; while(!queueIdle()&&n++<2000){ if(Q.typing) finishTyping(); else nextLine() } }   // 한 줄씩 넘기기(저장 검사용)
function __choices(){ return buildChoices().map(c=>c.id) }
function __world(){
  return JSON.parse(JSON.stringify({zones:ZONES.map(z=>({id:z.id,risk:z.risk})),adj:ADJ,zombies:ZOMBIE_START,loot:LOOT,routes:ROUTES,items:Object.keys(ITEMS),
    affLv:AFF_LV,joinLevel:JOIN_LEVEL,escLevel:ESC_LEVEL,affMax:AFF_MAX,survLv:SURV_LV,survMax:SURV_MAX,survivors:SURVIVORS,lastDay:LAST_DAY,times:TIMES.length,
    start:START,base:BASE,biteChance:BITE_CHANCE,biteDamage:BITE_DAMAGE,infectSlots:INFECT_SLOTS,noiseMax:NOISE_MAX}));
}
function __turnsLeft(){ return (LAST_DAY-G.day)*TIMES.length+(TIMES.length-1-G.slot)+1 }
/* 한 수 앞 미리보기: 소음 판정이 없는 난수(조우 없음)로 선택을 돌려 보고 상태를 원래대로 되돌린다 */
function __peek(kind,arg){
  // 복사본 위에서 돌리고, 끝나면 원래 객체로 되돌린다(봇이 쥐고 있는 G 참조가 바뀌지 않게)
  const orig=G,talk=TALK_OPEN,disk=localStorage.getItem(SAVE_KEY),r0=rng,q=Q.pending.slice();
  const y0=orig.comp.yumin.aff,hp0=orig.hp;
  G=JSON.parse(JSON.stringify(orig));
  __S.peek=true; rng=()=>0.99;
  let res;
  try{
    ACTIONS[kind](arg);
    res={dAff:G.comp.yumin.aff-y0,dHp:G.hp-hp0,ending:G.ending,survAff:Object.fromEntries(Object.keys(G.surv).map(k=>[k,G.surv[k].aff])),gift:Object.keys(G.surv).filter(k=>G.surv[k].gift),infection:!!G.infection,meds:G.meds};
  }finally{
    __S.peek=false; rng=r0; G=orig; TALK_OPEN=talk; resetQueue(); Q.pending=q;
    if(disk===null) localStorage.removeItem(SAVE_KEY); else localStorage.setItem(SAVE_KEY,disk);
  }
  return res;
}

function __fp(){ return JSON.stringify(G,(k,v)=>k==='pend'?undefined:v) }     // 줄 큐 개수(pend)만 빼고 전부
function __qtexts(){ return (Q.typing&&Q.cur?[Q.cur]:[]).concat(Q.pending).map(l=>[l.t,l.who||'',l.text].join('|')) }
function __qafter(){ return (Q.cur?[Q.cur]:[]).concat(Q.pending).map(l=>[l.t,l.who||'',l.text].join('|')) }
/* 규칙이 항상 지켜야 하는 불변식. 어긴 항목의 설명을 배열로 돌려준다 */
function __inv(full){
  const g=G,e=[],isInt=Number.isInteger;
  try{ validateSaveData(full===false?g:JSON.parse(JSON.stringify(g))) }catch(x){ e.push('validateSaveData 실패: '+x.message) }
  if(full!==false) try{ prepareSavedGame(JSON.stringify(g)) }catch(x){ e.push('prepareSavedGame 실패: '+x.message) }
  if(!isInt(g.hp)||g.hp<0||g.hp>g.maxhp) e.push('체력 범위 밖: '+g.hp);
  for(const k of ['food','water','meds']) if(!isInt(g[k])||g[k]<0) e.push(k+' 범위 밖: '+g[k]);
  if(g.meds>2) e.push('응급약이 비정상적으로 많음: '+g.meds);
  const y=g.comp.yumin; if(!(y.aff>=0&&y.aff<=AFF_MAX)||!isInt(y.aff)) e.push('유민 호감 범위 밖: '+y.aff);
  if(y.joined&&!y.met) e.push('만나지 않았는데 동행 중');
  if(y.met&&!g.zs.stairs.seen) e.push('계단에 가지 않았는데 유민을 만남');
  for(const sv of SURVIVORS){ const o=g.surv[sv.id];
    if(!(o.aff>=0&&o.aff<=SURV_MAX)||!isInt(o.aff)) e.push(sv.id+' 호감 범위 밖: '+o.aff);
    if(!o.met&&o.aff!==0) e.push(sv.id+' 안 만났는데 호감 '+o.aff); }
  if(new Set(g.items).size!==g.items.length) e.push('아이템 중복: '+g.items.join(','));
  for(const z of ZONES){ if(g.noise[z.id]<0||g.noise[z.id]>NOISE_MAX) e.push('소음 범위 밖: '+z.id);
    if(g.zombies[z.id]!==ZOMBIE_START[z.id]) e.push('좀비 수가 바뀜: '+z.id);
    if(g.zs[z.id].searched&&!g.zs[z.id].seen) e.push('가 보지 않은 곳을 수색함: '+z.id) }
  if(g.infection!==null&&!(isInt(g.infection.left)&&g.infection.left>=0&&g.infection.left<=INFECT_SLOTS)) e.push('감염 시계 범위 밖');
  if(g.infection&&g.infection.left===0&&g.ending!=='infected') e.push('감염 시계가 0인데 엔딩이 감염이 아님: '+g.ending);
  if(g.hp===0&&g.ending!=='dead') e.push('체력 0인데 엔딩이 dead가 아님: '+g.ending);
  if(g.ending!==null&&!['dead','infected','timeout','escape_alone','escape_together'].includes(g.ending)) e.push('모르는 엔딩: '+g.ending);
  if(g.ending&&buildChoices().length) e.push('엔딩 뒤에도 선택지가 남음');
  if(!g.ending&&!buildChoices().length) e.push('진행 불가: 선택지가 비었음');
  if(g.ending==='escape_together'||g.ending==='escape_alone'){ const r=ROUTES[g.route]; if(!r||g.loc!==r.at||!r.need.every(x=>g.items.includes(x))) e.push('탈출 조건을 갖추지 않았는데 탈출 엔딩') }
  if(g.ending==='escape_together'&&!(y.joined&&affLevel(y.aff)>=ESC_LEVEL)) e.push('함께 탈출했는데 동행·호감 조건이 아님');
  if(g.ending==='escape_alone'&&y.joined&&affLevel(y.aff)>=ESC_LEVEL) e.push('조건이 맞는데 홀로 탈출');
  if(g.log.length>200) e.push('기록이 200줄을 넘음');
  return e;
}

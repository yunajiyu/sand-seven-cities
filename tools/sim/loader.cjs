'use strict';
// hanbit.html의 게임 스크립트를 node:vm에 올려 실제 규칙 그대로 돌리는 로더 (tests/_hanbit-fixture.cjs와 같은 방식).
// patches: [[바꿀 글자, 새 글자], ...] — 메모리에 올린 복사본에만 적용한다(파일은 그대로). 수치 조정 후보를 시험할 때만 쓴다.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const HTML=path.join(__dirname,'../../hanbit.html');
const START='/* 시작: 화면 설정 적용';
const PRELUDE=fs.readFileSync(path.join(__dirname,'prelude.js'),'utf8');
const {mulberry32}=require('./prng.cjs');

function gameSource(patches=[]){
  let script=fs.readFileSync(HTML,'utf8').split('<script>')[1].split('</script>')[0];
  for(const [from,to] of patches){
    const n=script.split(from).length-1;
    if(n!==1) throw new Error(`patch target must occur exactly once (found ${n}): ${from}`);
    script=script.replace(from,()=>to);
  }
  const cut=script.indexOf(START);
  if(cut<0) throw new Error('start marker missing');
  return script.slice(0,cut);
}
function element(id){
  const cls=new Set();
  return {id,style:{},dataset:{},value:'',textContent:'',innerHTML:'',title:'',disabled:false,checked:false,
    get className(){return [...cls].join(' ')},set className(v){cls.clear();String(v||'').split(/\s+/).filter(Boolean).forEach(c=>cls.add(c))},
    classList:{add:(...c)=>c.forEach(x=>cls.add(x)),remove:(...c)=>c.forEach(x=>cls.delete(x)),contains:c=>cls.has(c),toggle:(c,on)=>{const v=on===undefined?!cls.has(c):!!on;v?cls.add(c):cls.delete(c);return v}},
    addEventListener(){},removeEventListener(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},appendChild(){},remove(){},focus(){},click(){},querySelector(){return null},querySelectorAll(){return []}};
}

/* 게임 하나를 올린 핸들. 같은 핸들로 판을 여러 번 새로 시작할 수 있다(판마다 상태는 완전히 새로 만든다). */
function createGame({patches=[]}={}){
  const src=gameSource(patches);
  const els=new Map(),get=id=>{if(!els.has(id))els.set(id,element(id));return els.get(id)};
  ['title','game','create'].forEach(get);
  const disk=new Map();
  const localStorage={getItem:k=>disk.has(k)?disk.get(k):null,setItem:(k,v)=>{disk.set(k,String(v))},removeItem:k=>disk.delete(k)};
  const document={getElementById:get,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:()=>element(''),body:element('body'),documentElement:Object.assign(element('html'),{style:{setProperty(){}}})};
  const mathStub=Object.create(Math); mathStub.random=()=>{ throw new Error('sim: Math.random is forbidden (use rng)') };
  const ctx=vm.createContext({console,crypto:require('node:crypto').webcrypto,TextEncoder,URLSearchParams,AbortSignal,AbortController,atob,btoa,
    setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},
    localStorage,document,window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math:mathStub,
    fetch:async()=>{throw new Error('network not stubbed')}});
  vm.runInContext(src,ctx);
  vm.runInContext(`var notices=[];toast=s=>notices.push(s);askConfirm=async()=>true;var modalHTML='';modal=(t,s)=>{modalHTML=s};console.warn=()=>{}`,ctx);
  vm.runInContext(PRELUDE,ctx);
  get('cName').value='도현';
  const run=s=>vm.runInContext(s,ctx);
  const fn={};
  for(const n of ['__begin','__drain','__tap','__choices','__world','__turnsLeft','__peek','__fp','__qtexts','__qafter','__inv']) fn[n]=run(n);
  const world=fn.__world();
  let rngFn=null;
  const h={
    ctx,run,disk,world,fn,
    get rng(){return rngFn},
    /* 새 판: 시드 하나가 게임 난수(판정)를 정한다. */
    begin(seed){
      disk.clear(); rngFn=mulberry32(seed);
      ctx.__rng=()=>{ ctx.__calls++; return rngFn() }; ctx.__calls=0;
      run('rng=__rng');
      fn.__begin();
    },
    G:()=>run('G'),
    S:()=>run('__S'),
    choices:()=>Array.from(fn.__choices()),
    pick:id=>{ run('pick')(id) },
    drain:()=>fn.__drain(),
    tap:()=>fn.__tap(),
    turnsLeft:()=>fn.__turnsLeft(),
    peek:(kind,arg)=>fn.__peek(kind,arg),
    fp:()=>fn.__fp(),inv:(full)=>Array.from(fn.__inv(full)),qtexts:()=>Array.from(fn.__qtexts()),qafter:()=>Array.from(fn.__qafter()),
    encChance:z=>run(`encounterChance(${JSON.stringify(z)})`),
    /* 현재 상태를 문자열로 (줄 기록과 줄 큐는 뺀다) */
    key(){ const g=run('G'); const {log,pend,char,...rest}=g; return JSON.stringify(rest) },
  };
  // pick은 매번 run으로 찾지 않도록 한 번만 가져온다
  const pickFn=run('pick'); h.pick=id=>pickFn(id);
  const G_get=run('(()=>G)'); h.G=()=>G_get();
  const S_get=run('(()=>__S)'); h.S=()=>S_get();
  const enc=run('encounterChance'); h.encChance=z=>enc(z);
  return h;
}
module.exports={createGame,gameSource};

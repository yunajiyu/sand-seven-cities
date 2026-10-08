// Run: node tests/hanbit-zone-names.test.cjs
// 지워진 구역·곁가지 구역 이름 무작위화 — 새 게임마다 뽑고, 코드는 정식 토큰, 화면·AI에는 이번 게임 이름
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../hanbit.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
function fixture(){
  const el={style:{},dataset:{},value:'',insertAdjacentHTML(){},remove(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},querySelectorAll(){return []},setAttribute(){},getAttribute(){return null}};
  const ctx=vm.createContext({console,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return el},querySelector(){return el},querySelectorAll(){return []},addEventListener(){},documentElement:el},window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math:Object.create(Math)});
  vm.runInContext(script.slice(0,script.indexOf('/* 시작: 화면 설정 적용')),ctx);
  return s=>vm.runInContext(s,ctx);
}
let n=0;const test=async(name,fn)=>{await fn(fixture());n++;console.log('PASS',name)};
(async()=>{
await test('pools never contain the original names or each other',async run=>{
  const pools=run('JSON.stringify(ZONE_POOLS)'),P=JSON.parse(pools),toks=Object.keys(P).map(k=>k==='널'?'널 구역':k);
  const all=Object.values(P).flat();
  assert.equal(new Set(all).size,all.length,'no name shared between slots');
  for(const v of all){for(const t of toks){assert.ok(!v.includes(t)&&!t.includes(v),v+' vs '+t)}}
  assert.doesNotMatch(all.join(' '),/한빛/);
});
await test('every new game draws a full, unique, non-overlapping set',async run=>{
  const seen=new Set();
  for(let i=0;i<200;i++){
    const z=JSON.parse(run('JSON.stringify(pickZoneNames())'));
    assert.deepEqual(Object.keys(z).sort(),['라쿠나','애시우드','브룸','칸토','움브라','엠버','널','오러리','코덱스'].sort());
    const v=Object.values(z);assert.equal(new Set(v).size,v.length);
    v.forEach((a,i)=>v.forEach((b,j)=>{if(i!==j)assert.ok(!b.includes(a))}));
    seen.add(z['라쿠나']);
  }
  assert.ok(seen.size>2,'names vary between games');
  assert.match(script,/zoneNames:pickZoneNames\(\)/,'finishCreation stores the draw');
});
await test('display/AI conversion round-trips; old saves keep the original names',async run=>{
  run(`G={zoneNames:{'라쿠나':'리멘','애시우드':'실바니','브룸':'네불라','칸토':'리라엘','움브라':'테네브','엠버':'카미나','널':'보이덴','오러리':'스텔라리','코덱스':'팔림프'}}`);
  const src='라쿠나 구역과 브룸 구역, 널 구역, 오러리 천문대, 코덱스 대열람실. 널 혼자 두지 않아.';
  const out=run('zoneOut('+JSON.stringify(src)+')');
  assert.equal(out,'리멘 구역과 네불라 구역, 보이덴 구역, 스텔라리 천문대, 팔림프 대열람실. 널 혼자 두지 않아.');
  assert.equal(run('zoneIn('+JSON.stringify(out)+')'),src);
  run('G={char:{name:"x"}}');
  assert.equal(run('zoneOut('+JSON.stringify(src)+')'),src);assert.equal(run('zoneIn("리멘 구역")'),'리멘 구역');
});
await test('AI sees only this game\'s names and replies are mapped back for the code',async run=>{
  run(`G={zoneNames:pickZoneNames(()=>0)};var sent=[];callAIRaw=async(s,u,m,r,o)=>{sent.push({s,u,o});return '{"lexAdd":[{"name":"'+G.zoneNames['라쿠나']+' 구역"}],"narration":"'+G.zoneNames['코덱스']+' 쪽"}'}`);
  const res=await run(`callAI('라쿠나 구역 '+SYS_BASE.slice(0,20),'앞 라쿠나|뒤 칸토',100,'story',{cache:true,stable:6})`);
  const s=JSON.parse(run('JSON.stringify(sent)'))[0],z=JSON.parse(run('JSON.stringify(G.zoneNames)'));
  assert.doesNotMatch(s.s+s.u,/라쿠나|칸토/);assert.ok(s.u.startsWith('앞 '+z['라쿠나']+'|'));
  assert.equal(s.o.stable,('앞 '+z['라쿠나']+'|').length,'cache split point follows the renamed text');
  assert.equal(res,'{"lexAdd":[{"name":"라쿠나 구역"}],"narration":"코덱스 쪽"}');
});
await test('the full system prompt is renamed, not just the opening',async run=>{
  run(`G={zoneNames:pickZoneNames(()=>0.5)}`);
  const sys=run('zoneOut(SYS_BASE)');
  assert.doesNotMatch(sys,/라쿠나|애시우드|브룸 구역|칸토 구역|움브라|엠버 구역|널 구역|오러리|코덱스/);
});
await test('player-typed game names are understood as the original places',async run=>{
  run(`G={zoneNames:pickZoneNames(()=>0),loc:'campus',char:{name:'t'}};busy=false;var got=null;story=(t)=>{got=t};indirectMove=()=>false;compoundMove=()=>false;movementCandidates=()=>[]`);
  const z=JSON.parse(run('JSON.stringify(G.zoneNames)'));
  run('act('+JSON.stringify(z['브룸']+' 구역 소문을 떠올린다')+')');
  assert.equal(run('got'),'브룸 구역 소문을 떠올린다');
});
console.log(n+' passed');
})().catch(e=>{console.error(e);process.exit(1)});

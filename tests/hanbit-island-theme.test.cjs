// Run: node tests/hanbit-island-theme.test.cjs
// 요양원판 세계관 층: 코드는 학교판 말, 화면·AI에는 섬 요양원 말 (조사는 받침에 맞게), AI 응답·플레이어 글은 되돌린다
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../hanbit.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const el={style:{},dataset:{},value:'',insertAdjacentHTML(){},remove(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},querySelectorAll(){return []},setAttribute(){},getAttribute(){return null}};
const ctx=vm.createContext({console,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return el},querySelector(){return el},querySelectorAll(){return []},addEventListener(){},documentElement:el},window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math:Object.create(Math)});
vm.runInContext(script.slice(0,script.indexOf('/* 시작: 화면 설정 적용')),ctx);
const run=s=>vm.runInContext(s,ctx);
const T=JSON.parse(run('JSON.stringify(THEME_TERMS)')),src=T.map(x=>x[0]),tgt=T.map(x=>x[1]);
for(const t of tgt)for(const s of src)assert.ok(!t.includes(s),`target 「${t}」 contains source 「${s}」 (would re-map forever on screen)`);
assert.equal(run(`zoneOut('학교를 나와 저수지로 간다. 담임과 이야기한다. 수업을 듣는다.')`),'요양원을 나와 바다로 간다. 수간호사님과 이야기한다. 근무를 선다.');
assert.equal(run(`zoneIn('식당에서 입소자 명부를 펼치고 근무 경고를 받았다')`),'급식실에서 출석부를 펼치고 벌점을 받았다');
assert.match(run('SYS_BASE'),/외딴 섬의 요양원/);assert.match(run('SYS_BASE'),/23세 신입 직원/);assert.match(run('SYS_BASE'),/24세 간호사/);
assert.match(run('YUMIN_DEFAULT.job'),/간호사/);
run(`G={zoneNames:pickZoneNames()}`);const z=JSON.parse(run('JSON.stringify(G.zoneNames)'));
for(const v of Object.values(z))assert.match(v,/^[가-힣]+$/,'zone names are Korean-style');
console.log('PASS island theme layer');

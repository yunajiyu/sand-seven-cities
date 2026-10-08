// Run: node tests/hanbit-calling.test.cjs
// 유민의 호칭 — 매번 이름을 부르지 않고 관계 단계에 따라, 성 붙인 이름은 코드가 고친다
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../hanbit.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
function fixture(){
  const el={style:{},dataset:{},value:'',insertAdjacentHTML(){},remove(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},querySelectorAll(){return []},setAttribute(){},getAttribute(){return null}};
  const ctx=vm.createContext({console,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return el},querySelector(){return el},querySelectorAll(){return []},addEventListener(){},documentElement:el},window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math:Object.create(Math)});
  vm.runInContext(script.slice(0,script.indexOf('/* 시작: 화면 설정 적용')),ctx);
  const run=s=>vm.runInContext(s,ctx);
  run(`G={v:1,_relVersion:2,_clockVersion:2,char:{name:'박지우',age:17,stats:{str:1,wis:1,cha:1,sur:1},traits:[]},day:1,time:'낮',loc:'campus',hp:10,maxhp:10,calm:5,battery:6,torch:0,cash:0,items:[],act:1,rel:{},chronicle:[],lexicon:[],log:[],recent:[],choices:[]};migrate();G.comp.met=true;getRel('유민')`);
  return run;
}
let n=0;const test=(name,fn)=>{fn(fixture());n++;console.log('PASS',name)};
test('no fixed "도현아" or name-every-line rule is sent to the AI',run=>{
  assert.doesNotMatch(run('SYS_BASE'),/"도현아"처럼|플레이어 이름 \+ "너"/);
  assert.doesNotMatch(run('YUMIN_DEFAULT.speech'),/"\{이름\}" \+ "너"/);
  assert.match(run('SYS_BASE'),/매 대사마다 부르지 않는다/);
});
test('calling follows the relationship stage and uses the given name with the right particle',run=>{
  run("getRel('유민').stage=0");let t=run('yuminProfile()');
  assert.match(t,/이름으로 부르지 않는다/);assert.doesNotMatch(t,/박지우|"지우야"/);
  run("getRel('유민').stage=2");t=run('yuminCallText()');assert.match(t,/"지우야"/);assert.match(t,/호칭 없이/);
  run("getRel('유민').stage=4");t=run('yuminCallText()');assert.match(t,/별명/);
});
test('old saves with the previous default speech are updated, custom speech is kept',run=>{
  run("G.comp.profile.speech=YUMIN_SPEECH_V1;migrate()");assert.equal(run('G.comp.profile.speech'),run('YUMIN_DEFAULT.speech'));
  run("G.comp.profile.speech='내가 직접 쓴 말투';migrate()");assert.equal(run('G.comp.profile.speech'),'내가 직접 쓴 말투');
});
test('full-name calls are still corrected on screen',run=>{
  assert.equal(run('fixCalling(\'"박지우야, 이리 와."\')'),'"지우야, 이리 와."');
});
console.log(n+' passed');

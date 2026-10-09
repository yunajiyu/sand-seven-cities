// Run: node tests/hanbit-npc-talk-button.test.cjs
// 약속 장소에 가면 약속한 인물에게 말 걸기 버튼이 보인다 (예전에는 버튼이 없어 글로만 대화할 수 있었다)
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../hanbit.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
function fixture(){
  const el={style:{},dataset:{},value:'',insertAdjacentHTML(){},remove(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},querySelectorAll(){return []},setAttribute(){},getAttribute(){return null}};
  const ctx=vm.createContext({console,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return el},querySelector(){return el},querySelectorAll(){return []},addEventListener(){},documentElement:el},window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math:Object.create(Math)});
  vm.runInContext(script.slice(0,script.indexOf('/* 시작: 화면 설정 적용')),ctx);
  const run=s=>vm.runInContext(s,ctx);
  run(`addLog=()=>{};toast=()=>{};render=()=>{};save=()=>{};var turns=[];aiTurn=async(...a)=>turns.push(a);
    G={v:1,_relVersion:2,_clockVersion:2,char:{name:'테스트',age:17,stats:{str:1,wis:1,cha:1,sur:1},traits:[]},day:2,time:'낮',dayStep:0,loc:'campus',district:'classroom',steps:0,hp:10,maxhp:10,calm:5,battery:6,torch:0,cash:0,items:[],act:1,rel:{},chronicle:[],lexicon:[{name:'서연',cat:'인물',desc:'반 친구'}],log:[],recent:[],choices:[]};migrate();getRel('서연').aff=100;busy=false;`);
  return run;
}
let n=0;const test=(name,fn)=>{fn(fixture());n++;console.log('PASS',name)};
test('at the appointment place and time, a talk button for that person appears and works',run=>{
  assert.equal(run(`setAppt('서연','campus:market','방과 후')`),true);
  run(`G.district='market';G.spot=null`);assert.doesNotMatch(run('fixedHTML()'),/서연에게 말 걸기 \(약속\)/,'no appointment button before the time');
  run(`G.district='classroom'`);assert.match(run('fixedHTML()'),/💬 서연에게 말 걸기/,'a classmate in the classroom can be talked to too');
  run(`G.time='방과 후';G.district='market';G.spot=null`);
  const h=run('fixedHTML()');assert.match(h,/💬 서연에게 말 걸기 \(약속\)/);
  run(`visitNPC('서연')`);assert.equal(run('turns.length'),1);
});
test('the button only shows people who are actually here',run=>{
  run(`setAppt('서연','campus:market','방과 후');G.time='방과 후';G.district='library';G.spot=null`);
  assert.doesNotMatch(run('fixedHTML()'),/서연에게 말 걸기/);
});
console.log(n+' passed');

// Run: node tests/hanbit-case-here.test.cjs
// 「마음에 걸리는 것」에 뜬 장소에 가면 그 일을 직접 알아보는 버튼이 생긴다
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../hanbit.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
function fixture(){
  const el={style:{},dataset:{},value:'',insertAdjacentHTML(){},remove(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},querySelectorAll(){return []},setAttribute(){},getAttribute(){return null}};
  const ctx=vm.createContext({console,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return el},querySelector(){return el},querySelectorAll(){return []},addEventListener(){},documentElement:el},window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math:Object.create(Math)});
  vm.runInContext(script.slice(0,script.indexOf('/* 시작: 화면 설정 적용')),ctx);
  const run=s=>vm.runInContext(s,ctx);
  run(`addLog=()=>{};toast=()=>{};render=()=>{};save=()=>{};var told=[];story=(t,o)=>told.push({t,note:PENDING.note});
    G={v:1,_relVersion:2,_clockVersion:2,char:{name:'테스트',age:17,stats:{str:1,wis:1,cha:1,sur:1},traits:[]},day:2,time:'방과 후',dayStep:0,loc:'campus',district:'classroom',steps:0,hp:10,maxhp:10,calm:5,battery:6,torch:0,cash:0,items:[],act:1,rel:{},chronicle:[],lexicon:[],log:[],recent:[],choices:[]};migrate();G.spot=null;busy=false;PENDING={note:'',flags:{}};
    addCanon('교실 뒤 사물함이 밤마다 열려 있다',true,true,{kind:'fact',placeId:'campus:classroom'});`);
  return run;
}
let n=0;const test=(name,fn)=>{fn(fixture());n++;console.log('PASS',name)};
test('at the place of an open case, a look-into button appears and asks the scene to advance that case',run=>{
  assert.match(run('fixedHTML()'),/🔎 이곳에서 있었던 일 알아보기/);
  const id=run('casesHere()[0].id');assert.equal(run(`lookIntoCase('${id}')`),true);
  const t=JSON.parse(run('JSON.stringify(told)'))[0];assert.match(t.note,new RegExp('case_id "'+id+'"'));assert.match(t.note,/사물함/);
  assert.doesNotMatch(run('fixedHTML()'),/이곳에서 있었던 일 알아보기/,'once per day');
  run('G.day=3');assert.match(run('fixedHTML()'),/이곳에서 있었던 일 알아보기/);
});
test('elsewhere there is no button; an unchecked rumor here gets its own check button',run=>{
  run(`G.district='library'`);assert.doesNotMatch(run('fixedHTML()'),/이곳에서 있었던 일 알아보기/);
  run(`addCanon('도서관 서가 끝에서 발소리가 난다는 소문',true,true,{kind:'rumor',placeId:'campus:library'})`);
  assert.match(run('fixedHTML()'),/🔎 소문 확인: 「도서관 서가 끝에서/);
});
console.log(n+' passed');
{const run=fixture();
 run(`G.district='library'`);let card=run('caseCard(threadsOpen()[0])');
 if(!/가서 알아보기/.test(card)) throw Error('board card should offer going there: '+card.slice(0,300));
 const id=run('threadsOpen()[0].id');run(`goCaseAndLook('${id}')`);
 if(run('G.district')!=='classroom'||run('told.length')!==1) throw Error('go-and-look should move and start the scene');
 card=run('caseCard(threadsOpen()[0])'); if(!/오늘은 이미 알아봄/.test(card)) throw Error('once per day');
 console.log('PASS board card go-and-look button');}

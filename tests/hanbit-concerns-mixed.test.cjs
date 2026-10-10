// Run: node tests/hanbit-concerns-mixed.test.cjs
// 「지금 마음에 걸리는 것」에 진행 단서와 곁가지 거리를 같은 말투로 섞고, 순서를 날마다 바꾼다
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../hanbit.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
function fixture(){
  const el={style:{},dataset:{},value:'',insertAdjacentHTML(){},remove(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},querySelectorAll(){return []},setAttribute(){},getAttribute(){return null}};
  const ctx=vm.createContext({console,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return el},querySelector(){return el},querySelectorAll(){return []},addEventListener(){},documentElement:el},window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math:Object.create(Math)});
  vm.runInContext(script.slice(0,script.indexOf('/* 시작: 화면 설정 적용')),ctx);
  const run=s=>vm.runInContext(s,ctx);
  run(`addLog=()=>{};toast=()=>{};render=()=>{};save=()=>{};
    const plan={truth:'x',detail:'x',opening:'o',roster:'r',lacuna_intel:['a1 aaaa','b1 bbbb','c1 cccc'],rumors:[],chapters:[{key:'lacuna'},{key:'c0'},{key:'c1'}]},S=JSON.stringify(plan);
    G={v:1,_relVersion:2,_clockVersion:2,campaign:{version:1,links:{},introSolved:false,introHeard:true,world:{status:'ready',sealed:S,hash:mysteryHash(S)}},char:{name:'테스트',age:17,stats:{str:1,wis:1,cha:1,sur:1},traits:[]},day:1,time:'낮',loc:'campus',steps:0,hp:10,maxhp:10,calm:5,battery:6,torch:0,cash:0,items:[],act:1,rel:{},chronicle:[],lexicon:[],log:[],recent:[],choices:[]};
    migrate();G.district=Object.keys(DISTRICTS)[0];G.spot=null;`);
  return run;
}
let n=0;const test=(name,fn)=>{fn(fixture());n++;console.log('PASS',name)};
const J=(run,s)=>JSON.parse(run('JSON.stringify('+s+')'));
test('the progress clue is mixed with side leads and its position changes by day',run=>{
  run(`addCanon('상점가 자판기가 밤마다 혼자 켜진다는 소문',true,true,{kind:'rumor',placeId:'campus:market'});G.leads.push({id:'L1',name:'닫힌 구 체육관'})`);
  const main=run('campaignPublic().next'),pos=new Set();
  for(let d=1;d<=30;d++){run('G.day='+d);const c=J(run,'concerns()');assert.ok(c.length>=2&&c.length<=3);assert.ok(c.includes(main));pos.add(c.indexOf(main))}
  assert.ok(pos.size>1,'main clue is not always in the same slot');
  const panel=run('campaignPanel()');assert.doesNotMatch(panel,/본편|필수|곁가지|교내 소문/);
});
test('on a fresh game nothing invented is mixed in; real encounters are',run=>{
  assert.deepEqual(J(run,'concerns()'),[run('campaignPublic().next')],'only the progress clue on day one');
  run("G.comp.met=true");const c=J(run,'concerns()');assert.equal(c.length,2);assert.ok(c.some(t=>/유민이 무심코 흘린 말/.test(t)));
  assert.doesNotMatch(run('campaignPanel()'),/쉬는 시간에 들은 이야기|게시판에 붙은 낡은 쪽지/);
});
test('the always-visible label never shows the stage name',run=>{
  run(`G.loc='campus';busy=false`);const h=run('fixedHTML()');
  assert.doesNotMatch(h,/🧭 교내 소문|🧭 <b>/);
  assert.doesNotMatch(run('socialHelpText()'),/지금 목표는/);
});
test('inside a site only that site\'s own progress is shown',run=>{
  run(`G.site={name:'x',rooms:[{id:'r1',name:'a',exits:[]}],cur:'r1'};G.loc='site'`);
  assert.equal(J(run,'concerns()').length,1);
});
console.log(n+' passed');

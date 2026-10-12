// Run: node tests/hanbit-clearer-cases.test.cjs
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../hanbit.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const el={style:{},dataset:{},value:'',insertAdjacentHTML(){},remove(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},querySelectorAll(){return []},setAttribute(){},getAttribute(){return null}};
const ctx=vm.createContext({console,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return el},querySelector(){return el},querySelectorAll(){return []},addEventListener(){},documentElement:el},window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math:Object.create(Math)});
vm.runInContext(script.slice(0,script.indexOf('/* 시작: 화면 설정 적용')),ctx);
const run=s=>vm.runInContext(s,ctx);
run(`addLog=()=>{};toast=()=>{};render=()=>{};save=()=>{};
G={v:1,_relVersion:2,_clockVersion:2,campaign:{version:1,links:{},introSolved:false,introHeard:true},char:{name:'t',age:23,stats:{str:1,wis:1,cha:1,sur:1},traits:[]},day:2,time:'낮',loc:'campus',district:'classroom',steps:0,hp:10,maxhp:10,calm:5,battery:6,torch:0,cash:0,items:[],act:1,rel:{},chronicle:[],lexicon:[],log:[],recent:[],choices:[]};migrate();G.spot=null;`);
run(`applyCaseUpdates([{new_case:true,question:'누가 밤마다 세탁실 불을 켜 두었나?',reason:'x',scope:'local',people:['김순자','박 주임'],evidence:[{text:'세탁실 바닥에 젖은 발자국이 있다',kind:'fact',role:'narrows',means:'밤에 누가 다녀갔다'},{text:'2번 펌프 밸브의 수압 주기가 맞지 않는다',kind:'fact',role:'narrows'}],next:['경비원에게 밤 순찰 기록 묻기','배관 압력계 주기 대조']}])`);
const t=JSON.parse(run('JSON.stringify(threadsOpen()[0])'));
assert.deepEqual(t.people,['김순자','박 주임']);assert.deepEqual(t.next,['경비원에게 밤 순찰 기록 묻기']);
assert.equal(run('evidenceForCase(threadsOpen()[0]).length'),1,'jargon evidence dropped');
const card=run('caseCard(threadsOpen()[0])');assert.match(card,/→ 밤에 누가 다녀갔다/);assert.match(card,/관련 인물: 김순자 · 박 주임/);
for(const d of ['library','music','art']) run(`G.district='${d}';addCanon('${d}에서 이상한 일이 있었다',true,true,{kind:'fact'})`);
assert.ok(run("threadsOpen().filter(t=>t.scope==='local'&&!t.privateMystery).length")<=3,'at most 3 open place cases');
console.log('PASS clearer place cases');

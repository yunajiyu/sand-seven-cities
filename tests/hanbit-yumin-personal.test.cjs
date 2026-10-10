// Run: node tests/hanbit-yumin-personal.test.cjs
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../hanbit.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const el={style:{},dataset:{},value:'',insertAdjacentHTML(){},remove(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},querySelectorAll(){return []},setAttribute(){},getAttribute(){return null}};
const ctx=vm.createContext({console,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return el},querySelector(){return el},querySelectorAll(){return []},addEventListener(){},documentElement:el},window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math:Object.create(Math)});
vm.runInContext(script.slice(0,script.indexOf('/* 시작: 화면 설정 적용')),ctx);
const run=s=>vm.runInContext(s,ctx);
run(`addLog=()=>{};toast=()=>{};render=()=>{};save=()=>{};var turns=[];aiTurn=async(a,e)=>turns.push({a,e});
G={v:1,_relVersion:2,_clockVersion:2,char:{name:'도현',age:23,stats:{str:1,wis:1,cha:1,sur:1},traits:[]},day:2,time:'퇴근 후',loc:'campus',district:'market',steps:0,hp:10,maxhp:10,calm:5,battery:6,torch:0,cash:0,items:[],act:1,rel:{},chronicle:[],lexicon:[],log:[],recent:[],choices:[],rumors:[{region:'x',belief:'RUMOR_TEXT'}],heardRumors:[]};migrate();G.spot=null;G.comp.met=true;G.comp.joined=true;getRel('유민');busy=false;`);
const aff=run('G.comp.aff');assert.equal(run('yuminPersonalTalk()'),true);
const t=JSON.parse(run('JSON.stringify(turns)'))[0];
assert.match(t.e,/사건·조사·소문·단서와 무관/);assert.doesNotMatch(t.e,/RUMOR_TEXT/);assert.ok(run('G.comp.aff')>aff);
const a2=run('G.comp.aff');run('yuminPersonalTalk()');assert.equal(run('G.comp.aff'),a2,'affection once a day');
assert.match(run('fixedHTML()'),/💬 사적인 이야기/);
console.log('PASS yumin personal talk');

// Run: node tests/hanbit-case-board-places.test.cjs
// 조사 보드에서 '본편' 칸을 없애고 장소별로만 묶는다 — 어떤 소문이 본편과 이어지는지 화면으로 가려낼 수 없게
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../hanbit.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
function fixture(){
  const el={style:{},dataset:{},value:'',insertAdjacentHTML(){},remove(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},querySelectorAll(){return []},setAttribute(){},getAttribute(){return null}};
  const ctx=vm.createContext({console,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return el},querySelector(){return el},querySelectorAll(){return []},addEventListener(){},documentElement:el},window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math:Object.create(Math)});
  vm.runInContext(script.slice(0,script.indexOf('/* 시작: 화면 설정 적용')),ctx);
  const run=s=>vm.runInContext(s,ctx);
  run(`addLog=()=>{};toast=()=>{};render=()=>{};save=()=>{};
    G={v:1,_relVersion:2,_clockVersion:2,campaign:{version:1,links:{},introSolved:false,introHeard:true},char:{name:'테스트',age:17,stats:{str:1,wis:1,cha:1,sur:1},traits:[]},day:1,time:'낮',loc:'campus',district:'classroom',steps:0,hp:10,maxhp:10,calm:5,battery:6,torch:0,cash:0,items:[],act:1,rel:{},chronicle:[],lexicon:[],log:[],recent:[],choices:[]};
    migrate();G.district=Object.keys(DISTRICTS)[0];G.spot=null;`);
  return run;
}
let n=0;const test=(name,fn)=>{fn(fixture());n++;console.log('PASS',name)};
const allCards=run=>run('threadsOpen().map(caseCard).join("")');
test('rumors about the intro place gather under that place, not a main-story bucket',run=>{
  run(`addCanon('특별교실동 3층 닫힌 교실에서 오르간 소리가 난다는 소문',true,true,{kind:'rumor'});addCanon('특별교실동 3층은 원래 음악 준비실이었다는 소문',true,true,{kind:'rumor',scope:'main'})`);
  const t=JSON.parse(run('JSON.stringify(threadsOpen())'));
  assert.equal(t.length,1);assert.equal(t[0].placeId,'intro:site');assert.equal(t[0].scope,'local');
  const html=allCards(run);
  assert.doesNotMatch(html,/본편/);assert.match(html,/📍 방과 후 특별교실동/);
  assert.match(html,/에 가서 밝혀야 함/);assert.doesNotMatch(html,/checkRumor/);
  assert.equal(run("checkRumor(G.evidence[0].id)"),false);
});
test('attendance-book clues and AI "main" cases are filed by place only',run=>{
  run(`addCanon('출석부 첫 장의 잉크가 번져 있다',true,true,{kind:'fact'});applyCaseUpdates([{new_case:true,question:'출석부와 지워진 구역은 어떻게 이어지는가?',reason:'x',scope:'main',evidence:[{text:'교표 뒷면에 번호가 새겨져 있다는 소문',kind:'rumor',role:'observation'}]}])`);
  assert.equal(run("(G.threads||[]).some(t=>t.scope==='main')"),false);
  assert.equal(run("(G.evidence||[]).some(e=>e.scope==='main')"),false);
  assert.doesNotMatch(allCards(run),/본편/);
});
test('old saves: the main-story bucket is unpacked into place buckets',run=>{
  run(`G._mainDemoted=0;const m={id:nextCaseId(),text:'출석부와 지워진 구역은 어떻게 이어지는가?',scope:'main',placeId:'main',topicKey:'main',day:1,touched:1,status:'open',shown:0,evidenceIds:[],questions:[],next:[],conclusion:'',supportIds:[]};G.threads.push(m);
    for(const [id,text] of [['e91','특별교실동에서 분필 소리가 난다는 소문'],['e92','상점가 게시판에 출석부 사진이 붙었다는 소문']]){G.evidence.push({id,text,caseId:m.id,scope:'main',placeId:id==='e91'?'campus:classroom':'campus:market',kind:'rumor',day:1,source:'scene',role:'observation'});m.evidenceIds.push(id)}
    demoteMainThreads()`);
  assert.equal(run("(G.threads||[]).filter(t=>!t.parentId&&t.status==='open'&&t.scope==='main').length"),0);
  assert.equal(run("G.evidence.find(e=>e.id==='e91').placeId"),'intro:site');
  assert.equal(run("G.evidence.find(e=>e.id==='e92').placeId"),'campus:market');
  assert.equal(run("G.evidence.filter(e=>e.id==='e91'||e.id==='e92').every(e=>threadsOpen().some(t=>t.id===e.caseId))"),true);
});
test('solving the intro case settles that place\'s rumors',run=>{
  run(`addCanon('특별교실동에서 밤마다 피아노가 울린다는 소문',true,true,{kind:'rumor'});G.campaign.introSolved=true;settleIntroRumors()`);
  assert.equal(run("threadsOpen().some(t=>t.placeId==='intro:site')"),false);
  assert.equal(run("G.evidence[0].checked.result"),'case');
  assert.equal(run("RUMOR_RESULT[G.evidence[0].checked.result]"),'사건으로 정리됨');
});
console.log(n+' passed');

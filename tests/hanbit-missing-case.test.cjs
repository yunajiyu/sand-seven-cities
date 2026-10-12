// Run: node tests/hanbit-missing-case.test.cjs
// 중심 사건(전임 직원 실종): 설계 검사, 단서 지급, 범인 지목(무제한·근거 필요), 결말
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../hanbit.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const el={style:{},dataset:{},value:'',insertAdjacentHTML(){},remove(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},querySelectorAll(){return []},setAttribute(){},getAttribute(){return null}};
const ctx=vm.createContext({console,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return el},querySelector(){return el},querySelectorAll(){return []},addEventListener(){},documentElement:el},window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math:Object.create(Math)});
vm.runInContext(script.slice(0,script.indexOf('/* 시작: 화면 설정 적용')),ctx);
const run=s=>vm.runInContext(s,ctx);
const plan={truth:'x',detail:'x',opening:'o',roster:'r',lacuna_intel:['a1 aaaa','b1 bbbb','c1 cccc'],rumors:[],
 incident:{missing:'박정우',public:'전임 직원 박정우가 부임 전날 밤 사라졌다.'},
 suspects:[{id:'s1',name:'김순자',role:'입소자',motive:'동기 하나',alibi:'알리바이 하나'},{id:'s2',name:'이동훈',role:'주임',motive:'동기 둘',alibi:'알리바이 둘'},{id:'s3',name:'최미연',role:'감독반',motive:'동기 셋',alibi:'알리바이 셋'}],
 culprit:'s2',culprit_why:'CULPRIT_WHY 진짜 동기',intro_clue:{text:'INTRO_CLUE 첫 단서',clears:['s1'],implicates:null},
 chapters:[{key:'lacuna',suspect_clue:{text:'L_CLUE 둘째 단서',clears:[],implicates:'s2'}},{key:'c0',suspect_clue:{text:'C0_CLUE 셋째 단서',clears:['s3'],implicates:null}},{key:'c1',suspect_clue:{text:'C1_CLUE 넷째 단서',clears:[],implicates:'s2'}}]};
run(`addLog=()=>{};toast=()=>{};render=()=>{};save=()=>{};closeModal=()=>{};var ended=0;openEnding=()=>{ended++};
const S=${JSON.stringify(JSON.stringify(plan))};
G={v:1,_relVersion:2,_clockVersion:2,campaign:{version:1,links:{},introSolved:false,introHeard:true,lacunaIntel:[],_intelFix:1,world:{status:'ready',sealed:S,hash:mysteryHash(S)}},char:{name:'t',age:23,stats:{str:1,wis:1,cha:1,sur:1},traits:[]},day:2,time:'낮',loc:'campus',district:'classroom',steps:0,hp:10,maxhp:10,calm:5,battery:6,torch:0,cash:0,items:[],act:1,rel:{},chronicle:[],lexicon:[],log:[],recent:[],choices:[]};migrate();`);
// validation
assert.deepEqual(JSON.parse(run(`JSON.stringify(incidentIssues(${JSON.stringify(plan)}))`)),[]);
const bad=JSON.parse(JSON.stringify(plan));bad.chapters[1].suspect_clue.clears=[];
assert.match(run(`incidentIssues(${JSON.stringify(bad)}).join('|')`),/혐의를 벗지 못하는/);
const bad2=JSON.parse(JSON.stringify(plan));bad2.intro_clue.clears=['s2'];
assert.match(run(`incidentIssues(${JSON.stringify(bad2)}).join('|')`),/범인을 clears/);
// panel before clues: no secret
let panel=run('incidentPanel()');assert.match(panel,/박정우 실종 사건/);assert.match(panel,/김순자/);assert.doesNotMatch(panel,/CULPRIT_WHY|L_CLUE|INTRO_CLUE/);assert.match(panel,/단서 2개부터/);
assert.doesNotMatch(run(`(()=>{let o='';for(const f of HOOKS.context||[]) try{o+=f.fn?f.fn():''}catch(e){} return o})()`)||'',/CULPRIT_WHY/);
// clues
run("grantIncidentClue('intro');grantIncidentClue('c0')");
assert.equal(run("suspectStatus('s1')"),'혐의 옅어짐');assert.equal(run("suspectStatus('s2')"),'아직 모름');
// wrong suspect
assert.equal(run("accuse('s1',['intro','c0'])"),false);assert.equal(run("suspectStatus('s1')"),'지목했지만 아니었다');
// culprit without backing (intro+c0 clear s1,s3 → all others cleared → backed!) -> correct
assert.equal(run("accuse('s2',['intro','c0'])"),true);assert.equal(run('G.campaign.caseSolved'),true);assert.ok(run('G.act')>=4);assert.equal(run('ended'),1);
console.log('PASS missing-predecessor case');

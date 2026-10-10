// Run: node tests/hanbit-plain-mystery.test.cjs
// 사건 원인·추리는 일반인이 이해할 수준으로 — 배관·펌프·밸브·회로 같은 기술 원리는 설계 단계에서 걸러 다시 만들게 한다
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../hanbit.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const el={style:{},dataset:{},value:'',insertAdjacentHTML(){},remove(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},querySelectorAll(){return []},setAttribute(){},getAttribute(){return null}};
const ctx=vm.createContext({console,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return el},querySelector(){return el},querySelectorAll(){return []},addEventListener(){},documentElement:el},window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math:Object.create(Math)});
vm.runInContext(script.slice(0,script.indexOf('/* 시작: 화면 설정 적용')),ctx);
const run=s=>vm.runInContext(s,ctx);
run(`G={v:1,char:{name:'t',age:17,stats:{str:1,wis:1,cha:1,sur:1},traits:[]},day:1,time:'낮',loc:'campus',hp:1,maxhp:1,calm:1,battery:1,torch:0,cash:0,items:[],act:1,rel:{},chronicle:[],lexicon:[],log:[],recent:[],choices:[]};migrate();`);
assert.match(run(`mysteryPrompt({name:'배수 터널',theme:'물소리',rooms:[{id:'r1',name:'입구',exits:[]}]})`),/\[원인 수준\][^\n]*배관·펌프·밸브/);
assert.equal(run(`mysteryJargon({truth:'2번 펌프의 역지 밸브가 열려 수압이 올라갔다'})`),'펌프');
assert.equal(run(`mysteryJargon({truth:'경비원이 밤마다 알람 맞춘 녹음기를 틀어 두었다',evidence:[{text:'녹음기 옆에 경비원 이름표가 떨어져 있다',meaning:'경비원이 여기 왔다',action:'녹음기 주변을 살핀다'}]})`),'');
assert.match(run(`validateMystery({question:'왜?',truth:'펌프 때문',conclusion:'x'},{rooms:[{id:'r1',name:'a',exits:[]}]}).join('|')`),/기술 원리/);
console.log('PASS plain mystery rule + jargon check');

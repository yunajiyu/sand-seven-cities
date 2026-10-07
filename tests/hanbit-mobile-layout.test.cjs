// Run: node tests/hanbit-mobile-layout.test.cjs
// Static checks for the compact mobile layout (status, tabs and map header each use a single line); the real rendering was checked in a 430px-wide browser.
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../hanbit.html'),'utf8');
const css=html.split('<style>')[1].split('</style>')[0];
const mobile=[...css.matchAll(/@media \(max-width:760px\)\{([\s\S]*?)\n\}/g)].map(m=>m[1]).join('\n');
let count=0;
function test(name,fn){fn();count++;console.log('PASS',name)}
test('Narrow screens show the status line on a single scrolling row',()=>{
  assert.match(mobile,/\.tb \.stats\{flex-wrap:nowrap;overflow-x:auto/);assert.match(mobile,/\.tb \.stats \.st\{flex:0 0 auto\}/);
  assert.match(mobile,/\.topbar \.where,\.topbar #needBar,#topFold\{display:none\}/);
});
test('Narrow screens keep the activity tabs and the map header on one row each',()=>{
  assert.match(mobile,/#gameNav\{flex-wrap:nowrap;overflow-x:auto/);assert.match(mobile,/\.maphead\{flex-wrap:nowrap;overflow-x:auto/);
  assert.match(mobile,/#zoomCtl\{display:none!important\}/);
});
test('A collapsed map is replaced by one map button at the end of the tab row (mobile only)',()=>{
  assert.match(mobile,/#game\.mapcol \.mapbox\{display:none\}/);assert.match(mobile,/#game\.mapcol \.navmap\{display:inline-block\}/);
  assert.match(css,/\n\.navmap\{display:none\}/);   // 넓은 화면에서는 보이지 않음
  assert.match(html,/class="small navmap" onclick="toggleMap\(\)"/);
  assert.match(html,/box\.classList\.toggle\('collapsed',col\);\s*document\.getElementById\('game'\)\?\.classList\.toggle\('mapcol',col\)/);
});
test('Wide screens are not touched by the mobile block',()=>{
  const wide=css.replace(/@media \(max-width:760px\)\{[\s\S]*?\n\}/g,'');
  assert.doesNotMatch(wide,/#game\.mapcol|\.tb \.stats\{flex-wrap:nowrap/);
});
test('Non-button items in a scrolling button row cannot be squeezed into a vertical strip',()=>{
  assert.match(css,/\.hscroll\{[^}]*align-items:flex-start/);assert.match(css,/\.hscroll>:not\(button\)\{flex:0 0 auto;max-width:100%\}/);
  assert.match(css,/@media \(min-width:600px\)\{ \.hscroll\{flex-wrap:wrap;overflow-x:visible;padding-bottom:0;align-items:stretch\}/);
  assert.match(css,/\.lbl\.hint\{/);
});
test('Every campus spot keeps hint sentences out of the button row and shows them under it',()=>{
  const vm=require('node:vm');
  const el={style:{},dataset:{},value:'',insertAdjacentHTML(){},remove(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},querySelectorAll(){return []},setAttribute(){},getAttribute(){return null}};
  const ctx=vm.createContext({console,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return el},querySelector(){return el},querySelectorAll(){return []},addEventListener(){},documentElement:el},window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math:Object.create(Math)});
  const script=html.split('<script>')[1].split('</script>')[0];vm.runInContext(script.slice(0,script.indexOf('/* 시작: 화면 설정 적용')),ctx);
  const run=x=>vm.runInContext(x,ctx);
  run(`G={v:1,_phoneLightVersion:1,_fearBalanceVersion:1,_relVersion:2,_clockVersion:2,_affLv:2,char:{name:'테스트',age:17,stats:{str:1,wis:1,cha:1,sur:1},traits:[]},day:1,time:'방과 후',dayStep:0,loc:'campus',steps:0,hp:12,maxhp:12,calm:10,battery:6,torch:0,cash:0,items:[],mat:{metal:0,ply:0,wire:0,keepsake:0},act:1,fragments:0,sitesDone:0,district:'bank',comp:{met:false,joined:false,aff:10},rel:{},chronicle:[],site:null};migrate();syncSchedule();`);
  const buttonsOnly=h=>h.replace(/<button[\s\S]*?<\/button>/g,'').replace(/<div style="flex-basis:100%;height:0"><\/div>/g,'').trim();
  for(const d of Object.keys(run('PLACES')))for(const club of [false,true]){
    run(`G.district='${d}';G.spot=null;G.spotKey=null;G.inv=G.inv||[];${club?"G.home=G.home||{};G.home.fac=G.home.fac||{};G.home.fac.clubroom=1;":"if(G.home&&G.home.fac)delete G.home.fac.clubroom;"}`);
    const o=run('campusFixedHTML()');assert.equal(buttonsOnly(o.ac),'',d+' action row has only buttons');assert.equal(buttonsOnly(o.mv),'',d+' move row has only buttons');
  }
  run("G.district='bank';G.cash=0;if(G.home&&G.home.fac)delete G.home.fac.clubroom");const o=run('campusFixedHTML()');
  assert.match(o.hint,/아지트를 마련하려면 캐시 \d+이 필요합니다/);assert.doesNotMatch(o.ac,/<p/);
  assert.match(run('fixedHTML()'),/<div class="lbl hint">아지트를 마련하려면 캐시/);
});
console.log(`${count} mobile-layout scenario groups passed.`);

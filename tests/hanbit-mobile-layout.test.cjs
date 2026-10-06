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
console.log(`${count} mobile-layout scenario groups passed.`);

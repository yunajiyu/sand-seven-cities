// Run: node tests/haemu-save.test.cjs
// Uses the actual haemu.html script. Checks autosave, reload, save-file validation, import backup/restore and undo.
const assert=require('node:assert/strict');
const {fixture,geminiReplies,test,done}=require('./_haemu-fixture.cjs');
const reply=n=>({lines:[{who:'',text:'장면 '+n}],choices:['가','나'],place:'',met:[],end:false});
const begin=(f,replies=[])=>{geminiReplies(f,replies);f.run("newGame('서윤')")};
const last=f=>f.run('G.log.at(-1).text');

(async()=>{
await test('Acting autosaves, and the game reopens with the same story and choices after a reload',async()=>{
  const disk=new Map(),f=fixture({storage:disk});begin(f,[reply(1)]);await f.run("act('가')");
  const g=fixture({storage:disk});g.run('continueGame()');
  assert.equal(g.run('G.char.name'),'서윤');assert.equal(last(g),'장면 1');assert.deepEqual(g.obj('G.scene.choices'),['가','나']);assert.match(g.el('logInner').innerHTML,/장면 1/);
  assert.equal(g.run("document.getElementById('game').classList.contains('hidden')"),false);
});
await test('Broken or foreign save data is refused with a readable reason',async()=>{
  const f=fixture();begin(f);
  const good=f.obj('G');
  const bad=[
    'not json',JSON.stringify({}),JSON.stringify({...good,v:2}),JSON.stringify({...good,char:{name:''}}),
    JSON.stringify({...good,slot:99}),JSON.stringify({...good,place:'nowhere'}),
    JSON.stringify({...good,scene:{choices:[]}}),JSON.stringify({...good,scene:{choices:[3]}}),JSON.stringify({...good,log:[{who:1,text:'x'}]}),
    JSON.stringify({...good,recent:[{role:'x',text:''}]}),'{"__proto__":{"x":1}}'];
  for(const b of bad)assert.throws(()=>f.run(`prepareSavedGame(${JSON.stringify(b)})`),e=>typeof e.message==="string"&&e.message.length>0,b.slice(0,40));
  assert.equal(f.run(`prepareSavedGame(${JSON.stringify(JSON.stringify(good))}).char.name`),'서윤');
  assert.throws(()=>f.run(`prepareSavedGame(${JSON.stringify(JSON.stringify({v:1,char:{name:'x'},day:1,time:'낮',loc:'campus'}))})`),/손상|아닙니다/,'a hanbit save is not mistaken for a haemu save');
});
await test('Importing keeps a backup of the previous game, and restoring brings it back',async()=>{
  const f=fixture();begin(f);
  const other=f.obj('newGameState("다른 사람")');
  assert.equal(f.run(`installImportedGame(prepareSavedGame(${JSON.stringify(JSON.stringify(other))}))`),true);
  assert.equal(f.run('G.char.name'),'다른 사람');
  f.run('restoreSaveBackup()');assert.equal(f.run('G.char.name'),'서윤');
});
await test('A failed import write keeps the current game and the original save',async()=>{
  const f=fixture();begin(f);
  const before=f.disk.get('lumia_save_v1');
  f.run("localStorage.setItem=(k,v)=>{throw new Error('quota')}");
  const other=f.obj('newGameState("다른 사람")');
  assert.equal(f.run(`installImportedGame(prepareSavedGame(${JSON.stringify(JSON.stringify(other))}))`),false);
  assert.equal(f.run('G.char.name'),'서윤');assert.equal(f.disk.get('lumia_save_v1'),before);
  assert.equal(f.el('saveWarning').style.display,'flex');
});
await test('Autosave failure shows the warning once and recovers when storage works again',async()=>{
  const f=fixture();begin(f);
  f.run("var realSet=localStorage.setItem;localStorage.setItem=()=>{throw new Error('quota')}");
  assert.equal(f.run('save()'),false);assert.equal(f.run('save()'),false);
  assert.equal(f.run("notices.filter(n=>/자동 저장 실패/.test(n)).length"),1);
  f.run('localStorage.setItem=realSet');assert.equal(f.run('save()'),true);assert.equal(f.el('saveWarning').style.display,'none');
});
await test('Undo steps back through two choices, survives a reload and then stops',async()=>{
  const disk=new Map(),f=fixture({storage:disk});begin(f,[reply(1),reply(2),reply(3)]);
  await f.run("act('A')");await f.run("act('B')");await f.run("act('C')");
  assert.equal(f.run('undoOlder.length'),1);assert.equal(f.run('undoLabel'),'C');
  const g=fixture({storage:disk});g.run('continueGame()');
  await g.run('undoLast()');assert.equal(last(g),'장면 2');assert.doesNotMatch(g.el('logInner').innerHTML,/장면 3/);
  await g.run('undoLast()');assert.equal(last(g),'장면 1');
  assert.equal(g.run('undoSnap'),null);await g.run('undoLast()');assert.equal(last(g),'장면 1');
  assert.equal(g.el('undoBtn').disabled,true);
});
await test('Undo returns to the earlier choices with the story as it was',async()=>{
  const f=fixture();begin(f,[reply(1)]);
  await f.run("act('가')");await f.run('undoLast()');
  assert.equal(f.run('G.log.length'),5);assert.match(f.el('choices').innerHTML,/창가로 다가가/);
  assert.equal(f.run('G.scene.choices[0]'),'창가로 다가가 숲을 더 살핀다');
});
await test('A new game clears undo history from the previous game',async()=>{
  const f=fixture();begin(f,[reply(1)]);await f.run("act('가')");
  f.run("newGame('새 사람')");assert.equal(f.run('undoSnap'),null);assert.equal(f.disk.has('lumia_undo'),false);
});
await test('Saves use their own key and never touch the hanbit.html save or the earlier sanatorium draft',async()=>{
  const disk=new Map([['hanbit_save_v1','{"keep":true}'],['haemu_save_v1','{"old":true}']]),f=fixture({storage:disk});begin(f);
  assert.equal(disk.get('hanbit_save_v1'),'{"keep":true}');assert.equal(disk.get('haemu_save_v1'),'{"old":true}');assert.ok(disk.has('lumia_save_v1'));
});
done('save/undo');
})().catch(e=>{console.error(e);process.exitCode=1});

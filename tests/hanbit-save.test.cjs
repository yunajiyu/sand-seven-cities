// Run: node tests/hanbit-save.test.cjs
// 저장·불러오기·가져오기·백업·저장 실패. 실제 게임 스크립트를 node:vm에서 실행한다.
const assert=require('node:assert/strict');
const {fixture,test,done}=require('./_hanbit-fixture.cjs');

function setup(){
  const f=fixture();
  f.run(`render=()=>{};show=()=>{};G=newState('도현');migrate();busy=false;`);
  return f;
}

(async()=>{
await test('Invalid save JSON and core fields never replace the live game or existing disk data',()=>{
  const {run,ctx}=setup();
  run('save();const before=G;const stored=localStorage.getItem(SAVE_KEY)');
  const base=JSON.parse(run('stored'));
  const zombies={...base.zombies,room:-1}, noise={...base.noise,room:99};
  for(const change of [{char:{name:''}},{char:{name:'x'.repeat(21)}},{hp:'10'},{hp:99},{slot:9},{day:0},{day:99},{items:{}},{items:['nope']},{loc:'nowhere'},{loc:'__proto__'},{route:'nope'},{infection:{left:99}},{v:1},{zombies},{noise},{log:[{type:'scene',text:{bad:true}}]},{comp:null}]){
    ctx.bad=JSON.stringify({...base,...change});
    assert.throws(()=>run('prepareSavedGame(bad)'),undefined,JSON.stringify(change));
    assert.equal(run('G===before'),true);
    assert.equal(run('localStorage.getItem(SAVE_KEY)'),run('stored'));
  }
  for(const text of ['not json','{"v":2}','{"__proto__":{}}','[]','null']){ ctx.bad=text; assert.throws(()=>run('prepareSavedGame(bad)')); assert.equal(run('G===before'),true) }
});

await test('A save missing later-added optional fields is filled in isolation and the live game is untouched until installed',()=>{
  const {run}=setup();
  run("save();const before=G;const legacy=JSON.parse(localStorage.getItem(SAVE_KEY));delete legacy.meds;delete legacy.infection;delete legacy.route;delete legacy.ending;delete legacy.items;const migrated=prepareSavedGame(JSON.stringify(legacy))");
  assert.equal(run('G===before'),true);
  assert.equal(run('migrated.meds'),0); assert.equal(run('migrated.infection'),null); assert.equal(run('migrated.route'),null); assert.equal(run('migrated.ending'),null);
  assert.equal(run('Array.isArray(migrated.items)'),true);
});

await test('A save from the old ward version (v1 key or v1 shape) is never loaded',()=>{
  const {run,disk}=setup();
  disk.set('hanbit_save_v1',JSON.stringify({v:1,char:{name:'옛 저장'},day:1,time:'낮',loc:'campus'}));
  assert.equal(run('SAVE_KEY'),'hanbit_save_v2');
  assert.equal(run('hasSave()'),false);
  assert.throws(()=>run("prepareSavedGame(localStorage.getItem('hanbit_save_v1'))"),/이 게임의 저장 파일이 아닙니다/);
});

await test('The AI connection settings carry over from the previous version',()=>{
  const storage=new Map([['sand7_settings',JSON.stringify({keys:{gemini:'kept-key'},roles:{story:{provider:'gemini',model:'gemini-3.8-flash'}}})]]);
  const {run}=fixture({storage});
  assert.equal(run('SET.keys.gemini'),'kept-key');
  assert.equal(run('aiProviderReady("gemini")'),true);
});

await test('Invalid imported file does not overwrite disk or replace the game',()=>{
  const {run}=setup();
  run("save();const before=G,beforeDisk=localStorage.getItem(SAVE_KEY);const fakeInput={files:[{size:100}],click(){}};document.createElement=()=>fakeInput;FileReader=class{readAsText(){this.result=JSON.stringify({char:{name:'bad'}});this.onload()}};importSave();fakeInput.onchange()");
  assert.equal(run('G===before'),true);
  assert.equal(run('localStorage.getItem(SAVE_KEY)'),run('beforeDisk'));
});

await test('Valid import keeps a backup of the previous game and the backup restores it',()=>{
  const {run}=setup();
  run("save();G.hp=7;const before=G;const other=JSON.parse(JSON.stringify(G));other.hp=4;const candidate=prepareSavedGame(JSON.stringify(other));const imported=installImportedGame(candidate)");
  assert.equal(run('imported'),true);
  assert.equal(run('G.hp'),4);
  assert.equal(run('JSON.parse(localStorage.getItem(SAVE_BACKUP_KEY)).hp'),7);
  assert.equal(run('JSON.parse(localStorage.getItem(SAVE_KEY)).hp'),4);
  run('restoreSaveBackup()');
  assert.equal(run('G.hp'),7);
  assert.equal(run('JSON.parse(localStorage.getItem(SAVE_KEY)).hp'),7);
});

await test('Quota failures on the backup or the import write keep the live game and the original disk save',()=>{
  for(const which of ['backup','main']){
    const {run}=setup();
    run("save();const original=G,stored=localStorage.getItem(SAVE_KEY);const candidate=prepareSavedGame(stored);candidate.hp=3;const oldSet=localStorage.setItem");
    run(`localStorage.setItem=(k,v)=>{if(k===${which==='backup'?'SAVE_BACKUP_KEY':'SAVE_KEY'})throw Error('QuotaExceededError');oldSet(k,v)};const ok=installImportedGame(candidate)`);
    assert.equal(run('ok'),false);
    assert.equal(run('G===original'),true);
    assert.equal(run('localStorage.getItem(SAVE_KEY)'),run('stored'));
  }
});

await test('A file read that finishes after the game changed cannot overwrite the newer game',()=>{
  const {run}=setup();
  run("let reader;const fakeInput={files:[{size:100}],click(){}};document.createElement=()=>fakeInput;FileReader=class{readAsText(){reader=this}};const source=JSON.stringify(G);importSave();fakeInput.onchange();G=newState('다른 판');G.hp=3;reader.result=source;reader.onload()");
  assert.equal(run('G.hp'),3);
  assert.equal(run('G.char.name'),'다른 판');
  assert.equal(run('localStorage.getItem(SAVE_KEY)'),null);
});

await test('A storage failure is visible, shown once, recoverable, and the live undo baseline keeps following the game',()=>{
  const f=setup(); const {run,el}=f;
  run('save();const oldSet=localStorage.setItem;localStorage.setItem=()=>{throw Error("QuotaExceededError")};G.hp=2;const ok=save();save()');
  assert.equal(run('ok'),false);
  assert.equal(run('saveFailed'),true);
  assert.equal(el('saveWarning').style.display,'flex');
  assert.equal(run('JSON.parse(stableSnap).hp'),2);
  assert.equal(run('JSON.parse(snapG()).hp'),2);
  assert.equal(run('notices.filter(x=>x.includes("자동 저장 실패")).length'),1);
  run('localStorage.setItem=oldSet;save()');
  assert.equal(run('saveFailed'),false);
  assert.equal(el('saveWarning').style.display,'none');
  assert.equal(run('JSON.parse(localStorage.getItem(SAVE_KEY)).hp'),2);
});

await test('Continue rejects corrupt stored data without changing the current game, and loads a good save',()=>{
  const {run,disk}=setup();
  run("const before=G");
  disk.set('hanbit_save_v2',JSON.stringify({char:{name:'bad'}}));
  run('continueGame()');
  assert.equal(run('G===before'),true);
  assert.equal(run("notices.some(x=>x.includes('불러오지 못했습니다'))"),true);
  run("G=newState('복원');migrate();save();G=null;continueGame()");
  assert.equal(run('G.char.name'),'복원');
});

await test('Prototype-polluting keys inside a save are rejected',()=>{
  const {run,ctx}=setup();
  ctx.bad='{"v":2,"char":{"name":"x"},"constructor":{"prototype":{"polluted":true}}}';
  assert.throws(()=>run('prepareSavedGame(bad)'),/안전하지 않은/);
  assert.equal(run('({}).polluted'),undefined);
});

done('save');
})().catch(e=>{console.error(e);process.exitCode=1});

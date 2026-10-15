// Run: node tests/hanbit-resume.test.cjs
// D단계(기본 선택지·상태바/목표 갱신)와 E단계(남은 대사 줄의 저장·복원).
const assert=require('node:assert/strict');
const {fixture,test,done}=require('./_hanbit-fixture.cjs');

function game(){
  const f=fixture();
  f.run(`G=newState('도현');migrate();busy=false;resetQueue();UI.speed='off';UI.auto=false;rng=()=>0.99;console.warn=()=>{}`);
  return f;
}
const flush=run=>run('while(Q.pending.length) nextLine()');

(async()=>{
await test('Basic choices are always present, even if a hook empties or corrupts the list',()=>{
  const {run,obj}=game();
  run("on('choices',1,l=>{l.length=0;l.push(null,{id:5},{id:'',label:'x'},{id:'ok:1',label:'정상'})})");
  assert.deepEqual(obj("buildChoices().map(c=>c.id)"),['ok:1','look:','rest:']);
});

await test('Look and rest write an action log line and the choices stay',()=>{
  const {run,obj}=game();
  const before=obj("({food:G.food,water:G.water,day:G.day,loc:G.loc})");
  run("pick('look:')"); flush(run); run("pick('rest:')"); flush(run);
    assert.ok(run("G.log.some(e=>e.type==='action'&&/살핀다/.test(e.text))")&&run("G.log.some(e=>e.type==='action'&&/쉰다/.test(e.text))"));
  assert.ok(obj("buildChoices().length")>=3);
});

await test('Status bar and goal line refresh after a move',()=>{
  const {run}=game();
  run("pick('move:stairs')"); flush(run);
  const html=run("document.getElementById('statbar')?document.getElementById('statbar').innerHTML:''");
  assert.ok(run('typeof goalLine()')==='string'&&run('goalLine()').length>0);
  assert.ok(html===''||typeof html==='string');
});

await test('Unread lines are saved and restored after reload; the log hides them again until shown',()=>{
  const {run}=game();
  run("UI.speed='mid'");
  run("say([{t:'n',text:'첫째 줄.'},{t:'d',who:'yumin',emo:'smile',text:'둘째 줄.'},{t:'n',text:'셋째 줄.'}])");
  assert.equal(run('G.pend'),3,'typing line + 2 pending');
  const saved=run("localStorage.getItem(SAVE_KEY)");
  assert.equal(JSON.parse(saved).pend,3);
  run(`resetQueue();openLoadedGame(prepareSavedGame(${JSON.stringify(saved)}))`);
  assert.equal(run('Q.pending.length+(Q.typing?1:0)'),3);
  assert.equal(run('shownLog().length'),run('G.log.length')-2,'only the line being typed is shown');
  assert.equal(run('Q.cur.text'),'첫째 줄.');
  assert.equal(run("Q.pending[0].who"),'yumin');
});

await test('pend returns to 0 once everything is read, and nothing is replayed after that',()=>{
  const {run}=game();
  run("say('한 줄.')"); flush(run); run('finishTyping();save()');
  assert.equal(run('G.pend'),0);
  const saved=run("localStorage.getItem(SAVE_KEY)");
  run(`resetQueue();openLoadedGame(prepareSavedGame(${JSON.stringify(saved)}))`);
  assert.equal(run('queueIdle()'),true);
});

await test('A corrupted pend is refused like other broken fields; a missing pend is filled with 0',()=>{
  const {run}=game();
  run("save();var s=JSON.parse(localStorage.getItem(SAVE_KEY))");
  for(const bad of [999,-1,1.5,'3']) assert.throws(()=>run(`prepareSavedGame(JSON.stringify(Object.assign({},s,{pend:${JSON.stringify(bad)}})))`),/기록 정보가 손상/);
  run("delete s.pend;var m=prepareSavedGame(JSON.stringify(s))");
  assert.equal(run('m.pend'),0);
});

done();
})();

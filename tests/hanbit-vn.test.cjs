// Run: node tests/hanbit-vn.test.cjs
// 미연시 화면: 줄 나누기·줄 검수·줄 큐(탭 진행·즉시 완성)·선택지 표시 시점·로그. 실제 게임 스크립트를 node:vm에서 실행한다.
const assert=require('node:assert/strict');
const {fixture,test,done}=require('./_hanbit-fixture.cjs');

function game(){
  const f=fixture();
  f.run(`G=newState('도현');migrate();busy=false;resetQueue();var timers=[];setTimeout=(fn)=>{timers.push(fn);return timers.length};clearTimeout=()=>{};
    var fire=()=>{const fn=timers.shift();if(fn)fn()};`);
  return f;
}
const long='그는 천천히 문을 열었다. 복도는 어두웠고, 멀리서 무언가 끌리는 소리가 들렸다. 숨을 죽인 채 한 걸음씩 계단 쪽으로 향했지만 발소리가 생각보다 크게 울렸다. 아래층에서 소리가 멎었다.';

(async()=>{
await test('A long line is split by sentence into lines of at most 80 characters, short lines stay whole',()=>{
  const {obj,run}=game();
  assert.deepEqual(obj('splitLine("짧은 문장이다.")'),['짧은 문장이다.']);
  assert.deepEqual(obj('splitLine("   ")'),[]);
  const parts=obj(`splitLine(${JSON.stringify(long)})`);
  assert.ok(parts.length>=2);
  for(const p of parts) assert.ok(p.length<=80,p);
  assert.equal(parts.join(' ').replace(/\s+/g,''),long.replace(/\s+/g,''),'no text is lost');
  const nospace=obj(`splitLine(${JSON.stringify('가'.repeat(200))})`);
  assert.ok(nospace.every(p=>p.length<=80)); assert.equal(nospace.join('').length,200);
});

await test('Line checking: unknown speaker becomes narration, unknown expression becomes neutral, junk is dropped',()=>{
  const {obj}=game();
  assert.deepEqual(obj(`normLine({t:'d',who:'yumin',emo:'smile',text:'안녕하세요'})`),{t:'d',text:'안녕하세요',who:'yumin',emo:'smile'});
  assert.deepEqual(obj(`normLine({t:'d',who:'yumin',emo:'rage',text:'네'})`),{t:'d',text:'네',who:'yumin',emo:'neutral'});
  assert.deepEqual(obj(`normLine({t:'d',who:'stranger',emo:'smile',text:'누구세요'})`),{t:'n',text:'누구세요'});
  assert.deepEqual(obj(`normLine({t:'d',who:'__proto__',text:'x'})`),{t:'n',text:'x'});
  assert.deepEqual(obj(`normLine({t:'x',text:'뭔가'})`),{t:'n',text:'뭔가'});
  assert.deepEqual(obj(`normLine({t:'s',text:'소음 +1'})`),{t:'s',text:'소음 +1'});
  assert.deepEqual(obj(`normLine('그냥 문자열')`),{t:'n',text:'그냥 문자열'});
  for(const bad of ['null','{}','{text:5}',"{text:'  '}",'42']) assert.equal(obj(`normLine(${bad})`),null);
});

await test('say() logs every line at once but shows them one by one; choices stay hidden until the last line is finished',()=>{
  const {run,el}=game();
  run(`UI.speed='off';render()`);
  run(`say([{t:'n',text:'첫 줄'},{t:'d',who:'yumin',emo:'smile',text:'둘째 줄'},{t:'s',text:'소음 +1'}])`);
  assert.equal(run('G.log.length'),3);
  assert.equal(el('scriptText').textContent,'첫 줄');
  assert.equal(run('Q.pending.length'),2);
  assert.equal(el('choices').innerHTML,'','no choices while lines remain');
  assert.equal(el('nameTag').style.display,'none','narration has no name tag');
  run('tapAdvance()');
  assert.equal(el('scriptText').textContent,'둘째 줄');
  assert.equal(el('nameTag').textContent,'유민'); assert.equal(el('nameTag').style.display,'block');
  assert.equal(el('scriptText').className,'d');
  run('tapAdvance()');
  assert.equal(el('scriptText').textContent,'소음 +1'); assert.equal(el('scriptText').className,'s');
  assert.equal(el('nameTag').style.display,'none');
  assert.match(el('choices').innerHTML,/pick\('move:stairs'\)/,'choices appear after the last line');
  run('tapAdvance()');   // extra taps do nothing
  assert.equal(el('scriptText').textContent,'소음 +1');
});

await test('Typing effect: taps while typing complete the line at once; a tap on a complete line moves on',()=>{
  const {run,el}=game();
  run(`UI.speed='mid';render();say([{t:'n',text:'가나다라'},{t:'n',text:'마바사'}])`);
  assert.equal(run('Q.typing'),true);
  assert.equal(el('scriptText').textContent,'');
  run('fire()'); assert.equal(el('scriptText').textContent,'가');
  run('fire()'); assert.equal(el('scriptText').textContent,'가나');
  run('tapAdvance()');
  assert.equal(el('scriptText').textContent,'가나다라','tap completes the line');
  assert.equal(run('Q.typing'),false); assert.equal(run('Q.pending.length'),1);
  run('tapAdvance()');
  assert.equal(run('Q.cur.text'),'마바사');
  run('tapAdvance()'); run('tapAdvance()');
  assert.equal(el('scriptText').textContent,'마바사');
  assert.match(el('choices').innerHTML,/move:stairs/);
});

await test('A choice made while lines remain is ignored, and moving makes the next scene lines',()=>{
  const {run}=game();
  run(`UI.speed='off';render();say([{t:'n',text:'가'},{t:'n',text:'나'}])`);
  run("pick('move:stairs')");
  assert.equal(run('G.loc'),'room');
  run('tapAdvance()');
  run("pick('move:stairs')");
  assert.equal(run('G.loc'),'stairs');
  assert.equal(run('Q.cur.text').includes('계단'),true);
  assert.equal(run('Q.pending.length'),0);
});

await test('Log view shows only lines already seen, with the speaker name, and action lines',()=>{
  const {run}=game();
  run(`UI.speed='off';render();addLog('action','계단으로 이동한다');say([{t:'n',text:'본 줄'},{t:'d',who:'yumin',text:'아직 안 본 대사'}])`);
  assert.equal(run('shownLog().length'),2);
  run('openLog()');
  const html=run('modalHTML');
  assert.match(html,/본 줄/); assert.match(html,/계단으로 이동한다/); assert.equal(html.includes('아직 안 본 대사'),false);
  run('tapAdvance()');
  run('openLog()');
  assert.match(run('modalHTML'),/<b>유민<\/b>아직 안 본 대사/);
});

await test('Menu has log, map, save and settings; the dummy scene queues lines without any AI call and the map move is blocked mid-script',()=>{
  const {run,obj}=game();
  run("var aiCalls=0;callAI=async()=>{aiCalls++;return ''};callAIRaw=callAI;UI.speed='off';render()");
  run('openMenu()');
  const m=run('modalHTML');
  for(const t of ['로그 보기','지도','저장','설정','글자 속도','자동 넘김']) assert.ok(m.includes(t),t);
  run('demoScene()');
  assert.ok(run('G.log.length')>=6);
  assert.equal(run('aiCalls'),0);
  run("mapTap('stairs')");
  assert.equal(run('G.loc'),'room','cannot move while the script is running');
  while(run('Q.pending.length')) run('tapAdvance()');
  run("mapTap('stairs')");
  assert.equal(run('G.loc'),'stairs');
});

await test('Text speed and auto-advance are kept in a small separate setting and default to normal speed / auto off',()=>{
  const {run,disk}=game();
  assert.equal(run('UI.speed'),'mid'); assert.equal(run('UI.auto'),false);
  run('cycleSpeed();toggleAuto()');
  const saved=JSON.parse(disk.get('hanbit_ui'));
  assert.equal(saved.speed,'slow'); assert.equal(saved.auto,true);
  assert.equal(run('Object.keys(JSON.parse(localStorage.getItem(SAVE_KEY)||"{}")).includes("ui")'),false,'save file is unchanged');
});

await test('Loading a save shows the last seen line statically, and the log entries carrying a speaker still validate',()=>{
  const {run,el}=game();
  run(`UI.speed='off';render();say([{t:'n',text:'앞 줄'},{t:'d',who:'yumin',emo:'sad',text:'마지막 대사'}]);tapAdvance();save()`);
  assert.doesNotThrow(()=>run('prepareSavedGame(localStorage.getItem(SAVE_KEY))'));
  run('const g=prepareSavedGame(localStorage.getItem(SAVE_KEY));openLoadedGame(g)');
  assert.equal(el('scriptText').textContent,'마지막 대사');
  assert.equal(el('nameTag').textContent,'유민');
  assert.match(el('choices').innerHTML,/move:stairs/);
  assert.equal(run('Q.pending.length'),0);
});

await test('Every zone has its own pixel-art background, looked up by zone id, and the scene shows it',()=>{
  const {run,obj,el}=game();
  const ids=obj('ZONES.map(z=>z.id)');
  const bgs=ids.map(id=>run(`bgFor(${JSON.stringify(id)})`));
  for(const b of bgs) assert.match(b,/^url\("data:image\/png;base64,[A-Za-z0-9+/=]+"\) center bottom \/ cover no-repeat/);
  assert.equal(new Set(bgs).size,8,'each zone has a different picture');
  assert.match(run("bgFor('nowhere')"),/^#1a1c2c$/,'unknown zone falls back to a flat colour');
  run('render()'); assert.equal(el('sceneBg').style.background,run("bgFor('room')"));
  run("goZone('stairs')"); assert.equal(el('sceneBg').style.background,run("bgFor('stairs')"));
});

done('visual-novel screen');
})().catch(e=>{console.error(e);process.exitCode=1});

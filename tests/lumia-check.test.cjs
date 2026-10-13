// Run: node tests/lumia-check.test.cjs
// Uses the actual lumia.html script. Checks dice checks for risky actions: the code rolls 2d6 before the single
// AI call, passes the result for the AI to follow, logs the roll, and tracks the lab's hidden alert level.
const assert=require('node:assert/strict');
const {fixture,geminiReplies,test,done}=require('./_lumia-fixture.cjs');
const risky={lines:[{who:'',text:'관찰실 단말기가 잠겨 있다.'}],choices:['돌아간다',{text:'관리자 기록을 몰래 열어 본다',check:'기록',dc:'보통'},{text:'카메라 사각지대로 숨는다',check:'은신',dc:'어려움'}],place:'watch',met:[],end:false};
const plain=(o={})=>({lines:[{who:'',text:'조용했다.'}],choices:['가','나'],place:'',met:[],end:false,...o});
const dice=(f,a,b)=>f.run(`Math.random=(()=>{const q=[${(a-1)/6+0.01},${(b-1)/6+0.01}];return ()=>q.length?q.shift():0.5})()`);

(async()=>{
await test('New games give the chosen specialty +3 and the others +1, and the menu shows them',async()=>{
  const f=fixture();f.run("newGame('서윤','data')");
  assert.deepEqual(f.obj('G.char.stats'),{sneak:1,data:3,talk:1});assert.equal(f.run('G.alert'),0);
  f.run("newGame('서윤','없는값')");assert.deepEqual(f.obj('G.char.stats'),{sneak:3,data:1,talk:1},'an unknown choice falls back to 은신');
  f.run('openMenu()');assert.match(f.run('modalHTML'),/은신 \+3 · 기록 \+1 · 말솜씨 \+1/);
});
await test('Risky choices from the AI keep their check, written in Korean or as keys; others stay plain',async()=>{
  const f=fixture();f.run("newGame('서윤')");
  const sc=f.obj(`normalizeScene(${JSON.stringify(risky)})`);
  assert.deepEqual(sc.choices,['돌아간다',{text:'관리자 기록을 몰래 열어 본다',check:'data',dc:'normal'},{text:'카메라 사각지대로 숨는다',check:'sneak',dc:'hard'}]);
  const odd=f.obj(`normalizeScene({lines:[{text:'x'}],choices:[{text:'a',check:'talk'},{text:'b',check:'요리',dc:'보통'},{text:'c',check:'은신',dc:'엄청 어려움'}]})`);
  assert.deepEqual(odd.choices,[{text:'a',check:'talk',dc:'normal'},'b',{text:'c',check:'sneak',dc:'normal'}]);
});
await test('Choice buttons show the skill, difficulty and success chance before rolling',async()=>{
  const f=fixture();geminiReplies(f,[risky]);f.run("newGame('서윤','data')");await f.run("act('a')");
  const html=f.el('choices').innerHTML;
  assert.match(html,/관리자 기록을 몰래 열어 본다<span class="ck">🎲 기록 · 보통 · 성공 72%<\/span>/);
  assert.match(html,/카메라 사각지대로 숨는다<span class="ck">🎲 은신 · 어려움 · 성공 17%<\/span>/);
  assert.doesNotMatch(html,/돌아간다<span/);
});
await test('Success chances follow 2d6 + skill against the target, with 12 always succeeding and 2 always failing',async()=>{
  const f=fixture();f.run("newGame('서윤','sneak')");
  assert.equal(f.run("checkChance('sneak','normal')"),72);   // need 6+
  assert.equal(f.run("checkChance('talk','normal')"),42);    // need 8+
  assert.equal(f.run("checkChance('talk','hard')"),17);      // need 10+
  f.run("G.char.stats.talk=6");assert.equal(f.run("checkChance('talk','easy')"),97,'a 2 still fails');
  f.run("G.char.stats.talk=0");assert.equal(f.run("checkChance('talk','hard')"),8);
  f.run("G.alert=6");assert.equal(f.run("checkChance('talk','hard')"),3,'with the target at 12 only a natural 12 succeeds');
});
await test('Rolls resolve into success, partial and fail; natural 12 and 2 override',async()=>{
  const f=fixture();f.run("newGame('서윤','sneak')");   // sneak +3, normal target 9
  assert.equal(f.run("rollCheck('sneak','normal',[3,3]).result"),'success');   // 9
  assert.equal(f.run("rollCheck('sneak','normal',[2,2]).result"),'partial');   // 7
  assert.equal(f.run("rollCheck('sneak','normal',[1,2]).result"),'fail');      // 6
  assert.equal(f.run("rollCheck('talk','hard',[6,6]).result"),'success');
  f.run("G.char.stats.sneak=6");assert.equal(f.run("rollCheck('sneak','easy',[1,1]).result"),'fail');
  assert.equal(f.run("rollLine(rollCheck('data','normal',[4,2]))"),'기록 판정 · 보통 — 🎲 4+2 +1 = 7 / 9 · 아슬아슬');
});
await test('Picking a risky choice rolls once before a single AI call, and the AI is told to follow the result',async()=>{
  const f=fixture();geminiReplies(f,[risky,plain()]);f.run("newGame('서윤','data')");await f.run("act('a')");
  dice(f,1,2);
  assert.equal(await f.run('pick(1)'),true);
  assert.equal(f.run('sent.length'),2,'no extra AI call for the check');
  const user=f.run('sent[1].messages[1].content');
  assert.match(user,/관리자 기록을 몰래 열어 본다\n\[판정 결과 — 반드시 따른다\] 기록 판정 실패\. 플레이어는 해내지 못한다/);
  assert.match(f.run('sent[1].messages[0].content'),/주사위·판정·수치는 장면에 쓰지 않는다/);
  assert.deepEqual(f.obj("G.log.filter(e=>e.who==='🎲').map(e=>e.text)"),['기록 판정 · 보통 — 🎲 1+2 +3 = 6 / 9 · 실패']);
  assert.match(f.el('logInner').innerHTML,/class="roll new">기록 판정/);
  assert.match(f.run("G.recent.at(-2).text"),/\(기록 판정 실패\)/);
});
await test('Plain choices never roll',async()=>{
  const f=fixture();geminiReplies(f,[risky,plain()]);f.run("newGame('서윤')");await f.run("act('a')");
  await f.run('pick(0)');
  assert.doesNotMatch(f.run('sent[1].messages[1].content'),/판정 결과/);assert.ok(f.run("!G.log.some(e=>e.who==='🎲')"));
});
await test('Failures and near-misses raise the hidden alert, which the AI sees in words and which makes checks harder',async()=>{
  const f=fixture();geminiReplies(f,[risky,risky,risky,risky]);f.run("newGame('서윤','data')");await f.run("act('a')");
  dice(f,1,1);await f.run('pick(1)');assert.equal(f.run('G.alert'),2);
  dice(f,2,2);await f.run('pick(1)');assert.equal(f.run('G.alert'),3,'a near miss (2+2+3=7 against 9) adds 1');
  assert.match(f.run("userPrompt('x')"),/\[연구소의 경계\] 조금 높아짐/);
  f.run('G.alert=6');assert.match(f.run("userPrompt('x')"),/\[연구소의 경계\] 높음/);
  assert.equal(f.run("checkTarget('normal')"),10);assert.equal(f.run("checkChance('data','normal')"),58);
  assert.doesNotMatch(f.el('logInner').innerHTML+f.el('when').textContent,/경계/,'the alert level is never shown on screen');
});
await test('A new day lowers the alert by one',async()=>{
  const f=fixture();geminiReplies(f,[plain({end:true})]);f.run("newGame('서윤')");
  f.run('G.alert=4;G.slot=WORLD.slots.length-1');await f.run("act('잔다')");
  assert.equal(f.run('G.day'),2);assert.equal(f.run('G.alert'),3);
});
await test('Free writing can ask for a check at normal difficulty, or none',async()=>{
  const f=fixture();geminiReplies(f,[plain(),plain()]);f.run("newGame('서윤','talk')");
  f.run('openFree()');assert.match(f.el('choices').innerHTML,/🎲 말솜씨 판정 \(보통 · 72%\)/);
  f.el('freeText').value='경비에게 길을 잃었다고 둘러댄다';f.el('freeCheck').value='talk';dice(f,6,5);
  await f.run('sendFree()');
  assert.match(f.run('sent[0].messages[1].content'),/말솜씨 판정 성공\. 플레이어는 들키지 않고 해낸다/);
  f.run('openFree()');f.el('freeText').value='창밖을 본다';f.el('freeCheck').value='';await f.run('sendFree()');
  assert.doesNotMatch(f.run('sent[1].messages[1].content'),/판정 결과/);
});
await test('If the AI call fails after a roll, nothing changes: no roll line, no alert, choices stay',async()=>{
  const f=fixture();geminiReplies(f,[risky]);f.run("newGame('서윤')");await f.run("act('a')");
  f.run("setTimeout=fn=>{fn();return 0};fetch=async()=>({ok:false,status:401,json:async()=>({error:{message:'bad key'}})})");
  const before=f.run('JSON.stringify(G)');dice(f,1,1);
  assert.equal(await f.run('pick(1)'),false);assert.equal(f.run('JSON.stringify(G)'),before);
});
await test('Saved games keep risky choices and stats, and broken ones are refused',async()=>{
  const f=fixture();geminiReplies(f,[risky]);f.run("newGame('서윤','data')");await f.run("act('a')");
  const good=f.obj('G');
  assert.equal(f.run(`prepareSavedGame(${JSON.stringify(JSON.stringify(good))}).scene.choices[1].check`),'data');
  for(const bad of [{...good,scene:{choices:[{text:'x',check:'요리',dc:'normal'}]}},{...good,char:{...good.char,stats:{sneak:'3'}}},{...good,alert:99}])
    assert.throws(()=>f.run(`prepareSavedGame(${JSON.stringify(JSON.stringify(bad))})`),e=>/손상/.test(e.message));
});
done('dice check');
})().catch(e=>{console.error(e);process.exitCode=1});

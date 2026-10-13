// Run: node tests/lumia-char.test.cjs
// Uses the actual lumia.html script. Checks the player's own character description: entered at the start,
// edited from the menu, sent to the AI as description only, kept in saves.
const assert=require('node:assert/strict');
const {fixture,geminiReplies,test,done}=require('./_lumia-fixture.cjs');
const plain={lines:[{who:'',text:'조용했다.'}],choices:['가','나'],place:'',met:[],end:false};
const profile={look:'짧은 검은 머리, 왼손에 오래된 시계',persona:'침착한 척하지만 말이 빨라진다',bio:'여동생과 둘이 살아왔다'};

(async()=>{
await test('The new-game form has optional description fields, and starting keeps what was written',async()=>{
  const f=fixture();f.run('startNew()');
  const html=f.run('modalHTML');
  for(const id of ['np_look','np_persona','np_bio'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/내 캐릭터 설명/);assert.match(html,/readProfile\('np'\)/);
  f.el('np_look').value='  '+profile.look+'  ';f.el('np_persona').value=profile.persona;f.el('np_bio').value=profile.bio;
  f.run("newGame('서윤','talk',readProfile('np'))");
  assert.deepEqual(f.obj('({look:G.char.look,persona:G.char.persona,bio:G.char.bio})'),profile);
  assert.equal(f.run('G.char.stats.talk'),3);
});
await test('Leaving the fields empty is fine, and the AI is told not to invent the player',async()=>{
  const f=fixture();geminiReplies(f,[plain]);f.run("newGame('서윤')");await f.run("act('a')");
  assert.deepEqual(f.obj('({look:G.char.look,persona:G.char.persona,bio:G.char.bio})'),{look:'',persona:'',bio:''});
  assert.match(f.run('sent[0].messages[0].content'),/\[플레이어 캐릭터\] 서윤\n- \(따로 정하지 않음 — 플레이어의 외모·성격·과거를 지어내지 않는다\)/);
});
await test('The description reaches the AI as description only, and other people only see the surface',async()=>{
  const f=fixture();geminiReplies(f,[plain]);f.run(`newGame('서윤','sneak',${JSON.stringify(profile)})`);await f.run("act('a')");
  const sys=f.run('sent[0].messages[0].content');
  assert.match(sys,/- 외모: 짧은 검은 머리, 왼손에 오래된 시계\n- 성격·말투: 침착한 척하지만 말이 빨라진다\n- 배경·특징: 여동생과 둘이 살아왔다/);
  assert.match(sys,/행동·대사·감정을 대신 정하지 않는다/);assert.match(sys,/말하지 않은 배경은 모르는 것으로 한다/);
  assert.ok(sys.indexOf('[플레이어 캐릭터]')<sys.indexOf('[등장인물]'));
});
await test('The menu opens the description for editing, and saving changes the next prompt',async()=>{
  const f=fixture();geminiReplies(f,[plain]);f.run(`newGame('서윤','sneak',${JSON.stringify(profile)})`);
  f.run('openMenu()');assert.match(f.run('modalHTML'),/openProfile\(\)">👤 내 캐릭터/);
  f.run('openProfile()');const html=f.run('modalHTML');
  assert.match(html,/id="pf_look"[^>]*>짧은 검은 머리, 왼손에 오래된 시계<\/textarea>/);assert.match(html,/은신 \+3/);
  f.el('pf_look').value='머리를 묶었다';f.el('pf_persona').value='';f.el('pf_bio').value=profile.bio;
  f.run('saveProfile()');assert.equal(f.run('G.char.look'),'머리를 묶었다');assert.equal(f.run('G.char.persona'),'');
  assert.match(f.run('notices.at(-1)'),/저장했습니다/);
  await f.run("act('a')");const sys=f.run('sent[0].messages[0].content');
  assert.match(sys,/- 외모: 머리를 묶었다/);assert.doesNotMatch(sys,/성격·말투: /);
});
await test('Long text is trimmed to the field limit, and markup is shown as text',async()=>{
  const f=fixture();f.run(`newGame('서윤','sneak',{look:'가'.repeat(400),persona:'<b>굵게</b>',bio:''})`);
  assert.equal(f.run('G.char.look.length'),300);
  f.run('openProfile()');assert.match(f.run('modalHTML'),/&lt;b&gt;굵게&lt;\/b&gt;/);
});
await test('Saves keep the description; broken descriptions are refused',async()=>{
  const disk=new Map(),f=fixture({storage:disk});f.run(`newGame('서윤','sneak',${JSON.stringify(profile)})`);
  const g=fixture({storage:disk});g.run('continueGame()');assert.equal(g.run('G.char.bio'),profile.bio);
  const good=f.obj('G');
  for(const bad of [{...good,char:{...good.char,look:5}},{...good,char:{...good.char,bio:'x'.repeat(501)}}])
    assert.throws(()=>f.run(`prepareSavedGame(${JSON.stringify(JSON.stringify(bad))})`),e=>/캐릭터 설명이 손상/.test(e.message));
  const old={...good,char:{name:'옛 저장',stats:good.char.stats}};
  assert.equal(f.run(`prepareSavedGame(${JSON.stringify(JSON.stringify(old))}).char.name`),'옛 저장','saves without a description still open');
});
done('player description');
})().catch(e=>{console.error(e);process.exitCode=1});

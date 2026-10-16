// Run: node tests/hanbit-script.test.cjs
// B단계: AI 응답(줄 배열) 파서 · 폴백 · 검수 · 프롬프트 · AI 장면 1회 호출. 실제 게임 스크립트를 node:vm에서 실행한다.
const assert=require('node:assert/strict');
const {fixture,geminiReplies,test,done}=require('./_hanbit-fixture.cjs');

function game(){
  const f=fixture();
  f.run(`G=newState('도현');migrate();busy=false;resetQueue();UI.speed='off';render=()=>{};`);
  return f;
}
const parse=(f,raw,opt)=>{ f.ctx.__raw=raw; f.ctx.__opt=opt||{allowed:['me','yumin']}; return JSON.parse(JSON.stringify(f.run('parseScript(__raw,__opt)'))) };

(async()=>{
await test('A well-formed array becomes lines; code fences and surrounding talk do not matter',()=>{
  const f=game();
  const arr=[{t:'n',text:'복도가 조용하다.'},{t:'d',who:'yumin',emo:'tense',text:'들었어요?'},{t:'d',who:'me',emo:'neutral',text:'네.'}];
  const want=[{t:'n',text:'복도가 조용하다.'},{t:'d',who:'yumin',emo:'tense',text:'들었어요?'},{t:'d',who:'me',emo:'neutral',text:'네.'}];
  for(const raw of [JSON.stringify(arr),'```json\n'+JSON.stringify(arr)+'\n```','다음과 같습니다:\n'+JSON.stringify(arr)+'\n이상입니다.',JSON.stringify({lines:arr})]){
    const r=parse(f,raw); assert.equal(r.via,'json'); assert.deepEqual(r.lines,want); assert.equal(r.dropped,0);
  }
});

await test('Unknown speaker becomes narration, unknown expression becomes neutral, and a speaker who is not in the scene is not allowed',()=>{
  const f=game();
  const r=parse(f,JSON.stringify([{t:'d',who:'stranger',emo:'smile',text:'누구세요'},{t:'d',who:'yumin',emo:'rage',text:'안녕하세요'},{t:'d',who:'guard',emo:'smile',text:'거기 누구요'},{t:'d',who:'__proto__',text:'x'},{t:'d',who:'unknown',text:'AI가 알 수 없음을 고를 수는 없다'},{t:'x',text:'모르는 형식'}]));
  assert.deepEqual(r.lines.map(l=>l.t),['n','d','n','n','n','n']);
  assert.equal(r.lines[1].emo,'neutral'); assert.equal(r.lines[1].who,'yumin');
  assert.equal(r.lines.some(l=>l.who==='guard'||l.who==='stranger'||l.who==='unknown'),false);
});

await test('System notices from the AI and lines that change facts the code owns are dropped',()=>{
  const f=game();
  const r=parse(f,JSON.stringify([
    {t:'n',text:'어둠 속에서 소리가 난다.'},
    {t:'s',text:'소음 +1'},
    {t:'n',text:'소음 +3이 올랐다.'},
    {t:'n',text:'체력 -2'},
    {t:'n',text:'그는 좀비에게 물렸다.'},
    {t:'d',who:'yumin',text:'우리 탈출했다!'},
    {t:'n',text:'엔딩이 다가온다.'},
    {t:'n',text:'물 한 모금이 남았다고 생각한다.'},
  ]));
  assert.deepEqual(r.lines.map(l=>l.text),['어둠 속에서 소리가 난다.','물 한 모금이 남았다고 생각한다.']);
  assert.equal(r.dropped,6);
});

await test('A truncated array still yields its complete lines',()=>{
  const f=game();
  const r=parse(f,'[{"t":"n","text":"첫 줄"},{"t":"d","who":"yumin","emo":"sad","text":"둘째 줄"},{"t":"n","text":"잘려서 끝이 없는');
  assert.equal(r.via,'json'); assert.deepEqual(r.lines.map(l=>l.text),['첫 줄','둘째 줄']);
});

await test('Plain text falls back to narration and dialogue split by quotes, with the speaker carried over or unknown',()=>{
  const f=game();
  let r=parse(f,'복도에 발소리가 울린다.\n유민: "방금 그 소리 들었어요?"\n"아래층인 것 같은데요."\n주인공은 숨을 죽였다. 「조용히 해요.」');
  assert.equal(r.via,'text');
  assert.deepEqual(r.lines.map(l=>[l.t,l.who||'',l.text]),[
    ['n','','복도에 발소리가 울린다.'],
    ['d','yumin','방금 그 소리 들었어요?'],
    ['d','yumin','아래층인 것 같은데요.'],
    ['n','','주인공은 숨을 죽였다.'],
    ['d','yumin','조용히 해요.'],
  ]);
  r=parse(f,'그가 말했다. “이쪽이야.”');
  assert.deepEqual(r.lines.map(l=>[l.t,l.who||'']),[['n',''],['d','unknown']],'no earlier speaker -> unknown');
  assert.equal(JSON.parse(JSON.stringify(f.run("nameOf('unknown')"))),'알 수 없음');
  r=parse(f,'경비원: "여긴 위험해요."');
  assert.equal(r.lines[0].t,'n','a speaker who is not in this scene is not allowed even by name label');
  assert.ok(parse(f,'유민: 괜찮아요?').lines[0].who==='yumin','name label without quotes still marks dialogue');
  r=parse(f,'소음 +2. "체력 -1이야."');
  assert.equal(r.lines.length,0);
});

await test('Garbage or empty replies use the fallback sentence; long output is capped; each line is short enough for the screen box',()=>{
  const f=game();
  for(const raw of ['','   ',null,undefined,'{}','[]','[1,2,3]']){
    const r=parse(f,raw,{allowed:['me'],fallback:'기본 문장이다.'});
    assert.deepEqual(r.lines,[{t:'n',text:'기본 문장이다.'}],String(raw)); assert.equal(r.via,'fallback');
  }
  const many=JSON.stringify(Array.from({length:40},(_,i)=>({t:'n',text:'줄 '+i})));
  const r=parse(f,many); assert.equal(r.lines.length,14); assert.equal(r.dropped,26);
  const huge=parse(f,JSON.stringify([{t:'n',text:'가'.repeat(5000)}]));
  assert.equal(huge.lines[0].text.length,400);
  const ctl=parse(f,JSON.stringify([{t:'n',text:'앞\u0000뒤\n줄바꿈 **강조**'}]));
  assert.equal(ctl.lines[0].text,'앞 뒤 줄바꿈 강조');
});

await test('The prompt lists only the allowed speakers and expression keys, the fixed facts, and the rules, in a compact size',()=>{
  const f=game();
  f.ctx.__c={present:['yumin','nobody','me'],event:'소리가 났다',ask:'장면을 쓰세요',tone:'유민은 존댓말을 쓴다'};
  const {system,user}=JSON.parse(JSON.stringify(f.run("scenePrompt('x',__c)")));
  assert.match(system,/me:도현, yumin:유민/); assert.equal(system.includes('nobody'),false); assert.equal(system.includes('guard'),false);
  assert.match(system,/neutral, smile, fluster, sad, tense, relieved/);
  assert.match(system,/JSON 배열/); assert.match(system,/시스템 알림/); assert.match(system,/선택지를 제시하지/); assert.match(system,/유민은 존댓말/);
  assert.match(user,/1일차 저녁/); assert.match(user,/3동 7층 자취방/); assert.match(user,/주인공: 도현/); assert.match(user,/함께 있는 인물: 유민/); assert.match(user,/방금 일어난 일: 소리가 났다/);
  assert.ok(system.length+user.length<1600,'prompt stays short: '+(system.length+user.length));
  f.ctx.__c={};
  assert.match(f.run("scenePrompt('x',__c).user"),/함께 있는 인물: 없음/);
});

await test('aiScene makes exactly one AI call, shows the checked lines, locks choices while waiting, and saves nothing else',async()=>{
  const f=game(); const {run,el}=f;
  geminiReplies(f,[JSON.stringify([{t:'n',text:'소리가 멀어진다.'},{t:'d',who:'yumin',emo:'relieved',text:'갔나 봐요.'},{t:'s',text:'소음 +9'},{t:'n',text:'체력 -4'}])]);
  run("var sawBusy=null;const _c=callAI;callAI=async(...a)=>{sawBusy=busy;return _c(...a)};");
  const ok=await run("aiScene('t',{present:['yumin']})");
  assert.equal(ok,true);
  assert.equal(run('sent.length'),1,'one call');
  assert.equal(run('sawBusy'),true,'busy while waiting');
  assert.equal(run('busy'),false);
  assert.equal(run('G.log.map(x=>x.text).join("|")'),'소리가 멀어진다.|갔나 봐요.');
  assert.equal(run('G.log[1].who'),'yumin'); assert.equal(run('G.log[1].emo'),'relieved');
  assert.equal(run('G.hp'),10); assert.equal(run('G.noise.room'),0);
  assert.equal(el('scriptText').textContent,'소리가 멀어진다.');
  assert.match(run('sent[0].messages[1].content'),/함께 있는 인물: 유민/);
});

await test('No key, network failure, or an empty reply all fall back to the static sentence without breaking the game',async()=>{
  let f=game(); f.run("var calls=0;fetch=async()=>{calls++;throw new Error('x')}");
  assert.equal(await f.run("aiScene('t',{fallback:'기본 문장.'})"),false);
  assert.equal(f.run('calls'),0,'no key: no network call');
  assert.equal(f.run('G.log[0].text'),'기본 문장.'); assert.equal(f.run('busy'),false);
  f=game(); geminiReplies(f,['[]']); f.run("var calls=0");
  f.run("const _f=fetch;fetch=async(...a)=>{calls++;return _f(...a)}");
  assert.equal(await f.run("aiScene('t',{fallback:'빈 응답 대체.'})"),true);
  assert.equal(f.run('G.log[0].text'),'빈 응답 대체.'); assert.equal(f.run('calls'),1);
  f=game(); f.run("SET.keys.gemini='synthetic-key';SET.roles.story={provider:'gemini',model:'gemini-3.8-flash'};callAI=async()=>{throw new Error('offline')}");
  assert.equal(await f.run("aiScene('t',{fallback:'오프라인 대체.'})"),false);
  assert.equal(f.run('G.log[0].text'),'오프라인 대체.'); assert.equal(f.run('busy'),false);
  assert.equal(f.run("notices.some(x=>x.includes('기본 문장'))"),true);
});

await test('If the game is replaced while the AI is answering, the late reply is discarded',async()=>{
  const f=game(); geminiReplies(f,[JSON.stringify([{t:'n',text:'늦은 응답'}])]);
  f.run("const _c=callAI;callAI=async(...a)=>{const r=await _c(...a);G=newState('다른 판');migrate();return r}");
  assert.equal(await f.run("aiScene('t',{})"),false);
  assert.equal(f.run('G.log.length'),0);
});

await test('A busy game refuses a second call, and the menu no longer offers dev test scenes',async()=>{
  const f=game(); f.run('openMenu()');
  assert.doesNotMatch(f.run('modalHTML'),/AI 장면 시험|더미/);
  geminiReplies(f,['[]']); f.run('busy=true');
  assert.equal(await f.run("aiScene('t',{})"),false);
  assert.equal(f.run('sent.length'),0);
});

done('AI script parser');
})().catch(e=>{console.error(e);process.exitCode=1});

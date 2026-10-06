// Run: node tests/hanbit-narration-address.test.cjs
// Narration refers to the player as "당신"; characters keep their own speech style in dialogue.
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../hanbit.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
let count=0;
function test(name,fn){fn();count++;console.log('PASS',name)}
test('Main prompt orders second-person narration with 당신 and keeps NPC dialogue separate',()=>{
  assert.match(script,/2인칭 현재형\("당신은 ~한다"\)/);
  assert.match(script,/"너"·"네"로 쓰지 않는다\. 단, 유민 등 인물의 대사/);
  assert.doesNotMatch(script,/2인칭 현재형\(\\?"너는 ~한다/);
});
test('Zone and mystery generators ask for 당신 narration',()=>{
  assert.equal((script.match(/2인칭 현재형\(당신\)/g)||[]).length,2);
  assert.match(script,/2인칭 현재형\(\\"당신은 ~한다\\"\)/);
});
test('Social scene writers name the player 당신 in narration',()=>{
  assert.equal((script.match(/서술에서 플레이어는 "당신"으로 지칭한다/g)||[]).length,2);
});
test('Built-in narration lines and player-facing logs never address the player as 너/네',()=>{
  for(const bad of ['너를 흘끗','너는 숨을 멈추고','네 그림자','노랫소리가 너를','출석부에서 네 이름','`너는 이곳을 조사하고','`너는 선택한 가설과',"'너는 현재 공간에서"])assert.ok(!script.includes(bad),bad);
  for(const good of ['당신을 흘끗','당신은 숨을 멈추고','당신의 그림자','노랫소리가 당신을','출석부에서 당신의 이름','`당신은 이곳을 조사하고'])assert.ok(script.includes(good),good);
});
test('Prompt document matches the game prompt',()=>{
  const md=fs.readFileSync(path.join(__dirname,'../system_prompt_hanbit.md'),'utf8');
  assert.match(md,/2인칭 현재형\("당신은 ~한다"\)/);
  assert.doesNotMatch(md,/2인칭 현재형\("너는 ~한다"\)/);
});
console.log(`${count} narration-address scenario groups passed.`);

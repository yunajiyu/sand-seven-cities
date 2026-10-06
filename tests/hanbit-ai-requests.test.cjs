// Run: node tests/hanbit-ai-requests.test.cjs
// Uses the actual game script. Network is stubbed; checks timeout, retry and non-JSON handling of AI calls.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../hanbit.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
new vm.Script(script);
function fixture(){
  const el={style:{},dataset:{},value:'',insertAdjacentHTML(){},remove(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},querySelectorAll(){return []},setAttribute(){},getAttribute(){return null}};
  const ctx=vm.createContext({console,crypto:crypto.webcrypto,TextEncoder,URLSearchParams,AbortSignal,atob,btoa,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return el},querySelector(){return el},querySelectorAll(){return []},addEventListener(){},documentElement:el},window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math:Object.create(Math)});
  vm.runInContext(script.slice(0,script.indexOf('/* 시작: 화면 설정 적용')),ctx);
  const run=s=>vm.runInContext(s,ctx),obj=s=>JSON.parse(JSON.stringify(run(s)));
  run(`const calls=[],notices=[]; let chipHTML='',modalHTML='';
    addLog=()=>{};toast=s=>notices.push(s);render=()=>{};renderSides=()=>{};save=()=>{};sfx=()=>{};
    maybeIncoming=()=>{};closeModal=()=>{};apptRefresh=()=>{};renderChat=()=>{};askConfirm=async()=>true;const liveAiTurn=aiTurn;aiTurn=async(...args)=>calls.push(args);
    chip=s=>{chipHTML=s};hideChip=()=>{};modal=(title,s)=>{modalHTML=s};
    function seed(loc='site'){
      G={v:1,_phoneLightVersion:1,_fearBalanceVersion:1,_relVersion:2,_clockVersion:2,_affLv:2,char:{name:'테스트',age:17,stats:{str:1,wis:1,cha:1,sur:1},traits:[]},day:1,time:'방과 후',dayStep:0,loc,steps:0,hp:12,maxhp:12,calm:10,battery:6,torch:0,cash:100,items:[],mat:{metal:0,ply:0,wire:0,keepsake:0},act:1,fragments:0,sitesDone:0,district:'music',comp:{met:false,joined:false,aff:10},rel:{},chronicle:[],site:loc==='site'?{name:'피아노 괴담 구역',pos:{x:225,y:180},depth:1,cur:'r1',rooms:[{id:'r1',name:'입구',lv:0,danger:0,visited:true,exits:['r2','r3']},{id:'r2',name:'피아노실',lv:1,danger:0,visited:true,exits:['r1']},{id:'r3',name:'방송실',lv:1,danger:0,visited:true,exits:['r1']},{id:'r4',name:'창고',lv:2,danger:0,visited:true,exits:['r3']}]}:null};
      busy=false;PENDING={note:'',flags:{}};migrate();syncSchedule();Math.random=()=>0.99;calls.length=notices.length=0;chipHTML=modalHTML='';
    }
    seed('campus');G.comp.met=true;getRel('유민');getRel('서연');G.comp.spot='market';G.comp.spotKey=yKey();
  `);
  return {run,obj,input:el,ctx};
}
let count=0;
async function test(name,fn){await fn();count++;console.log('PASS',name)}
const setup=extra=>{const f=fixture();f.run("SET.keys.gemini='synthetic-key';SET.roles.story={provider:'gemini',model:'gemini-3.8-flash'};setTimeout=fn=>{fn();return 0};const sent=[];"+extra);return f};
(async()=>{
await test('Every AI request carries a timeout signal',async()=>{
  const f=setup("fetch=async(u,init)=>{sent.push(init);return {ok:true,status:200,json:async()=>({choices:[{message:{content:'응답'}}]})}}");
  assert.equal(await f.run("callAI('s','u')"),'응답');
  assert.ok(f.run('sent[0].signal instanceof AbortSignal'));
});
await test('Anthropic requests also carry a timeout signal',async()=>{
  const f=setup("SET.keys.anthropic='synthetic-key';SET.roles.story={provider:'anthropic',model:'claude-sonnet-5-5'};fetch=async(u,init)=>{sent.push(init);return {ok:true,status:200,json:async()=>({content:[{text:'클로드'}]})}}");
  assert.equal(await f.run("callAI('s','u')"),'클로드');
  assert.ok(f.run('sent[0].signal instanceof AbortSignal'));
});
await test('A timed-out request fails with a clear message and is not retried',async()=>{
  const f=setup("fetch=async()=>{sent.push(1);const e=new Error('t');e.name='TimeoutError';throw e}");
  await assert.rejects(f.run("callAI('s','u')"),/115초/);
  assert.equal(f.run('sent.length'),1);
});
await test('A dropped connection is retried once, then reported in plain words',async()=>{
  const f=setup("fetch=async()=>{sent.push(1);throw new TypeError('Failed to fetch')}");
  await assert.rejects(f.run("callAI('s','u')"),/연결하지 못했습니다/);
  assert.equal(f.run('sent.length'),2);
});
await test('A temporary 503 is retried once and then succeeds',async()=>{
  const f=setup("fetch=async()=>{sent.push(1);return sent.length===1?{ok:false,status:503,json:async()=>({error:{message:'overloaded'}})}:{ok:true,status:200,json:async()=>({choices:[{message:{content:'회복'}}]})}}");
  assert.equal(await f.run("callAI('s','u')"),'회복');
  assert.equal(f.run('sent.length'),2);
});
await test('A persistent 429 stops after one retry and reports the provider message',async()=>{
  const f=setup("fetch=async()=>{sent.push(1);return {ok:false,status:429,json:async()=>({error:{message:'quota exceeded'}})}}");
  await assert.rejects(f.run("callAI('s','u')"),/quota exceeded/);
  assert.equal(f.run('sent.length'),2);
});
await test('Non-retryable errors such as 401 are not retried',async()=>{
  const f=setup("fetch=async()=>{sent.push(1);return {ok:false,status:401,json:async()=>({error:{message:'bad key'}})}}");
  await assert.rejects(f.run("callAI('s','u')"),/bad key/);
  assert.equal(f.run('sent.length'),1);
});
await test('An HTML gateway error never leaks a JSON parser message',async()=>{
  const f=setup("fetch=async()=>({ok:false,status:502,json:async()=>{throw new SyntaxError('Unexpected token <')}})");
  await assert.rejects(f.run("callAI('s','u')"),e=>/HTTP 502/.test(e.message)&&!/Unexpected token/.test(e.message));
});
await test('A successful reply that is not JSON gets a readable error',async()=>{
  const f=setup("fetch=async()=>({ok:true,status:200,json:async()=>{throw new SyntaxError('Unexpected token <')}})");
  await assert.rejects(f.run("callAI('s','u')"),e=>/올바른 응답/.test(e.message)&&!/Unexpected token/.test(e.message));
});
await test('The existing effort fallback still retries without reasoning_effort',async()=>{
  const f=setup("fetch=async(u,init)=>{const b=JSON.parse(init.body);sent.push(!!b.reasoning_effort);return b.reasoning_effort?{ok:false,status:400,json:async()=>({error:{message:'unknown field reasoning_effort'}})}:{ok:true,status:200,json:async()=>({choices:[{message:{content:'재시도'}}]})}}");
  assert.equal(await f.run("callAI('s','u')"),'재시도');
  assert.deepEqual(f.obj('sent'),[true,false]);
});
console.log(`${count} AI request robustness scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

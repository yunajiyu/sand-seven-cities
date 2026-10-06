// Run: node tests/hanbit-vertex.test.cjs
// Uses the actual game script. DOM/storage and network AI calls are stubbed.
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
const relay=require('../vertex-relay/server.cjs'),crypto=require('node:crypto'),fsp=require('node:fs/promises'),os=require('node:os');
const pair=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const credentials=relay.validateCredentials({type:'service_account',client_email:'test@test-project.iam.gserviceaccount.com',project_id:'test-project',private_key_id:'synthetic-test-key',private_key:pair.privateKey.export({format:'pem',type:'pkcs8'})});
const input={model:'gemini-3.5-flash',system:'JSON 장면을 작성한다',user:'함께 시간을 보낸다',role:'story',effort:'low',maxTokens:1200};
const response=(status,data)=>({status,ok:status>=200&&status<300,json:async()=>data});
const oauth=()=>response(200,{access_token:'synthetic-google-token',expires_in:3600,token_type:'Bearer'});
const output=()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:'비공개 생각',thought:true},{text:'{"narration":"함께한다"}'}]}}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:20,thoughtsTokenCount:30,cachedContentTokenCount:40}});
let count=0;
async function test(name,fn){await fn();count++;console.log('PASS',name)}
async function withServer(fn,{client={generate:async()=>relay.normalizeVertex(output())},perMinute=30}={}){
 const root=await fsp.mkdtemp(path.join(os.tmpdir(),'hanbit-vertex-'));await fsp.mkdir(path.join(root,'images'));await fsp.writeFile(path.join(root,'hanbit.html'),'<p>game</p>');await fsp.writeFile(path.join(root,'private.json'),'synthetic-private-marker');await fsp.writeFile(path.join(root,'images','ok.png'),'image');
 const server=relay.createRelayServer({client,root,relayToken:'r'.repeat(32),allowedOrigins:['https://game.example'],perMinute});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 try{await fn(base,root)}finally{await new Promise(r=>server.close(r));await fsp.rm(root,{recursive:true,force:true})}
}
function post(base,body=input,headers={}){return fetch(base+'/api/vertex/generate',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+'r'.repeat(32),Origin:'https://game.example',...headers},body:JSON.stringify(body)})}
(async()=>{
await test('Service-account keys require the correct type and RSA private key',()=>{
 assert.throws(()=>relay.validateCredentials({type:'authorized_user'}),/JSON/);assert.throws(()=>relay.validateCredentials({type:'service_account',client_email:'test@test-project.iam.gserviceaccount.com',private_key:'broken'}),/private_key/);
 const weak=crypto.generateKeyPairSync('rsa',{modulusLength:1024});assert.throws(()=>relay.validateCredentials({type:'service_account',client_email:credentials.email,private_key:weak.privateKey.export({format:'pem',type:'pkcs8'})}),/2048/);
});
await test('JWT is a valid RSA-SHA256 service-account assertion with a bounded lifetime and fixed scope',()=>{
 const jwt=relay.createAssertion(credentials,1700000000000),[header,payload,sig]=jwt.split('.'),h=JSON.parse(Buffer.from(header,'base64url')),p=JSON.parse(Buffer.from(payload,'base64url'));
 assert.equal(h.alg,'RS256');assert.equal(h.kid,'synthetic-test-key');assert.equal(p.iss,credentials.email);assert.equal(p.aud,'https://oauth2.googleapis.com/token');assert.equal(p.scope,'https://www.googleapis.com/auth/cloud-platform');assert.equal(p.exp-p.iat,3600);assert.ok(crypto.verify('RSA-SHA256',Buffer.from(header+'.'+payload),pair.publicKey,Buffer.from(sig,'base64url')));
});
await test('Parallel requests share a token exchange and renew before expiry',async()=>{
 let clock=1700000000000,calls=0;const tokens=relay.createTokenSource(credentials,{now:()=>clock,fetchImpl:async(url,opt)=>{calls++;assert.equal(url,'https://oauth2.googleapis.com/token');assert.equal(new URLSearchParams(opt.body).get('grant_type'),'urn:ietf:params:oauth:grant-type:jwt-bearer');return oauth()}});
 await Promise.all([tokens.get(),tokens.get(),tokens.get()]);assert.equal(calls,1);await tokens.get();assert.equal(calls,1);clock+=3550000;await tokens.get();assert.equal(calls,2);
});
await test('OAuth failure clears the pending request so later calls can recover without leaking errors',async()=>{
 let calls=0;const tokens=relay.createTokenSource(credentials,{fetchImpl:async()=>++calls===1?response(400,{error_description:'synthetic-secret'}):oauth()});await assert.rejects(tokens.get(),e=>!e.message.includes('synthetic-secret')&&/OAuth/.test(e.message));assert.equal(await tokens.get(),'synthetic-google-token');
});
await test('Global and regional URLs use the fixed Google endpoint, never a client-provided URL',async()=>{
 for(const location of ['global','asia-northeast1']){const urls=[];const client=relay.createVertexClient({credentials,project:'test-project',location,fetchImpl:async(url,opt)=>{urls.push(url);if(url.includes('/token'))return oauth();assert.equal(opt.headers.authorization,'Bearer synthetic-google-token');const body=JSON.parse(opt.body);assert.equal(body.contents[0].parts[0].text,input.user);return response(200,output())}});await client.generate({...input,url:'https://evil.example',project:'evil'});assert.ok(urls[1].startsWith(location==='global'?'https://aiplatform.googleapis.com/':'https://asia-northeast1-aiplatform.googleapis.com/'));assert.ok(urls[1].includes('/projects/test-project/locations/'+location+'/'))}
});
await test('A Google 401 refreshes credentials once and never retries indefinitely',async()=>{
 let authCalls=0,generationCalls=0;const client=relay.createVertexClient({credentials,project:'test-project',location:'global',fetchImpl:async url=>{if(url.includes('/token')){authCalls++;return oauth()}generationCalls++;return generationCalls===1?response(401,{}):response(200,output())}});await client.generate(input);assert.equal(authCalls,2);assert.equal(generationCalls,2);
 const always=relay.createVertexClient({credentials,project:'test-project',location:'global',fetchImpl:async url=>url.includes('/token')?oauth():response(401,{})});await assert.rejects(always.generate(input),/인증 실패/);
});
await test('Invalid projects, regions and model paths are rejected before any Google call',()=>{
 for(const overrides of [{project:'../../evil'},{location:'global.evil'},{models:['https://evil.example']}])assert.throws(()=>relay.createVertexClient({credentials,project:'test-project',location:'global',...overrides}));
 assert.throws(()=>relay.validateInput({...input,model:'unapproved'},[input.model]),/허용하지/);assert.throws(()=>relay.validateInput({...input,maxTokens:999999},[input.model]),/8192/);assert.throws(()=>relay.validateInput({...input,role:'admin'},[input.model]),/역할/);
});
await test('Gemini 3 thinking level and 2.5 thinking budget preserve role settings',()=>{
 assert.equal(relay.vertexBody({...input,effort:'high'}).generationConfig.thinkingConfig.thinkingLevel,'HIGH');assert.equal(relay.vertexBody({...input,model:'gemini-2.5-flash',effort:'medium'}).generationConfig.thinkingConfig.thinkingBudget,1024);assert.ok(relay.vertexBody(input).generationConfig.maxOutputTokens>=3000);
});
await test('Thought text is filtered while thought and cached token usage is counted',()=>{
 const result=relay.normalizeVertex(output());assert.equal(result.text,'{"narration":"함께한다"}');assert.deepEqual(result.usage,{inputTokens:100,outputTokens:50,cachedTokens:40});assert.doesNotMatch(JSON.stringify(result),/비공개 생각|access_token|private_key/);
});
await test('Blocked, empty and truncated output cannot become a partial game scene',()=>{
 for(const data of [null,{}, {promptFeedback:{blockReason:'SAFETY'}},{candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{"partial"'}]}}]}])assert.throws(()=>relay.normalizeVertex(data));
});
await test('Permission and quota errors are actionable and do not echo upstream secret-bearing messages',async()=>{
 for(const status of [403,404,429]){const client=relay.createVertexClient({credentials,project:'test-project',location:'global',fetchImpl:async url=>url.includes('/token')?oauth():response(status,{error:{message:'synthetic-secret'}})});await assert.rejects(client.generate(input),e=>!e.message.includes('synthetic-secret')&&e.status===(status===429?429:502))}
});
await test('Relay HTTP authentication and Origin checks block calls before generation',()=>withServer(async base=>{
 assert.equal((await post(base,input,{authorization:'Bearer wrong'})).status,401);assert.equal((await post(base,input,{Origin:'https://evil.example'})).status,403);assert.equal((await post(base,input,{'content-type':'text/plain'})).status,415);
 const r=await post(base);assert.equal(r.status,200);assert.equal(r.headers.get('access-control-allow-origin'),'https://game.example');assert.equal((await r.json()).text,'{"narration":"함께한다"}');
}));
await test('Preflight permits only configured origins and advertised auth headers',()=>withServer(async base=>{
 const r=await fetch(base+'/api/vertex/generate',{method:'OPTIONS',headers:{Origin:'https://game.example'}});assert.equal(r.status,204);assert.match(r.headers.get('access-control-allow-headers'),/Authorization/);assert.equal((await fetch(base+'/api/vertex/generate',{method:'OPTIONS',headers:{Origin:'null'}})).status,403);
}));
await test('Static hosting serves only game and approved images, never JSON keys or traversal',()=>withServer(async base=>{
 assert.match(await (await fetch(base+'/hanbit.html')).text(),/game/);assert.equal((await fetch(base+'/images/ok.png')).status,200);for(const p of ['/private.json','/vertex-relay/server.cjs','/images/%2e%2e%2fprivate.json','/.env'])assert.equal((await fetch(base+p)).status,404);
}));
await test('Image symlinks cannot escape the approved asset directory',()=>withServer(async(base,root)=>{
 await fsp.symlink(path.join(root,'private.json'),path.join(root,'images','leak.png'));assert.equal((await fetch(base+'/images/leak.png')).status,404);
}));
await test('Rate limits prevent extra generation requests and generic failures redact internals',async()=>{
 await withServer(async base=>{assert.equal((await post(base)).status,200);assert.equal((await post(base)).status,429)},{perMinute:1});
 await withServer(async base=>{const r=await post(base);assert.equal(r.status,500);assert.doesNotMatch(JSON.stringify(await r.json()),/synthetic-secret/)},{client:{generate:async()=>{throw Error('synthetic-secret')}}});
});
await test('Browser Vertex calls use the relay and preserve all game role settings',async()=>{
 const {run,obj}=fixture();run("SET.vertexRelayUrl='https://relay.example';SET.keys.vertex='r'.repeat(32);SET.roles.story={provider:'vertex',model:'gemini-3.5-flash',effort:'high'};const sent=[];fetch=async(url,opt)=>{sent.push({url,opt});return {ok:true,json:async()=>({text:'장면',usage:{inputTokens:100,outputTokens:50,cachedTokens:40}})}}");assert.equal(await run("callAI('체계','행동',1200,'story')"),'장면');
 const sent=obj('sent[0]');assert.equal(sent.url,'https://relay.example/api/vertex/generate');assert.equal(JSON.parse(sent.opt.body).effort,'high');assert.equal(JSON.parse(sent.opt.body).role,'story');assert.doesNotMatch(sent.opt.body,/private_key|client_email|access_token/);assert.equal(run('USAGE.roles.story.out'),50);assert.equal(run('USAGE.roles.story.unk'),1);
});
await test('Missing relay configuration and insecure non-loopback URLs fail before network use',async()=>{
 const {run}=fixture();run("SET.vertexMode='relay';SET.roles.story={provider:'vertex',model:'gemini-3.5-flash'};fetch=async()=>{throw Error('should never fetch')}");await assert.rejects(run("callAI('system','user')"),/중계 서버 주소/);
 for(const url of ['http://remote.example','https://user:password@relay.example','https://relay.example?token=secret'])assert.throws(()=>run(`vertexRelayBase(${JSON.stringify(url)})`),/HTTPS/);
 assert.equal(run("vertexRelayBase('http://127.0.0.1:8899/')"),'http://127.0.0.1:8899');
});
await test('Service-account JSON cannot be used as a browser bearer credential',async()=>{
 const {run}=fixture();run("SET.vertexRelayUrl='https://relay.example';SET.roles.story={provider:'vertex',model:'gemini-3.5-flash'};SET.keys.vertex=JSON.stringify({private_key:'synthetic-private-marker'});fetch=async()=>{throw Error('should never fetch')}");await assert.rejects(run("callAI('system','user')"),/서버에서만/);
});
await test('Settings reject accidental JSON key paste before saving anything',()=>{
 const {run}=fixture();run("const fields={k_vertex:{value:'{\"private_key\":\"synthetic\"}'},sVertex:{value:'https://relay.example'}};document.getElementById=id=>fields[id]||null;const beforeSettings=JSON.stringify(SET)");assert.equal(run('saveSetQuiet()'),false);assert.equal(run('JSON.stringify(SET)'),run('beforeSettings'));
});
await test('Settings can switch all roles to Vertex and keep cheap roles on the same provider',()=>{
 const {run}=fixture();run("const fields={};AI_ROLES.forEach(r=>{fields['rp_'+r.k]={value:'gemini'};fields['rm_'+r.k]={value:''};fields['re_'+r.k]={value:'low'}});document.getElementById=id=>fields[id]||null;applyVertexModels();applySavingModels()");assert.equal(run("fields.rp_lex.value"),'vertex');assert.equal(run("fields.rm_lex.value"),'gemini-3.5-flash-lite');assert.equal(run("fields.rp_story.value"),'vertex');
});
await test('Existing Gemini connections still use their original API without a relay',async()=>{
 const {run}=fixture();run("SET.keys.gemini='synthetic-key';const urls=[];fetch=async url=>{urls.push(url);return {ok:true,json:async()=>({choices:[{message:{content:'기존 응답'}}],usage:{prompt_tokens:10,completion_tokens:20}})}}");assert.equal(await run("callAI('system','user')"),'기존 응답');assert.match(run('urls[0]'),/generativelanguage.googleapis.com/);
});
await test('Relay errors and malformed successful responses are not treated as valid scenes',async()=>{
 const {run}=fixture();run("SET.keys.vertex='r'.repeat(32);SET.vertexRelayUrl='https://relay.example';SET.roles.story={provider:'vertex',model:'gemini-3.5-flash'};fetch=async()=>({ok:false,status:403,json:async()=>({error:{message:'권한 확인'}})})");await assert.rejects(run("callAI('system','user')"),/권한 확인/);run("fetch=async()=>({ok:true,json:async()=>({text:''})})");await assert.rejects(run("callAI('system','user')"),/빈 응답/);
});
function browserFixture(){
 const f=fixture();f.ctx.jsonKeyText=JSON.stringify({type:'service_account',project_id:'test-project',client_email:'test@test-project.iam.gserviceaccount.com',private_key_id:'synthetic-key-id',private_key:pair.privateKey.export({format:'pem',type:'pkcs8'}),token_uri:'https://evil.example'});
 f.run(`SET.vertexMode='browser';SET.roles.story={provider:'vertex',model:'gemini-3.5-flash',effort:'high'};const browserRequests=[];fetch=async(url,opt)=>{browserRequests.push({url,opt});return url.endsWith('/token')?{ok:true,status:200,json:async()=>({access_token:'synthetic-token',expires_in:3600,token_type:'Bearer'})}:{ok:true,status:200,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:'hidden thought',thought:true},{text:'장면'}]}}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:20,thoughtsTokenCount:30,cachedContentTokenCount:40}})}}`);
 return f;
}
await test('Browser imports a non-exportable key and signs a valid JWT only for the fixed Google token URL',async()=>{
 const {run,obj}=browserFixture();
 await run('(async()=>{VERTEX_BROWSER=await vertexImport(jsonKeyText);await vertexBrowserToken(VERTEX_BROWSER)})()');
 assert.equal(run('VERTEX_BROWSER.key.extractable'),false);const req=obj('browserRequests[0]');assert.equal(req.url,'https://oauth2.googleapis.com/token');
 const [h,p,s]=new URLSearchParams(req.opt.body).get('assertion').split('.');const payload=JSON.parse(Buffer.from(p,'base64url'));assert.equal(payload.iss,credentials.email);assert.equal(payload.exp-payload.iat,3600);assert.equal(payload.aud,req.url);assert.equal(payload.scope,'https://www.googleapis.com/auth/cloud-platform');assert.ok(crypto.verify('RSA-SHA256',Buffer.from(h+'.'+p),pair.publicKey,Buffer.from(s,'base64url')));
 await assert.rejects(run("crypto.subtle.exportKey('pkcs8',VERTEX_BROWSER.key)"));assert.doesNotMatch(run('JSON.stringify(SET)'),/PRIVATE KEY|private_key|synthetic-token|synthetic-key-id/);
});
await test('Browser rejects malformed, wrong-type, invalid-project and invalid-key files before network calls',async()=>{
 const {run}=browserFixture();for(const value of ['bad',JSON.stringify({type:'authorized_user'}),JSON.stringify({type:'service_account',project_id:'../evil',client_email:credentials.email,private_key:'bad'})])await assert.rejects(run(`vertexImport(${JSON.stringify(value)})`));assert.equal(run('browserRequests.length'),0);
});
await test('Browser direct generation preserves thinking and usage, excludes credentials and filters thoughts',async()=>{
 const {run,obj}=browserFixture();await run('(async()=>{VERTEX_BROWSER=await vertexImport(jsonKeyText)})()');assert.equal(await run("callAI('체계','행동',1200,'story')"),'장면');
 const req=obj('browserRequests[1]');assert.match(req.url,/^https:\/\/aiplatform.googleapis.com\/v1\/projects\/test-project\/locations\/global\//);assert.equal(req.opt.headers.authorization,'Bearer synthetic-token');const body=JSON.parse(req.opt.body);assert.equal(body.generationConfig.thinkingConfig.thinkingLevel,'HIGH');assert.equal(body.contents[0].parts[0].text,'행동');assert.doesNotMatch(req.opt.body,/private_key|PRIVATE KEY|client_email|synthetic-token/);assert.equal(run('USAGE.roles.story.out'),50);assert.equal(run('USAGE.roles.story.cr'),40);
});
await test('Browser concurrent calls share OAuth and expired tokens renew before calls',async()=>{
 const {run}=browserFixture();await run('(async()=>{VERTEX_BROWSER=await vertexImport(jsonKeyText)})()');await run("Promise.all([callAI('s','u'),callAI('s','u'),callAI('s','u')])");assert.equal(run("browserRequests.filter(r=>r.url.endsWith('/token')).length"),1);run('VERTEX_BROWSER.token.expires=Date.now()+30000');await run("callAI('s','u')");assert.equal(run("browserRequests.filter(r=>r.url.endsWith('/token')).length"),2);
});
await test('Browser 401 refresh is bounded and Google error bodies cannot leak sensitive details',async()=>{
 const {run}=browserFixture();await run('(async()=>{VERTEX_BROWSER=await vertexImport(jsonKeyText)})()');run("const originalFetch=fetch;let generation=0;fetch=async(url,opt)=>url.endsWith('/token')?originalFetch(url,opt):{ok:false,status:401,json:async()=>({error:{message:'synthetic-secret'}})}");await assert.rejects(run("callAI('s','u')"),e=>/JSON 키/.test(e.message)&&!e.message.includes('synthetic-secret'));assert.equal(run("browserRequests.filter(r=>r.url.endsWith('/token')).length"),2);
 for(const status of [403,404,429]){run(`fetch=async()=>({ok:false,status:${status},json:async()=>({error:{message:'synthetic-secret'}})})`);await assert.rejects(run("callAI('s','u')"),e=>!e.message.includes('synthetic-secret'))}
});
await test('Browser generation rejects blocked, truncated and empty responses',async()=>{
 const {run}=browserFixture();await run('(async()=>{VERTEX_BROWSER=await vertexImport(jsonKeyText);await vertexBrowserToken(VERTEX_BROWSER)})()');
 for(const d of [null,{}, {promptFeedback:{blockReason:'SAFETY'}},{candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'partial'}]}}]}]){run(`fetch=async()=>({ok:true,status:200,json:async()=>(${JSON.stringify(d)})})`);await assert.rejects(run("callAI('s','u')"))}
});
await test('File selection auto-authenticates and persists only role/settings values, never the key',async()=>{
 const {run,obj}=browserFixture();run(`const fields={sVertexMode:{value:'browser'},sVertexLocation:{value:'global'},vertexStatus:{textContent:''}};AI_ROLES.forEach(r=>{fields['rp_'+r.k]={value:'gemini'};fields['rm_'+r.k]={value:''};fields['re_'+r.k]={value:'low'}});document.getElementById=id=>fields[id]||null;const saved=[];localStorage.setItem=(k,v)=>saved.push(v);const chosen={value:'selected.json',files:[{size:1000,text:async()=>jsonKeyText}]}`);
 await run('selectVertexJSON(chosen)');assert.equal(run('chosen.value'),'');assert.equal(run('aiProviderReady("vertex")'),true);assert.ok(obj('AI_ROLES.map(r=>SET.roles[r.k].provider)').every(p=>p==='vertex'));assert.match(run('fields.vertexStatus.textContent'),/인증 완료/);assert.doesNotMatch(run('saved.join(" ")'),/PRIVATE KEY|private_key|synthetic-token|synthetic-key-id/);
 run('disconnectVertex()');assert.equal(run('aiProviderReady("vertex")'),false);await assert.rejects(run("callAI('s','u')"),/JSON 파일/);
});
await test('Oversized files and cancelled or superseded selections never connect or retain input values',async()=>{
 const {run}=browserFixture();run("const fields={vertexStatus:{textContent:''}};document.getElementById=id=>fields[id]||null;const tooBig={value:'file',files:[{size:65537,text:async()=>jsonKeyText}]}");await run('selectVertexJSON(tooBig)');assert.equal(run('VERTEX_BROWSER'),null);assert.equal(run('tooBig.value'),'');assert.equal(run('browserRequests.length'),0);
 run('let releaseRead;const delayed={value:"file",files:[{size:100,text:()=>new Promise(r=>releaseRead=r)}]};const selectionTask=selectVertexJSON(delayed);disconnectVertex();releaseRead(jsonKeyText)');await run('selectionTask');assert.equal(run('VERTEX_BROWSER'),null);
});
console.log(`${count} Vertex authentication/relay scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

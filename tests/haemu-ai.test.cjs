// Run: node tests/haemu-ai.test.cjs
// Uses the actual haemu.html script. Ported from hanbit-ai-requests/hanbit-vertex (the AI layer is the same code):
// timeouts, retries, Vertex JSON-key auth in the browser, remembered connections, and that keys never reach saves.
const assert=require('node:assert/strict');
const {fixture:base,test,done}=require('./_haemu-fixture.cjs');
const fixture=()=>base();
const relay=require('../vertex-relay/server.cjs'),crypto=require('node:crypto'),fsp=require('node:fs/promises'),os=require('node:os');
const pair=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const credentials=relay.validateCredentials({type:'service_account',client_email:'test@test-project.iam.gserviceaccount.com',project_id:'test-project',private_key_id:'synthetic-test-key',private_key:pair.privateKey.export({format:'pem',type:'pkcs8'})});
(async()=>{
const setup=extra=>{const f=fixture();f.run("SET.keys.gemini='synthetic-key';SET.roles.story={provider:'gemini',model:'gemini-3.8-flash'};setTimeout=fn=>{fn();return 0};const sent=[];"+extra);return f};
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
await test('Vertex defaults to Gemini 3.8 flash for both roles and keeps user-chosen models on re-selecting the JSON',async()=>{
 const {run}=fixture();
 assert.equal(run('PRESETS.vertex.model'),'gemini-3.8-flash');
 assert.equal(run("vertexModelFor('story')"),'gemini-3.8-flash');assert.equal(run("vertexModelFor('summary')"),'gemini-3.8-flash');
 run("SET.roles={story:{provider:'vertex',model:'gemini-3.5-flash'},summary:{provider:'vertex',model:'gemini-3.8-pro'}}");
 assert.equal(run("vertexModelFor('story')"),'gemini-3.8-flash');
 assert.equal(run("vertexModelFor('summary')"),'gemini-3.8-pro');
 run("const fields={};AI_ROLES.forEach(r=>{fields['rp_'+r.k]={value:'gemini'};fields['rm_'+r.k]={value:''}});document.getElementById=id=>fields[id]||null;applyVertexModels()");
 assert.equal(run("fields.rm_summary.value"),'gemini-3.8-pro');assert.equal(run("fields.rp_story.value"),'vertex');
});
const connect=async f=>{await f.run('(async()=>{VERTEX_BROWSER=await vertexImport(jsonKeyText);await vertexBrowserToken(VERTEX_BROWSER)})()');f.run("setTimeout=fn=>{fn();return 0};SET.roles.story={provider:'vertex',model:'gemini-3.8-flash',effort:'low'}")};
const okBody="({ok:true,status:200,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:'장면'}]}}],usageMetadata:{promptTokenCount:1,candidatesTokenCount:1}})})";
await test('Browser mode retries one dropped connection (mobile network switch) and then succeeds',async()=>{
 const f=browserFixture();await connect(f);
 f.run(`let gen=0;fetch=async(url)=>{if(url.endsWith('/token'))return {ok:true,status:200,json:async()=>({access_token:'t',expires_in:3600,token_type:'Bearer'})};gen++;if(gen===1)throw new TypeError('Failed to fetch');return ${okBody}}`);
 assert.equal(await f.run("callAI('s','u')"),'장면');assert.equal(f.run('gen'),2);
});
await test('A persistent connection failure explains the mobile screen-off cause and is tried only twice',async()=>{
 const f=browserFixture();await connect(f);
 f.run("let gen=0;fetch=async(url)=>{if(url.endsWith('/token'))return {ok:true,status:200,json:async()=>({access_token:'t',expires_in:3600,token_type:'Bearer'})};gen++;throw new TypeError('Failed to fetch')}");
 await assert.rejects(f.run("callAI('s','u')"),e=>/연결하지 못했습니다/.test(e.message)&&/화면을 켠 채 다시 시도/.test(e.message)&&!/연결이 중단되었습니다/.test(e.message));
 assert.equal(f.run('gen'),2);
});
await test('A timeout says so, names the seconds, and is not retried',async()=>{
 const f=browserFixture();await connect(f);
 f.run("let gen=0;fetch=async(url)=>{if(url.endsWith('/token'))return {ok:true,status:200,json:async()=>({access_token:'t',expires_in:3600,token_type:'Bearer'})};gen++;const e=new Error('t');e.name='TimeoutError';throw e}");
 await assert.rejects(f.run("callAI('s','u')"),/Vertex AI 응답이 120초 안에 오지 않았습니다.*생각 강도를 낮추거나/);assert.equal(f.run('gen'),1);
});
await test('A response cut off mid-body is reported as such',async()=>{
 const f=browserFixture();await connect(f);
 f.run("fetch=async(url)=>url.endsWith('/token')?{ok:true,status:200,json:async()=>({access_token:'t',expires_in:3600,token_type:'Bearer'})}:{ok:true,status:200,json:async()=>{throw new SyntaxError('Unexpected end of JSON input')}}");
 await assert.rejects(f.run("callAI('s','u')"),/응답을 끝까지 받지 못했습니다/);
});
await test('Browsers without AbortSignal.timeout still get a time limit instead of a crash',async()=>{
 const f=browserFixture();await connect(f);
 f.run("AbortSignal={};const seen=[];fetch=async(url,opt)=>{seen.push(opt.signal);return url.endsWith('/token')?{ok:true,status:200,json:async()=>({access_token:'t',expires_in:3600,token_type:'Bearer'})}:"+okBody+"}");
 f.ctx.AbortController=AbortController;
 assert.equal(await f.run("callAI('s','u')"),'장면');assert.ok(f.run('seen[seen.length-1]&&typeof seen[seen.length-1].aborted==="boolean"'));
 f.ctx.AbortController=undefined;f.run('seen.length=0');assert.equal(await f.run("callAI('s','u')"),'장면');
});
// ---- 「이 기기에서 연결 기억하기」: IndexedDB에는 추출 불가 CryptoKey와 공개 정보만 ----
function fakeIDB(data=new Map()){const stores=new Set();return {data,open(){const q={};setImmediate(()=>{const db={objectStoreNames:{contains:n=>stores.has(n)},createObjectStore:n=>{stores.add(n)},close(){},transaction(){const tx={};const os={put(v,k){data.set(k,v);return {result:k}},get(k){return {result:data.get(k)}},delete(k){data.delete(k);return {result:undefined}}};tx.objectStore=()=>os;setImmediate(()=>tx.oncomplete&&tx.oncomplete());return tx}};q.result=db;q.onupgradeneeded&&q.onupgradeneeded();q.onsuccess()});return q}}}
function rememberFixture(idb,checked=true){const f=browserFixture();f.ctx.indexedDB=idb;f.run(`const fields={sVertexMode:{value:'browser'},sVertexLocation:{value:'global'},vertexStatus:{textContent:''},sVertexRemember:{checked:${checked}}};AI_ROLES.forEach(r=>{fields['rp_'+r.k]={value:'gemini'};fields['rm_'+r.k]={value:''};fields['re_'+r.k]={value:'low'}});document.getElementById=id=>fields[id]||null;const pickKey=()=>({value:'k.json',files:[{size:1000,text:async()=>jsonKeyText}]})`);return f}
const PRIVATE=/PRIVATE KEY|private_key|service_account|synthetic-token|BEGIN|token_uri|evil\.example/;
await test('Remember on: only a non-extractable key and public signing info are stored — never the PEM or JSON text',async()=>{
 const idb=fakeIDB(),f=rememberFixture(idb);await f.run('selectVertexJSON(pickKey())');
 assert.match(f.run('fields.vertexStatus.textContent'),/이 기기에서 기억합니다/);
 const rec=idb.data.get('browser');assert.ok(rec);assert.deepEqual(Object.keys(rec).sort(),['email','key','keyId','project','tokenUrl','v']);
 assert.equal(rec.key.extractable,false);assert.equal(rec.key.type,'private');assert.equal(rec.tokenUrl,'https://oauth2.googleapis.com/token');assert.equal(rec.project,'test-project');
 const {key,...pub}=rec;assert.doesNotMatch(JSON.stringify(pub),PRIVATE);await assert.rejects(crypto.webcrypto.subtle.exportKey('pkcs8',rec.key));
 assert.doesNotMatch(f.run('JSON.stringify(SET)'),PRIVATE);
});
await test('After a reload the remembered connection is restored and signs a fresh token request',async()=>{
 const idb=fakeIDB();await rememberFixture(idb).run('selectVertexJSON(pickKey())');
 const f=rememberFixture(idb);assert.equal(f.run('VERTEX_BROWSER'),null);await f.run('vertexRestore()');
 assert.equal(f.run('VERTEX_BROWSER.remembered'),true);assert.match(f.run('fields.vertexStatus.textContent'),/^기억된 연결 · test-project$/);assert.equal(f.run('aiProviderReady("vertex")'),true);
 assert.equal(await f.run("callAI('s','u',1200,'story')"),'장면');
 const tok=f.obj("browserRequests.find(r=>r.url.endsWith('/token'))");assert.equal(tok.url,'https://oauth2.googleapis.com/token');
 const [h,p,sig]=new URLSearchParams(tok.opt.body).get('assertion').split('.');assert.ok(crypto.verify('RSA-SHA256',Buffer.from(h+'.'+p),pair.publicKey,Buffer.from(sig,'base64url')));
 assert.match(f.run("browserRequests.at(-1).url"),/test-project/);
});
await test('Remember off stores nothing and clears an older remembered connection; disconnect deletes it too',async()=>{
 const idb=fakeIDB();await rememberFixture(idb,false).run('selectVertexJSON(pickKey())');assert.equal(idb.data.size,0);
 await rememberFixture(idb).run('selectVertexJSON(pickKey())');assert.equal(idb.data.size,1);
 await rememberFixture(idb,false).run('selectVertexJSON(pickKey())');assert.equal(idb.data.size,0,'re-selecting with the box off forgets the old one');
 const f=rememberFixture(idb);await f.run('selectVertexJSON(pickKey())');assert.equal(idb.data.size,1);f.run('disconnectVertex()');await new Promise(r=>setTimeout(r,20));assert.equal(idb.data.size,0);
 const g=rememberFixture(idb);assert.equal(await g.run('vertexRestore()'),null);assert.equal(g.run('aiProviderReady("vertex")'),false);
});
await test('A rejected remembered key is deleted and the player is told to choose the file again',async()=>{
 const idb=fakeIDB();await rememberFixture(idb).run('selectVertexJSON(pickKey())');
 const f=rememberFixture(idb);await f.run('vertexRestore()');f.run("fetch=async()=>({ok:false,status:400,json:async()=>({error:'invalid_grant'})})");
 await assert.rejects(f.run("callAI('s','u')"),/다시 선택/);assert.equal(f.run('VERTEX_BROWSER'),null);await new Promise(r=>setTimeout(r,20));assert.equal(idb.data.size,0);assert.match(f.run('fields.vertexStatus.textContent'),/다시 선택/);
 // 생성 요청이 계속 401이어도 지운다
 await rememberFixture(idb).run('selectVertexJSON(pickKey())');const g=rememberFixture(idb);await g.run('vertexRestore()');
 g.run("const realFetch=fetch;fetch=async(url,opt)=>url.endsWith('/token')?realFetch(url,opt):{ok:false,status:401,json:async()=>({})}");await assert.rejects(g.run("callAI('s','u')"),/다시 선택/);await new Promise(r=>setTimeout(r,20));assert.equal(idb.data.size,0);
});
await test('Tampered or extractable records are never restored; no IndexedDB quietly falls back to memory only',async()=>{
 const idb=fakeIDB();await rememberFixture(idb).run('selectVertexJSON(pickKey())');const good=idb.data.get('browser');
 const ext=await crypto.webcrypto.subtle.importKey('pkcs8',pair.privateKey.export({format:'der',type:'pkcs8'}),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},true,['sign']);
 for(const bad of [{...good,key:ext},{...good,email:'x@evil.example'},{...good,project:'../evil'},{...good,v:2}]){idb.data.set('browser',bad);const f=rememberFixture(idb);assert.equal(await f.run('vertexRestore()'),null);assert.equal(f.run('VERTEX_BROWSER'),null);await new Promise(r=>setTimeout(r,20));assert.equal(idb.data.size,0)}
 for(const broken of [undefined,{open(){throw Error('SecurityError')}}]){const f=rememberFixture(broken);await f.run('selectVertexJSON(pickKey())');assert.equal(f.run('aiProviderReady("vertex")'),true);assert.equal(await f.run('vertexRestore()').then(x=>!!x),true,'memory connection keeps working');const g=rememberFixture(broken);assert.equal(await g.run('vertexRestore()'),null)}
});
await test('Saved games, exports and imports never carry key material',async()=>{
 const idb=fakeIDB(),f=rememberFixture(idb);await f.run('selectVertexJSON(pickKey())');
 f.run("G=newGameState('시험')");
 const exported=f.run('JSON.stringify(G,null,1)');assert.doesNotMatch(exported,PRIVATE);assert.doesNotMatch(exported,/test@test-project|iam\.gserviceaccount|CryptoKey/);
 assert.doesNotMatch(f.run('snapG()'),/iam\.gserviceaccount/);
 f.run('VERTEX_BROWSER=null');f.run(`try{prepareSavedGame(JSON.stringify({...G,VERTEX_BROWSER:{project:'x'},vertex:{key:'k'}}))}catch(e){}`);assert.equal(f.run('VERTEX_BROWSER'),null);
});
await test('The title screen shows whether the Vertex connection is remembered or only for this page',async()=>{
 const idb=fakeIDB();const title=f=>{f.run("fields.aiStatus={textContent:''};fields.btnContinue={disabled:false};fields.game={classList:{contains:()=>true}};setTitle=()=>{};refreshTitle()");return f.run('fields.aiStatus.textContent')};
 const mem=rememberFixture(idb,false);await mem.run('selectVertexJSON(pickKey())');assert.match(title(mem),/Vertex: 인증 완료 · test-project \(새로고침하면 다시 선택\)/);
 await rememberFixture(idb).run('selectVertexJSON(pickKey())');
 const f=rememberFixture(idb);f.run("AI_ROLES.forEach(r=>SET.roles[r.k]={provider:'vertex',model:vertexModelFor(r.k)})");assert.doesNotMatch(title(f),/Vertex:/);await f.run('vertexRestore()');assert.match(f.run('fields.aiStatus.textContent'),/Vertex: 기억된 연결 · test-project/,'restore refreshes the title by itself');
 assert.doesNotMatch(f.run('fields.aiStatus.textContent'),/연결 설정 없음/);
 f.run("fetch=async()=>({ok:false,status:401,json:async()=>({})})");await assert.rejects(f.run("callAI('s','u')"));assert.doesNotMatch(f.run('fields.aiStatus.textContent'),/기억된 연결/);assert.match(f.run('fields.aiStatus.textContent'),/AI 키가 없으면/);
});
done('AI request/Vertex');
})().catch(e=>{console.error(e);process.exitCode=1});

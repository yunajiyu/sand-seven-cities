'use strict';
// Node.js 22+. Service-account credentials and Google access tokens stay on this server.
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const {createPrivateKey,sign,randomBytes,timingSafeEqual}=require('node:crypto');
const OAUTH_URL='https://oauth2.googleapis.com/token';
const SCOPE='https://www.googleapis.com/auth/cloud-platform';
const DEFAULT_MODELS=['gemini-3.8-flash','gemini-3.5-flash','gemini-3.5-flash-lite'];
const ROLES=['story','world','site','lex','chron','summary'];
class RelayError extends Error{constructor(status,message){super(message);this.status=status}}
function validateCredentials(raw){
 if(!raw||raw.type!=='service_account'||!/^\S+@\S+\.iam\.gserviceaccount\.com$/.test(raw.client_email||'')||typeof raw.private_key!=='string')throw new RelayError(500,'서비스 계정 JSON 키 형식을 확인하세요.');
 let privateKey;try{privateKey=createPrivateKey(raw.private_key)}catch{throw new RelayError(500,'JSON 키의 private_key를 읽을 수 없습니다.')}
 if(privateKey.asymmetricKeyType!=='rsa'||privateKey.asymmetricKeyDetails.modulusLength<2048)throw new RelayError(500,'2048비트 이상의 RSA 서비스 계정 키가 필요합니다.');
 return {email:raw.client_email,keyId:String(raw.private_key_id||''),project:raw.project_id,privateKey};
}
function createAssertion(credentials,now=Date.now()){
 const enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url'),iat=Math.floor(now/1000);
 const input=enc({alg:'RS256',typ:'JWT',...(credentials.keyId?{kid:credentials.keyId}:{})})+'.'+enc({iss:credentials.email,scope:SCOPE,aud:OAUTH_URL,iat,exp:iat+3600});
 return input+'.'+sign('RSA-SHA256',Buffer.from(input),credentials.privateKey).toString('base64url');
}
function createTokenSource(credentials,{fetchImpl=fetch,now=Date.now}={}){
 let cached=null,pending=null;
 return {
  invalidate(used){if(cached?.token===used)cached=null},
  async get(){
   if(cached&&cached.expires>now()+60000)return cached.token;
   if(pending)return pending;
   pending=(async()=>{
    let response,data;
    try{response=await fetchImpl(OAUTH_URL,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:createAssertion(credentials,now())}).toString(),signal:AbortSignal.timeout(20000)});data=await response.json()}catch{throw new RelayError(502,'Google 인증 서버에 연결하지 못했습니다.')}
    if(!response.ok||!data||typeof data.access_token!=='string'||!data.access_token||!(Number(data.expires_in)>0)||String(data.token_type).toLowerCase()!=='bearer')throw new RelayError(502,'Google OAuth 인증 실패: 서비스 계정 키와 서버 시각을 확인하세요.');
    cached={token:data.access_token,expires:now()+Number(data.expires_in)*1000};return cached.token;
   })();
   try{return await pending}finally{pending=null}
  }
 };
}
function validateInput(input,models){
 if(!input||typeof input.system!=='string'||typeof input.user!=='string'||!input.user.trim()||input.system.length+input.user.length>400000)throw new RelayError(400,'장면 요청의 system·user 문장을 확인하세요.');
 if(!models.includes(input.model))throw new RelayError(400,'중계 서버에서 허용하지 않은 모델입니다. VERTEX_MODELS 설정을 확인하세요.');
 if(!ROLES.includes(input.role)||!['low','medium','high'].includes(input.effort))throw new RelayError(400,'AI 역할 또는 생각 강도 설정이 잘못되었습니다.');
 if(!Number.isInteger(input.maxTokens)||input.maxTokens<1||input.maxTokens>8192)throw new RelayError(400,'응답 길이는 1~8192 토큰으로 설정하세요.');
 return input;
}
function vertexBody(input){
 const generationConfig={maxOutputTokens:Math.min(16384,Math.max(3000,input.maxTokens*2))};
 if(/^gemini-3\./.test(input.model))generationConfig.thinkingConfig={thinkingLevel:input.effort.toUpperCase()};
 else if(/^gemini-2\.5-flash/.test(input.model))generationConfig.thinkingConfig={thinkingBudget:{low:0,medium:1024,high:4096}[input.effort]};
 return {systemInstruction:{parts:[{text:input.system}]},contents:[{role:'user',parts:[{text:input.user}]}],generationConfig};
}
function normalizeVertex(data){
 if(!data||typeof data!=='object')throw new RelayError(502,'Vertex AI 응답 형식을 확인하세요.');
 const candidate=data.candidates?.[0],reason=candidate?.finishReason;
 if(data.promptFeedback?.blockReason||reason&&reason!=='STOP')throw new RelayError(502,reason==='MAX_TOKENS'?'Vertex AI 응답이 길이 제한으로 중단되었습니다. 응답 길이를 늘리거나 생각 강도를 낮춰 주세요.':'Vertex AI가 장면 응답을 완료하지 못했습니다.');
 const text=(candidate?.content?.parts||[]).filter(p=>!p.thought&&typeof p.text==='string').map(p=>p.text).join('');
 if(!text.trim())throw new RelayError(502,'Vertex AI가 빈 응답을 반환했습니다.');
 const u=data.usageMetadata||{},num=x=>Math.max(0,Number(x)||0);
 return {text,usage:{inputTokens:num(u.promptTokenCount),outputTokens:num(u.candidatesTokenCount)+num(u.thoughtsTokenCount),cachedTokens:num(u.cachedContentTokenCount)}};
}
function googleError(status){return new RelayError(status===429?429:502,({401:'Vertex AI 인증 실패: 서비스 계정 키를 확인하세요.',403:'Vertex AI 권한·API 사용 설정·결제 계정을 확인하세요.',404:'Vertex AI 모델 이름과 리전을 확인하세요.',429:'Vertex AI 호출 한도에 도달했습니다. 잠시 뒤 다시 시도하세요.'})[status]||'Vertex AI 요청을 처리하지 못했습니다. (HTTP '+status+')')}
function createVertexClient({credentials,project,location,models=DEFAULT_MODELS,fetchImpl=fetch,now=Date.now}){
 if(!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(project||''))throw new RelayError(500,'Google Cloud 프로젝트 ID를 확인하세요.');
 if(!/^[a-z][a-z0-9-]{1,62}$/.test(location||''))throw new RelayError(500,'Vertex AI 리전을 확인하세요.');
 if(!models.length||models.some(m=>!/^gemini-[a-z0-9.-]+$/.test(m)))throw new RelayError(500,'VERTEX_MODELS에 Gemini 모델 ID만 입력하세요.');
 const tokens=createTokenSource(credentials,{fetchImpl,now}),host=location==='global'?'aiplatform.googleapis.com':location+'-aiplatform.googleapis.com';
 return {async generate(raw){
  const input=validateInput(raw,models),url=`https://${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${input.model}:generateContent`;
  for(let attempt=0;attempt<2;attempt++){
   const token=await tokens.get();let response,data;
   try{response=await fetchImpl(url,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify(vertexBody(input)),signal:AbortSignal.timeout(90000)});data=await response.json()}catch{throw new RelayError(502,'Vertex AI 연결이 중단되었거나 응답 시간을 초과했습니다.')}
   if(response.status===401&&attempt===0){tokens.invalidate(token);continue}
   if(!response.ok)throw googleError(response.status);
   return normalizeVertex(data);
  }
 }};
}
async function readBody(req){
 let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>1024*1024)throw new RelayError(413,'요청 문장이 너무 깁니다.');chunks.push(chunk)}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw new RelayError(400,'요청 JSON 형식을 확인하세요.')}
}
function tokenMatches(header,token){const actual=Buffer.from(String(header||'')),expected=Buffer.from('Bearer '+token);return actual.length===expected.length&&timingSafeEqual(actual,expected)}
function createRelayServer({client,relayToken,allowedOrigins,root=path.resolve(__dirname,'..'),now=Date.now,maxConcurrent=4,perMinute=30}){
 if(typeof relayToken!=='string'||!/^[A-Za-z0-9_-]{24,256}$/.test(relayToken))throw new RelayError(500,'중계 접속 토큰은 영문·숫자·밑줄·하이픈으로 24~256자여야 합니다.');
 const origins=new Set(allowedOrigins);if(!origins.size||[...origins].some(o=>{try{return new URL(o).origin!==o||!/^https?:/.test(o)}catch{return true}}))throw new RelayError(500,'허용할 게임 주소의 Origin을 정확히 지정하세요.');
 let active=0,requests=[];
 const json=(res,status,obj)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(obj))};
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  try{
   const origin=req.headers.origin;if(origin&&!origins.has(origin))throw new RelayError(403,'허용되지 않은 게임 주소입니다.');
   if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin')}
   const url=new URL(req.url,'http://relay.local');
   if(req.method==='OPTIONS'&&url.pathname==='/api/vertex/generate'){
    res.writeHead(204,{'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Max-Age':'600'});res.end();return;
   }
   if(req.method==='POST'&&url.pathname==='/api/vertex/generate'){
    if(!tokenMatches(req.headers.authorization,relayToken))throw new RelayError(401,'중계 접속 토큰이 올바르지 않습니다.');
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new RelayError(415,'application/json 요청이 필요합니다.');
    requests=requests.filter(t=>t>now()-60000);if(requests.length>=perMinute||active>=maxConcurrent)throw new RelayError(429,'중계 요청이 많습니다. 잠시 뒤 다시 시도하세요.');
    requests.push(now());active++;
    try{const input=await readBody(req),result=await client.generate(input);json(res,200,result)}finally{active--}return;
   }
   if(req.method!=='GET')throw new RelayError(405,'지원하지 않는 요청입니다.');
   if(url.pathname==='/health'){json(res,200,{ok:true,provider:'vertex'});return}
   // Only the game and image assets can be served. JSON keys, code, dotfiles and traversal are never served.
   const relative=url.pathname==='/'||url.pathname==='/hanbit.html'?'hanbit.html':decodeURIComponent(url.pathname).replace(/^\//,'');
   let file=path.resolve(root,relative),mime='text/html; charset=utf-8';
   if(relative!=='hanbit.html'){
    const ext=path.extname(relative).toLowerCase();mime=({'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml'})[ext];
    if(!relative.startsWith('images/')||!mime||relative.split('/').some(p=>p==='..'||p.startsWith('.')))throw new RelayError(404,'파일을 찾을 수 없습니다.');
    const imageRoot=await fs.realpath(path.join(root,'images'));file=await fs.realpath(file);if(!file.startsWith(imageRoot+path.sep))throw new RelayError(404,'파일을 찾을 수 없습니다.');
   }
   const content=await fs.readFile(file);res.writeHead(200,{'content-type':mime,'cache-control':relative==='hanbit.html'?'no-store':'public, max-age=3600'});res.end(content);
  }catch(e){if(!res.headersSent)json(res,e instanceof RelayError?e.status:e.code==='ENOENT'?404:500,{error:{message:e instanceof RelayError?e.message:e.code==='ENOENT'?'파일을 찾을 수 없습니다.':'중계 요청을 처리하지 못했습니다.'}});else res.end()}
 });
}
async function main(){
 const argv=process.argv.slice(2);if(argv.length&&!(argv.length===2&&argv[0]==='--key'))throw new RelayError(500,'실행 방법: node vertex-relay/server.cjs --key "서비스 계정 JSON 경로"');
 const keyPath=argv[1]||process.env.GOOGLE_APPLICATION_CREDENTIALS;if(!keyPath)throw new RelayError(500,'--key 또는 GOOGLE_APPLICATION_CREDENTIALS로 JSON 키 경로를 지정하세요.');
 let raw;try{raw=JSON.parse((await fs.readFile(keyPath,'utf8')).replace(/^\uFEFF/,''))}catch{throw new RelayError(500,'서비스 계정 JSON 파일을 읽을 수 없습니다.')}
 const credentials=validateCredentials(raw),host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||8899),local=['127.0.0.1','localhost','::1'].includes(host);
 if(!Number.isInteger(port)||port<1||port>65535)throw new RelayError(500,'PORT는 1~65535 사이의 포트여야 합니다.');
 if(!local&&!process.env.VERTEX_RELAY_TOKEN)throw new RelayError(500,'외부 서버에서는 VERTEX_RELAY_TOKEN을 지정하세요.');
 const relayToken=process.env.VERTEX_RELAY_TOKEN||randomBytes(32).toString('hex');
 const allowedOrigins=(process.env.VERTEX_ALLOWED_ORIGINS||`http://127.0.0.1:${port},http://localhost:${port}`).split(',').map(s=>s.trim()).filter(Boolean);
 const client=createVertexClient({credentials,project:process.env.GOOGLE_CLOUD_PROJECT||credentials.project,location:process.env.VERTEX_LOCATION||'global',models:(process.env.VERTEX_MODELS||DEFAULT_MODELS.join(',')).split(',').map(s=>s.trim()).filter(Boolean)});
 const server=createRelayServer({client,relayToken,allowedOrigins});server.requestTimeout=120000;server.headersTimeout=15000;
 server.on('error',()=>{console.error('중계 서버를 시작하지 못했습니다. 포트 사용 여부를 확인하세요.');process.exitCode=1});
 server.listen(port,host,()=>{console.log(`Vertex AI 중계 서버 시작 · 포트 ${port}`);if(local){console.log(`게임: http://${host==='::1'?'[::1]':host}:${port}/hanbit.html`);console.log('AI 설정의 중계 접속 토큰: '+relayToken)}else console.log('게임에는 설정한 HTTPS 중계 주소와 접속 토큰을 입력하세요.')});
}
module.exports={validateCredentials,createAssertion,createTokenSource,validateInput,vertexBody,normalizeVertex,createVertexClient,createRelayServer};
if(require.main===module)main().catch(e=>{console.error(e instanceof RelayError?e.message:'중계 서버 설정을 확인하세요.');process.exitCode=1});

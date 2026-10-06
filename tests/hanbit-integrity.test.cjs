// Run: node tests/hanbit-integrity.test.cjs
const crypto=require('node:crypto');
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
  run(`const liveSave=save;const calls=[],notices=[]; let chipHTML='',modalHTML='';
    addLog=()=>{};toast=s=>notices.push(s);render=()=>{};renderSides=()=>{};save=()=>{};sfx=()=>{};
    maybeIncoming=()=>{};closeModal=()=>{};apptRefresh=()=>{};renderChat=()=>{};askConfirm=async()=>true;const liveAiTurn=aiTurn;aiTurn=async(...args)=>calls.push(args);
    chip=s=>{chipHTML=s};hideChip=()=>{};modal=(title,s)=>{modalHTML=s};
    function seed(loc='site'){
      G={v:1,_relVersion:2,_clockVersion:2,_affLv:2,char:{name:'테스트',age:17,stats:{str:1,wis:1,cha:1,sur:1},traits:[]},day:1,time:'방과 후',dayStep:0,loc,steps:0,hp:12,maxhp:12,calm:6,battery:6,torch:5,cash:100,items:[],mat:{metal:0,ply:0,wire:0,keepsake:0},act:1,fragments:0,sitesDone:0,district:'music',comp:{met:false,joined:false,aff:10},rel:{},chronicle:[],site:loc==='site'?{name:'피아노 괴담 구역',pos:{x:225,y:180},depth:1,cur:'r1',rooms:[{id:'r1',name:'입구',lv:0,danger:0,visited:true,exits:['r2','r3']},{id:'r2',name:'피아노실',lv:1,danger:0,visited:true,exits:['r1']},{id:'r3',name:'방송실',lv:1,danger:0,visited:true,exits:['r1']},{id:'r4',name:'창고',lv:2,danger:0,visited:true,exits:['r3']}]}:null};
      busy=false;PENDING={note:'',flags:{}};migrate();syncSchedule();Math.random=()=>0.99;calls.length=notices.length=0;chipHTML=modalHTML='';
    }
    seed('campus');G.comp.met=true;getRel('유민');getRel('서연');G.comp.spot='market';G.comp.spotKey=yKey();
  `);
  return {run,obj,input:el,ctx};
}

function setup(){
 const f=fixture();f.run(`const disk=new Map(),writes=[];localStorage.getItem=k=>disk.get(k)||null;localStorage.setItem=(k,v)=>{disk.set(k,v);writes.push({k,v})};localStorage.removeItem=k=>disk.delete(k);save=liveSave;show=()=>{};setTitle=()=>{};renderLogAll=()=>{};checkState=()=>{};queueLex=()=>{};addLog=(type,text)=>G.log.push({type,text});`);return f;
}
let count=0;
async function test(name,fn){await fn();count++;console.log('PASS',name)}
(async()=>{
await test('Malformed choice and item shapes cannot freeze a real AI turn',async()=>{
 for(const payload of [{narration:'장면',choices:{}},{narration:'장면',choices:[],effects:{items_add:'아이템',items_remove:{bad:true}}},{narration:17,choices:'bad',effects:[]},[1,2],null]){
  const {run,ctx}=setup();ctx.payload=payload;run('aiTurn=liveAiTurn;callAI=async()=>JSON.stringify(payload)');await run("aiTurn('주변을 살펴본다')");assert.equal(run('busy'),false);assert.equal(run('curTurn'),null);assert.equal(run('Array.isArray(G.choices)'),true);assert.equal(run('Array.isArray(G.items)'),true);assert.ok(run('disk.has(SAVE_KEY)'));
 }
});
await test('Unexpected post-scene exceptions always unlock and preserve the live game',async()=>{
 const {run}=setup();run("aiTurn=liveAiTurn;callAI=async()=>JSON.stringify({narration:'장면',choices:[]});maybeSummarize=async()=>{throw Error('synthetic failure')}");await run("aiTurn('행동')");assert.equal(run('busy'),false);assert.equal(run('curTurn'),null);assert.ok(run("G.log.some(x=>x.text.includes('오류'))"));assert.ok(run('disk.has(SAVE_KEY)'));
});
await test('Turn lock lasts until summary and after hooks finish; repeated clicks do not call AI',async()=>{
 const {run}=setup();run("aiTurn=liveAiTurn;let release;let callsN=0;callAI=async()=>++callsN===1?JSON.stringify({narration:'장면',choices:[]}):new Promise(r=>release=r);G.recent=Array.from({length:12},(_,i)=>({role:'scene',text:'old-'+i}));const pending=aiTurn('첫 행동')");await new Promise(r=>setImmediate(r));assert.equal(run('busy'),true);await run("aiTurn('두번째 행동')");assert.equal(run('callsN'),2);run("release(JSON.stringify({summary:'요약'}))");await run('pending');assert.equal(run('busy'),false);assert.equal(run('G.recent.length'),4);assert.equal(run("G.log.filter(x=>x.type==='action').length"),1);
});
await test('Late story replies cannot alter new game choice metadata or unlock a new turn',async()=>{
 const {run}=setup();run("aiTurn=liveAiTurn;let release;callAI=()=>new Promise(r=>release=r);const pending=aiTurn('이전 행동');seed('campus');G.choiceMeta={keep:{type:'story'}};busy=true;const newTurn={g:G};curTurn=newTurn;release(JSON.stringify({narration:'이전 장면',choices:[{text:'낡은 선택',type:'move'}]}))");await run('pending');assert.equal(run('busy'),true);assert.equal(run('curTurn===newTurn'),true);assert.equal(run('G.choiceMeta.keep.type'),'story');assert.equal(run('G.log.length'),0);
});
await test('Late summary success and failure preserve replacement game and all its scenes',async()=>{
 for(const reject of [false,true]){const {run}=setup();run("G.recent=Array.from({length:14},(_,i)=>({role:'scene',text:'old-'+i}));let release,fail;callAI=()=>new Promise((r,j)=>{release=r;fail=j});const pending=maybeSummarize();seed('campus');G.summary='새 게임';G.recent=[{role:'scene',text:'새 장면'}]");run(reject?"fail(Error('failure'))":"release(JSON.stringify({summary:'이전 요약'}))");await run('pending');assert.equal(run('G.summary'),'새 게임');assert.equal(run('G.recent[0].text'),'새 장면')}
});
await test('Failed, empty and malformed summaries retain original history for retry',async()=>{
 const {run}=setup();run("G.summary='기존 요약';G.recent=Array.from({length:14},(_,i)=>({role:'scene',text:'old-'+i}));const before=JSON.stringify(G.recent);callAI=async()=>{throw Error('failure')}");await run('maybeSummarize()');assert.equal(run('JSON.stringify(G.recent)'),run('before'));assert.equal(run('G.summary'),'기존 요약');run("callAI=async()=>JSON.stringify({summary:{bad:true}})");await run('maybeSummarize()');assert.equal(run('JSON.stringify(G.recent)'),run('before'));
});
await test('Successful summaries only remove captured scenes and preserve newly appended records',async()=>{
 const {run}=setup();run("G.recent=Array.from({length:14},(_,i)=>({role:'scene',text:'old-'+i}));let release;callAI=()=>new Promise(r=>release=r);const pending=maybeSummarize();G.recent.push({role:'scene',text:'new'});release(JSON.stringify({summary:'요약'}))");await run('pending');assert.equal(run('G.recent.length'),5);assert.equal(run('G.recent.at(-1).text'),'new');
});
await test('Invalid save JSON and core fields never replace live game or existing disk data',()=>{
 const {run,ctx}=setup();run('const before=G;save();const stored=disk.get(SAVE_KEY);const good=JSON.parse(stored)');
 const base=JSON.parse(run('stored'));for(const change of [{char:{name:'불완전'}},{hp:'12'},{time:'invalid'},{items:{}},{loc:'site',site:null},{char:{...base.char,stats:{...base.char.stats,str:null}}},{log:[{type:'scene',text:{bad:true}}]}]){ctx.bad=JSON.stringify({...base,...change});assert.throws(()=>run('prepareSavedGame(bad)'));assert.equal(run('G===before'),true);assert.equal(run('disk.get(SAVE_KEY)'),run('stored'))}
 for(const text of ['not json','{"char":{"name":"bad"}}','{"__proto__":{}}']){ctx.bad=text;assert.throws(()=>run('prepareSavedGame(bad)'));assert.equal(run('G===before'),true)}
});
await test('Invalid imported file does not reset undo, overwrite disk, or replace game',()=>{
 const {run}=setup();run("save();const before=G,beforeDisk=disk.get(SAVE_KEY);undoSnap='keep';const fakeInput={files:[{size:100}],click(){}};document.createElement=()=>fakeInput;FileReader=class{readAsText(){this.result=JSON.stringify({char:{name:'bad'}});this.onload()}};importSave();fakeInput.onchange()");assert.equal(run('G===before'),true);assert.equal(run('disk.get(SAVE_KEY)'),run('beforeDisk'));assert.equal(run('undoSnap'),'keep');
});
await test('Legacy saves with missing optional data migrate in isolation and retain old game until installed',()=>{
 const {run}=setup();run("save();const before=G;const legacy=JSON.parse(disk.get(SAVE_KEY));delete legacy.home;delete legacy.rel;delete legacy._relVersion;delete legacy.char.traits;legacy.time='밤';const migrated=prepareSavedGame(JSON.stringify(legacy))");assert.equal(run('G===before'),true);assert.equal(run('migrated.time'),'야간');assert.equal(run('migrated._relVersion'),2);assert.equal(run('Array.isArray(migrated.char.traits)'),true);assert.ok(run('migrated.home.built'));
});
await test('Valid import preserves the previous live game backup and backup restore recovers it',()=>{
 const {run}=setup();run("save();G.cash=101;const before=G;const other=JSON.parse(JSON.stringify(G));other.cash=222;const candidate=prepareSavedGame(JSON.stringify(other));const imported=installImportedGame(candidate)");assert.equal(run('imported'),true);assert.equal(run('G.cash'),222);assert.equal(run('JSON.parse(disk.get(SAVE_BACKUP_KEY)).cash'),101);assert.equal(run('JSON.parse(disk.get(SAVE_KEY)).cash'),222);run('restoreSaveBackup()');assert.equal(run('G.cash'),101);assert.equal(run('JSON.parse(disk.get(SAVE_KEY)).cash'),101);
});
await test('Quota failures on either backup or import write preserve live game, undo and original disk save',()=>{
 for(const which of ['backup','main']){const {run}=setup();run("save();const original=G,stored=disk.get(SAVE_KEY);const candidate=prepareSavedGame(stored);candidate.cash=200;undoSnap='keep';const oldSet=localStorage.setItem");run(`localStorage.setItem=(k,v)=>{if(k===${which==='backup'?'SAVE_BACKUP_KEY':'SAVE_KEY'})throw Error('QuotaExceededError');oldSet(k,v)};const ok=installImportedGame(candidate)`);assert.equal(run('ok'),false);assert.equal(run('G===original'),true);assert.equal(run('disk.get(SAVE_KEY)'),run('stored'));assert.equal(run('undoSnap'),'keep')}
});
await test('Asynchronous file read cannot overwrite a game changed since selection',()=>{
 const {run}=setup();run("let reader;const fakeInput={files:[{size:100}],click(){}};document.createElement=()=>fakeInput;FileReader=class{readAsText(){reader=this}};const source=JSON.stringify(G);importSave();fakeInput.onchange();seed('campus');G.cash=333;reader.result=source;reader.onload()");assert.equal(run('G.cash'),333);assert.equal(run('disk.has(SAVE_KEY)'),false);
});
await test('Storage failure is visible, throttled, recoverable, and keeps the live undo baseline',()=>{
 const {run,input}=setup();run('save();const oldSet=localStorage.setItem;localStorage.setItem=()=>{throw Error("QuotaExceededError")};G.cash=999;const ok=save();save()');assert.equal(run('ok'),false);assert.equal(run('saveFailed'),true);assert.equal(input.style.display,'flex');assert.equal(run('JSON.parse(stableSnap).cash'),999);assert.equal(run('JSON.parse(snapG()).cash'),999);assert.equal(run('notices.filter(x=>x.includes("자동 저장 실패")).length'),1);run('localStorage.setItem=oldSet;save()');assert.equal(run('saveFailed'),false);assert.equal(input.style.display,'none');assert.equal(run('JSON.parse(disk.get(SAVE_KEY)).cash'),999);
});
await test('Continue rejects corrupt stored data without changing current game',()=>{
 const {run}=setup();run("const before=G;disk.set(SAVE_KEY,JSON.stringify({char:{name:'bad'}}));continueGame()");assert.equal(run('G===before'),true);assert.equal(run("notices.some(x=>x.includes('불러오지 못했습니다'))"),true);
});
await test('Manual inventory edits never award affinity, reveal preferences or spend/reset gift allowance',()=>{
 const {run}=setup();run("const fields={yuminItemIn:{value:'코코아'},yuminItemGift:{checked:true}};document.getElementById=id=>fields[id]||null;openYumin=()=>{};const before={aff:G.comp.aff,cash:G.cash,likes:JSON.stringify(G.comp.likes),day:G.day,lastGiftDay:G.comp.lastGiftDay};addYuminItem();addYuminItem();addYuminItem()");assert.equal(run('G.comp.aff'),run('before.aff'));assert.equal(run('G.cash'),run('before.cash'));assert.equal(run('JSON.stringify(G.comp.likes)'),run('before.likes'));assert.equal(run('G.comp.lastGiftDay'),run('before.lastGiftDay'));assert.equal(run('G.comp.items.length'),3);assert.equal(run('G.comp.items.every(x=>x.manual===true)'),true);assert.equal(run('G.chronicle.some(x=>x.text.includes("선물했다"))'),false);
});
await test('Normal gifts still consume inventory, award affinity once and block a second gift',()=>{
 const {run}=setup();run("G.items=['기념 팔찌','기념 팔찌'];G.comp.lastGiftDay=0;const before=G.comp.aff;giveYumin('i',0);const after=G.comp.aff;giveYumin('i',0)");assert.ok(run('after>before'));assert.equal(run('G.comp.aff'),run('after'));assert.equal(run('G.items.length'),1);assert.equal(run('G.comp.lastGiftDay'),run('G.day'));
});
console.log(`${count} game-integrity scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

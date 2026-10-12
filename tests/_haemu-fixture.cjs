// Shared test fixture for haemu.html (not a test by itself).
// Runs the real game script in node:vm with a tiny id-keyed DOM stub and stubbed storage/network.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../haemu.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
new vm.Script(script);   // syntax check
const START='/* 시작: 화면 설정 적용';
if(!script.includes(START)) throw new Error('start marker missing');

function element(id){
  const cls=new Set();
  return {id,style:{},dataset:{},value:'',textContent:'',innerHTML:'',title:'',disabled:false,checked:false,
    get className(){return [...cls].join(' ')},set className(v){cls.clear();String(v||'').split(/\s+/).filter(Boolean).forEach(c=>cls.add(c))},
    classList:{add:(...c)=>c.forEach(x=>cls.add(x)),remove:(...c)=>c.forEach(x=>cls.delete(x)),contains:c=>cls.has(c),toggle:(c,on)=>{const v=on===undefined?!cls.has(c):!!on;v?cls.add(c):cls.delete(c);return v}},
    addEventListener(){},removeEventListener(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},appendChild(){},remove(){},focus(){},click(){},querySelector(){return null},querySelectorAll(){return []}};
}
function fixture({storage}={}){
  const els=new Map(),get=id=>{if(!els.has(id))els.set(id,element(id));return els.get(id)};
  ['title','game'].forEach(id=>get(id));
  const disk=storage||new Map();
  const localStorage={getItem:k=>disk.has(k)?disk.get(k):null,setItem:(k,v)=>{disk.set(k,String(v))},removeItem:k=>disk.delete(k)};
  const document={getElementById:get,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:()=>element(''),body:element('body'),documentElement:Object.assign(element('html'),{style:{setProperty(){}}})};
  const ctx=vm.createContext({console,crypto:require("node:crypto").webcrypto,TextEncoder,URLSearchParams,AbortSignal,AbortController,atob,btoa,
    setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},
    localStorage,document,window:{addEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}}},navigator:{},URL,Blob,Math:Object.create(Math),
    fetch:async()=>{throw new Error('network not stubbed')}});
  vm.runInContext(script.slice(0,script.indexOf(START)),ctx);
  const run=s=>vm.runInContext(s,ctx),obj=s=>JSON.parse(JSON.stringify(run(s)));
  run(`var notices=[];toast=s=>notices.push(s);askConfirm=async()=>true;var modalHTML='';modal=(t,s)=>{modalHTML=s};`);
  return {run,obj,ctx,el:get,disk};
}
// A fetch stub for the Gemini (OpenAI-compatible) path that replies with the given contents in order.
function geminiReplies(f,replies){
  f.ctx.__replies=replies.map(r=>typeof r==='string'?r:JSON.stringify(r));
  f.run(`SET.keys.gemini='synthetic-key';SET.roles.story={provider:'gemini',model:'gemini-3.8-flash'};SET.roles.summary={provider:'gemini',model:'gemini-3.8-flash'};
    var sent=[];fetch=async(u,init)=>{const b=JSON.parse(init.body);sent.push(b);const c=__replies.length?__replies.shift():'';return {ok:true,status:200,json:async()=>({choices:[{message:{content:c}}]})}}`);
}
let count=0;
async function test(name,fn){await fn();count++;console.log('PASS',name)}
function done(label){console.log(`${count} ${label} scenario groups passed.`)}
module.exports={fixture,geminiReplies,test,done,script};

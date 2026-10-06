// Run: node tests/hanbit-growth.test.cjs
const crypto=require('node:crypto');
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
      G={v:1,_phoneLightVersion:1,_fearBalanceVersion:1,_relVersion:2,_clockVersion:2,_affLv:2,char:{name:'테스트',age:17,stats:{str:1,wis:1,cha:1,sur:1},traits:[]},day:1,time:'방과 후',dayStep:0,loc,steps:0,hp:12,maxhp:12,calm:10,battery:6,torch:0,cash:100,items:[],mat:{metal:0,ply:0,wire:0,keepsake:0},act:1,fragments:0,sitesDone:0,district:'music',comp:{met:false,joined:false,aff:10},rel:{},chronicle:[],site:loc==='site'?{name:'피아노 괴담 구역',pos:{x:225,y:180},depth:1,cur:'r1',rooms:[{id:'r1',name:'입구',lv:0,danger:0,visited:true,exits:['r2','r3']},{id:'r2',name:'피아노실',lv:1,danger:0,visited:true,exits:['r1']},{id:'r3',name:'방송실',lv:1,danger:0,visited:true,exits:['r1']},{id:'r4',name:'창고',lv:2,danger:0,visited:true,exits:['r3']}]}:null};
      busy=false;PENDING={note:'',flags:{}};migrate();syncSchedule();Math.random=()=>0.99;calls.length=notices.length=0;chipHTML=modalHTML='';
    }
    seed('campus');G.comp.met=true;getRel('유민');getRel('서연');G.comp.spot='market';G.comp.spotKey=yKey();
  `);
  return {run,obj,input:el,ctx};
}




let count=0;
async function test(name,fn){await fn(fixture());count++;console.log('PASS',name)}
(async()=>{
await test('HP costs match the dialog and actual spending at each boundary',({run})=>{
  for(const [hp,cost] of [[12,1],[29,1],[30,2],[44,2],[45,3],[59,3],[60,4],[150,10]]){
    run(`seed('campus');G.maxhp=${hp};G.hp=7;G.growth=20;openGrowth()`);
    assert.equal(run('hpGrowCost()'),cost);assert.ok(run(`modalHTML.includes('+3 (${cost}점)')`));
    run('growHP()');assert.equal(run('G.maxhp'),hp+3);assert.equal(run('G.hp'),10);assert.equal(run('G.growth'),20-cost);
    assert.ok(run(`leftHTML().includes('10/${hp+3}')`));assert.ok(run(`modalHTML.includes('<b>${hp+3}</b>')`));
  }
});
await test('An HP purchase crossing 30 immediately changes the next purchase cost',({run})=>{
  run("seed('campus');G.maxhp=29;G.growth=3;growHP()");assert.equal(run('G.growth'),2);assert.equal(run('hpGrowCost()'),2);
  assert.ok(run('modalHTML.includes("+3 (2점)")'));run('growHP()');assert.equal(run('G.growth'),0);assert.equal(run('G.maxhp'),35);
});
await test('Insufficient HP points disable the button and cannot spend or heal',({run})=>{
  run("seed('campus');G.maxhp=45;G.growth=2;openGrowth();growHP()");assert.equal(run('G.growth'),2);assert.equal(run('G.maxhp'),45);assert.equal(run('G.hp'),12);
  assert.ok(run('modalHTML').includes('disabled onclick="growHP()"'));
});
await test('All stats use the same value in sidebar, growth, character and checks',({run})=>{
  for(const k of ['str','wis','cha','sur']){
    run(`seed('campus');G.growth=2;growStat('${k}')`);assert.equal(run(`G.char.stats.${k}`),2);assert.equal(run('G.growth'),0);
    assert.ok(run(`leftHTML().includes('<span>'+SK['${k}']+'</span><b>2</b>')`));assert.ok(run(`modalHTML.includes(SK['${k}']+' <b>2</b>')`));
    run('openChar()');assert.ok(run(`modalHTML.includes(SK['${k}']+' 2')`));assert.equal(run(`checkChance('${k}','normal','')`),58);
    assert.equal(run('G.maxhp'),k==='str'?14:12);assert.equal(run('G.hp'),k==='str'?14:12);
  }
});
await test('Strength still gives its HP bonus regardless of the separate HP upgrade cost',({run})=>{
  run("seed('campus');G.maxhp=60;G.hp=20;G.growth=2;growStat('str')");assert.equal(run('G.growth'),0);assert.equal(run('G.hp'),22);assert.equal(run('G.maxhp'),62);
});
await test('Former 6-to-7 and 8-to-9 plateaus now improve difficult checks',({run})=>{
  for(const [stat,before,after] of [[6,83,92],[8,97,100]]){
    run(`seed('campus');G.char.stats.wis=${stat};G.growth=2`);assert.equal(run("checkChance('wis','hard','')"),before);
    run("growStat('wis')");assert.equal(run("checkChance('wis','hard','')"),after);assert.equal(run("dcVal('hard','wis')"),11);
  }
});
await test('Difficulty does not rise with any stat, including at the stat cap',({run})=>{
  run("seed('campus')");for(const k of ['str','wis','cha','sur'])for(let st=1;st<=10;st++){
    run(`G.char.stats.${k}=${st}`);for(const [dc,num] of [['easy',7],['normal',9],['hard',11]])assert.equal(run(`dcVal('${dc}','${k}')`),num);
  }
});
await test('Displayed chance equals all 36 real dice outcomes with traits and injury',({run})=>{
  for(const traits of [[],['말발']])for(const hp of [12,2])for(let st=1;st<=10;st++)for(const dc of ['easy','normal','hard']){
    run(`seed('campus');G.char.traits=${JSON.stringify(traits)};G.hp=${hp};G.char.stats.cha=${st}`);let successes=0;
    for(let a=1;a<=6;a++)for(let b=1;b<=6;b++){
      run(`(()=>{let i=0;const rolls=[${(a-.5)/6},${(b-.5)/6}];Math.random=()=>rolls[i++];rollCheck('cha','${dc}','설득한다')})()`);
      if(run('rollCheck.last')==='success')successes++;
    }
    assert.equal(run(`checkChance('cha','${dc}','설득한다')`),Math.round(successes/36*100));
  }
});
await test('Fear growth gives two capacity, preserves current fear and uses two points',({run})=>{
  run("seed('campus');G.cap.w=2;G.cap.g=2;G.calm=9;G.growth=2;growFear()");assert.equal(run('fearMax()'),20);assert.equal(run('fearNow()'),9);assert.equal(run('G.growth'),0);
  assert.ok(run('leftHTML().includes("9/20")'));assert.ok(run('modalHTML.includes("<b>20</b>")'));assert.ok(run('modalHTML.includes("+2 (2점)")'));
});
await test('All six fear upgrades total twelve capacity and stop spending at the cap',({run})=>{
  run("seed('campus');G.growth=14;for(let i=0;i<7;i++)growFear()");assert.equal(run('fearMax()'),22);assert.equal(run('fearNow()'),0);assert.equal(run('G.growth'),2);assert.equal(run('G.cap.g'),6);
});
await test('Existing fear growth upgrades migrate once while preserving fear and points',({run})=>{
  run("seed('campus');delete G._growthBalanceVersion;G.cap.g=3;G.calm=8;G.growth=4;G.xp=17;migrate();migrate()");assert.equal(run('fearMax()'),16);assert.equal(run('fearNow()'),5);assert.equal(run('G.calm'),11);assert.equal(run('G.growth'),4);assert.equal(run('G.xp'),17);
});
await test('Very old saves compose base-fear, phone and growth migrations without reducing fear',({run})=>{
  run("seed('campus');delete G._growthBalanceVersion;delete G._fearBalanceVersion;delete G._phoneLightVersion;G.cap.g=2;G.calm=3;G.torch=1;migrate();migrate()");assert.equal(run('fearMax()'),14);assert.equal(run('fearNow()'),5);assert.equal(run('G.reservePacks'),1);
});
await test('Existing high HP is kept and immediately uses the new cost',({run})=>{
  run("seed('campus');delete G._growthBalanceVersion;G.maxhp=100;G.hp=80;G.growth=12;migrate()");assert.equal(run('G.maxhp'),100);assert.equal(run('G.hp'),80);assert.equal(run('G.growth'),12);assert.equal(run('hpGrowCost()'),6);
});
await test('Serialization and reload do not reapply the fear growth migration',({run})=>{
  run("seed('campus');delete G._growthBalanceVersion;G.cap.g=4;G.calm=9;migrate();var snap=JSON.stringify(G);G=JSON.parse(snap);migrate()");assert.equal(run('G.calm'),13);assert.equal(run('fearNow()'),5);
});
await test('Experience awards several points correctly and UI shows the remainder',({run})=>{
  run("seed('campus');G.xp=5;G.growth=0;gainXp(14,'검증');openGrowth()");assert.equal(run('G.xp'),19);assert.equal(run('G.growth'),3);assert.ok(run('modalHTML.includes("경험 1/6")'));
});
await test('Stats cannot exceed ten or spend without enough points',({run})=>{
  for(const k of ['str','wis','cha','sur']){
    run(`seed('campus');G.growth=4;G.char.stats.${k}=10;growStat('${k}')`);assert.equal(run('G.growth'),4);assert.equal(run(`G.char.stats.${k}`),10);
    run(`seed('campus');G.growth=1;growStat('${k}')`);assert.equal(run('G.growth'),1);assert.equal(run(`G.char.stats.${k}`),1);
  }
});
await test('Combat and processing block every growth operation in UI and state',({run})=>{
  for(const lock of ['busy=true','G.fight={}']){
    run(`seed('campus');G.growth=10;${lock};openGrowth();growHP();growFear();growStat('str')`);
    assert.equal(run('G.growth'),10);assert.equal(run('G.maxhp'),12);assert.equal(run('G.cap.g'),0);assert.equal(run('G.char.stats.str'),1);
    assert.equal(run('(modalHTML.match(/disabled onclick="grow/g)||[]).length'),6);
  }
});
await test('Creation and live AI facts distinguish strength from HP',({run})=>{
  run("seed('campus')");assert.equal(run('STATS[0].n'),'근력');assert.equal(run('stateFacts().캐릭터.능력치.근력'),1);assert.equal(run('stateFacts().캐릭터.능력치.체력'),undefined);assert.equal(run('stateFacts().상태.체력'),'12/12');
});
await test('Growth and guide explain roles, XP sources, costs and contain no old rules',({run})=>{
  run("seed('campus');openGrowth()");for(const text of ['주말 공부','사건 검증','근력','호감도','30~44','45~59','현재 공포'])assert.ok(run(`modalHTML.includes('${text}')`),text);
  run('openGuide()');assert.equal(run('modalHTML.includes("건전지 케이스")'),false);assert.equal(run('modalHTML.includes("7~8")'),false);assert.equal(run('modalHTML.includes("체력 판정")'),false);
});
console.log(`${count} growth consistency/balance scenario groups passed.`);
})().catch(e=>{console.error(e);process.exitCode=1});

// Run: node tests/hanbit-survivors.test.cjs
// 추가 생존자 7명: 첫 만남·말 걸기·친구 단계 선물·저장 검증·AI 대사 1회/폴백.
// 새 구역 4명(702호 할머니·경로당 어르신·헬스장 트레이너·설비 기사님)과 이웃의 흔적 메모도 확인한다.
const assert=require('node:assert/strict');
const {fixture,test,done}=require('./_hanbit-fixture.cjs');

function game(){
  const f=fixture();
  f.run(`G=newState('도현');migrate();busy=false;resetQueue();UI.speed='off';render=()=>{};rng=()=>0.99;console.warn=()=>{};aiReady=()=>false`);
  f.run("var flush=()=>{while(Q.pending.length)nextLine()}; var go=id=>{goZone(id);flush()}; var chat=(id,t)=>{pick('chat:'+id);pick('chat:'+id+':'+t);flush()}");
  return f;
}
const at=(zone)=>`G.loc='${zone}';G.zs.${zone}.seen=true`;

(async()=>{
await test('Each survivor is met once, on first entering their own zone, and stays there',()=>{
  const {run,obj}=game();
  for(const [id,zone,from] of [['guard','office','shop'],['pharm','shop','stairs'],['rider','garage','stairs']]){
    run(`${at(from)};go('${zone}')`);
    assert.equal(run(`G.surv.${id}.met`),true); assert.equal(run(`G.surv.${id}.aff`),1);
    assert.ok(run(`G.log.some(l=>l.type==='dialog'&&l.who==='${id}')`));
    assert.equal(run(`survHere('${id}')`),true);
    const n=run(`G.log.filter(l=>l.who==='${id}').length`); run(`${at(from)};go('${zone}')`);
    assert.equal(run(`G.log.filter(l=>l.who==='${id}').length`),n,'no second meeting');
    assert.equal(run(`survHere('${id}')`),true);
    run(`${at(from)}`); assert.equal(run(`survHere('${id}')`),false,'not available elsewhere');
  }
});

await test('Talking opens a topic menu for that person only, costs one slot, and bogus topics are ignored',()=>{
  const {run,obj}=game();
  run(`${at('stairs')};go('shop')`);
  assert.ok(obj("buildChoices().some(c=>c.id==='chat:pharm')"));
  run("pick('chat:pharm')");
  assert.deepEqual(obj("buildChoices().map(c=>c.id)"),['chat:pharm:ask','chat:pharm:info','chat:pharm:joke','chat:pharm:x']);
  const t=run('G.day*10+G.slot');
  run("pick('chat:pharm:bogus')"); assert.equal(run('G.day*10+G.slot'),t);
  run("pick('chat:pharm:x')"); assert.ok(obj("buildChoices().some(c=>c.id==='move:stairs')"));
  run("pick('chat:pharm');pick('chat:pharm:info');flush()"); assert.ok(run('G.day*10+G.slot')>t);
  run("pick('chat:guard')"); assert.ok(!obj("buildChoices().some(c=>/guard/.test(c.id))"),'guard is not here');
});

await test('Affection is judged by code: asking pays more when hurt, jokes land only when quiet',()=>{
  const {run}=game();
  run(`${at('stairs')};go('shop');G.noise.shop=0;G.hp=G.maxhp`);
  run("G.surv.pharm.aff=0;chat('pharm','ask')"); assert.equal(run('G.surv.pharm.aff'),1);
  run("G.hp=4;G.surv.pharm.aff=0;chat('pharm','ask')"); assert.equal(run('G.surv.pharm.aff'),2);
  run("G.noise.shop=0;G.surv.pharm.aff=2;chat('pharm','joke')"); assert.equal(run('G.surv.pharm.aff'),4);
  run("G.noise.shop=6;G.surv.pharm.aff=3;chat('pharm','joke')"); assert.equal(run('G.surv.pharm.aff'),2);
  run("G.surv.pharm.aff=0;G.noise.shop=6;chat('pharm','joke')"); assert.equal(run('G.surv.pharm.aff'),0,'never below zero');
  run("G.surv.pharm.aff=6;G.hp=1;chat('pharm','ask')"); assert.ok(run('G.surv.pharm.aff')<=run('SURV_MAX'));
});

await test('Becoming friends gives one gift each, once; friendship never touches Yumin affection',()=>{
  const {run}=game();
  run(`${at('stairs')};go('shop');G.hp=3;G.surv.pharm.aff=2;chat('pharm','ask')`);
  assert.equal(run('G.meds'),1); assert.equal(run('G.surv.pharm.gift'),true);
  run("G.surv.pharm.aff=2;chat('pharm','ask')"); assert.equal(run('G.meds'),1,'gift only once');
  run(`${at('shop')};go('office');G.surv.guard.aff=3;G.hp=3;chat('guard','ask')`);
  assert.ok(run("hasItem('flashlight')"));
  run(`${at('stairs')};go('garage');G.surv.rider.aff=3;G.hp=3;chat('rider','ask')`);
  assert.ok(run("hasItem('fuel')"));
  assert.equal(run('G.comp.yumin.aff'),0);
});

await test('If the item is already owned the gift is a small supply instead',()=>{
  const {run}=game();
  run(`G.items.push('flashlight');${at('shop')};go('office');G.surv.guard.aff=3;G.hp=3;const f0=G.food;chat('guard','ask')`);
  assert.equal(run('G.surv.guard.gift'),true); assert.ok(run('G.items.filter(x=>x==="flashlight").length')===1);
  assert.ok(run('G.food')>=run('f0'));
});

await test('Old saves without the gift field are repaired; broken survivor data is refused',()=>{
  const {run}=game();
  run("save();var s=JSON.parse(localStorage.getItem(SAVE_KEY));for(const k in s.surv) delete s.surv[k].gift");
  run("var m=prepareSavedGame(JSON.stringify(s))");
  assert.equal(run('m.surv.guard.gift'),false);
  for(const bad of ["met:1","rescued:'x'","aff:-1","aff:99","gift:'y'"]){
    assert.throws(()=>run(`var t=JSON.parse(JSON.stringify(s));Object.assign(t.surv.rider,{${bad}});prepareSavedGame(JSON.stringify(t))`),/생존자 정보/);
  }
});

const NEW=[['granny','unit702','stairs'],['elder','senior','shop'],['trainer','gym','garden'],['engineer','boiler','garage']];

await test('The four new-zone survivors are met once on first entering their zone, and only there',()=>{
  const {run}=game();
  for(const [id,zone,from] of NEW){
    run(`${at(from)};go('${zone}')`);
    assert.equal(run(`G.surv.${id}.met`),true,id); assert.equal(run(`G.surv.${id}.aff`),1);
    assert.ok(run(`G.log.some(l=>l.type==='dialog'&&l.who==='${id}')`),id+' speaks in the meeting');
    assert.equal(run(`survHere('${id}')`),true);
    const n=run(`G.log.filter(l=>l.who==='${id}').length`); run(`${at(from)};go('${zone}')`);
    assert.equal(run(`G.log.filter(l=>l.who==='${id}').length`),n,'no second meeting');
    run(`${at(from)}`); assert.equal(run(`survHere('${id}')`),false,'not available elsewhere');
  }
});

await test('Every survivor has a look, a gift, a cast entry, a meeting, and lines for every topic in both moods',()=>{
  const {run,obj}=game();
  const ids=obj('SURVIVORS.map(s=>s.id)');
  assert.equal(ids.length,7);
  run("G.char.name='도현'");
  for(const id of ids){
    assert.ok(run(`typeof SURV_LOOK.${id}==='string'&&SURV_LOOK.${id}.length>10`),id+' look');
    assert.ok(run(`!!SURV_GIFT.${id}&&!!CAST.${id}&&CAST.${id}.n().length>0`),id+' gift/cast');
    const meet=obj(`survMeetLines('${id}')`);
    assert.ok(meet.length>=3&&meet[0].t==='n'&&meet.some(l=>l.t==='d'&&l.who===id)&&meet.some(l=>l.who==='me'),id+' meeting');
    for(const aff of [0,3]) for(const t of ['ask','info','joke']) for(const good of [true,false]){
      run(`G.surv.${id}.aff=${aff}`);
      const lines=obj(`sTalkLines('${id}','${t}',{good:${good}})`);
      assert.ok(lines.length>=2,`${id}/${t}`);
      assert.ok(lines.every(l=>l.t==='d'&&(l.who==='me'||l.who===id)&&typeof l.text==='string'&&l.text.length>3),`${id}/${t} speakers`);
    }
  }
});

await test('New survivors judge talk in code and give their own gift once when they become friends',()=>{
  const {run}=game();
  run(`${at('stairs')};go('unit702');G.hp=3;G.surv.granny.aff=3;chat('granny','ask')`);
  assert.equal(run('G.surv.granny.gift'),true);
  const gift=()=>run("G.log.filter(l=>l.text&&l.text.includes('삶은 달걀')).length");
  assert.equal(gift(),1,'the gift is told');
  assert.ok(run("G.log.some(l=>l.type==='sys'&&/식량 \\+1/.test(l.text)&&/물 \\+1/.test(l.text))"),'one food and one water are shown as a result line');
  run("G.surv.granny.aff=3;chat('granny','ask')"); assert.equal(gift(),1,'gift only once');
  run(`${at('shop')};go('senior');G.hp=3;G.surv.elder.aff=3;chat('elder','ask')`);
  assert.ok(run("hasItem('radio')"));
  run(`${at('garden')};go('gym');G.hp=3;G.surv.trainer.aff=3;chat('trainer','ask')`);
  assert.ok(run("hasItem('battery')"));
  run(`${at('garage')};go('boiler');G.hp=3;G.surv.engineer.aff=3;chat('engineer','ask')`);
  assert.ok(run("hasItem('cutter')"));
  assert.equal(run('G.comp.yumin.aff'),0,'friendship never touches Yumin affection');
  run("G.noise.boiler=6;G.surv.engineer.aff=3;chat('engineer','joke')"); assert.equal(run('G.surv.engineer.aff'),2,'a joke in a loud room costs affection');
});

await test('If the gift item is already owned the new survivors give a small supply instead',()=>{
  const {run}=game();
  run(`G.items.push('radio');${at('shop')};go('senior');G.surv.elder.aff=3;G.hp=3;chat('elder','ask')`);
  assert.equal(run('G.items.filter(x=>x==="radio").length'),1);
  assert.ok(run("G.log.some(l=>l.text&&l.text.includes('보온병에서 물을'))"),'water instead of the radio');
  run(`G.items.push('cutter');${at('garage')};go('boiler');G.surv.engineer.aff=3;G.hp=3;chat('engineer','ask')`);
  assert.equal(run('G.items.filter(x=>x==="cutter").length'),1);
  assert.ok(run("G.log.some(l=>l.text&&l.text.includes('건빵을 꺼내'))"),'food instead of the cutter');
});

await test('Saves made before the new survivors existed still load and get empty entries; broken entries are still refused',()=>{
  const {run}=game();
  run("save();var s=JSON.parse(localStorage.getItem(SAVE_KEY));s.surv.pharm.aff=5;s.surv.pharm.met=true;for(const k of ['granny','elder','trainer','engineer']) delete s.surv[k]");
  run("var m=prepareSavedGame(JSON.stringify(s))");
  for(const k of ['granny','elder','trainer','engineer']) assert.deepEqual(JSON.parse(JSON.stringify(run(`m.surv.${k}`))),{met:false,rescued:false,aff:0,gift:false},k);
  assert.equal(run('m.surv.pharm.aff'),5,'existing survivors are kept');
  assert.doesNotThrow(()=>run('validateSaveData(m)'));
  assert.throws(()=>run("var t=JSON.parse(JSON.stringify(s));t.surv.granny={met:1,rescued:false,aff:0,gift:false};prepareSavedGame(JSON.stringify(t))"),/생존자 정보/);
  run("var u=JSON.parse(JSON.stringify(s));delete u.surv.pharm;var m2=prepareSavedGame(JSON.stringify(u))");
  assert.equal(run('m2.surv.pharm.met'),false,'any missing survivor is filled with an empty entry');
});

await test('Saves from the 8-zone era load: missing zones are filled in, but a half-broken zone is still refused',()=>{
  const {run}=game();
  const NEW=['unit702','senior','block2','unit2f','gym','trash','boiler'];
  run(`save();var s=JSON.parse(localStorage.getItem(SAVE_KEY));s.zs.stairs.seen=true;for(const k of ${JSON.stringify(NEW)}){delete s.zs[k];delete s.noise[k];delete s.zombies[k]}for(const k of ['granny','elder','trainer','engineer']) delete s.surv[k]`);
  run("var m=prepareSavedGame(JSON.stringify(s))");
  for(const k of NEW){
    assert.deepEqual(JSON.parse(JSON.stringify(run(`m.zs.${k}`))),{seen:false,searched:false},k);
    assert.equal(run(`m.noise.${k}`),0,k); assert.equal(typeof run(`m.zombies.${k}`),'number',k);
  }
  assert.equal(run('m.zs.stairs.seen'),true,'existing zones are kept');
  assert.doesNotThrow(()=>run('validateSaveData(m)'));
  assert.throws(()=>run("var t=JSON.parse(JSON.stringify(s));t.zombies.unit702=-1;prepareSavedGame(JSON.stringify(t))"),/구역 정보/);
  assert.throws(()=>run("var t=JSON.parse(JSON.stringify(s));delete t.zombies.room;prepareSavedGame(JSON.stringify(t))"),/구역 정보/,'an old zone missing its data is still refused');
});

await test('Neighbour notes appear once, on the first search of zones without a survivor',()=>{
  const {run}=game();
  for(const [zone,from,key] of [['block2','garden','303호'],['unit2f','block2','차 열쇠는 여기'],['trash','garden','분필']]){
    run(`${at(from)};go('${zone}');pick('look:');flush()`);
    assert.equal(run(`G.log.filter(l=>l.text&&l.text.includes('${key}')).length`),1,zone+' note once');
    run("pick('look:');flush()");
    assert.equal(run(`G.log.filter(l=>l.text&&l.text.includes('${key}')).length`),1,zone+' not repeated');
  }
  run(`${at('stairs')};go('unit702');pick('look:');flush()`);
  assert.equal(run("G.log.filter(l=>l.text&&/필요한 분 가져가세요|분필|병원 가요/.test(l.text)).length"),3,'zones with a survivor have no extra note');
});

await test('With an AI connection one call is made and the code-decided changes are already applied; failure uses built-in lines',async()=>{
  const {run}=game();
  run(`${at('stairs')};go('shop');G.noise.shop=0;G.surv.pharm.aff=0`);
  run("aiReady=()=>true;var calls=0;callAI=async()=>{calls++;return JSON.stringify([{t:'d',who:'pharm',emo:'smile',text:'네, 괜찮아요.'}])}");
  run("pick('chat:pharm');pick('chat:pharm:ask')");
  assert.equal(run('G.surv.pharm.aff'),1);
  for(let i=0;i<30&&(run('calls')<1||run('busy'));i++) await new Promise(r=>setImmediate(r));
  run('flush()'); assert.equal(run('calls'),1);
  assert.ok(run("G.log.some(l=>l.type==='dialog'&&l.text==='네, 괜찮아요.')"));
  run("callAI=async()=>{throw Error('x')};toast=()=>{};pick('chat:pharm');pick('chat:pharm:ask')");
  for(let i=0;i<30&&run('busy');i++) await new Promise(r=>setImmediate(r));
  run('flush()'); assert.ok(run("G.log.some(l=>l.who==='pharm'&&/환자|들켰/.test(l.text))"));
});

done();
})();

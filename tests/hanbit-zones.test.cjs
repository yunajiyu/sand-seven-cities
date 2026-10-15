// Run: node tests/hanbit-zones.test.cjs
// 1단계: 8개 구역·길·새 상태·이동·목표 한 줄·선택지·화면. 실제 게임 스크립트를 node:vm에서 실행한다.
const assert=require('node:assert/strict');
const {fixture,test,done,script}=require('./_hanbit-fixture.cjs');

function game(name='도현'){
  const f=fixture();
  f.run(`render=()=>{};G=newState(${JSON.stringify(name)});migrate();busy=false;`);
  return f;
}

(async()=>{
await test('Exactly the 8 designed zones exist with unique ids and valid risk levels',()=>{
  const {obj,run}=game();
  const z=obj('ZONES');
  assert.equal(z.length,8);
  assert.deepEqual(z.map(x=>x.id).sort(),['garage','garden','gate','office','roof','room','shop','stairs']);
  assert.equal(new Set(z.map(x=>x.id)).size,8);
  assert.deepEqual(Object.fromEntries(z.map(x=>[x.id,x.risk])),{room:1,stairs:2,shop:3,office:2,garage:4,roof:1,garden:3,gate:4});
  for(const x of z){ assert.ok(x.risk>=1&&x.risk<=4); assert.ok(x.desc&&x.role&&x.gives); assert.ok(x.x>=0&&x.x<=360&&x.y>=0&&x.y<=250) }
  assert.equal(run("RISK_LABEL[4]"),'매우 높음');
});

await test('The zone graph is symmetric, has no dead ends from the start, and the roof is reached only through the stairs',()=>{
  const {obj,run}=game();
  const adj=obj('ADJ');
  for(const [a,list] of Object.entries(adj)) for(const b of list) assert.ok(adj[b].includes(a),`${a}-${b} must be two-way`);
  const seen=new Set(['room']),queue=['room'];
  while(queue.length){ const c=queue.shift(); for(const n of adj[c]) if(!seen.has(n)){ seen.add(n); queue.push(n) } }
  assert.equal(seen.size,8,'every zone is reachable from the start room');
  assert.deepEqual(adj.roof,['stairs']);
  assert.deepEqual(adj.room,['stairs']);
  assert.ok(adj.gate.includes('garden')&&adj.gate.includes('garage'));
});

await test('A new game starts in the 7th-floor room on day 1 evening with base resources and no ending',()=>{
  const {obj,run}=game('민준');
  const g=obj('G');
  assert.equal(g.v,2); assert.equal(g.char.name,'민준');
  assert.equal(g.loc,'room'); assert.equal(g.day,1); assert.equal(run('TIMES[G.slot]'),'저녁');
  assert.equal(g.hp,g.maxhp); assert.ok(g.food>0&&g.water>0); assert.equal(g.infection,null); assert.equal(g.ending,null); assert.deepEqual(g.items,[]);
  assert.equal(g.zs.room.seen,true); assert.equal(g.zs.garage.seen,false);
  assert.equal(g.zombies.room,0); assert.equal(g.zombies.roof,0); assert.ok(g.zombies.garage>=g.zombies.stairs);
  assert.ok(Object.values(g.noise).every(n=>n===0));
  assert.deepEqual(Object.keys(g.surv).sort(),['guard','pharm','rider']);
  assert.equal(g.comp.yumin.joined,false);
  assert.doesNotThrow(()=>run('validateSaveData(G)'));
});

await test('Moving works only along a road, updates the location and writes the log without any AI call',async()=>{
  const f=game(); const {run,obj,disk}=f;
  run("var aiCalls=0;callAI=async()=>{aiCalls++;return ''};callAIRaw=callAI;");
  assert.equal(run("goZone('garage')"),false,'room is not next to the garage');
  assert.equal(run('G.loc'),'room');
  assert.equal(run("goZone('nowhere')"),false);
  assert.equal(run("goZone('__proto__')"),false);
  assert.equal(run("goZone('stairs')"),true);
  assert.equal(run('G.loc'),'stairs'); assert.equal(run('G.zs.stairs.seen'),true);
  assert.equal(run("goZone('garage')"),true);
  assert.equal(run("goZone('gate')"),true);
  const log=obj('G.log');
  assert.equal(log.filter(l=>l.type==='action').length,3);
  assert.ok(log.some(l=>l.type==='scene'&&l.text.includes('공사 가림막')),'first visit shows the zone description');
  assert.equal(run('aiCalls'),0,'moving costs no AI call');
  assert.ok(disk.has('hanbit_save_v2'),'saved under the v2 key');
  assert.equal(run("goZone('stairs')"),false,'the gate is not next to the stairs');
  assert.equal(run("goZone('garage')"),true);
  assert.ok(obj('G.log').at(-1).text.includes('다시 왔다'),'revisit gets a short line, not the full description');
});

await test('Moving is blocked after an ending and while an AI reply is pending',()=>{
  const {run}=game();
  run('busy=true'); assert.equal(run("goZone('stairs')"),false); assert.equal(run('G.loc'),'room');
  run("busy=false;G.ending='x'"); assert.equal(run("goZone('stairs')"),false); assert.equal(run('G.loc'),'room');
});

await test('Choices are built by code from the current zone and pick() ignores anything not in the list',()=>{
  const {run,obj}=game();
  assert.deepEqual(obj("buildChoices().map(c=>c.id)"),['move:stairs']);
  assert.match(run("buildChoices()[0].label"),/계단·복도로 이동 · 위험 보통/);
  run("pick('move:garage')"); assert.equal(run('G.loc'),'room','garage is not offered from the room');
  run("pick('move:stairs')"); assert.equal(run('G.loc'),'stairs');
  assert.deepEqual(obj("buildChoices().map(c=>c.id).sort()"),['move:garage','move:roof','move:room','move:shop']);
  run("pick('bogus:thing')"); assert.equal(run('G.loc'),'stairs');
  run("G.ending='x'"); assert.deepEqual(obj('buildChoices()'),[]);
});

await test('The choices hook can add options and a failing hook never breaks the list',()=>{
  const {run,obj}=game();
  run("on('choices',5,l=>l.push({id:'rest:',label:'😴 쉰다'}));on('choices',1,()=>{throw Error('boom')});console.warn=()=>{}");
  assert.deepEqual(obj("buildChoices().map(c=>c.id)"),['move:stairs','rest:']);
});

await test('The goal line always has one clear sentence and names what is missing for the chosen route',()=>{
  const {run}=game();
  assert.match(run('goalLine()'),/빠져나갈 길/);
  run("G.route='rear'");
  assert.equal(run('goalLine()'),'후문 공사 통로로 나가려면 공사 통로 열쇠가 필요하다');
  run("G.route='front'");
  assert.equal(run('goalLine()'),'정문을 차량으로 돌파하려면 차량 열쇠·연료가 필요하다');
  run("G.items.push('carKey')");
  assert.equal(run('goalLine()'),'정문을 차량으로 돌파하려면 연료가 필요하다');
  run("G.items.push('fuel')");
  assert.equal(run('routeReady("front")'),true);
  assert.match(run('goalLine()'),/정문으로 나갈 준비가 됐다/);
  run("G.route='roof'");
  assert.equal(run('goalLine()'),'옥상에서 구조 신호를 보내려면 구조 신호 도구가 필요하다');
  assert.equal(run('routeReady("rear")'),false);
});

await test('Each escape route needs different things and every needed item exists',()=>{
  const {obj}=game();
  const r=obj('ROUTES'), items=obj('ITEMS');
  assert.deepEqual(Object.keys(r).sort(),['front','rear','roof']);
  for(const route of Object.values(r)) for(const id of route.need) assert.ok(items[id],`unknown item ${id}`);
  assert.deepEqual(r.front.need,['carKey','fuel']); assert.deepEqual(r.rear.need,['gateKey']); assert.deepEqual(r.roof.need,['signal']);
  assert.equal(r.roof.at,'roof'); assert.equal(r.front.at,'gate');
});

await test('The screen shows status, goal, scene and choices; the map (in the menu) makes only neighbouring zones pressable',()=>{
  const f=fixture(); const {run,el}=f;
  f.run("G=newState('도현');migrate();busy=false");
  run('render()');
  assert.match(el('stats').innerHTML,/1일차 저녁/); assert.match(el('stats').innerHTML,/❤ 10\/10/);
  assert.match(el('goal').textContent,/빠져나갈 길/);
  assert.match(el('placeLabel').textContent,/3동 7층 자취방/);
  assert.match(el('choices').innerHTML,/pick\('move:stairs'\)/);
  const map=run('mapHTML()');
  assert.equal((map.match(/class="znode /g)||[]).length,8);
  assert.equal((map.match(/ adj/g)||[]).length,1,'only the stairs is pressable from the room');
  assert.match(map,/aria-label="3동 7층 자취방, 현재 위치"/);
  assert.match(map,/id="zoneCard">📍 <b>3동 7층 자취방/);
  run("goZone('stairs')");
  assert.equal((run('mapHTML()').match(/ adj/g)||[]).length,4);
  assert.match(run('G.log.map(x=>x.text).join("\\n")'),/계단실/);
});

await test('Status shows a warning for low health and a visible infection timer',()=>{
  const f=fixture(); const {run,el}=f;
  f.run("G=newState('도현');migrate();busy=false;G.hp=2;G.infection={left:5};G.items=['flashlight'];G.meds=2");
  run('renderStats()');
  const s=el('stats').innerHTML;
  assert.match(s,/class="st low">❤ 2\/10/); assert.match(s,/감염 5시간대/); assert.match(s,/💊 2/); assert.match(s,/🔦/);
});

await test('Starting a new game needs a name, creates the opening and saves',()=>{
  const f=fixture(); const {run,el,disk}=f;
  el('cName').value='  ';
  run('finishCreation()');
  assert.equal(run('G'),null,'empty name is rejected');
  el('cName').value='도현';
  run('finishCreation()');
  assert.equal(run('G.char.name'),'도현');
  assert.ok(disk.has('hanbit_save_v2'));
  const all=run('G.log.map(x=>x.text).join("\\n")');
  assert.match(all,/3동 7층 자취방/);
  assert.match(all,/도현은/,'josa follows the name');
});

await test('No leftovers of the old game (nursing-ward, school, mystery) remain in the script',()=>{
  for(const word of ['병동','요양','간호','출석부','한빛','학교','캠퍼스','THEME_TERMS','accuse','suspect','zoneOut','zoneIn'])
    assert.equal(script.includes(word),false,`script still mentions ${word}`);
});

done('zone/state');
})().catch(e=>{console.error(e);process.exitCode=1});

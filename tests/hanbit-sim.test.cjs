// Run: node tests/hanbit-sim.test.cjs
// 난이도 시뮬레이터(tools/sim)가 같은 시드에서 같은 결과를 내고, 짧은 판(50판)이 예외 없이 끝나는지만 확인한다.
const assert=require('node:assert/strict');
const {test,done,fixture}=require('./_hanbit-fixture.cjs');
const {createGame}=require('../tools/sim/loader.cjs');
const {playGame}=require('../tools/sim/engine.cjs');
const {BOTS,DEFAULT_SPECS}=require('../tools/sim/bots.cjs');
const {gameSeed,mulberry32}=require('../tools/sim/prng.cjs');
const {summarize}=require('../tools/sim/stats.cjs');

const play=(h,spec,n,seed=1)=>Array.from({length:n},(_,i)=>playGame(h,BOTS[spec](),gameSeed(seed,i)));

(async()=>{
await test('Same seed gives identical results, even in a freshly loaded game; a different seed differs',()=>{
  for(const spec of ['random','yumin-first','completionist:front']){
    const a=JSON.stringify(play(createGame(),spec,25)), b=JSON.stringify(play(createGame(),spec,25));
    assert.equal(a,b,spec+' is not reproducible');
    assert.notEqual(a,JSON.stringify(play(createGame(),spec,25,2)),spec+' ignores the seed');
  }
});

await test('Every strategy finishes 50 games without exceptions, stalls, network calls or duplicate items',()=>{
  const h=createGame();
  for(const spec of DEFAULT_SPECS){
    const recs=play(h,spec,50), m=summarize(recs);
    assert.equal(m.errs,0,spec+' threw: '+(recs.find(r=>r.err)||{}).err);
    assert.equal(m.stalls,0,spec+' stalled: '+(recs.find(r=>r.stall)||{}).stall);
    assert.equal(m.net,0); assert.equal(m.dup,0);
    for(const r of recs){ assert.ok(['dead','infected','timeout','escape_alone','escape_together'].includes(r.ending),spec+' did not end'); assert.ok(r.turns<=14,'a game ran past the last time slot') }
  }
});

await test('The simulator runs the real game code: replaying its picks in the plain test fixture gives the same final state',()=>{
  const h=createGame();
  for(const [spec,i] of [['random',3],['yumin-first',4],['completionist',5]]){
    const seed=gameSeed(9,i), picks=[], rec=playGame(h,BOTS[spec](),seed,{picks});
    const finalSim=JSON.stringify(h.G(),(k,v)=>k==='pend'?undefined:v);
    const f=fixture(); f.ctx.__r=mulberry32(seed);
    f.run("rng=()=>__r();UI.speed='off';render=()=>{};document.getElementById('cName').value='도현';finishCreation()");
    for(const id of picks){ f.run('resetQueue()'); f.run(`pick(${JSON.stringify(id)})`) }
    assert.equal(f.run("JSON.stringify(G,(k,v)=>k==='pend'?undefined:v)"),finalSim,spec+' diverged from the plain game');
    assert.equal(f.run('G.ending'),rec.ending);
  }
});

await test('No AI or network: a network call is counted and refused, and Math.random is blocked',()=>{
  const h=createGame(); h.begin(1);
  assert.equal(h.run('aiReady()'),false);
  assert.throws(()=>h.run('Math.random()'),/Math.random is forbidden/);
  h.run("var __e=null;fetch('x').catch(e=>{__e=e.message})");
  assert.equal(h.S().net,1);
});

await test('Rule patches apply only to the in-memory copy and must match exactly once',()=>{
  assert.throws(()=>createGame({patches:[['const NO_SUCH_CONSTANT=1','x']]}),/exactly once/);
  const sure=createGame({patches:[['const BITE_CHANCE=0.5;','const BITE_CHANCE=1.0;']]}), never=createGame({patches:[['const BITE_CHANCE=0.5;','const BITE_CHANCE=0.0;']]});
  const bites=h=>play(h,'rush-front',60).reduce((s,r)=>s+r.bites,0);
  assert.ok(bites(sure)>0&&bites(never)===0,'patched BITE_CHANCE had no effect');
  assert.equal(createGame().world.biteChance,0.5,'the game file itself must stay untouched');
});

done('hanbit-sim');
})().catch(e=>{console.error(e);process.exit(1)});

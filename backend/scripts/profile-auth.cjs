// Run inside Auth with a temporary inspector listening only on container loopback.
// Read timing/CPU only; restores all hooks and closes the inspector on completion.
const fs = require('node:fs');
const seconds = Number(process.argv[2] || 10);
if (!Number.isInteger(seconds) || seconds < 1 || seconds > 40) throw new Error('seconds must be 1..40');

const install = `(() => {
  if (globalThis.__nrappReadProbe) throw new Error('probe already installed');
  const req = process.getBuiltinModule('module').createRequire('/workspace/service/package.json');
  const { performance, monitorEventLoopDelay } = req('node:perf_hooks');
  const mongoose = req('mongoose');
  const { JwtService } = req('@nestjs/jwt');
  const { InFlightReads } = req('./dist/common/utils/in-flight-reads');
  const stats = new Map();
  const restores = [];
  const delay = monitorEventLoopDelay({resolution:10}); delay.enable();
  const started = performance.now(); const cpu = process.cpuUsage();
  let coalesced = 0;
  function record(key, start) {
    const values = stats.get(key) || []; values.push(performance.now() - start); stats.set(key, values);
  }
  function wrap(proto, method, key, sync = false) {
    const old = proto[method];
    const replacement = function(...args) {
      const start = performance.now();
      const label = typeof key === 'function' ? key(this) : key;
      if (method === 'run' && this.pending.has(args[0])) coalesced++;
      try {
        const result = old.apply(this, args);
        if (sync) { record(label,start); return result; }
        return result.then(value => {record(label,start); return value;}, error => {record(label,start); throw error;});
      } catch(error) {record(label,start); throw error;}
    };
    proto[method] = replacement;
    restores.push(() => {if(proto[method] === replacement) proto[method] = old;});
  }
  wrap(JwtService.prototype,'verify','jwt_verify',true);
  wrap(InFlightReads.prototype,'run','credential_wait_including_shared_read');
  wrap(mongoose.Query.prototype,'exec',query => 'mongo_query:' + query.model.collection.name + ':' + query.op);
  const clients = mongoose.connections.filter(connection => connection.readyState === 1).map(connection => connection.getClient());
  const checkout = event => record('mongo_pool_checkout',performance.now()-event.durationMS);
  for(const client of clients) {client.on('connectionCheckedOut',checkout); restores.push(() => client.off('connectionCheckedOut',checkout));}
  let pool_wait_queue_max = 0;
  let pool_checked_out_max = 0;
  const poolSampler = setInterval(() => {
    for(const client of clients) for(const server of client.topology?.s?.servers?.values() || []) {
      pool_wait_queue_max = Math.max(pool_wait_queue_max,server.pool?.waitQueueSize || 0);
      pool_checked_out_max = Math.max(pool_checked_out_max,server.pool?.currentCheckedOutCount || 0);
    }
  },100); poolSampler.unref();
  restores.push(() => clearInterval(poolSampler));
  let stopped = false;
  function stop() {
    if(stopped) return; stopped = true; clearTimeout(expiry);
    for(const restore of restores) restore(); delay.disable();
    const wall = performance.now() - started; const used = process.cpuUsage(cpu);
    const summary = {wall_ms:wall,process_cpu_percent_one_core:(used.user+used.system)/1000/wall*100,
      coalesced_reads:coalesced,pool_wait_queue_max,pool_checked_out_max,event_loop_delay_ms:{mean:delay.mean/1e6,p95:delay.percentile(95)/1e6,p99:delay.percentile(99)/1e6,max:delay.max/1e6},timings:{}};
    for(const [key,values] of stats) {
      values.sort((a,b)=>a-b); const at=p=>values[Math.max(0,Math.ceil(values.length*p)-1)];
      summary.timings[key]={count:values.length,per_second:values.length/(wall/1000),median_ms:at(.5),p95_ms:at(.95),max_ms:at(1)};
    }
    delete globalThis.__nrappReadProbe; return summary;
  }
  const expiry=setTimeout(stop,60000); expiry.unref();
  globalThis.__nrappReadProbe={stop}; return {installed:true};
})()`;

async function main() {
  const targets = await (await fetch('http://127.0.0.1:9229/json/list')).json();
  if (targets.length !== 1) throw new Error('unexpected inspector targets');
  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise((resolve,reject)=> { ws.addEventListener('open',resolve,{once:true}); ws.addEventListener('error',reject,{once:true}); });
  let next = 0;
  const pending = new Map();
  ws.addEventListener('message',event=> {
    const message = JSON.parse(event.data);
    const waiter = pending.get(message.id); if(!waiter) return;
    pending.delete(message.id);
    if(message.error) waiter.reject(new Error('Inspector command failed')); else waiter.resolve(message.result);
  });
  function send(method,params={}) {
    return new Promise((resolve,reject)=> {
      const id = ++next; pending.set(id,{resolve,reject}); ws.send(JSON.stringify({id,method,params}));
    });
  }
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate',{expression,returnByValue:true});
    if(result.exceptionDetails) throw new Error('Probe expression failed');
    return result.result.value;
  }
  try {
    await evaluate(install);
    await send('Profiler.enable'); await send('Profiler.start');
    await new Promise(resolve=>setTimeout(resolve,seconds*1000));
    const {profile} = await send('Profiler.stop');
    const timings = await evaluate('globalThis.__nrappReadProbe.stop()');
    const path = '/tmp/nrapp-auth-' + Date.now() + '.cpuprofile';
    fs.writeFileSync(path,JSON.stringify(profile),{mode:0o600});
    const nodes = new Map(profile.nodes.map(node=>[node.id,node]));
    const frames = new Map();
    for(const id of profile.samples || []) {
      const frame = nodes.get(id)?.callFrame; if(!frame) continue;
      const key=frame.functionName+' '+frame.url+':'+(frame.lineNumber+1);
      frames.set(key,(frames.get(key)||0)+1);
    }
    console.log(JSON.stringify({timings,cpu_profile:path,top_sample_frames:[...frames].sort((a,b)=>b[1]-a[1]).slice(0,25)},null,2));
  } finally {
    await evaluate('globalThis.__nrappReadProbe?.stop()').catch(()=>{});
    await evaluate("setImmediate(() => process.getBuiltinModule('inspector').close()); true").catch(()=>{});
    ws.close();
  }
}
main().catch(error=> { console.error(error.message); process.exitCode=1; });

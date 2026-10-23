import {Miniflare} from 'miniflare';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import production from '../cloudflare.config.ts';
import staging from '../cloudflare.staging.config.ts';
const selected=process.env.PITAPAT_STAGE==='1'?staging:production;
function workerConfig(base){
 const worker={...base.worker};delete worker.entrypoint;
 if(process.env.PITAPAT_SERVE_ASSETS==='1')worker.assets={...base.worker.assets,directory:resolve('dist'),hasUserWorker:true};
 else{delete worker.assets;worker.env={...worker.env};delete worker.env.ASSETS;}
 worker.env={...worker.env,RECONNECT_GRACE_MS:{type:'text',value:process.env.PITAPAT_GRACE_MS||'120000'},ROOM_IDLE_MS:{type:'text',value:process.env.PITAPAT_IDLE_MS||'1800000'},ROOM_RETENTION_MS:{type:'text',value:process.env.PITAPAT_RETENTION_MS||'86400000'}};
 worker.manifest={mainModule:'worker.js',modulesRoot:resolve('.server'),modules:{'worker.js':{type:'esm',contents:readFileSync('.server/worker.js','utf8')}}};return worker;
}
export function runtime(configurations=[selected]){
 return new Miniflare({unsafeInspectDurableObjects:process.env.PITAPAT_INSPECT==='1',host:'127.0.0.1',port:Number(process.env.PITAPAT_SERVER_PORT||8787),resourcePersistencePath:resolve(process.env.PITAPAT_STATE_DIR||'.local-state'),telemetry:{enabled:false},workers:configurations.map(base=>({config:workerConfig(base)}))});
}

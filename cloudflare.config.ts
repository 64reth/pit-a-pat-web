import { bindings, defineConfig, exports } from 'cf/config';
export default defineConfig({worker:{
 name:'pit-a-pat-online',entrypoint:'./server/index.ts',compatibilityDate:'2026-09-28',
 assets:{notFoundHandling:'single-page-application',runWorkerFirst:['/api/*']},
 observability:{enabled:true,logs:{enabled:true,invocationLogs:false},traces:{enabled:true,headSamplingRate:0.1},redactQueryString:true},
 exports:{Account:exports.durableObject({storage:'sqlite'}),GameRoom:exports.durableObject({storage:'sqlite'})},
 env:{ACCOUNTS:bindings.durableObject({worker:'pit-a-pat-online',exportName:'Account'}),ROOMS:bindings.durableObject({worker:'pit-a-pat-online',exportName:'GameRoom'}),ASSETS:bindings.assets(),FUNDED_MATCHES_ENABLED:bindings.text('true'),DEPLOYMENT_ENVIRONMENT:bindings.text('local-or-production'),STAKE_TIERS:bindings.text('10,25,50'),RECONNECT_GRACE_MS:bindings.text('120000'),ROOM_IDLE_MS:bindings.text('1800000'),ROOM_RETENTION_MS:bindings.text('86400000')}
}});

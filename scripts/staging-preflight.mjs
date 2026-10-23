import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import production from '../cloudflare.config.ts';
import staging from '../cloudflare.staging.config.ts';
const root=JSON.parse(await readFile('.cloudflare/output/v0/config.json','utf8'));
const worker=JSON.parse(await readFile('.cloudflare/output/v0/workers/default/worker.config.json','utf8'));
assert.equal(root.buildContext.mode,'staging','Refuse a non-staging artifact');
assert.equal(worker.name,'pit-a-pat-online-staging');assert.notEqual(worker.name,production.worker.name);
for(const [binding,cls] of [['ACCOUNTS','Account'],['ROOMS','GameRoom']]){
 assert.equal(worker.env[binding].worker,staging.worker.name);assert.equal(worker.env[binding].exportName,cls);
 assert.deepEqual(worker.exports[cls],{type:'durable-object',storage:'sqlite'});
 assert.notEqual(worker.env[binding].worker,production.worker.env[binding].worker);
 assert.ok(!('id' in worker.env[binding]),'No shared namespace ID may be pinned');
}
assert.equal(worker.env.FUNDED_MATCHES_ENABLED.value,'false','Public funded staging matches must stay disabled');assert.equal(worker.env.DEPLOYMENT_ENVIRONMENT.value,'staging');
assert.equal(worker.env.ASSETS.type,'assets');assert.ok(!worker.routes?.length,'No production custom domain/routes');
assert.ok(!JSON.stringify(worker).toLowerCase().includes('ludi'),'No LUDI binding or resource');
const plan={worker:worker.name,mode:root.buildContext.mode,bindings:worker.env,exports:worker.exports,namespaceLifecycle:'cf exports creates independent SQLite Account/GameRoom namespaces for this Worker; no transfers, renames, imports or deletes',playerData:'Empty staging namespaces only. Never copy .local-state, production wallets, guest cookies or browser saves.',routing:'Staging Worker only. No production routes or LUDI references.',deployed:false};
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/staging-plan.json',JSON.stringify(plan,null,2));
console.log('PASS: isolated staging artifact, SQLite class lifecycle, account/room bindings, assets and no production/LUDI routes');

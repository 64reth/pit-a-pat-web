// Supported Wrangler fallback: converts only the validated cf staging Build Output.
// Never reads credentials or edits the source project's Cloudflare configuration.
import {readFile,mkdir,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import assert from 'node:assert/strict';
import './staging-preflight.mjs';
const root=resolve('.cloudflare/output/v0/workers/default'),worker=JSON.parse(await readFile(root+'/worker.config.json','utf8'));
assert.equal(worker.name,'pit-a-pat-online-staging');assert.equal(worker.env.FUNDED_MATCHES_ENABLED.value,'false');
const config={name:worker.name,account_id:'203bf3287fc4eb1260ec344a3e0f5071',main:root+'/bundle/worker.js',compatibility_date:worker.compatibilityDate,no_bundle:true,workers_dev:true,preview_urls:false,assets:{directory:root+'/assets',binding:'ASSETS',not_found_handling:'single-page-application',run_worker_first:['/api/*']},exports:worker.exports,durable_objects:{bindings:['ACCOUNTS','ROOMS'].map(name=>({name,class_name:worker.env[name].exportName,script_name:worker.name}))},vars:Object.fromEntries(Object.entries(worker.env).filter(([,v])=>v.type==='text').map(([k,v])=>[k,v.value])),observability:{enabled:true,logs:{enabled:true,invocation_logs:false},traces:{enabled:true,head_sampling_rate:0.1}}};
assert.ok(!JSON.stringify(config).toLowerCase().includes('ludi'));assert.ok(!config.routes);assert.ok(!('migrations' in config));
await mkdir('artifacts/staging-wrangler',{recursive:true});await writeFile('artifacts/staging-wrangler/wrangler.jsonc',JSON.stringify(config,null,2));console.log('Prepared explicit Pit-a-Pat staging-only Wrangler configuration; no credentials, existing namespace IDs, routes, transfers or deletes.');

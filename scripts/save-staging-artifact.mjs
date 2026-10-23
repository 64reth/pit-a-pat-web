import {getWorkerBundleDir} from '@cloudflare/build-output-utils';
import {readFile,cp,mkdir,rm,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const worker=JSON.parse(await readFile('.cloudflare/output/v0/workers/default/worker.config.json','utf8'));
if(worker.name!=='pit-a-pat-online-staging')throw Error('Refusing to archive a non-staging Worker');
await mkdir('artifacts',{recursive:true});await rm('artifacts/staging-build',{recursive:true,force:true});await mkdir('artifacts/staging-build/.cloudflare/output',{recursive:true});await cp('.cloudflare/output/v0','artifacts/staging-build/.cloudflare/output/v0',{recursive:true,dereference:true});
const workerSha256=createHash('sha256').update(await readFile(getWorkerBundleDir(process.cwd())+'/worker.js')).digest('hex');
await writeFile('artifacts/staging-integrity.json',JSON.stringify({worker:worker.name,workerSha256,deployed:false},null,2));console.log('Saved isolated staging artifact and Worker SHA-256; no upload');

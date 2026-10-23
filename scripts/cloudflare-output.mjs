import {cleanBuildOutputDir,getWorkerBundleDir,writeAssets,writeRootConfig,writeWorkerConfig,readBuildOutput} from '@cloudflare/build-output-utils';
import {mkdir,copyFile,readdir,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import production from '../cloudflare.config.ts';
import staging from '../cloudflare.staging.config.ts';
const config=process.env.PITAPAT_STAGE==='1'?staging:production;
async function checkAssets(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);if(entry.name==='.DS_Store'){await rm(path);continue;}if(/^(?:\.env(?:\.|$)|\.dev\.vars|\.local-state)|\.(?:sqlite3?|db|pem|key)$/.test(entry.name))throw Error('Refusing private data in public assets: '+entry.name);if(entry.isDirectory())await checkAssets(path);}}
export async function packageCloudflare(){
 await checkAssets(resolve('dist'));
 await import('./build-server.mjs');
 const root=resolve('.');await cleanBuildOutputDir(root);const bundle=getWorkerBundleDir(root);await mkdir(bundle,{recursive:true});await copyFile('.server/worker.js',bundle+'/worker.js');await writeAssets({root,sourceDirectory:resolve('dist')});await writeRootConfig(root,undefined,{isPreview:false,mode:process.env.PITAPAT_STAGE==='1'?'staging':'production'});await writeWorkerConfig({root,config:config.worker,manifest:{type:'partial',mainModule:'worker.js',modules:{}}});await readBuildOutput(root);console.log('Cloudflare Worker and static assets packaged (no deployment).');
}

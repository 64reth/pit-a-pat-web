import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
function sources(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(f=>f.isDirectory()?sources(join(dir,f.name)):/\.(?:tsx?|css)$/.test(f.name)?[join(dir,f.name)]:[]);}
const digest=createHash('sha256');for(const file of [...sources('src'),...sources('server'),'cloudflare.config.ts','cloudflare.staging.config.ts'].sort())digest.update(file).update(readFileSync(file));
const buildInfo={build:'004E',sourceBuild:digest.digest('hex').slice(0,12),builtAt:new Date().toISOString(),target:process.env.PITAPAT_STAGE==='1'?'staging':'production-package'};
export default defineConfig({define:{'import.meta.env.VITE_BUILD_ID':JSON.stringify(buildInfo.sourceBuild)}, plugins:[{name:'pitapat-build-identity',generateBundle(){this.emitFile({type:'asset',fileName:'build-info.json',source:JSON.stringify(buildInfo,null,2)});}},react(),{name:'pitapat-cloudflare-output',apply:'build',async closeBundle(){const {packageCloudflare}=await import('./scripts/cloudflare-output.mjs');await packageCloudflare();}}], server:{proxy:{'/api':{target:'http://127.0.0.1:8787',ws:true,changeOrigin:false}}} });

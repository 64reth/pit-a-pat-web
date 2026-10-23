import { rolldown } from 'rolldown';
import { mkdir } from 'node:fs/promises';
await mkdir('.server',{recursive:true});
const bundle=await rolldown({input:'server/index.ts',external:['cloudflare:workers']});
await bundle.write({file:'.server/worker.js',format:'esm',sourcemap:true});await bundle.close();

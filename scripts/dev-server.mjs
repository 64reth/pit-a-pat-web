import './build-server.mjs';
import {runtime} from './worker-runtime.mjs';
const server=runtime();
console.log(`Pit-a-Pat multiplayer: ${await server.ready}`);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.dispose();process.exit(0);});

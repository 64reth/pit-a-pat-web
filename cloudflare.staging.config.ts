import {bindings,defineConfig} from 'cf/config';
import production from './cloudflare.config.ts';
// Separate Worker name means independent SQLite namespaces and account ledgers.
// No resource is created by importing or building this configuration.
export default defineConfig({worker:{...production.worker,name:'pit-a-pat-online-staging',env:{...production.worker.env,FUNDED_MATCHES_ENABLED:bindings.text('false'),DEPLOYMENT_ENVIRONMENT:bindings.text('staging'),ACCOUNTS:bindings.durableObject({worker:'pit-a-pat-online-staging',exportName:'Account'}),ROOMS:bindings.durableObject({worker:'pit-a-pat-online-staging',exportName:'GameRoom'})}}});

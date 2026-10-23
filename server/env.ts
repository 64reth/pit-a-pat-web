import type { InferEnv } from 'cf/config';
import type config from '../cloudflare.config';
import type { Account } from './accounts/Account';
import type { GameRoom } from './rooms/GameRoom';
// Scalar/asset bindings are inferred from the deployment config. RPC class types
// specialize the same two configured namespaces (no handwritten scalar settings).
export type Env=Omit<InferEnv<typeof config.worker>,'ACCOUNTS'|'ROOMS'>&{ACCOUNTS:DurableObjectNamespace<Account>;ROOMS:DurableObjectNamespace<GameRoom>};

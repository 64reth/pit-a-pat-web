# Build 005 — live Pit-a-Pat staging

Verified 23 October 2026. Public zero-stake staging is reachable and functional:

**https://pit-a-pat-online-staging.garetha81.workers.dev**

Repository: https://github.com/64reth/pit-a-pat-web

## Revision and resources

- Original verified source `b2ae1a3455265fa03be301c808d531244a3ddf68` was pushed intact.
- Deployment safeguard `aad9eda` adds the server-enforced funded-room gate and explicit CLI fallback tooling.
- **Deployed code: `91d1e3aa9020cdc06d339277198bfb8b349cb5e6`**. This also corrects large desktop online hands extending under the sidebar, found during hosted Chrome review.
- Source build fingerprint: `d7cd9b90fbde` (`/build-info.json` and home footer).
- Worker: `pit-a-pat-online-staging`. Logical environment: `staging`. Workers.dev only; no production/LUDI custom routes.
- Cloudflare account: `203bf3287fc4eb1260ec344a3e0f5071` (the existing authenticated owner's account).
- Live version: `1273602d-90ca-4e50-b97a-3660a0c95914`, deployment tag `91d1e3a`.
- `ACCOUNTS`: newly created SQLite Account namespace `b09aef3ec16942f2aa92989125c09087`.
- `ROOMS`: newly created SQLite GameRoom namespace `f94b7578e96a4522b3d1f569fab51808`.
- `ASSETS`: this Worker's bundled frontend/artwork. No D1, KV, R2, production wallet IDs, credentials or local player databases are attached.

The initial remote lookup returned Worker-not-found before deployment. The first upload's exports reconciliation explicitly created Account and GameRoom. Subsequent deployment retained those namespaces. Neither migration configuration nor bindings contain transfers, renames, deletions, imported namespace IDs or other applications. [Live version metadata](build-005-version.json).

## Public funded-match gate

`FUNDED_MATCHES_ENABLED=false` and `DEPLOYMENT_ENVIRONMENT=staging` are non-secret Worker variables. The API rejects funded room creation with HTTP 403; room initialization independently rejects it. The frontend discovers capabilities through `/api/config`, presents online staging as zero-stake testing and omits funded stake options. Existing rematch recovery cannot reintroduce a funded entry while this gate is off.

Local practice still uses explicitly simulated chips, including the 25-chip Quick Play buy-in and Custom antes. These balances cannot fund a hosted wallet. Hosted zero-stake championships award the existing 10/5 champion/participant chips and persist them in staging Account storage. Those chips cannot be staked while the gate is off. Coins remain cosmetic currency.

No application secret is required by this build. Browser session secrets are generated at runtime, hashed in the staging Account namespace, and transported in Secure/HttpOnly/SameSite cookies. CLI OAuth credentials remain outside the repository and deployment artifact.

## Authentication and deployment method

GitHub CLI was logged out, but Git's existing credential helper successfully pushed and remote hashes were checked. Wrangler 4.152.0 was already authenticated to the owner's account. The separate `cf` CLI had no profile. Automatic approval review rejected an attempted credential-transfer approach; it was not executed or retried. Deployment used Wrangler's own supported login path without extracting credentials.

The source project continues to use `cloudflare.config.ts` and `cloudflare.staging.config.ts`. For authenticated Wrangler deployment, `scripts/prepare-staging-wrangler.mjs` converts only the preflight-validated staging Build Output into an explicit ignored `artifacts/staging-wrangler/wrangler.jsonc`. It pins the staging Worker/account, separate class bindings, SQLite exports, assets and the funded gate. It never reads credentials. This avoids Wrangler ignoring the project's typed cf configuration.

Rebuild and review before any subsequent staging deployment:

```sh
npm run prepare:staging
node scripts/prepare-staging-wrangler.mjs
npx wrangler whoami
npx wrangler deploy --config artifacts/staging-wrangler/wrangler.jsonc --dry-run
# Review account, Worker name, exports and FUNDED_MATCHES_ENABLED=false first.
npx wrangler deploy --config artifacts/staging-wrangler/wrangler.jsonc --tag <reviewed-commit>
```

SQLite class lifecycle uses the current declarative `exports` fields, not an additional legacy migrations array. Only the new staging classes were created. Reference: https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/

## Hosted verification

[Chrome screenshots and measured results](../verification/build-005/README.md).

Passed on the real HTTPS deployment:

- Home, Collection, Profile and Play navigation; actual Orisha artwork loaded.
- Hosted Local Quick Play simulated 25-chip confirmation, automatic deal, full first-to-three championship, all three normal-motion enlarged action reveals and in-table outcomes.
- Hosted Local Custom Chains, repeated equal simulated antes, a human hand victory, continuous table through five hands and final settlement.
- Two independent browser sessions: invitation URL joins the correct seat; zero-stake commitments are explicit; no early deal after one player's confirmation; automatic deal after both.
- Reload while only one player is ready retains confirmation and the open drawer, with no game dealt.
- Active-hand reload preserves private cards and hand ID; offline/online recovery requires a newly connected socket and newer authoritative revision.
- Online Quick Traditional: four hands, three ordinary overlays; Online Custom Chains: three hands, two ordinary overlays. Same table remains mounted. Both settle once with expected +10/+5 chip rewards and zero reserved chips; no browser/server errors.
- Real action effects and target highlights in online play; reduced-motion presentation also verified.
- Desktop plus 667×375, 740×360, 844×390, 932×430 landscape and 320×740/390×844 portrait layouts, every represented card selectable with no page scrolling.
- Direct funded API requests return 403 on hosted staging, independent of UI settings.

Local regressions: 75 tests; production/staging build; room security/reconnect/chat/host-transfer/receipt/settlement suite; simultaneous staging/production namespace isolation; staging funded-gate integration; release credential/database scan.

## Remaining risks and restrictions

**Nonzero-stake settlement/refunds, hosted ledger recovery after deployment/restart, and permanent funded abandonment resolution are not verified on Cloudflare.** The inherited funded-abandonment policy preserves reservations until unanimous cancellation/operator reconciliation; no operator settlement tool has been introduced. Therefore funded online rooms remain disabled. Do not enable them based on successful casual rewards or local tests.

Physical iPhone/Android devices and real mobile browser toolbar changes remain untested; Chrome touch/viewport emulation was used. Guest accounts depend on retained browser credentials; do not clear cookies when testing recovery.

No public production Worker or another Allen Creative application's resources were deployed, overwritten or reused. The public staging link is intended for zero-stake multiplayer testing.

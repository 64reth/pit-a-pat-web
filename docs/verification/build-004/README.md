# Build 004 verification · 22 October 2026

Implemented and tested locally; nothing pushed or deployed. Cloudflare remote provisioning, hosted WebSocket behavior and staging load tests remain unverified.

## Browser evidence

- [Active Traditional table](online-traditional.png): two separate Chrome browser contexts, distinct secure guest identities, private hands.
- [Completed Traditional hand](online-result.png): authoritative result and persisted rewards.
- [Settled virtual stake](stake-settled.png): earned chips, 10-chip reservations, complete winner pool payment and cleared reservations.
- [Four-player Chains on mobile](online-chains-mobile.png): four separate contexts, 390px viewport, horizontally scrollable private hand.

`node scripts/online-check.mjs` passed against Vite plus the real local Workers runtime. It played three complete two-player Traditional hands (two casual to earn entry chips, one funded 10-chip hand) and one complete four-player Chains hand. The first hand deliberately withheld advance TAP until an empty-hand penalty occurred, then completed with eligible TAP. Reloading, then closing and reopening a participant’s tab, restored the same authenticated seat and hand. Rematch reset every seat's readiness and acceptance. The funded hand reserved 10 chips per wallet; its total settlement credited the 20-chip pool plus the existing 15 chips of completion/winner rewards across the two players. Tests inspect every captured room frame recursively for private keys and verify that public player records have no hands. The four-player mobile table has no document overflow.

`node scripts/preview-check.mjs` also passed against the compiled frontend and Worker served together at localhost:8788: two independent guests hosted/joined, readied, started, declared TAP, and used the actual card-selection/Play or blocked-draw controls. This checks static asset routing and same-origin WebSockets without Vite's API proxy.

The browser automation chooses moves from each participant's own projection. It does not use deck order, opponents' hands, forced online seeds or a test result endpoint. No online bots are added.

## Actual Workers/SQLite checks

`npm run test:rooms` passed:

- Unavailable/full room joins rejected; non-host start rejected.
- Client-posted chip/XP amounts ignored; socket actor spoofing cannot act for another seat.
- Exact duplicate move request changes the game only once.
- Opening the same authenticated seat again replaces the previous socket without losing its hand.
- Hibernation preserves attached sockets and authoritative play.
- Complete runtime restart preserves the match, revision and viewer's private hand.
- Leaving an incomplete hand grants no completion rewards.
- A simulated crash boundary with persisted settlement intent and only the first wallet paid recovers after restart, settles the remaining wallet, and does not repeat the first payment.
- Insufficient funds in the second wallet release the first wallet's already reserved entry.
- Disconnect grace expiry cancels a funded hand, refunds all entries, and grants no incomplete-hand rewards. Tests shorten grace to 1.5 seconds; normal configuration is 120 seconds.

`npm run test:wallets` passed:

- Duplicate completion/result calls award once.
- Concurrent reservations cannot spend the same chips twice.
- Wallet and reservation survive runtime restart.
- Duplicate refunds return chips once; refund tombstones reject late reservations.
- Winner gets the full pool; a draw returns the entry plus normal completion rewards.
- Unaffordable cosmetics are rejected; repeated equip/purchase charges coins once.

The interruption test creates the exact durable boundary with test-only Miniflare storage inspection. It does not claim a deployed production fault-injection test. No storage inspection or mint/result/balance override endpoint is exposed by the application.

## Preserved local game and build checks

- `npm test`: all 29 tests passed, including the existing seeded full-game runs.
- `scripts/browser-check.mjs`: desktop Traditional and mobile Chains completed; invalid move rejection and saved progression passed; no page errors.
- `scripts/advance-tap-check.mjs`: missing/same-turn TAP penalties in both modes, followed by eligible wins and saved rewards.
- `scripts/interface-check.mjs`: desktop 1440px and mobile 390px/320px screen flows, fonts, cards, settings, rules, profile and collection; no document overflow or page errors. The online assertion now checks real host/join controls.
- `npm run build`: client/server TypeScript checks, frontend bundle, Worker bundle and validated Cloudflare Build Output Specification package passed.
- `npx cf build`: local Cloudflare build passed; no deployment performed.
- Final dependency audit: zero vulnerabilities after patched transitive development dependency overrides.

## Operational limits

Guest identity belongs to the browser cookie. Clearing it loses access to that profile; no cross-device login/account recovery or balance migration exists. Local practice progress uses the existing browser save and cannot fund server stakes. Online has the same Profile/currency/reward/cosmetic model, with server-owned balances.

Rooms are private invite/code rooms, with no public matchmaking, chat or spectators. Disconnect timeout cancels/refunds instead of declaring a forfeit winner. Stakes of 10/25/50 are implemented; the actual browser settlement used 10, while all tiers share the same bounded server path. No hosted Cloudflare performance, failover or abuse-resistance claim is made. Before public launch, add recoverable identity, anonymous-session abuse controls, staging soak tests and deeper process-failure injection. See the root README for bindings, migration declarations and launch commands.

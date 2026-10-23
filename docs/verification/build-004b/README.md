# Build 004B verification · 23 October 2026

Implemented locally. No push, deployment, remote provisioning, or LUDI changes.

## Actual browser championships

The latest full runs produced these results. Each hand used the normal shared engine, with action cards enabled and advance TAP enforced.

| Browser scenario | Hands/deals | Final standings | Match rewards |
|---|---:|---|---|
| Local Traditional, four players, 1440×1050 | 8 | You 3, Ama 2, Kofi 2, Nia 1 | One champion reward: 45 XP / 20 coins / 10 chips |
| Local Chains, three players, 390×844 portrait | 4 | You 0, Ama 1, Kofi 3 | One completion reward: 20 XP / 12 coins / 5 chips |
| Online Traditional, two independent guests | 4 | Ayo 3, Ama 1 | Once per match |
| Online Traditional rematch | 4 | Ayo 1, Ama 3 | Once per new match; standings reset |
| Online Traditional, 10-chip championship | 4 | Ayo 1, Ama 3 | Entries reserved through all hands; entire 20-chip pool to Ama at third victory, plus completion rewards |
| Online Chains, four independent guests; host in portrait | 5 | Kofi 0, Nia 2, Sade 3, Bayo 0 | Once per match |

Local tests click actual exposed card areas and normal TAP/Play/Discard/Next Hand controls, observing bot turns in the browser. They check visible standings, per-hand transitions, action feedback, no intermediate currency grants, final rewards, complete rematch reset and leaving without corrupting completed progress. The card-fan click helper uses real hit testing, without forced clicks or replacing game state. Both playthroughs observed Draw Two/Skip/Reverse feedback. Browser automation's `actions` counter also includes wait/poll iterations and is not a move count.

Online tests use separate isolated Chrome contexts, each with a distinct guest identity. Their automation chooses legal moves from that participant's private projection, while the UI/transport and server remain real; it does not add online bots or access the draw pile. All participants ready up before every Next Hand, and the host starts it through the interface. Reloading between hands restored championship ID, standings and private cards. The funded match started only after earned casual championship rewards funded entries. Each intermediate hand left balances/statistics unchanged and kept ten chips reserved per player. Final result credited the full pool and one match reward per participant. Rematch cleared readiness and stake acceptance.

Every captured room frame was checked recursively for seed/deck/pile, ticket hashes, connection credentials and opponents' hands. Public championship metadata contains standings, completed result IDs, winners and turn counts only. No browser page errors occurred. The final online run also asserted no document overflow at 390px. Separate layout checks passed online at 320/390/1440px and local at 320px.

Machine-readable run summaries: [local-results.json](local-results.json) and [online-results.json](online-results.json).

## Screenshots

- [Desktop Traditional active table and sidebar](traditional-active.png)
- [Traditional hand result and retained standings](traditional-hand-result.png)
- [Traditional champion and final standings](traditional-champion.png)
- [Portrait Chains active table](chains-active.png)
- [Chains hand result](chains-hand-result.png)
- [Chains champion](chains-champion.png)
- [Online Traditional active table](online-traditional-active.png)
- [Online hand result before a new deal](online-traditional-hand-result.png)
- [Online funded hand result: championship not settled yet](online-staked-hand-result.png)
- [Online funded champion: pool settled](online-staked-champion.png)
- [Four-player online Chains on mobile](online-chains-mobile.png)
- [Online 320px layout](online-320-layout.png)
- [Local 320px layout](local-320-layout.png)

## Automated engine checks

`npm test` passes **51 tests**, preserving the previous 29 tests and adding championship/action coverage. Simulations include 180 complete first-to-three championships (30 seeds × both modes × 2/3/4 seats), plus the existing 240 full-hand runs. Every simulation step conserves all 52 distinct cards, ends within its move bound, and reaches an authoritative champion with exactly three victories.

Focused cases cover:

- Three-win completion, standings across hands, dealer/starter rotation, resets and terminal-state rejection.
- Final-card-only Traditional effects, replacing a pending action with a normal discard, End turn activation, and final-card-only Chains resolution.
- Draw Two/no stacking, Skip, Reverse for 2/3/4 seats, special starting Active Card without activation.
- Recycling under Draw Two, preserving the Active Card, and explicit shortfall reporting.
- Valid action-card victory before effects; failed TAP penalty before the final action; exactly one turn advance.
- Earlier/same-turn/missing TAP in both modes and phases; TAP retained through skipped turns.
- Whole-chain validation before mutation, public/private projections and rejection of illegal moves.
- Bots preserving an opening action, disrupting a nearly empty opponent, and stopping a legal chain on Draw Two.
- Stalemate redeal without victory/reward, explicit cancellation, one championship reward and duplicate-claim protection.
- Loading old Profile v1 balances, cosmetics, legacy receipts and statistics without resetting them.

## Actual Workers and wallet checks

`npm run test:rooms` passes against isolated real workerd/SQLite runtimes:

- Entries remain reserved and no reward is paid after an intermediate hand.
- Runtime restart restores between-hands scores and private cards.
- Fresh readiness is required; only the host starts; duplicate Next Hand requests do not deal twice; stale hand IDs cannot act on the new deal.
- Hibernation and duplicate-seat replacement preserve championship state.
- A persisted finished championship with only one wallet already paid recovers after runtime restart, completes the remaining payout, and does not duplicate the earlier payment.
- Exactly one completion/statistic increment and result ledger row per championship; incomplete results cannot settle.
- Match rematch resets scores/acceptance with a fresh championship ID.
- Disconnect expiry between hands refunds the entire incomplete championship without completion rewards.
- In-flight legacy single-hand contracts cancel/refund rather than silently changing their stake terms.
- Insufficient funds in the second wallet refund an already reserved first entry.

These crash-boundary tests persist legally engine-simulated hand/match results using test-only Miniflare storage inspection, then restart the actual runtime. They do not claim to be remote Cloudflare process-kill tests. No inspection, mint, seed or result override API is exposed by the application. The browser suite separately plays complete actual matches without storage inspection.

`npm run test:wallets` also passes the preserved wallet regression suite: duplicate awards/refunds, concurrent overspend prevention, reservation/restart persistence, late reservation tombstones, original legacy settlement recovery, draw refund and cosmetic spending/equipping.

`npm run build` passes frontend/server TypeScript checks and creates the frontend, Worker bundle and validated Cloudflare build output. The compiled same-origin preview is checked separately through `scripts/preview-check.mjs`. Final lockfile synchronization reported zero dependency vulnerabilities.

## Rules requiring owner awareness and remaining limits

Two-player Reverse uses the requested provisional interpretation: flip direction and pass to the opponent, without an extra immediate turn. No conflicting interpretation was added.

A stalemate redeals as the next numbered hand, rotating dealer/starter, awarding no marker/reward and retaining championship entries. A failed TAP receives its one-card penalty before final-card action resolution; no drawable TAP penalty card retains the previous no-winner stalemate policy. A confirmed winner never applies an action to another seat.

No unresolved gameplay defect was found in the tested cases. Hosted Cloudflare load/failover remains unverified. Guest cookie recovery, local in-progress match persistence across reload, public matchmaking/chat and spectator mode remain outside this build, as before. Normal online grace is two minutes; the isolated refund test shortens it to two seconds. All gameplay retains the original artwork and existing economy balances.

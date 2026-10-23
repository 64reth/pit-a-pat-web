# Build 004C verification · 23 October 2026

Implemented locally against Build 004B. No push, deployment, LUDI changes or remote resource provisioning.

## Implemented and exercised

- **Reverse:** final 10 skips the opponent and grants a genuinely later turn in two-player games. Three/four-player Reverse remains normal. Traditional opening effects wait for End turn/discard; buried 10s do not activate. Advance TAP, winning-before-effects, action shortages and first-to-three scoring are preserved.
- **HUD:** high-contrast active nameplates include a textual Playing marker, identity, card count, TAP and presence. Shared central status derives from the authoritative current player/phase and shows the previous action/effect. Short non-blocking transition feedback honours reduced motion. Restored snapshots do not replay old turn animation.
- **Sessions:** connecting/connected/reconnecting/disconnected/rejoined/left/invalid/replaced are distinct. One transport owns each tab’s socket, coalesces visibility/network wakes, and retries with bounded exponential backoff/jitter. Manual Retry remains available. Duplicate-tab displacement stops automatic retries.
- **Resume/actions:** the authenticated resume endpoint restores the original seat and private snapshot and reconciles pending action IDs. Unknown outcomes wait for an explicit same-ID retry; accepted actions are not resent. Revisions are monotonic across hands/rematches/chat/presence; stale snapshots are ignored. A lost Leave response confirms departure rather than silently rejoining. Revoked room tickets cannot reconnect.
- **Lifecycle/fairness:** free lobby seats can be selected without changing anyone else’s readiness. Host transfer is deterministic. Required-player absence pauses play. Funded cancellation requires unanimous consent; ordinary drop/grace expiry does not award a win, seize chips or grant a unilateral refund. A disconnected funded match remains intact and reserved. Owned Reserved tables support explicit return after leaving.
- **Messaging:** room-only plain-text chat, server identities/timestamps, 300-character maximum, four messages/reactions per ten seconds, latest 40 retained for at most one hour. HTML/script text is harmless; links/media are unsupported. TAP!/Nice play/Well played/Good game reactions are not game moves. Muting, hiding, unread counts and mobile scrolling work. Authoritative system events are separate and bounded.
- **Economy/errors:** existing wallet/reservation/result ledgers remain the authority. Pending/reserved/settling/settled/refunding/refunded/requires-reconciliation states are visible. Only ledger-confirmed results say settled/refunded. Failed settlement retries idempotently. Friendly persistent status replaces repeated toasts and hides internal database/stack detail. Insufficient funds are explained and casual play remains available.

## Actual browser results

`npm run test:online` completed two-player Traditional, a fresh rematch, a 10-chip funded championship and four-player Chains. Intermediate hands did not award match currency or settle entries. The captured frames verified **six two-player Reverse transitions** returning to the same player and **twelve multi-player Reverse transitions** with normal direction/next-seat calculation. No hidden hand/deck/seed/credential fields were present. Exact hands/standings are in [online-results.json](online-results.json).

`npm run test:browser` completed a six-hand four-player desktop Traditional championship and a three-hand three-player portrait Chains championship, preserving results, one completion prize and rematch reset. [Local summary](local-results.json).

`npm run test:sessions` uses two real Chrome browser instances against the compiled frontend and actual workerd server. It exercised:

1. Chat delivery, script/HTML payload rendered as text, reaction/TAP separation, muting, unread counts and rate limiting.
2. Reload on own turn and during an opponent’s turn, restoring the same private hand and correct highlight without old animation.
3. Dropping an acknowledgement after accepted TAP: receipt reconciliation confirms exactly one declaration.
4. Preventing a send, reconnecting and explicitly retrying the original action ID: one authoritative move.
5. Real offline/online changes with the active player missing: peers pause, and the returning seat resumes its same cards/TAP/standings.
6. Closing/reopening a browser using its saved guest credentials; duplicate tabs and manual seat takeover.
7. Disposing/restarting the actual local multiplayer runtime while both browsers remain open: automatic restoration of the same match/revision/hand/standings.
8. Invalid cookie/session: explicit recovery UI, no silent guest creation or reassigned seat; the original credential can restore the session.
9. Intentional host departure and host transfer.
10. Funded leave, discovery through Reserved tables, explicit return to the same hand/seat, and both clients agreeing to a confirmed refund.

The funded consent UI case uses engine-simulated completion fixtures to fund isolated test accounts via internal RPC. The separate full online championship test earns its entry through actual completed casual championships. No test mint, forced result, seed or balance-edit endpoint is exposed by the app.

[Session browser results](session-browser-results.json). Layout checks pass at online 320/390/1440px and local 320px. Chat scrolls independently; opening it does not overlay or shrink the hand/Active Card. No browser page errors were observed.

## Runtime, unit and build checks

- `npm test`: **59 tests passed**, including the preserved full-hand runs, 180 complete championships across both modes and all player counts, final-card/TAP rules, new two-player Reverse cases, and transport tests for accepted/unknown requests, stale revisions, bounded retries, wakeup coalescing, displaced tabs and lost Leave acknowledgements.
- `npm run test:rooms`: actual SQLite Durable Object tests passed authenticated/private resume, same-name impostor rejection, chat attribution/rate/deduplication, lost ACK recovery, armed TAP, runtime restart, hibernation, revoked tickets, assigned seat stability, deterministic host transfer, unanimous refunds, funded grace preservation, duplicate Next Hand, stale-hand rejection, conflicting ledger recovery and cleanup/retention. [Runtime results](runtime-results.json).
- The settlement-conflict case deliberately alters a reservation through test-only storage inspection, verifies that settlement remains pending, repairs the injected fault and restarts. The first wallet is paid once; the second then confirms normally. It does not claim a remote Cloudflare fault test.
- `npm run test:wallets`: original concurrent overspend, duplicate award/refund, late-reserve tombstone, restart and cosmetic-spending regression checks passed.
- `npm run build` passes client/server type checks and validates the Worker/static build output.
- `npm run build:staging` also passes. Output was inspected for `pit-a-pat-online-staging` and both DO bindings referencing that separate Worker. Production-named build output was restored afterwards. No resources were created.

## Screenshots

[Desktop active turn](session-active-desktop.png) · [Peer waiting for reconnect](waiting-for-reconnect.png) · [Mobile restored table](session-mobile.png) · [Mobile chat](chat-mobile.png) · [Funded consent/refund](funded-consent-refund.png) · [Four-player mobile](online-chains-mobile.png) · [320px online](online-320-layout.png) · [320px local](local-320-layout.png).

## Policies and hosted staging risks

Normal grace is two minutes; test runtimes shorten it. Casual tables can cancel/refund at grace/idle expiry. Funded matches do not expire with unresolved reservations: after grace they remain paused/reconcilable until participants return or unanimously consent. **An indefinitely absent participant can therefore hold the match and its entries. Administrative adjudication/reconciliation tooling is not implemented.** This is deliberate protection against unilateral losing-match refunds and is a material closed-staging limitation, not a claim of a complete forfeiture system.

Chat stores at most 40 messages for one hour; system events are capped at 50 until room cleanup. Finished/cancelled rooms default to 24-hour retention, then remove private game state, chat, room credentials and request history. Profile/financial ledger history remains persistent. Open funded reservations prevent automatic room deletion.

Schema 3 extends the existing SQLite room snapshot with presence, consent, chat and settlement metadata; it preserves Build 004B championship state. Existing pre-championship single-hand recovery remains supported. No new wallet, competing persistence layer or SQL namespace was introduced. Guest-cookie recovery across lost credentials remains outside this build; losing the original credential cannot be repaired by reusing a display name.

An isolated hosted staging trial still needs explicit approval. Validate Cloudflare deployment/hibernation, real network/proxy failures, cross-object latency/faults, observability redaction, abuse limits and the operational process for held funded matches before a public rollout. Production and staging use distinct Worker names/bindings; a separate staging hostname is required. No hosted reliability or load claim is made.

References inspected: [LUDI repository](https://github.com/64reth/ludi) remains empty; [BGA FAQ](https://en.boardgamearena.com/faq) exposed its app shell rather than a directly readable status implementation. The HUD follows the owner’s requested behavioural pattern without claiming copied BGA internals. Cloudflare’s [hibernatable WebSocket](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) and [alarm](https://developers.cloudflare.com/durable-objects/api/alarms/) guidance informed the existing architecture review.

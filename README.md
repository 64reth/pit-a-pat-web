Live zero-stake staging: https://pit-a-pat-online-staging.garetha81.workers.dev

[Build 005 deployment and verification](docs/deployment/BUILD-005-STAGING.md). Funded online matches remain disabled pending hosted recovery and abandonment review.

# Pit-a-Pat · Build 004D

Quick Play and Custom Table are distinct game types, each with Local and Online routes. Quick Play uses Traditional rules and one fixed 25-chip championship buy-in. Custom Tables choose Traditional/Chains, seats and equal hand antes. Commitments happen at the tabletop before any deal. Hand and championship outcomes appear as overlays over the same mounted table. Activated 2/8/10 cards rise with +2/SKIP/REVERSE markers, target seats and animate card movement; bots use the full approved 16-name roster.

[Completed Build 004D: actual Chrome journeys and visual evidence](docs/verification/build-004d-complete/README.md). [GitHub and isolated staging preparation](docs/deployment/BUILD-004D-STAGING.md).

New local profiles have a disclosed 100-chip practice bankroll; online profiles still start at zero and use their separate server wallet. Existing balances are preserved. No push or deployment has been performed.

## Run

Node 24+ (verified on 24.11.1), then:

```sh
npm install
npm run dev:server # terminal 1: persistent Workers API, port 8787
npm run dev        # terminal 2: Vite, port 5173 or the next available port
```

Or run `npm run preview` for the compiled frontend and Worker together at **http://127.0.0.1:8788**. Preview state lives in `.local-state-preview/`; development uses `.local-state/`. Restart the preview after rebuilding assets.

Choose Play → Quick Play or Custom Table → Local (you and 1–3 bots) or Online (private rooms for 2–4 humans). Share the room code or invitation link. Online players must all ready up before the host starts. Review and explicitly confirm stakes at the table, then Start hand. Quick Play has no further buy-ins between hands; Custom Tables confirm each following hand’s ante.

## Championship and action rules

- Win three hands to become champion. One eligible hand victory earns one marker; Next Hand retains participants, mode and standings. Championship Rematch starts at zero with a new match ID.
- Each hand deals five cards, one at a time beginning with the starting player. Dealer and starting player rotate clockwise between hands. Each fresh hand begins clockwise and resets TAP declarations.
- Traditional: match rank/suit, then optionally discard one unrestricted card or End turn. Chains: select an ordered rank/suit chain; choose where to stop.
- **Only the final card of a completed turn activates:** 2 makes the next player draw two and miss their turn; 8 skips the next player; 10 reverses direction. Earlier cards in chains never activate. Traditional's opening action stays pending until End turn or is replaced by the optional discard. A starting Active Card never activates.
- No stacking: Draw Two is applied immediately by the authority and the affected seat cannot respond. Recycle as needed, preserving the Active Card. Draw only available cards and record any shortage; the skip still applies.
- With two players a final 10 acts as Skip: the opponent is skipped and the same player receives a new turn. With three/four players it reverses direction. The pending opening 10 does not make TAP eligible until the previous turn is finalised.
- Declare TAP on an earlier turn. It persists through skips and becomes eligible on your next actual turn. A legal empty-hand victory ends the hand **before** any action effect. A failed TAP draws one penalty card, then resolves the final action and advances once. If no TAP penalty card exists after recycling, preserve the established no-winner stalemate outcome.
- A stalemate awards no marker or match rewards. Ready up and redeal as the next numbered hand, rotating dealer/starter. Online entries remain committed.

The owner-confirmed two-player rule above supersedes Build 004B’s provisional Reverse interpretation. See [current verification and session policies](docs/verification/build-004c/README.md) and [earlier championship architecture](docs/architecture/build-004b.md).

## Rewards and saves

The existing Profile, XP, coins, chips and cosmetic system is retained. Completion rewards are now paid **once per finished championship**, never per intermediate hand: 20 XP / 12 coins / 5 chips to each participant, plus 25 XP / 8 coins / 5 chips to the champion. Cancellation and stalemate redeals do not mint completion rewards.

Old balances, cosmetics, claim IDs, statistics and hand receipts remain intact. New `matches` and `championships` counters start at zero for older saves. Existing `games`/`wins` retain their historical totals and include new completed championships; result receipts distinguish new championships from earlier hands. Local practice progress remains browser-local; local active championships and their confirmed buy-ins recover from this browser’s saved profile. Server balances cannot be funded by editing local saves.

All twelve Black Orisha-inspired court illustrations, four aces and the original back remain extracted from the owner-supplied sheet. The reference is `docs/design/orisha-deck-reference.png`; crop coordinates and provenance remain in the asset manifest. [Asset notes](docs/design/assets.md). No artwork or original Godot/LUDI files were changed.

## Online authority and virtual entries

The existing Worker, SQLite `GameRoom` and per-account SQLite `Account` Durable Objects remain the transport/economy architecture. The shared TypeScript engine resolves every action, score and champion. Online shuffles and recycles use cryptographic randomness. A client receives only its hand, public active card/events/counts, and public championship standings/results. No deck order, seed or opponents' hands are sent.

Identity uses a random HttpOnly, SameSite=Strict guest cookie, stored hashed on the server. Room codes invite; they do not authenticate a seat. Separate hashed room tickets authenticate WebSockets and stay out of URLs. Reopening a seat replaces its older connection. Reload restores a fresh player-specific snapshot, including the seat, hand, standings, phase, direction and pending action. An authenticated resume endpoint also returns the accepted/rejected/unknown status of pending action IDs. The client reconciles receipts before offering an explicit retry using the same ID; it never predicts card or currency changes. Keep cookies to retain identity; cross-device sign-in and account recovery are not implemented.

Next Hand requires fresh readiness from every connected participant and the host's command. Match ID, hand ID and revision bind moves to the right deal; Next Hand/ready commands also bind to the completed hand ID. Idempotent request receipts prevent duplicated deals, markers or moves. Between-hand readiness does not release or re-reserve entries.

Virtual stakes of **10 / 25 / 50 chips** remain enabled. The initial entry is reserved once against the championship ID. No hand result pays out. Only the third victory creates a durable settlement intent; the champion receives the full pool with no rake, plus normal match rewards. Per-wallet reservations and permanent result ledger IDs make retries safe across partial failures and restarts. Refund tombstones reject late reserve retries. Zero-chip guests can play casual championships. No cash value, purchases or cash-out.

The active player’s disconnection pauses play; between hands, readiness waits for all participants. Seats remain reserved. Reconnect uses exponential backoff with jitter, at most eight failed automatic attempts, online/visibility wakeups and manual Retry. Duplicate tabs replace only the same authenticated seat and stop the displaced tab from reconnecting automatically. A voluntary Leave revokes its room ticket/connection and is not mistaken for a network failure—even if its acknowledgement is lost. A later explicit Join/Return can restore the same seat using the original guest identity and a new ticket.

**Funded cancellation policy:** a started championship requires every participant’s explicit consent before refunding. A player who deliberately leaves consents only for themselves. Neither the host nor a dropped connection can force an immediate losing-match refund. After the configurable two-minute grace, an absent funded table remains paused with entries reserved and a visible reconciliation status. The returning player can resume securely; Reserved tables in the owner’s wallet provides a return link. There is no automatic forfeit, seizure or unilateral timeout refund. If a participant never returns or consents, resolution requires an operator policy/tool that is not implemented; this is a material staging limitation.

Casual abandoned tables can be cancelled by the host and automatically cancel after the grace/idle policy. Lobby hosts transfer deterministically to the lowest connected seat, then the lowest remaining non-left seat; a disconnected host retains the role during grace. Returning hosts do not displace a valid current host. Empty/idle lobbies expire after 30 minutes. Completed/cancelled rooms retain results for at most 24 hours, then purge private hands/deck, chat, ticket hashes and request records. Unfinished funded matches never expire out from under their reservations.

Table chat is plain text, server-attributed, room-scoped, limited to 300 characters and four messages/reactions per ten seconds. Links/media are unsupported. Only the most recent 40 messages are stored, for at most one hour; durable alarms enforce retention. Reactions never invoke game actions. Clients can mute individual players and hide the independently scrollable chat panel; unread counts exclude muted senders. Separate authoritative system events are capped at 50 and removed with the room. No chat is logged into other rooms or account ledgers.

Build 004's in-flight single-hand contracts are not silently converted: the versioned room migration cancels/refunds them. Legacy lobbies clear readiness/acceptance so the new terms must be reviewed; already settled results remain settled. Legacy pending settlement uses the existing idempotent recovery path. No new SQL tables/namespaces are needed; room JSON schema is version 3. Build 004B championships are preserved while presence, chat, cancellation consent and settlement status fields are added. Older single-hand contracts still cancel/refund through the established migration path.

## Verify

With Google Chrome installed:

```sh
npm test                         # 74 state-machine/gameplay/presentation tests
npm run build                    # frontend + server types and packaged assets; no deployment
npm run preview                  # normal compiled application at http://127.0.0.1:8788
# In another terminal:
npm run test:browser              # actual Local journeys at 8788: Quick/Custom, desktop/mobile
npm run test:online               # isolated funded UI journeys; temporary server at 8792
npm run test:rooms                # isolated runtime: receipts, presence, chat, fairness, reconciliation
npm run test:staking              # reservations, new hand consent, pot, restart, settlement
npm run test:sessions             # compiled multi-browser failure/recovery scenarios
npm run test:wallets              # persisted balances, overspend, retries and refunds
node scripts/play-flow-layout-check.mjs # visible tabletop above 320px/390px staking sheets, at 8788
```

[Build 004D Chrome journeys and screenshots](docs/verification/build-004d-flow/README.md) include verification at the owner's required port 8788. The online journey script can use `PITAPAT_SERVER_PORT=8788` after stopping the normal preview; it creates a temporary isolated state and closes its server afterward. Restore the normal preview afterward. The final running preview uses the original preview state.

Earlier build-specific scripts/reports remain historical and may assume obsolete routing. Runtime recovery tests recreate precise crash boundaries with engine-produced legal results. Online UI test accounts receive validated server completion rewards as isolated test funds; no room cards, standings or outcomes are injected during the actual UI journeys. No mint, forced-result or balance-edit endpoint is exposed in the application. Online automation drives separate human sessions using only their private views; it does not add online bots.

## Cloudflare and limitations

`npm run build` creates `dist/`, `.server/worker.js` and validated `.cloudflare/output/v0/`. No deployment occurs. Existing `cloudflare.config.ts` defines `pit-a-pat-online`, `ACCOUNTS` → `Account`, `ROOMS` → `GameRoom` (SQLite exports), `ASSETS`, stake tiers, grace and idle bounds. The installed cf build-output SDK is prerelease and locked. Keep resource/class names stable once provisioned. Future table changes need explicit migrations; today's change versions the stored room JSON and preserves wallet tables.

A future approved deployment needs a Cloudflare account with Workers/Durable Objects enabled and a same-origin HTTPS hostname for API, sockets and assets. Hosted Cloudflare load/failover behaviour is not verified locally. Public launch should follow recoverable accounts, anonymous-session abuse controls and hosted staging/fault-injection tests. No public matchmaking, spectators or paid transactions are implemented.

Nothing has been pushed or deployed. LUDI was inspected as a UX/transport reference; no LUDI server source was available in its public repository and no LUDI resources were modified.


### Isolated staging build (no deployment)

`npm run build:staging` uses `cloudflare.staging.config.ts` to package `pit-a-pat-online-staging`; its Account/GameRoom namespace references target that Worker rather than `pit-a-pat-online`. The two configurations share source/classes, not resources or data. The output names/bindings were inspected locally. A later `npm run build` restores the production-named package. Both commands only build.

`ROOM_RETENTION_MS` now configures terminal cleanup in addition to `RECONNECT_GRACE_MS` and `ROOM_IDLE_MS`. SQLite classes, migration declarations, hibernating WebSockets and the existing ledger remain unchanged; schema 3 is a versioned JSON-record migration and needs no extra namespace. Keep distinct staging/production hostnames and account/binding assignments for an approved hosted trial. Do not roll back live schema-3 funded rooms to the older cancellation policy without a compatible migration.

Before approval to deploy: validate real Cloudflare hibernation/deployment recovery, fault/latency behaviour across wallet objects, proxy WebSocket handling, observability redaction, abuse limits and explicit reconciliation operations for indefinitely absent funded participants. No remote provisioning, push or deployment has been performed.

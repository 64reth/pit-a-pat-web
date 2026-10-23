> Historical staking-only report. The missing routes and separate results screen have since been corrected. See [Build 004D flow verification](../build-004d-flow/README.md).

# Build 004D staking amendment

Implemented against the supplied workspace, which identifies itself as Build 004C. The referenced 004D hand-win modal/continuous-table implementation and maximum-exposure system were not present. Existing hand result screens, action feedback, Traditional/Chains rules and bot gameplay remain intact.

## Quick Play

Local play is now labelled Quick Play. `QUICK_PLAY_ENTRY` in `src/progression/staking.ts` configures the 25-chip entry. The table opens undealt, showing every participant's buy-in and the proposed full pot. The human must explicitly confirm the buy-in, or select the labelled zero-stake alternative. Bots commit automatically from separate persisted simulated balances (initially 1,000 chips each); they never use a server account or the human's wallet. Coins never fund stakes.

A single profile storage record contains the wallet, buy-in contract, commitments and championship state. Confirmation persists the deduction and created championship together before displaying dealt cards. Repeated confirmations of a committed contract do nothing. Reload and the Play screen's Resume local championship restore pending or committed play. One entry spans every hand; no further staking prompt appears before championship completion. The local championship authority settles the full simulated pot once, alongside the existing completion reward. Explicit cancellation refunds local entries once; a completed championship settles rather than refunding. Rematch opens a new undealt contract requiring fresh confirmation.

Local saves are editable simulations, not competitive authority, and are never imported to online wallets. Cross-device local recovery is not provided. Existing local saves are migrated by optional fields without changing their balances.

## Custom Table

The online host's Staking format selector adds Custom Table / Ante before each hand, alongside the existing single-entry championship format. Host-selected equal antes use the existing allowed chip tiers. Every participant explicitly accepts the first ante and maximum reservation before any deal. Reservation failure refunds partial reservations with no dealt hand.

Maximum exposure per participant is `ante × (2 × playerCount + 1)`: at most 5, 7 or 9 decisive hands can occur before someone wins three. Each following hand requires fresh consent from every human. A stalemate carries the existing ante into its redeal, disclosed in the interface, so repeated stalemates cannot exceed the agreed reservation. The pot accumulates on each accepted decisive-hand entry; reserved chips are moved into the pot, not deducted from the available wallet again. This stalemate policy is an explicit implementation choice because no 004D specification/code was available.

The Durable Object persists hand commitments and command receipts atomically before acknowledging or broadcasting a new deal. Server wallet reservations and terminal ledger IDs remain idempotent. On completion, each wallet receives its unused exposure, and the champion receives the full accumulated pot, plus existing match rewards. Settlement retries cannot pay twice. No hand-win payouts occur.

Rematch resets all commitments and requires a new reservation. Zero-stake selection is available before reservation and clears everyone's readiness; each participant must ready up under the changed terms. Funded cancellation remains unanimous; disconnect/reconnect preserves reservations, pot, hand and receipts. An indefinitely absent funded participant still requires return/unanimous cancellation or operator reconciliation; automatic forfeiture is not introduced.

## Verification

- Production build and TypeScript checks pass; no push/deploy.
- 63 unit tests pass, including real engine simulation through a funded championship, duplicate confirmation/settlement/refund, separate bot balances, insufficient funds and zero stakes.
- `node scripts/staking-room-check.mjs`: actual SQLite/Workers runtime covers all-human consent, bounded exposure, duplicate start/next-hand, pot accumulation, runtime restart, full-pot payout, unused exposure refund, terminal deduplication, rematch and zero stakes. Engine-produced fixtures establish hand completion and final settlement; these are not claimed as end-to-end online gameplay simulations.
- `node scripts/staking-browser-check.mjs`: real Chrome desktop and mobile Custom Table consent/next ante/reload, 320px zero-stake fallback, and 390px Quick Play pre/post-commit recovery. No page errors or horizontal overflow. Custom hand completion uses a valid engine-produced fixture.
- `PITAPAT_EVIDENCE_DIR=docs/verification/build-004d npm run test:browser`: actual UI-driven full championships, Traditional four-player funded desktop (6 hands) and Chains three-player zero-stake mobile (5 hands). No repeated entry between hands. Action feedback observed; fresh rematch confirmation verified.
- Existing SQLite room/reconnect/reconciliation regression suite passes (`npm run test:rooms`).
- Existing wallet regression suite passes (`npm run test:wallets`), including concurrent overspend, restart, duplicate refunds and delayed reservation rejection.
- Existing real Chrome session regression suite passes (`npm run test:sessions`): lost acknowledgements, explicit uncertain retries, offline/online, closed-browser return, duplicate tabs, actual server restart, invalid sessions, voluntary leave, reserved-table return and unanimous refund.

Screenshots: `traditional-buy-in.png`, `traditional-active.png`, `traditional-hand-result.png`, `traditional-champion.png`, `chains-buy-in.png`, `chains-active.png`, `quick-mobile-buy-in.png`, `quick-mobile-restored.png`, `quick-320-zero-stake.png`, `custom-active-pot.png`, `custom-mobile-commitment.png`, `custom-mobile-next-ante.png`, `custom-mobile-active.png`.

No purchases, withdrawals, redeemable prizes, deployments or new external accounts/resources were added.

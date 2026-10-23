> Flow-correction report. See [the completed 004D presentation, current browser evidence and staging preparation](../build-004d-complete/README.md).

# Build 004D — corrected play flow

The compiled application was exercised in real Chrome at **http://127.0.0.1:8788**, from fresh browser contexts. This report supersedes the earlier staking-only completion report.

## What was missing and why

1. **Game type was not a route or contract.** The play screen offered Local/Online; its Local tile had merely been renamed Quick Play. Both Traditional and Chains still led through the old shared setup. There was no local Custom Table path, and online hosting exposed a staking-format selector instead of the requested game types.
2. **Consent and dealing were coupled.** The prior local `commitQuickPlay()` both deducted chips and called `createChampionship()`. The prompt existed behind the old setup, but there was no distinct visible all-committed / Start hand stage. Fresh local profiles also had zero chips, so the funded path could not be followed without previously earned chips or a test-only save edit.
3. **The UI ignored the championship's between-hands state.** The engine already distinguished `between-hands` and `finished`, but `App.tsx` called `setScreen('results')` whenever `game.phase === 'finished'`. This unmounted the table after every hand. Online hand/final results were ordinary document sections, rather than in-table overlays.
4. **Restored online tables did not retain the selected game type.** Returning from a restored Custom Table could reset the hosting form to Quick Play. The selected type now persists and follows the authoritative room type.

## Corrected journey

`Play → Quick Play or Custom Table → Local or Online → tabletop commitments → Start hand → hand overlay → Continue → next hand/ante → championship overlay`

- **Quick Play:** fixed 25 chips per player, Traditional rules, first to three, one championship buy-in. Local opponents are simulated bots; online is the existing operational private-room service for 2–4 humans. There is no claimed public matchmaking service.
- **Custom Table:** choose Traditional/Chains, 2–4 seats and agreed equal hand antes. Both Local and Online support reservation, accumulating pot and explicit consent for each following hand. A stalemate carries its current ante into the redeal, preserving bounded maximum exposure.
- **Local commitment phases:** `awaiting-buy-in → ready-to-deal → committed`. Confirmation reserves funds and records each simulated bot's commitment atomically in the same saved profile; it creates no cards. A separate Start hand creates the deal. Double clicks and reloads reuse the persisted contract. Web Locks serialize local wallet confirmations across tabs where available.
- **Custom between-hand phases:** the hand overlay's Continue enters `awaiting-ante` while retaining the completed table. Confirm ante moves to `ready-to-deal`; Start hand deals the next hand. Maximum exposure is `ante × (2 × seatCount + 1)`, with unused exposure returned after the championship. A no-winner redeal retains its prior ante.
- **Quick between-hand phases:** Continue goes directly to the next local hand, with no staking prompt. Online players Continue to acknowledge readiness; the connected host starts the next hand once everyone is ready. No new reservation is made.
- **Outcomes:** the table stays mounted behind a compact hand-winner/standings/Continue overlay. Only the final championship overlay offers Rematch and Leave Table. Online final results wait for authoritative settlement confirmation. A rematch opens fresh commitments.
- **Mobile:** compact scrollable staking sheets sit over the visible table at 320px/390px. Desktop commitments occupy the economy sidebar. Card actions are disabled while stakes are pending.
- **Wallet separation:** new local-only profiles receive a disclosed 100-chip simulated practice bankroll. Existing local balances are preserved. Server `freshProfile()` still starts at zero; local profile/bot wallets cannot fund online accounts. Coins remain cosmetic currency. No purchases, withdrawals or redeemable prizes.

## Actual browser verification

Local journeys (`local-journeys.json`) used the public UI throughout. No cards, seeds, standings, wins, balances or outcomes were injected. The driver enabled the public Fast bots / Reduced motion settings, then chose legal actions using only the human player's projection and clicked the visible cards/buttons.

- Quick Play, four-player Traditional, desktop 1440px: confirmed 25 chips, saw all bot commitments before Start hand, restored the pre-deal contract after reload without another deduction, played a complete championship, **won a human hand**, saw the modal and continued on the identical table element. Final result and fresh rematch gate verified.
- Same Quick Play journey on mobile 390px, including genuine human hand victories and full championship completion.
- Custom Traditional, two players, desktop: configuration, exposure consent, hand overlay, Continue to new ante, accumulating pot, full championship, unused exposure refund and fresh rematch.
- Custom Chains, three players, mobile: same complete journey with ordered multi-card plays.
- Final `play-flow-layout-check.mjs` checks assert that the entire undealt online card back is visible above the sheet at **320×740** and **390×844**, for Quick Play and Custom Table.
- Final 320px/390px/1440px smoke checks separately confirmed buy-in, visible all-committed state, no cards before Start, and a working deal. No horizontal overflow.
- Fresh online zero-chip session at 8788: the mandatory 25-chip table was reachable, funded readiness stayed disabled, and explicit zero-stake selection reset terms with **zero wallet deduction/reservation**.

Online journeys (`online-journeys.json`) used actual private rooms and server-authoritative accounts, with separate desktop/mobile Chrome contexts. Test accounts were funded in an isolated temporary server state by validated championship completion RPC fixtures. **No room hand, deck, score, result or transition was injected**: every room action, hand Continue, ante confirmation, Start hand and rematch used visible UI controls.

- Funded Quick Play Traditional: complete first-to-three championship; single 25-chip reservation each, full winner pot, no repeated entry between hands, reload restored the same private hand and reservation.
- Funded Custom Traditional, two humans: fresh next-ante consent, accumulating pot, complete championship and exact unused-exposure refund.
- Funded Custom Chains, four humans: same, with mobile sheets and full championship/settlement. No private deck or opponent hand was exposed to a client.
- Each journey verifies the same mounted card table under the hand overlays, final in-table outcome, exact authoritative balances and fresh rematch consent.

## Reliability checks

- `npm run build`: production TypeScript/frontend/Worker bundle passes, no deployment.
- `npm test`: **67 tests** pass. Tests exercise separate commitment/deal phases, duplicate Start/confirm/refund/settlement, insufficient funds, explicit zero stakes and complete real-engine Quick/Custom championships in both rulesets.
- `npm run test:staking`: SQLite/Workers integration checks for all-human consent, bounded maximum exposure, duplicate start/next-hand receipts, pot accumulation, runtime restart, full-pot settlement, unused exposure refund, rematch and zero stakes.
- `npm run test:rooms`: authentication/private-seat ownership, chat identity/rate/deduplication, lost ACK recovery, durable hand/deck/TAP/standings/reservations, host transfer, unanimous funded cancellation, stale Next Hand rejection, funded grace expiry, settlement fault/restart recovery and invitation/retention cleanup pass.
- `npm run test:sessions`: real Chrome reload on own/opponent turn, lost ACK, explicit uncertain retry, offline/online, closed browser return, duplicate tabs, actual server restart, invalid session recovery, chat, voluntary host departure and funded leave/return/unanimous refund all pass.
- `npm run test:wallets`: persisted SQLite balances, concurrent overspend rejection, duplicate refunds, late reserve tombstones, full winner pool and cosmetics checks pass.

The prior funded cancellation policy is preserved: an indefinitely absent participant's entries stay reserved, and unilateral timeout refunds/forfeits are not introduced. Cross-device local save recovery and public online matchmaking are not implemented or advertised.

## Evidence

- [Game type choices](quick-traditional-1440-choose-game.png)
- [Desktop buy-in](final-quick-buy-in-1440.png) / [all players committed](final-quick-committed-1440.png)
- [Mobile buy-in sheet](final-quick-buy-in-390.png) / [320px sheet](final-quick-buy-in-320.png)
- [Human hand victory over the same table](quick-traditional-1440-human-hand-win.png)
- [Mobile hand overlay](quick-traditional-390-human-hand-win.png)
- [Final championship at the table](quick-traditional-1440-championship.png)
- [Custom setup](custom-traditional-1440-setup.png) / [next ante](custom-chains-390-next-ante.png)
- [Online Quick Play buy-in](online-quick-traditional-2-buy-in.png)
- [Online Custom mobile hand overlay](online-custom-chains-4-mobile-hand-overlay.png)
- [Final online Custom Table sheet](final-online-custom-buy-in-390.png) / [320px Quick Play sheet](final-online-quick-buy-in-320.png)
- [Fresh online insufficient-funds sheet](final-online-insufficient-mobile.png)

Nothing has been pushed or deployed. The normal local preview is restored at 8788 after verification.

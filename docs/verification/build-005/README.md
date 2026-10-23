# Build 005 — hosted Chrome verification

Live URL: https://pit-a-pat-online-staging.garetha81.workers.dev

Deployed code `91d1e3a`, final source build `d7cd9b90fbde`. Staging is publicly shareable **for zero-stake testing only**.

## Screenshots

- [Home](home.png), [Collection / artwork](collection.png).
- [Online buy-in drawer](quick-buy-in.png), [restored partial commitment](quick-staking-reconnected.png).
- [Quick mobile landscape](quick-mobile-landscape.png), [Chains mobile landscape](custom-mobile-landscape.png).
- [Ordinary hand overlay](quick-hand-overlay.png), [championship result](quick-championship.png).
- Online [Draw Two](quick-effect-draw-two.png), [Skip](quick-effect-skip.png), [Reverse](quick-effect-reverse.png).
- Normal-motion Local [Draw Two](local-quick/action-draw-two-1440.png), [Skip](local-quick/action-skip-1440.png), [Reverse](local-quick/action-reverse-1440.png).
- Full hand layouts: [667×375](hosted-hand-667x375.png), [740×360](hosted-hand-740x360.png), [844×390](hosted-hand-844x390.png), [932×430](hosted-hand-932x430.png), [320×740](hosted-hand-320x740.png), [390×844](hosted-hand-390x844.png).
- [Hosted Local Custom ante](local-chains/custom-chains-390-next-ante.png), [human hand victory](local-chains/custom-chains-390-human-hand-win.png), [final result](local-chains/custom-chains-390-championship.png).

## What was actually tested

[Hosted multiplayer results](hosted-results.json): separate Chrome contexts, separate secure guest identities, real invitation links, actual private player views and legal actions through UI. No hosted room, hand, win, balance or deck was injected. Quick Traditional completed four hands; Custom Chains completed three. Confirmations, in-table continuation, private-hand reload, genuine offline/new-socket recovery, action markers/target seats, exact +5/+10 rewards and zero outstanding reservations passed without browser/server errors.

[Six mobile layout checks](hosted-layouts.json): real hosted artwork and live Local hand, actual keyboard selection of each card, all cards represented within the viewport and no page overflow. Screenshots were visually inspected.

`local-quick/` records a full hosted Local Quick championship with normal-motion captures of all three effects. This run used the first deployed package before the desktop online scroll correction; local gameplay/artwork/reveals were unchanged by that correction. `local-chains/` uses the final deployed package, completing five hands with four ordinary overlays and one human hand win.

Hosted review caught a large desktop online hand extending under the economy sidebar. Revision 91d1e3a constrains the hand to its own scroll surface; the complete multiplayer journeys then passed.

Public funded matches are server-disabled. These checks verify casual reward settlement, **not nonzero-stake payouts or refunds**. Hosted funded recovery and abandoned-match/operator resolution remain outstanding; the gate stays off. No production wallets or real-money functions were used.

[Full deployment/resource/authentication report](../../deployment/BUILD-005-STAGING.md).

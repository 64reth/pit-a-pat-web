# Build 004E — staking drawer and visible mobile hands

Preview: http://127.0.0.1:8788. Final package: **004E / 72c91f50af29** (home footer and `/build-info.json`). No push or deployment.

## Corrections

The previous staking panel inherited the permanent sidebar's narrow width and small labels. It now opens as a 380–420px desktop overlay drawer, with large buy-in/pot metrics, available chips, readable commitments, a prominent stake action and a zero-stake alternative. The 250px permanent sidebar stays compact during play. Opening/retracting overlays do not resize the underlying table. Undealt opponents are distributed around a larger central card back.

Drawer visibility follows the actual saved/local or authoritative/online phase. Quick Play opens once; Custom reopens for each required ante after Continue. An online player's confirmation remains visible while peers are unconfirmed. The final commitment still deals automatically. The 280ms presentation transition never authorizes play or wallet changes. Closing displays confirmed status, disables stale controls and restores focus to the hand. Reduced motion disables movement. Reconnect restores the correct drawer. A failed online reservation keeps a recovery drawer visible through refund confirmation, with a fresh buy-in/zero-stake route after settlement.

The previous short-screen CSS put the hand in a narrow side column, forced a 750px table minimum height, and allowed overlapping cards' hover layers to intercept touches. Landscape now reserves a bottom hand strip and a separate adjacent action area. Every actual card stays rendered with Orisha art; large hands browse continuously at readable card sizes. Selection lifts a card. The hand remains inspectable on an opponent's turn; engine-authorized play controls remain disabled. Chains adds Clear selection. Portrait has a complete playable fallback and a dismissible Rotate to play prompt. Rotation does not recreate game state. Online secondary economy/standings move to a compact Table menu, with chat independently accessible.

No changes to rules, first-to-three state machine, server rooms, chip ledger, reservations, refunds, settlement calculations, bot strategy or deck art.

## Chrome review and evidence

Actual Chrome, touch-enabled emulation, normal UI routes and gameplay. No local deck, hand, win or penalty was injected.

- [Desktop drawer open](desktop-drawer-open.png), [retracting](drawer-retracting.png), [closed / active championship](desktop-active.png).
- [320px staking sheet](portrait-staking-320.png), [390px staking sheet](portrait-staking-390.png). Stake action remains visible without scrolling; commitments and terms remain scrollable in the sheet.
- Active landscape: [667×375](active-667x375.png), [740×360](active-740x360.png), [844×390](active-844x390.png), [932×430](active-932x430.png).
- Portrait fallback: [320×740](active-320x740.png), [390×844](active-390x844.png). The same selected card survives all six viewport changes.
- **10-card actual hand after repeated Draw Two penalties:** [667×375](large-hand-667x375.png), [740×360](large-hand-740x360.png), [844×390](large-hand-844x390.png), [932×430](large-hand-932x430.png). Every card selected at each size, with horizontal browsing where needed. Same hand and ordering through all rotations. No horizontal/page-level scrolling. See [measured results](landscape-verification.json). The run observed six human-targeted Draw Two activations across its practice play before capturing the large hand.
- Actual landscape effects: [Draw Two](landscape-draw-two.png), [Skip](landscape-skip.png), [Reverse](landscape-reverse.png). Browser bounds checks kept the reveal above the hand.
- `championships/`: complete Quick desktop/mobile, Custom Traditional desktop, Custom Chains mobile. Ordinary/final results retain the same table element; Custom reopens staking; all finish settlement and offer a fresh rematch commitment.
- `final-smoke/`: exact final package 72c91f50af29 completed an eight-hand desktop Quick Play championship, seven ordinary hand overlays, a human victory, unchanged tabletop, final settlement and fresh rematch buy-in.
- `final-local/`: final geometry, full five-hand mobile Chains championship, four ordinary overlays, a human hand victory and unchanged table identity.
- `online-final/`: full funded Quick, Custom Traditional and four-player Chains UI championships; all include reload during partially confirmed staking, no early reserve/deal, preserved confirmation, private-hand reload recovery, exact pot/refund/settlement checks and reduced-motion effects.
- `final-online/`: eight-hand four-player Chains championship; every online card selected at 667×375, 740×360, 844×390, 932×430, 320×740 and 390×844. No page scrolling or offscreen hand strip. Seats, table menu and chat inspected in screenshots.
- `final-quick-online/`: five-hand Quick championship and the same six-size selection/reconnect review after the portrait header refinement.
- [Failed-stake recovery](stake-recovery/online-quick-traditional-2-failed-stake-recovery.png): competing reservations in isolated test wallets exhausted the consenting host's funds before the last peer confirmed. Server rejected the reservation, dealt nothing, refunded the room's reservations, retained the drawer, and allowed a fresh zero-stake review. [Results](stake-recovery/online-journeys-quick-traditional-2.json).

Online test accounts earn fixture rewards through the real Account RPC. The failure test makes separate real reservations in those isolated test accounts; it does not inject room state or touch production balances. Online checks use the same packaged app/server at isolated local port 8792.

## Checks and limits

75 unit tests pass. TypeScript/client/server production build passes. Release file scan and diff whitespace checks pass. Browser journeys verify retained tables, custom antes, rematches, effects, authoritative commitments, reconnect and exact settlement.

Evidence was collected incrementally during visual refinement; final open/closed and viewport screenshots are recaptured from the final package. Large-hand tests preceded the final online-only header/recovery refinements; their hand geometry is unchanged.

Physical iPhone/Android hardware and hosted Cloudflare staging were not tested. Browser toolbar/safe-area behavior uses CSS dynamic viewport units and safe-area insets; physical-device validation remains advisable. Existing Build 004D staging artifacts were not deployed. No GitHub push, wallet migration or Cloudflare upload was performed.

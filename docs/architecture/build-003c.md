# Build 003C — immersive tabletop and advance TAP

## Rules

Each player now owns a nullable `tapDeclaredTurn`. A TAP action records the current monotonically increasing `GameState.turns`; revisions and player indices are never used as turn identifiers. A hand is identified by its unique game ID, with turns beginning at 1 and increasing at every rotation, including draws and penalties. Fresh hands and rematches initialise every declaration to null.

A player may declare during either phase of their turn. The declaration remains for the entire hand, but only a strictly earlier declaration turn is eligible to win. One shared predicate drives the engine and projected eligibility. Every action that empties a hand reaches the same authoritative check: Traditional opener, optional unrestricted discard and complete Chains stack. Without eligible advance TAP, a one-card penalty is drawn and the turn ends; play continues. End/draw actions cannot grant victory. A repeat declaration cannot rewrite its original timestamp. Declarations belong to individual players and cannot be borrowed.

Events record the turn of each declaration, play, penalty, rotation and outcome. The full hand event history is retained in session memory and available in Table talk. Bots use the same engine. They declare ahead, avoid an ineligible final optional discard and shorten a finishing chain when they must hold a card for a later turn. A forced last-card opening still receives the same engine penalty as a human's play.

The state and player declarations round-trip through JSON without losing eligibility. This pass does not introduce active-hand persistence: hands remain session-only, as disclosed in settings. Existing saved profile/rewards/purchases retain their schema and behavior. Pre-003C legacy `tapped` flags do not establish a declaration timestamp or authorise a win.

## Table and input

Active play is a green felt viewport, using dynamic viewport height, safe-area padding and compact overlay navigation. The editorial website header, bordered table widget and detached footer are absent during a match. Opponents sit at the far and lateral positions on desktop, with compact far-edge summaries in portrait. Central piles and turn feedback stay close to a larger near-edge hand. TAP, End turn and Play/Draw actions sit in the same hand area.

Portrait has its own scale, spacing and reachable action row. Short landscape viewports use separate pile and hand columns. Hands larger than eight cards become an internal horizontal strip; full card faces can be scrolled into view and selected with mouse/touch, with keyboard scrolling available on the focused strip. Page scrolling is unnecessary for the checked sizes. Existing Orisha artwork, deck composition and cosmetic back pattern are unchanged.

Instructions and hints explicitly require an earlier turn. Pending and eligible TAP badges remain visible through opponents' turns; opponents' declarations are public as well. An ineligible finishing selection warns about the penalty while allowing the established penalty rule to execute. Engine-generated penalty notifications remain visible as play continues.

## Verification

- Production TypeScript/Vite build and 29 tests pass, including the 240 seeded game matrix across both modes and 2–4 seats. Every simulated winner has an earlier declaration timestamp and the deck remains conserved.
- Focused cases cover missing, same-turn and advance TAP across opening, discard and chain finishes; persistence across rotations and JSON serialization; repeat/stale/out-of-turn rejection; fresh rematches; bot declaration and holding behavior; and rewards.
- Chrome plays actual UI matches in desktop Traditional and portrait Chains, then checks results, rematches, rewards, purchases, equipping, reload persistence and narrow layout. No page JavaScript errors observed.
- `advance-tap-check.mjs` searches normal deterministic deals, then executes the same actions through visible cards and buttons. Both modes demonstrate a same-turn penalty, a missing-declaration penalty, continued play, an eligible later win, one reward grant and cleared declarations on rematch. No game state is substituted.
- Repeatable Traditional same-turn deal: seed 34, declaration turn 33, eligible win turn 37. Traditional missing-TAP deal: seed 46, later declaration turn 13, win turn 25. Chains seed 2: same-turn declaration turn 5 or post-penalty declaration turn 9, with eligible win turn 17.
- `table-check.mjs` verifies viewport fill, no page overflow, visible piles and cards, status/hand separation, and accessible action bounds at 1920×1080, 1440×900, 1366×768, 1024×768, 768×1024, 390×844, 320×740, 390×667 and 844×390. Chrome screenshots were visually reviewed; initial short-landscape clipping was corrected with a separate composition.
- `large-hand-check.mjs` plays seed 1496 into a natural nine-card hand. Scrolling and selecting the last card pass at 1440×900, 390×844, 320×740 and 844×390; cards and actions remain in the viewport.

Review images and JSON reports are in `docs/verification/build-003c/`. Browser checks use isolated contexts and do not modify the owner's normal browser profile. Physical iOS/Android safe-area behavior has not been device-tested. No push, deployment or networking was introduced.

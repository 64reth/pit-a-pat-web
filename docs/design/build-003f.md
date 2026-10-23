# Build 003F — screen flow, hero framing and shell continuity

This is a focused refinement of Build 003E. The LUDI-verified DM Sans / Barlow Condensed typography, controls, deck and current application structure remain.

## Hero framing

The showcase sizes the entire fan from its panel width, including rotated outer corners. Cards have a bounded maximum scale; the panel and caption now use natural content height instead of a fixed aspect ratio. Side cards retain their complete outer edges on desktop, tablet and mobile. The browser check measures all three transformed card rectangles against the panel and caption, rather than checking only unrotated image boxes. A crowded tablet caption discovered in review was corrected before final checks.

## Play sequence

Home's Play action and the main Play navigation lead to the new play-selection screen. Local Play and Online Play are peer, clickable choices.

- Local Play opens the existing player-count, Traditional/Chains and bot setup, then starts a normal local match.
- Online Play opens an explicit “Coming next” availability screen. It states that online games, matchmaking and rooms are not connected, and offers Local Play or Back to play. There are no fake room codes, matchmaking requests, join controls or simulated online players.
- Setup returns to play selection. A new game requested from the active table retains abandonment confirmation, then returns to play selection. A result rematch starts another local hand with the same mode and seats, as before.
- The empty profile's Play action uses the same selection flow. Settings accurately disclose online availability.

## One blue/ivory environment

Navigation, the in-game top bar, desktop economy panel, mobile player sheet, opponent summaries, feedback panels and surrounding playing area now use the existing blue/ivory shell. Ivory cards and the established accent/button treatments carry across menus and games.

Green is a restrained, soft central play-surface accent behind the draw and Active Card piles, rather than a full-screen palette replacement. The viewport composition, prominent hand, adjacent actions and responsive landscape arrangement remain. No bordered webpage-style game widget was reintroduced.

A very low-contrast cross-woven geometric texture is shared by menu surfaces and the game shell. It is CSS background detail, with no new historical or religious meaning claimed. Opaque card faces and functional panels retain clear contrast; no noise is applied over the card artwork. There are no props, ceremonial illustrations or ornate rings.

The scoped `src/refinements.css` supplies these presentation changes over the existing token system. Game rules, saved-profile schema, economy calculations and card assets were not changed.

## Browser review and checks

- Production TypeScript/Vite build and all 29 tests pass, including 240 seeded full games and advance-TAP regressions.
- Chrome reviewed home, Local/Online selection, online availability, local setup, Traditional, Chains, collection, court gallery, profile, settings, rules, results, rematches and the mobile economy sheet.
- Hero framing and active-table checks pass at 1920×1080, 1440×900, 1366×768, 1024×768, 768×1024, 390×844, 320×740, 390×667 and 844×390. Full transformed card bounds fit within the hero panel with caption clearance. No page overflow, opponent/pile collision or card/action collision was detected; action targets remain at least 44px.
- Actual UI Traditional and touch-enabled Chains matches complete through the new selection flow. Rewards, rematches, purchases, equipping and reload persistence pass, with no page JavaScript errors.
- Repeatable browser matches verify same-turn and missing-TAP penalties, continued play, valid advance-TAP wins, declaration resets and real reward values in both modes.
- A natural nine-card hand remains scrollable and selectable on desktop, portrait and short landscape.

Review artifacts are in `docs/verification/build-003f/`. The shared `scripts/browser-helpers.mjs` follows the public Home → Play → Local sequence so browser checks do not bypass the new entry screen. `table-check.mjs` records hero bounds and game geometry. `interface-check.mjs` exercises Online → Back → Local as well as the existing screen sequence.

Key screenshots: `1440-home.png`, `1440-play-selection.png`, `1440-online.png`, `1440-traditional.png`, `390-home.png`, `390-play-selection.png`, `390-online.png`, `390-traditional.png`, and `390-economy-sheet.png`. Before/after comparisons remain available against the corresponding Build 003E images.

Online networking is pending; it has not been implemented in this refinement. Physical mobile devices remain untested; Chrome portrait/touch and landscape were checked. Nothing was pushed or deployed.

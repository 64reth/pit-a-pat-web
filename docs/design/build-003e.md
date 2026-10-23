# Build 003E — LUDI-led interface redesign

## Direction and reference audit

The final LUDI-led brief takes precedence over the earlier Ancestral Table treatment: the Pit-a-Pat mockup supplies the desktop spatial arrangement; LUDI supplies typography, controls and functional hierarchy. No ceremonial scenery, pseudo-sacred motifs, new historical claims, ornate gold rings or furniture were introduced.

The public `64reth/ludi` repository page reported an empty repository. The actual production HTML, CSS and JavaScript at `https://ludi.allencreativetechnologies.uk/` were inspected read-only instead. The deployed CSS's font import explicitly identifies **DM Sans (400, 500, 600, 700)** and **Barlow Condensed (600, 700, 800, 900)**. Asset URLs, byte counts and SHA-256 hashes are recorded in `ludi-reference-audit.json`; the downloaded bundles remain temporary research files outside this project. LUDI was not modified.

Pit-a-Pat locally bundles the same families: DM Sans Variable for interface text and Barlow Condensed 700/800/900 for headings and branding. Fraunces is no longer imported or rendered. The Barlow SIL Open Font License is retained at `public/licenses/Barlow-Condensed-OFL.txt`; the existing DM Sans licence remains in place. Card-face rank typography is part of the preserved deck and is unchanged.

Adapted LUDI patterns include 6px button corners, 44px minimum control targets, 160ms feedback, solid yellow primary actions with short pressed shadows, ivory secondary actions, compact navigation, simple high-contrast status panels, Lucide icons and scrollable sheets with a persistent heading. The 650px portrait and 1000px compact breakpoints align with LUDI's actual CSS; additional height-specific composition rules fit card play rather than copying its board coordinates. No War Bank mechanics, dice rules or settlement logic were copied.

## Typography and colour

- Main navigation: 15–16px. General body copy: 16px; primary home description: 18px desktop.
- Main controls: 16–18px desktop, 14–16px in compact play layouts, at least 44px high.
- Opponent names: 16–17px desktop, 15–16px portrait; card counts: 13–14px.
- Table feedback: 14–15px desktop and 12–14px compact; section headings: 24–30px. Major screen headings: 42–68px, with a larger home wordmark following LUDI's menu hierarchy.
- Functional labels use ordinary spacing and contrast. Old slogans were removed from screens, metadata and cosmetic descriptions.

`styles.css` defines reusable colour, typography, border, radius, elevation and motion tokens plus the indigo/ivory screen environment. `table.css` owns emerald gameplay and responsive input composition. `cards.css` isolates the original ivory stock, Orisha images, SVG number faces and back colourways from interface styling. Decorative felt grain and large watermark ornaments were removed.

## Screens and real state

Home provides direct local play and rules actions with the existing court artwork. Setup presents readable mode choices and a player stepper on an ivory panel. Profile shows actual level, XP, currency and result history. Collection retains real cosmetic prices, ownership and equip actions, plus an expandable gallery of the twelve original named courts. Results show the actual winner and saved rewards with rematch actions. Rules and settings use the same readable controls and panel language.

The desktop match has an integrated top bar, left player/economy/control panel, upper opponents, central piles, a large near-edge fan, and TAP/Play beside the hand. Compact laptops may reorganise actions immediately below the hand to preserve useful card space. Opponents have a reserved layout row and TAP badge space so their declarations cannot intrude into the piles.

The reusable player panel reads the actual profile: name/initial, level, XP, coins, chips, hands played/won, owned card backs and latest completed-hand receipt. No sample balances, streaks, bonuses, fake purchase buttons or unearned rewards are shown. New game and Leave table use the existing abandonment confirmation; rules and settings work. Audio is disclosed as unavailable inside settings, without a pretend sound toggle.

At widths up to 1000px and in short landscape windows, the desktop sidebar is replaced by a compact level/coin summary that opens Player & table. Its body scrolls independently; controls remain touch-friendly and the header/close control stays available. Portrait has separate scales and a near-edge action row. Short portrait reduces nonessential repeated feedback and avatars, preserving names, counts, TAP statuses, active cards and 44px actions. Short landscape puts piles and hand in separate columns. Larger hands use a scrollable strip with full card selection.

## Preservation

All 52 card identities, twelve original court illustrations, four aces, derived numbered faces, back artwork and cosmetic ownership remain. No illustrations were generated or replaced. Traditional, Chains, 2–4 seats, bots, advance-TAP timestamps, penalties, individual draws, recycling and rematches remain unchanged. Only presentational wording was shortened in game/economy modules; progression calculations and the saved-profile schema were not changed. No networking or new economy settlement was introduced.

## Browser review and validation

- Production TypeScript/Vite build passes; 29 tests pass, including 240 seeded complete games and focused advance-TAP checks.
- Chrome reviewed home, setup, Traditional, Chains, collection, court gallery, profile, rules, settings, the desktop sidebar and mobile economy sheet at 1440×900, 390×844 and 320×740. New-game confirmation and sheet-to-settings/rules navigation work. No page JavaScript errors were observed.
- Table layout checks pass at 1920×1080, 1440×900, 1366×768, 1024×768, 768×1024, 390×844, 320×740, 390×667 and 844×390. Checks include no page overflow, visible piles/cards, opponent/pile separation, individual control bounds and at least 44px control heights.
- Full UI playthroughs complete desktop Traditional and touch-enabled portrait Chains, then exercise results, rematches, forfeit, reward persistence, cosmetic purchase/equip and reload. Focused seeded playthroughs demonstrate same-turn/missing-TAP penalties followed by valid advance-TAP wins in both modes and check opponent/pile separation throughout play.
- A natural nine-card hand (seed 1496) was played through the UI. Scrolling and last-card selection pass on desktop, portrait and short landscape. All 52 card faces and 36 correct numeric pip counts also pass browser inspection.
- Live earned balances and XP are checked in the desktop panel and mobile sheet after a completed win/rematch, rather than relying on mock values.

Screenshots and JSON reports are in `docs/verification/build-003e/`. Before/after tabletop comparison: `build-003c/1440x900-table.png` versus `build-003e/1440x900-table.png`; portrait equivalents are `build-003c/390x844-table.png` and `build-003e/390x844-table.png`. Non-game comparison: `build-003e/before-desktop-home.png` versus `build-003e/1440-home.png`, with portrait equivalents also retained. Screenshots were visually inspected, and observed opponent/pile collisions were fixed before final checks.

No known issues remain in the checked Chrome layouts. Physical iOS/Android safe-area behavior has not been device-tested. Active hands remain session-only. No push or deployment was performed.

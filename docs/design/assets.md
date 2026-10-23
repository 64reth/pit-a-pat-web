> Build 003B supersedes the ace, number-card and back rendering notes below. See [the full-deck update](build-003b.md).

# Build 003A: original Orisha artwork and layout refinement

## Original art, directly recovered

The owner supplied `Yoruba-inspired custom playing card deck.png` (1536×1024). An unchanged copy is preserved at `docs/design/orisha-deck-reference.png`. Its text is creative reference, not new gameplay authority: no divine abilities or card powers were added.

All twelve court illustrations are extracted as separate PNGs in `public/assets/cards/orisha/`, mapped by game card ID:

| Suit | Jack | Queen | King |
| --- | --- | --- | --- |
| Spades | Ogun | Oya | Shango |
| Hearts | Oshun | Yemoja | Obatala |
| Diamonds | Eshu | Orunmila | Oduduwa |
| Clubs | Erinle | Osanyin | Aganju |

`scripts/extract-courts.mjs` performs direct, lossless macOS `sips` crops. `public/assets/cards/orisha/manifest.json` records source SHA-256, dimensions, exact rectangles and identities. No resampling, generative alteration, repainting or reconstructed faces is involved. Original ranks, suit symbols, character names, framing and double-ended figures remain intact. The sheet is never stretched across an individual card.

`CardFace` now renders these individual original court images with natural proportions (`object-fit: contain`); numeric cards and Aces retain the existing modular renderer. Court placeholder emblems were removed. The shared renderer integrates the same illustrations in the home hero, Active Card and player hands. Custom game labels remain accessible through card buttons; duplicate corner indices are not drawn over the supplied artwork.

### Extraction limits

Individual crops are 194–201 pixels wide and 311–312 pixels high. They are suitable for the current game-piece sizes; large hero rendering has some source-resolution softness. These are faithful screen assets, not high-resolution print masters. Typography, proportions and any drawing irregularities baked into the supplied sheet remain unchanged. Future high-resolution individual originals can replace these files without engine changes. No extracted card backs, Aces or number-card examples were introduced in this pass: cosmetic ownership and existing rendering remain intact.

## Layout and heritage

Home now uses a wider content stage, a larger headline, readable supporting text and substantially larger original character cards. Setup has a wider panel, larger controls and a balanced reminder column. The tabletop uses a viewport-led grid that explicitly reserves rows for opponents, central cards, turn feedback and the hand. Laptop-height, tablet and portrait-phone compositions have separate size rules; large hands retain internal scrolling.

The palette remains deep green, warm ivory and restrained coloured accents. Black and gold in the reference illustrations do not define the interface palette. Heritage copy connects Caribbean card play and Yoruba-inspired art without campaign banners or new gameplay claims. No Godot UI assets or LUDI components were copied.

Fonts remain locally bundled DM Sans Variable and Fraunces Variable, with licences in `public/licenses/`. Icons are Lucide React. Original source artwork, Godot directories and LUDI remain untouched.

## Verification

- Production TypeScript/Vite build passes.
- Existing 18 engine/economy tests pass, including 240 seeded games. No engine or progression rules were changed.
- Chrome completes desktop Traditional and portrait-mobile Chains playthroughs, with TAP, bot actions, results, rematches, rewards, purchases, equipping and reload persistence. No page JavaScript errors were observed.
- Layout checks pass at 1920×1080, 1440×900, 1024×768, 768×1024, 390×844 and 320×740. No page-width overflow or overlap between central cards, turn feedback and hand. All twelve crop assets decode at their recorded native dimensions. Screenshots were visually inspected.
- Source and preserved reference SHA-256 match: `db5ada05ae874295b9c92408bdac21c6063b3efa56f34e7c6c124f697b0377d1`.
- Re-run layout inspection with `PITAPAT_URL=http://127.0.0.1:5173 node scripts/layout-check.mjs` while your dev server is running. Its default port is 5174, used for this pass's isolated preview. Screenshots/results are temporary QA artifacts.
- No push, deployment, Godot source changes or LUDI changes.

# Build 003B — full Orisha deck consistency

The authoritative source remains `docs/design/orisha-deck-reference.png`. No generated replacement character artwork is used.

## Direct source artwork

- All twelve named courts retain their original double-ended Black Orisha figures, borders, rank markings and names: Ogun, Oya, Shango; Oshun, Yemoja, Obatala; Eshu, Orunmila, Oduduwa; Erinle, Osanyin, Aganju.
- All four aces are now direct crops, preserving their axe, vessel, eye and tree illustrations.
- The default back uses the original patterned back. Existing purchased colourways apply a restrained colour filter to the same pattern; ownership, pricing and equip behavior are preserved.
- Four number-card examples are retained as source crops for reference, rather than used as game faces. The sheet's 5, 8 and 10 examples visibly contain only 3, 4 and 6 main pips. Copying these into play would sacrifice recognisability.

`extract-deck.mjs` extends the court manifest with exact crop rectangles and source checksum. All original crops preserve their aspect ratios when rendered. These are screen-resolution assets from a composite sheet, not print masters; their baked-in drawing and proportion differences remain visible.

## Systematically derived

All 36 number cards use one SVG renderer with correct pip counts, two-ended corner indices and stable, platform-independent suit silhouettes. The reference supplies the warm ivory stock direction, pointed hearts and diamonds, broad spades, rounded clubs, compact serif ranks, black spades/clubs and vermilion hearts/diamonds. Number cards follow the reference's open field, while courts retain their original illustration frames. There is no extra generic inset border.

Suit meanings remain Spades — War & Power; Hearts — Life & Protection; Diamonds — Fate & Wisdom; Clubs — Earth & Nature. They are retained in the accessible artwork descriptions without adding ornamental copy to small game cards. Gameplay rules, modes, bot logic and progression code are unchanged.

## Review artifacts

`docs/verification/build-003b/desktop-active-game.png`, `mobile-active-game.png` and `full-deck.png` capture the real renderer. The active-game screenshots use a repeatable seeded deal through the normal game creation path; no hand or active-card state is substituted. `scripts/deck-check.mjs` checks all 52 rendered IDs and every number-card pip count.

No push or deployment is authorised in this build.

Final verification: production build and all 18 engine/progression tests pass. Chrome completed desktop Traditional and mobile Chains games, including bots, TAP, result grants, rematches, purchases/equipping and persistence, with no page JavaScript errors. All 52 cards and all 36 numeric pip counts pass browser inspection. Layout checks pass at 1920×1080, 1440×900, 1024×768, 768×1024, 390×844 and 320×740, with no horizontal overflow or central-card/status/hand overlap. The active-game review deal deliberately includes an original ace, court and derived number cards together.

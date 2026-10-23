> Historical Build 002 notes. Build 003C replaces the same-turn TAP rule with persistent advance declarations. See [current rules and verification](build-003c.md).

# Build 002 implementation decisions

## Rules authority

The owner's latest decisions supersede Godot `d42f698` and the recovered v1.0 document. The Godot project was audited in Build 001B; no GDScript was translated literally. `HandFocus`'s rules, bot policy, visuals and economy have separate web modules.

- 2–4 seats; one human and 1–3 bots. Five cards each, standard 52 cards, clockwise seats. The human starts a new local hand (provisional starting-player decision).
- Traditional default: one rank-or-suit opener; optionally one unrestricted discard. Ending after the opener is legal. Opener and discard are separate actions. Build 003C checks advance TAP on both finishing paths.
- Chains: one ordered stack; opening matches Active Card and every later card matches the prior card. A valid stack ends the turn. No unrestricted traditional discard in Chains.
- Blocked seats draw one individually; the turn ends even if that card matches. No voluntary opening pass when a match exists.
- TAP applies equally to bots and humans. As of Build 003C, it persists for the hand and must be declared on an earlier turn. Emptying without eligible advance TAP draws one penalty card and **ends the turn** (provisional penalty-turn decision).
- Recycling shuffles all played cards except the visible Active Card. If drawing is unavailable but another seat has a match, the blocked seat yields. If no seat has a match and nothing is drawable, the hand is a draw. If a TAP penalty cannot be supplied, the hand is a draw. These are explicit provisional exhaustion decisions.
- No powers, Draw Two, Skip, Reverse, Orisha abilities, relics, bosses or roguelite progression.
- Each completed local hand is one rewarded result, not Godot's Grand Prix. Prototype ante/chip scoring was not carried over.

## Module map

- `src/game/cards.ts`: identities, ranks/suits, matching, display names and approved Orisha roster.
- `deck.ts`: deterministic Fisher–Yates with explicit RNG state.
- `state.ts`: state, commands, events and player-view types.
- `rules.ts`: shared legal-action validation.
- `engine.ts`: immutable transitions, phases, drawing, recycling, TAP and outcomes. Commands include actor and expected revision to reject stale/repeated actions.
- `view.ts`: detached projections exposing only the viewer's hand, public plays and counts. No seed, opponent cards or draw-pile order.
- `bots.ts`: legal choices using only bot-specific views. Traditional retains connected cards where possible; Chains uses a bounded search. Both obey TAP and drawing.
- `src/progression/profile.ts`: versioned local saves, result receipts, XP, two currencies and cosmetic inventory. Pure idempotent reward application, independent of card state.
- `src/components/Card.tsx`: modular card faces, court placeholders and independent cosmetic backs.
- `src/App.tsx`: React flow, local turn scheduling and presentation. Timers choose when to dispatch an action; rules never depend on animation completion.

For future multiplayer, put canonical state in a server authority, authenticate action actors, reuse the engine, and send `playerView` projections only. The current local client holds canonical state for offline bots; do not broadcast it. Production competition will need secure server randomness and an authoritative reward ledger. No networking was added in this build.

## Progression

A completed hand earns 20 XP, 12 coins and 5 chips; a win adds 25 XP, 8 coins and 5 chips. Levels advance every 100 XP. Results are claimed once by unique hand ID. Recent history retains 20 entries; claimed IDs are retained independently. Forfeits grant nothing. Purchases spend coins only and do not affect game state. Client-local data is editable and is not a secure competitive balance.

## Verification

Focused engine checks cover valid/invalid actions, deck conservation, 2–4 seats, both modes, TAP, recycling, exhaustion, hidden information and rewards. A 240-game matrix runs 40 seeds for each mode/player-count combination with legal bot actions and a 1,500-action termination bound. Chrome checks additionally exercise the player interface, not just internal methods.

### Verified on 22 October 2026

- `npm run build`: TypeScript and production Vite build pass.
- `npm test`: 18 tests pass, including the 240-game simulation matrix.
- `npm run test:browser`: installed Chrome completes human wins in desktop Traditional (4 seats) and mobile Chains (3 seats); validates invalid-play feedback, results, rematch/forfeit, idempotent rewards, reload persistence, cosmetic buying/equipping and insufficient-funds controls. No page JavaScript errors. Desktop 1440px, portrait 390px and narrow 320px checked for horizontal overflow; screenshots visually inspected.
- Initial dependency vulnerabilities were resolved by updating the newly installed toolchain; the final install audit reported zero vulnerabilities.
- Preservation check: no recovery-clone source or artwork differences. Five `.DS_Store` metadata files appeared changed during the session; these were left untouched rather than reverting existing filesystem state.

Desktop/mobile playthrough screenshots were saved to temporary storage, not copied into the original projects. Tests use separate browser contexts, so verification does not award progress to the owner's normal Chrome profile.

## Subsequent presentation update

Build 003A replaces the temporary court emblems with the owner's original twelve illustrated courts and refines viewport composition. Rules, bots, TAP, currencies and progression semantics are unchanged. See `docs/design/assets.md` for current artwork provenance and resolution limits.

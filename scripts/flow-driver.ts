import {chooseBotAction} from '../src/game/bots';
import {playerView} from '../src/game/view';
import type {GameState,PlayerView} from '../src/game/state';
// The UI driver makes decisions using exactly one player's private projection.
export function localDecision(game:GameState){return chooseBotAction(playerView(game,'you'));}
export function onlineDecision(view:PlayerView){return chooseBotAction(view);}

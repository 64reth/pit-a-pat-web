import { isAdvanceTapEligible } from './rules';
import type { GameState, PlayerView } from './state';
export function playerView(state:GameState,viewer:string):PlayerView {
  const declared=state.players.find(p=>p.id===viewer)?.tapDeclaredTurn??null;
  return {lastAction:state.lastAction?structuredClone(state.lastAction):undefined,direction:state.direction??1,pendingAction:state.pendingAction??null,dealer:state.dealer??state.players.length-1,startingPlayer:state.startingPlayer??0,id:state.id,mode:state.mode,revision:state.revision,
    players:state.players.map(({id,name,bot,hand,tapDeclaredTurn})=>({id,name,bot,count:hand.length,tapDeclaredTurn:tapDeclaredTurn??null})),
    hand:state.players.find(p=>p.id===viewer)?.hand.map(c=>({...c}))??[],active:{...state.pile.at(-1)!},
    deckCount:state.deck.length,current:state.current,phase:state.phase,tapped:declared!==null,tapDeclaredTurn:declared,tapEligible:isAdvanceTapEligible(declared,state.turns),winner:state.winner,
    events:state.events.map(e=>({...e})),turns:state.turns};
}

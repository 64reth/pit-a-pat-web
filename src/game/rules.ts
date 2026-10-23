import { matches } from './cards';
import type { Card } from './cards';
import type { Action, Mode } from './state';
export interface RuleContext { hand:Card[]; active:Card; mode:Mode; phase:'opening'|'discard'|'finished'; tapped:boolean }
// Turn numbers are monotonic within a hand; seat indices and revisions are not turns.
export function isAdvanceTapEligible(declaredTurn:number|null,turn:number):boolean {
  return declaredTurn!==null && Number.isSafeInteger(declaredTurn) && declaredTurn>=1 && declaredTurn<turn;
}
export function validateAction(c:RuleContext, action:Action):string|null {
  if(c.phase==='finished') return 'This hand has finished.';
  if(action.type==='tap') return c.tapped ? 'TAP is already declared.' : null;
  if(action.type==='end') return c.phase==='discard' ? null : 'Play a match or draw before ending your turn.';
  if(action.type==='draw') {
    if(c.phase!=='opening') return 'You have already played. Discard or end your turn.';
    return c.hand.some(card=>matches(card,c.active)) ? 'You have a match. Play it before ending your turn.' : null;
  }
  if(!action.cards.length) return 'Choose a card first.';
  if(new Set(action.cards).size!==action.cards.length) return 'A card can only be played once.';
  const cards=action.cards.map(id=>c.hand.find(card=>card.id===id));
  if(cards.some(card=>!card)) return 'That card is not in your hand.';
  if(c.phase==='discard') return action.cards.length===1 ? null : 'Choose just one additional discard.';
  if(c.mode==='traditional' && cards.length!==1) return 'Play your opening match first, then choose an optional discard.';
  if(!matches(cards[0]!,c.active)) return 'Match the Active Card by rank or suit.';
  if(c.mode==='chains') for(let i=1;i<cards.length;i++) {
    if(!matches(cards[i]!,cards[i-1]!)) return 'Each card must match the one before it.';
  }
  return null;
}

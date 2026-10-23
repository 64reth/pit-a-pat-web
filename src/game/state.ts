import type { Card } from './cards';
export type Mode = 'traditional' | 'chains';
export interface Player { id: string; name: string; bot: boolean; hand: Card[]; tapDeclaredTurn: number|null }
export interface GameEvent { type: 'play'|'draw'|'tap'|'penalty'|'turn'|'recycle'|'win'|'stalemate'|'action'; actor: string; text: string; turn: number }
export interface ActionVisual {id:string;kind:'draw-two'|'skip'|'reverse';card:Card;actor:string;target:string;next:string;drawn:number;direction:1|-1;twoPlayerReverse:boolean}
export interface GameState {
 lastAction?:ActionVisual;
  id: string; mode: Mode; seed: number; revision: number; players: Player[]; deck: Card[]; pile: Card[];
  current: number; phase: 'opening'|'discard'|'finished'; winner: string|null;
  events: GameEvent[]; turns: number; direction:1|-1; pendingAction:'draw-two'|'skip'|'reverse'|null; dealer:number; startingPlayer:number;
}
export type Action = {type:'play'; cards:string[]} | {type:'tap'} | {type:'draw'} | {type:'end'};
export interface Command { actor: string; revision: number; action: Action }
export type Transition = {ok:true; state:GameState} | {ok:false; error:string};
export interface PlayerView {
  lastAction?:ActionVisual;
  id:string; mode:Mode; revision:number; players:{id:string; name:string; bot:boolean; count:number; tapDeclaredTurn:number|null}[];
  hand:Card[]; active:Card; deckCount:number; current:number; phase:GameState['phase']; tapped:boolean; tapEligible:boolean; tapDeclaredTurn:number|null;
  winner:string|null; events:GameEvent[]; turns:number; direction:1|-1; pendingAction:GameState['pendingAction']; dealer:number; startingPlayer:number;
}

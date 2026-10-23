import {applyAction,createGame} from './engine';
import {shuffle} from './deck';
import type {Command,GameState,Mode} from './state';
export interface Championship {
 id:string;targetWins:3;handNumber:number;dealer:number;startingPlayer:number;
 standings:{id:string;name:string;wins:number}[];
 status:'playing'|'between-hands'|'finished'|'cancelled';winner:string|null;
 hands:{id:string;number:number;winner:string|null;turns:number}[];
}
export interface ChampionshipState {match:Championship;game:GameState}
export function createChampionship(config:{id:string;mode:Mode;seed:number;players:{id:string;name:string;bot:boolean}[]},shuffleCards=shuffle):ChampionshipState {
 const match:Championship={id:config.id,targetWins:3,handNumber:1,dealer:config.players.length-1,startingPlayer:0,standings:config.players.map(p=>({id:p.id,name:p.name,wins:0})),status:'playing',winner:null,hands:[]};
 return {match,game:createGame({...config,id:`${match.id}:hand:1`,dealer:match.dealer,startingPlayer:match.startingPlayer},shuffleCards)};
}
export function applyChampionshipAction(state:ChampionshipState,command:Command,shuffleCards=shuffle):{ok:true;state:ChampionshipState}|{ok:false;error:string} {
 if(state.match.status!=='playing')return {ok:false,error:'This hand is closed. Wait for the next hand or start a match rematch.'};
 const result=applyAction(state.game,command,shuffleCards);if(!result.ok)return result;
 const match=structuredClone(state.match),game=result.state;
 if(game.phase==='finished'){
  match.hands.push({id:game.id,number:match.handNumber,winner:game.winner,turns:game.turns});
  if(game.winner){const standing=match.standings.find(p=>p.id===game.winner)!;standing.wins++;if(standing.wins===match.targetWins){match.winner=standing.id;match.status='finished';}}
  if(match.status!=='finished')match.status='between-hands';
 }
 return {ok:true,state:{match,game}};
}
export function nextChampionshipHand(state:ChampionshipState,shuffleCards=shuffle):ChampionshipState {
 if(state.match.status!=='between-hands'||state.game.phase!=='finished')throw new Error('The championship is not ready for another hand.');
 const match=structuredClone(state.match);match.handNumber++;match.dealer=(match.dealer+1)%match.standings.length;match.startingPlayer=(match.dealer+1)%match.standings.length;match.status='playing';
 // Stalemates award no marker. Redeal all cards as the next numbered hand,
 // rotating dealer/starter exactly as after a won hand; entries remain committed.
 const game=createGame({id:`${match.id}:hand:${match.handNumber}`,mode:state.game.mode,seed:state.game.seed,players:state.game.players.map(({id,name,bot})=>({id,name,bot})),dealer:match.dealer,startingPlayer:match.startingPlayer},shuffleCards);
 return {match,game};
}

export function cancelChampionship(match:Championship):Championship {
 if(match.status==='finished')throw new Error('A completed championship cannot be cancelled.');
 return {...structuredClone(match),status:'cancelled',winner:null};
}

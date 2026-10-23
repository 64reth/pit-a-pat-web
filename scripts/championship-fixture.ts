import {createChampionship,applyChampionshipAction,nextChampionshipHand} from '../src/game/championship';
import {chooseBotAction} from '../src/game/bots';
import {playerView} from '../src/game/view';
import type {Mode} from '../src/game/state';
export function simulate(id:string,players:{id:string;name:string;bot:boolean}[],mode:Mode='chains',untilFirstHand=false){
 let s=createChampionship({id,players,mode,seed:94}),steps=0;
 while(s.match.status!=='finished'&&steps++<10000){
  if(s.match.status==='between-hands'){if(untilFirstHand)return s;s=nextChampionshipHand(s);}
  else{const g=s.game,result=applyChampionshipAction(s,{actor:g.players[g.current].id,revision:g.revision,action:chooseBotAction(playerView(g,g.players[g.current].id))});if(!result.ok)throw Error(result.error);s=result.state;}
 }
 if(s.match.status!=='finished')throw Error('Simulation did not complete');return s;
}

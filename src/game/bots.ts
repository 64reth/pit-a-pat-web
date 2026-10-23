import {matches} from './cards';
import type {Card} from './cards';
import type {Action,PlayerView} from './state';
// Uses only its own cards, public counts, direction and the pending action.
function disruption(v:PlayerView,rank:Card['rank']|null):number {
 const n=v.players.length,step=(d:number)=>(v.current+(v.direction??1)*d+n*2)%n;
 const next=v.players[step(1)].count,previous=v.players[step(-1)].count;
 const urgent=next<=2;
 if(rank==='2')return urgent?42:4;
 if(rank==='8')return urgent?34:3;
 if(rank==='10')return n===2?(urgent?34:3):urgent&&previous>next?28:0;
 return 0;
}
function utility(v:PlayerView,card:Card){return disruption(v,card.rank)-connectivity(v.hand,card)*2-(v.hand.length>3&&['2','8','10'].includes(card.rank)?3:0);}
export function chooseBotAction(v:PlayerView):Action {
 if(!v.tapped)return {type:'tap'};
 if(v.phase==='discard'){
  if(v.hand.length===1&&!v.tapEligible)return {type:'end'};
  const sorted=[...v.hand].sort((a,b)=>utility(v,b)-utility(v,a));
  const pendingRank=v.pendingAction==='draw-two'?'2':v.pendingAction==='skip'?'8':v.pendingAction==='reverse'?'10':null;
  if(v.hand.length>1&&disruption(v,pendingRank)>20+disruption(v,sorted[0].rank))return {type:'end'};
  return {type:'play',cards:[sorted[0].id]};
 }
 let chain:Card[]=[],best=-Infinity;
 if(v.mode==='chains'){
  let budget=2500;
  function visit(path:Card[],remaining:Card[],last:Card){
   if(path.length&&!(path.length===v.hand.length&&!v.tapEligible)){
    const score=path.length*20+disruption(v,last.rank)+(path.length===v.hand.length?1000:0);
    if(score>best){best=score;chain=path;}
   }
   if(--budget<=0)return;
   for(const card of remaining)if(matches(card,last)){
    visit([...path,card],remaining.filter(c=>c.id!==card.id),card);if(budget<=0)return;
   }
  }
  visit([],v.hand,v.active);
  // With one card and same-turn TAP, a legal attempt may incur the approved
  // penalty; never invent an illegal pass when drawing is forbidden.
  if(!chain.length&&v.hand.length===1&&matches(v.hand[0],v.active))chain=[v.hand[0]];
 }else{
  const candidates=v.hand.filter(c=>matches(c,v.active)).sort((a,b)=>utility(v,b)-utility(v,a));
  if(candidates.length)chain=[candidates[0]];
 }
 return chain.length?{type:'play',cards:chain.map(c=>c.id)}:{type:'draw'};
}
function connectivity(hand:Card[],card:Card){return hand.filter(c=>c.id!==card.id&&matches(c,card)).length;}

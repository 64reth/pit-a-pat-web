import type { Card } from '../src/game/cards';
// Rejection sampling avoids modulo bias. No seed or client randomness participates.
export function secureShuffle(cards:Card[],_seed:number):{cards:Card[];seed:number}{
 const result=[...cards],random=new Uint32Array(1);
 for(let i=result.length-1;i>0;i--){const bound=i+1,limit=Math.floor(4294967296/bound)*bound;do{crypto.getRandomValues(random);}while(random[0]>=limit);const j=random[0]%bound;[result[i],result[j]]=[result[j],result[i]];}
 return {cards:result,seed:0};
}

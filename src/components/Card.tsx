import type { CSSProperties } from 'react';
import type { Card as CardData } from '../game/cards';
import { COURTS, cardName } from '../game/cards';
const PIPS:Record<string,[number,number][]>= {
 A:[[50,50]],'2':[[50,24],[50,76]],'3':[[50,22],[50,50],[50,78]],
 '4':[[32,25],[68,25],[32,75],[68,75]],'5':[[32,25],[68,25],[50,50],[32,75],[68,75]],
 '6':[[32,24],[68,24],[32,50],[68,50],[32,76],[68,76]],
 '7':[[32,24],[68,24],[50,37],[32,50],[68,50],[32,76],[68,76]],
 '8':[[32,20],[68,20],[32,40],[68,40],[32,60],[68,60],[32,80],[68,80]],
 '9':[[32,20],[68,20],[32,40],[68,40],[50,50],[32,60],[68,60],[32,80],[68,80]],
 '10':[[32,18],[68,18],[50,29],[32,39],[68,39],[32,61],[68,61],[50,71],[32,82],[68,82]],
};
const DOMAINS = {spades:'War & Power',hearts:'Life & Protection',diamonds:'Fate & Wisdom',clubs:'Earth & Nature'};
// Closed ink silhouettes: pointed hearts, broad spades and rounded trefoils,
// following the supplied sheet rather than platform-dependent suit glyphs.
const SUIT_PATHS = {
 hearts:'M0 18 C-4 11 -18 0 -18 -9 C-18 -23 -3 -24 0 -13 C3 -24 18 -23 18 -9 C18 0 4 11 0 18Z',
 diamonds:'M0 -23 C6 -13 12 -5 18 0 C12 5 6 13 0 23 C-6 13 -12 5 -18 0 C-12 -5 -6 -13 0 -23Z',
 spades:'M0 -23 C-5 -13 -20 -3 -20 6 C-20 20 -5 21 -2 10 C-2 18 -5 22 -9 24 L9 24 C5 22 2 18 2 10 C5 21 20 20 20 6 C20 -3 5 -13 0 -23Z',
 clubs:'M-3 7 C-10 21 -24 13 -21 2 C-19 -7 -9 -8 -5 -3 C-16 -20 -3 -28 5 -22 C12 -18 11 -8 5 -3 C18 -14 28 0 20 10 C14 18 5 16 2 7 C2 16 5 21 10 24 L-10 24 C-5 20 -2 15 -3 7Z',
};
export function CardFace({card}:{card:CardData}) {
 const court=COURTS[card.suit][card.rank];
 const direct=!!court || card.rank==='A';
 if(direct) return <div className={`card-face illustrated ${card.suit}`}><img className="court-image" src={`/assets/cards/orisha/${card.id}.png`} alt={`${court ? court+', ' : ''}${cardName(card)} — ${DOMAINS[card.suit]}, original Orisha reference`} draggable={false}/></div>;
 const ink=card.suit==='hearts'||card.suit==='diamonds'?'#ad2117':'#10120f';
 const pip=SUIT_PATHS[card.suit];
 return <div className={`card-face heritage-number ${card.suit}`}>
  <svg className="number-art" viewBox="0 0 200 316" role="img" aria-label={`${cardName(card)} — ${DOMAINS[card.suit]}`}>
   <title>{cardName(card)} — {DOMAINS[card.suit]}</title>
   <g fill={ink}>
    {[false,true].map(flip=><g key={String(flip)} transform={flip?'rotate(180 100 158)':undefined}>
     <text x="17" y="46" fontFamily="Georgia, serif" fontSize="46" fontWeight="bold" textAnchor="middle" transform="translate(6 0) scale(.78 1)">{card.rank}</text>
     <path d={pip} transform="translate(20 62) scale(.37)"/>
    </g>)}
    {PIPS[card.rank]?.map(([x,y],i)=><path key={i} d={pip} transform={`translate(${100+(x-50)*1.9} ${12+y*2.92}) rotate(${y>50?180:0}) scale(1)`}/>)}
   </g>
  </svg>
 </div>;
}
export function PlayingCard({card,selected=false,order,legal,onClick,style,disabled=false}:{card:CardData;selected?:boolean;order?:number;legal?:boolean;onClick?:()=>void;style?:CSSProperties;disabled?:boolean}) {
 return <button className={`playing-card ${selected?'is-selected':''} ${legal?'is-legal':''}`} style={style} onClick={onClick} disabled={disabled} aria-label={`${cardName(card)}${order?`, selected ${order}`:''}`} aria-pressed={selected} data-card-id={card.id}><CardFace card={card}/>{order&&<span className="selection-order">{order}</span>}</button>;
}
export function CardBack({variant='botanical',className=''}:{variant?:string;className?:string}) {
 return <div className={`card-back orisha-back ${variant} ${className}`} aria-hidden="true"><img src="/assets/cards/orisha/back.png" alt="" draggable={false}/></div>;
}

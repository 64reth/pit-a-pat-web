import {useEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import type {ActionVisual,PlayerView} from '../game/state';
import {CardBack,CardFace} from './Card';
export const ACTION_REVEAL_MS=1100;
export function actionLabel(action:ActionVisual){return action.kind==='draw-two'?'+2':action.kind==='skip'?'SKIP':'REVERSE';}
// Baseline every restored/new hand; animate only a newly confirmed transition.
export function useActionEffect(view:PlayerView|null|undefined,fresh=true,connected=true){
 const seen=useRef({hand:view?.id,id:view?.lastAction?.id});
 const [effect,setEffect]=useState<ActionVisual|null>(null);
 useEffect(()=>{
  const last=view?.lastAction;
  if(seen.current.hand!==view?.id){seen.current={hand:view?.id,id:last?.id};setEffect(null);return;}
  if(!connected){seen.current.id=last?.id;setEffect(null);return;}
  if(last?.id===seen.current.id){if(effect&&view?.active.id!==effect.card.id)setEffect(null);return;}
  seen.current.id=last?.id;
  if(!last||!fresh||view?.phase==='finished'||last.card.id!==view.active.id){setEffect(null);return;}
  setEffect(last);
 },[view?.id,view?.lastAction?.id,view?.active.id,view?.phase,fresh,connected,effect]);
 useEffect(()=>{if(!effect)return;const timer=setTimeout(()=>setEffect(null),ACTION_REVEAL_MS);return()=>clearTimeout(timer);},[effect]);
 return effect;
}
export function ActionCardReveal({effect}:{effect:ActionVisual|null}){
 if(!effect)return null;
 return <div key={effect.id} className={`action-reveal-card action-${effect.kind}`} data-effect={effect.kind} data-effect-id={effect.id} aria-label={`${actionLabel(effect)} activated`}><CardFace card={effect.card}/><strong className="action-effect-marker">{actionLabel(effect)}</strong>{effect.kind==='reverse'&&<span className="reverse-orbit" aria-hidden="true">{effect.direction===1?'↻':'↺'}</span>}</div>;
}
export function seatEffectClass(effect:ActionVisual|null,id:string,active:boolean){return effect?`${effect.target===id?'effect-target effect-'+effect.kind:''} ${effect.next===id&&active?'effect-next':''}`:'';}
export function SeatActionMarker({effect,id}:{effect:ActionVisual|null;id:string}){
 if(!effect||effect.target!==id||effect.kind==='reverse'&&!effect.twoPlayerReverse)return null;
 return <strong className="seat-action-marker" aria-label={effect.kind==='draw-two'?'Draw two':'Turn skipped'}>{effect.kind==='draw-two'?'+2':'SKIP'}</strong>;
}
interface Point {x:number;y:number}
function center(element:Element|null):Point|null{if(!element)return null;const r=element.getBoundingClientRect();return r.width&&r.height?{x:r.x+r.width/2,y:r.y+r.height/2}:null;}
function seat(id:string){return [...document.querySelectorAll('[data-player-id]')].find(el=>el.getAttribute('data-player-id')===id&&el.getBoundingClientRect().width>0)??null;}
export function ActionFlights({effect}:{effect:ActionVisual|null}){
 const [points,setPoints]=useState<{draw:Point|null;actor:Point|null;target:Point|null;pile:Point|null}|null>(null);
 useEffect(()=>{
  if(!effect){setPoints(null);return;}
  const measure=()=>setPoints({draw:center(document.querySelector('[data-draw-origin]')),actor:center(seat(effect.actor)),target:center(seat(effect.target)),pile:center(document.querySelector('[data-active-origin]'))});
  measure();window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);return()=>{window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);};
 },[effect]);
 if(!effect||!points)return null;
 const style=(from:Point,to:Point):CSSProperties=>({left:from.x,top:from.y,'--flight-x':`${to.x-from.x}px`,'--flight-y':`${to.y-from.y}px`} as CSSProperties);
 return <div className="action-flight-layer" aria-hidden="true" key={effect.id}>{points.actor&&points.pile&&<div className="played-card-flight" style={style(points.actor,points.pile)}><CardFace card={effect.card}/></div>}{effect.kind==='draw-two'&&points.draw&&points.target&&Array.from({length:effect.drawn},(_,i)=><div className="penalty-card-flight" key={i} style={{...style(points.draw!,points.target!),'--flight-delay':`${260+i*120}ms`} as CSSProperties}><CardBack/></div>)}</div>;
}

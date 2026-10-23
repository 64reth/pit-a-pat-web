import {useEffect,useRef,useState,type ReactNode} from 'react';
/** Presentation follows committed state; exit timing never authorizes a deal. */
export function StakingDrawer({open,children,confirmed=false}:{open:boolean;children:ReactNode;confirmed?:boolean}){
 const [present,setPresent]=useState(open),[closing,setClosing]=useState(false),last=useRef(children),region=useRef<HTMLElement>(null);
 if(open)last.current=children;
 useEffect(()=>{
  if(open){setPresent(true);setClosing(false);return;}
  setClosing(true);const timer=setTimeout(()=>{if(region.current?.contains(document.activeElement)){const hand=document.querySelector<HTMLElement>('.hand-cards,.online-hand');if(hand){hand.tabIndex=0;hand.focus({preventScroll:true});}}setPresent(false);},280);return()=>clearTimeout(timer);
 },[open]);
 useEffect(()=>{if(open&&present)region.current?.focus({preventScroll:true});},[open,present]);
 if(!present&&!open)return null;
 return <aside ref={region} tabIndex={-1} aria-label="Staking drawer" aria-live="polite" className={`staking-drawer ${closing&&!open?'is-retracting':''}`} inert={!open}>{!open&&confirmed?<div className="stake-confirmed" role="status">✓ All players committed<span>Dealing your hand…</span></div>:open?children:last.current}</aside>;
}

import {useEffect,useRef,type ReactNode} from 'react';
export function TableOverlay({title,children}:{title:string;children:ReactNode}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement;ref.current?.focus();return()=>{if(previous?.isConnected)previous.focus();};},[]);
 return <div className="table-overlay"><div className="table-outcome" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onKeyDown={e=>{if(e.key!=='Tab')return;const items=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')??[]).filter(n=>n.getClientRects().length);const first=items[0],last=items.at(-1);if(!first)return;if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}><h2>{title}</h2>{children}</div></div>;
}

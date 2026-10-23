import {useState} from 'react';
import {RotateCw} from 'lucide-react';
export function OrientationHint({active}:{active:boolean}){
 const [dismissed,setDismissed]=useState(false);
 if(!active||dismissed)return null;
 return <aside className="orientation-hint" aria-label="Landscape play"><RotateCw size={22}/><span><strong>Rotate to play</strong><small>More room for your cards in landscape.</small></span><button onClick={()=>setDismissed(true)}>Continue anyway</button></aside>;
}

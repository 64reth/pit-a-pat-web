import {LOCAL_STARTING_CHIPS} from '../game/playTypes';
import type {LocalTable} from './staking';
import type {Championship} from '../game/championship';
import type { GameState, Mode } from '../game/state';
export interface Receipt { id:string; date:string; mode:Mode; won:boolean; draw:boolean; xp:number; coins:number; chips:number; turns:number;kind?:'match';handWins?:number;hands?:number }
export interface Profile { localTable?:LocalTable;localBots?:Record<string,number>; version:1; matches?:number;championships?:number; name:string; xp:number; coins:number; chips:number; wins:number; games:number; owned:string[]; equipped:string; claimed:string[]; history:Receipt[]; fastBots:boolean; reducedMotion:boolean }
export const STORAGE_KEY='pitapat.profile.v1';
export const COSMETICS=[{id:'botanical',name:'Botanical',description:'Original Orisha pattern',price:0},{id:'hibiscus',name:'Hibiscus',description:'Warm-toned pattern',price:60},{id:'blue-hour',name:'Blue hour',description:'Cool-toned pattern',price:100}];
export function freshProfile():Profile { return {version:1,name:'You',xp:0,coins:0,chips:0,wins:0,games:0,owned:['botanical'],equipped:'botanical',claimed:[],history:[],fastBots:false,reducedMotion:false}; }
function freshLocalProfile():Profile {return {...freshProfile(),chips:LOCAL_STARTING_CHIPS};}
export function loadProfile():Profile {
  try {
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw) return freshLocalProfile();
    const p=JSON.parse(raw) as Profile;
    if(p.version!==1 || ![p.xp,p.coins,p.chips,p.wins,p.games].every(n=>Number.isSafeInteger(n)&&n>=0) || !Array.isArray(p.owned) || !Array.isArray(p.claimed) || !Array.isArray(p.history)) return freshProfile();
    return {...freshProfile(),...p,matches:Number.isSafeInteger(p.matches)&&p.matches!>=0?p.matches:0,championships:Number.isSafeInteger(p.championships)&&p.championships!>=0?p.championships:0,name:typeof p.name==='string'?p.name.slice(0,20):'You',owned:p.owned.filter(id=>COSMETICS.some(c=>c.id===id)),history:p.history.filter(r=>r && typeof r.id==='string' && typeof r.date==='string' && Number.isFinite(Date.parse(r.date)) && [r.xp,r.coins,r.chips,r.turns].every(n=>Number.isSafeInteger(n)&&n>=0)).slice(0,20),claimed:p.claimed.filter(id=>typeof id==='string'),equipped:COSMETICS.some(c=>c.id===p.equipped)&&p.owned.includes(p.equipped)?p.equipped:'botanical',fastBots:p.fastBots===true,reducedMotion:p.reducedMotion===true};
  } catch { return freshProfile(); }
}
export function grantResult(p:Profile,game:GameState,date:string,playerId='you'):Profile {
  if(game.phase!=='finished' || p.claimed.includes(game.id)) return p;
  const won=game.winner===playerId,draw=game.winner===null;
  const receipt:Receipt={id:game.id,date,mode:game.mode,won,draw,xp:20+(won?25:0),coins:12+(won?8:0),chips:5+(won?5:0),turns:game.turns};
  return {...p,xp:p.xp+receipt.xp,coins:p.coins+receipt.coins,chips:p.chips+receipt.chips,wins:p.wins+(won?1:0),games:p.games+1,claimed:[...p.claimed,game.id],history:[receipt,...p.history].slice(0,20)};
}
export const levelInfo=(xp:number)=>({level:1+Math.floor(xp/100),progress:xp%100,remaining:100-xp%100});

export function equipCosmetic(p:Profile,id:string):Profile {
  const cosmetic=COSMETICS.find(c=>c.id===id);
  if(!cosmetic || p.equipped===id) return p;
  if(p.owned.includes(id)) return {...p,equipped:id};
  if(p.coins<cosmetic.price) return p;
  return {...p,coins:p.coins-cosmetic.price,owned:[...p.owned,id],equipped:id};
}

// The existing completion reward schedule is paid once per championship. No
// currency is minted for intermediate hands or no-winner redeals.
export function grantChampionshipResult(p:Profile,match:Championship,game:GameState,date:string,playerId='you'):Profile {
 if(match.status!=='finished'||!match.winner||match.standings.find(s=>s.id===match.winner)?.wins!==3||p.claimed.includes(match.id))return p;
 const next=grantResult(p,{...game,id:match.id,phase:'finished',winner:match.winner,turns:match.hands.reduce((sum,h)=>sum+h.turns,0)},date,playerId);
 const receipt={...next.history[0],kind:'match' as const,handWins:match.standings.find(s=>s.id===playerId)?.wins??0,hands:match.hands.length};
 return {...next,matches:(p.matches??0)+1,championships:(p.championships??0)+(match.winner===playerId?1:0),history:[receipt,...next.history.slice(1)]};
}

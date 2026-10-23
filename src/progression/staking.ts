import {createChampionship,nextChampionshipHand,type ChampionshipState} from '../game/championship';
import type {Mode} from '../game/state';
import type {GameType} from '../game/playTypes';
import {QUICK_PLAY_ENTRY} from '../game/playTypes';
import {grantChampionshipResult,type Profile} from './profile';
export {QUICK_PLAY_ENTRY} from '../game/playTypes';
// These wallets are local simulations. They never fund online Account balances.
export const LOCAL_BOT_STARTING_CHIPS=1000;
export interface LocalTable {
 id:string;gameType?:GameType;mode:Mode;entry:number;players:{id:string;name:string;bot:boolean}[];
 status:'awaiting-buy-in'|'ready-to-deal'|'committed'|'awaiting-ante'|'settled'|'refunded';
 exposure?:number;committedHands?:number;
 pot:number;commitments:Record<string,number>;state:ChampionshipState|null;
}
export function prepareLocalTable(gameType:GameType,mode:Mode,players:LocalTable['players'],ante=QUICK_PLAY_ENTRY):LocalTable {
 if(!Number.isSafeInteger(ante)||ante<0||ante>10000)throw Error('Choose a whole-chip ante between 0 and 10,000.');
 return {id:crypto.randomUUID(),gameType,mode:gameType==='quick'?'traditional':mode,entry:gameType==='quick'?QUICK_PLAY_ENTRY:ante,players,status:'awaiting-buy-in',pot:0,commitments:{},state:null};
}
// Existing saved single-entry contracts remain compatible.
export function prepareQuickPlay(_mode:Mode,players:LocalTable['players']):LocalTable {return prepareLocalTable('quick','traditional',players);}
export function commitQuickPlay(profile:Profile,zeroStake=false):Profile {
 const t=profile.localTable;if(!t||t.status!=='awaiting-buy-in')return profile;
 const entry=zeroStake?0:t.entry,exposure=entry*(t.gameType==='custom'?2*t.players.length+1:1),bots={...profile.localBots};
 if(profile.chips<exposure)throw Error('Insufficient local chips for the reservation. Choose zero-stake play.');
 for(const p of t.players.filter(p=>p.bot)){
  const balance=bots[p.id]??LOCAL_BOT_STARTING_CHIPS;
  if(balance<exposure)throw Error(`${p.name} has insufficient simulated chips. Choose zero-stake play.`);
  bots[p.id]=balance-exposure;
 }
 // Consent/reservation is durable before any cards exist. Start is a separate step.
 return {...profile,chips:profile.chips-exposure,localBots:bots,localTable:{...t,entry,exposure,committedHands:1,status:'ready-to-deal',pot:entry*t.players.length,commitments:Object.fromEntries(t.players.map(p=>[p.id,entry]))}};
}
export function startLocalHand(profile:Profile):Profile {
 const t=profile.localTable;if(!t||t.status!=='ready-to-deal')return profile;
 let state:ChampionshipState;
 if(t.state)state=nextChampionshipHand(t.state);
 else{const random=new Uint32Array(1);crypto.getRandomValues(random);state=createChampionship({id:t.id,mode:t.mode,seed:random[0],players:t.players});}
 return {...profile,localTable:{...t,status:'committed',state}};
}
export function continueLocalTable(profile:Profile):Profile {
 const t=profile.localTable;if(!t||t.status!=='committed'||t.state?.match.status!=='between-hands')return profile;
 if(t.gameType==='custom')return {...profile,localTable:{...t,status:'awaiting-ante'}};
 return {...profile,localTable:{...t,state:nextChampionshipHand(t.state)}};
}
export function commitLocalAnte(profile:Profile):Profile {
 const t=profile.localTable;if(!t||t.status!=='awaiting-ante'||t.state?.match.status!=='between-hands')return profile;
 // A no-winner redeal retains its existing ante, bounding maximum exposure.
 const hands=(t.committedHands??1)+(t.state.game.winner?1:0),amount=hands*t.entry;
 if(amount>(t.exposure??t.entry))throw Error('Maximum exposure reached.');
 return {...profile,localTable:{...t,status:'ready-to-deal',committedHands:hands,pot:amount*t.players.length,commitments:Object.fromEntries(t.players.map(p=>[p.id,amount]))}};
}
export function settleLocalTable(profile:Profile):Profile {
 const t=profile.localTable,match=t?.state?.match,game=t?.state?.game;
 if(!t||t.status!=='committed'||!match||!game||match.status!=='finished'||!match.winner)return profile;
 const next=grantChampionshipResult(profile,match,game,new Date().toISOString()),unused=(t.exposure??t.entry)-(t.commitments.you??t.entry),bots={...next.localBots};
 for(const p of t.players.filter(p=>p.bot))bots[p.id]=(bots[p.id]??LOCAL_BOT_STARTING_CHIPS)+unused+(match.winner===p.id?t.pot:0);
 return {...next,chips:next.chips+unused+(match.winner==='you'?t.pot:0),localBots:bots,localTable:{...t,status:'settled'}};
}
export function refundLocalTable(profile:Profile):Profile {
 const t=profile.localTable;if(!t||!['committed','ready-to-deal','awaiting-ante'].includes(t.status))return profile;
 if(t.state?.match.status==='finished')return settleLocalTable(profile);
 const bots={...profile.localBots},amount=t.exposure??t.commitments.you??0;
 for(const p of t.players.filter(p=>p.bot))bots[p.id]=(bots[p.id]??LOCAL_BOT_STARTING_CHIPS)+amount;
 return {...profile,chips:profile.chips+amount,localBots:bots,localTable:{...t,status:'refunded'}};
}

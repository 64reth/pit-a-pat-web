import type {Championship} from '../../src/game/championship';
import { DurableObject } from 'cloudflare:workers';
import { freshProfile, grantChampionshipResult, grantResult, equipCosmetic, COSMETICS, type Profile } from '../../src/progression/profile';
import type { GameState } from '../../src/game/state';
import type { AccountSnapshot, LedgerEntry } from '../../src/online/protocol';
import { displayName, verify } from '../security';
import type { Env } from '../env';
interface AccountData {id:string;secretHash:string;profile:Profile;created:number;roomTimes:number[]}
interface Reservation {matchId:string;room:string;amount:number;status:'reserved'|'settled'|'refunded'}
export class Account extends DurableObject<Env>{
 constructor(ctx:DurableObjectState,env:Env){super(ctx,env);ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS data (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL)');ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS reservations (id TEXT PRIMARY KEY,value TEXT NOT NULL)');ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS ledger (id TEXT PRIMARY KEY, match_id TEXT, value TEXT NOT NULL)');}
 private read(){const row=this.ctx.storage.sql.exec<{value:string}>('SELECT value FROM data WHERE id=1').toArray()[0];if(!row)throw new Error('Account unavailable.');return JSON.parse(row.value) as AccountData;}
 private save(a:AccountData){this.ctx.storage.sql.exec('INSERT OR REPLACE INTO data VALUES(1,?)',JSON.stringify(a));}
 private reservation(id:string){const row=this.ctx.storage.sql.exec<{value:string}>('SELECT value FROM reservations WHERE id=?',id).toArray()[0];return row?JSON.parse(row.value) as Reservation:null;}
 private saveReservation(r:Reservation){this.ctx.storage.sql.exec('INSERT OR REPLACE INTO reservations VALUES(?,?)',r.matchId,JSON.stringify(r));}
 private log(e:LedgerEntry){this.ctx.storage.sql.exec('INSERT INTO ledger VALUES(?,?,?)',e.id,e.matchId,JSON.stringify(e));}
 private tiers(){return (this.env.STAKE_TIERS??'10,25,50').split(',').map(Number).filter(n=>Number.isSafeInteger(n)&&n>0&&n<=10000);}
 async create(id:string,secretHash:string,name:string){if(this.ctx.storage.sql.exec('SELECT id FROM data').toArray().length)throw new Error('Account already exists.');const p=freshProfile();p.name=displayName(name);this.save({id,secretHash,profile:p,created:Date.now(),roomTimes:[]});return this.snapshot();}
 async authenticate(secret:string){return verify(secret,this.read().secretHash);}
 async snapshot():Promise<AccountSnapshot>{const a=this.read();const reserved=this.ctx.storage.sql.exec<{value:string}>('SELECT value FROM reservations').toArray().reduce((sum,row)=>{const r=JSON.parse(row.value) as Reservation;return sum+(r.status==='reserved'?r.amount:0);},0);return {id:a.id,profile:a.profile,reserved,reservations:this.ctx.storage.sql.exec<{value:string}>('SELECT value FROM reservations').toArray().map(row=>JSON.parse(row.value) as Reservation).filter(r=>r.status==='reserved').map(({matchId,room,amount})=>({matchId,room,amount})),transactions:this.ctx.storage.sql.exec<{value:string}>('SELECT value FROM ledger ORDER BY rowid DESC LIMIT 40').toArray().map(r=>JSON.parse(r.value)),stakeTiers:this.tiers()};}
 async rename(name:string){const a=this.read();a.profile.name=displayName(name);this.save(a);return this.snapshot();}
 async permitRoom(){const a=this.read(),now=Date.now();a.roomTimes=a.roomTimes.filter(t=>t>now-3600000);if(a.roomTimes.length>=12)throw new Error('Room limit reached. Try again later.');a.roomTimes.push(now);this.save(a);}
 async cosmetic(id:string){if(!COSMETICS.some(c=>c.id===id))throw new Error('Unknown card back.');this.ctx.storage.transactionSync(()=>{const a=this.read(),before=a.profile,next=equipCosmetic(before,id);if(!next.owned.includes(id))throw new Error('Not enough online coins.');a.profile=next;this.save(a);if(next.coins!==before.coins)this.log({id:crypto.randomUUID(),matchId:null,kind:'cosmetic',chips:0,coins:next.coins-before.coins,xp:0,date:new Date().toISOString()});});return this.snapshot();}
 async reserve(matchId:string,room:string,ante:number,maximumHands=1){
  if(![1,5,7,9].includes(maximumHands))throw new Error('Invalid maximum exposure.');
  const amount=ante*maximumHands;
  if(!this.tiers().includes(ante))throw new Error('Invalid stake.');
  this.ctx.storage.transactionSync(()=>{const old=this.reservation(matchId);if(old){if(old.status==='reserved'&&old.amount===amount&&old.room===room)return;throw new Error('Entry is already closed.');}const a=this.read();if(a.profile.chips<amount)throw new Error('A player has insufficient chips.');a.profile.chips-=amount;this.save(a);this.saveReservation({matchId,room,amount,status:'reserved'});this.log({id:`reserve:${matchId}`,matchId,kind:'reserved',chips:-amount,coins:0,xp:0,date:new Date().toISOString()});});
 }
 async refund(matchId:string,room:string){this.ctx.storage.transactionSync(()=>{const r=this.reservation(matchId);if(r&&r.room!==room)throw new Error('Wrong room.');if(r&&r.status!=='reserved')return;const a=this.read(),amount=r?.amount??0;a.profile.chips+=amount;this.save(a);this.saveReservation({matchId,room,amount,status:'refunded'});this.log({id:`refund:${matchId}`,matchId,kind:'refunded',chips:amount,coins:0,xp:0,date:new Date().toISOString()});});}
 async settle(room:string,game:GameState,stake:number){
  // This method is RPC-only: neither the HTTP router nor sockets accept a game/result.
  this.ctx.storage.transactionSync(()=>{const a=this.read();if(!game.players.some(p=>p.id===a.id)||game.phase!=='finished')throw new Error('Invalid result.');if(this.ctx.storage.sql.exec('SELECT id FROM ledger WHERE id=?',`result:${game.id}`).toArray().length)return;
   const r=this.reservation(game.id);if(stake&&(!r||r.room!==room||r.amount!==stake||r.status!=='reserved'))throw new Error('No reserved entry.');
   const before=a.profile,next=grantResult(before,game,new Date().toISOString(),a.id),payout=stake?(game.winner===null?stake:game.winner===a.id?stake*game.players.length:0):0;
   next.chips+=payout;next.claimed=next.claimed.slice(-100);a.profile=next;this.save(a);if(r)this.saveReservation({...r,status:game.winner===null?'refunded':'settled'});
   this.log({id:`result:${game.id}`,matchId:game.id,kind:game.winner===null?'draw-refund':game.winner===a.id?'win':'completed',chips:next.chips-before.chips,coins:next.coins-before.coins,xp:next.xp-before.xp,date:new Date().toISOString()});
  });
 }
 async settleChampionship(room:string,match:Championship,game:GameState,stake:number,perHand=false){
  this.ctx.storage.transactionSync(()=>{
   const a=this.read();if(match.status!=='finished'||match.targetWins!==3||!match.winner||game.phase!=='finished'||game.winner!==match.winner||!game.players.some(p=>p.id===a.id)||match.standings.length!==game.players.length||!match.standings.every(p=>game.players.some(q=>q.id===p.id)&&p.wins===match.hands.filter(h=>h.winner===p.id).length)||match.standings.find(p=>p.id===match.winner)?.wins!==3)throw new Error('Invalid championship result.');
   if(this.ctx.storage.sql.exec('SELECT id FROM ledger WHERE id=?',`result:${match.id}`).toArray().length)return;
   const exposure=stake*(perHand?2*match.standings.length+1:1),committed=stake*(perHand?match.hands.filter(h=>h.winner!==null).length:1);
   if(committed>exposure)throw new Error('Invalid exposure.');
   const reservation=this.reservation(match.id);if(stake&&(!reservation||reservation.room!==room||reservation.amount!==exposure||reservation.status!=='reserved'))throw new Error('No reserved championship entry.');
   const before=a.profile,next=grantChampionshipResult(before,match,game,new Date().toISOString(),a.id);
   next.chips+=exposure-committed;
   if(match.winner===a.id)next.chips+=committed*match.standings.length;
   next.claimed=next.claimed.slice(-100);a.profile=next;this.save(a);
   if(reservation)this.saveReservation({...reservation,status:'settled'});
   this.log({id:`result:${match.id}`,matchId:match.id,kind:match.winner===a.id?'champion':'match-completed',chips:next.chips-before.chips,coins:next.coins-before.coins,xp:next.xp-before.xp,date:new Date().toISOString()});
  });
 }

}

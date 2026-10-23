import type {GameType} from '../game/playTypes';
import type {Championship} from '../game/championship';
import type {Action,Mode,PlayerView} from '../game/state';
import type {Profile} from '../progression/profile';
export interface LedgerEntry {id:string;matchId:string|null;kind:string;chips:number;coins:number;xp:number;date:string}
export interface AccountSnapshot {id:string;profile:Profile;reserved:number;reservations?:{matchId:string;room:string;amount:number}[];transactions:LedgerEntry[];stakeTiers:number[]}
export type RoomStatus='lobby'|'starting'|'playing'|'paused'|'between-hands'|'settling'|'finished'|'cancelling'|'cancelled'|'expired';
export type Presence='connecting'|'connected'|'reconnecting'|'disconnected'|'rejoined'|'left';
export type ConnectionState='connecting'|'connected'|'reconnecting'|'disconnected'|'rejoined'|'left'|'invalid'|'replaced';
export type SettlementStatus='pending'|'reserved'|'settling'|'settled'|'refunding'|'refunded'|'requires-reconciliation';
export interface SeatView {id:string;name:string;seat:number;ready:boolean;accepted:boolean;connected:boolean;disconnectedAt:number|null;presence:Presence;cancelConsent:boolean}
export interface ChatMessage {id:string;authorId:string;name:string;text:string;kind:'message'|'reaction';at:number}
export interface SystemEvent {id:string;kind:string;text:string;at:number}
export interface ReceiptStatus {requestId:string;status:'accepted'|'rejected'|'unknown';revision?:number;reason?:string}
export interface RoomSnapshot {
 gameType?:GameType;
 code:string;hostId:string;meId:string;status:RoomStatus;lifecycle:'lobby'|'active'|'paused'|'completed'|'cancelled'|'expired';mode:Mode;seats:number;stake:number;
 staking?:'championship'|'per-hand';committedHands?:number;pot?:number;maximumExposure?:number;
 roundId:string;revision:number;players:SeatView[];game:PlayerView|null;notice:string;deadline:number|null;
 championship:Championship|null;pausedFor:string|null;
 settlement:{status:SettlementStatus;attempts:number};cancelRequested:boolean;
 chat:ChatMessage[];systemEvents:SystemEvent[];
 allowed:{tap:boolean;draw:boolean;end:boolean;play:boolean};
}
export type RoomCommand =
 | {op:'action';requestId:string;matchId:string;handId:string;revision:number;action:Action}
 | {op:'ready';requestId:string;roundId:string;handId?:string;ready:boolean;acceptStake:boolean}
 | {op:'next-hand';requestId:string;roundId:string;handId:string}
 | {op:'choose-seat';requestId:string;roundId:string;seat:number}
 | {op:'chat';requestId:string;text:string}
 | {op:'reaction';requestId:string;reaction:'TAP!'|'Nice play'|'Well played'|'Good game'}
 | {op:'zero-stake'|'start'|'rematch'|'leave'|'cancel'|'consent-cancel'|'decline-cancel';requestId:string;roundId:string};
export type ServerMessage={type:'room';room:RoomSnapshot}|{type:'ack';requestId:string;revision:number}|{type:'error';requestId?:string;message:string;revision?:number}|{type:'replaced'}|{type:'left';room?:RoomSnapshot};
export interface ResumeResponse {departed?:boolean;room:RoomSnapshot;ticket:string;receipts:ReceiptStatus[]}

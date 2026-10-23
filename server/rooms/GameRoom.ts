import {QUICK_PLAY_ENTRY,type GameType} from '../../src/game/playTypes';
import {DurableObject} from 'cloudflare:workers';
import {createChampionship,applyChampionshipAction,nextChampionshipHand,cancelChampionship,type Championship} from '../../src/game/championship';
import {matches} from '../../src/game/cards';
import {playerView} from '../../src/game/view';
import type {GameState,Mode} from '../../src/game/state';
import type {ChatMessage,Presence,ReceiptStatus,RoomCommand,RoomSnapshot,RoomStatus,ServerMessage,SettlementStatus,SystemEvent} from '../../src/online/protocol';
import {secureShuffle} from '../secure-deck';
import {hashHex,token,verify,displayName} from '../security';
import type {Env} from '../env';
interface Seat {everConnected?:boolean;id:string;name:string;seat:number;ready:boolean;accepted:boolean;ticketHash:string;connectionId:string;disconnectedAt:number|null;presence:Presence;cancelConsent:boolean;chatTimes:number[];requestTimes:number[]}
interface RoomData {gameType?:GameType;staking?:'championship'|'per-hand';committedHands?:number;failureReason?:string;schemaVersion?:number;championship:Championship|null;code:string;hostId:string;status:RoomStatus;resumeStatus:'playing'|'between-hands'|null;mode:Mode;seats:number;stake:number;roundId:string;revision:number;players:Seat[];game:GameState|null;notice:string;idleAt:number;terminalAt:number|null;chat:ChatMessage[];systemEvents:SystemEvent[];cancelRequested:boolean;settlement:{status:SettlementStatus;attempts:number}}
interface Attachment {id:string;connectionId:string}
interface RequestRecord {fingerprint:string;revision:number;error?:string}
class RequestRateLimit extends Error {}
const CHAT_TTL=60*60*1000;
export function publicError(error:unknown){const message=error instanceof Error?error.message:'Server temporarily unavailable. Retry shortly.';if(/insufficient chips/i.test(message))return 'Insufficient chips. Play casual matches or choose a lower entry.';if(/not enough online coins/i.test(message))return 'Not enough coins. Complete matches to unlock this card back.';return /sql|sqlite|database|binding|stack|internal|poison|RPC|TypeError/i.test(message)||message.length>240?'Server temporarily unavailable. Your game is saved. Retry shortly.':message;}
export class GameRoom extends DurableObject<Env>{
 private queue:Promise<unknown>=Promise.resolve();
 constructor(ctx:DurableObjectState,env:Env){super(ctx,env);ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room (id INTEGER PRIMARY KEY CHECK(id=1),value TEXT NOT NULL)');ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY,value TEXT NOT NULL)');}
 private serial<T>(fn:()=>Promise<T>):Promise<T>{const next=this.queue.then(fn);this.queue=next.catch(()=>{});return next;}
 private read(){const row=this.ctx.storage.sql.exec<{value:string}>('SELECT value FROM room WHERE id=1').toArray()[0];if(!row)throw Error('Room unavailable. Check the invitation code.');return JSON.parse(row.value) as RoomData;}
 private save(s:RoomData){this.ctx.storage.sql.exec('INSERT OR REPLACE INTO room VALUES(1,?)',JSON.stringify(s));}
 private seat(s:RoomData,id:string){const p=s.players.find(p=>p.id===id);if(!p)throw Error('Your session does not own a seat in this room. Return to the room lobby.');return p;}
 private connected(p:Seat){return p.presence!=='left'&&this.ctx.getWebSockets().some(ws=>{const a=ws.deserializeAttachment() as Attachment|null;return a?.id===p.id&&a.connectionId===p.connectionId&&ws.readyState===1;});}
 private grace(){return Math.max(1000,Number(this.env.RECONNECT_GRACE_MS)||120000);}
 private idle(){return Math.max(10000,Number(this.env.ROOM_IDLE_MS)||1800000);}
 private retention(){return Math.max(1000,Number(this.env.ROOM_RETENTION_MS)||86400000);}
 private terminal(s:RoomData){return ['finished','cancelled','expired'].includes(s.status);}
 private event(s:RoomData,kind:string,text:string){s.systemEvents.push({id:crypto.randomUUID(),kind,text,at:Date.now()});s.systemEvents=s.systemEvents.slice(-50);}
 private commit(s:RoomData){s.revision++;this.save(s);}
 private transferHost(s:RoomData,force=false){const current=s.players.find(p=>p.id===s.hostId);if(!force&&current&&current.presence!=='left'&&(this.connected(current)||current.disconnectedAt!==null&&Date.now()-current.disconnectedAt<this.grace()))return;const next=[...s.players].filter(p=>this.connected(p)).sort((a,b)=>a.seat-b.seat)[0]??[...s.players].filter(p=>p.presence!=='left').sort((a,b)=>a.seat-b.seat)[0];if(next&&next.id!==s.hostId){s.hostId=next.id;this.event(s,'host',`${next.name} is now the host.`);}}
 private pause(s:RoomData){
  if(!s.game)return;
  const current=s.players.find(p=>p.id===s.game!.players[s.game!.current].id);
  const missing=(s.status==='between-hands'||s.resumeStatus==='between-hands')?s.players.find(p=>!this.connected(p)):s.players.find(p=>p.presence==='left')??(current&&!this.connected(current)?current:undefined);
  if(['playing','between-hands'].includes(s.status)&&missing){s.resumeStatus=s.status as 'playing'|'between-hands';s.status='paused';s.notice=`Waiting for ${missing.name} to reconnect. The hand and reserved chips are preserved.`;this.event(s,'pause',s.notice);}
  else if(s.status==='paused'&&!missing){s.status=s.resumeStatus??'playing';s.resumeStatus=null;s.notice='Your game has been restored.';if(s.stake&&s.settlement.status==='requires-reconciliation')s.settlement.status='reserved';this.event(s,'resume','All required players are back. Play can continue.');}
 }
 // Called inside the room queue. Initial reservation intent is persisted before RPCs.
 private async advanceCommitted(s:RoomData){
  if(!s.gameType||s.players.length!==s.seats||s.players.some(p=>!p.ready||!this.connected(p)||(s.status==='lobby'||s.staking==='per-hand')&&!p.accepted))return;
  if(s.status==='lobby'){await this.ctx.storage.setAlarm(Date.now()+2000);s.status='starting';s.settlement.status='pending';s.notice='All players committed. Dealing…';}
  else if(s.status==='between-hands'&&s.game&&s.championship){
   const next=nextChampionshipHand({match:s.championship,game:s.game},secureShuffle);
   if(s.staking==='per-hand'&&s.game.winner){const hands=(s.committedHands??1)+1;if(hands>2*s.seats+1)throw Error('Maximum exposure reached.');s.committedHands=hands;}
   s.game=next.game;s.championship=next.match;s.status='playing';s.notice=`Hand ${s.championship.handNumber}. ${s.game.players[s.game.current].name} starts.`;this.event(s,'hand',s.notice);
  }
 }
 private async arm(s:RoomData){
  const now=Date.now(),times:number[]=[];
  if(['starting','settling','cancelling'].includes(s.status))times.push(now+2000);
  else if(!this.terminal(s)){if(s.idleAt>now)times.push(s.idleAt);for(const p of s.players)if(p.disconnectedAt!==null&&p.disconnectedAt+this.grace()>now)times.push(p.disconnectedAt+this.grace());}
  if(s.chat.length)times.push(s.chat[0].at+CHAT_TTL);
  if(s.terminalAt!==null&&s.status!=='expired')times.push(s.terminalAt+this.retention());
  if(times.length)await this.ctx.storage.setAlarm(Math.max(now+100,Math.min(...times)));else await this.ctx.storage.deleteAlarm();
 }
 private expire(s:RoomData){
  s.status='expired';s.game=null;s.championship=null;s.chat=[];s.systemEvents=[];s.terminalAt=Date.now();s.notice='This room has expired. Return to Play to create a new table.';for(const p of s.players){p.ticketHash='';p.connectionId='';}this.ctx.storage.sql.exec('DELETE FROM requests');this.commit(s);
  for(const ws of this.ctx.getWebSockets()){const a=ws.deserializeAttachment() as Attachment|null;if(a&&s.players.some(p=>p.id===a.id))this.send(ws,{type:'room',room:this.snapshot(s,a.id)});try{ws.close(4004,'Room expired');}catch{}}
 }
 private snapshot(s:RoomData,id:string):RoomSnapshot{
  this.seat(s,id);const game=s.game?playerView(s.game,id):null,current=game?.players[game.current]?.id===id&&s.status==='playing';
  const absent=s.players.find(p=>p.presence==='left')??s.players.find(p=>!this.connected(p));
  return {gameType:s.gameType??(s.staking==='per-hand'?'custom':undefined),code:s.code,hostId:s.hostId,meId:id,status:s.status,lifecycle:s.status==='expired'?'expired':s.status==='cancelled'||s.status==='cancelling'?'cancelled':s.status==='finished'||s.status==='settling'?'completed':s.status==='paused'?'paused':s.status==='lobby'?'lobby':'active',mode:s.mode,seats:s.seats,stake:s.stake,staking:s.staking??'championship',committedHands:s.committedHands??(s.championship?1:0),pot:s.stake*(s.committedHands??(s.championship?1:0))*s.seats,maximumExposure:s.stake*(s.staking==='per-hand'?2*s.seats+1:1),roundId:s.roundId,revision:s.revision,
   players:s.players.map(p=>({id:p.id,name:p.name,seat:p.seat,ready:p.ready,accepted:p.accepted,connected:this.connected(p),disconnectedAt:p.disconnectedAt,presence:this.connected(p)?p.presence==='rejoined'?'rejoined':'connected':p.presence,cancelConsent:p.cancelConsent})),game,championship:s.championship??null,notice:s.notice,deadline:!this.terminal(s)?Math.min(s.idleAt,...s.players.filter(p=>p.disconnectedAt!==null&&p.presence!=='disconnected'&&p.presence!=='left').map(p=>p.disconnectedAt!+this.grace())):null,pausedFor:s.status==='paused'?absent?.name??null:null,settlement:{...s.settlement},cancelRequested:s.cancelRequested,
   chat:s.chat.filter(m=>m.at>Date.now()-CHAT_TTL).map(m=>({...m})),systemEvents:s.systemEvents.map(e=>({...e})),allowed:{tap:!!current&&!game!.tapped,draw:!!current&&game!.phase==='opening'&&!game!.hand.some(c=>matches(c,game!.active)),end:!!current&&game!.phase==='discard',play:!!current}};
 }
 private send(ws:WebSocket,message:ServerMessage){try{ws.send(JSON.stringify(message));}catch{/* Presence is recorded by close/error handlers. */}}
 private broadcast(s:RoomData){for(const ws of this.ctx.getWebSockets()){const a=ws.deserializeAttachment() as Attachment|null;if(a&&s.players.some(p=>p.id===a.id&&p.connectionId===a.connectionId&&p.presence!=='left'))this.send(ws,{type:'room',room:this.snapshot(s,a.id)});}}
 private newSeat(id:string,name:string,seat:number):Seat{return {id,name:displayName(name),seat,ready:false,accepted:false,ticketHash:'',connectionId:'',disconnectedAt:Date.now(),presence:'connecting',cancelConsent:false,chatTimes:[],requestTimes:[]};}
 async initialize(code:string,id:string,name:string,options:{mode:Mode;seats:number;stake:number;staking?:'championship'|'per-hand';gameType?:GameType}){return this.serial(async()=>{
  if(this.ctx.storage.sql.exec('SELECT id FROM room').toArray().length)throw Error('Room already exists.');
  if(options.stake!==0&&this.env.FUNDED_MATCHES_ENABLED!=='true')throw Error('Funded online matches are disabled. Choose zero-stake play.');
  const tiers=(this.env.STAKE_TIERS??'10,25,50').split(',').map(Number);if(!['traditional','chains'].includes(options.mode)||![2,3,4].includes(options.seats)||!(options.stake===0||tiers.includes(options.stake)))throw Error('Invalid room settings.');
  if(options.staking!==undefined&&!['championship','per-hand'].includes(options.staking))throw Error('Invalid staking format.');
  if(options.gameType!==undefined&&!['quick','custom'].includes(options.gameType))throw Error('Invalid game type.');
  if(options.gameType==='quick'&&(options.mode!=='traditional'||options.staking!=='championship'||![0,QUICK_PLAY_ENTRY].includes(options.stake)))throw Error('Quick Play uses Traditional rules and a fixed 25-chip championship buy-in.');
  if(options.gameType==='custom'&&options.staking!=='per-hand')throw Error('Custom Tables use equal hand antes.');
  const secret=token(),p=this.newSeat(id,name,0);p.ticketHash=await hashHex(secret);
  const s:RoomData={gameType:options.gameType,staking:options.staking??'championship',committedHands:0,schemaVersion:3,championship:null,code,hostId:id,status:'lobby',resumeStatus:null,mode:options.mode,seats:options.seats,stake:options.stake,roundId:crypto.randomUUID(),revision:1,players:[p],game:null,notice:'Share the invitation. Every player must be ready before the host starts.',idleAt:Date.now()+this.idle(),terminalAt:null,chat:[],systemEvents:[],cancelRequested:false,settlement:{status:'pending',attempts:0}};
  this.event(s,'join',`${p.name} created the room.`);await this.arm(s);this.save(s);return {room:this.snapshot(s,id),ticket:secret,receipts:[]};
 });}
 private receipts(id:string,pendingIds:string[]):ReceiptStatus[]{return pendingIds.slice(0,20).map(requestId=>{const row=this.ctx.storage.sql.exec<{value:string}>('SELECT value FROM requests WHERE id=?',`${id}:${requestId}`).toArray()[0];if(!row)return {requestId,status:'unknown'};const record=JSON.parse(row.value) as RequestRecord;return {requestId,status:record.error?'rejected':'accepted',revision:record.revision,reason:record.error};});}
 async join(id:string,name:string,resumeOnly=false,pendingIds:string[]=[]){return this.serial(async()=>{
  const s=this.read();await this.recover(s);if(s.status==='expired')throw Error('This room has expired. Return to Play to create a new table.');
  let p=s.players.find(p=>p.id===id);if(!p){if(resumeOnly)throw Error('This session cannot restore that seat. Use the original browser session.');if(s.status!=='lobby')throw Error('This championship has started.');if(s.players.length>=s.seats)throw Error('This room is full.');const seat=Array.from({length:s.seats},(_,i)=>i).find(i=>!s.players.some(p=>p.seat===i))!;p=this.newSeat(id,name,seat);s.players.push(p);s.players.sort((a,b)=>a.seat-b.seat);this.event(s,'join',`${p.name} joined seat ${seat+1}.`);s.notice=`${p.name} joined the lobby.`;}
  if(p.presence==='left'&&resumeOnly)return {departed:true,room:this.snapshot(s,id),ticket:'',receipts:this.receipts(id,pendingIds)};
  if(p.presence==='left'){p.cancelConsent=false;p.presence='connecting';p.disconnectedAt=Date.now();}
  const secret=token();p.ticketHash=await hashHex(secret);this.commit(s);await this.arm(s);
  const receipts=this.receipts(id,pendingIds);
  this.broadcast(s);return {room:this.snapshot(s,id),ticket:secret,receipts};
 });}
 private async openSocket(id:string,ticket:string){return this.serial(async()=>{
  const s=this.read();await this.recover(s);if(s.status==='expired')throw Error('This room has expired.');const p=this.seat(s,id);if(!p.ticketHash||!await verify(ticket,p.ticketHash))throw Error('Seat credentials expired or revoked. Restore the room with your original session.');
  const pair=new WebSocketPair(),connectionId=crypto.randomUUID(),returning=p.everConnected===true||p.connectionId!==''||p.presence==='left'||p.presence==='reconnecting'||p.presence==='disconnected';
  const old=this.ctx.getWebSockets().filter(ws=>(ws.deserializeAttachment() as Attachment|null)?.id===id);
  this.ctx.acceptWebSocket(pair[1]);pair[1].serializeAttachment({id,connectionId} satisfies Attachment);
  p.everConnected=true;p.connectionId=connectionId;p.disconnectedAt=null;p.presence=returning?'rejoined':'connected';s.notice=returning?`${p.name} rejoined. Their game is restored.`:`${p.name} connected.`;this.event(s,returning?'rejoin':'presence',s.notice);this.transferHost(s);this.pause(s);await this.advanceCommitted(s);this.commit(s);await this.recover(s);
  for(const ws of old){this.send(ws,{type:'replaced'});try{ws.close(4001,'Connected in another tab');}catch{}}
  await this.arm(s);this.broadcast(s);return new Response(null,{status:101,webSocket:pair[0],headers:{'Sec-WebSocket-Protocol':'pitapat.v1'}});
 });}
 async fetch(request:Request){return this.openSocket(request.headers.get('X-Pitapat-Account')??'',request.headers.get('X-Pitapat-Ticket')??'');}
 async webSocketMessage(ws:WebSocket,message:string|ArrayBuffer){return this.serial(async()=>{
  const a=ws.deserializeAttachment() as Attachment|null;if(!a)return;let requestId:string|undefined,s:RoomData|undefined,c:RoomCommand|undefined,authenticated=false;
  try{
   if(typeof message!=='string'||message.length>8192)throw Error('Invalid message.');c=JSON.parse(message) as RoomCommand;requestId=c.requestId;if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{8,100}$/.test(requestId))throw Error('Invalid action ID.');
   s=this.read();const p=this.seat(s,a.id);if(p.connectionId!==a.connectionId||p.presence==='left'||!p.ticketHash)throw Error('This connection is no longer active. Restore your seat.');authenticated=true;
   const now=Date.now();p.requestTimes=p.requestTimes.filter(t=>t>now-10000);if(p.requestTimes.length>=50)throw new RequestRateLimit('Too many requests. Wait a moment and retry.');p.requestTimes.push(now);this.save(s);await this.recover(s);
   const key=`${a.id}:${requestId}`,seen=this.ctx.storage.sql.exec<{value:string}>('SELECT value FROM requests WHERE id=?',key).toArray()[0];
   if(seen){const record=JSON.parse(seen.value) as RequestRecord;if(record.fingerprint!==JSON.stringify(c))throw Error('That action ID was already used.');this.send(ws,{type:'room',room:this.snapshot(s,a.id)});this.send(ws,record.error?{type:'error',requestId,message:record.error,revision:s.revision}:{type:'ack',requestId,revision:record.revision??s.revision});return;}
   if((s.status==='expired'||this.terminal(s)&&!['leave','rematch','chat','reaction'].includes(c.op)))throw Error(s.status==='expired'?'This room has expired.':'This championship has ended. Open a rematch or leave the table.');
   let leave=false;
   if(c.op==='chat'||c.op==='reaction'){
    p.chatTimes=p.chatTimes.filter(t=>t>now-10000);if(p.chatTimes.length>=4)throw Error('Chat is moving too quickly. Wait a few seconds.');
    const text=c.op==='reaction'?c.reaction:typeof c.text==='string'?c.text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim():'';
    if(!text||text.length>300)throw Error('Messages must contain 1–300 characters.');if(c.op==='reaction'&&!['TAP!','Nice play','Well played','Good game'].includes(text))throw Error('Choose an available reaction.');if(/https?:\/\/|www\./i.test(text))throw Error('Links and media are not supported in table chat.');
    p.chatTimes.push(now);s.chat.push({id:requestId,authorId:a.id,name:p.name,text,kind:c.op==='chat'?'message':'reaction',at:now});s.chat=s.chat.filter(m=>m.at>now-CHAT_TTL).slice(-40);
   }else if(c.op==='action'){
    if(s.status!=='playing'||!s.game||!s.championship||c.matchId!==s.roundId||c.handId!==s.game.id)throw Error(s.status==='paused'?`Waiting for ${this.snapshot(s,a.id).pausedFor??'a player'} to reconnect.`:'That move is no longer available. The table has been updated.');
    const result=applyChampionshipAction({game:s.game,match:s.championship},{actor:a.id,revision:c.revision,action:c.action},secureShuffle);if(!result.ok)throw Error(result.error==='This action is out of date.'?'That move is no longer available. The table has been updated.':result.error);
    if(result.state.match.status==='finished')await this.ctx.storage.setAlarm(now+2000);
    const previousLast=s.game.events.at(-1);s.game=result.state.game;s.championship=result.state.match;s.status=s.championship.status==='finished'?'settling':s.championship.status==='between-hands'?'between-hands':'playing';
    // Events created by this move are selected by the appended suffix, not by
    // card identities or a frontend prediction of effects.
    const previousIndex=previousLast?s.game.events.findIndex(e=>e.turn===previousLast.turn&&e.type===previousLast.type&&e.actor===previousLast.actor&&e.text===previousLast.text):-1;
    const appended=s.game.events.slice(previousIndex+1);
    for(const event of appended)if(['tap','action','penalty','win','stalemate'].includes(event.type))this.event(s,event.type,event.text);
    if(s.status==='between-hands'){for(const q of s.players){q.ready=false;if(s.staking==='per-hand')q.accepted=false;}s.notice=s.game.winner?`${s!.players.find(q=>q.id===s!.game!.winner)?.name} won hand ${s.championship.handNumber}. Ready for Next Hand.`:'Stalemate. Ready up to redeal; no victory awarded.';}
    if(s.status==='settling'){s.settlement.status='settling';s.notice='Your match result is saved. Chip settlement is pending.';this.event(s,'champion',`${s.championship.standings.find(p=>p.id===s!.championship!.winner)?.name} won the championship.`);}
    this.pause(s);
   }else{
    if(!('roundId'in c)||c.roundId!==s.roundId)throw Error('The championship changed. Review the current table.');
    if(c.op==='choose-seat'){
     if(s.status!=='lobby'||!Number.isInteger(c.seat)||c.seat<0||c.seat>=s.seats||s.players.some(q=>q.id!==a.id&&q.seat===(c as Extract<RoomCommand,{op:'choose-seat'}>).seat))throw Error('That seat is unavailable.');p.seat=c.seat;p.ready=false;p.accepted=false;s.players.sort((a,b)=>a.seat-b.seat);
    }else if(c.op==='ready'){
     if(!['lobby','between-hands'].includes(s.status))throw Error('The table is not ready yet. Waiting for players to reconnect.');if(s.status==='between-hands'&&c.handId!==s.game?.id)throw Error('That hand has changed.');if(typeof c.ready!=='boolean'||typeof c.acceptStake!=='boolean')throw Error('Invalid readiness.');if((s.status==='lobby'||s.staking==='per-hand')&&c.ready&&s.stake&&!c.acceptStake)throw Error('Accept the championship entry and cancellation terms first.');p.ready=c.ready;if(s.status==='lobby'||s.staking==='per-hand')p.accepted=c.ready&&(!s.stake||c.acceptStake);s.notice=`${p.name} is ${c.ready?'ready':'not ready'}.`;
    }else if(c.op==='zero-stake'){
     if(s.status!=='lobby')throw Error('Stake terms cannot change after reservation.');s.stake=0;for(const q of s.players){q.ready=false;q.accepted=false;}s.notice='Zero-stake championship selected. Every participant must confirm readiness again.';
    }else if(c.op==='start'){
     if(a.id!==s.hostId)throw Error('Only the host can start.');if(s.status!=='lobby'||s.players.length!==s.seats||s.players.some(q=>!q.ready||!q.accepted||!this.connected(q)))throw Error('Every seat must be occupied, connected and ready.');await this.ctx.storage.setAlarm(now+2000);s.status='starting';s.settlement.status='pending';s.notice='Starting the championship…';
    }else if(c.op==='next-hand'){
     if(a.id!==s.hostId)throw Error('Only the host can start the next hand.');if(s.status!=='between-hands'||!s.game||!s.championship||c.handId!==s.game.id||s.players.some(q=>!q.ready||(s!.staking==='per-hand'&&!q.accepted)||!this.connected(q)))throw Error('Every participant must be connected and ready for this hand.');const next=nextChampionshipHand({match:s.championship,game:s.game},secureShuffle);if(s.staking==='per-hand'&&s.game.winner){s.committedHands=(s.committedHands??1)+1;if(s.committedHands>2*s.seats+1)throw Error('Maximum exposure reached.');}s.game=next.game;s.championship=next.match;s.status='playing';s.notice=`Hand ${s.championship.handNumber}. ${s.game.players[s.game.current].name} starts.`;this.event(s,'hand',s.notice);
    }else if(c.op==='rematch'){
     if(a.id!==s.hostId||!['finished','cancelled'].includes(s.status))throw Error('Only the host can open a rematch after settlement.');s.status='lobby';if(this.env.FUNDED_MATCHES_ENABLED!=='true')s.stake=0;else if(s.gameType==='quick')s.stake=QUICK_PLAY_ENTRY;s.committedHands=0;s.roundId=crypto.randomUUID();s.game=null;s.championship=null;s.resumeStatus=null;s.terminalAt=null;s.failureReason=undefined;s.cancelRequested=false;s.settlement={status:'pending',attempts:0};for(const q of s.players){q.ready=false;q.accepted=false;q.cancelConsent=false;}s.notice='New championship. Review the entry and ready up again.';
    }else if(c.op==='cancel'||c.op==='consent-cancel'||c.op==='decline-cancel'){
     if(!['lobby','playing','paused','between-hands'].includes(s.status))throw Error('Settlement is in progress. Wait for confirmation.');
     if(c.op==='decline-cancel'){p.cancelConsent=false;s.cancelRequested=false;for(const q of s.players)q.cancelConsent=false;this.event(s,'cancellation',`${p.name} declined cancellation. Entries stay committed.`);}
     else if(s.stake&&s.championship){s.cancelRequested=true;p.cancelConsent=true;this.event(s,'cancellation',`${p.name} agreed to cancel and refund. Every participant must agree.`);if(s.players.every(q=>q.cancelConsent)){await this.ctx.storage.setAlarm(now+2000);s.status='cancelling';s.settlement.status='refunding';}}
     else{if(a.id!==s.hostId)throw Error('Only the host can close a casual table.');await this.ctx.storage.setAlarm(now+2000);s.status='cancelling';s.settlement.status='refunding';s.notice='The host cancelled this table.';}
    }else if(c.op==='leave'){
     if(['starting','settling','cancelling'].includes(s.status))throw Error('Settlement is pending. Wait for confirmation before leaving.');
     leave=true;p.ticketHash='';p.connectionId='';p.presence='left';p.disconnectedAt=now;p.ready=false;this.event(s,'leave',`${p.name} left voluntarily.`);
     if(s.stake&&s.championship&&!this.terminal(s)){s.cancelRequested=true;p.cancelConsent=true;s.resumeStatus=s.status==='between-hands'||s.resumeStatus==='between-hands'?'between-hands':'playing';s.status='paused';s.notice=`${p.name} left. Entries stay reserved. Cancellation requires every participant’s agreement.`;if(s.players.every(q=>q.cancelConsent)){await this.ctx.storage.setAlarm(now+2000);s.status='cancelling';s.settlement.status='refunding';}}
     else if(['playing','paused','between-hands'].includes(s.status)){await this.ctx.storage.setAlarm(now+2000);s.status='cancelling';s.notice=`${p.name} left. The casual championship is cancelled.`;}
     else{s.players=s.players.filter(q=>q.id!==a.id);if(!s.players.length){s.status='cancelled';s.terminalAt=now;}}
     this.transferHost(s,s.hostId===a.id);
    }else throw Error('Unknown room action.');
   }
   await this.advanceCommitted(s);s.idleAt=now+this.idle();s.revision++;this.ctx.storage.transactionSync(()=>{this.save(s!);this.ctx.storage.sql.exec('INSERT INTO requests VALUES(?,?)',key,JSON.stringify({fingerprint:JSON.stringify(c),revision:s!.revision} satisfies RequestRecord));});
   this.broadcast(s);this.send(ws,{type:'ack',requestId,revision:s.revision});
   if(['starting','settling','cancelling'].includes(s.status)){await this.recover(s);this.broadcast(s);}
   if(leave){this.send(ws,{type:'left'});try{ws.close(1000,'Left voluntarily');}catch{}}
   await this.arm(s);
  }catch(error){const message=publicError(error);if(s&&c&&requestId&&authenticated&&!(error instanceof RequestRateLimit)){const key=`${a.id}:${requestId}`;if(!this.ctx.storage.sql.exec('SELECT id FROM requests WHERE id=?',key).toArray().length){this.ctx.storage.transactionSync(()=>{this.save(s!);this.ctx.storage.sql.exec('INSERT INTO requests VALUES(?,?)',key,JSON.stringify({fingerprint:JSON.stringify(c),revision:s!.revision,error:message} satisfies RequestRecord));});}this.send(ws,{type:'room',room:this.snapshot(s,a.id)});}this.send(ws,{type:'error',requestId,message,revision:s?.revision});}
 });}
 private async recover(s:RoomData){
  if((s.schemaVersion??0)>3)throw Error('This room requires a newer server version. Retry after the update.');
  if(s.schemaVersion!==3){const legacy=s.schemaVersion!==2;s.chat??=[];s.systemEvents??=[];s.resumeStatus??=null;s.terminalAt??=this.terminal(s)?Date.now():null;s.cancelRequested??=false;s.settlement??={status:s.status==='finished'?'settled':s.status==='cancelled'?'refunded':s.stake&&s.championship?'reserved':'pending',attempts:0};s.players.forEach((p,i)=>{p.seat??=i;p.presence??=p.disconnectedAt===null?'connected':'reconnecting';p.cancelConsent??=false;p.chatTimes??=[];p.requestTimes??=[];});
   if(legacy){if(['playing','starting'].includes(s.status)){await this.ctx.storage.setAlarm(Date.now()+2000);s.status='cancelling';s.notice='The previous single-hand contract is cancelled and entries refunded.';}if(s.status==='lobby')for(const p of s.players){p.ready=false;p.accepted=false;}s.championship=null;}
   s.schemaVersion=3;this.commit(s);
  }
  if(s.status==='lobby'&&s.idleAt<=Date.now())this.expire(s);
  if(s.terminalAt!==null&&s.status!=='expired'&&s.terminalAt+this.retention()<=Date.now()&&!['settling','cancelling'].includes(s.status))this.expire(s);
  let changed=false;const now=Date.now(),chat=s.chat.filter(m=>m.at>now-CHAT_TTL);if(chat.length!==s.chat.length){s.chat=chat;changed=true;}
  if(!this.terminal(s)&&!['starting','settling','cancelling'].includes(s.status)){
   for(const p of s.players)if(!this.connected(p)&&p.presence!=='left'){if(p.disconnectedAt===null){p.disconnectedAt=now;p.presence='reconnecting';this.event(s,'disconnect',`${p.name} disconnected. Their seat is reserved.`);changed=true;}if(p.disconnectedAt+this.grace()<=now&&p.presence!=='disconnected'){p.presence='disconnected';changed=true;}}
   const before=s.status,host=s.hostId;this.pause(s);this.transferHost(s);if(before!==s.status||host!==s.hostId)changed=true;
   if(s.stake&&s.championship&&s.status==='paused'&&s.players.some(p=>p.disconnectedAt!==null&&p.disconnectedAt+this.grace()<=now)&&s.settlement.status!=='requires-reconciliation'){s.settlement.status='requires-reconciliation';s.notice='A player remains absent. Match and entries are preserved. Reconnect or request unanimous cancellation; no automatic forfeit or refund.';changed=true;}
  }
  if(changed)this.commit(s);
  if(s.status==='starting'){
   try{if(s.stake)for(const p of s.players)await this.env.ACCOUNTS.getByName(p.id).reserve(s.roundId,s.code,s.stake,s.staking==='per-hand'?2*s.seats+1:1);}
   catch(error){s.status='cancelling';s.settlement.status='refunding';s.failureReason=publicError(error);s.notice=`${s.failureReason} Any reserved entries will be returned.`;this.commit(s);}
   if(s.status==='starting'){const created=createChampionship({id:s.roundId,mode:s.mode,seed:0,players:s.players.map(p=>({id:p.id,name:p.name,bot:false}))},secureShuffle);s.game=created.game;s.championship=created.match;s.committedHands=1;s.status='playing';s.settlement.status=s.stake?'reserved':'pending';s.notice=s.stake?`${s.stake} chips reserved per player until championship completion.`:'Casual championship started.';this.event(s,'reserved',s.notice);s.idleAt=now+this.idle();this.pause(s);this.commit(s);}
  }
  if(s.status==='settling'&&s.game){
   try{s.settlement.attempts++;s.settlement.status='settling';this.commit(s);for(const p of s.game.players){const account=this.env.ACCOUNTS.getByName(p.id);if(s.championship)await account.settleChampionship(s.code,s.championship,s.game,s.stake,s.staking==='per-hand');else await account.settle(s.code,s.game,s.stake);}s.status='finished';s.settlement.status='settled';s.terminalAt=now;s.notice='Match rewards and chip pool confirmed by the ledger.';this.event(s,'settled',s.notice);this.commit(s);}
   catch{s.settlement.status='requires-reconciliation';s.notice='Your match result is saved. Settlement is delayed and will retry automatically.';this.commit(s);await this.ctx.storage.setAlarm(now+3000);}
  }
  if(s.status==='cancelling'){
   try{s.settlement.attempts++;s.settlement.status='refunding';this.commit(s);if(s.stake)for(const p of s.players)await this.env.ACCOUNTS.getByName(p.id).refund(s.roundId,s.code);s.status='cancelled';if(s.championship)s.championship=cancelChampionship(s.championship);s.settlement.status='refunded';s.terminalAt=now;s.notice=`${s.failureReason?s.failureReason+' ':''}Championship cancelled. Reserved entries are confirmed refunded; no incomplete-match reward.`;this.event(s,'refunded',s.notice);this.commit(s);}
   catch{s.settlement.status='requires-reconciliation';s.notice='Cancellation is saved. Refund confirmation is delayed and will retry automatically.';this.commit(s);await this.ctx.storage.setAlarm(now+3000);}
  }
 }
 async alarm(){return this.serial(async()=>{const s=this.read();try{
  await this.recover(s);const now=Date.now();
  if(!this.terminal(s)&&!['starting','settling','cancelling'].includes(s.status)){
   const expired=s.players.some(p=>p.disconnectedAt!==null&&p.disconnectedAt+this.grace()<=now);
   if(s.status==='lobby'){if(expired){s.players=s.players.filter(p=>p.disconnectedAt===null||p.disconnectedAt+this.grace()>now);this.transferHost(s);this.commit(s);}if(!s.players.length||s.idleAt<=now){this.expire(s);}}
   else if((expired||s.idleAt<=now)&&!(s.stake&&s.championship)){await this.ctx.storage.setAlarm(now+2000);s.status='cancelling';s.notice='The casual table expired after a disconnection or inactivity.';this.commit(s);await this.recover(s);}
   else if(s.idleAt<=now&&s.stake&&s.championship){s.status='paused';s.resumeStatus=s.game?.phase==='finished'?'between-hands':'playing';s.settlement.status='requires-reconciliation';s.notice='This funded table is inactive. Entries are preserved; unanimous cancellation is available.';this.commit(s);}
  }
  if(s.terminalAt!==null&&s.status!=='expired'&&s.terminalAt+this.retention()<=now&&!['settling','cancelling'].includes(s.status))this.expire(s);
  this.broadcast(s);await this.arm(s);
 }catch{await this.ctx.storage.setAlarm(Date.now()+3000);}});}
 async webSocketClose(ws:WebSocket){return this.serial(async()=>{
  const a=ws.deserializeAttachment() as Attachment|null;if(!a)return;const s=this.read();await this.recover(s);const p=s.players.find(p=>p.id===a.id);if(!p||p.connectionId!==a.connectionId||p.presence==='left')return;
  if(p.disconnectedAt===null){p.disconnectedAt=Date.now();p.presence='reconnecting';s.notice=`${p.name} disconnected. Their seat and game are preserved.`;this.event(s,'disconnect',s.notice);this.pause(s);this.commit(s);}
  // recover() can have observed the closed transport first. Its durable pause
  // still needs an alarm and a broadcast, even when presence is already marked.
  await this.arm(s);this.broadcast(s);try{ws.close(1000,'Connection closed');}catch{}
 });}

 async webSocketError(ws:WebSocket){await this.webSocketClose(ws);}
}

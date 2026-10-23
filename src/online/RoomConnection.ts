import {api,ApiError} from './api';
import type {ConnectionState,ResumeResponse,RoomCommand,RoomSnapshot,ServerMessage} from './protocol';
export interface PendingAction {command:RoomCommand;uncertain:boolean}
interface Callbacks {room:(room:RoomSnapshot,restored:boolean,animate:boolean)=>void;state:(state:ConnectionState)=>void;feedback:(message:string)=>void;pending:(pending:PendingAction[])=>void;left:()=>void}
// This class owns transport lifecycle only. It never predicts a card, turn,
// score or wallet outcome. Every reconnect first reconciles durable receipts.
export class RoomConnection {
 private socket:WebSocket|null=null;private timer:ReturnType<typeof setTimeout>|null=null;private stable:ReturnType<typeof setTimeout>|null=null;
 private generation=0;private attempts=0;private flight:Promise<void>|null=null;private disposed=false;private wanted=false;private first=true;private hadConnection=false;
 private code='';private room:RoomSnapshot|null=null;private pending=new Map<string,PendingAction>();private status:ConnectionState='disconnected';
 constructor(private callbacks:Callbacks){window.addEventListener('online',this.wake);window.addEventListener('offline',this.offline);document.addEventListener('visibilitychange',this.visible);}
 private setState(state:ConnectionState){this.status=state;if(!this.disposed)this.callbacks.state(state);}
 private publishPending(){try{sessionStorage.setItem(`pitapat.pending.${this.code}`,JSON.stringify([...this.pending.values()]));const departure=[...this.pending.values()].find(p=>p.command.op==='leave');if(departure)localStorage.setItem(`pitapat.departure.${this.code}`,JSON.stringify(departure));else localStorage.removeItem(`pitapat.departure.${this.code}`);}catch{/* Receipts still protect the current tab if session storage is unavailable. */}if(!this.disposed)this.callbacks.pending([...this.pending.values()]);}
 private loadPending(){this.pending.clear();try{const saved=JSON.parse(sessionStorage.getItem(`pitapat.pending.${this.code}`)||'[]') as PendingAction[];if(Array.isArray(saved))for(const p of saved.slice(0,20))if(p?.command&&typeof p.command.requestId==='string')this.pending.set(p.command.requestId,{command:p.command,uncertain:true});}catch{}try{const departure=JSON.parse(localStorage.getItem(`pitapat.departure.${this.code}`)||'null') as PendingAction|null;if(departure?.command?.op==='leave')this.pending.set(departure.command.requestId,{...departure,uncertain:true});}catch{}this.publishPending();}
 private clearTimers(){if(this.timer)clearTimeout(this.timer);if(this.stable)clearTimeout(this.stable);this.timer=null;this.stable=null;}
 private snapshot(next:RoomSnapshot,restored:boolean){if(this.room?.code===next.code&&next.revision<this.room.revision)return;const changed=this.room?.game?.id!==next.game?.id||this.room?.game?.revision!==next.game?.revision||this.room?.status!==next.status;this.room=next;if(!this.disposed)this.callbacks.room(next,restored,!restored&&changed);}
 async start(code:string,initial?:ResumeResponse){this.wanted=true;this.disposed=false;this.clearTimers();this.generation++;this.socket?.close();this.socket=null;this.code=code;this.room=null;this.attempts=0;this.hadConnection=false;this.loadPending();if(initial){this.snapshot(initial.room,true);this.open(initial.ticket,this.generation);}else await this.restore();}
 private async restore(){
  if(this.flight||!this.wanted||this.disposed)return this.flight;
  if(!navigator.onLine){this.setState('reconnecting');this.callbacks.feedback('Connection lost. Waiting for your network…');return;}
  const generation=++this.generation;this.clearTimers();const old=this.socket;this.socket=null;old?.close();this.setState(this.hadConnection?'reconnecting':'connecting');this.attempts++;
  const task=(async()=>{try{
   const response=await api<ResumeResponse>(`rooms/${this.code}/resume`,{pendingIds:[...this.pending.keys()]});if(this.disposed||generation!==this.generation)return;
   if(response.departed){this.pending.clear();this.publishPending();this.wanted=false;this.setState('left');this.callbacks.feedback('Your departure was confirmed. Your reserved tables remain available from your profile.');this.callbacks.left();return;}
   for(const receipt of response.receipts){const pending=this.pending.get(receipt.requestId);if(!pending)continue;if(receipt.status==='accepted'){this.pending.delete(receipt.requestId);}else if(receipt.status==='rejected'){this.pending.delete(receipt.requestId);this.callbacks.feedback(receipt.reason||'That action was rejected. The table is updated.');}else pending.uncertain=true;}
   this.publishPending();this.snapshot(response.room,true);this.open(response.ticket,generation);
  }catch(e){if(this.disposed||generation!==this.generation)return;if(e instanceof ApiError&&(e.status===401||e.status===403)){this.wanted=false;this.setState('invalid');this.callbacks.feedback('Your session expired or is invalid. Use your original browser session to restore this seat.');}else if(e instanceof ApiError&&e.status===400){this.wanted=false;this.setState('disconnected');this.callbacks.feedback(e.message);}else{this.callbacks.feedback('Connection lost. Reconnecting to your saved seat…');this.schedule();}}
  })();this.flight=task;try{await task;}finally{if(this.flight===task)this.flight=null;}
 }
 private open(ticket:string,generation:number){
  if(this.disposed||!this.wanted||generation!==this.generation)return;this.first=true;this.setState(this.hadConnection?'reconnecting':'connecting');
  const ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/rooms/${this.code}/socket`,['pitapat.v1',`ticket.${ticket}`]);this.socket=ws;
  this.timer=setTimeout(()=>{if(this.socket===ws&&this.first){this.callbacks.feedback('The server did not respond. Reconnecting…');ws.close();}},10000);
  ws.onmessage=e=>{if(this.socket!==ws||this.disposed)return;let m:ServerMessage;try{m=JSON.parse(e.data);}catch{return;}
   if(m.type==='room'){
    const restored=this.first;this.snapshot(m.room,restored);if(this.first){this.first=false;this.clearTimers();this.setState(this.hadConnection?'rejoined':'connected');if(this.hadConnection)this.callbacks.feedback(this.pending.size?'Your game is restored. Review the pending action before retrying.':'Your game has been restored.');this.hadConnection=true;this.stable=setTimeout(()=>{this.attempts=0;},5000);}
    if(m.room.status==='expired'){this.wanted=false;this.setState('disconnected');this.callbacks.feedback('This room has expired. Return to Play to create a new table.');}
   }else if(m.type==='ack'){this.pending.delete(m.requestId);this.publishPending();}
   else if(m.type==='error'){if(m.requestId)this.pending.delete(m.requestId);this.publishPending();this.callbacks.feedback(m.message);}
   else if(m.type==='replaced'){this.wanted=false;this.clearTimers();this.setState('replaced');this.callbacks.feedback('This seat is active in another tab. Retry here to take it back.');}
   else if(m.type==='left'){this.wanted=false;this.clearTimers();this.pending.clear();this.publishPending();this.setState('left');this.socket=null;ws.close();this.callbacks.left();}
  };
  ws.onclose=()=>{if(this.socket!==ws||this.disposed)return;this.socket=null;this.clearTimers();for(const p of this.pending.values())p.uncertain=true;this.publishPending();if(this.wanted){this.setState('reconnecting');this.callbacks.feedback('Connection lost. Reconnecting…');this.schedule();}};
  ws.onerror=()=>{/* Close drives one bounded retry path; never start a second socket here. */};
 }
 private schedule(){if(!this.wanted||this.disposed||this.timer)return;if(this.attempts>=8){this.setState('disconnected');this.callbacks.feedback('We could not reconnect. Your seat may still be reserved. Retry when your connection returns.');return;}const delay=Math.min(15000,500*2**Math.max(0,this.attempts-1))*(.75+Math.random()*.5);this.timer=setTimeout(()=>{this.timer=null;void this.restore();},delay);}
 send(command:RoomCommand){if(!this.socket||this.socket.readyState!==WebSocket.OPEN||!['connected','rejoined'].includes(this.status)){this.callbacks.feedback('You are not connected. Restore the table before sending an action.');return false;}if(this.pending.size>=20){this.callbacks.feedback('Review pending actions before sending more.');return false;}this.pending.set(command.requestId,{command,uncertain:false});this.publishPending();try{this.socket.send(JSON.stringify(command));return true;}catch{this.pending.get(command.requestId)!.uncertain=true;this.publishPending();this.socket.close();return false;}}
 retryPending(requestId:string){const pending=this.pending.get(requestId);if(pending?.uncertain)return this.send(pending.command);return false;}
 dismissPending(requestId:string){if(this.pending.get(requestId)?.uncertain){this.pending.delete(requestId);this.publishPending();}}
 retry(){this.wanted=true;this.attempts=0;this.clearTimers();void this.restore();}
 private wake=()=>{if(this.wanted&&!this.socket&&!this.flight){this.attempts=0;this.clearTimers();void this.restore();}};
 private offline=()=>{if(!this.wanted)return;this.clearTimers();for(const p of this.pending.values())p.uncertain=true;this.publishPending();this.setState('reconnecting');this.callbacks.feedback('Connection lost. Waiting for your network…');this.socket?.close();};
 private visible=()=>{if(document.visibilityState==='visible')this.wake();};
 stop(){this.wanted=false;this.generation++;this.clearTimers();const old=this.socket;this.socket=null;old?.close();this.pending.clear();this.publishPending();this.room=null;this.setState('left');}
 dispose(){this.disposed=true;this.wanted=false;this.generation++;this.clearTimers();this.socket?.close();this.socket=null;window.removeEventListener('online',this.wake);window.removeEventListener('offline',this.offline);document.removeEventListener('visibilitychange',this.visible);}
}

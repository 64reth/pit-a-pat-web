import {matches} from '../game/cards';
import type {PlayerView} from '../game/state';
import type {ConnectionState,RoomStatus} from '../online/protocol';
export function TurnStatus({view,viewer,connection='connected',status='playing',pausedFor,animate=false}:{view:PlayerView;viewer:string;connection?:ConnectionState;status?:RoomStatus;pausedFor?:string|null;animate?:boolean}){
 const connected=['connected','rejoined'].includes(connection),own=view.players[view.current]?.id===viewer&&status==='playing'&&view.phase!=='finished'&&connected;
 let title=own?'Your turn':`Waiting for ${view.players[view.current]?.name??'players'}`,hint=own?(view.phase==='discard'?'Discard another card or end turn':view.hand.some(c=>matches(c,view.active))?view.mode==='chains'?'Choose a matching card or chain':'Choose a matching card':'Draw one to end your turn'):`${view.players[view.current]?.name??'A player'} is playing`;
 if(!connected){title=connection==='invalid'?'Session expired':connection==='replaced'?'Connected in another tab':connection==='disconnected'?'Disconnected':connection==='connecting'?'Connecting':'Reconnecting';hint='Your table is saved. Actions resume after a fresh snapshot.';}
 else if(status==='paused'){title=`Waiting for ${pausedFor??'players'}`;hint='Play paused · your hand and standings are saved';}
 else if(status==='between-hands'){title=view.winner?`${view.players.find(p=>p.id===view.winner)?.name} won the hand`:'Stalemate';hint='Ready up for Next Hand';}
 else if(['settling','cancelling'].includes(status)){title=status==='settling'?'Result saved':'Cancellation saved';hint='Waiting for chip ledger confirmation';}
 else if(['finished','cancelled','expired'].includes(status)){title=status==='finished'?'Championship complete':status==='expired'?'Room expired':'Championship cancelled';hint='Review the confirmed result';}
 const last=[...view.events].reverse().find(e=>e.type!=='turn');
 return <div className={`table-status turn-feedback ${animate?'animate-turn':''}`} aria-live="polite" aria-atomic="true"><span className={`turn-chip ${own?'your-turn':''}`}><span className="live-dot"/>{title}</span><p>{hint}</p><span className={`last-table-action ${last?.type==='penalty'?'action-feedback':'visually-hidden'}`}>{last?.text??''}</span>{view.pendingAction&&status==='playing'&&<small className="championship-pending">{view.pendingAction==='draw-two'?'+2':view.pendingAction==='skip'?'SKIP':'REVERSE'} · End turn to activate</small>}</div>;
}

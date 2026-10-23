import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {RoomConnection} from './RoomConnection';import type {RoomSnapshot,ResumeResponse} from './protocol';
class Socket {
 static OPEN=1;static instances:Socket[]=[];readyState=1;sent:string[]=[];onmessage:((e:{data:string})=>void)|null=null;onclose:(()=>void)|null=null;onerror:(()=>void)|null=null;
 constructor(){Socket.instances.push(this);}send(data:string){this.sent.push(data);}close(){if(this.readyState===3)return;this.readyState=3;this.onclose?.();}message(data:unknown){this.onmessage?.({data:JSON.stringify(data)});}
}
const room=(revision:number)=>({code:'ABCDEFGH',revision,status:'playing',game:{id:'m:hand:1',revision:0},players:[]} as unknown as RoomSnapshot);
let storage:Map<string,string>,windowEvents:EventTarget,documentEvents:EventTarget,transport:RoomConnection|undefined;
let rooms:{room:RoomSnapshot;restored:boolean;animate:boolean}[],states:string[],feedback:string[],pending:unknown[];
function controller(){transport=new RoomConnection({room:(r,restored,animate)=>rooms.push({room:r,restored,animate}),state:s=>states.push(s),feedback:m=>feedback.push(m),pending:p=>{pending=p;},left:()=>{}});return transport;}
function initial(){return {room:room(1),ticket:'secret',receipts:[]} satisfies ResumeResponse;}
beforeEach(()=>{vi.useFakeTimers();Socket.instances=[];storage=new Map();windowEvents=new EventTarget();documentEvents=new EventTarget();Object.assign(documentEvents,{visibilityState:'visible'});vi.stubGlobal('window',windowEvents);vi.stubGlobal('document',documentEvents);vi.stubGlobal('location',{host:'local',protocol:'http:'});vi.stubGlobal('navigator',{onLine:true});vi.stubGlobal('localStorage',{setItem:(k:string,v:string)=>storage.set(k,v),getItem:(k:string)=>storage.get(k),removeItem:(k:string)=>storage.delete(k)});vi.stubGlobal('sessionStorage',{setItem:(k:string,v:string)=>storage.set(k,v),getItem:(k:string)=>storage.get(k)});vi.stubGlobal('WebSocket',Socket);rooms=[];states=[];feedback=[];pending=[];});
afterEach(()=>{transport?.dispose();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('online action uncertainty and reconnect transport',()=>{
 it('restores accepted receipts before enabling action retry, without optimistic state or retransmission',async()=>{
  const c=controller();await c.start('ABCDEFGH',initial());Socket.instances[0].message({type:'room',room:room(2)});
  c.send({op:'action',requestId:'accepted-action',matchId:'m',handId:'m:hand:1',revision:0,action:{type:'tap'}});expect(pending).toHaveLength(1);expect(rooms.at(-1)?.room.revision).toBe(2);
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({room:room(3),ticket:'fresh',receipts:[{requestId:'accepted-action',status:'accepted',revision:3}]}))));
  Socket.instances[0].close();await vi.advanceTimersByTimeAsync(700);expect(pending).toHaveLength(0);expect(Socket.instances).toHaveLength(2);Socket.instances[1].message({type:'room',room:room(4)});expect(rooms.at(-1)?.restored).toBe(true);expect(rooms.at(-1)?.animate).toBe(false);expect(Socket.instances[1].sent).toHaveLength(0);expect(states.at(-1)).toBe('rejoined');
 });
 it('unknown actions require explicit retry and reuse the exact request ID/payload',async()=>{
  const c=controller();await c.start('ABCDEFGH',initial());Socket.instances[0].message({type:'room',room:room(2)});const command={op:'next-hand' as const,requestId:'unknown-action',roundId:'m',handId:'m:hand:1'};c.send(command);
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({room:room(3),ticket:'fresh',receipts:[{requestId:'unknown-action',status:'unknown'}]}))));Socket.instances[0].close();await vi.advanceTimersByTimeAsync(700);Socket.instances[1].message({type:'room',room:room(4)});expect(pending).toEqual([{command,uncertain:true}]);expect(Socket.instances[1].sent).toEqual([]);c.retryPending(command.requestId);expect(Socket.instances[1].sent).toEqual([JSON.stringify(command)]);Socket.instances[1].message({type:'ack',requestId:command.requestId,revision:5});expect(pending).toHaveLength(0);
 });
 it('ignores stale revisions and suppresses stale turn animations on restored snapshots',async()=>{
  const c=controller();await c.start('ABCDEFGH',initial());Socket.instances[0].message({type:'room',room:room(9)});Socket.instances[0].message({type:'room',room:room(7)});expect(rooms.at(-1)?.room.revision).toBe(9);expect(rooms).toHaveLength(2);expect(rooms.at(-1)?.animate).toBe(false);
 });
 it('bounds automatic retries and coalesces network/visibility wakeups to one in-flight restore',async()=>{
  const fetch=vi.fn().mockRejectedValue(Error('offline'));vi.stubGlobal('fetch',fetch);const c=controller();await c.start('ABCDEFGH');await vi.advanceTimersByTimeAsync(200000);expect(fetch.mock.calls.length).toBe(8);expect(states.at(-1)).toBe('disconnected');
  let resolve:(value:Response)=>void=()=>{};fetch.mockImplementation(()=>new Promise<Response>(r=>{resolve=r;}));windowEvents.dispatchEvent(new Event('online'));documentEvents.dispatchEvent(new Event('visibilitychange'));expect(fetch.mock.calls.length).toBe(9);resolve(new Response(JSON.stringify(initial())));await vi.advanceTimersByTimeAsync(1);expect(Socket.instances).toHaveLength(1);
 });
 it('stops automatic reconnection after duplicate-tab replacement or voluntary leave',async()=>{
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const c=controller();await c.start('ABCDEFGH',initial());Socket.instances[0].message({type:'room',room:room(2)});Socket.instances[0].message({type:'replaced'});Socket.instances[0].close();await vi.advanceTimersByTimeAsync(60000);windowEvents.dispatchEvent(new Event('online'));expect(fetch).not.toHaveBeenCalled();expect(states.at(-1)).toBe('replaced');
 });
});

it('an acknowledged departure recovered after a lost response does not silently reconnect the seat',async()=>{
 const c=controller();await c.start('ABCDEFGH',initial());Socket.instances[0].message({type:'room',room:room(2)});c.send({op:'leave',requestId:'leave-accepted',roundId:'m'});
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({departed:true,room:room(3),ticket:'',receipts:[]}))));Socket.instances[0].close();await vi.advanceTimersByTimeAsync(700);expect(states.at(-1)).toBe('left');expect(pending).toHaveLength(0);expect(Socket.instances).toHaveLength(1);
});

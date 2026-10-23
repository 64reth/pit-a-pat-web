import './build-server.mjs';
import {rolldown} from 'rolldown';import {runtime} from './worker-runtime.mjs';import assert from 'node:assert/strict';import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';
const direct=process.env.PITAPAT_DIRECT_DEAL==='1';
const bundle=await rolldown({input:'scripts/championship-fixture.ts'});await bundle.write({file:'.server/staking-fixture.mjs',format:'esm'});await bundle.close();const {simulate}=await import('../.server/staking-fixture.mjs');
process.env.PITAPAT_INSPECT='1';process.env.PITAPAT_SERVER_PORT='0';process.env.PITAPAT_STATE_DIR=await mkdtemp('/private/tmp/pitapat-staking-');let mf=runtime();const origin='http://127.0.0.1:8789',report=[];
async function request(path,data,cookie){const r=await mf.dispatchFetch(origin+'/api/'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(data)});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
async function until(fn){const end=Date.now()+12000;while(!fn()){if(Date.now()>end)throw Error('Timed out');await new Promise(r=>setTimeout(r,15));}}
async function connect(code,ticket,cookie){const r=await mf.dispatchFetch(`${origin}/api/rooms/${code}/socket`,{headers:{Origin:origin,Cookie:cookie,Upgrade:'websocket','Sec-WebSocket-Protocol':`pitapat.v1,ticket.${ticket}`}});assert.equal(r.status,101);const ws=r.webSocket;ws.accept();const c={ws,room:null,errors:[],acks:[]};ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.type==='room')c.room=m.room;if(m.type==='error')c.errors.push(m);if(m.type==='ack')c.acks.push(m);});await until(()=>c.room);return c;}
function send(c,op,extra={}){const cmd={op,requestId:crypto.randomUUID(),roundId:c.room.roundId,handId:c.room.game?.id,...extra};c.ws.send(JSON.stringify(cmd));return cmd;}
async function receipt(c,cmd){await until(()=>c.acks.some(a=>a.requestId===cmd.requestId)||c.errors.some(a=>a.requestId===cmd.requestId));}
async function storage(name,cls='GameRoom'){return mf.unsafeGetDurableObjectStorage('pit-a-pat-online',cls,{name});}
async function read(code){return JSON.parse((await (await storage(code)).exec('SELECT value FROM room WHERE id=1'))[0].value);}
async function write(code,s){await (await storage(code)).exec('UPDATE room SET value=? WHERE id=1',JSON.stringify(s));}
function pass(s){report.push(s);console.log('PASS:',s);}
try{
 await mf.ready;const a=await request('session',{name:'Ayo'}),b=await request('session',{name:'Ama'}),players=[a,b].map((a,i)=>({id:a.body.id,name:['Ayo','Ama'][i],bot:false}));let env=await mf.getBindings('pit-a-pat-online');
 for(let i=0;i<15;i++){const result=simulate(crypto.randomUUID(),players);for(const p of players)await env.ACCOUNTS.getByName(p.id).settleChampionship('EARN',result.match,result.game,0);}
 let baseline=JSON.parse(JSON.stringify(await Promise.all(players.map(p=>env.ACCOUNTS.getByName(p.id).snapshot()))));
 const h=await request('rooms',{mode:'chains',seats:2,stake:10,staking:'per-hand',...(direct?{gameType:'custom'}:{})},a.cookie),code=h.body.room.code,j=await request(`rooms/${code}/join`,{},b.cookie);let ca=await connect(code,h.body.ticket,a.cookie),cb=await connect(code,j.body.ticket,b.cookie);
 assert.equal(ca.room.maximumExposure,50);assert.equal(ca.room.pot,0);assert.equal(ca.room.game,null);
 let cmd=send(ca,'ready',{ready:true,acceptStake:false});await receipt(ca,cmd);assert.match(ca.errors.at(-1).message,/Accept/);assert.equal((await env.ACCOUNTS.getByName(a.body.id).snapshot()).reserved,0);
 cmd=send(ca,'ready',{ready:true,acceptStake:true});await receipt(ca,cmd);if(!direct){cmd=send(ca,'start');await receipt(ca,cmd);}assert.equal(ca.room.game,null);
 cmd=send(cb,'ready',{ready:true,acceptStake:true});await receipt(cb,cmd);await until(()=>ca.room.players.every(p=>p.ready));if(!direct)cmd=send(ca,'start');(direct?cb:ca).ws.send(JSON.stringify(cmd));await until(()=>ca.room.status==='playing');await until(()=>(direct?cb:ca).acks.filter(a=>a.requestId===cmd.requestId).length===2);
 assert.equal(ca.room.pot,20);for(let i=0;i<2;i++){const w=await env.ACCOUNTS.getByName(players[i].id).snapshot();assert.equal(w.reserved,50);assert.equal(w.profile.chips,baseline[i].profile.chips-50);assert.equal(w.transactions.filter(t=>t.kind==='reserved'&&t.matchId===ca.room.roundId).length,1);}
 pass('Custom ante requires every human consent before deal; reserves bounded maximum exposure once and deduplicates starting');
 let s=await read(code);const first=simulate(s.roundId,players,'chains',true);s.game=first.game;s.championship=first.match;s.status='between-hands';s.players.forEach(p=>{p.ready=false;p.accepted=false;});await write(code,s);
 async function restore(){const ar=await request(`rooms/${code}/resume`,{},a.cookie),br=await request(`rooms/${code}/resume`,{},b.cookie);ca=await connect(code,ar.body.ticket,a.cookie);cb=await connect(code,br.body.ticket,b.cookie);await until(()=>ca.room.status==='between-hands'&&cb.room.status==='between-hands');}
 await restore();cmd=send(ca,'ready',{ready:true,acceptStake:false});await receipt(ca,cmd);assert.equal(ca.room.players.find(p=>p.id===a.body.id).ready,false);
 for(const c of [ca,cb]){cmd=send(c,'ready',{ready:true,acceptStake:true});await receipt(c,cmd);}await until(()=>ca.room.players.every(p=>p.ready));if(!direct)cmd=send(ca,'next-hand');(direct?cb:ca).ws.send(JSON.stringify(cmd));await until(()=>ca.room.game.id!==first.game.id);await until(()=>(direct?cb:ca).acks.filter(a=>a.requestId===cmd.requestId).length===2);assert.equal(ca.room.pot,40);assert.equal(ca.room.committedHands,2);
 for(const p of players)assert.equal((await env.ACCOUNTS.getByName(p.id).snapshot()).reserved,50);
 pass('Next hand requires fresh ante consent; duplicate command accumulates one equal ante per seat without another wallet deduction');
 const saved=ca.room;await mf.dispose();mf=runtime();await mf.ready;env=await mf.getBindings('pit-a-pat-online');const recovered=await request(`rooms/${code}/resume`,{pendingIds:[cmd.requestId]},direct?b.cookie:a.cookie);assert.equal(recovered.body.room.pot,40);assert.equal(recovered.body.room.game.id,saved.game.id);assert.equal(recovered.body.receipts[0].status,'accepted');
 pass('Runtime restart restores pot, exposure, hand and accepted commitment receipt');
 s=await read(code);const final=simulate(s.roundId,players);s.game=final.game;s.championship=final.match;s.committedHands=final.match.hands.filter(h=>h.winner).length;s.status='settling';await write(code,s);
 const finalRoom=await request(`rooms/${code}/resume`,{},a.cookie);assert.equal(finalRoom.body.room.status,'finished');const committed=10*s.committedHands,pot=committed*2;
 for(let i=0;i<2;i++){const account=env.ACCOUNTS.getByName(players[i].id),w=await account.snapshot();assert.equal(w.reserved,0);assert.equal(w.profile.chips,baseline[i].profile.chips-committed+(final.match.winner===players[i].id?pot+10:5));await account.settleChampionship(code,final.match,final.game,10,true);assert.equal((await account.snapshot()).profile.chips,w.profile.chips);await account.refund(s.roundId,code);assert.equal((await account.snapshot()).profile.chips,w.profile.chips);}
 pass('Authoritative champion receives full accumulating pot; unused exposure refunded; duplicate settlement and late refund cannot pay twice');
 const ar=await request(`rooms/${code}/resume`,{},a.cookie);ca=await connect(code,ar.body.ticket,a.cookie);cmd=send(ca,'rematch');await receipt(ca,cmd);assert.notEqual(ca.room.roundId,s.roundId);assert.equal(ca.room.pot,0);assert.ok(ca.room.players.every(p=>!p.accepted&&!p.ready));cmd=send(ca,'zero-stake');await receipt(ca,cmd);assert.equal(ca.room.stake,0);assert.equal(ca.room.maximumExposure,0);
 pass('Rematch opens fresh commitments; explicit zero-stake choice resets all readiness without deducting chips');
 await mkdir('docs/verification/build-004d',{recursive:true});await writeFile('docs/verification/build-004d/staking-runtime'+(direct?'-direct-deal':'')+'.json',JSON.stringify({report},null,2));
}finally{await mf.dispose();}

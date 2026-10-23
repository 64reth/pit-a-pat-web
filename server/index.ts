import type { Env } from './env';
import { displayName, hashHex, json, roomCode, token, validCode } from './security';
export { Account } from './accounts/Account';
import {publicError} from './rooms/GameRoom';
export { GameRoom } from './rooms/GameRoom';
const cookieName='pitapat_session';
async function identity(request:Request,env:Env){const cookie=request.headers.get('Cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1)??'';const [id,secret]=cookie.split('.');if(!/^[0-9a-f-]{36}$/.test(id??'')||!/^[0-9a-f]{64}$/.test(secret??''))return null;const account=env.ACCOUNTS.getByName(id);try{if(!await account.authenticate(secret))return null;return {id,account};}catch{return null;}}
function sameOrigin(request:Request){const origin=request.headers.get('Origin');if(!origin)return request.method==='GET'&&!request.headers.has('Upgrade');const url=new URL(request.url);if(origin===url.origin)return true;const from=new URL(origin);return ['127.0.0.1','localhost'].includes(url.hostname)&&['127.0.0.1','localhost'].includes(from.hostname)&&['5173','5174','8787'].includes(from.port);}
async function body(request:Request){const reader=request.body?.getReader();let text='',size=0;const decoder=new TextDecoder();if(reader)while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>4096){await reader.cancel();throw new Error('Request too large.');}text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();return JSON.parse(text) as Record<string,unknown>;}
export default {async fetch(request:Request,env:Env):Promise<Response>{
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/'))return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404});
 try{
  if(!sameOrigin(request))return json({error:'Origin not allowed.'},403);
  if(Number(request.headers.get('Content-Length')??0)>4096)return json({error:'Request too large.'},413);
  if(url.pathname==='/api/config'&&request.method==='GET')return json({fundedMatches:env.FUNDED_MATCHES_ENABLED==='true',environment:env.DEPLOYMENT_ENVIRONMENT});
  const who=await identity(request,env);
  if(url.pathname==='/api/session'&&request.method==='POST'){
   if(who)return json(await who.account.snapshot());const b=await body(request),id=crypto.randomUUID(),secret=token();const result=await env.ACCOUNTS.getByName(id).create(id,await hashHex(secret),displayName(b.name??'Player'));
   return json(result,201,{'Set-Cookie':`${cookieName}=${id}.${secret}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000${url.protocol==='https:'?'; Secure':''}`});
  }
  if(!who)return json({error:'Online session required.'},401);
  if(url.pathname==='/api/session'&&request.method==='GET')return json(await who.account.snapshot());
  if(url.pathname==='/api/profile'&&request.method==='POST'){const b=await body(request);return json(await who.account.rename(displayName(b.name)));}
  if(url.pathname==='/api/cosmetics'&&request.method==='POST'){const b=await body(request);if(typeof b.id!=='string')throw new Error('Choose a card back.');return json(await who.account.cosmetic(b.id));}
  if(url.pathname==='/api/rooms'&&request.method==='POST'){
   const b=await body(request);if(b.stake!==0&&env.FUNDED_MATCHES_ENABLED!=='true')return json({error:'Funded online matches are disabled on this staging environment. Choose zero-stake play.'},403);await who.account.permitRoom();const profile=await who.account.snapshot();const code=roomCode();
   const result=await env.ROOMS.getByName(code).initialize(code,who.id,profile.profile.name,{mode:b.mode as 'traditional'|'chains',seats:b.seats as number,stake:b.stake as number,staking:b.staking as 'championship'|'per-hand'|undefined,gameType:b.gameType as 'quick'|'custom'|undefined});return json(result,201);
  }
  const match=url.pathname.match(/^\/api\/rooms\/([A-Z2-9]{8})\/(join|resume|socket)$/);
  if(match&&validCode(match[1])){const room=env.ROOMS.getByName(match[1]);
   if(['join','resume'].includes(match[2])&&request.method==='POST'){const b=await body(request);const profile=await who.account.snapshot();const ids=Array.isArray(b.pendingIds)?b.pendingIds.filter((id):id is string=>typeof id==='string'&&/^[a-zA-Z0-9-]{8,100}$/.test(id)).slice(0,20):[];return json(await room.join(who.id,profile.profile.name,match[2]==='resume',ids));}
   if(match[2]==='socket'&&request.headers.get('Upgrade')?.toLowerCase()==='websocket'){
    const protocols=request.headers.get('Sec-WebSocket-Protocol')?.split(',').map(s=>s.trim())??[],ticket=protocols.find(p=>p.startsWith('ticket.'))?.slice(7);if(!protocols.includes('pitapat.v1')||!ticket||!/^[0-9a-f]{64}$/.test(ticket))return json({error:'Seat ticket required.'},403);const headers=new Headers(request.headers);headers.set('X-Pitapat-Account',who.id);headers.set('X-Pitapat-Ticket',ticket);return room.fetch(new Request(request,{headers}));
   }
  }
  if(url.pathname.startsWith('/api/rooms/'))return json({error:'Invitation invalid. Check the eight-character room code.'},400);
  return json({error:'That service is unavailable. Return to Play and retry.'},404);
 }catch(error){return json({error:publicError(error)},400);}
}} satisfies ExportedHandler<Env>;

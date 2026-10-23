import './build-server.mjs';
import {runtime} from './worker-runtime.mjs';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
process.env.PITAPAT_SERVER_PORT='0';process.env.PITAPAT_STATE_DIR=await mkdtemp('/private/tmp/pitapat-wallet-');
let mf=runtime();
const id=crypto.randomUUID(),other=crypto.randomUUID();
function game(id,winner,players){return {id,mode:'traditional',phase:'finished',winner,players:players.map(id=>({id,name:'Test',bot:false,hand:[],tapDeclaredTurn:0})),turns:10,revision:20,seed:0,current:0,deck:[],pile:[],events:[]};}
try{
 await mf.ready;let env=await mf.getBindings('pit-a-pat-online');let a=env.ACCOUNTS.getByName(id);await a.create(id,'0'.repeat(64),'Test');
 await assert.rejects(()=>a.cosmetic('hibiscus'));
 const earned=game(crypto.randomUUID(),id,[id,other]);await a.settle('CASUAL',earned,0);await a.settle('CASUAL',earned,0);let s=await a.snapshot();assert.equal(s.profile.chips,10);assert.equal(s.profile.games,1);
 const attempts=await Promise.allSettled([a.reserve('one','ROOM',10),a.reserve('two','ROOM',10)]);assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);s=await a.snapshot();assert.equal(s.profile.chips,0);assert.equal(s.reserved,10);const reserved=attempts[0].status==='fulfilled'?'one':'two';
 await mf.dispose();mf=runtime();await mf.ready;env=await mf.getBindings('pit-a-pat-online');a=env.ACCOUNTS.getByName(id);s=await a.snapshot();assert.equal(s.reserved,10);await a.refund(reserved,'ROOM');await a.refund(reserved,'ROOM');await assert.rejects(()=>a.reserve(reserved,'ROOM',10));assert.equal((await a.snapshot()).profile.chips,10);
 await a.refund('cancel-before-reserve','ROOM');await assert.rejects(()=>a.reserve('cancel-before-reserve','ROOM',10));
 const round=crypto.randomUUID();await a.reserve(round,'ROOM',10);const won=game(round,id,[id,other]);await a.settle('ROOM',won,10);await a.settle('ROOM',won,10);s=await a.snapshot();assert.equal(s.profile.chips,30);assert.equal(s.reserved,0);assert.equal(s.profile.games,2);
 await a.reserve('draw','ROOM',10);await a.settle('ROOM',game('draw',null,[id,other]),10);s=await a.snapshot();assert.equal(s.profile.chips,35);assert.equal(s.reserved,0);
 await a.settle('EARN',game(crypto.randomUUID(),id,[id,other]),0);const coins=(await a.snapshot()).profile.coins;await a.cosmetic('hibiscus');await a.cosmetic('hibiscus');s=await a.snapshot();assert.equal(s.profile.coins,coins-60);assert.equal(s.profile.equipped,'hibiscus');
 console.log('PASS: actual SQLite wallets survive runtime restart; idempotent rewards, concurrent overspend prevention, duplicate refunds, delayed reservation rejection, winner pool, draw refund');
}finally{await mf.dispose();}

import {describe,it,expect} from 'vitest';
import {freshProfile} from './profile';
import {prepareLocalTable,prepareQuickPlay,commitQuickPlay,startLocalHand,continueLocalTable,commitLocalAnte,settleLocalTable,refundLocalTable,LOCAL_BOT_STARTING_CHIPS} from './staking';
import {applyChampionshipAction} from '../game/championship';
import {chooseBotAction} from '../game/bots';
import {playerView} from '../game/view';
const players=[{id:'you',name:'You',bot:false},{id:'bot-0',name:'Ama',bot:true}];
function draft(chips=100){return {...freshProfile(),chips,localTable:prepareQuickPlay('traditional',players)};}
describe('local tabletop commitment state machine',()=>{
 it('separates game type from ruleset and never deals during preparation or confirmation',()=>{
  const p=draft();expect(p.localTable.state).toBeNull();expect(p.chips).toBe(100);expect(startLocalHand(p)).toBe(p);
  const paid=commitQuickPlay(p);expect(paid.chips).toBe(75);expect(paid.localBots?.['bot-0']).toBe(LOCAL_BOT_STARTING_CHIPS-25);expect(paid.localTable?.pot).toBe(50);expect(paid.localTable?.state).toBeNull();expect(paid.localTable?.status).toBe('ready-to-deal');
  const dealt=startLocalHand(paid);expect(dealt.localTable?.state?.game.players.every(p=>p.hand.length===5)).toBe(true);expect(startLocalHand(dealt)).toBe(dealt);expect(commitQuickPlay(paid)).toBe(paid);expect(p.chips).toBe(100);
  expect(prepareLocalTable('quick','chains',players,50).mode).toBe('traditional');expect(prepareLocalTable('quick','chains',players,50).entry).toBe(25);expect(prepareLocalTable('custom','chains',players,10).mode).toBe('chains');
 });
 it('rejects insufficient human or bot chips atomically and supports explicit zero stakes',()=>{
  const p=draft(0);expect(()=>commitQuickPlay(p)).toThrow(/Insufficient/);expect(p.localTable.state).toBeNull();
  const lowBot={...draft(),localBots:{'bot-0':0}};expect(()=>commitQuickPlay(lowBot)).toThrow(/Ama/);expect(lowBot.chips).toBe(100);
  const free=commitQuickPlay(p,true);expect(free.chips).toBe(0);expect(free.localTable?.pot).toBe(0);expect(free.localTable?.state).toBeNull();expect(free.localTable?.status).toBe('ready-to-deal');
 });
 it('recovers a commitment before dealing and refunds cancellation once',()=>{
  const p=JSON.parse(JSON.stringify(commitQuickPlay(draft())));expect(commitQuickPlay(p)).toBe(p);
  const refunded=refundLocalTable(p);expect(refunded.chips).toBe(100);expect(refunded.localBots?.['bot-0']).toBe(LOCAL_BOT_STARTING_CHIPS);expect(refundLocalTable(refunded)).toBe(refunded);
 });
 for(const type of ['quick','custom'] as const)for(const mode of ['traditional','chains'] as const)it(`${type}/${mode}: runs the actual championship through consent, Continue, and one final settlement`,()=>{
  const ante=type==='quick'?25:10,reserved=type==='quick'?25:50;
  let p=startLocalHand(commitQuickPlay({...freshProfile(),chips:100,localTable:prepareLocalTable(type,mode,players,ante)})),steps=0,hands=0;
  while(p.localTable!.state!.match.status!=='finished'&&steps++<5000){
   const state=p.localTable!.state!;expect(p.chips).toBe(100-reserved);
   if(state.match.status==='between-hands'){
    hands++;const before=JSON.parse(JSON.stringify(p));p=continueLocalTable(p);
    if(type==='custom'){
     expect(p.localTable?.status).toBe('awaiting-ante');expect(p.localTable?.state?.game.id).toBe(before.localTable.state.game.id);expect(startLocalHand(p)).toBe(p);
     const committed=commitLocalAnte(p);expect(committed.localTable?.pot).toBe(before.localTable.pot+(state.game.winner?ante*2:0));expect(commitLocalAnte(committed)).toBe(committed);p=startLocalHand(committed);
    }else expect(p.localTable?.state?.match.status).toBe('playing');
    expect(p.localTable?.state?.match.handNumber).toBe(before.localTable.state.match.handNumber+1);expect(p.localTable?.state?.match.id).toBe(before.localTable.state.match.id);continue;
   }
   const actor=state.game.players[state.game.current].id,result=applyChampionshipAction(state,{actor,revision:state.game.revision,action:chooseBotAction(playerView(state.game,actor))});expect(result.ok).toBe(true);if(result.ok)p={...p,localTable:{...p.localTable!,state:result.state}};
  }
  expect(hands).toBeGreaterThan(0);const t=p.localTable!,winner=t.state!.match.winner;expect(t.state!.match.status).toBe('finished');const settled=settleLocalTable(p),used=t.commitments.you;
  expect(settled.chips).toBe(100-used+(winner==='you'?t.pot+10:5));expect(settled.localBots?.['bot-0']).toBe(1000-used+(winner==='bot-0'?t.pot:0));expect(settleLocalTable(settled)).toBe(settled);expect(refundLocalTable(p).localTable?.status).toBe('settled');
  const rematch={...settled,localTable:prepareLocalTable(type,mode,players,ante)};expect(rematch.localTable.id).not.toBe(t.id);expect(rematch.localTable.state).toBeNull();expect(rematch.chips).toBe(settled.chips);
 });
 it('never funds a server account from a local starting balance',()=>{expect(freshProfile().chips).toBe(0);});
});

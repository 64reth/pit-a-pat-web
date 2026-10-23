import { describe, expect, it } from 'vitest';
import { makeDeck } from './cards';
import { createGame, applyAction } from './engine';
import { playerView } from './view';
import { chooseBotAction } from './bots';
import type { Action, GameState, Mode } from './state';
import { equipCosmetic, freshProfile, grantResult } from '../progression/profile';
const card=(id:string)=>makeDeck().find(c=>c.id===id)!;
const base=(mode:Mode='traditional',count=2,seed=1)=>createGame({id:'test',mode,seed,players:Array.from({length:count},(_,i)=>({id:i===0?'you':`bot-${i}`,name:`Player ${i}`,bot:true}))});
function action(s:GameState,a:Action):GameState {const r=applyAction(s,{actor:s.players[s.current].id,revision:s.revision,action:a});if(!r.ok)throw new Error(r.error);return r.state;}
function fixture(hand:string[],active='A-hearts',mode:Mode='traditional') {const s=base(mode);s.players[0].hand=hand.map(card);s.pile=[card(active)];s.deck=[card('9-clubs'),card('10-spades')];return s;}
function assertDeck(s:GameState) {const all=[...s.deck,...s.pile,...s.players.flatMap(p=>p.hand)];expect(all).toHaveLength(52);expect(new Set(all.map(c=>c.id)).size).toBe(52);}

describe('approved card rules',()=>{
 it('deals 52 unique cards deterministically for 2–4 seats',()=>{for(const n of [2,3,4]){const a=base('traditional',n);expect(a.players.every(p=>p.hand.length===5)).toBe(true);expect(a.deck).toHaveLength(51-5*n);expect(base('traditional',n)).toEqual(a);assertDeck(a);}});
 it('rejects out of turn, stale, foreign, duplicate, empty and illegal plays without mutation',()=>{
  const s=fixture(['J-hearts','4-spades']);const original=structuredClone(s);
  for(const cmd of [{actor:'bot-1',revision:0,action:{type:'tap'}},{actor:'you',revision:99,action:{type:'tap'}},{actor:'you',revision:0,action:{type:'play',cards:['4-spades']}},{actor:'you',revision:0,action:{type:'play',cards:['K-clubs']}},{actor:'you',revision:0,action:{type:'play',cards:[]}},{actor:'you',revision:0,action:{type:'play',cards:['J-hearts','J-hearts']}}] as Parameters<typeof applyAction>[1][]) expect(applyAction(s,cmd).ok).toBe(false);
  expect(s).toEqual(original);
 });
 it('allows rank or suit matches, optional free discard and voluntary ending',()=>{
  let s=fixture(['J-hearts','4-spades','Q-clubs']);s=action(s,{type:'play',cards:['J-hearts']});expect(s.phase).toBe('discard');expect(s.current).toBe(0);
  const stopped=action(s,{type:'end'});expect(stopped.current).toBe(1);
  s=action(s,{type:'play',cards:['4-spades']});expect(s.pile.at(-1)?.id).toBe('4-spades');expect(s.current).toBe(1);
  const rank=fixture(['A-clubs','4-spades']);expect(action(rank,{type:'play',cards:['A-clubs']}).phase).toBe('discard');
 });
 it('draws only when blocked; drawing ends turn and TAP persists',()=>{
  let s=fixture(['4-spades']);s=action(s,{type:'tap'});s=action(s,{type:'draw'});expect(s.players[0].hand).toHaveLength(2);expect(s.current).toBe(1);expect(s.players[0].tapDeclaredTurn).toBe(1);expect(playerView(s,'you').tapped).toBe(true);
  expect(applyAction(fixture(['J-hearts']),{actor:'you',revision:0,action:{type:'draw'}}).ok).toBe(false);
 });
 it('keeps TAP across rotations and accepts victory on a later turn',()=>{
  let s=action(fixture(['J-hearts','J-clubs']),{type:'tap'});
  s=action(s,{type:'play',cards:['J-hearts']});s=action(s,{type:'end'});
  s.players[1].hand=[card('2-clubs')];s=action(s,{type:'draw'});
  expect(s.current).toBe(0);expect(s.turns).toBe(3);expect(playerView(s,'you').tapEligible).toBe(true);
  s=JSON.parse(JSON.stringify(s));
  s=action(s,{type:'play',cards:['J-clubs']});expect(s.winner).toBe('you');
  expect(s.events.at(-1)).toMatchObject({type:'win',turn:3});
  expect(applyAction(s,{actor:'you',revision:s.revision,action:{type:'tap'}}).ok).toBe(false);
 });
 for(const path of ['opening','discard','chain'] as const) for(const declaration of ['missing','same-turn','advance'] as const) it(`${path}: ${declaration} TAP is enforced when hand empties`,()=>{
  let s=fixture(path==='opening'?['J-hearts']:path==='discard'?['J-hearts','4-spades']:['J-hearts','J-clubs','4-clubs'],'A-hearts',path==='chain'?'chains':'traditional');
  if(declaration==='advance'){s.players[0].tapDeclaredTurn=1;s.turns=3;}
  if(path==='discard')s=action(s,{type:'play',cards:['J-hearts']});
  if(declaration==='same-turn')s=action(s,{type:'tap'});
  const ids=path==='chain'?['J-hearts','J-clubs','4-clubs']:path==='discard'?['4-spades']:['J-hearts'];
  s=action(s,{type:'play',cards:ids});
  if(declaration==='advance'){expect(s.winner).toBe('you');expect(s.phase).toBe('finished');}
  else {expect(s.winner).toBeNull();expect(s.phase).toBe('opening');expect(s.current).toBe(1);expect(s.players[0].hand).toHaveLength(1);expect(s.events.some(e=>e.type==='penalty')).toBe(true);}
 });
 it('uses a monotonic turn number across 2–4 seats and resets declarations on rematch',()=>{
  for(const seats of [2,3,4]){
   let s=base('traditional',seats);s.players.forEach(p=>{p.hand=[card('4-spades')];});s.pile=[card('A-hearts')];s.deck=Array.from({length:8},()=>card('9-clubs'));
   s=action(s,{type:'tap'});const declared=s.turns;
   for(let n=0;n<seats;n++)s=action(s,{type:'draw'});
   expect(s.current).toBe(0);expect(s.turns).toBe(seats+1);expect(s.players[0].tapDeclaredTurn).toBe(declared);expect(playerView(JSON.parse(JSON.stringify(s)),'you').tapEligible).toBe(true);
   expect(base('traditional',seats).players.every(p=>p.tapDeclaredTurn===null)).toBe(true);
  }
 });
 it('does not let a late TAP rewrite its declaration turn or another player use it',()=>{
  let s=action(fixture(['J-hearts']),{type:'tap'});
  expect(applyAction(s,{actor:'you',revision:s.revision,action:{type:'tap'}}).ok).toBe(false);
  s=action(s,{type:'play',cards:['J-hearts']});
  expect(playerView(s,s.players[1].id).tapped).toBe(false);expect(s.players[0].tapDeclaredTurn).toBe(1);
 });
 it('validates ordered Chains separately from Traditional',()=>{
  let s=fixture(['J-hearts','J-clubs','4-clubs'],'A-hearts','chains');
  expect(applyAction(s,{actor:'you',revision:0,action:{type:'play',cards:['J-hearts','4-clubs','J-clubs']}}).ok).toBe(false);
  s.players[0].tapDeclaredTurn=1;s.turns=3;s=action(s,{type:'play',cards:['J-hearts','J-clubs','4-clubs']});expect(s.winner).toBe('you');expect(s.pile.at(-1)?.id).toBe('4-clubs');
  expect(applyAction(fixture(['J-hearts','J-clubs']),{actor:'you',revision:0,action:{type:'play',cards:['J-hearts','J-clubs']}}).ok).toBe(false);
 });
 it('bots declare ahead and keep their last card until TAP is eligible',()=>{
  let s=fixture(['J-hearts','J-clubs']);expect(chooseBotAction(playerView(s,'you'))).toEqual({type:'tap'});
  s=action(s,{type:'tap'});s=action(s,{type:'play',cards:['J-hearts']});
  expect(chooseBotAction(playerView(s,'you'))).toEqual({type:'end'});
  s=fixture(['J-hearts','J-clubs'],'A-hearts','chains');s=action(s,{type:'tap'});
  const chain=chooseBotAction(playerView(s,'you'));expect(chain.type).toBe('play');
  if(chain.type==='play')expect(chain.cards).toHaveLength(1);
 });
 it('recycles without drawing the Active Card and maintains all 52 cards',()=>{
  const s=base();s.players[0].hand=[card('4-spades')];s.pile=[card('2-clubs'),card('A-hearts')];s.deck=[];
  const reserved=new Set([...s.players[0].hand,...s.pile].map(c=>c.id));s.players[1].hand=makeDeck().filter(c=>!reserved.has(c.id));
  const next=action(s,{type:'draw'});expect(next.pile).toEqual([card('A-hearts')]);expect(next.players[0].hand.at(-1)?.id).toBe('2-clubs');expect(next.events.some(e=>e.type==='recycle')).toBe(true);assertDeck(next);
 });
 it('ends true stalemates, but lets a blocked seat yield if another can play',()=>{
  let s=fixture(['4-spades']);s.deck=[];s.players[1].hand=[card('5-clubs')];expect(action(s,{type:'draw'}).phase).toBe('finished');
  s=fixture(['4-spades']);s.deck=[];s.players[1].hand=[card('5-hearts')];const next=action(s,{type:'draw'});expect(next.phase).toBe('opening');expect(next.current).toBe(1);
 });
 it('exposes only the viewer’s hand, public plays and counts; never seed or deck order',()=>{
  const s=base('traditional',4);const v=playerView(s,'you');expect(v.hand).toEqual(s.players[0].hand);expect(v.players.every(p=>!('hand' in p))).toBe(true);expect(v).not.toHaveProperty('deck');expect(v).not.toHaveProperty('seed');expect(v).not.toHaveProperty('pile');expect(playerView(s,'spectator').hand).toEqual([]);
  v.hand[0].rank='K';expect(s.players[0].hand[0]).not.toBe(v.hand[0]);
 });
 it('awards rewards once and independently from cards and balances',()=>{
  let s=fixture(['J-hearts']);s.players[0].tapDeclaredTurn=1;s.turns=3;s=action(s,{type:'play',cards:['J-hearts']});
  const before=structuredClone(s);const p=grantResult(freshProfile(),s,'2026-10-22');expect(p.coins).toBe(20);expect(p.chips).toBe(10);expect(p.xp).toBe(45);expect(grantResult(p,s,'2026-10-22')).toBe(p);expect(s).toEqual(before);
 });
});

it('spends coins once, never chips, and equips only owned or affordable cosmetics',()=>{
 const empty=freshProfile();expect(equipCosmetic(empty,'hibiscus')).toBe(empty);expect(equipCosmetic(empty,'unknown')).toBe(empty);
 const funded={...empty,coins:100,chips:50};const purchased=equipCosmetic(funded,'hibiscus');expect(purchased.coins).toBe(40);expect(purchased.chips).toBe(50);expect(equipCosmetic(purchased,'hibiscus')).toBe(purchased);
 const reset=equipCosmetic(purchased,'botanical');expect(reset.coins).toBe(40);expect(reset.equipped).toBe('botanical');expect(equipCosmetic(reset,'hibiscus').coins).toBe(40);
});

describe('complete automated games',()=>{
 for(const mode of ['traditional','chains'] as const) for(const seats of [2,3,4]) it(`${mode}: ${seats} seats, 40 seeds, legal bots and conserved deck`,()=>{
  for(let seed=1;seed<=40;seed++){
   let s=base(mode,seats,seed);let steps=0;
   while(s.phase!=='finished' && steps++<1500){const bot=s.players[s.current];const v=playerView(s,bot.id);s=action(s,chooseBotAction(v));assertDeck(s);}
   if(s.winner){const winner=s.players.find(p=>p.id===s.winner)!;expect(winner.tapDeclaredTurn).not.toBeNull();expect(winner.tapDeclaredTurn!).toBeLessThan(s.turns);}
   expect(s.phase,`seed ${seed}`).toBe('finished');expect(steps).toBeLessThan(1500);expect(s.winner!==null || s.events.some(e=>e.type==='stalemate')).toBe(true);
  }
 });
});

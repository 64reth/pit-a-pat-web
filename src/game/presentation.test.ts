import {describe,it,expect} from 'vitest';
import {BOT_ROSTER,selectBotNames} from './botNames';
import {createGame,applyAction} from './engine';
import {makeDeck} from './cards';
import {playerView} from './view';
import type {GameState} from './state';
const card=(id:string)=>makeDeck().find(c=>c.id===id)!;
function activate(rank:'2'|'8'|'10',n=3){const s=createGame({id:'visual',seed:9,players:Array.from({length:n},(_,i)=>({id:`p${i}`,name:`P${i}`,bot:false}))});s.pile=[card('5-hearts')];s.players[0].hand=[card(`${rank}-hearts`),card('9-clubs')];s.deck=makeDeck().filter(c=>!s.pile.some(p=>p.id===c.id)&&!s.players.some(p=>p.hand.some(h=>h.id===c.id)));return s;}
function move(s:GameState,action:Parameters<typeof applyAction>[1]['action']){const r=applyAction(s,{actor:s.players[s.current].id,revision:s.revision,action});if(!r.ok)throw Error(r.error);return r.state;}
describe('confirmed action visuals',()=>{
 it('samples the approved roster uniquely and excludes the human name',()=>{for(let i=0;i<60;i++){const names=selectBotNames(3,' aMa ');expect(new Set(names).size).toBe(3);expect(names).not.toContain('Ama');expect(names.every(n=>BOT_ROSTER.includes(n as typeof BOT_ROSTER[number]))).toBe(true);}expect(selectBotNames(3,'You',()=>0)).not.toEqual(selectBotNames(3,'You',()=>.999));});
 for(const rank of ['2','8','10'] as const)it(`${rank}: activates only on finalization and exposes a public, stable visual identity`,()=>{const s=move(activate(rank),{type:'play',cards:[`${rank}-hearts`]});expect(s.lastAction).toBeUndefined();const ended=move(s,{type:'end'});expect(ended.lastAction?.card.id).toBe(`${rank}-hearts`);expect(ended.lastAction?.next).toBe(ended.players[ended.current].id);expect(ended.lastAction?.actor).toBe('p0');expect(ended.lastAction?.drawn).toBe(rank==='2'?2:0);const view=playerView(ended,'p0');expect(view.lastAction).toEqual(ended.lastAction);expect(view.players.every(p=>!('hand' in p))).toBe(true);const tap=move(ended,{type:'tap'});expect(tap.lastAction?.id).toBe(ended.lastAction?.id);});
 it('replacing an opening action with an ordinary discard never animates the opening action',()=>{const s=move(activate('2'),{type:'play',cards:['2-hearts']});s.players[0].hand.push(card('J-clubs'));const ended=move(s,{type:'play',cards:['9-clubs']});expect(ended.lastAction).toBeUndefined();});
 it('two-player Reverse skips the other player and returns to the actor without changing direction',()=>{const s=move(move(activate('10',2),{type:'play',cards:['10-hearts']}),{type:'end'});expect(s.current).toBe(0);expect(s.direction).toBe(1);expect(s.lastAction).toMatchObject({kind:'reverse',twoPlayerReverse:true,target:'p1',next:'p0',direction:1});});
 it('winning with an action card never activates its visual or penalty',()=>{const s=activate('2');s.players[0].hand=[card('2-hearts')];s.turns=3;s.players[0].tapDeclaredTurn=1;const won=move(s,{type:'play',cards:['2-hearts']});expect(won.phase).toBe('finished');expect(won.lastAction).toBeUndefined();});
});

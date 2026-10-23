import { makeDeck, matches, cardName } from './cards';
import { shuffle } from './deck';
import { isAdvanceTapEligible, validateAction } from './rules';
import type { Command, GameState, Mode, Transition } from './state';
export function createGame(config:{id:string; mode?:Mode; players:{id:string;name:string;bot:boolean}[]; seed:number; dealer?:number; startingPlayer?:number},shuffleCards:typeof shuffle=shuffle):GameState {
  if(config.players.length<2 || config.players.length>4) throw new Error('Choose 2–4 players.');
  if(new Set(config.players.map(p=>p.id)).size!==config.players.length) throw new Error('Player identities must be unique.');
  const shuffled=shuffleCards(makeDeck(),config.seed);
  const deck=shuffled.cards;
  const dealer=config.dealer??config.players.length-1,startingPlayer=config.startingPlayer??0;
  if(!Number.isInteger(dealer)||dealer<0||dealer>=config.players.length||!Number.isInteger(startingPlayer)||startingPlayer<0||startingPlayer>=config.players.length)throw new Error('Invalid dealer or starting seat.');
  const players=config.players.map(p=>({...p,hand:[] as ReturnType<typeof makeDeck>,tapDeclaredTurn:null}));
  for(let round=0;round<5;round++)for(let offset=0;offset<players.length;offset++)players[(startingPlayer+offset)%players.length].hand.push(deck.shift()!);
  return {id:config.id,mode:config.mode??'traditional',seed:shuffled.seed,revision:0,players,deck,pile:[deck.shift()!],
    direction:1,pendingAction:null,dealer,startingPlayer,current:startingPlayer,phase:'opening',winner:null,events:[{type:'turn',actor:players[startingPlayer].id,turn:1,text:`${players[startingPlayer].name} starts. Find your first match.`}],turns:1};
}
export function applyAction(previous:GameState,command:Command,shuffleCards:typeof shuffle=shuffle):Transition {
  if(!command || !command.action || !['play','draw','tap','end'].includes(command.action.type)) return {ok:false,error:'Unknown game action.'};
  if(command.action.type==='play' && (!Array.isArray(command.action.cards) || !command.action.cards.every(id=>typeof id==='string'))) return {ok:false,error:'Choose valid card identities.'};
  if(command.revision!==previous.revision) return {ok:false,error:'This action is out of date.'};
  const player=previous.players[previous.current];
  if(command.actor!==player.id) return {ok:false,error:'Wait for your turn.'};
  const error=validateAction({hand:player.hand,active:previous.pile.at(-1)!,mode:previous.mode,phase:previous.phase,tapped:player.tapDeclaredTurn!=null},command.action);
  if(error) return {ok:false,error};
  const s:GameState=structuredClone(previous);
  const p=s.players[s.current];
  const emit=(type:GameState['events'][number]['type'],text:string)=>s.events.push({type,actor:p.id,text,turn:s.turns});
  s.direction??=1;s.pendingAction??=null;
  function takeCard(recipient=p) {
    if(!s.deck.length && s.pile.length>1) {
      const active=s.pile.at(-1)!;
      const recycled=shuffleCards(s.pile.slice(0,-1),s.seed);
      s.deck=recycled.cards; s.seed=recycled.seed; s.pile=[active];
      emit('recycle','The deck is refreshed. The Active Card stays.');
    }
    const card=s.deck.shift();
    if(card) recipient.hand.push(card);
    return !!card;
  }
  function nextTurn(resolveAction=true) {
    const n=s.players.length;
    const step=(index:number,amount=1)=>(index+s.direction*amount+n*2)%n;
    let distance=1,drawnCount=0;
    const activating=resolveAction?s.pendingAction:null,affected=s.players[step(s.current)].id;
    if(resolveAction&&s.pendingAction==='reverse'){
      if(n===2){distance=2;emit('action',`${s.players[step(s.current)].name} skips a turn (10). ${p.name} plays again.`);}
      else{s.direction=s.direction===1?-1:1;emit('action','Direction reversed.');}
    }else if(resolveAction&&s.pendingAction==='draw-two'){
      const target=s.players[step(s.current)];let drawn=0;
      for(let i=0;i<2;i++)if(takeCard(target))drawn++;
      drawnCount=drawn;
      emit('action',`${target.name} draws ${drawn}${drawn<2?` of 2 (${2-drawn} unavailable)`:''} and misses a turn. No stacking.`);distance=2;
    }else if(resolveAction&&s.pendingAction==='skip'){
      emit('action',`${s.players[step(s.current)].name} skips a turn.`);distance=2;
    }
    s.pendingAction=null;
    s.phase='opening'; s.current=step(s.current,distance); s.turns+=distance;
    if(activating)s.lastAction={id:`${s.id}:action:${previous.revision+1}`,kind:activating,card:{...s.pile.at(-1)!},actor:p.id,target:activating==='reverse'&&n>2?s.players[s.current].id:affected,next:s.players[s.current].id,drawn:drawnCount,direction:s.direction,twoPlayerReverse:activating==='reverse'&&n===2};
    // With no recyclable cards, a blocked seat may yield to a seat that can play.
    const available=s.deck.length>0 || s.pile.length>1;
    const anyMatch=s.players.some(q=>q.hand.some(c=>matches(c,s.pile.at(-1)!)));
    if(!available && !anyMatch) { s.phase='finished'; emit('stalemate','No legal plays or cards to draw. This hand is a draw.'); }
    else s.events.push({type:'turn',actor:s.players[s.current].id,turn:s.turns,text:`${s.players[s.current].name}'s turn.`});
  }
  const a=command.action;
  if(a.type==='tap') { p.tapDeclaredTurn=s.turns; emit('tap',`${p.name} calls TAP on turn ${s.turns}. Eligible from their next turn; the declaration stays for this hand.`); }
  else if(a.type==='end') nextTurn();
  else if(a.type==='draw') { const drawn=takeCard(); emit('draw',drawn?`${p.name} draws one. Turn over.`:`${p.name} cannot draw and passes.`); nextTurn(false); }
  else {
    const played=a.cards.map(id=>p.hand.find(c=>c.id===id)!);
    p.hand=p.hand.filter(c=>!a.cards.includes(c.id)); s.pile.push(...played);
    const rank=played.at(-1)!.rank;s.pendingAction=rank==='2'?'draw-two':rank==='8'?'skip':rank==='10'?'reverse':null;
    emit('play',`${p.name} ${s.phase==='discard'?'discards':'plays'} ${played.map(cardName).join(' → ')}.`);
    if(!p.hand.length) {
      if(isAdvanceTapEligible(p.tapDeclaredTurn,s.turns)) { s.winner=p.id; s.phase='finished';s.pendingAction=null; emit('win',`${p.name} wins with advance TAP from turn ${p.tapDeclaredTurn}.`); }
      else { const drawn=takeCard(); emit('penalty',`${p.name} ${p.tapDeclaredTurn==null?'missed advance TAP':'emptied their hand before TAP became eligible'}. ${drawn?'Draw one penalty card.':'No penalty card available; the hand is a draw.'}`);
        if(drawn) nextTurn(); else {s.phase='finished';emit('stalemate','No penalty card available. This hand is a draw.');} }
    } else if(s.mode==='traditional' && s.phase==='opening') s.phase='discard';
    else nextTurn();
  }
  if(s.phase==='finished')s.pendingAction=null;
  s.events=s.events.slice(-200);
  s.revision++;
  return {ok:true,state:s};
}

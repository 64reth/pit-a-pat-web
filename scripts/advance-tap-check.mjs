import { enterLocal } from './browser-helpers.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
const origin=process.env.PITAPAT_URL||'http://127.0.0.1:5174';
const out='docs/verification/build-003f',results=[],errors=[];
try{
 for(const mode of ['traditional','chains'])for(const kind of ['same-turn','missing']){
  const mobile=mode==='chains';const page=await browser.newPage({viewport:{width:mobile?390:1440,height:mobile?844:900},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));await page.goto(origin,{waitUntil:'networkidle'});
  const plan=await page.evaluate(async({mode,kind})=>{
   const [{createGame,applyAction},{playerView},{chooseBotAction}]=await Promise.all([import('/src/game/engine.ts'),import('/src/game/view.ts'),import('/src/game/bots.ts')]);
   const players=[{id:'you',name:'You',bot:false},{id:'bot-0',name:'Ama',bot:true},{id:'bot-1',name:'Kofi',bot:true},{id:'bot-2',name:'Nia',bot:true}];
   for(let seed=1;seed<=1500;seed++){
    let state=createGame({id:'review',mode,seed,players}),penaltySeen=false;const actions=[];
    for(let step=0;step<350&&state.phase!=='finished';step++){
     const actor=state.players[state.current].id,v=playerView(state,actor);let action;
     if(actor==='you'&&!penaltySeen){
      action=chooseBotAction({...v,tapped:true,tapEligible:true});
      if(kind==='same-turn'&&!v.tapped&&action.type==='play'&&action.cards.length===v.hand.length)action={type:'tap'};
     }else action=chooseBotAction(v);
     const next=applyAction(state,{actor,revision:state.revision,action});if(!next.ok)throw new Error(next.error);
     const penalty=actor==='you'&&next.state.events.some(e=>e.actor==='you'&&e.turn===state.turns&&e.type==='penalty');
     if(actor==='you')actions.push({action,hand:v.hand.map(c=>c.id),active:v.active.id,turn:state.turns,penalty,eligible:v.tapEligible});
     penaltySeen||=penalty;state=next.state;
    }
    if(penaltySeen&&state.winner==='you'){
     crypto.getRandomValues=array=>{array[0]=seed;return array;};
     return {seed,actions,winner:state.winner,declaredTurn:state.players[0].tapDeclaredTurn,winningTurn:state.turns};
    }
   }
   throw new Error('No repeatable penalty then win found');
  },{mode,kind});
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('checkbox',{name:'Fast bots'}).check();await page.getByRole('button',{name:'Done',exact:true}).click();
  await enterLocal(page);await page.getByRole('button',{name:mode==='chains'?/^Chains/:/^Traditional/}).click();await page.getByRole('button',{name:'Start game',exact:true}).click();
  let penaltyCount=0,declared=false;
  for(const step of plan.actions){
   await page.locator('.turn-chip.your-turn').waitFor();
   assert.deepEqual(await page.locator('.playing-card').evaluateAll(els=>els.map(e=>e.dataset.cardId)),step.hand);
   const geometry=await page.evaluate(()=>{
    const piles=document.querySelector('.center-play').getBoundingClientRect();
    return [...document.querySelectorAll('.opponent')].every(el=>{const r=el.getBoundingClientRect();return r.right<=piles.x||r.x>=piles.right||r.bottom<=piles.y-4;});
   });assert.equal(geometry,true,`${mode} ${kind}: opponent/pile overlap during play`);
   const a=step.action;
   if(a.type==='tap'){
    await page.locator('.tap-button').click();declared=true;
    await page.getByText('TAP · NEXT TURN',{exact:true}).waitFor();
    assert.equal(await page.locator('.tap-button').isDisabled(),true);
    await page.screenshot({path:`${out}/${mode}-${kind}-tap-declared.png`,fullPage:true});
   } else if(a.type==='draw') await page.getByRole('button',{name:'Draw one',exact:true}).click();
   else if(a.type==='end') await page.getByRole('button',{name:'End turn',exact:true}).click();
   else {
    for(const id of a.cards)await page.locator(`[data-card-id="${id}"]`).click();
    await page.locator('.play-action').click();
   }
   if(step.penalty){
    penaltyCount++;assert.equal(await page.getByRole('button',{name:'Another hand',exact:true}).count(),0);
    await page.getByRole('status').filter({hasText:/penalty card/}).waitFor();
    assert.equal(await page.locator('.playing-card').count(),1);
    await page.screenshot({path:`${out}/${mode}-${kind}-penalty.png`,fullPage:true});
   }
  }
  await page.getByRole('button',{name:'Another hand',exact:true}).waitFor();assert.ok(penaltyCount>0);assert.ok(declared);assert.ok(plan.declaredTurn<plan.winningTurn);
  const profile=await page.evaluate(()=>JSON.parse(localStorage.getItem('pitapat.profile.v1')));assert.equal(profile.games,1);assert.equal(profile.wins,1);assert.equal(profile.coins,20);
  await page.screenshot({path:`${out}/${mode}-${kind}-advance-win.png`,fullPage:true});
  await page.getByRole('button',{name:'Another hand',exact:true}).click();await page.locator('.game-table').waitFor();
  assert.equal(await page.getByText('TAP READY',{exact:true}).count(),0);assert.equal(await page.locator('.opponent-tap:visible').count(),0);assert.equal(await page.locator('.tap-button').isEnabled(),true);
  if(kind==='same-turn'){
   if(mobile)await page.getByRole('button',{name:'Player & table',exact:true}).click();
   const panel=mobile?page.getByRole('dialog',{name:'Player & table'}):page.getByRole('complementary',{name:'Player and economy'});
   assert.deepEqual(await panel.locator('.table-balances strong').allTextContents(),['20','10']);
   await panel.getByText('45 / 100 XP',{exact:true}).waitFor();
   await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-earned-rewards.png`,fullPage:true});
   if(mobile)await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  }
  results.push({mode,kind,seed:plan.seed,penaltyCount,declaredTurn:plan.declaredTurn,winningTurn:plan.winningTurn,humanActions:plan.actions.length,profile:{games:profile.games,wins:profile.wins,coins:profile.coins}});await page.close();
 }
 assert.deepEqual(errors,[]);writeFileSync(`${out}/advance-tap-results.json`,JSON.stringify({results,pageErrors:errors},null,2)+'\n');console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}

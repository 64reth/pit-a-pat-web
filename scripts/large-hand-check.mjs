import { enterLocal } from './browser-helpers.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const origin=process.env.PITAPAT_URL||'http://127.0.0.1:5174',out='docs/verification/build-003f';
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});await page.goto(origin,{waitUntil:'networkidle'});
 const plan=await page.evaluate(async()=>{
  const [{createGame,applyAction},{playerView},{chooseBotAction},{matches}]=await Promise.all([import('/src/game/engine.ts'),import('/src/game/view.ts'),import('/src/game/bots.ts'),import('/src/game/cards.ts')]);
  const players=[{id:'you',name:'You',bot:false},{id:'bot-0',name:'Ama',bot:true},{id:'bot-1',name:'Kofi',bot:true},{id:'bot-2',name:'Nia',bot:true}];
  for(let seed=1;seed<5000;seed++){
   let s=createGame({id:'review',seed,players});const actions=[];
   for(let step=0;step<400&&s.phase!=='finished';step++){
    const actor=s.players[s.current].id,v=playerView(s,actor);
    if(actor==='you'&&v.hand.length>=9){crypto.getRandomValues=array=>{array[0]=seed;return array;};return {seed,actions,count:v.hand.length};}
    let a;
    if(actor!=='you')a=chooseBotAction(v);
    else if(v.phase==='discard')a={type:'end'};
    else{const card=v.hand.find(c=>matches(c,v.active));a=card?{type:'play',cards:[card.id]}:{type:'draw'};}
    if(actor==='you')actions.push(a);
    const next=applyAction(s,{actor,revision:s.revision,action:a});if(!next.ok)throw new Error(next.error);s=next.state;
   }
  }
  throw new Error('No natural large-hand deal found');
 });
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('checkbox',{name:'Fast bots'}).check();await page.getByRole('button',{name:'Done',exact:true}).click();await enterLocal(page);await page.getByRole('button',{name:'Start game',exact:true}).click();
 for(const a of plan.actions){await page.locator('.turn-chip.your-turn').waitFor();if(a.type==='end')await page.getByRole('button',{name:'End turn',exact:true}).click();else if(a.type==='draw')await page.getByRole('button',{name:'Draw one',exact:true}).click();else{for(const id of a.cards)await page.locator(`[data-card-id="${id}"]`).click();await page.locator('.play-action').click();}}
 await page.locator('.turn-chip.your-turn').waitFor();assert.equal(await page.locator('.playing-card').count(),plan.count);await page.locator('.hand-cards.long-hand').waitFor();
 for(const [width,height] of [[1440,900],[390,844],[320,740],[844,390]]){
  await page.setViewportSize({width,height});
  const hand=page.getByRole('group',{name:'Your cards',exact:true});await hand.focus();await hand.press('End');
  await page.locator('.playing-card').last().scrollIntoViewIfNeeded();
  await page.locator('.playing-card').last().click();
  assert.equal(await page.locator('.playing-card').last().getAttribute('aria-pressed'),'true');
  const metric=await page.evaluate(()=>{const hand=document.querySelector('.hand-cards'),last=hand.lastElementChild.getBoundingClientRect(),actions=document.querySelector('.action-buttons').getBoundingClientRect();return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,scrollLeft:hand.scrollLeft,last:{x:last.x,right:last.right,bottom:last.bottom},actions:{y:actions.y,bottom:actions.bottom}};});
  assert.ok(metric.scrollHeight<=height&&metric.scrollWidth<=width);assert.ok(metric.last.x>=0&&metric.last.right<=width);assert.ok(metric.actions.bottom<=height);
  await page.screenshot({path:`${out}/${width}x${height}-large-hand.png`,fullPage:true});await page.locator('.playing-card').last().click();
 }
 console.log(JSON.stringify({seed:plan.seed,count:plan.count,humanActions:plan.actions.length,viewports:4,selectionAndScroll:'passed'}));
}finally{await browser.close();}

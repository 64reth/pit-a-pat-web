import { enterLocal } from './browser-helpers.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const origin=process.env.PITAPAT_URL||'http://127.0.0.1:5174';
const browser=await chromium.launch({channel:'chrome',headless:true});
const output=process.env.PITAPAT_ARTIFACT_DIR||'docs/verification/build-003b';
try {
 const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'});
 // Repeatable deal through the normal game creation path; no game-state replacement.
 await page.goto(origin,{waitUntil:'networkidle'});
 await page.evaluate(async()=>{
  const {createGame}=await import('/src/game/engine.ts');
  for(let seed=1;seed<1000;seed++){
   const state=createGame({id:'review',seed,players:['you','bot-0','bot-1','bot-2'].map(id=>({id,name:id,bot:id!=='you'}))});
   const cards=[...state.players[0].hand,...state.pile];
   if(cards.some(c=>c.rank==='A')&&cards.some(c=>['J','Q','K'].includes(c.rank))&&cards.some(c=>/^[2-9]$|^10$/.test(c.rank))){
    crypto.getRandomValues=array=>{array[0]=seed;return array;};return;
   }
  }
  throw new Error('No mixed ace/court/number deal found');
 });
 await enterLocal(page);
 await page.getByRole('button',{name:'Start game',exact:true}).click();
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
 await page.screenshot({path:`${output}/desktop-active-game.png`,fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:`${output}/mobile-active-game.png`,fullPage:true});
 await page.setViewportSize({width:1560,height:1180});
 const summary=await page.evaluate(async()=>{
  const [{default:React},{default:ReactDOM},{CardFace,CardBack},{makeDeck}]=await Promise.all([import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),import('/src/components/Card.tsx'),import('/src/game/cards.ts')]);
  const h=React.createElement;
  const host=document.createElement('main');document.body.replaceChildren(host);
  Object.assign(host.style,{display:'grid',gridTemplateColumns:'repeat(13, 1fr)',gap:'12px',padding:'24px',background:'#e8e5d9'});
  ReactDOM.createRoot(host).render(h('div',{style:{display:'contents'}},...makeDeck().map(card=>h('figure',{key:card.id,'data-review-id':card.id,style:{margin:0}},h('div',{style:{aspectRatio:'1 / 1.58',borderRadius:'7px',overflow:'hidden'}},h(CardFace,{card})),h('figcaption',{style:{fontSize:'11px',textAlign:'center',padding:'5px'}},card.id))),h('div',{style:{width:'110px',height:'174px'}},h(CardBack))));
  return makeDeck().length;
 });
 await page.locator('[data-review-id]').last().waitFor();
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
 assert.equal(summary,52);assert.equal(await page.locator('[data-review-id]').count(),52);
 for(const card of await page.locator('[data-review-id]').all()){
  const id=await card.getAttribute('data-review-id');
  const rank=id.split('-')[0];
  if(!['A','J','Q','K'].includes(rank))assert.equal(await card.locator('.number-art > g > path').count(),Number(rank),`${id} pip count`);
 }
 await page.screenshot({path:`${output}/full-deck.png`,fullPage:true});
 console.log('52 unique cards rendered; all 36 number-card pip counts correct; desktop, mobile and full-deck screenshots saved.');
}finally{await browser.close();}

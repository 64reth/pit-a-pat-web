import { enterLocal } from './browser-helpers.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
const origin=process.env.PITAPAT_URL||'http://127.0.0.1:5174';
const out='docs/verification/build-003f',results=[];
const errors=[];
async function layout(page,label){
 const m=await page.evaluate(()=>{
  const box=s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r?{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}:null;};
  const buttons=[...document.querySelectorAll('.action-buttons button')].map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};});
  return {buttons,width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,table:box('.game-page'),header:box('.game-topline'),piles:box('.center-play'),status:box('.table-status'),hand:box('.hand-area'),actions:box('.action-buttons'),opponents:[...document.querySelectorAll('.opponent')].map(el=>{const r=el.getBoundingClientRect();return {x:r.x,right:r.right,bottom:r.bottom};}),cards:[...document.querySelectorAll('.playing-card')].map(c=>{const r=c.getBoundingClientRect();return {x:r.x,right:r.right,bottom:r.bottom,y:r.y};})};
 });
 assert.ok(m.scrollWidth<=m.width&&m.scrollHeight<=m.height,`${label} page overflow ${JSON.stringify(m)}`);
 assert.ok(m.opponents.every(o=>o.right<=m.piles.x||o.x>=m.piles.right||o.bottom<=m.piles.y-4),`${label} opponents overlap piles ${JSON.stringify(m)}`);
 assert.ok(m.piles.y>=m.header.bottom+4,`${label} piles clipped above play area`);
 assert.ok(m.cards.every(c=>c.y>=m.header.bottom),`${label} hand clipped above play area`);
 assert.equal(m.table.width,m.width);assert.equal(m.table.height,m.height);
 assert.ok(m.piles.bottom<=m.status.y+1,`${label} piles/status overlap`);
 assert.ok(m.status.bottom<=m.hand.y+1||m.status.right<=m.hand.x+1,`${label} status/hand overlap`);
 assert.ok(m.buttons.every(b=>b.x>=0&&b.right<=m.width&&b.bottom<=m.height&&b.height>=44),`${label} controls clipped or too small`);
 assert.ok(m.cards.every(c=>m.buttons.every(b=>c.right<=b.x||c.x>=b.right||c.bottom<=b.y||c.y>=b.bottom)),`${label} cards overlap controls`);
 assert.ok(m.cards.every(c=>c.x>=0&&c.right<=m.width),`${label} cards outside viewport`);
 return m;
}
try{
 for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[1024,768],[768,1024],[390,844],[320,740],[390,667],[844,390]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin,{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  const hero=await page.evaluate(()=>{
   const panel=document.querySelector('.hero-art').getBoundingClientRect(),caption=document.querySelector('.art-tag').getBoundingClientRect();
   return [...document.querySelectorAll('.hero-card')].map(el=>{const r=el.getBoundingClientRect();return {left:r.left-panel.left,right:panel.right-r.right,top:r.top-panel.top,bottom:panel.bottom-r.bottom,captionGap:caption.top-r.bottom};});
  });assert.ok(hero.every(c=>Math.min(c.left,c.right,c.top,c.bottom)>=6&&c.captionGap>=6),`${width} hero card clipping ${JSON.stringify(hero)}`);
  await page.screenshot({path:`${out}/${width}x${height}-home.png`,fullPage:true});
  await enterLocal(page);await page.getByRole('button',{name:'Start game',exact:true}).click();
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
  const metrics=await layout(page,`${width}x${height}`);results.push({width,height,hero,metrics});
  await page.screenshot({path:`${out}/${width}x${height}-table.png`,fullPage:true});
  await page.close();
 }
 assert.deepEqual(errors,[]);writeFileSync(`${out}/layout-results.json`,JSON.stringify(results,null,2)+'\n');console.log(`Passed ${results.length} viewport layouts with no page errors.`);
}finally{await browser.close();}

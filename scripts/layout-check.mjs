import { enterLocal } from './browser-helpers.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const origin=process.env.PITAPAT_URL||'http://127.0.0.1:5174';
const browser=await chromium.launch({channel:'chrome',headless:true});
const summary=[];const violations=[];
try{
 for(const [width,height] of [[1920,1080],[1440,900],[1024,768],[768,1024],[390,844],[320,740]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  await page.goto(origin,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  for(const screen of ['home','setup','table']){
   if(screen==='setup')await enterLocal(page);
   if(screen==='table')await page.getByRole('button',{name:'Start game',exact:true}).click();
   await page.screenshot({path:`/private/tmp/pitapat-003b-${width}-${screen}.png`,fullPage:true});
   const metrics=await page.evaluate(()=>{
    const box=s=>{const el=document.querySelector(s);if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom}};
    return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,table:box('.game-table'),active:box('.center-play'),status:box('.table-status'),hand:box('.hand-area')};
   });
   assert.equal(metrics.overflow,false,`${width} ${screen}: horizontal overflow`);
   if(screen==='table'){
    if(metrics.active.bottom>metrics.status.y+3)violations.push({width,type:'active-status',delta:metrics.active.bottom-metrics.status.y});
    if(metrics.status.bottom>metrics.hand.y+3)violations.push({width,type:'status-hand',delta:metrics.status.bottom-metrics.hand.y});
   }
   summary.push({width,height,screen,...metrics});
  }
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto(origin,{waitUntil:'networkidle'});
 const art=await page.evaluate(async()=>{
  const manifest=await fetch('/assets/cards/orisha/manifest.json').then(r=>r.json());
  return Promise.all(manifest.cards.map(async c=>{const image=new Image();image.src=`/assets/cards/orisha/${c.file}`;await image.decode();return {id:c.id,name:c.name,width:image.naturalWidth,height:image.naturalHeight}}));
 });assert.equal(art.length,21);assert.equal(new Set(art.map(c=>c.id)).size,21);assert.ok(art.every(c=>c.width>=110&&c.height>=200));
 await page.setContent(`<html><head><style>body{margin:0;background:#e8e5d9;padding:28px;font-family:sans-serif}main{display:grid;grid-template-columns:repeat(6,1fr);gap:22px}img{width:100%;border-radius:8px}figure{margin:0}figcaption{text-align:center;font-size:12px;margin:8px}</style></head><body><main>${art.map(c=>`<figure><img src="${origin}/assets/cards/orisha/${c.id}.png"><figcaption>${c.id} · ${c.name}</figcaption></figure>`).join('')}</main></body></html>`);
 await page.locator('img').last().evaluate(img=>img.decode());await page.screenshot({path:'/private/tmp/pitapat-003b-court-review.png',fullPage:true});
 console.log(JSON.stringify({layouts:summary,art,violations},null,2));assert.deepEqual(violations,[]);
}finally{await browser.close()}

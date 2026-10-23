import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const origin=process.env.PITAPAT_URL||'http://127.0.0.1:5174',out='docs/verification/build-003f';
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],summary=[];
async function shot(page,name){await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name} overflow`);await page.screenshot({path:`${out}/${name}.png`,fullPage:true});}
try{
 for(const [width,height] of [[1440,900],[390,844],[320,740]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));await page.goto(origin,{waitUntil:'networkidle'});
  const fonts=await page.evaluate(()=>({body:getComputedStyle(document.body).fontFamily,heading:getComputedStyle(document.querySelector('h1')).fontFamily,button:getComputedStyle(document.querySelector('.hero-cta')).fontSize}));assert.match(fonts.body,/DM Sans/);assert.match(fonts.heading,/Barlow Condensed/);
  const copy=await page.locator('body').innerText();assert.doesNotMatch(copy,/Find your rhythm|winning hand|seat for you|Better company/i);
  await shot(page,`${width}-home`);
  await page.locator('.hero-cta').click();await shot(page,`${width}-play-selection`);
  await page.getByRole('button',{name:'Online play',exact:true}).click();await page.getByRole('heading',{name:'ONLINE PLAY',exact:true}).waitFor();
  await shot(page,`${width}-online`);assert.equal(await page.getByRole('button',{name:/create room|join room/i}).count(),2);
  await page.getByRole('button',{name:'Back to play',exact:true}).last().click();
  await page.getByRole('button',{name:'Local play',exact:true}).click();await shot(page,`${width}-setup`);
  await page.getByRole('button',{name:'Start game',exact:true}).click();await shot(page,`${width}-traditional`);
  if(width>1000){
   const sidebar=page.getByRole('complementary',{name:'Player and economy'});assert.equal(await sidebar.isVisible(),true);assert.match(await sidebar.innerText(),/Level 1/);assert.match(await sidebar.innerText(),/No|Complete a hand/);
   await sidebar.getByRole('button',{name:'Settings',exact:true}).click();
  }else{
   assert.equal(await page.getByRole('complementary',{name:'Player and economy'}).isVisible(),false);
   await page.getByRole('button',{name:'Player & table',exact:true}).click();await shot(page,`${width}-economy-sheet`);
   const sheet=page.getByRole('dialog',{name:'Player & table'});await sheet.getByRole('button',{name:'Settings',exact:true}).click();
  }
  await page.getByRole('checkbox',{name:'Reduced motion'}).check();await page.getByRole('checkbox',{name:'Fast bots'}).check();await shot(page,`${width}-settings`);await page.getByRole('button',{name:'Done',exact:true}).click();
  if(width>1000)await page.getByRole('complementary',{name:'Player and economy'}).getByRole('button',{name:'Game rules',exact:true}).click();else{await page.getByRole('button',{name:'Player & table',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Game rules',exact:true}).click();}
  await shot(page,`${width}-rules`);await page.getByRole('button',{name:'Close rules',exact:true}).click();
  if(width>1000)await page.getByRole('complementary',{name:'Player and economy'}).getByRole('button',{name:'New game',exact:true}).click();else{await page.getByRole('button',{name:'Player & table',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'New game',exact:true}).click();}
  await page.getByRole('dialog').getByRole('button',{name:'New game',exact:true}).click();await page.getByRole('button',{name:'Local play',exact:true}).click();await page.getByRole('button',{name:/^Chains/}).click();await page.getByRole('button',{name:'Start game',exact:true}).click();await shot(page,`${width}-chains`);
  if(width>1000)await page.getByRole('complementary',{name:'Player and economy'}).getByRole('button',{name:'Leave table',exact:true}).click();else{await page.getByRole('button',{name:'Player & table',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Leave table',exact:true}).click();}
  await page.getByRole('button',{name:'Leave hand',exact:true}).click();await page.getByRole('button',{name:'Your profile',exact:true}).click();await shot(page,`${width}-profile`);await page.getByRole('button',{name:'View collection',exact:true}).click();await shot(page,`${width}-collection`);await page.locator('.deck-gallery summary').click();assert.equal(await page.locator('.court-gallery figure').count(),12);await shot(page,`${width}-collection-courts`);
  summary.push({width,height,fonts,reviewed:['home','play-selection','online-availability','setup','traditional','chains','settings','rules','new-game-confirmation','profile','collection',width>1000?'desktop-sidebar':'mobile-sheet']});await page.close();
 }
 assert.deepEqual(errors,[]);writeFileSync(`${out}/interface-results.json`,JSON.stringify({summary,pageErrors:errors},null,2));console.log(JSON.stringify(summary,null,2));
}finally{await browser.close();}

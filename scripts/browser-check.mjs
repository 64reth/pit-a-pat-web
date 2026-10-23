import { enterLocal } from './browser-helpers.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[];
const results=[];
const origin=process.env.PITAPAT_URL||'http://127.0.0.1:5173';
async function noOverflow(page,label){const data=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(data.scroll<=data.width,`${label} overflow: ${JSON.stringify(data)}`);}
try {
 for(const scenario of [{name:'desktop-traditional',width:1440,height:1100,mode:'Traditional',players:4},{name:'mobile-chains',width:390,height:844,mode:'Chains',players:3}]){
  const context=await browser.newContext({viewport:{width:scenario.width,height:scenario.height},reducedMotion:'reduce',isMobile:scenario.width<700,hasTouch:scenario.width<700});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.setDefaultTimeout(10000);await page.goto(origin,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:`/private/tmp/pitapat-${scenario.name}-home.png`,fullPage:true});await noOverflow(page,`${scenario.name} home`);
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('checkbox',{name:'Fast bots'}).check();await page.getByRole('button',{name:'Done'}).click();
  await enterLocal(page);
  await page.getByRole('button',{name:scenario.mode==='Traditional'?/^Traditional/:/^Chains/}).click();
  for(let n=4;n>scenario.players;n--) await page.getByRole('button',{name:'Fewer players'}).click();
  await page.getByRole('button',{name:'Start game',exact:true}).click();
  await page.screenshot({path:`/private/tmp/pitapat-${scenario.name}-table.png`,fullPage:true});await noOverflow(page,`${scenario.name} table`);
  let steps=0,invalidChecked=false;
  while(!(await page.getByRole('button',{name:'Another hand',exact:true}).count()) && steps++<600){
   if(await page.locator('.turn-chip.your-turn').count()){
    const draw=page.getByRole('button',{name:'Draw one',exact:true});
    const discard=page.getByRole('button',{name:'End turn',exact:true});
    if(await draw.count()){await draw.click();continue;}
    const tap=page.getByRole('button',{name:'TAP',exact:true});
    if(await tap.count() && await tap.isEnabled()) await tap.click();
    if(await discard.count()){
     await page.locator('.playing-card').first().click();await page.getByRole('button',{name:'Discard card',exact:true}).click();continue;
    }
    if(!invalidChecked && scenario.mode==='Traditional' && await page.locator('.playing-card:not(.is-legal)').count()){
     await page.locator('.playing-card:not(.is-legal)').first().click();await page.getByRole('button',{name:'Play card',exact:true}).click();
     await page.getByRole('status').filter({hasText:'Match the Active Card by rank or suit.'}).waitFor();invalidChecked=true;
    }
    const legal=page.locator('.playing-card.is-legal:not(.is-selected)');
    if(await legal.count())await legal.first().click();
    if(scenario.mode==='Chains') for(let i=0;i<12;i++){const more=page.locator('.playing-card.is-legal:not(.is-selected)');if(!await more.count())break;await more.first().click();}
    const play=page.locator('.play-action');if(await play.isEnabled())await play.click();else throw new Error('No playable action');
   } else await page.waitForTimeout(100);
  }
  assert.ok(steps<600,'Game did not terminate through the UI');
  await page.getByRole('button',{name:'Another hand',exact:true}).waitFor();
  await page.screenshot({path:`/private/tmp/pitapat-${scenario.name}-results.png`,fullPage:true});await noOverflow(page,`${scenario.name} results`);
  const profile=await page.evaluate(()=>JSON.parse(localStorage.getItem('pitapat.profile.v1')));
  assert.equal(profile.games,1);assert.equal(profile.claimed.length,1);assert.ok(profile.coins>=12);assert.ok(profile.chips>=5);
  await page.getByRole('button',{name:'Another hand',exact:true}).click();await page.locator('.game-table').waitFor();
  if(scenario.width<1001){await page.getByRole('button',{name:'Player & table',exact:true}).click();}
  await page.getByRole('button',{name:'Leave table',exact:true}).click();await page.getByRole('button',{name:'Leave hand',exact:true}).click();
  await page.getByRole('button',{name:'Your profile',exact:true}).click();await page.getByRole('heading',{name:'PROFILE'}).waitFor();
  await noOverflow(page,`${scenario.name} profile`);await page.screenshot({path:`/private/tmp/pitapat-${scenario.name}-profile.png`,fullPage:true});
  await page.reload({waitUntil:'networkidle'});const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pitapat.profile.v1')));assert.equal(saved.games,1);assert.equal(saved.coins,profile.coins);
  await page.getByRole('button',{name:'Your profile',exact:true}).click();await page.getByRole('button',{name:'View collection'}).click();
  await page.getByRole('heading',{name:'COLLECTION'}).waitFor();await noOverflow(page,`${scenario.name} collection`);
  await page.screenshot({path:`/private/tmp/pitapat-${scenario.name}-collection.png`,fullPage:true});
  // Explicit local test fixture: coins are intentionally not a secure competitive balance.
  await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('pitapat.profile.v1'));p.coins=100;localStorage.setItem('pitapat.profile.v1',JSON.stringify(p));});
  await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'Your profile',exact:true}).click();await page.getByRole('button',{name:'View collection'}).click();
  const hibiscus=page.locator('.cosmetic-card').filter({has:page.getByRole('heading',{name:'Hibiscus',exact:true})});
  await hibiscus.getByRole('button',{name:'60 coins',exact:true}).click();
  await hibiscus.getByRole('button',{name:'Equipped',exact:true}).waitFor();
  let purchase=await page.evaluate(()=>JSON.parse(localStorage.getItem('pitapat.profile.v1')));assert.equal(purchase.coins,40);assert.equal(purchase.equipped,'hibiscus');assert.ok(purchase.owned.includes('hibiscus'));
  const botanical=page.locator('.cosmetic-card').filter({has:page.getByRole('heading',{name:'Botanical',exact:true})});await botanical.getByRole('button',{name:'Equip',exact:true}).click();
  await botanical.getByRole('button',{name:'Equipped',exact:true}).waitFor();purchase=await page.evaluate(()=>JSON.parse(localStorage.getItem('pitapat.profile.v1')));assert.equal(purchase.coins,40);assert.equal(purchase.equipped,'botanical');
  await page.reload({waitUntil:'networkidle'});purchase=await page.evaluate(()=>JSON.parse(localStorage.getItem('pitapat.profile.v1')));assert.equal(purchase.coins,40);assert.equal(purchase.equipped,'botanical');

  results.push({scenario:scenario.name,steps,invalidChecked,profile:{games:saved.games,coins:saved.coins,chips:saved.chips,xp:saved.xp}});
  await context.close();
 }
 const narrow=await browser.newPage({viewport:{width:320,height:740}});await narrow.goto(origin);await noOverflow(narrow,'320px home');await enterLocal(narrow);await noOverflow(narrow,'320px setup');await narrow.getByRole('button',{name:'Start game',exact:true}).click();await noOverflow(narrow,'320px table');await narrow.waitForTimeout(400);await narrow.screenshot({path:'/private/tmp/pitapat-320-table.png',fullPage:true});await narrow.close();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({results,consoleErrors:errors},null,2));
}finally{await browser.close();}

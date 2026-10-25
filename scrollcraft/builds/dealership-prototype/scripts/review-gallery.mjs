import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out='lab/gallery-revision';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const results=[],errors=[];
try {
  for(const [name,viewport,reducedMotion] of [['desktop',{width:1440,height:1000},'no-preference'],['phone',{width:390,height:844},'no-preference'],['reduced',{width:360,height:640},'reduce']]){
    const context=await browser.newContext({viewport,reducedMotion});
    await context.addInitScript(()=>{Element.prototype.requestPointerLock=()=>Promise.resolve();Element.prototype.setPointerCapture=()=>{};Element.prototype.releasePointerCapture=()=>{}});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4500/');await page.waitForSelector('.gallery-home');
    await page.waitForFunction(()=>window.ScrollCraft?.instances.length===1);
    const target=page.locator('.gallery-rail .vehicle-photo img').first();
    assert.equal(await target.getAttribute('data-sc-reveal'),'left');
    await page.evaluate(()=>document.querySelectorAll('img').forEach(i=>i.loading='eager'));
    await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
    const positions=await page.locator('.gallery-collection').evaluate(el=>({top:el.getBoundingClientRect().top+scrollY,height:el.offsetHeight}));
    const clips=[];
    for(const [label,progress] of [['enter',.12],['middle',.3],['complete',.55]]){
      const y=Math.max(0,positions.top-viewport.height+progress*(positions.height+viewport.height));
      await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await page.waitForTimeout(250);
      clips.push(await target.evaluate(el=>getComputedStyle(el).clipPath));
      await page.screenshot({path:`${out}/${name}-${label}.png`});
    }
    if(reducedMotion==='reduce')assert(clips.every(c=>c==='none'),JSON.stringify(clips));
    else {const right=clips.map(c=>Number(c.match(/inset\(0(?:px|%)? ([\d.]+)%/)?.[1]??0));assert(right[0]>right[1]&&right[1]>right[2],JSON.stringify({clips,right}));assert.equal(right[2],0);}
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.locator('.gallery-rail .vehicle-photo').first().click();await page.waitForSelector('.detail-page');
    results.push({name,clips,photoNavigation:'passed',overflow:'none'});await context.close();
  }
  assert.equal(errors.length,0,JSON.stringify(errors));await fs.writeFile(`${out}/report.json`,JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));
} finally {await browser.close();}

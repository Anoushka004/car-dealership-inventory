import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
const out='lab/approved-v1';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 for(const [name,viewport,reducedMotion] of [['desktop',{width:1440,height:1000},'no-preference'],['phone',{width:390,height:844},'no-preference'],['reduced-motion',{width:360,height:640},'reduce']]){
  const c=await browser.newContext({viewport,reducedMotion});
  await c.addInitScript(()=>{Element.prototype.requestPointerLock=()=>Promise.resolve();Element.prototype.setPointerCapture=()=>{};Element.prototype.releasePointerCapture=()=>{}});
  const p=await c.newPage();await p.goto('http://127.0.0.1:4500/?variant=B');await p.waitForSelector('.purchase-journey');
  await p.evaluate(()=>document.querySelectorAll('img').forEach(i=>i.loading='eager'));
  await p.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
  await p.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await p.waitForTimeout(200);await p.screenshot({path:`${out}/${name}-opening.png`});
  // Full-page captures show the opening scroll state; partial reveals are intentional.
  await p.screenshot({path:`${out}/${name}-full-page.png`,fullPage:true});
  await c.close();
 }
}finally{await browser.close()}
console.log(`Approved V1 screenshot snapshots written to ${out}`);

'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const host='http://127.0.0.1:8766';
const server=spawn('python3',['-m','http.server','8766','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
async function waitForServer(){
 for(let i=0;i<75;i++){
  if(server.exitCode!==null)throw Error('Site server stopped');
  try{if((await fetch(host+'/Gatbawi/index.html')).ok)return}catch{}
  await new Promise(r=>setTimeout(r,160));
 }
 throw Error('Site server unavailable');
}
async function run(){
 await waitForServer();
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:840}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const synth={
      speaking:false,paused:false,queue:[],
      cancel(){this.speaking=false;this.paused=false;this.queue=[]},
      speak(u){this.speaking=true;this.queue.push(u);if(u.onstart)u.onstart()},
      pause(){this.paused=true},
      resume(){this.paused=false},
      getVoices(){return [{lang:'ko-KR',name:'한국어 음성'}]}
    };
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});
    window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
  });
  const response=await page.goto(host+'/Gatbawi/index.html',{waitUntil:'load'});
  assert.equal(response.status(),200);
  assert.equal(await page.locator('.scene img').evaluate(img=>img.complete&&img.naturalWidth>0),true,'Buddha image');
  const card=page.locator('#prayerCard');
  assert.equal(await card.isHidden(),true);
  await page.locator('#bgStart').click();
  assert.equal(await card.isVisible(),true,'Chant must show message');
  assert((await page.locator('#prayerText').innerText()).includes('아미타부처님께 귀의합니다'),'Chant meaning visible');
  assert.equal(await page.locator('#bgStart').getAttribute('aria-pressed'),'true');
  await page.locator('#bgStart').click();
  assert.equal(await card.isHidden(),true,'Chant toggle must hide message');
  await page.locator('#heartStart').click();
  assert.equal(await card.isVisible(),true);
  assert((await page.locator('#prayerText').innerText()).includes('마하반야바라밀다심경'));
  await page.locator('#heartKoreanStart').click();
  assert((await page.locator('#prayerText').innerText()).includes('관자재보살은'));
  assert.equal(await page.locator('#heartKoreanStart').getAttribute('aria-pressed'),'true');
  await page.locator('#heartKoreanStart').click();
  assert.equal(await card.isHidden(),true);
  await page.locator('#wish').fill('우리 가족 건강');
  await page.locator('#wishBtn').click();
  assert.equal(await card.isVisible(),true);
  assert((await page.locator('#prayerText').innerText()).includes('가족'));
  await page.locator('#readPrayer').click();
  await page.locator('#readPrayer').click();
  assert((await page.locator('#readPrayer').innerText()).includes('이어 읽기'),'Pause');
  await page.locator('#readPrayer').click();
  await page.locator('#stopPrayer').click();
  await page.locator('#hidePrayer').click();
  assert.equal(await card.isHidden(),true,'Close wish');
  await page.locator('#admissionName').fill('길동');
  await page.locator('#admissionSchool').fill('희망대학교');
  await page.locator('#admissionBtn').click();
  assert((await page.locator('#prayerText').innerText()).includes('취업'));
  assert.equal(errors.length,0,'Browser JS exceptions: '+errors.join('; '));
  await page.setViewportSize({width:390,height:844});
  await page.locator('#heartKoreanStart').click();
  assert.equal(await card.isVisible(),true,'Mobile Korean Sutra should show');
  assert((await card.boundingBox()).width>100,'Mobile message width');
  console.log('PASS Gatbawi: image, chanting, Korean & original sutra, prayer voice, school prayer, mobile, no JavaScript errors');
 }finally{await browser.close()}
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.kill());

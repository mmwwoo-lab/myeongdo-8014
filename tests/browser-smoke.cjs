'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const HOST='http://127.0.0.1:8765';
const root=path.resolve(__dirname,'..');
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
async function ready(){
  for(let i=0;i<60;i++){
    if(server.exitCode!==null)throw Error('Static server exited before startup');
    try{const r=await fetch(HOST);if(r.ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  throw Error('Cannot start local test server');
}
async function main(){
  await ready();
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({acceptDownloads:true});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',d=>d.accept());
    const landing=await page.goto(HOST+'/',{waitUntil:'load'});
    assert.equal(landing.status(),200,'Portfolio entrypoint index.html must load');
    await page.locator('#work-grid .work').first().waitFor({state:'visible',timeout:14000});
    assert((await page.locator('#work-grid .work').count())>=3,'Portfolio image cards must load');
    assert.equal(await page.locator('#collaboration .collab-steps article').count(),6,'6 public stages');
    await page.locator('nav a[href="#collaboration"]').click();
    assert.equal(new URL(page.url()).hash,'#collaboration','Collaboration menu should navigate section');
    const publicImages=await page.locator('#work-grid .work img').evaluateAll(els=>els.every(e=>e.complete&&e.naturalWidth>0));
    assert(publicImages,'Public artist artwork images must be available');

    await page.goto(HOST+'/admin/#create',{waitUntil:'load'});
    assert.equal(await page.locator('body').getAttribute('data-studio-view'),'create');
    await page.locator('#collaboration').waitFor({state:'visible',timeout:10000});
    assert.equal(await page.locator('.collaboration-stage').count(),6,'Six editable collaboration stages');
    const position=await page.locator('#artist').evaluate(el=>{
      const photo=document.querySelector('#portrait-upload');
      return Boolean(photo&&photo.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING);
    });
    assert(position,'Artist name should appear after portrait picker');

    const photo=await page.evaluate(()=>{
      const c=document.createElement('canvas');c.width=160;c.height=220;
      const x=c.getContext('2d');x.fillStyle='#e2d5fa';x.fillRect(0,0,160,220);
      x.fillStyle='#634e8a';x.beginPath();x.arc(80,72,37,0,Math.PI*2);x.fill();
      x.fillRect(43,118,74,86);return c.toDataURL('image/png').split(',')[1];
    });
    await page.locator('#portrait-upload').setInputFiles({
      name:'artist-portrait.png',mimeType:'image/png',buffer:Buffer.from(photo,'base64')
    });
    await page.locator('#portrait-preview img').waitFor({state:'visible',timeout:10000});
    await page.locator('#title').fill('명도재 테스트 전시');
    await page.locator('#artist').fill('명도재 이명우');

    await page.locator('.collaboration-stage[data-stage="DIRECTOR"] summary').click();
    await page.locator('#stage-DIRECTOR-assignee').fill('명도재 이명우');
    await page.locator('#stage-DIRECTOR-notes').fill('전시 방향 검토 완료');
    await page.locator('#stage-DIRECTOR-status').selectOption('승인 완료');
    assert.equal(await page.locator('#stage-DIRECTOR-status').inputValue(),'승인 완료');

    await page.locator('.collaboration-stage[data-stage="REVIEW"] summary').click();
    await page.locator('#stage-REVIEW-status').selectOption('승인 완료');
    assert.notEqual(await page.locator('#stage-REVIEW-status').inputValue(),'승인 완료',
      'Review approval must require named reviewer, completed checklist and notes');

    await page.locator('#save-project').click();
    await page.locator('#notice').getByText('저장', {exact:false}).waitFor({timeout:5000});
    const projectBlob=page.waitForEvent('download',{timeout:10000});
    await page.locator('#export-project').click();
    const backup=await projectBlob;
    const contents=JSON.parse(await fs.readFile(await backup.path(),'utf8'));
    const project=contents.projects?.[0];
    assert.equal(project.artist,'명도재 이명우');
    assert.equal(project.workflow?.length,6,'JSON backup must include collaboration assignments');
    assert.equal(project.workflow?.[0].assignee,'명도재 이명우');
    assert.equal(project.workflow?.[0].status,'승인 완료');
    assert(project.portrait?.startsWith('data:image/jpeg;base64,'),'Profile image must be saved');

    await page.locator('#quick-preview').click();
    const frame=page.frameLocator('#site-preview');
    await frame.locator('#artist figcaption.artist-photo-name').waitFor({state:'visible',timeout:10000});
    assert.equal(await frame.locator('#artist figcaption.artist-photo-name').textContent(),'명도재 이명우');
    await page.locator('#rights-confirm').check();
    const htmlDownload=page.waitForEvent('download',{timeout:15000});
    await page.locator('#quick-finish').click();
    const html=await htmlDownload;
    const file=await fs.readFile(await html.path(),'utf8');
    assert(file.includes('artist-photo-name')&&file.includes('명도재 이명우'),
      'Downloaded website must display artist name below portrait');

    await page.locator('.side-menu [data-view="projects"]').click();
    await page.locator('#project-list .project-row').first().getByRole('button',{name:'편집'}).click();
    assert.equal(await page.locator('#title').inputValue(),'명도재 테스트 전시');
    assert.equal(await page.locator('#stage-DIRECTOR-assignee').inputValue(),'명도재 이명우',
      'Workflow values must reload into existing project');

    await page.locator('.side-menu [data-view="projects"]').click();
    await page.locator('#import-json').setInputFiles({
      name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(contents),'utf8')
    });
    await page.waitForFunction(()=>document.querySelectorAll('#project-list .project-row').length>=2,
      null,{timeout:10000});

    await page.goto(HOST+'/admin/#create',{waitUntil:'load'});
    await page.locator('#load-artist-starter').click();
    await page.waitForFunction(()=>document.querySelector('#artwork-list [data-image] img')!==null,
      null,{timeout:15000});
    assert((await page.locator('#artwork-list [data-image] img').count())>=3,
      'Quick starter must preload existing artist works');
    assert.deepEqual(errors,[],'No uncaught browser runtime errors expected');
    console.log('PASS: portfolio images, collaboration states, portrait/name, local save, JSON export/import, iframe preview, standalone HTML, artist starter');
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.kill('SIGTERM'));

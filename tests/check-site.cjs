'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const load=name=>fs.readFileSync(path.join(root,name),'utf8');
for(const filename of [
  'index.html','style.css','app.js','content.json','.nojekyll',
  'admin/index.html','admin/style.css','admin/app.js',
  'admin/starter.js','admin/collaboration.js','admin/collaboration.css',
  'docs/collaboration-workflow.md',
  'assets/buncheong.webp','assets/peony.webp','assets/moon.webp'
]){
  assert(fs.existsSync(path.join(root,filename)),filename+' is missing');
}
const home=load('index.html'),editor=load('admin/index.html');
const workflow=load('admin/collaboration.js');
assert(home.includes('id="collaboration"'),'Public homepage collaboration overview');
assert(home.includes('href="admin/#create"'),'Public website creator link');
assert(home.includes('01 / DIRECTOR')&&home.includes('06 / REVIEW'),'Public 6-stage workflow');
assert(editor.includes('data-jump="collaboration"'),'Collaborator menu shortcut');
assert(editor.includes('id="exhibition-form"'),'Home page creator form');
assert(editor.includes('id="portrait-upload"'),'Artist portrait uploader');
assert(editor.includes('id="artist"'),'Artist name field');
assert(editor.includes('collaboration.js?v='),'Collaboration script is loaded');
assert(editor.includes('collaboration.css?v='),'Collaboration stylesheet is loaded');
assert(editor.includes('id="quick-preview"'),'Exhibition preview action');
assert(editor.includes('id="quick-finish"'),'Standalone homepage export action');
const stages=['DIRECTOR','ARCHIVE','CURATION','CREATION','WEBSITE','REVIEW'];
for(const stage of stages)assert(workflow.includes("key:'"+stage+"'"),stage+' must be in collaboration plan');
for(const event of ['myeongdo:project-loaded','myeongdo:capture-project','myeongdo:workflow-change']){
  assert(workflow.includes(event),'Workflow JSON persistence event '+event);
}
assert(workflow.includes('reviewChecks'),'Review checklist must be retained');
assert(workflow.includes('finalApproval'),'Director sign-off must be retained');
assert(workflow.includes('/issues/new?'),'Task handoff should offer a GitHub Issue draft');
for(const filename of ['app.js','admin/app.js','admin/starter.js','admin/collaboration.js']){
  new Function(load(filename));
}
const data=JSON.parse(load('content.json'));
assert(Array.isArray(data.works)&&data.works.length>0,'Artist portfolio sample artworks exist');
for(const work of data.works){
  assert(!path.isAbsolute(work.image)&&!work.image.includes('..'),'Safe relative artwork path');
  assert(fs.existsSync(path.join(root,work.image)),work.title+' referenced image missing');
}
console.log('PASS: homepage, index files, artist assets, collaboration stages, workflow JSON events and JS syntax');

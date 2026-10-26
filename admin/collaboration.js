(() => {
 'use strict';
 const definitions=[
  ['DIRECTOR','명도재 총괄 지시','작가 선정과 전시 방향, 최종 승인'],
  ['ARCHIVE','작품 자료 조사','원본·약력·작품 정보·사용 허락 확인'],
  ['CURATION','전시 기획·평론','전시 맥락과 작품별 해설 작성'],
  ['CREATION','음악·영상 제작','승인된 작품과 음원을 활용한 융합 창작'],
  ['WEBSITE','전시 웹 제작','모바일 대응 갤러리와 감상 기능 구성'],
  ['REVIEW','검수·공개','권리·링크·재생·접근성 점검 후 승인']
 ];
 const statuses=['대기','진행 중','검수 요청','승인 완료'];
 const defaults=()=>definitions.map(([key])=>({key,assignee:'',status:'대기',notes:'',sources:'',updatedAt:''}));
 let stages=defaults();
 const section=document.createElement('section');section.className='form-section collaboration-panel';section.id='collaboration';
 const header=document.createElement('div');header.className='form-section-header';
 const kicker=document.createElement('span');kicker.textContent='COLLABORATION · 6 STAGES';
 const title=document.createElement('h2');title.textContent='함께 만드는 전시 홈페이지';
 const description=document.createElement('p');description.textContent='총괄 지시부터 검수·공개까지 단계별 담당자와 결과를 기록합니다. 프로젝트 저장 및 JSON 백업에 함께 포함됩니다.';
 header.append(kicker,title,description);section.append(header);
 const summary=document.createElement('p');summary.id='collaboration-summary';summary.setAttribute('role','status');section.append(summary);
 const grid=document.createElement('div');grid.className='collaboration-grid';section.append(grid);
 const note=document.createElement('p');note.className='helper';note.textContent='협업 방법: 담당자가 내용 입력 → 프로젝트 저장 → 프로젝트 백업(JSON) → 다음 담당자가 프로젝트 목록에서 JSON 가져오기. 다른 기기와 실시간으로 동기화되지는 않습니다. 최종 승인은 담당자 이름과 근거를 메모에 기록하세요.';section.append(note);
 const report=document.createElement('button');report.type='button';report.className='subtle';report.textContent='협업 진행 보고서 내려받기';section.append(report);
 document.querySelector('#exhibition-form .form-section').before(section);
 const create=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el;};
 function sanitize(value){const arr=Array.isArray(value)?value:[];return defaults().map(base=>{const old=arr.find(x=>x&&x.key===base.key)||{};return {...base,assignee:String(old.assignee||'').slice(0,100),status:statuses.includes(old.status)?old.status:'대기',notes:String(old.notes||'').slice(0,6000),sources:String(old.sources||'').slice(0,3000),updatedAt:String(old.updatedAt||'')};});}
 function updateSummary(){const done=stages.filter(x=>x.status==='승인 완료').length;summary.textContent=`6단계 중 ${done}단계 승인 완료 · `+(stages[5].status==='승인 완료'?'검수·공개 승인 기록됨':'최종 검수·공개 승인 대기');}
 function render(){grid.replaceChildren();definitions.forEach(([key,name,desc],i)=>{const card=create('details');card.className='collaboration-stage';card.open=i===0;const heading=create('summary');heading.append(create('span',String(i+1).padStart(2,'0')+' / '+key),create('strong',name),create('small',desc));card.append(heading);const body=create('div');body.className='collaboration-fields';const stage=stages[i];[['assignee','담당자','input',100],['status','진행 상태','select'],['sources','자료 링크와 사용 허락 근거','textarea',3000],['notes','작업 결과와 인수인계 메모','textarea',6000]].forEach(([field,label,tag,max])=>{const wrap=create('label',label),control=create(tag);control.id=`stage-${key}-${field}`;if(tag==='select'){statuses.forEach(s=>{const option=create('option',s);option.value=s;control.append(option);});}else{if(tag==='input')control.type='text';else control.rows=3;control.maxLength=max;}control.value=stage[field];control.addEventListener('input',()=>{stage[field]=control.value;stage.updatedAt=new Date().toISOString();updateSummary();document.dispatchEvent(new Event('myeongdo:workflow-change'));});wrap.append(control);body.append(wrap);});card.append(body);grid.append(card);});updateSummary();}
 document.addEventListener('myeongdo:project-loaded',e=>{stages=sanitize(e.detail?.workflow);render();});
 document.addEventListener('myeongdo:capture-project',e=>{if(e.detail)e.detail.workflow=sanitize(stages);});
 report.addEventListener('click',()=>{const text=['명도재 전시 홈페이지 협업 보고서','전시: '+document.getElementById('title').value,'작가: '+document.getElementById('artist').value,'',...stages.map((s,i)=>`${String(i+1).padStart(2,'0')} / ${definitions[i][0]} ${definitions[i][1]}\n${definitions[i][2]}\n담당자: ${s.assignee||'[담당자 입력 필요]'}\n상태: ${s.status}\n자료 및 허락 근거: ${s.sources}\n결과 및 인수인계: ${s.notes}\n수정일: ${s.updatedAt}\n`)].join('\n');const blob=new Blob([text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=create('a');a.href=url;a.download='myeongdo-collaboration-report.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);});
 render();
})();

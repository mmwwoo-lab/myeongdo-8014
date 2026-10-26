(() => {
  'use strict';

  // The project JSON is the portable collaboration record. GitHub Issues are
  // optional shared handoff tasks; neither mechanism claims verified signatures.
  const REPO='mmwwoo-lab/myeongdo-8014';
  const definitions=[
    {key:'DIRECTOR',name:'명도재 총괄 지시',desc:'작가 선정과 전시 방향, 최종 승인'},
    {key:'ARCHIVE',name:'작품 자료 조사',desc:'원본·약력·작품 정보·사용 허락 확인'},
    {key:'CURATION',name:'전시 기획·평론',desc:'전시 맥락과 작품별 해설 작성'},
    {key:'CREATION',name:'음악·영상 제작',desc:'승인된 작품과 음원을 활용한 융합 창작'},
    {key:'WEBSITE',name:'전시 웹 제작',desc:'모바일 대응 갤러리와 감상 기능 구성'},
    {key:'REVIEW',name:'검수·공개',desc:'권리·링크·재생·접근성 점검 후 승인'}
  ];
  const statuses=['대기','진행 중','검수 요청','승인 완료'];
  const reviewLabels=[
    ['rights','작품·사진·음원·영상의 이용 허락 확인'],
    ['links','외부·내부 링크와 공개 주소 확인'],
    ['media','음악 및 영상 재생 확인'],
    ['mobile','휴대전화·태블릿 화면 확인'],
    ['accessibility','이미지 대체텍스트·키보드 접근성 확인']
  ];
  const fresh=()=>definitions.map(d=>({
    key:d.key,assignee:'',status:'대기',notes:'',sources:'',updatedAt:'',
    reviewChecks:{},finalApproval:false,finalApprovedAt:''
  }));
  const clean=(data)=>{
    const input=Array.isArray(data)?data:[];
    return fresh().map(base=>{
      const old=input.find(x=>x&&x.key===base.key)||{};
      const checks={};
      reviewLabels.forEach(([id])=>{checks[id]=old.reviewChecks?.[id]===true;});
      return {
        ...base,assignee:String(old.assignee||'').slice(0,100),
        status:statuses.includes(old.status)?old.status:'대기',
        sources:String(old.sources||'').slice(0,3000),
        notes:String(old.notes||'').slice(0,6000),
        updatedAt:String(old.updatedAt||'').slice(0,50),
        reviewChecks:checks,finalApproval:old.finalApproval===true,
        finalApprovedAt:String(old.finalApprovedAt||'').slice(0,50)
      };
    });
  };
  let stages=clean(null);
  const node=(tag,value,cls)=>{
    const n=document.createElement(tag);
    if(value!==undefined&&value!==null)n.textContent=value;
    if(cls)n.className=cls;
    return n;
  };
  const section=node('section',null,'form-section collaboration-panel');
  section.id='collaboration';
  section.setAttribute('aria-labelledby','collaboration-heading');
  const header=node('div',null,'form-section-header');
  header.append(node('span','COLLABORATION · 6 STAGES'));
  const heading=node('h2','명도재 6단계 협업 작업실');
  heading.id='collaboration-heading';
  header.append(heading,node('p','총괄 지시 → 자료 조사 → 기획·평론 → 음악·영상 → 웹 제작 → 검수·공개. 단계별 담당자·근거·진행 기록을 남깁니다.'));
  section.append(header);
  const summary=node('p','', 'collaboration-summary');
  summary.id='collaboration-summary';
  summary.setAttribute('role','status');
  summary.setAttribute('aria-live','polite');
  section.append(summary);
  const grid=node('div',null,'collaboration-grid');
  section.append(grid);
  const actions=node('div',null,'collaboration-actions');
  const report=node('button','협업 진행 보고서 내려받기','subtle');
  report.type='button';
  const issues=node('a','GitHub 협업 업무 현황 열기 ↗','subtle collaboration-issues');
  issues.href='https://github.com/'+REPO+'/issues';
  issues.target='_blank';issues.rel='noopener noreferrer';
  actions.append(report,issues);section.append(actions);
  section.append(node('p','협업 입력은 프로젝트 저장 및 JSON 백업에 포함됩니다. 담당자는 JSON 파일을 주고받거나 GitHub 이슈로 업무를 공유할 수 있습니다. 실시간 공동 편집·신원 확인·자동 공개 승인 기능은 아닙니다.','helper'));
  // Place project identity/portrait fields before the team workflow.
  const basic=document.querySelector('#exhibition-form .form-section');
  if(!basic)return;
  basic.after(section);

  const touched=(stage)=>{
    stage.updatedAt=new Date().toISOString();
    document.dispatchEvent(new Event('myeongdo:workflow-change'));
    updateSummary();
  };
  const allReviewed=()=>reviewLabels.every(([id])=>stages[5].reviewChecks?.[id]===true);
  const ready=()=>stages[0].status==='승인 완료'&&stages[0].finalApproval===true&&stages[5].status==='승인 완료'&&allReviewed();
  function updateSummary(){
    const done=stages.filter(s=>s.status==='승인 완료').length;
    const text=ready()
      ?'6단계 중 '+done+'단계 승인 기록 · 최종 공개 승인 기록 완료'
      :'6단계 중 '+done+'단계 승인 기록 · 최종 공개 승인 미완료';
    summary.textContent=text;
    summary.dataset.ready=ready()?'true':'false';
    grid.querySelectorAll('.collaboration-stage').forEach((card,i)=>{
      card.dataset.status=stages[i].status;
      const label=card.querySelector('.collaboration-stage-state');
      if(label)label.textContent=stages[i].status;
    });
  }
  const issueURL=(d,i)=>{
    const title=(document.getElementById('title')?.value.trim()||'새 전시');
    const artist=(document.getElementById('artist')?.value.trim()||'작가 이름 입력 필요');
    const stage=stages[i];
    const body=[
      '## 전시 협업 요청','전시 제목: '+title,'작가: '+artist,
      '단계: '+String(i+1).padStart(2,'0')+' / '+d.key+' '+d.name,
      '담당 범위: '+d.desc,
      '담당자: '+(stage.assignee||'(미정)'),
      '진행 상태: '+stage.status,
      '## 자료·권리 근거',stage.sources.slice(0,1500)||'(입력 필요)',
      '## 작업 내용·인수인계',stage.notes.slice(0,1800)||'(입력 필요)',
      '## 확인 사항','- [ ] 저작권과 공개 허락 확인','- [ ] 결과물 및 링크 확인','- [ ] 담당자 검수 및 인수인계'
    ].join('\n\n');
    return 'https://github.com/'+REPO+'/issues/new?'+new URLSearchParams({
      title:'['+d.key+'] '+title+' · '+d.name,body
    });
  };
  function render(){
    grid.replaceChildren();
    definitions.forEach((d,i)=>{
      const stage=stages[i];
      const card=node('details',null,'collaboration-stage');
      card.dataset.stage=d.key;card.dataset.status=stage.status;
      card.open=i===0;
      const top=node('summary');
      top.append(
        node('span',String(i+1).padStart(2,'0')+' / '+d.key,'collaboration-stage-number'),
        node('strong',d.name),
        node('small',d.desc),
        node('span',stage.status,'collaboration-stage-state')
      );
      card.append(top);
      const body=node('div',null,'collaboration-fields');
      const message=node('p','','collaboration-field-alert');
      message.setAttribute('role','alert');
      const field=(name,label,tag,options={})=>{
        const wrap=node('label',label);
        const input=node(tag);
        input.id='stage-'+d.key+'-'+name;
        if(tag==='select')statuses.forEach(status=>{
          const opt=node('option',status);
          opt.value=status;input.append(opt);
        });
        if(tag==='input'){input.type='text';input.maxLength=options.max||100;}
        if(tag==='textarea'){input.rows=options.rows||3;input.maxLength=options.max||6000;}
        input.value=stage[name];
        input.addEventListener(tag==='select'?'change':'input',()=>{
          if(name==='status'&&input.value==='승인 완료'){
            if(!stage.assignee.trim()||!stage.notes.trim()){
              message.textContent='승인 완료를 기록하려면 담당자 이름과 작업 결과·승인 근거를 입력해 주세요.';
              input.value=stage.status;return;
            }
            if(d.key==='REVIEW'&&!allReviewed()){
              message.textContent='검수·공개 승인 전에 다섯 가지 검수 항목을 모두 확인해 주세요.';
              input.value=stage.status;return;
            }
          }
          message.textContent='';
          stage[name]=input.value;touched(stage);
          if(name==='status'&&stage.status!=='승인 완료'&&(d.key==='REVIEW'||d.key==='DIRECTOR')){
            stages[0].finalApproval=false;stages[0].finalApprovedAt='';
            const approval=document.getElementById('director-final-approval');
            if(approval)approval.checked=false;
          }
        });
        wrap.append(input);body.append(wrap);
        return input;
      };
      field('assignee','담당자·승인 기록자','input',{max:100});
      field('status','진행 상태','select');
      field('sources','원본·자료 링크·사용 허락 근거','textarea',{max:3000});
      field('notes','작업 결과·승인 근거·다음 담당자 인수인계','textarea',{max:6000});
      if(d.key==='REVIEW'){
        const checkBox=node('fieldset',null,'collaboration-review-list');
        checkBox.append(node('legend','공개 전 필수 검수'));
        for(const [id,label] of reviewLabels){
          const line=node('label',null,'collaboration-review-item');
          const checkbox=node('input');checkbox.type='checkbox';
          checkbox.checked=stage.reviewChecks?.[id]===true;
          checkbox.id='review-check-'+id;
          checkbox.addEventListener('change',()=>{
            stage.reviewChecks[id]=checkbox.checked;
            if(!allReviewed()){
              if(stage.status==='승인 완료'){
                stage.status='검수 요청';
                body.querySelector('#stage-REVIEW-status').value=stage.status;
              }
              stages[0].finalApproval=false;stages[0].finalApprovedAt='';
              const approval=document.getElementById('director-final-approval');
              if(approval)approval.checked=false;
            }
            touched(stage);
          });
          line.append(checkbox,node('span',label));checkBox.append(line);
        }
        body.append(checkBox);
      }
      if(d.key==='DIRECTOR'){
        const signoff=node('label',null,'collaboration-final-signoff');
        const checkbox=node('input');checkbox.type='checkbox';
        checkbox.id='director-final-approval';
        checkbox.checked=stage.finalApproval===true;
        checkbox.addEventListener('change',()=>{
          if(checkbox.checked&&(stages[5].status!=='승인 완료'||!allReviewed()||stage.status!=='승인 완료')){
            checkbox.checked=false;
            message.textContent='DIRECTOR·REVIEW 단계 승인과 검수 체크가 완료된 뒤 최종 공개 승인에 체크할 수 있습니다.';
            return;
          }
          message.textContent='';
          stage.finalApproval=checkbox.checked;
          stage.finalApprovedAt=checkbox.checked?new Date().toISOString():'';
          touched(stage);
        });
        signoff.append(checkbox,node('span','최종 공개 승인 확인 (REVIEW 검수 완료 후)'));
        body.append(signoff);
        body.append(node('p','협업 기록상의 승인 체크이며, GitHub 사용자 신원이나 서명을 검증하지 않습니다.','helper'));
      }
      const issue=node('a','이 단계 GitHub 업무 요청서 열기 ↗','collaboration-issue-link');
      issue.target='_blank';issue.rel='noopener noreferrer';
      issue.addEventListener('click',()=>{issue.href=issueURL(d,i);});
      issue.href=issueURL(d,i);
      body.append(message,issue);
      card.append(body);grid.append(card);
    });
    updateSummary();
  }
  document.addEventListener('myeongdo:project-loaded',event=>{
    stages=clean(event.detail?.workflow);render();
  });
  document.addEventListener('myeongdo:capture-project',event=>{
    if(event.detail)event.detail.workflow=clean(stages);
  });
  report.addEventListener('click',()=>{
    const rows=[
      '명도재 이명우 홈페이지 제작 6단계 협업 보고서',
      '전시: '+(document.getElementById('title')?.value||'미입력'),
      '작가: '+(document.getElementById('artist')?.value||'미입력'),
      '기록 상태: '+summary.textContent,
      '주의: 협업 참가자가 직접 입력한 정보이며 사용자 신원 및 승인 권한은 자동 검증하지 않습니다.',
      ''
    ];
    stages.forEach((stage,i)=>{
      rows.push(
        String(i+1).padStart(2,'0')+' / '+definitions[i].key+' '+definitions[i].name,
        definitions[i].desc,'담당자: '+stage.assignee,'상태: '+stage.status,
        '자료·권리 근거: '+stage.sources,'작업·승인 메모: '+stage.notes,
        '수정일: '+stage.updatedAt
      );
      if(i===5)reviewLabels.forEach(([id,label])=>rows.push('검수 '+(stage.reviewChecks[id]?'[완료]':'[미완료]')+' '+label));
      if(i===0)rows.push('최종 공개 승인: '+(stage.finalApproval?'기록됨':'미기록')+' '+stage.finalApprovedAt);
      rows.push('');
    });
    const blob=new Blob([rows.join('\n')],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=node('a');link.href=url;link.download='myeongdo-collaboration-report.txt';
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  });
  render();
})();

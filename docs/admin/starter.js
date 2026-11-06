(() => {
  'use strict';
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'primary'; button.id = 'load-artist-starter';
  button.textContent = '명도재 작가 자료로 홈페이지 만들기';
  const note = document.createElement('p'); note.className = 'helper';
  note.textContent = '작가 소개와 작품 세 점을 입력합니다. 현재 편집 중인 내용은 JSON으로 먼저 보관해 주세요. 이미 저장한 프로젝트는 유지합니다.';
  document.querySelector('.quick-hero').append(button, note);
  button.addEventListener('click', async () => {
    const notice = document.getElementById('notice');
    const dirty = [...document.querySelectorAll('#exhibition-form input[type=text], #exhibition-form textarea')].some(el => el.value.trim());
    if (dirty && !confirm('현재 편집 중인 화면을 명도재 작가 자료로 바꿀까요? 저장된 프로젝트는 유지됩니다.')) return;
    button.disabled = true;
    try {
      const response = await fetch('../content.json');
      if (!response.ok) throw Error('작가 자료를 불러오지 못했습니다.');
      const data = await response.json();
      const artworks = [];
      for (const w of data.works) {
        const r = await fetch('../' + w.image);
        if (!r.ok) throw Error(w.title + ' 이미지를 찾지 못했습니다.');
        const blob = await r.blob();
        const dataUrl = await new Promise((resolve, reject) => {const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('이미지 읽기 실패')); reader.readAsDataURL(blob);});
        artworks.push({id:'myeongdo-' + w.id, title:w.title, year:w.year, material:w.medium, size:w.size, caption:w.explanation, critique:'AI 비평 초안\n' + w.critique, dataUrl, filename:w.image.split('/').pop()});
      }
      document.dispatchEvent(new CustomEvent('myeongdo:load-starter', {detail:{id:'', title:'명도재 이명우의 예술 세계', artist:data.artist, genre:'복합매체', status:'제작 중', subtitle:'사진과 시와 이미지가 만나는 창작의 기록', summary:'작가 소개 / 작품 소개 / 작품해설 / 작품평론 / 문의를 연결하는 개인 홈페이지입니다. 정식 작품명과 제작 정보는 작가 확인 후 확정합니다.', biography:data.bio, artistNote:'[작가 입력 필요] 최종 작업 철학과 제작 의도', contact:'[작가 입력 필요] 문의용 이메일과 연락 방식', review:'AI 비평 초안\n전통의 도상과 디지털 표현이 만나는 작업입니다. 그릇, 모란, 달의 이미지를 통해 일상의 기억을 확장합니다. 실제 작가 의도는 확인 후 보완합니다.', rightsConfirmed:false, artworks}}));
      notice.textContent = '작가 자료와 작품 3점을 불러왔습니다. 「전시관 바로 보기」로 확인하고 HTML을 내려받으세요.';
      notice.dataset.kind = 'success';
    } catch (err) {notice.textContent = err.message; notice.dataset.kind = 'error';}
    finally {button.disabled = false;}
  });
})();

/* Facebook, KakaoTalk, Instagram in-app browser: use actual HTML5 MP3 playback
 * instead of depending on Web Speech API availability.
 * Tracks absent from the manifest retain the existing TTS controls with a clear notice.
 */
(()=>{'use strict';
  const originals=window.MyeongdoNarration;
  if(!originals) return;
  const manifest=window.MYEONGDO_AUDIO_TRACKS||{};
  const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let active=null;
  function stopMP3(){
    if(!active)return;
    try{active.pause();active.currentTime=0;}catch{}
    active=null;
  }
  const oldCard=originals.card;
  originals.card=p=>{
    const card=oldCard(p);
    const url=manifest[String(p.id)];
    if(!url){
      return card.replace('class="narration-card no-print"', 'class="narration-card no-print"')
        .replace('<h2>🎧', '<p class="audio-support-tip">페이스북 앱 안에서는 기기 음성 기능이 제한될 수 있습니다. 이 작품은 아직 MP3 녹음본이 없어 Chrome·삼성 인터넷에서 시낭송을 사용하세요.</p><h2>🎧');
    }
    const audio='<div class="native-audio-box">'
      +'<div class="eyebrow">페이스북에서도 듣는 MP3 시낭송</div>'
      +'<p class="native-audio-title">「'+escape(p.title)+'」 · 한국어 AI 여성 음성 낭송</p>'
      +'<audio class="native-poetry-audio" controls preload="none" playsinline controlslist="nodownload" src="'+escape(url)+'" aria-label="'+escape(p.title)+' MP3 오디오 시낭송"></audio>'
      +'<p class="native-audio-status" role="status" aria-live="polite">▶ 위 재생 버튼을 누르면 실제 MP3 음원이 재생됩니다. 페이스북 안에서도 사용할 수 있는 방식입니다.</p>'
      +'<p class="native-audio-note">아래 버튼은 기기에 설치된 음성으로 읽는 별도 기능입니다. 원하시는 MP3 낭송은 위 오디오 플레이어를 사용해 주세요.</p>'
      +'</div>';
    return card.replace('<div class="narration-controls">',audio+'<div class="narration-controls">')
      .replace('▶ 시낭송 듣기</button>', '▶ 기기 음성으로 듣기</button>');
  };
  const previousStop=originals.stop;
  originals.stop=(...args)=>{stopMP3();return previousStop(...args)};
  document.addEventListener('play',event=>{
    const el=event.target;
    if(!el?.matches?.('.native-poetry-audio'))return;
    if(active&&active!==el)stopMP3();
    active=el;
    previousStop(false);
    const s=el.closest('.native-audio-box')?.querySelector('.native-audio-status');
    if(s)s.textContent='♪ MP3 시낭송 재생 중';
  },true);
  document.addEventListener('pause',event=>{
    const el=event.target;
    if(!el?.matches?.('.native-poetry-audio'))return;
    const s=el.closest('.native-audio-box')?.querySelector('.native-audio-status');
    if(s)s.textContent=el.ended?'시낭송이 끝났습니다.':'일시정지 · ▶ 버튼을 누르면 다시 들을 수 있습니다.';
  },true);
  document.addEventListener('error',event=>{
    const el=event.target;
    if(!el?.matches?.('.native-poetry-audio'))return;
    const s=el.closest('.native-audio-box')?.querySelector('.native-audio-status');
    if(s)s.textContent='음원 연결에 실패했습니다. 네트워크를 확인하거나 외부 브라우저에서 다시 재생해 주세요.';
  },true);
  window.addEventListener('hashchange',()=>stopMP3());
  document.addEventListener('click',e=>{
    const t=e.target.closest('[data-action="narration-start"]');
    if(t&&active)stopMP3();
  },true);
})();
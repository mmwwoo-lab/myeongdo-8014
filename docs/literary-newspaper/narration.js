/* 명도재문예신문 · 시낭송 재생기 v3 (모바일 오류 감지·복구)
 * 브라우저 내장 한국어 TTS와 사이트에서 생성하는 원곡 배경음.
 * 녹음된 성우 MP3가 아니므로, Web Speech API가 없는 앱 내 브라우저에서는
 * 음성 출력이 불가능합니다. 오류를 숨기지 않고 브라우저 전환 안내를 제공합니다.
 */
(() => {
  'use strict';
  const speech = window.speechSynthesis || null;
  const Utterance = window.SpeechSynthesisUtterance || null;
  const $ = selector => document.querySelector(selector);
  const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const publicBase = 'https://myeongdo-literary-times-1027.vercel.app/';
  const styles = {
    memory:   {name:'따뜻한 회상', notes:[196,246.94,293.66,392]},
    longing:  {name:'그리움의 밤', notes:[174.61,220,261.63,349.23]},
    tender:   {name:'고요한 서정', notes:[220,261.63,329.63,440]},
    hopeful:  {name:'봄빛과 희망', notes:[261.63,329.63,392,523.25]}
  };
  let session = null;
  let ctx = null;
  let master = null;
  let loop = null;
  let oscillators = [];
  let chosenVoice = '';

  const onPage = () => location.hash.match(/^#poem-(\d{1,2})$/);
  function poemInView() {
    const match = onPage();
    return match && window.MYEONGDO_POEMS?.find(p => p.id === Number(match[1]));
  }
  function themeOf(p) {
    const words = [p.title,p.category,p.intro,p.review].join(' ').slice(0,800);
    if (/그리움|어머니|아버지|이별|죽음|상실|눈물|빈자리|묘지|상처/.test(words)) return styles.longing;
    if (/봄|꽃|햇살|기쁨|희망|웃음|아이|생명|새순|노을/.test(words)) return styles.hopeful;
    if (/사랑|달|밤|연인|기다림|별|그대/.test(words)) return styles.tender;
    return styles.memory;
  }
  function voices() {
    try { return speech ? speech.getVoices().filter(v => /^ko([-_]|$)/i.test(v.lang)) : []; }
    catch { return []; }
  }
  function voiceForCurrentDevice() {
    const list = voices();
    return (chosenVoice && list.find(v => v.voiceURI === chosenVoice))
      || list.find(v => /female|여성|sunhi|yuna|heami|seoyeon|jiyeon|sohee|수진|서연|유나|지연/i.test(v.name))
      || list.find(v => /natural|premium|neural|google/i.test(v.name))
      || list[0] || null;
  }
  function updateVoices() {
    const select = $('#narrationVoice');
    if (!select) return;
    const list = voices();
    const selected = chosenVoice || select.value;
    select.replaceChildren();
    const first = document.createElement('option');
    first.value = '';
    first.textContent = list.length ? '기기 한국어 음성 자동 선택' : '기기 기본 음성 (한국어 선택 확인 필요)';
    select.append(first);
    for (const v of list) {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = v.name + (v.localService ? ' · 기기' : ' · 온라인');
      select.append(opt);
    }
    select.value = list.some(v => v.voiceURI === selected) ? selected : '';
  }
  function splitIntoChunks(p) {
    // Android WebView/Chrome에서 긴 단일 utterance가 무음 종료되는 현상을 줄입니다.
    const results = [String(p.title).trim() + '.'];
    for (const stanza of String(p.poem || '').replace(/\r/g,'').split(/\n\s*\n/)) {
      let pending = '';
      for (const raw of stanza.split('\n')) {
        const line = raw.trim();
        if (!line) continue;
        if (pending && pending.length + line.length > 74) { results.push(pending); pending=''; }
        if (line.length > 105) {
          if (pending) { results.push(pending); pending=''; }
          for (let i=0; i<line.length; i+=70) results.push(line.slice(i,i+70));
        } else pending += (pending ? '. ' : '') + line;
      }
      if (pending) results.push(pending);
    }
    return results.filter(Boolean);
  }
  function updateStatus(message) {
    const el = $('#narrationStatus');
    if (el) el.textContent = message;
  }
  function showHelp(message) {
    const help = $('#narrationHelp');
    if (!help) return;
    help.hidden = false;
    const target = help.querySelector('a[data-narration-external]');
    if (target) target.href = publicBase + (location.hash || '#poem-01');
    const cause = help.querySelector('[data-narration-cause]');
    if (cause && message) cause.textContent = message;
  }
  function hideHelp() { const help=$('#narrationHelp'); if (help) help.hidden = true; }
  function controls() {
    const play=$('[data-action="narration-start"]');
    const pause=$('[data-action="narration-pause"]');
    if (play) play.textContent = session ? '■ 낭송 종료' : '▶ 시낭송 듣기';
    if (pause) {
      pause.disabled = !session;
      pause.textContent = session?.paused ? '▶ 이어 듣기' : 'Ⅱ 잠시 멈춤';
    }
  }
  function removeMusic() {
    if (loop !== null) clearInterval(loop);
    loop = null;
    for (const o of oscillators) {
      try { o.stop(); } catch {}
      try { o.disconnect(); } catch {}
    }
    oscillators=[];
    if (master) {try {master.disconnect()} catch {} }
    master=null;
  }
  function note(freq,when,duration,gainVal) {
    if (!ctx || !master) return;
    const osc=ctx.createOscillator(),amp=ctx.createGain();
    osc.type='sine';osc.frequency.value=freq;
    amp.gain.setValueAtTime(.0001,when);
    amp.gain.exponentialRampToValueAtTime(Math.max(.0002,gainVal),when+.24);
    amp.gain.exponentialRampToValueAtTime(.0001,when+duration);
    osc.connect(amp);amp.connect(master);
    osc.start(when);osc.stop(when+duration+.03);
    oscillators.push(osc);
    osc.onended=()=>{const pos=oscillators.indexOf(osc);if(pos>=0)oscillators.splice(pos,1);try{osc.disconnect();amp.disconnect()}catch{}};
  }
  function playScore(theme) {
    if (!ctx || !master || !session || session.paused) return;
    const start=ctx.currentTime+.05;
    theme.notes.forEach((v,i)=>{note(v/2,start+2.5*i,5.8,.12);note(v,start+2.5*i+.6,3,.033)});
  }
  function startMusic(theme) {
    removeMusic();
    const AC=window.AudioContext||window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx=ctx||new AC();
      if (ctx.state==='closed') ctx=new AC();
      const ready=ctx.resume();
      if (ready && typeof ready.catch==='function') ready.catch(()=>{});
      master=ctx.createGain();master.gain.value=.095;master.connect(ctx.destination);
      playScore(theme);
      loop=setInterval(()=>playScore(theme),10400);
      return true;
    }catch{removeMusic();return false;}
  }
  function clearSessionTimers(s) {
    if (!s) return;
    if (s.watchdog) clearTimeout(s.watchdog);
    if (s.nextTimer) clearTimeout(s.nextTimer);
    s.watchdog=null;s.nextTimer=null;
  }
  function stop(showMessage=true) {
    const old=session;session=null;
    clearSessionTimers(old);
    if (speech && old) { try {speech.cancel()} catch {} }
    removeMusic();controls();
    if (showMessage) updateStatus('▶ 시낭송 듣기를 누르면 낭송을 시작합니다.');
  }
  function fail(reason) {
    stop(false);
    updateStatus('음성 재생 실패 · ' + reason);
    showHelp(reason);
  }
  function readCurrent(s) {
    if (session!==s || s.paused) return;
    if (s.index>=s.chunks.length) {
      stop(false);
      updateStatus('시낭송이 끝났습니다. ▶ 버튼을 눌러 다시 들을 수 있습니다.');
      return;
    }
    const utter=new Utterance(s.chunks[s.index]);
    utter.lang='ko-KR';utter.rate=s.rate;utter.pitch=1.06;utter.volume=1;
    if (s.voice) utter.voice=s.voice;
    s.utterance=utter;s.currentStarted=false;s.ended=false;
    utter.onstart=()=>{
      if (session!==s) return;
      s.currentStarted=true;
      if (s.watchdog) clearTimeout(s.watchdog);
      s.watchdog=null;
      updateStatus('낭송 중 · '+(s.voice?.name||'한국어 기본 음성')+' · '+(s.index+1)+'/'+s.chunks.length+'구간');
    };
    utter.onend=()=>{
      if (session!==s) return;
      if (s.watchdog) clearTimeout(s.watchdog);
      s.watchdog=null;
      s.ended=true;s.index++;
      if (s.paused) return;
      s.nextTimer=setTimeout(()=>{s.nextTimer=null;readCurrent(s)},380);
    };
    utter.onerror=e=>{
      if (session!==s) return;
      const code=e?.error||'synthesis-error';
      if (code==='canceled' || code==='interrupted') {
        // 재시작 직후 일부 브라우저에서 발생하는 중단 신호.
        if (!s.currentStarted && s.retries++<1 && !s.paused) {
          s.nextTimer=setTimeout(()=>{s.nextTimer=null;readCurrent(s)},350);
        } else if(!s.paused) fail('음성 엔진이 재생을 중단했습니다.');
        return;
      }
      const diagnosis={
        'not-allowed':'현재 앱에서 음성 재생이 차단되었습니다.',
        'language-unavailable':'한국어 음성 엔진을 사용할 수 없습니다.',
        'voice-unavailable':'선택한 목소리를 사용할 수 없습니다.',
        'audio-busy':'다른 앱이 음성 출력을 사용 중입니다.',
        'synthesis-unavailable':'기기에서 합성 음성을 지원하지 않습니다.',
        'synthesis-failed':'음성 변환 중 오류가 발생했습니다.',
        'network':'온라인 한국어 음성 연결에 실패했습니다.'
      };
      fail(diagnosis[code]||('브라우저 음성 오류: '+code));
    };
    try {
      // 반드시 사용자의 재생 클릭 이벤트와 연결하여 브라우저 제약을 최소화합니다.
      speech.speak(utter);
      if (session !== s) return; // 즉시 음성 오류가 발생한 경우 배경음이 남지 않도록 차단
      if (s.index===0 && $('#narrationMusic')?.checked) startMusic(s.theme);
      // 일부 WebView에서는 speak()가 예외 없이 아무것도 수행하지 않습니다.
      s.watchdog=setTimeout(()=>{
        if (session!==s || s.paused || s.currentStarted || s.ended) return;
        try { speech.resume(); } catch {}
        if (speech.speaking) {
          // 일부 엔진은 실제로 소리를 출력하면서도 onstart를 보내지 않습니다.
          // 이때 실제로 읽는 중인 음성을 강제로 취소하지 않고 지원 안내만 표시합니다.
          updateStatus('기기는 음성 재생 중이라고 보고합니다. 소리가 들리지 않으면 아래 도움말을 확인해 주세요.');
          showHelp('음성 시작 확인 신호가 지연되거나 오지 않습니다.');
          s.watchdog=null;
        } else fail('이 브라우저의 음성 엔진이 시작하지 않습니다.');
      },8500);
    } catch {fail('음성 기능을 시작하지 못했습니다.');}
  }
  function start(p) {
    hideHelp();
    if (!speech || !Utterance || typeof speech.speak!=='function') {
      fail('현재 앱 내 브라우저가 음성 합성 기능을 지원하지 않습니다.');
      return;
    }
    const s={id:p.id,index:0,chunks:splitIntoChunks(p),rate:Number($('#narrationSpeed')?.value||.78),voice:voiceForCurrentDevice(),theme:themeOf(p),paused:false,watchdog:null,nextTimer:null,utterance:null,currentStarted:false,ended:false,retries:0};
    session=s;controls();
    updateStatus('한국어 낭송을 시작합니다…');
    try {if (speech.paused) speech.resume()} catch {}
    readCurrent(s);
  }
  function pauseOrResume() {
    const s=session;if (!s) return;
    if (!s.paused) {
      s.paused=true;
      if (s.nextTimer) {clearTimeout(s.nextTimer);s.nextTimer=null;}
      if (s.watchdog) {clearTimeout(s.watchdog);s.watchdog=null;}
      try{speech.pause()}catch{}
      if(ctx && ctx.state==='running') ctx.suspend().catch(()=>{});
      updateStatus('일시정지되었습니다. ▶ 이어 듣기를 누르세요.');
    } else {
      s.paused=false;
      if(ctx && master) ctx.resume().catch(()=>{});
      if(s.ended || !s.utterance || (!speech.speaking && !speech.pending)) {
        s.nextTimer=setTimeout(()=>{s.nextTimer=null;readCurrent(s)},120);
      } else {
        try{speech.resume()}catch{fail('음성 재개에 실패했습니다.')}
      }
      if(session===s) updateStatus('이어서 낭송 중입니다.');
    }
    controls();
  }
  function card(p) {
    // DOM 내부가 렌더링된 다음 한국어 목소리 옵션을 채웁니다.
    queueMicrotask(updateVoices);
    return '<section class="narration-card no-print" aria-label="오디오 시낭송">'
      + '<div class="narration-kicker">AUDIO POETRY · 제'+p.part+'부</div>'
      + '<h2>🎧 「'+html(p.title)+'」 시낭송</h2>'
      + '<p class="narration-desc">한국어 낭송과 작품별 창작 배경 연주 · '+html(themeOf(p).name)+'</p>'
      + '<div class="narration-controls"><button type="button" class="btn-primary" data-action="narration-start">▶ 시낭송 듣기</button>'
      + '<button type="button" class="btn-secondary" data-action="narration-pause" disabled>Ⅱ 잠시 멈춤</button></div>'
      + '<div class="narration-settings"><label>낭송 속도 <select id="narrationSpeed"><option value="0.7">아주 느리게</option><option value="0.78" selected>천천히</option><option value="0.88">조금 빠르게</option></select></label>'
      + '<label>목소리 <select id="narrationVoice"><option value="">한국어 기본 음성</option></select></label>'
      + '<label class="music-check"><input type="checkbox" id="narrationMusic" checked> 배경음악 켜기</label></div>'
      + '<p class="narration-status" id="narrationStatus" role="status" aria-live="polite">▶ 시낭송 듣기를 누르면 낭송을 시작합니다.</p>'
      + '<div class="narration-help" id="narrationHelp" hidden><strong>음성이 재생되지 않는 경우</strong><p data-narration-cause></p><p>ChatGPT·카카오톡·페이스북 등 앱 안에서 열었다면, 아래 링크를 길게 누르거나 주소를 복사해서 <b>Chrome 또는 삼성 인터넷</b>에서 열어 주세요. 기기 설정의 한국어 텍스트 읽어주기(TTS)도 확인해 주세요.</p><div class="narration-help-actions"><a data-narration-external target="_blank" rel="noopener" href="'+publicBase+'#poem-'+String(p.id).padStart(2,'0')+'">외부 브라우저로 열기 ↗</a><button type="button" data-action="narration-copy">사이트 주소 복사</button></div></div>'
      + '<p class="narration-disclosure">본 기능은 미리 녹음한 MP3가 아닌 기기 내장 음성 합성입니다. 일부 앱 내 브라우저에서는 작동하지 않으며 실제 여성 목소리 선택 가능 여부는 설치된 한국어 음성에 따라 다릅니다.</p>'
      + '</section>';
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-action="narration-start"],[data-action="narration-pause"],[data-action="narration-copy"]');
    if(!b)return;
    const action=b.dataset.action;
    if(action==='narration-copy') {
      const address=publicBase+(location.hash||'');
      navigator.clipboard?.writeText(address).then(()=>updateStatus('작품 링크를 복사했습니다. Chrome 주소창에 붙여넣으세요.')).catch(()=>updateStatus('주소: '+address));
      if(!navigator.clipboard) updateStatus('주소: '+address);
      return;
    }
    const p=poemInView();if(!p)return;
    if(action==='narration-pause') pauseOrResume();
    else if(session) stop(); else start(p);
  });
  document.addEventListener('change',e=>{
    if(e.target.id==='narrationVoice') {
      chosenVoice=e.target.value;
      if(session) {stop(false);updateStatus('목소리를 변경했습니다. ▶ 시낭송 듣기를 다시 눌러 주세요.');}
    }
    if(e.target.id==='narrationMusic' && session) {
      if(e.target.checked){if(!startMusic(session.theme)) updateStatus('이 기기는 배경음악을 지원하지 않습니다. 음성 낭송은 계속됩니다.');}
      else removeMusic();
    }
  });
  if(speech){
    if(typeof speech.addEventListener==='function') speech.addEventListener('voiceschanged',updateVoices);
    else speech.onvoiceschanged=updateVoices;
  }
  window.addEventListener('hashchange',()=>stop(false));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&session&&!session.paused) pauseOrResume()});
  window.MyeongdoNarration={card,stop,themeOf};
})();
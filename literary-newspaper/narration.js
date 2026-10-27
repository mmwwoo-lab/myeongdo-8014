/* 명도재문예신문 · 99편 오디오 시낭송 (브라우저 합성음 + 창작 배경 연주) */
(() => {
  'use strict';
  const synth = window.speechSynthesis;
  const Speech = window.SpeechSynthesisUtterance;
  const themes = {
    memory: { name: '따뜻한 회상', notes: [196, 246.94, 293.66, 392], rate: 0.78 },
    longing: { name: '그리움의 밤', notes: [174.61, 220, 261.63, 349.23], rate: 0.75 },
    tenderness: { name: '고요한 서정', notes: [220, 261.63, 329.63, 440], rate: 0.79 },
    hope: { name: '봄빛과 희망', notes: [261.63, 329.63, 392, 523.25], rate: 0.82 }
  };
  let state = null;
  let ctx = null;
  let musicGain = null;
  let musicTimer = null;
  let nodes = [];
  let voicePreference = '';
  const $ = sel => document.querySelector(sel);
  const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));

  function themeOf(p) {
    const words = (p.title + ' ' + p.category + ' ' + p.intro + ' ' + p.review).slice(0, 800);
    if (/그리움|어머니|아버지|이별|죽음|상실|눈물|빈자리|묘지|상처/.test(words)) return themes.longing;
    if (/봄|꽃|햇살|기쁨|희망|웃음|아이|생명|새순|노을/.test(words)) return themes.hope;
    if (/사랑|달|밤|연인|기다림|별|그대/.test(words)) return themes.tenderness;
    return themes.memory;
  }
  function koreanVoices() {
    if (!synth) return [];
    try { return synth.getVoices().filter(v => /^ko([-_]|$)/i.test(v.lang)); }
    catch { return []; }
  }
  function suggestedVoice() {
    const available = koreanVoices();
    if (voicePreference) {
      const chosen = available.find(v => v.voiceURI === voicePreference);
      if (chosen) return chosen;
    }
    return available.find(v => /female|여성|sunhi|yuna|heami|seoyeon|jiyeon|sohee|수진|서연|유나|지연/i.test(v.name))
      || available.find(v => /natural|premium|neural|google/i.test(v.name))
      || available[0] || null;
  }
  function populateVoices() {
    const select = $('#narrationVoice');
    if (!select) return;
    const voices = koreanVoices();
    const previous = select.value || voicePreference;
    select.replaceChildren();
    const auto = document.createElement('option');
    auto.value = ''; auto.textContent = '자동 추천 (기기 한국어 음성)'; select.append(auto);
    voices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI; opt.textContent = v.name + (v.localService ? ' · 기기 설치' : ' · 온라인');
      select.append(opt);
    });
    select.value = voices.some(v => v.voiceURI === previous) ? previous : '';
    if (!voices.length) {
      auto.textContent = '기기 기본 한국어 음성 (목록 준비 중)';
    }
  }
  function chunksFor(p) {
    const chunks = [p.title + '.'];
    const paragraphs = String(p.poem || '').replace(/\r/g, '').split(/\n\s*\n/);
    for (const paragraph of paragraphs) {
      const lines = paragraph.split('\n').map(x => x.trim()).filter(Boolean);
      let block = '';
      for (const line of lines) {
        if (block && (block.length + line.length > 105)) {
          chunks.push(block);
          block = '';
        }
        if (line.length > 160) {
          if (block) chunks.push(block);
          block = '';
          for (let i = 0; i < line.length; i += 100) chunks.push(line.slice(i, i + 100));
        } else block += (block ? '  ' : '') + line;
      }
      if (block) chunks.push(block);
    }
    return chunks.filter(Boolean);
  }
  function status(msg) {
    const el = $('#narrationStatus');
    if (el) el.textContent = msg;
  }
  function controls() {
    const start = $('[data-action="narration-start"]');
    const pause = $('[data-action="narration-pause"]');
    if (start) start.textContent = state ? '■ 낭송 종료' : '▶ 시낭송 듣기';
    if (pause) {
      pause.disabled = !state;
      pause.textContent = state && state.paused ? '▶ 이어 듣기' : 'Ⅱ 잠시 멈춤';
    }
  }
  function silence() {
    if (musicTimer !== null) clearInterval(musicTimer);
    musicTimer = null;
    for (const o of nodes) { try { o.stop(); } catch {} try { o.disconnect(); } catch {} }
    nodes = [];
    if (musicGain) { try { musicGain.disconnect(); } catch {} }
    musicGain = null;
  }
  function bell(frequency, when, duration, loudness) {
    if (!ctx || !musicGain) return;
    const o = ctx.createOscillator();
    const gain = ctx.createGain();
    o.type = 'sine'; o.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(loudness, when + 0.23);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    o.connect(gain); gain.connect(musicGain);
    o.start(when); o.stop(when + duration + 0.03);
    nodes.push(o);
    o.onended = () => {
      const i = nodes.indexOf(o);
      if (i !== -1) nodes.splice(i, 1);
      try { o.disconnect(); gain.disconnect(); } catch {}
    };
  }
  function notes(theme) {
    if (!ctx || !musicGain || !state || state.paused) return;
    const t = ctx.currentTime + 0.08;
    theme.notes.forEach((note, i) => {
      bell(note / 2, t + i * 2.5, 5.9, 0.13);
      bell(note, t + i * 2.5 + 0.65, 3.0, 0.035);
    });
  }
  function musicStart(theme) {
    silence();
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return false;
    try {
      ctx = ctx || new Audio();
      const resume = ctx.resume();
      if (resume && typeof resume.catch === 'function') resume.catch(() => {});
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.095;
      musicGain.connect(ctx.destination);
      notes(theme);
      musicTimer = window.setInterval(() => notes(theme), 10400);
      return true;
    } catch { silence(); return false; }
  }
  function stop(showStatus = true) {
    const current = state;
    state = null;
    if (current && current.timer !== null) clearTimeout(current.timer);
    if (synth) try { synth.cancel(); } catch {}
    silence();
    controls();
    if (showStatus) status('재생 버튼을 누르면 시낭송과 잔잔한 배경음악이 시작됩니다.');
  }
  function playChunk(s) {
    if (!s || state !== s || s.paused) return;
    if (s.index >= s.chunks.length) {
      stop(false);
      status('시낭송을 모두 들었습니다. 다시 듣기를 누르면 처음부터 재생합니다.');
      return;
    }
    const u = new Speech(s.chunks[s.index]);
    u.lang = 'ko-KR';
    u.rate = s.rate;
    u.pitch = 1.04;
    u.volume = 1;
    if (s.voice) u.voice = s.voice;
    s.utterance = u;
    u.onstart = () => {
      if (state === s) status('낭송 중 · ' + (s.voice ? s.voice.name : '기기 기본 한국어 음성') + ' · ' + (s.index + 1) + '/' + s.chunks.length + ' 구간');
    };
    u.onend = () => {
      if (state !== s || s.paused) return;
      s.index += 1;
      s.timer = setTimeout(() => { s.timer = null; playChunk(s); }, s.index === 1 ? 550 : 440);
    };
    u.onerror = ev => {
      if (state !== s) return;
      if (ev.error === 'interrupted' || ev.error === 'canceled') return;
      stop(false);
      status('음성을 재생하지 못했습니다. 브라우저의 한국어 음성 설정을 확인해 주세요. (' + (ev.error || '알 수 없음') + ')');
    };
    try { synth.speak(u); } catch {
      stop(false);
      status('이 브라우저에서 음성 합성을 시작하지 못했습니다. Chrome 또는 Edge를 사용해 주세요.');
    }
  }
  function begin(p) {
    stop(false);
    if (!synth || !Speech) {
      status('이 브라우저는 음성 읽기를 지원하지 않습니다. Chrome 또는 Edge를 사용해 주세요.');
      return;
    }
    const theme = themeOf(p);
    const s = {
      id: p.id, theme, chunks: chunksFor(p), index: 0, paused: false,
      rate: Number($('#narrationSpeed')?.value || 0.78),
      voice: suggestedVoice(), timer: null, utterance: null
    };
    state = s;
    if ($('#narrationMusic')?.checked) musicStart(theme);
    controls();
    status('한국어 낭송을 준비하고 있습니다…');
    playChunk(s);
  }
  function togglePause() {
    const s = state;
    if (!s || !synth) return;
    if (!s.paused) {
      s.paused = true;
      if (s.timer !== null) { clearTimeout(s.timer); s.timer = null; }
      try { synth.pause(); } catch {}
      if (ctx) ctx.suspend().catch(() => {});
      status('낭송 일시정지 · 이어 듣기를 누르세요.');
    } else {
      s.paused = false;
      if (ctx && musicGain) ctx.resume().catch(() => {});
      try { synth.resume(); } catch {}
      if (!s.utterance || (!synth.speaking && !synth.pending)) {
        // 구간과 구간 사이에서 일시정지했다면 다음 구간으로 이어 갑니다.
        s.timer = setTimeout(() => { s.timer = null; playChunk(s); }, 100);
      }
      status('낭송을 이어 듣고 있습니다.');
    }
    controls();
  }
  function card(p) {
    const theme = themeOf(p);
    // 작품 상세 DOM을 다시 렌더링할 때 항상 기기의 음성 목록을 새로 확인합니다.
    queueMicrotask(populateVoices);
    return '<section class="narration-card no-print" aria-label="오디오 시낭송">' +
      '<div class="narration-kicker">AUDIO POETRY · 99편 낭송</div>' +
      '<h2>🎧 오디오 시낭송</h2>' +
      '<p class="narration-desc">천천히 시를 읽는 한국어 음성과 작품별 창작 배경음 · ' + esc(theme.name) + '</p>' +
      '<div class="narration-controls"><button type="button" class="btn-primary" data-action="narration-start">▶ 시낭송 듣기</button>' +
      '<button type="button" class="btn-secondary" data-action="narration-pause" disabled>Ⅱ 잠시 멈춤</button></div>' +
      '<div class="narration-settings"><label>낭송 속도 <select id="narrationSpeed"><option value="0.70">아주 느리게</option><option value="0.78" selected>천천히</option><option value="0.88">조금 빠르게</option></select></label>' +
      '<label>목소리 <select id="narrationVoice"><option value="">자동 추천 (한국어)</option></select></label>' +
      '<label class="music-check"><input id="narrationMusic" type="checkbox" checked> 배경음악</label></div>' +
      '<p class="narration-status" id="narrationStatus" role="status" aria-live="polite">재생 버튼을 누르면 시낭송과 잔잔한 배경음악이 시작됩니다.</p>' +
      '<p class="narration-disclosure">기기에서 제공하는 한국어 합성음으로 낭송합니다. 음색과 여성 음성 사용 가능 여부는 브라우저와 설치된 음성에 따라 다릅니다. 전문 성우 녹음 파일이 아니며, 배경음은 이 사이트에서 생성하는 창작 연주입니다.</p>' +
      '</section>';
  }
  document.addEventListener('click', ev => {
    const button = ev.target.closest('[data-action="narration-start"],[data-action="narration-pause"]');
    if (!button) return;
    const p = window.MYEONGDO_POEMS?.find(x => x.id === Number(location.hash.match(/poem-(\d+)/)?.[1]));
    if (!p) return;
    if (button.dataset.action === 'narration-pause') togglePause();
    else if (state) stop(); else begin(p);
  });
  document.addEventListener('change', ev => {
    if (ev.target.id === 'narrationVoice') {
      voicePreference = ev.target.value;
      if (state) { stop(false); status('목소리를 변경했습니다. 낭송 듣기를 다시 눌러 주세요.'); }
    }
    if (ev.target.id === 'narrationMusic' && state) {
      if (ev.target.checked) {
        const ok = musicStart(state.theme);
        if (state.paused && ctx) ctx.suspend().catch(() => {});
        if (!ok) status('이 브라우저에서는 배경음악 기능을 사용할 수 없습니다.');
      } else silence();
    }
  });
  if (synth) {
    if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', populateVoices);
    else synth.onvoiceschanged = populateVoices;
  }
  window.addEventListener('hashchange', () => stop(false));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state && !state.paused) togglePause();
  });
  window.MyeongdoNarration = { card, stop, profile: themeOf };
})();
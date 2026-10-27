/* 명도재문예신문: browser narration and original generative ambient music. */
(()=>{'use strict';
const synth=window.speechSynthesis;
let ctx=null,active=null,utterance=null,timers=[],musicNodes=[],musicGain=null,loopTimer=null,paused=false,voiceChoice='';
const $=s=>document.querySelector(s);
const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const profiles=[
{label:'고요한 회상',notes:[196,246.94,293.66,392],speed:.76,filter:1100},
{label:'따뜻한 서정',notes:[220,261.63,329.63,440],speed:.79,filter:1500},
{label:'그리움의 밤',notes:[174.61,220,261.63,349.23],speed:.74,filter:900},
{label:'희망의 빛',notes:[261.63,329.63,392,523.25],speed:.82,filter:1900}
];
function profile(p){const t=(p.title+' '+p.category+' '+p.intro+' '+p.review).slice(0,650);if(/그리움|어머니|아버지|이별|죽음|상실|침묵|눈물|슬픔|기억|고향/.test(t))return profiles[2];if(/봄|꽃|햇살|기쁨|희망|새벽|웃음|아이|생명/.test(t))return profiles[3];if(/사랑|달|밤|연인|기다림|별/.test(t))return profiles[1];return profiles[0]}
function availableVoices(){return synth?synth.getVoices().filter(v=>v.lang.toLowerCase().startsWith('ko')):[]}
function selectVoice(){const v=availableVoices();if(voiceChoice){const f=v.find(x=>x.voiceURI===voiceChoice);if(f)return f}return v.find(x=>/female|여성|sunhi|yuna|heami|seoyeon|jiyeon|sora|sohee|유나|서연|지연/i.test(x.name))||v.find(x=>/natural|premium|neural|google/i.test(x.name))||v[0]||null}
function setupMusic(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;try{ctx=ctx||new AC();ctx.resume();musicGain=ctx.createGain();musicGain.gain.value=.12;musicGain.connect(ctx.destination);return true}catch{return false}}
function clearMusic(){if(loopTimer){clearInterval(loopTimer);loopTimer=null}musicNodes.forEach(n=>{try{n.stop()}catch{}try{n.disconnect()}catch{}});musicNodes=[];if(musicGain){try{musicGain.disconnect()}catch{}musicGain=null}}
function playNote(freq,when,dur,vol){if(!ctx||!musicGain)return;const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type='sine';o.frequency.value=freq;f.type='lowpass';f.frequency.value=1400;g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),when+.15);g.gain.exponentialRampToValueAtTime(.0001,when+dur);o.connect(f);f.connect(g);g.connect(musicGain);o.start(when);o.stop(when+dur+.02);musicNodes.push(o)}
function musicLoop(prof){if(!ctx||!musicGain)return;const base=ctx.currentTime+.06;prof.notes.forEach((n,i)=>{playNote(n/2,base+i*2.5,6,.17);playNote(n,base+i*2.5+.45,2.8,.055)});}
function startMusic(prof){clearMusic();if(!setupMusic())return;musicLoop(prof);loopTimer=setInterval(()=>{musicNodes=[];musicLoop(prof)},10200)}
function updateStatus(message){const x=$('#narrationStatus');if(x)x.textContent=message}
function updateButtons(){const start=$('[data-action="narration-start"]'),pause=$('[data-action="narration-pause"]');if(start)start.textContent=active?'■ 낭송 종료':'▶ 시낭송 듣기';if(pause){pause.disabled=!active;pause.textContent=paused?'▶ 이어 듣기':'Ⅱ 잠시 멈춤'}}
function stop(){if(synth){try{synth.cancel()}catch{}}utterance=null;active=null;paused=false;clearMusic();updateButtons();updateStatus('낭송을 선택하면 시의 분위기에 맞춘 잔잔한 배경음이 함께 흐릅니다.')}
function read(p){stop();if(!synth||!window.SpeechSynthesisUtterance){updateStatus('이 브라우저에서는 음성 낭송을 지원하지 않습니다.');return}const v=selectVoice();if(!v){updateStatus('한국어 음성이 설치되지 않았습니다. 기기의 한국어 음성을 설치해 주세요.');return}const prof=profile(p);active=p.id;utterance=new SpeechSynthesisUtterance(p.title+'.\n'+p.poem);utterance.lang='ko-KR';utterance.voice=v;utterance.rate=Number($('#narrationSpeed')?.value||prof.speed);utterance.pitch=1.06;utterance.volume=1;utterance.onend=()=>{if(active===p.id)stop()};utterance.onerror=e=>{if(active===p.id){stop();updateStatus('음성 재생이 중단되었습니다. 기기 음성 설정을 확인해 주세요.')}};const music=$('#narrationMusic');if(!music||music.checked)startMusic(prof);updateStatus('낭송 중 · '+v.name+' · '+prof.label+' 배경음');updateButtons();synth.speak(utterance)}
function card(p){const prof=profile(p);return '<section class="narration-card no-print" aria-label="오디오 시낭송"><div class="narration-kicker">AUDIO POETRY · 명도재문예신문</div><h2>🎧 오디오 시낭송</h2><p class="narration-desc">천천히 시를 읽는 한국어 음성과 작품의 정서에 맞춘 창작 배경음 · '+safe(prof.label)+'</p><div class="narration-controls"><button type="button" class="btn-primary" data-action="narration-start">▶ 시낭송 듣기</button><button type="button" class="btn-secondary" data-action="narration-pause" disabled>Ⅱ 잠시 멈춤</button></div><div class="narration-settings"><label>낭송 속도 <select id="narrationSpeed"><option value="0.70">아주 느리게</option><option value="0.78" selected>천천히</option><option value="0.88">보통보다 느리게</option></select></label><label class="music-check"><input id="narrationMusic" type="checkbox" checked> 배경음악 함께 듣기</label></div><p class="narration-status" id="narrationStatus" role="status" aria-live="polite">낭송을 선택하면 시의 분위기에 맞춘 잔잔한 배경음이 함께 흐릅니다.</p><p class="narration-disclosure">기기에 설치된 한국어 합성 음성을 사용합니다. 실제 20대 여성 성우의 사전 녹음 음원은 아니며, 음색은 기기마다 다릅니다. 배경음은 웹사이트가 직접 생성한 연주입니다.</p></section>'}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action="narration-start"],[data-action="narration-pause"]');if(!b)return;const p=window.MYEONGDO_POEMS?.find(x=>x.id===Number(location.hash.match(/poem-(\d+)/)?.[1]));if(!p)return;if(b.dataset.action==='narration-start'){if(active)stop();else read(p)}else if(active){if(paused){synth.resume();ctx?.resume();paused=false;updateStatus('낭송을 이어 듣고 있습니다.')}else{synth.pause();ctx?.suspend();paused=true;updateStatus('낭송이 일시 정지되었습니다.')}updateButtons()}});
document.addEventListener('change',e=>{if(e.target.id==='narrationMusic'&&active){if(e.target.checked){const p=window.MYEONGDO_POEMS?.find(x=>x.id===active);if(p)startMusic(profile(p))}else clearMusic()}});
window.addEventListener('hashchange',stop);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active){try{synth.pause();ctx?.suspend();paused=true;updateButtons()}catch{}}});
window.MyeongdoNarration={card,stop};
})();
/* 명도재문예신문 · Facebook/Instagram in-app browser Chrome launcher
 * A website cannot change the user's browser automatically. Android Chrome
 * intent links are attempted ONLY on a direct button tap, with clear fallback.
 */
(()=>{'use strict';
const SITE='https://myeongdo-literary-times-1027.vercel.app/';
const HOST='myeongdo-literary-times-1027.vercel.app';
const ua=navigator.userAgent||'';
const android=/Android/i.test(ua);
const inApp=/(FBAN|FBAV|FB_IAB|FBIOS|Instagram|KAKAOTALK|NAVER\(|; NAVER|Line\/|DaumApps|Twitter|Snapchat)/i.test(ua);
const chrome=/Chrome\//i.test(ua)&&!inApp;
const routeRegex=/^(home|collection|commentary|about|part[1-4]|poem-\d{1,2})$/;
const fromQuery=new URLSearchParams(location.search).get('open');
if(fromQuery&&routeRegex.test(fromQuery)&&!location.hash){
  history.replaceState(null,'',location.pathname+'#'+fromQuery);
}
function route(){
  let raw='home';try{raw=decodeURIComponent(location.hash.slice(1))||'home'}catch{}
  return routeRegex.test(raw)?raw:'home';
}
function target(){return SITE+'?open='+encodeURIComponent(route())}
function intentLink(){
  const r=encodeURIComponent(route());
  return 'intent://'+HOST+'/?open='+r+'#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url='+encodeURIComponent(target())+';end';
}
function fallbackMessage(){
  return android
  ? 'Chrome이 자동으로 열리지 않으면 페이스북 화면 오른쪽 위 ⋯ 메뉴에서 ‘외부 브라우저에서 열기’를 선택하거나, 아래 주소 복사 후 Chrome 주소창에 붙여넣으세요.'
  : '앱 안에서 소리가 나오지 않으면 메뉴에서 ‘외부 브라우저에서 열기’를 선택하거나 링크를 복사해 Safari 또는 Chrome에서 열어 주세요.';
}
function addBanner(){
  if(!(android||inApp)||chrome)return;
  const nav=document.querySelector('.main-nav');if(!nav)return;
  const el=document.createElement('div');el.className='chrome-open-banner';
  el.innerHTML='<div class="shell chrome-open-inner"><div><strong>🎧 페이스북에서 시낭송 소리가 안 나나요?</strong><p>Chrome에서 열면 기기 음성 낭송을 들을 수 있습니다. 버튼을 눌러 외부 브라우저를 실행해 보세요.</p></div><button type="button" class="chrome-open-button" data-open-chrome>Chrome에서 시낭송 듣기 ↗</button></div>';
  nav.insertAdjacentElement('afterend',el);
}
function showFallback(button){
  const root=button.closest('.chrome-open-banner,.narration-card')||document.body;
  let help=root.querySelector('.chrome-open-help');
  if(!help){help=document.createElement('div');help.className='chrome-open-help';help.setAttribute('role','status');
    help.innerHTML='<p class="chrome-open-instruction"></p><button class="chrome-copy-button" type="button" data-copy-chrome>시낭송 링크 복사하기</button><span class="chrome-copy-feedback" aria-live="polite"></span>';
    root.appendChild(help);
  }
  help.querySelector('.chrome-open-instruction').textContent=fallbackMessage();
  help.hidden=false;
}
async function copyLink(button){
  const link=target();let ok=false;
  try{await navigator.clipboard.writeText(link);ok=true}catch{}
  if(!ok){
    const el=document.createElement('textarea');el.value=link;el.readOnly=true;el.style.cssText='position:fixed;top:-1000px;left:-1000px';document.body.append(el);el.focus();el.select();try{ok=document.execCommand('copy')}catch{}el.remove();
  }
  const el=button.parentElement?.querySelector('.chrome-copy-feedback');
  if(el)el.textContent=ok?'복사했습니다. Chrome 주소창에 붙여넣어 주세요.':'복사할 수 없습니다. 주소를 직접 길게 눌러 복사해 주세요: '+link;
}
function installCard(){
  const orig=window.MyeongdoNarration;if(!orig||typeof orig.card!=='function')return;
  const previous=orig.card;
  orig.card=p=>{
    const html=previous(p);
    if(!(android||inApp)||chrome)return html;
    const button='<div class="chrome-poem-tip"><span>페이스북에서 소리가 나지 않는 경우</span><button type="button" data-open-chrome>🌐 Chrome에서 이 시 낭송 듣기 ↗</button></div>';
    return html.replace(/(<h2>🎧[^<]*<\/h2>)/, '$1'+button);
  };
}
// A deferred app.js immediately calls render(), so wrap the card before app.js executes.
installCard();
document.addEventListener('DOMContentLoaded',addBanner);
document.addEventListener('click',e=>{
  const copy=e.target.closest('button[data-copy-chrome]');if(copy){e.preventDefault();copyLink(copy);return}
  const button=e.target.closest('button[data-open-chrome]');if(!button)return;
  e.preventDefault();showFallback(button);
  if(android){
    try{location.href=intentLink()}catch{}
  }else{
    try{window.open(target(),'_blank','noopener,noreferrer')}catch{}
  }
});
window.MyeongdoChromeLauncher={target,intentLink,isInApp:inApp,isAndroid:android};
})();
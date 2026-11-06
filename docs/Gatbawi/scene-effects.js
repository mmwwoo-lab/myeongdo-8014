/**
 * 명도재 갓바위 그림 미세 애니메이션 (2026)
 * 원본 픽셀/이미지 비율은 건드리지 않고 투명 Canvas만 겹칩니다.
 * ?effects=edit 로 접속하면 촛불/구름/눈 위치를 직접 지정할 수 있습니다.
 */
(()=>{'use strict';
 const scene=document.querySelector('.scene');
 const picture=scene?.querySelector(':scope > img');
 if(!scene||!picture)return;
 const prefersReducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
 const canvas=document.createElement('canvas');
 canvas.className='gatbawi-effects-layer';
 canvas.setAttribute('aria-hidden','true');
 Object.assign(canvas.style,{
  position:'absolute',inset:'0',width:'100%',height:'100%',
  zIndex:'2',pointerEvents:'none',display:'block'
 });
 // 기본 좌표는 그림 내 상대 위치입니다. 실물 사진에 맞춰 편집 모드로 보정할 수 있습니다.
 const defaults={
  flames:[[0.205,0.625],[0.803,0.635]],
  clouds:[[0.28,0.22],[0.48,0.29],[0.67,0.24]],
  eyes:[[0.36,0.69],[0.54,0.72]]
 };
 const storageKey='myeongdo-gatbawi-scene-effects-v1';
 let config;
 try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');config=saved&&typeof saved==='object'?Object.assign({},defaults,saved):structuredClone(defaults);}catch{config={flames:defaults.flames.map(x=>x.slice()),clouds:defaults.clouds.map(x=>x.slice()),eyes:defaults.eyes.map(x=>x.slice())};}
 for(const key of ['flames','clouds','eyes'])if(!Array.isArray(config[key]))config[key]=defaults[key].map(x=>x.slice());
 const ctx=canvas.getContext('2d',{alpha:true});
 if(!ctx)return;
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 let width=0,height=0,ratio=1,frame=0,animationId=0,visible=!document.hidden;
 // Object-fit:cover로 잘리는 부분을 고려해 원본 이미지 좌표를 장면 좌표로 변환.
 function photoGeometry(){
  const iw=picture.naturalWidth||1,ih=picture.naturalHeight||1;
  const scale=Math.max(width/iw,height/ih);
  return {iw,ih,scale,dx:(width-iw*scale)/2,dy:(height-ih*scale)/2};
 }
 function point(xy){
  const p=photoGeometry();
  return [p.dx+xy[0]*p.iw*p.scale,p.dy+xy[1]*p.ih*p.scale];
 }
 function resize(){
  const r=scene.getBoundingClientRect();
  width=r.width;height=r.height;
  if(!width||!height)return;
  ratio=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.round(width*ratio);
  canvas.height=Math.round(height*ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);
 }
 function candle(x,y,t,i){
  const s=clamp(width/700,0.65,1.35);
  const sway=Math.sin(t*1.45+i*1.3)*2.2*s+Math.sin(t*2.7+i)*0.65*s;
  const pulse=1+Math.sin(t*3.15+i*2.2)*0.045;
  ctx.save();ctx.translate(x,y);ctx.rotate(sway/55);
  const halo=ctx.createRadialGradient(0,-10*s,1,0,-10*s,20*s);
  halo.addColorStop(0,'rgba(255,213,96,.24)');
  halo.addColorStop(0.55,'rgba(255,189,66,.095)');
  halo.addColorStop(1,'rgba(255,179,55,0)');
  ctx.fillStyle=halo;ctx.beginPath();ctx.arc(0,-10*s,20*s,0,Math.PI*2);ctx.fill();
  const h=20*s*pulse,w=4.5*s*pulse;
  ctx.beginPath();ctx.moveTo(0,0);
  ctx.bezierCurveTo(-w*1.2,-h*.34,-w*.7,-h*.74,sway*.17,-h);
  ctx.bezierCurveTo(w*.67,-h*.66,w*1.28,-h*.32,0,0);
  const g=ctx.createLinearGradient(0,0,0,-h);
  g.addColorStop(0,'rgba(255,128,29,.7)');
  g.addColorStop(.55,'rgba(255,213,83,.83)');
  g.addColorStop(1,'rgba(255,250,194,.8)');
  ctx.fillStyle=g;ctx.fill();
  ctx.beginPath();ctx.ellipse(-.3*s,-4*s,1.8*s,4.2*s,0,0,2*Math.PI);
  ctx.fillStyle='rgba(255,251,213,.75)';ctx.fill();
  ctx.restore();
 }
 function cloud(x,y,t,i){
  const drift=(t*2.2+i*29)%(width*.24+60)-width*.12;
  const drop=(t*.32+i*11)%(height*.1+30)-height*.05;
  const scale=clamp(width/700,.6,1.25);
  ctx.save();ctx.translate(x+drift,y+drop);ctx.rotate(-.1);
  for(let j=0;j<3;j++){
   const xx=j*24*scale;
   const grad=ctx.createRadialGradient(xx,0,2,xx,0,64*scale);
   grad.addColorStop(0,'rgba(250,254,255,.105)');
   grad.addColorStop(.5,'rgba(240,249,250,.052)');
   grad.addColorStop(1,'rgba(240,250,255,0)');
   ctx.fillStyle=grad;
   ctx.beginPath();ctx.ellipse(xx,0,70*scale,15*scale,0,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
 }
 // 아주 짧은 눈 감김: 평상시에는 원본 눈을 가리지 않음.
 function blinking(x,y,t,i){
  const cycle=(t+i*2.6)%6.9;
  if(cycle>0.19)return;
  const d=(cycle<.095?cycle/.095:(.19-cycle)/.095);
  const scale=clamp(width/700,.65,1.35);
  ctx.save();ctx.translate(x,y);ctx.lineCap='round';
  ctx.strokeStyle='rgba(61,49,39,'+(.56*d).toFixed(3)+')';
  ctx.lineWidth=1.4*scale;
  // 하나의 좌표가 두 눈 사이 중앙. 눈 주변에만 짧은 곡선을 그립니다.
  for(const offset of [-4.5,4.5]){
   ctx.beginPath();
   ctx.moveTo((offset-2.4)*scale,0);
   ctx.quadraticCurveTo(offset*scale,1.1*scale*d,(offset+2.4)*scale,0);
   ctx.stroke();
  }
  ctx.restore();
 }
 function draw(time){
  if(!visible||prefersReducedMotion)return;
  const t=time/1000;
  ctx.clearRect(0,0,width,height);
  // 배경은 움직이지 않고 반투명 구름층만 조용히 계곡 방향으로 흐름.
  config.clouds.forEach((xy,i)=>{if(Array.isArray(xy)&&xy.length===2){const [x,y]=point(xy);cloud(x,y,t,i)}});
  config.flames.forEach((xy,i)=>{if(Array.isArray(xy)&&xy.length===2){const [x,y]=point(xy);candle(x,y,t,i)}});
  config.eyes.forEach((xy,i)=>{if(Array.isArray(xy)&&xy.length===2){const [x,y]=point(xy);blinking(x,y,t,i)}});
  animationId=requestAnimationFrame(draw);
 }
 function start(){cancelAnimationFrame(animationId);if(!visible)return;resize();if(prefersReducedMotion){ctx.clearRect(0,0,width,height);return;}animationId=requestAnimationFrame(draw);}
 const ro=typeof ResizeObserver==='function'?new ResizeObserver(start):null;
 ro?.observe(scene);
 window.addEventListener('resize',start,{passive:true});
 picture.addEventListener('load',start);
 document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(visible)start();else cancelAnimationFrame(animationId)});
 start();
 // 그림에 실제로 있는 촛불과 인물 얼굴 좌표는 사용자 기기에서 보정할 수 있습니다.
 if(new URLSearchParams(location.search).get('effects')==='edit'){
  const panel=document.createElement('div');
  panel.style.cssText='position:relative;z-index:12;background:#fff9e7;color:#183f30;padding:10px;border:1px solid #a78343;border-radius:10px;font:13px/1.5 sans-serif;max-width:1250px;margin:8px auto';
  panel.innerHTML='<strong>🎨 움직임 위치 조정</strong><p>항목 선택 후 그림의 해당 위치를 누르세요. 촛불은 불꽃 밑부분, 눈은 두 눈 사이를 눌러 지정합니다.</p>';
  const select=document.createElement('select');
  [['flames','촛불'],['clouds','구름'],['eyes','사람 눈']].forEach(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;select.appendChild(o)});
  const reset=document.createElement('button');reset.type='button';reset.textContent='선택한 항목 초기화';
  const done=document.createElement('button');done.type='button';done.textContent='위치 저장 완료';
  panel.append(select,reset,done);
  scene.parentNode.insertBefore(panel,scene);
  canvas.style.pointerEvents='auto';canvas.style.cursor='crosshair';
  canvas.addEventListener('click',event=>{
    const bounds=scene.getBoundingClientRect(),p=photoGeometry();
    const x=clamp((event.clientX-bounds.left-p.dx)/(p.iw*p.scale),0,1);
    const y=clamp((event.clientY-bounds.top-p.dy)/(p.ih*p.scale),0,1);
    if(!panel.dataset[selectedKey(select.value)])panel.dataset[selectedKey(select.value)]='0';
    const i=Number(panel.dataset[selectedKey(select.value)])||0;
    if(i===0)config[select.value]=[];
    config[select.value].push([Number(x.toFixed(4)),Number(y.toFixed(4))]);
    panel.dataset[selectedKey(select.value)]=String(i+1);
    try{localStorage.setItem(storageKey,JSON.stringify(config))}catch{}
    if(prefersReducedMotion){ctx.clearRect(0,0,width,height);config.flames.forEach((xy,k)=>candle(...point(xy),0,k))}
  });
  function selectedKey(k){return 'count'+k}
  reset.onclick=()=>{config[select.value]=[];panel.dataset[selectedKey(select.value)]='0';try{localStorage.setItem(storageKey,JSON.stringify(config))}catch{}};
  done.onclick=()=>{canvas.style.pointerEvents='none';panel.hidden=true;};
 }
})();

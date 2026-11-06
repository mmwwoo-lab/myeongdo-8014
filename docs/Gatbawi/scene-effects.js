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
 let motionEnabled=!prefersReducedMotion;
 const canvas=document.createElement('canvas');
 canvas.className='gatbawi-effects-layer';
 canvas.setAttribute('aria-hidden','true');
 Object.assign(canvas.style,{
  position:'absolute',inset:'0',width:'100%',height:'100%',
  zIndex:'2',pointerEvents:'none',display:'block'
 });
 // 기본 좌표는 그림 내 상대 위치입니다. 실물 사진에 맞춰 편집 모드로 보정할 수 있습니다.
 const defaults={
  flames:[[0.365,0.506],[0.660,0.505]],
  clouds:[[0.16,0.315],[0.23,0.388],[0.72,0.345],[0.84,0.425]],
  eyes:[[0.167,0.648],[0.308,0.680],[0.763,0.686],[0.878,0.683]]
 };
 const storageKey='myeongdo-gatbawi-scene-effects-v2';
 let config;
 try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');config=saved&&typeof saved==='object'?Object.assign({},defaults,saved):structuredClone(defaults);}catch{config={flames:defaults.flames.map(x=>x.slice()),clouds:defaults.clouds.map(x=>x.slice()),eyes:defaults.eyes.map(x=>x.slice())};}
 for(const key of ['flames','clouds','eyes'])if(!Array.isArray(config[key]))config[key]=defaults[key].map(x=>x.slice());
 scene.appendChild(canvas);
 const prayerOverlay=scene.querySelector('.prayer-card');
 const summitOverlay=scene.querySelector('.summit-prayer');
 if(prayerOverlay)prayerOverlay.style.zIndex='5';
 if(summitOverlay)summitOverlay.style.zIndex='4';
 const ctx=canvas.getContext('2d',{alpha:true});
 if(!ctx)return;
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 let width=0,height=0,ratio=1,frame=0,animationId=0,visible=!document.hidden;
 // Face click/tap interactions are timed and independent for all four worshippers.
 const faceCenters=[[.152,.654],[.310,.684],[.760,.684],[.875,.688]];
 const mouthPositions=[[.157,.713],[.320,.742],[.758,.748],[.873,.743]];
 const faceAnimationUntil=[0,0,0,0];
 const faceStartAt=[0,0,0,0];
 scene.dataset.faceMotionCount='0';

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
  const sway=Math.sin(t*1.65+i*1.3)*3.1*s+Math.sin(t*3.1+i)*1.1*s;
  const pulse=1+Math.sin(t*3.15+i*2.2)*0.045;
  ctx.save();ctx.translate(x,y);ctx.rotate(sway/55);
  const halo=ctx.createRadialGradient(0,-10*s,1,0,-10*s,20*s);
  halo.addColorStop(0,'rgba(255,213,96,.48)');
  halo.addColorStop(0.55,'rgba(255,189,66,.19)');
  halo.addColorStop(1,'rgba(255,179,55,0)');
  ctx.fillStyle=halo;ctx.beginPath();ctx.arc(0,-10*s,20*s,0,Math.PI*2);ctx.fill();
  const h=25*s*pulse,w=5.5*s*pulse;
  ctx.beginPath();ctx.moveTo(0,0);
  ctx.bezierCurveTo(-w*1.2,-h*.34,-w*.7,-h*.74,sway*.17,-h);
  ctx.bezierCurveTo(w*.67,-h*.66,w*1.28,-h*.32,0,0);
  const g=ctx.createLinearGradient(0,0,0,-h);
  g.addColorStop(0,'rgba(255,128,29,.90)');
  g.addColorStop(.55,'rgba(255,213,83,.97)');
  g.addColorStop(1,'rgba(255,250,194,.98)');
  ctx.fillStyle=g;ctx.fill();
  ctx.beginPath();ctx.ellipse(-.3*s,-4*s,1.8*s,4.2*s,0,0,2*Math.PI);
  ctx.fillStyle='rgba(255,251,213,.75)';ctx.fill();
  ctx.restore();
 }
 function cloud(x,y,t,i){
  const drift=(t*3.7+i*29)%(width*.19+70)-width*.09;
  const drop=(t*.42+i*11)%(height*.10+30)-height*.05;
  const scale=clamp(width/700,.6,1.25);
  ctx.save();ctx.translate(x+drift,y+drop);ctx.rotate(-.1);
  for(let j=0;j<3;j++){
   const xx=j*24*scale;
   const grad=ctx.createRadialGradient(xx,0,2,xx,0,64*scale);
   grad.addColorStop(0,'rgba(250,254,255,.27)');
   grad.addColorStop(.5,'rgba(240,249,250,.12)');
   grad.addColorStop(1,'rgba(240,250,255,0)');
   ctx.fillStyle=grad;
   ctx.beginPath();ctx.ellipse(xx,0,70*scale,15*scale,0,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
 }
 // 아주 짧은 눈 감김: 평상시에는 원본 눈을 가리지 않음.
 function blinking(x,y,t,i){
  const cycle=(t+i*1.8)%5.3;
  if(cycle>0.34)return;
  const d=(cycle<.17?cycle/.17:(.34-cycle)/.17);
  const scale=clamp(width/700,.65,1.35);
  ctx.save();ctx.translate(x,y);ctx.lineCap='round';
  ctx.strokeStyle='rgba(61,49,39,'+(.86*d).toFixed(3)+')';
  ctx.lineWidth=2.15*scale;
  // 하나의 좌표가 두 눈 사이 중앙. 눈 주변에만 짧은 곡선을 그립니다.
  for(const offset of [-4.5,4.5]){
   ctx.beginPath();
   ctx.moveTo((offset-2.4)*scale,0);
   ctx.quadraticCurveTo(offset*scale,1.1*scale*d,(offset+2.4)*scale,0);
   ctx.stroke();
  }
  ctx.restore();
 }

 function animateFace(i,time){
  const started=faceStartAt[i],remaining=faceAnimationUntil[i]-time;
  if(!started||remaining<=0)return;
  const seconds=(time-started)/1000;
  const s=clamp(width/720,.55,1.55);
  const strength=clamp(remaining/450,0,1);
  const eye=point(config.eyes[i]||defaults.eyes[i]);
  const mouth=point(mouthPositions[i]);
  // Blink twice as the expression changes; eyelid appears only during the blink.
  const phase=seconds%0.82;
  const closed=phase<.32?Math.sin(Math.PI*phase/.32):0;
  if(closed>0.025){
   ctx.save();
   ctx.translate(eye[0],eye[1]);
   const radius=9*s;
   ctx.fillStyle='rgba(236,179,139,'+(Math.min(.68,closed*.66)*strength).toFixed(3)+')';
   for(const offset of [-5.1,5.1]){
    ctx.beginPath();ctx.ellipse(offset*s,0,3.1*s,2.3*s*closed,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(80,53,46,'+(.80*closed*strength).toFixed(3)+')';
    ctx.lineWidth=1.5*s;ctx.lineCap='round';ctx.beginPath();
    ctx.moveTo((offset-3.1)*s,0);
    ctx.quadraticCurveTo(offset*s,1.9*s*closed,(offset+3.1)*s,0);
    ctx.stroke();
   }
   ctx.restore();
  }
  // A small rounded mouth gently opens and closes without changing the source image.
  const openAmount=Math.pow(Math.max(0,Math.sin(seconds*8.3)),2)*strength;
  ctx.save();ctx.translate(mouth[0],mouth[1]);
  const w=clamp(5*s,2.4,8.1),h=clamp((1.2+2.8*openAmount)*s,.8,6.3);
  ctx.fillStyle='rgba(95,49,46,'+(0.28+0.52*openAmount*strength).toFixed(3)+')';
  ctx.beginPath();ctx.ellipse(0,0,w,h,0,0,2*Math.PI);ctx.fill();
  ctx.strokeStyle='rgba(173,91,79,'+(.6*strength).toFixed(3)+')';
  ctx.lineWidth=1.25*s;ctx.beginPath();ctx.moveTo(-w,0);
  ctx.quadraticCurveTo(0,2*s*openAmount,w,0);ctx.stroke();
  ctx.restore();
 }
 function clickFace(event){
  if(!motionEnabled||!visible||new URLSearchParams(location.search).get('effects')==='edit')return;
  if(event.target.closest?.('.prayer-card'))return;
  const bounds=scene.getBoundingClientRect();
  const xx=event.clientX-bounds.left,yy=event.clientY-bounds.top;
  const p=photoGeometry();
  const nx=(xx-p.dx)/(p.iw*p.scale),ny=(yy-p.dy)/(p.ih*p.scale);
  let closest=-1,min=Infinity;
  faceCenters.forEach(([x,y],i)=>{
    const dx=(nx-x)/.075,dy=(ny-y)/.135;
    const distance=dx*dx+dy*dy;
    if(distance<min){min=distance;closest=i;}
  });
  if(min>1||closest<0)return;
  faceStartAt[closest]=performance.now();
  faceAnimationUntil[closest]=faceStartAt[closest]+3200;
  scene.dataset.faceMotion=String(closest+1);
  scene.dataset.faceMotionCount=String(Number(scene.dataset.faceMotionCount||0)+1);
 }
 scene.addEventListener('pointerdown',clickFace);
 scene.addEventListener('pointermove',event=>{
  if(event.target.closest?.('.prayer-card'))return;
  const bounds=scene.getBoundingClientRect(),p=photoGeometry();
  const nx=(event.clientX-bounds.left-p.dx)/(p.iw*p.scale);
  const ny=(event.clientY-bounds.top-p.dy)/(p.ih*p.scale);
  scene.style.cursor=faceCenters.some(([x,y])=>((nx-x)/.075)**2+((ny-y)/.135)**2<=1)?'pointer':'';
 },{passive:true});
 scene.addEventListener('pointerleave',()=>{scene.style.cursor='';});
 function draw(time){
  if(!visible||!motionEnabled)return;
  const t=time/1000;
  ctx.clearRect(0,0,width,height);
  // 배경은 움직이지 않고 반투명 구름층만 조용히 계곡 방향으로 흐름.
  config.clouds.forEach((xy,i)=>{if(Array.isArray(xy)&&xy.length===2){const [x,y]=point(xy);cloud(x,y,t,i)}});
  config.flames.forEach((xy,i)=>{if(Array.isArray(xy)&&xy.length===2){const [x,y]=point(xy);candle(x,y,t,i)}});
  config.eyes.forEach((xy,i)=>{if(Array.isArray(xy)&&xy.length===2){const [x,y]=point(xy);blinking(x,y,t,i)}});
  faceCenters.forEach((_,i)=>animateFace(i,time));
  animationId=requestAnimationFrame(draw);
 }
 function start(){cancelAnimationFrame(animationId);if(!visible)return;resize();if(!motionEnabled){ctx.clearRect(0,0,width,height);return;}animationId=requestAnimationFrame(draw);}
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
    if(!motionEnabled){ctx.clearRect(0,0,width,height);config.flames.forEach((xy,k)=>candle(...point(xy),0,k))}
  });
  function selectedKey(k){return 'count'+k}
  reset.onclick=()=>{config[select.value]=[];panel.dataset[selectedKey(select.value)]='0';try{localStorage.setItem(storageKey,JSON.stringify(config))}catch{}};
  done.onclick=()=>{canvas.style.pointerEvents='none';panel.hidden=true;};
 }
})();

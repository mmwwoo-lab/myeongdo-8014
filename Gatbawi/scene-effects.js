/**
 * 명도재 갓바위 그림 미세 애니메이션 (2026)
 * 원본 픽셀/이미지 비율은 건드리지 않고 투명 Canvas만 겹칩니다.
 * ?effects=edit 로 접속하면 촛불/구름 위치를 직접 지정할 수 있습니다.
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
  clouds:[[0.16,0.315],[0.23,0.388],[0.72,0.345],[0.84,0.425]]
 };
 const storageKey='myeongdo-gatbawi-scene-effects-v3';
 let config;
 try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');config=saved&&typeof saved==='object'?Object.assign({},defaults,saved):structuredClone(defaults);}catch{config={flames:defaults.flames.map(x=>x.slice()),clouds:defaults.clouds.map(x=>x.slice()),eyes:defaults.eyes.map(x=>x.slice())};}
 for(const key of ['flames','clouds'])if(!Array.isArray(config[key]))config[key]=defaults[key].map(x=>x.slice());
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
 let hoveredCloud=-1;
 let touchCloud=-1,touchUntil=0;
 const cloudState=[];
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
  const s=clamp(width/700,.60,1.40);
  // Slow breathing growth: 0.55x at the smallest and 1.85x at the tallest,
  // with a subtle secondary flicker and a breeze that rocks the flame.
  const breath=(1+Math.sin(t*2.55+i*1.4))/2;
  const pulse=.55+1.30*breath;
  const flicker=1+.065*Math.sin(t*7.2+i*2.1);
  const h=29*s*pulse*flicker;
  const w=6.1*s*(.72+.60*breath);
  const sway=Math.sin(t*1.45+i*1.1)*.19+Math.sin(t*3.2+i)*.07;
  ctx.save();ctx.translate(x,y);ctx.rotate(sway);
  const halo=ctx.createRadialGradient(0,-h*.56,1,0,-h*.56,27*s*(.65+.85*breath));
  halo.addColorStop(0,'rgba(255,231,129,.56)');
  halo.addColorStop(.56,'rgba(255,176,54,.23)');
  halo.addColorStop(1,'rgba(255,173,51,0)');
  ctx.fillStyle=halo;
  ctx.beginPath();ctx.arc(0,-h*.56,27*s*(.65+.85*breath),0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(0,0);
  ctx.bezierCurveTo(-w*1.2,-h*.36,-w*.8,-h*.74,0,-h);
  ctx.bezierCurveTo(w*.9,-h*.72,w*1.25,-h*.32,0,0);
  const g=ctx.createLinearGradient(0,0,0,-h);
  g.addColorStop(0,'rgba(255,120,27,.95)');
  g.addColorStop(.53,'rgba(255,208,69,.99)');
  g.addColorStop(1,'rgba(255,252,212,.99)');
  ctx.fillStyle=g;ctx.fill();
  ctx.beginPath();ctx.ellipse(0,-h*.25,w*.34,h*.18,0,0,Math.PI*2);
  ctx.fillStyle='rgba(255,255,223,.88)';ctx.fill();
  ctx.restore();
 }
 function cloud(x,y,t,i,strength){
  if(strength<=.005)return;
  const s=clamp(width/700,.55,1.55);
  const state=cloudState[i]||{start:t};
  const travel=Math.min((t-state.start)*16*s,120*s);
  const spread=1+1.15*strength;
  ctx.save();ctx.translate(x+travel,y+Math.sin(t*.72+i)*5*s);
  ctx.rotate(-.055);
  for(let j=0;j<5;j++){
   const xx=(j-2)*37*s*spread;
   const radius=130*s*spread;
   const alpha=(.22+.065*Math.sin(j*1.17)**2)*strength;
   const grad=ctx.createRadialGradient(xx,0,1,xx,0,radius);
   grad.addColorStop(0,'rgba(248,252,255,'+alpha.toFixed(3)+')');
   grad.addColorStop(.48,'rgba(241,250,254,'+(alpha*.49).toFixed(3)+')');
   grad.addColorStop(1,'rgba(241,251,255,0)');
   ctx.fillStyle=grad;ctx.beginPath();
   ctx.ellipse(xx,0,radius,clamp(41*s*spread,19,130),0,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
 }
 function draw(ms){
  if(!visible||!motionEnabled)return;
  const t=ms/1000;
  ctx.clearRect(0,0,width,height);
  const selected=t<touchUntil?touchCloud:hoveredCloud;
  config.clouds.forEach((xy,i)=>{
    if(!Array.isArray(xy)||xy.length!==2)return;
    const st=cloudState[i]||(cloudState[i]={strength:0,start:t});
    const desired=i===selected?1:0;
    if(desired===1&&st.strength<.015)st.start=t;
    st.strength+=clamp(desired-st.strength,-.018,.048);
    if(st.strength>.005){const [x,y]=point(xy);cloud(x,y,t,i,st.strength);}
  });
  config.flames.forEach((xy,i)=>{
    if(Array.isArray(xy)&&xy.length===2){const [x,y]=point(xy);candle(x,y,t,i);}
  });
  animationId=requestAnimationFrame(draw);
 }
 function selectCloud(event){
  if(event.target.closest?.('.prayer-card'))return;
  const r=scene.getBoundingClientRect(),m=photoGeometry();
  const nx=(event.clientX-r.left-m.dx)/(m.iw*m.scale);
  const ny=(event.clientY-r.top-m.dy)/(m.ih*m.scale);
  let closest=-1,best=Infinity;
  config.clouds.forEach((xy,i)=>{
    if(!Array.isArray(xy)||xy.length!==2)return;
    const dist=((nx-xy[0])/.24)**2+((ny-xy[1])/.16)**2;
    if(dist<=1&&dist<best){best=dist;closest=i;}
  });
  return closest;
 }
 scene.addEventListener('pointermove',event=>{
   if(event.pointerType==='touch')return;
   const next=selectCloud(event);
   hoveredCloud=typeof next==='number'?next:-1;
   scene.style.cursor=hoveredCloud>=0?'default':'';
 },{passive:true});
 scene.addEventListener('pointerdown',event=>{
   if(event.pointerType!=='touch')return;
   const next=selectCloud(event);
   if(typeof next==='number'&&next>=0){
     touchCloud=next;
     touchUntil=performance.now()/1000+4.2;
   }
 },{passive:true});
 scene.addEventListener('pointerleave',()=>{hoveredCloud=-1;scene.style.cursor='';});
 function start(){
  cancelAnimationFrame(animationId);
  if(!visible)return;
  resize();
  if(!motionEnabled){ctx.clearRect(0,0,width,height);return;}
  animationId=requestAnimationFrame(draw);
 }
 const ro=typeof ResizeObserver==='function'?new ResizeObserver(start):null;
 ro?.observe(scene);
 window.addEventListener('resize',start,{passive:true});
 picture.addEventListener('load',start);
 document.addEventListener('visibilitychange',()=>{
   visible=!document.hidden;
   if(visible)start();else cancelAnimationFrame(animationId);
 });
 start();
  // 그림에 실제로 있는 촛불과 구름 좌표는 사용자 기기에서 보정할 수 있습니다.
 if(new URLSearchParams(location.search).get('effects')==='edit'){
  const panel=document.createElement('div');
  panel.style.cssText='position:relative;z-index:12;background:#fff9e7;color:#183f30;padding:10px;border:1px solid #a78343;border-radius:10px;font:13px/1.5 sans-serif;max-width:1250px;margin:8px auto';
  panel.innerHTML='<strong>🎨 움직임 위치 조정</strong><p>항목 선택 후 그림의 해당 위치를 누르세요. 촛불은 불꽃 밑부분, 눈은 두 눈 사이를 눌러 지정합니다.</p>';
  const select=document.createElement('select');
  [['flames','촛불'],['clouds','구름']].forEach(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;select.appendChild(o)});
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

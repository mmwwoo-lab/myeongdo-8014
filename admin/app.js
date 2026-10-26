(function exhibitionStudio(){
"use strict";
const $=id=>document.getElementById(id);
const KEY="myeongdo_8014_studio_v1";
const OLD_KEY="myeongdo_artweb_v7_projects";
const MAX=20;
const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const safeLink=value=>{try{const u=new URL(String(value||""));return u.protocol==="https:"?u.href:""}catch{return""}};
const safeImage=value=>typeof value==="string"&&/^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(value)?value:"";
const freshWork=()=>({id:"work-"+Math.random().toString(36).slice(2,11),title:"",year:"",material:"",size:"",caption:"",critique:"",musicUrl:"",videoUrl:"",videoFile:"",videoStatus:"",musicStyle:"",musicSeed:0,localVideoReady:false,dataUrl:"",filename:""});
const freshProject=()=>({id:"",title:"",artist:"",genre:"한국화",status:"기획",subtitle:"",summary:"",biography:"",artistNote:"",contact:"",officialUrl:"",review:"",cover:"",portrait:"",rightsConfirmed:false,exhibitionVideoUrl:"",publicUrl:"",publicPath:"",artworks:[freshWork()],updatedAt:""});
const fields={"title":"title","artist":"artist","genre":"genre","status":"status","subtitle":"subtitle","summary":"summary","biography":"biography","artist-note":"artistNote","contact":"contact","official-url":"officialUrl","review":"review","exhibition-video-url":"exhibitionVideoUrl"};
const text=(node,value)=>{node.textContent=value;};
const normalize=p=>{
 if(!p||typeof p!=="object")return null;
 const base=freshProject();
 const result={...base,...p};
 result.id=String(p.id||"");
 result.publicUrl=safeLink(p.publicUrl);
 result.publicPath=String(p.publicPath||"");
 result.title=String(p.title||"");
 result.artist=String(p.artist||p.owner||"");
 result.genre=String(p.genre||"한국화");
 result.status=["기획","제작 중","검수","검수 완료"].includes(p.status)?p.status:"기획";
 result.artistNote=String(p.artistNote||"");
 result.officialUrl=safeLink(p.officialUrl||p.linkUrl);
 result.cover=safeImage(p.cover);
 result.portrait=safeImage(p.portrait);
 result.review=String(p.review||"");
 result.rightsConfirmed=Boolean(p.rightsConfirmed);
 result.exhibitionVideoUrl=safeLink(p.exhibitionVideoUrl);
 result.artworks=Array.isArray(p.artworks)?p.artworks.slice(0,MAX).filter(Boolean).map(a=>({
 ...freshWork(),...a,
 dataUrl:safeImage(a.dataUrl),
 title:String(a.title||""),
 year:String(a.year||""),
 material:String(a.material||""),
 size:String(a.size||""),
 caption:String(a.caption||""),
 critique:String(a.critique||""),
 musicUrl:safeLink(a.musicUrl),
 videoUrl:safeLink(a.videoUrl),
 videoFile:String(a.videoFile||""),videoStatus:String(a.videoStatus||""),localVideoReady:Boolean(a.localVideoReady)
 })):[];
 if(!result.artworks.length)result.artworks=[freshWork()];
 return result;
};
const readJSON=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch{return null}};
let stored=readJSON(KEY);
if(!Array.isArray(stored)){
 const old=readJSON(OLD_KEY);
 stored=Array.isArray(old)?old.filter(p=>p&&p.template==="exhibition").map(normalize).filter(Boolean):[];
 try{localStorage.setItem(KEY,JSON.stringify(stored))}catch{}
}
let projects=stored.map(normalize).filter(Boolean);
let draft=freshProject();
let dirty=false;
let currentView="dashboard";
const locallyGenerated=new Map();
const MEDIA_DB="myeongdo-artwork-films-v1";
function openMediaDB(){
 if(typeof indexedDB==="undefined")return Promise.resolve(null);
 return new Promise(resolve=>{
  try{
   const req=indexedDB.open(MEDIA_DB,1);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains("films"))req.result.createObjectStore("films")};
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>resolve(null);
   req.onblocked=()=>resolve(null);
  }catch{resolve(null)}
 });
}
async function persistFilm(id,blob){
 const db=await openMediaDB();
 if(!db)return false;
 return new Promise(resolve=>{
  try{
   const tx=db.transaction("films","readwrite");
   tx.objectStore("films").put(blob,id);
   tx.oncomplete=()=>{db.close();resolve(true)};
   tx.onerror=()=>{db.close();resolve(false)};
   tx.onabort=()=>{db.close();resolve(false)};
  }catch{db.close();resolve(false)}
 });
}
async function recoverFilm(id){
 const db=await openMediaDB();if(!db)return null;
 return new Promise(resolve=>{
  try{
   const tx=db.transaction("films","readonly");
   const q=tx.objectStore("films").get(id);
   q.onsuccess=()=>resolve(q.result instanceof Blob?q.result:null);
   q.onerror=()=>resolve(null);
   tx.oncomplete=()=>db.close();
   tx.onabort=()=>db.close();
  }catch{db.close();resolve(null)}
 });
}
async function removePersistedFilm(id){
 const db=await openMediaDB();if(!db)return;
 try{const tx=db.transaction("films","readwrite");tx.objectStore("films").delete(id);tx.oncomplete=()=>db.close();tx.onerror=()=>db.close()}catch{db.close()}
}
async function restoreLocalFilms(){
 const token=draft;
 for(const w of token.artworks){
  if(!w.localVideoReady||locallyGenerated.get(w.id)?.video)continue;
  const film=await recoverFilm(w.id);
  if(token!==draft)return;
  if(film){storeLocal(w,"video",film,film.type.includes("mp4")?"mp4":"webm");const el=[...document.querySelectorAll(".work-editor")].find(x=>x.dataset.id===w.id);if(el)updateMediaControls(el,w)}
  else{w.localVideoReady=false;w.videoStatus="영상 원본 확인 필요 · 다시 제작하세요"}
 }
}
function discardLocalMedia(id){
 removePersistedFilm(id);
 const entry=locallyGenerated.get(id);
 if(!entry)return;
 for(const kind of ["music","video"]){if(entry[kind]?.url)URL.revokeObjectURL(entry[kind].url)}
 locallyGenerated.delete(id);
}
function clearLocalMedia(){
 for(const entry of locallyGenerated.values())for(const kind of ["music","video"]){if(entry[kind]?.url)URL.revokeObjectURL(entry[kind].url)}
 locallyGenerated.clear();
}
const MUSIC_DURATION=20;
const MUSIC_STYLES=[
 {id:"piano",label:"피아노 독주",prompt:"Solo classical piano instrumental, gentle lyrical piano light music, andante tempo, expressive rubato, warm acoustic grand piano, delicate right-hand melody, flowing left-hand arpeggios, soft broken chords, romantic classical phrasing, natural piano resonance, intimate recital hall ambience, gradual crescendo, graceful ritardando, bittersweet nostalgia, peaceful hopeful coda, no vocals, no drums, no strings, no brass."},
 {id:"violin",label:"바이올린 독주",prompt:"Expressive solo violin instrumental, lyrical romantic classical theme, legato bowing, warm sustained string tone, natural vibrato, intimate chamber hall ambience, delicate dynamics and phrasing, graceful melodic movement, reflective and tender character, soft long-note ending, no vocals, no drums."},
 {id:"classical",label:"클래식 앙상블",prompt:"Romantic chamber classical instrumental, gentle piano arpeggios with lyrical first violin and a warm small string ensemble, expressive orchestral phrasing, rich harmonic movement, cinematic yet intimate classical ambience, gradual swells, natural hall resonance, elegant final cadence, no vocals, no drums."}
];
const musicStyleFor=w=>MUSIC_STYLES.find(style=>style.id===w.musicStyle)||null;
function selectMusicStyle(w){
 // Every press selects a random instrumental family, avoiding an immediate repeat.
 const previous=MUSIC_STYLES.findIndex(style=>style.id===w.musicStyle);
 const candidate=previous<0?Math.floor(Math.random()*MUSIC_STYLES.length):Math.floor(Math.random()*(MUSIC_STYLES.length-1));
 const index=previous<0?candidate:candidate+(candidate>=previous?1:0);
 const style=MUSIC_STYLES[index];
 w.musicStyle=style.id;
 w.musicSeed=Math.floor(Math.random()*0x100000000)>>>0;
 return style;
}
function artworkMusicHash(w){
 // Artwork metadata and small samples of uploaded image bytes personalize each score.
 // Do not scan an entire large data URL; sampled bytes are sufficient for variation.
 const bytes=String(w.dataUrl||"");
 const sample=bytes.length?[bytes.slice(30,230),bytes.slice(Math.max(0,Math.floor(bytes.length/2)-100),Math.floor(bytes.length/2)+100),bytes.slice(-200)].join(""):"";
 const input=[w.id,w.title,w.caption,w.material,w.year,w.filename,sample,w.musicSeed].join("|");
 let hash=2166136261;
 for(let i=0;i<input.length;i++){hash^=input.charCodeAt(i);hash=Math.imul(hash,16777619)}
 return hash>>>0;
}
function musicForArtwork(w){
 // Original browser-generated MIDI-style synthesis, not sampled studio instruments
 // or a third-party AI composer. Piano, bowed violin and chamber ensemble have
 // distinct attack/release, overtone, vibrato and accompaniment structures.
 const style=selectMusicStyle(w);
 const seed=artworkMusicHash(w);
 const rate=16000,frames=MUSIC_DURATION*rate,twoPi=2*Math.PI;
 const buffer=new ArrayBuffer(44+frames*2),view=new DataView(buffer);
 const write=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i))};
 write(0,"RIFF");view.setUint32(4,36+frames*2,true);write(8,"WAVE");write(12,"fmt ");
 view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
 view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);
 view.setUint16(34,16,true);write(36,"data");view.setUint32(40,frames*2,true);
 const hashFloat=(shift)=>((seed>>>shift)&255)/255;
 const isMinor=((seed>>>7)&1)===1;
 const degrees=isMinor?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11];
 const tonic=[48,50,52,53,55,57][seed%6];
 const midi=(degree)=>tonic+degrees[((degree%7)+7)%7]+12*Math.floor(degree/7);
 const hz=(note)=>440*Math.pow(2,(note-69)/12);
 const progression=isMinor?[0,5,3,4]:[0,3,4,0];
 const notes=[];
 const add=(degree,time,length,volume,instrument)=>{
   if(time<0||time>=MUSIC_DURATION)return;
   notes.push({frequency:hz(midi(degree)),start:time,length:Math.min(length,MUSIC_DURATION-time),
               volume,instrument});
 };
 const variations=[
  [9,8,7,6,5],[7,9,8,6,7],[9,11,9,8,7],[7,8,9,7,5],
  [6,8,9,11,9],[11,9,7,6,7]
 ];
 const phrase=variations[(seed>>>12)%variations.length];
 const tempo=[.82,.94,1.03,1.12][(seed>>>20)%4];
 for(let bar=0;bar<4;bar++){
   const time=bar*5,root=progression[bar];
   const pulse=.58/tempo;
   if(style.id==="piano"){
     add(root-7,time+.02,3.6,.19,"piano");
     for(let n=0;n<9;n++)add(root+[0,2,4,2,1,2,4,2,0][n],time+.17+n*pulse*.93,.75,.14,"piano");
   }else if(style.id==="violin"){
     // Bowed melody with quieter low-register bowed chord tones.
     add(root-7,time+.06,4.60,.10,"strings");
     add(root+2,time+.15,4.40,.07,"strings");
     add(root+4,time+.24,4.22,.06,"strings");
   }else{
     // Distinct chamber arrangement: piano arpeggios under expressive strings.
     add(root-7,time+.05,4.60,.12,"strings");
     add(root+2,time+.15,4.35,.10,"strings");
     add(root+4,time+.20,4.15,.08,"strings");
     for(let n=0;n<8;n++)add(root+[0,2,4,2,1,2,4,2][n],time+.13+n*pulse,.78,.085,"piano");
   }
   for(let i=0;i<5;i++){
     const rise=((seed>>>(i+bar+3))&1)?1:0;
     const target=phrase[(i+bar)%phrase.length]+(bar===2?1:0)+(i===4?0:rise);
     const begin=time+.22+i*.94/tempo+.025*Math.sin(i*2.3+bar);
     const length=i===4?1.05:.78/tempo;
     add(target,begin,length,style.id==="piano"?.32:style.id==="violin"?.25:.22,
       style.id==="piano"?"piano":"violin");
   }
 }
 const audio=new Float32Array(frames);
 for(const note of notes){
   const first=Math.max(0,Math.floor(rate*note.start));
   const last=Math.min(frames,Math.ceil(rate*(note.start+note.length+(note.instrument==="piano"?.8:.45))));
   for(let n=first;n<last;n++){
     const age=n/rate-note.start;
     if(age<0)continue;
     const release=age>note.length?Math.exp(-(age-note.length)*(note.instrument==="piano"?4.0:6.0)):1;
     let wave,env;
     if(note.instrument==="piano"){
       env=Math.min(1,age/.009)*Math.exp(-age*1.25)*release;
       const phase=twoPi*note.frequency*age;
       wave=.67*Math.sin(phase)+.21*Math.sin(phase*2.002)+.09*Math.sin(phase*3.009)+.025*Math.sin(phase*4.012);
     }else{
       const bowed=note.instrument==="violin";
       env=Math.min(1,age/(bowed?.14:.35))*(bowed?.87+.13*Math.sin(age*twoPi*.37):.9)*release;
       const mod=bowed?.0042:.0021;
       const phase=twoPi*note.frequency*(age+mod*Math.sin(twoPi*(bowed?5.4:4.2)*age)/(bowed?5.4:4.2));
       wave=(bowed?.53:.60)*Math.sin(phase)+.27*Math.sin(2*phase)+.13*Math.sin(3*phase)+.07*Math.sin(4*phase);
     }
     audio[n]+=note.volume*env*wave;
   }
 }
 const delayA=Math.round(rate*.117),delayB=Math.round(rate*.239);
 let peak=0;
 for(let n=0;n<frames;n++){
   const t=n/rate;
   const hall=(n>=delayA?audio[n-delayA]*.105:0)+(n>=delayB?audio[n-delayB]*.062:0);
   const fadeIn=Math.min(1,t/.35),fadeOut=Math.max(0,Math.min(1,(MUSIC_DURATION-t)/1.9));
   audio[n]=(audio[n]+hall)*fadeIn*fadeOut;
   peak=Math.max(peak,Math.abs(audio[n]));
 }
 const scale=peak>0?.83/peak:1;
 for(let n=0;n<frames;n++){
   const value=Math.max(-.96,Math.min(.96,audio[n]*scale));
   view.setInt16(44+n*2,Math.round(value*32767),true);
 }
 return new Blob([buffer],{type:"audio/wav"});
}
function storeLocal(w,kind,blob,extension){
 const entry=locallyGenerated.get(w.id)||{};
 if(entry[kind]?.url)URL.revokeObjectURL(entry[kind].url);
 entry[kind]={blob,url:URL.createObjectURL(blob),extension};
 locallyGenerated.set(w.id,entry);
}
function supportedVideoMime(){
 if(typeof MediaRecorder==="undefined"||!HTMLCanvasElement.prototype.captureStream)return "";
 const types=["video/webm;codecs=vp8,opus","video/webm;codecs=vp8","video/webm","video/mp4;codecs=avc1.42E01E","video/mp4"];
 return types.find(t=>MediaRecorder.isTypeSupported(t))||"";
}
async function recordArtworkFilm(w,audioBlob,onProgress){
 const mime=supportedVideoMime();
 if(!mime)throw Error("이 브라우저에서 영상 제작을 지원하지 않습니다. Chrome 또는 Edge에서 다시 시도하거나 Python MP4 제작 기능을 이용하세요.");
 const picture=new Image();
 await new Promise((res,rej)=>{picture.onload=res;picture.onerror=()=>rej(Error("등록한 작품 이미지를 열 수 없습니다."));picture.src=w.dataUrl});
 const canvas=document.createElement("canvas");canvas.width=1280;canvas.height=720;
 const ctx=canvas.getContext("2d");if(!ctx)throw Error("영상 캔버스를 초기화하지 못했습니다.");
 const duration=MUSIC_DURATION,framesPerSecond=24;
 const frames=canvas.captureStream(framesPerSecond);
 let context=null,source=null,audioTrack=null;
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(Audio&&audioBlob){
    try{
      context=new Audio();
      const buffer=await context.decodeAudioData(await audioBlob.arrayBuffer());
      const dest=context.createMediaStreamDestination();
      source=context.createBufferSource();source.buffer=buffer;source.connect(dest);
      audioTrack=dest.stream.getAudioTracks()[0]||null;
      await context.resume();
    }catch(e){if(context){await context.close().catch(()=>{});context=null;source=null}audioTrack=null}
  }
  if(!audioTrack)throw Error("음악 트랙을 준비하지 못했습니다. 소리가 포함된 영상만 등록합니다. 브라우저를 확인해 주세요.");
  const stream=new MediaStream([...frames.getVideoTracks(),audioTrack]);
  let recorder;
  try{recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1800000})}
  catch(err){throw Error("영상 녹화 기능을 시작할 수 없습니다: "+err.message)}
  const pieces=[];
  const result=new Promise((resolve,reject)=>{
    recorder.ondataavailable=e=>{if(e.data?.size)pieces.push(e.data)};
    recorder.onerror=e=>reject(Error("영상 제작에 실패했습니다: "+(e.error?.message||"기록 오류")));
    recorder.onstop=()=>pieces.length?resolve(new Blob(pieces,{type:recorder.mimeType||mime})):reject(Error("빈 영상이 생성되어 저장하지 않았습니다."));
  });
  let animation=0,timer=0,stopped=false;
  const clean=()=>{cancelAnimationFrame(animation);clearTimeout(timer);frames.getTracks().forEach(track=>track.stop());if(audioTrack)audioTrack.stop();if(context)context.close().catch(()=>{})};
  const artist=($("artist").value||"명도재 전시"),title=w.title||"무제";
  // Tripod-quality Ken Burns camera path: slow pan, tilt and dolly zoom.
  // Four five-second shots connected with smoothstep easing (no abrupt jumps).
  const shots=[
    {x:-.7,y:.58,z:1.02},{x:.80,y:.34,z:1.085},
    {x:.60,y:-.75,z:1.035},{x:-.72,y:-.42,z:1.085},
    {x:-.7,y:.58,z:1.02}
  ];
  const pose=t=>{
    const segment=Math.min(3,Math.floor(t/5));
    const fraction=Math.max(0,Math.min(1,(t-segment*5)/5));
    const ease=fraction*fraction*(3-2*fraction);
    const mix=k=>shots[segment][k]+(shots[segment+1][k]-shots[segment][k])*ease;
    return {x:mix("x")*30,y:mix("y")*23,z:mix("z")+.008*Math.sin(t*Math.PI/5)};
  };
  const paint=start=>{
    const frame=now=>{
      const time=Math.min(duration,(now-start)/1000),progress=time/duration;
      const cam=pose(time);
      // Depth-of-field backdrop: a larger, darkened, blurred copy of the artwork.
      ctx.fillStyle="#14241d";ctx.fillRect(0,0,1280,720);
      ctx.save();ctx.filter="blur(32px) brightness(.63) saturate(.82)";
      const bgScale=Math.max(1280/picture.width,720/picture.height)*1.2;
      const bgWidth=picture.width*bgScale,bgHeight=picture.height*bgScale;
      ctx.drawImage(picture,(1280-bgWidth)/2-cam.x*.23,(720-bgHeight)/2-cam.y*.25,bgWidth,bgHeight);
      ctx.restore();
      const tone=ctx.createLinearGradient(0,0,1280,0);
      tone.addColorStop(0,"rgba(14,25,21,.20)");
      tone.addColorStop(.62,"rgba(14,25,21,.47)");
      tone.addColorStop(1,"rgba(14,25,21,.82)");
      ctx.fillStyle=tone;ctx.fillRect(0,0,1280,720);
      // Original artwork stays complete and undistorted within the gallery frame.
      const fit=Math.min(730/picture.width,560/picture.height)*cam.z;
      const width=picture.width*fit,height=picture.height*fit;
      const x=445+cam.x-width/2,y=350+cam.y-height/2;
      ctx.save();ctx.shadowColor="rgba(0,0,0,.48)";
      ctx.shadowBlur=34;ctx.shadowOffsetY=13;
      ctx.fillStyle="#f5f1e8";ctx.fillRect(x-12,y-12,width+24,height+24);
      ctx.restore();ctx.drawImage(picture,x,y,width,height);
      // Stable curatorial captions, independent of the simulated camera move.
      ctx.fillStyle="rgba(15,29,23,.78)";ctx.fillRect(878,56,352,610);
      ctx.fillStyle="#ddc394";ctx.font="25px Georgia,serif";ctx.fillText("MYEONGDOJAE",905,107,300);
      ctx.strokeStyle="rgba(221,195,148,.55)";ctx.beginPath();ctx.moveTo(905,124);ctx.lineTo(1200,124);ctx.stroke();
      ctx.fillStyle="#eef0e9";ctx.font="23px sans-serif";ctx.fillText(String(artist).slice(0,18),905,180,294);
      ctx.fillStyle="#fffdf6";ctx.font="bold 31px sans-serif";ctx.fillText(String(title).slice(0,18),905,240,294);
      ctx.fillStyle="#cad0c5";ctx.font="17px sans-serif";
      ctx.fillText(String([w.year,w.material].filter(Boolean).join(" · ")).slice(0,30),905,285,294);
      const caption=String(w.caption||"작품과 클래식 피아노가 만나는 순간").replace(/\s+/g," ");
      ctx.font="17px sans-serif";
      for(let i=0;i<4;i++){const row=caption.slice(i*17,(i+1)*17);if(row)ctx.fillText(row,905,355+i*29,295)}
      ctx.fillStyle="#dfbd87";ctx.font="14px Georgia,serif";
      ctx.fillText("CINEMATIC PIANO ART FILM",905,580,300);
      ctx.font="12px sans-serif";ctx.fillText("SLOW PAN · TILT · ZOOM",905,603,300);
      ctx.fillStyle="#ffffff30";ctx.fillRect(905,628,294,3);
      ctx.fillStyle="#dfbd87";ctx.fillRect(905,628,294*progress,3);
      const fade=Math.min(1,time/.8,(duration-time)/1.1);
      if(fade<1){ctx.fillStyle="rgba(14,24,19,"+(1-Math.max(0,fade))+")";ctx.fillRect(0,0,1280,720)}
      if(time<duration&&!stopped)animation=requestAnimationFrame(frame);
    };
    animation=requestAnimationFrame(frame);
  };
  try{
    ctx.fillStyle="#17251f";ctx.fillRect(0,0,1280,720);
    recorder.start(1000);
    if(source)source.start();
    paint(performance.now());
    await new Promise(res=>{timer=setTimeout(res,duration*1000)});
    stopped=true;recorder.stop();
    const blob=await result;
    return {blob,extension:mime.includes("mp4")?"mp4":"webm"};
  }finally{stopped=true;clean()}
 }catch(err){frames.getTracks().forEach(track=>track.stop());if(context)await context.close().catch(()=>{});throw err}
}
function updateMediaControls(el,w){
 const output=el.querySelector("[data-media-output]"),status=el.querySelector("[data-media-status]");
 output.replaceChildren();
 const media=locallyGenerated.get(w.id)||{};
 const musicButton=el.querySelector('[data-act="make-music"]'),videoButton=el.querySelector('[data-act="make-video"]');
 musicButton.disabled=!w.dataUrl;
 videoButton.disabled=!w.dataUrl||!supportedVideoMime();
 if(!w.dataUrl){status.textContent="먼저 작품 사진을 등록하면 음악·영상 만들기 버튼이 활성화됩니다.";return}
 const flags=[];
 if(media.music){
   flags.push("음악 생성 완료");
   const audio=document.createElement("audio");audio.controls=true;audio.src=media.music.url;audio.preload="none";
   const a=document.createElement("a");a.href=media.music.url;a.download=(w.title||"myeongdo-work").replace(/[\\/:*?"<>|]/g,"-")+".wav";a.textContent="↓ 음악 WAV 저장";
   output.append(audio,a);
 }
 if(media.video){
   flags.push("음악+영상 완성");
   const video=document.createElement("video");video.controls=true;video.preload="metadata";video.playsInline=true;video.src=media.video.url;
   const a=document.createElement("a");a.href=media.video.url;a.download=(w.title||"myeongdo-work").replace(/[\\/:*?"<>|]/g,"-")+"."+media.video.extension;a.textContent="↓ 영상 "+media.video.extension.toUpperCase()+" 저장";
   output.append(video,a);
 }
 status.textContent=(musicStyleFor(w)?"🎼 "+musicStyleFor(w).label+" · ":"")+(flags.length?flags.join(" · ")+(w.localVideoReady?" · 전시관에 자동 등록됨":" · 영상 제작 후 자동 등록할 수 있습니다."):(!videoButton.disabled?"작품 사진 등록 완료 · 랜덤 악기로 음악·영상 만들기":"음악만 가능 · 영상은 Chrome/Edge 또는 Python 기능 이용"));
 const prompt=el.querySelector("[data-music-prompt]");if(prompt)prompt.textContent=musicStyleFor(w)?.prompt||"음악 생성 전입니다. 피아노 독주·바이올린 독주·클래식 앙상블 중에서 작품별로 무작위 선택됩니다.";
}

const notify=(message,bad=false)=>{const n=$("notice");n.textContent=message;n.dataset.kind=bad?"error":"success"};
const setDirty=()=>{dirty=true};
function applyForm(p){
 clearLocalMedia();
 draft=normalize(p)||freshProject();
 for(const [id,key] of Object.entries(fields)){const control=$(id);control.value=draft[key]??""}
 $("project-id").value=draft.id;
 $("rights-confirm").checked=draft.rightsConfirmed;
 $("cover-upload").value="";
 $("portrait-upload").value="";
 previewUpload("cover");previewUpload("portrait");
 renderWorks();restoreLocalFilms();syncPublicAddress();notify("");dirty=false;
 document.dispatchEvent(new CustomEvent("myeongdo:project-loaded",{detail:draft}));
}
function capture(){
 for(const [id,key] of Object.entries(fields))draft[key]=$(id).value.trim();
 draft.rightsConfirmed=$("rights-confirm").checked;
 draft.id=$("project-id").value;
 document.dispatchEvent(new CustomEvent("myeongdo:capture-project",{detail:draft}));
 return draft;
}
function show(view){
 currentView=["dashboard","create","projects","guide"].includes(view)?view:"dashboard";
 document.body.dataset.studioView=currentView;
 document.querySelectorAll(".view").forEach(s=>s.classList.toggle("visible",s.id==="view-"+currentView));
 document.querySelectorAll("[data-view]").forEach(el=>el.classList.toggle("active",el.dataset.view===currentView&&!el.dataset.jump));
 $("page-heading").textContent=currentView==="create"?"명도재 이명우 홈페이지 작업실":currentView==="projects"?"내 미술 전시 프로젝트":currentView==="guide"?"미술작품 전시 사용 안내":"명도재 이명우의 창작실";
 history.replaceState(null,"","#"+currentView);
 if(currentView==="projects"||currentView==="dashboard")renderProjects();
 window.scrollTo({top:0,behavior:"smooth"});
}
const fileAsImage=file=>new Promise((resolve,reject)=>{
 if(!file||!["image/png","image/jpeg","image/webp"].includes(file.type))return reject(new Error("JPG·PNG·WebP 이미지만 등록할 수 있습니다."));
 if(file.size>25*1024*1024)return reject(new Error("이미지는 25MB 이하로 선택해 주세요."));
 const reader=new FileReader();
 reader.onerror=()=>reject(new Error("이미지를 읽을 수 없습니다."));
 reader.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error("이미지 파일 형식을 확인해 주세요."));img.onload=()=>{
 const scale=Math.min(1,1350/Math.max(img.width,img.height));
 const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
 const ctx=canvas.getContext("2d");if(!ctx)return reject(new Error("브라우저 이미지 처리를 사용할 수 없습니다."));
 ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
 resolve(canvas.toDataURL("image/jpeg",0.78));
 };img.src=reader.result;};
 reader.readAsDataURL(file);
});
function previewUpload(key){
 const el=$(key==="cover"?"cover-preview":"portrait-preview");el.replaceChildren();
 const data=safeImage(draft[key]);if(!data){text(el,key==="cover"?"표지 이미지 미등록 · 기본 배경 적용":"프로필 이미지 미등록");return}
 const image=document.createElement("img");image.src=data;image.alt=key==="cover"?"전시 표지 미리보기":"작가 프로필 미리보기";el.append(image);
 const remove=document.createElement("button");remove.type="button";remove.className="ghost";remove.textContent="사진 삭제";remove.addEventListener("click",()=>{draft[key]="";$(key+"-upload").value="";previewUpload(key);setDirty()});el.append(remove);
}
function registerImage(key){
 $(key+"-upload").addEventListener("change",async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{draft[key]=await fileAsImage(file);previewUpload(key);setDirty();notify("사진을 등록했습니다. 저장 버튼을 눌러 보관하세요.")}
  catch(err){notify(err.message,true);e.target.value=""}
 });
}
function videoState(w){
 if(!w.dataUrl)return "이미지 미등록 · 영상 제작 전";
 if(safeLink(w.videoUrl))return "영상 URL 등록됨 · 실제 공개 여부 별도 확인";
 if(w.localVideoReady)return "음악 포함 작품 영상 자동 등록 완료";
 if(w.videoFile)return (w.videoStatus||"Python 영상 제작 완료")+" · 파일 업로드 대기";
 if(w.videoStatus)return w.videoStatus;
 return "작품 이미지 등록 완료 · 영상 제작 대기";
}
function renderVideoStats(){
 const list=draft.artworks;
 const images=list.filter(w=>w.dataUrl).length;
 const made=list.filter(w=>Boolean(w.localVideoReady||w.videoFile||safeLink(w.videoUrl))).length;
 const linked=list.filter(w=>Boolean(safeLink(w.videoUrl))).length;
 $("video-stats").textContent="이미지 등록 "+images+"점 · 영상 제작 기록 "+made+"점 · 공개 영상 URL 등록 "+linked+"점";
}
function renderWorks(){
 const wrap=$("artwork-list");wrap.replaceChildren();
 draft.artworks.forEach((w,i)=>{
  const el=document.createElement("article");el.className="work-editor";el.dataset.id=w.id;
  el.innerHTML='<div class="work-header"><h3>작품 '+(i+1)+' <small>ARTWORK '+String(i+1).padStart(2,"0")+'</small></h3><div class="work-tools"><button type="button" data-act="up" title="위로 이동" aria-label="작품 위로 이동">↑</button><button type="button" data-act="down" title="아래로 이동" aria-label="작품 아래로 이동">↓</button><button type="button" data-act="remove" class="danger">삭제</button></div></div>'+
  '<div class="work-fields"><div class="work-image-col"><label>작품 이미지 (JPG·PNG·WebP)<input type="file" data-art-file accept="image/jpeg,image/png,image/webp"></label><div class="art-upload-preview" data-image></div></div>'+
  '<div class="work-info-col"><p class="work-video-status" data-video-status role="status"></p><label class="quick-work-title">작품명<input data-field="title" maxlength="140" placeholder="사진 이름으로 자동입력"></label><details class="optional-details work-extra"><summary>선택 · 제작연도·규격·작품 해설·미술평론</summary><div class="field-grid"><label>제작연도<input data-field="year" maxlength="50" placeholder="2026"></label><label>재료·기법<input data-field="material" maxlength="140" placeholder="수채화, 캔버스에 유채"></label><label>크기<input data-field="size" maxlength="100" placeholder="72.7 × 60.6 cm"></label></div>'+
  '<label>작품 설명<textarea data-field="caption" rows="3" maxlength="2600" placeholder="작품에 담긴 이야기"></textarea></label>'+
  '<label>작품별 미술평론<textarea data-field="critique" rows="3" maxlength="3500" placeholder="조형 요소, 색채와 상징에 대한 평론"></textarea></label>'+
  '<div class="field-grid"><label>음악 감상 링크 (HTTPS)<input data-field="musicUrl" type="url" placeholder="https://..."></label><label>영상 감상 링크 (HTTPS)<input data-field="videoUrl" type="url" placeholder="https://..."></label></div>'+
  '</details><div class="work-create-media"><p class="cinematic-caption">🎬 작품별 음악 랜덤 생성 · 피아노·바이올린·클래식 앙상블 · 20초 감상 영상</p><details class="music-style-brief"><summary>작품별 선택 음악 스타일 · Suno 프롬프트</summary><p data-music-prompt></p><button type="button" data-act="copy-prompt" class="subtle">Suno 스타일 프롬프트 복사</button><p class="helper">피아노 독주·바이올린 독주·클래식 앙상블 가운데 랜덤으로 선택합니다. 작품 제목·이미지에 따라 곡도 달라집니다. 전문 악기 녹음이나 Suno AI 결과가 아닌 브라우저 합성 연주입니다.</p></details><div class="media-buttons"><button type="button" class="primary execute-artwork" data-act="make-video">▶ 작품 실행 · 음악+영상 제작·등록</button><button type="button" class="subtle" data-act="make-music">♫ 음악 만들기 · 랜덤 재생성</button></div><p class="work-create-status" data-media-status role="status"></p><div class="generated-media" data-media-output></div><p class="helper">작품마다 랜덤 악기 구성과 서로 다른 선율을 생성합니다. 20초 팬·틸트·줌 영상을 만들면 생성된 음악을 함께 녹음합니다. 영상 완성 후 이 브라우저에 자동 등록됩니다. 전시관 미리보기에서 음악과 함께 감상하고, 전시 홈페이지 HTML로 함께 저장할 수 있습니다.</p></div></div></div>';
  wrap.append(el);
  const badge=el.querySelector("[data-video-status]");
  badge.textContent=videoState(w);
  const pic=el.querySelector("[data-image]");
  if(w.dataUrl){const image=document.createElement("img");image.src=w.dataUrl;image.alt=w.title||"등록한 작품";pic.append(image)}
  else{text(pic,"작품 이미지가 아직 없습니다.")}
  for(const inp of el.querySelectorAll("[data-field]")){
    const key=inp.dataset.field;
    inp.value=w[key]||"";
    inp.addEventListener("input",()=>{w[key]=inp.value;setDirty();if(key==="videoUrl"){badge.textContent=videoState(w);renderVideoStats()}});
  }
  const promptField=el.querySelector("[data-music-prompt]");if(promptField)promptField.textContent=musicStyleFor(w)?.prompt||"음악 만들기를 누르면 피아노·바이올린·클래식 앙상블 중 하나를 랜덤으로 선택합니다. 스타일별 Suno 프롬프트도 제공됩니다.";
  const promptButton=el.querySelector('[data-act="copy-prompt"]');
  if(promptButton)promptButton.addEventListener("click",async()=>{
    try{await navigator.clipboard.writeText(musicStyleFor(w)?.prompt||MUSIC_STYLES[0].prompt);notify("현재 음악 스타일 프롬프트를 복사했습니다. Suno 스타일 입력란에 붙여넣으세요.")}
    catch{notify("브라우저 복사가 제한되었습니다. 화면의 프롬프트를 선택하여 복사하세요.",true)}
  });
  updateMediaControls(el,w);
  el.querySelector('[data-act="make-music"]').addEventListener("click",()=>{
    try{
      const file=musicForArtwork(w);
      storeLocal(w,"music",file,"wav");
      updateMediaControls(el,w);
      setDirty();notify("작품 "+(i+1)+"에 "+(musicStyleFor(w)?.label||"기악 음악")+"을 생성했습니다. 다시 누르면 다른 악기·선율로 바뀝니다."+(w.localVideoReady?" 기존 영상은 이전 음악입니다. 바꾸려면 영상 만들기를 다시 실행해 주세요.":""));
    }catch(err){notify("음악 생성 오류: "+err.message,true)}
  });
  el.querySelector('[data-act="make-video"]').addEventListener("click",async()=>{
    const button=el.querySelector('[data-act="make-video"]');
    button.disabled=true;button.textContent="영상 제작 중…";
    el.querySelector("[data-media-status]").textContent="약 20초 분량의 음악 포함 작품 영상을 녹화하고 있습니다. 제작이 끝날 때까지 편집을 유지하세요.";
    try{
      const music=locallyGenerated.get(w.id)?.music?.blob||musicForArtwork(w);
      if(!locallyGenerated.get(w.id)?.music)storeLocal(w,"music",music,"wav");
      const result=await recordArtworkFilm(w,music);
      storeLocal(w,"video",result.blob,result.extension);
      const persisted=await persistFilm(w.id,result.blob);
      w.localVideoReady=persisted;
      w.videoStatus=persisted?(musicStyleFor(w)?.label||"음악")+" 영상 제작·등록 완료":"영상 생성 완료 · 브라우저 저장 실패";
      setDirty();
      updateMediaControls(el,w);
      renderVideoStats();
      if(persisted){save();notify("작품 "+(i+1)+"에 "+(musicStyleFor(w)?.label||"음악")+"을 넣은 영상이 자동 등록됐습니다. 전시관 바로 보기에서 확인하세요.")}
      else notify("영상은 만들어졌지만 브라우저 저장소에 등록하지 못했습니다. 영상 파일을 먼저 내려받아 보관하세요.",true);
    }catch(err){
      updateMediaControls(el,w);
      notify("영상 제작 오류: "+err.message,true);
    }finally{button.textContent="▶ 작품 다시 실행 · 음악+영상 등록";button.disabled=!w.dataUrl||!supportedVideoMime()}
  });
  el.querySelector("[data-art-file]").addEventListener("change",async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{discardLocalMedia(w.id);w.dataUrl=await fileAsImage(file);w.filename=file.name;w.videoStatus="";w.videoFile="";w.localVideoReady=false;renderWorks();setDirty();notify("작품 "+(i+1)+" 이미지를 등록했습니다.")}
    catch(err){notify(err.message,true)}
  });
  el.querySelector('[data-act="remove"]').addEventListener("click",()=>{
    if(!confirm("이 작품을 전시에서 삭제할까요?"))return;
    discardLocalMedia(w.id);draft.artworks.splice(i,1);renderWorks();setDirty()
  });
  el.querySelector('[data-act="up"]').disabled=i===0;
  el.querySelector('[data-act="down"]').disabled=i===draft.artworks.length-1;
  for(const [key,delta] of [["up",-1],["down",1]]){
    el.querySelector('[data-act="'+key+'"]').addEventListener("click",()=>{
      const other=i+delta;if(other<0||other>=draft.artworks.length)return;
      [draft.artworks[i],draft.artworks[other]]=[draft.artworks[other],draft.artworks[i]];
      renderWorks();setDirty()
    });
  }
 });
 $("artwork-count").textContent="작품 "+draft.artworks.filter(w=>w.dataUrl).length+"점 이미지 등록 · 총 "+draft.artworks.length+"개 입력 카드 · 최대 "+MAX+"점";
 $("add-artwork").disabled=draft.artworks.length>=MAX;
 renderVideoStats();
 if(!draft.artworks.length){const empty=document.createElement("p");empty.className="empty";empty.textContent="등록된 작품이 없습니다. '+ 작품 추가'를 눌러 시작하세요.";wrap.append(empty)}
}
const validProject=p=>p.title&&p.artist;
function store(){
 try{localStorage.setItem(KEY,JSON.stringify(projects));return true}
 catch{return false}
}
function save(){
 capture();
 if(!validProject(draft)){notify("전시 제목과 작가 이름을 모두 입력해 주세요.",true);$("title").focus();return false}
 const old=projects.slice();
 const id=draft.id||"exh-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6);
 const output=normalize({...draft,id,updatedAt:new Date().toISOString()});
 const index=projects.findIndex(p=>p.id===id);
 if(index>=0)projects[index]=output;else projects.unshift(output);
 if(!store()){projects=old;notify("브라우저 저장공간이 부족합니다. 이미지를 줄이거나 JSON 백업을 먼저 내려받아 주세요.",true);return false}
 draft=normalize(output);$("project-id").value=id;dirty=false;
 syncPublicAddress();
 renderWorks();
 notify("전시가 이 브라우저에 저장되었습니다. 서버에 공개된 것은 아닙니다.");renderProjects();return true
}
const download=(filename,body,mime)=>{
 const blob=new Blob([body],{type:mime});const url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
};
const slug=str=>String(str||"").normalize("NFKD").replace(/[^a-zA-Z0-9가-힣_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,45)||"exhibition";
function site(p,localFilms={}){
 const title=esc(p.title||"미술작품 전시"), artist=esc(p.artist||"작가"), tagline=esc(p.subtitle||"미술작품과 음악이 만나는 디지털 전시");
 const works=p.artworks.filter(w=>w.dataUrl);
 const portrait=safeImage(p.portrait)?'<figure class="artist-portrait-group"><img class="portrait" src="'+p.portrait+'" alt="'+artist+' 작가 프로필"><figcaption class="artist-photo-name">'+artist+'</figcaption></figure>':"";
 const cover=safeImage(p.cover)?'<img class="cover-image" src="'+p.cover+'" alt="'+title+' 전시 표지">':"";
 const link=safeLink(p.officialUrl)?'<a class="outside" href="'+esc(safeLink(p.officialUrl))+'" target="_blank" rel="noopener noreferrer">작가 공식 사이트 ↗</a>':"";
 const textBlock=(t,def="내용을 준비 중입니다.")=>esc(t||def);
 const fullVideo=safeLink(p.exhibitionVideoUrl);
 const fullVideoHtml=fullVideo?'<section class="section" id="film"><span class="kicker">EXHIBITION FILM</span><h2>전체 전시 영상</h2>'+( /\.(mp4|webm)(?:[?#]|$)/i.test(fullVideo)?'<video controls playsinline preload="metadata" style="width:100%;max-height:75vh" src="'+esc(fullVideo)+'"></video>':'<a class="outside" href="'+esc(fullVideo)+'" target="_blank" rel="noopener noreferrer">전체 전시 영상 감상 ↗</a>')+'</section>':"";
 const each=works.map((w,i)=>{
  const audio=safeLink(w.musicUrl),video=safeLink(w.videoUrl),builtFilm=localFilms[w.id]||"";
  const audioControl=audio&&/\.(mp3|wav|ogg|m4a)(?:[?#]|$)/i.test(audio)?'<audio controls preload="none" src="'+esc(audio)+'"></audio>':"";
  const filmSource=builtFilm||(video&&/\.(mp4|webm)(?:[?#]|$)/i.test(video)?video:"");
  const player=filmSource?'<video controls playsinline preload="metadata" src="'+esc(filmSource)+'" aria-label="'+esc(w.title||"작품")+' 음악이 함께 나오는 영상"></video>':"";
  const videoLabel=w.videoFile?'<p class="video-made">Python 영상 제작 완료'+(video?" · 영상 URL 등록됨":" · 영상 파일 업로드 필요")+'</p>':"";
  return '<article class="work" id="work-'+(i+1)+'"><label class="work-image" title="클릭하면 120% 확대, 다시 클릭하면 원래 크기"><input class="work-zoom-toggle" type="checkbox" aria-label="'+esc(w.title||"작품 "+(i+1))+' 120% 확대 또는 원래 크기로 복귀"><img loading="lazy" src="'+w.dataUrl+'" alt="'+esc(w.title||"작품 "+(i+1))+'"><span class="zoom-hint"><span class="zoom-in-hint">＋ 클릭하여 120% 확대</span><span class="zoom-out-hint">− 클릭하여 원래 크기</span></span></label><div class="work-info"><span class="kicker">ARTWORK '+String(i+1).padStart(2,"0")+'</span><h3>'+esc(w.title||"작품 "+(i+1))+'</h3><p class="meta">'+esc([w.year,w.material,w.size].filter(Boolean).join(" · "))+'</p><p class="prose">'+esc(w.caption)+'</p>'+(w.critique?'<div class="critique"><b>작품 평론</b><p class="prose">'+esc(w.critique)+'</p></div>':"")+'<div class="media">'+(audio?'<a href="'+esc(audio)+'" target="_blank" rel="noopener noreferrer">♫ 음악 감상 ↗</a>':"")+(video?'<a href="'+esc(video)+'" target="_blank" rel="noopener noreferrer">▶ 영상 감상 ↗</a>':"")+audioControl+player+videoLabel+'</div></div></article>';
 }).join("");
 const stylesheet=`
:root{--paper:#f7f4ec;--ink:#28362d;--muted:#6d766c;--gold:#a48258}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--ink);background:var(--paper);font:16px/1.8 system-ui,'Malgun Gothic',sans-serif}a{color:inherit}.top{background:#fffdf8;border-bottom:1px solid #e8e1d3;padding:16px max(22px,calc((100vw - 1160px)/2));display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.logo{text-decoration:none;font:700 18px Georgia,serif;letter-spacing:.1em}.nav{display:flex;gap:20px;flex-wrap:wrap;font-size:13px}.nav a{text-decoration:none}.nav a:hover{color:var(--gold)}.hero{padding:65px 20px 70px;background:linear-gradient(132deg,#e1e6df,#f7f3e8,#e7dbc8);text-align:center}.kicker{color:var(--gold);font-size:12px;letter-spacing:.18em;font-weight:700}.hero h1{font:normal clamp(33px,6vw,72px)/1.28 Georgia,'Noto Serif KR',serif;margin:17px auto;max-width:1000px}.hero .artist{font-weight:700}.cover-image{display:block;margin:32px auto 0;max-width:min(100%,900px);max-height:510px;object-fit:contain;border:7px solid #fff9;box-shadow:0 16px 38px #23392c20}.wrap{max-width:1160px;margin:auto;padding:0 24px}.section{padding:60px 0;border-bottom:1px solid #e4dcce}.section h2{font:normal 35px Georgia,'Noto Serif KR',serif;margin:12px 0 24px}.prose{white-space:pre-wrap;margin:0 0 14px;color:#58655a}.artistbox{display:flex;align-items:flex-start;gap:34px}.artistcopy{flex:1}.portrait{width:190px;aspect-ratio:3/4;object-fit:cover}.works{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}.work{margin:0;background:#fffdfa;border:1px solid #e7dfd3;overflow:hidden}.work-image{display:block;position:relative;background:#eae5dc;aspect-ratio:4/3;overflow:hidden;cursor:zoom-in}.work-image img{display:block;width:100%;height:100%;object-fit:contain;transform:scale(1);transform-origin:center center;transition:transform .50s cubic-bezier(.22,.61,.36,1);pointer-events:none}.work-zoom-toggle{position:absolute;width:1px;height:1px;opacity:0;z-index:-1}.work-image:focus-within{outline:3px solid #a48258;outline-offset:-3px}.work-zoom-toggle:checked~img{transform:scale(1.20)}.work-image:has(.work-zoom-toggle:checked){cursor:zoom-out}.zoom-hint{position:absolute;bottom:12px;left:12px;padding:5px 10px;border-radius:4px;background:#18261fce;color:#fff;font-size:12px;line-height:1.4;pointer-events:none}.zoom-out-hint{display:none}.work-zoom-toggle:checked~.zoom-hint .zoom-in-hint{display:none}.work-zoom-toggle:checked~.zoom-hint .zoom-out-hint{display:inline}@media(prefers-reduced-motion:reduce){.work-image img{transition:none}}.work-info{padding:23px}.work h3{font:normal 27px Georgia,'Noto Serif KR',serif;margin:8px 0}.meta{color:#837662;font-size:13px;margin:2px 0 15px}.critique{border-top:1px solid #e9e1d4;margin-top:15px;padding-top:12px}.critique b{font-size:13px;color:#94704d}.media{display:flex;flex-wrap:wrap;gap:9px;margin-top:16px}.media a,.outside{padding:8px 14px;border:1px solid #b49b7e;color:#74583b;text-decoration:none;font-size:13px}.media audio,.media video{width:100%;display:block;max-height:350px}.video-made{font-size:12px;color:#70654f;margin:4px 0}footer{text-align:center;padding:37px 20px;background:#293c30;color:#f8f4e9}#works .helper{color:var(--muted)}@media(max-width:720px){.works{grid-template-columns:1fr}.artistbox{display:block}.portrait{width:145px;margin-bottom:18px}.section{padding:42px 0}.hero{padding:55px 18px}.section h2{font-size:28px}}
/* Shared light design palette embedded for independent exhibition exports. */
:root{color-scheme:light;--paper:#ffffff;--ink:#26384e;--muted:#5b6b81;--gold:#7553a2}
body{background:#fff!important;color:#26384e}
.top{background:#fafbff!important;border-bottom:1px solid #e0e5ef;color:#293b56}
.logo{color:#293b56}
.nav{gap:9px}
.nav a{display:inline-flex;align-items:center;background:#ebe3fa;color:#4b3674;border:1px solid #d6c5ee;padding:9px 13px;border-radius:9px;text-decoration:none;font-weight:700}
.nav a:hover{background:#dfd1f4;color:#39265e}
.nav a:focus-visible,.media a:focus-visible,.outside:focus-visible{outline:3px solid #aa84df;outline-offset:3px}
.hero{background:linear-gradient(115deg,#fff,#f7f5ff 55%,#edf7ff);color:#293b52}
.hero :is(h1,p){color:#293b52}
.section{border-color:#e2e7f0}.prose{color:#52667e}
.work{background:#fff;border-color:#dfe5ef}
.work-image{background:#f7f9ff}
.media a,.outside{display:inline-flex;align-items:center;background:#ebe3fa;color:#4b3674;border:1px solid #d6c5ee;padding:9px 14px;border-radius:9px;font-weight:700}
.media a:hover,.outside:hover{background:#dfd1f4}
.media a[href*=".mp4"],.media a[href*=".webm"]{background:#eaf3ff;color:#315273;border-color:#cbdcf0}
.zoom-hint{background:#f1ecf9eF;color:#41335e}
.artist-portrait-group{display:flex;flex-direction:column;align-items:center;flex:0 0 190px;width:190px;margin:0}
.artist-portrait-group .portrait{display:block;width:190px;max-width:100%;height:auto;aspect-ratio:3/4;object-fit:cover;border-radius:8px;background:#f5f1fb}
.artist-photo-name{display:block;width:100%;padding:12px 4px 0;text-align:center;font:700 20px/1.5 system-ui,'Malgun Gothic',sans-serif;color:#3e2c63;word-break:keep-all;overflow-wrap:anywhere}
@media(max-width:720px){.artist-portrait-group{width:145px;margin:0 0 20px}.artist-portrait-group .portrait{width:145px}.artist-photo-name{font-size:18px}}

footer{background:#f8f9fd;color:#536780;border-top:1px solid #dfe5ef}
`;
 return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#ffffff"><meta name="description" content="'+esc((p.summary||p.subtitle||"미술작품 전시").slice(0,160))+'"><title>'+title+' | MYEONGDOJAE</title><style>'+stylesheet+'</style></head><body>'+
 '<header class="top"><a class="logo" href="#top">MYEONGDOJAE · 明道</a><nav class="nav"><a href="#artist">작가 소개</a><a href="#story">전시 이야기</a><a href="#works">작품 감상</a><a href="#review">미술평론</a><a href="#contact">전시 안내</a></nav></header>'+
 '<section id="top" class="hero"><div class="kicker">MYEONGDOJAE · ARTIST EXHIBITION · '+esc(p.genre)+'</div><h1>'+title+'</h1><p>'+tagline+'</p><p class="artist">'+artist+'</p>'+cover+'</section>'+
 '<main class="wrap"><section id="artist" class="section"><span class="kicker">ABOUT THE ARTIST</span><h2>작가 소개</h2><div class="artistbox">'+portrait+'<div class="artistcopy"><p class="prose">'+textBlock(p.biography)+'</p>'+(p.artistNote?'<h3>작가 노트</h3><p class="prose">'+esc(p.artistNote)+'</p>':"")+'</div></div></section>'+
 '<section id="story" class="section"><span class="kicker">EXHIBITION STORY</span><h2>전시 이야기</h2><p class="prose">'+textBlock(p.summary)+'</p>'+link+'</section>'+
 '<section id="works" class="section"><span class="kicker">ARTWORK GALLERY</span><h2>작품과 음악 감상</h2><p class="helper">작품 이미지를 클릭하면 120% 확대되고, 다시 클릭하면 원래 크기와 위치로 돌아옵니다.</p><div class="works">'+(each||'<p>작품 등록을 준비 중입니다.</p>')+'</div></section>'+fullVideoHtml+
 '<section id="review" class="section"><span class="kicker">CURATORIAL REVIEW</span><h2>미술평론</h2><p class="prose">'+textBlock(p.review)+'</p></section>'+
 '<section id="contact" class="section"><span class="kicker">INFORMATION</span><h2>전시 안내 · 문의</h2><p class="prose">'+textBlock(p.contact,"문의 안내를 준비 중입니다.")+'</p></section></main>'+
 '<footer>© 2026 MYEONGDOJAE · 명도재 이명우</footer></body></html>';
}
async function collectLocalFilms(embedded=false){
 const result={};
 let totalBytes=0;
 for(const work of draft.artworks){
  if(!work.localVideoReady)continue;
  const blob=locallyGenerated.get(work.id)?.video?.blob||await recoverFilm(work.id);
  if(!blob)continue;
  if(embedded){
   totalBytes+=blob.size;
   if(totalBytes>36*1024*1024)throw Error("전시 동영상 총용량이 36MB를 넘었습니다. 영상을 줄이거나 별도로 업로드해 URL을 입력해 주세요.");
   result[work.id]=await new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(Error("동영상 파일을 읽을 수 없습니다."));
    reader.onload=()=>resolve(String(reader.result));
    reader.readAsDataURL(blob);
   });
  }else{
   const saved=locallyGenerated.get(work.id)?.video?.url;
   if(saved)result[work.id]=saved;
   else {storeLocal(work,"video",blob,blob.type.includes("mp4")?"mp4":"webm");result[work.id]=locallyGenerated.get(work.id).video.url}
  }
 }
 return result;
}
// HTML in iframe[srcdoc] otherwise resolves #links against /admin/#....
// Attach navigation from the parent, keeping the iframe sandbox script-free.
function connectPreviewNavigation(){
 const iframe=$("site-preview");
 iframe.addEventListener("load",()=>{
  let doc;
  try{doc=iframe.contentDocument}catch{return}
  if(!doc)return;
  doc.addEventListener("click",event=>{
   const link=event.target?.closest?.('a[href^="#"]');
   if(!link)return;
   const hash=link.getAttribute("href");
   if(!/^#[a-zA-Z][a-zA-Z0-9_-]*$/.test(hash))return;
   const target=doc.getElementById(hash.slice(1));
   if(!target)return;
   event.preventDefault();
   target.scrollIntoView({behavior:"smooth",block:"start"});
  });
 });
}
async function preview(){
 const p=capture();if(!validProject(p)){notify("전시 제목과 작가 이름을 입력한 뒤 미리보기 하세요.",true);return}
 try{
  const videos=await collectLocalFilms();
  const frame=$("site-preview");frame.srcdoc=site(p,videos);$("preview-panel").hidden=false;$("preview-panel").scrollIntoView({behavior:"smooth",block:"start"});
  notify("전시관 미리보기가 완성됐습니다. 작품의 재생 버튼을 누르면 음악이 포함된 영상을 감상할 수 있습니다.");
 }catch(err){notify("미리보기 오류: "+err.message,true)}
}
async function downloadHtml(){
 const p=capture();if(!validProject(p)){notify("전시 제목과 작가 이름을 입력해 주세요.",true);return}
 if(!p.rightsConfirmed){notify("작품 및 미디어 공개 사용 권한을 확인한 뒤 HTML을 내려받아 주세요.",true);return}
 try{
  const films=await collectLocalFilms(true);
  const missing=draft.artworks.filter(w=>w.localVideoReady&&!films[w.id]);
  if(missing.length)throw Error("등록된 영상 "+missing.length+"개의 원본을 찾지 못했습니다. 영상 재생 상태를 확인해 주세요.");
  download("myeongdo-"+slug(p.artist)+"-"+slug(p.title)+".html",site(p,films),"text/html;charset=utf-8");
  notify("완성된 작품 영상이 포함된 전시 홈페이지를 내려받았습니다. 온라인 공개는 HTML 파일의 별도 업로드가 필요합니다.");
 }catch(err){notify("홈페이지 완성 오류: "+err.message,true)}
}

const PUBLIC_GH_REPO="mmwwoo-lab/myeongdo-8014";
const PUBLIC_BASE="https://mmwwoo-lab.github.io/myeongdo-8014/";
const GH_API="https://api.github.com/repos/"+PUBLIC_GH_REPO+"/contents/";
function publishSlug(value){
 return String(value||"").trim().replace(/[^a-zA-Z0-9가-힣_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,35)||"artist";
}
function publishPathFor(project){
 if(project.publicPath&&/^exhibitions\/online\/[a-zA-Z0-9가-힣_/-]+\/index\.html$/.test(project.publicPath))return project.publicPath;
 const id=String(project.id||"").replace(/[^a-zA-Z0-9]/g,"").slice(-9)||Date.now().toString(36);
 return "exhibitions/online/"+publishSlug(project.artist)+"-"+publishSlug(project.title)+"-"+id+"/index.html";
}
function pathURL(path){
 return path.split("/").map(encodeURIComponent).join("/");
}
function publicAddress(path){
 return PUBLIC_BASE+pathURL(path.replace(/index\.html$/,""));
}
function syncPublicAddress(){
 const url=safeLink(draft.publicUrl||"");
 const allowed=url.startsWith(PUBLIC_BASE+"exhibitions/online/");
 $("copy-public-url").disabled=!allowed;
 const link=$("open-public-url");
 link.hidden=!allowed;
 if(allowed){link.href=url;$("publish-status").textContent="등록된 공개 주소: "+url+" · 최신 수정본이 게시됐는지 실제 페이지를 확인해 주세요."}
 else{link.removeAttribute("href");$("publish-status").textContent="공개 등록 전입니다. 완성 후 GitHub에 업로드하면 주소를 복사할 수 있습니다."}
}
function base64Utf8(html){
 const bytes=new TextEncoder().encode(html);
 const segments=[];
 for(let i=0;i<bytes.length;i+=32768){
   segments.push(String.fromCharCode(...bytes.subarray(i,i+32768)));
 }
 return btoa(segments.join(""));
}
async function publishToGithub(){
 const button=$("publish-project");
 const tokenInput=$("publish-token");
 const token=tokenInput.value.trim();
 const p=capture();
 if(!validProject(p)){notify("전시 제목과 작가 이름을 입력해 주세요.",true);return}
 if(!p.artworks.some(w=>w.dataUrl)){notify("공개할 작품 이미지를 한 점 이상 등록해 주세요.",true);return}
 if(!p.rightsConfirmed){notify("공개 전에 작품 이미지·음악·영상의 이용 권한을 확인해 주세요.",true);return}
 if(!token){$("publish-status").textContent="GitHub 토큰을 입력해야 온라인에 업로드할 수 있습니다.";return}
 if(!/^github_pat_|^ghp_/.test(token)){$("publish-status").textContent="GitHub의 유효한 Personal Access Token 형식을 확인해 주세요.";return}
 button.disabled=true;
 button.textContent="GitHub에 전시 등록 중…";
 try{
   if(!save())throw Error("전시 프로젝트의 브라우저 저장에 실패했습니다.");
   const videos=await collectLocalFilms(true);
   const lost=draft.artworks.filter(w=>w.localVideoReady&&!videos[w.id]);
   if(lost.length)throw Error("등록된 영상 "+lost.length+"개의 원본을 찾을 수 없습니다.");
   const documentHTML=site(draft,videos);
   const bytes=new TextEncoder().encode(documentHTML).length;
   if(bytes>45*1024*1024)throw Error("동영상 포함 HTML 용량이 45MB를 넘었습니다. 영상을 압축하거나 외부 영상 URL로 연결해 주세요.");
   const path=publishPathFor(draft);
   const target=GH_API+pathURL(path);
   const headers={"Accept":"application/vnd.github+json","Authorization":"Bearer "+token,"X-GitHub-Api-Version":"2022-11-28"};
   $("publish-status").textContent="완성된 전시 파일을 GitHub로 전송합니다. 이 창을 닫지 마세요.";
   const existing=await fetch(target+"?ref=main",{method:"GET",headers,cache:"no-store"});
   let sha;
   if(existing.ok){
     const previous=await existing.json();
     sha=previous.sha;
   }else if(existing.status!==404){
     throw Error("기존 전시 조회 실패 (GitHub HTTP "+existing.status+"). 토큰의 저장소 Contents 권한을 확인해 주세요.");
   }
   const payload={
     message:"Publish MYEONGDOJAE artist exhibition: "+String(draft.title).slice(0,65),
     branch:"main",
     content:base64Utf8(documentHTML)
   };
   if(sha)payload.sha=sha;
   const response=await fetch(target,{
     method:"PUT",
     headers:{...headers,"Content-Type":"application/json"},
     body:JSON.stringify(payload)
   });
   if(!response.ok)throw Error("GitHub 전시 등록 실패 (HTTP "+response.status+"). Contents: Read and write 권한과 저장소 접근권을 확인해 주세요.");
   draft.publicPath=path;
   draft.publicUrl=publicAddress(path);
   if(!save())throw Error("GitHub 파일 업로드는 성공했지만 공개 URL의 브라우저 저장에 실패했습니다. 업로드된 경로는 "+draft.publicUrl);
   syncPublicAddress();
   $("publish-status").textContent="GitHub 파일 업로드 완료. 공개 주소: "+draft.publicUrl+" · GitHub Pages 배포 후 실제 페이지를 열어 확인해 주세요.";
   notify("전시 홈페이지 업로드 완료! 「공개 주소 복사」로 주소를 공유할 수 있습니다. 실제 게시 여부를 확인해 주세요.");
 }catch(err){
   $("publish-status").textContent="등록하지 못했습니다: "+err.message+" 내려받기 기능은 계속 사용할 수 있습니다.";
   notify("공개 등록 오류: "+err.message,true);
 }finally{
   // Credentials are not saved to localStorage, IndexedDB or JSON backups.
   tokenInput.value="";
   button.disabled=false;button.textContent="🌐 전시 홈페이지 공개 등록";
 }
}
async function copyPublicAddress(){
 const value=draft.publicUrl;
 if(!value||!value.startsWith(PUBLIC_BASE+"exhibitions/online/"))return;
 try{
   await navigator.clipboard.writeText(value);
   $("publish-status").textContent="주소 복사 완료: "+value+" · 실제 공개 페이지가 열리는지 확인해 주세요.";
 }catch{
   const input=document.createElement("input");
   input.value=value;document.body.append(input);input.select();
   const result=document.execCommand("copy");
   input.remove();
   $("publish-status").textContent=result?"주소 복사 완료: "+value:"복사가 제한됩니다. 주소를 직접 선택해 복사해 주세요: "+value;
 }
}
function exportProject(){
 const p=capture();download("myeongdo-exhibition-"+slug(p.title)+".json",JSON.stringify({format:"MYEONGDOJAE-EXHIBITION",version:1,projects:[p]},null,2),"application/json;charset=utf-8");notify("전시 프로젝트 백업 파일을 내려받았습니다.")
}
async function importVideoManifest(e){
 const file=e.target.files?.[0];
 if(!file)return;
 try{
   if(file.size>3*1024*1024)throw Error("영상 결과 JSON은 3MB 이하이어야 합니다.");
   capture();
   const manifest=JSON.parse(await file.text());
   if(manifest.format!=="MYEONGDOJAE-VIDEO-MANIFEST"||!Array.isArray(manifest.videos))throw Error("전용 Python 프로그램이 만든 video-manifest.json만 등록할 수 있습니다.");
   if(manifest.projectId&&draft.id&&manifest.projectId!==draft.id)throw Error("현재 전시와 프로젝트 ID가 다릅니다. 맞는 전시를 열어 주세요.");
   if(String(manifest.exhibition||"")!==draft.title||String(manifest.artist||"")!==draft.artist)throw Error("전시 제목·작가가 다릅니다. 올바른 프로젝트 결과만 등록하세요.");
   let updated=0;
   for(const item of manifest.videos){
     if(!item||typeof item!=="object")continue;
     let work=draft.artworks.find(w=>item.artworkId&&w.id===item.artworkId);
     if(!work){
       const matches=draft.artworks.filter(w=>w.title&&w.title===item.artworkTitle);
       if(matches.length===1)work=matches[0];
     }
     if(!work||!work.dataUrl)continue;
     work.videoFile=String(item.videoFile||"");
     work.videoStatus=String(item.status||"영상 제작 완료");
     const url=safeLink(item.videoUrl);
     if(url)work.videoUrl=url;
     updated++;
   }
   const fullUrl=safeLink(manifest.exhibitionVideoUrl);
   if(fullUrl){draft.exhibitionVideoUrl=fullUrl;$("exhibition-video-url").value=fullUrl}
   renderWorks();setDirty();
   const message=updated+"개 작품의 Python 영상 제작 기록을 가져왔습니다. 영상 MP4를 웹에 업로드한 후 URL을 확인하고 전시 프로젝트를 저장하세요.";
   $("video-import-result").textContent=message;notify(message);
 }catch(err){notify("영상 결과 등록 실패: "+err.message,true);$("video-import-result").textContent=err.message}
 finally{e.target.value=""}
}
function syncDashboardChecklist(){
 const p=projects[0],works=Array.isArray(p?.artworks)?p.artworks:[];
 const ready={
  basic:!!(p?.title&&p?.artist),
  art:works.some(w=>safeImage(w.dataUrl)),
  music:works.some(w=>Boolean(safeLink(w.musicUrl)||w.localVideoReady)),
  video:works.some(w=>Boolean(w.localVideoReady||w.videoFile||safeLink(w.videoUrl))),
  published:!!safeLink(p?.publicUrl)
 };
 for(const el of document.querySelectorAll(".sonu-check-row[data-stage]")){
  const done=Boolean(ready[el.dataset.stage]);el.classList.toggle("done",done);
  const mark=el.querySelector(".sonu-mark");if(mark)mark.textContent=done?"✓":"○";
  el.setAttribute("aria-label",(done?"완료: ":"대기: ")+el.textContent.trim().replace(/^[✓○]\s*/,""));
 }
}
function renderProjects(){
 const list=$("project-list"),recent=$("recent-projects");list.replaceChildren();recent.replaceChildren();
 text($("stat-all"),projects.length);
 text($("stat-works"),projects.reduce((sum,p)=>sum+p.artworks.filter(w=>w.dataUrl).length,0));
 text($("stat-approved"),projects.filter(p=>p.status==="검수 완료").length);
 const filter=$("status-filter").value;
 for(const p of projects.filter(p=>filter==="전체"||p.status===filter)){
  const el=document.createElement("article");el.className="project-row";
  const summary=document.createElement("div");summary.className="project-info";
  const h=document.createElement("h3");h.textContent=p.title||"제목 없음";
  const info=document.createElement("p");info.textContent=(p.artist||"작가 미등록")+" · "+p.genre+" · 작품 "+p.artworks.filter(w=>w.dataUrl).length+"점 · 영상 기록 "+p.artworks.filter(w=>Boolean(w.localVideoReady||w.videoFile||safeLink(w.videoUrl))).length+"점 · "+p.status;
  summary.append(h,info);
  const controls=document.createElement("div");controls.className="project-actions";
  const edit=document.createElement("button");edit.type="button";edit.className="subtle";edit.textContent="편집";edit.addEventListener("click",()=>{applyForm(p);show("create")});
  const exportBtn=document.createElement("button");exportBtn.type="button";exportBtn.className="subtle";exportBtn.textContent="HTML";exportBtn.addEventListener("click",()=>{
   if(!p.rightsConfirmed){alert("해당 전시는 작품 사용 권한 확인이 필요합니다. 편집 화면에서 확인 표시 후 내보내기 해주세요.");return}
   download("myeongdo-"+slug(p.title)+".html",site(p),"text/html;charset=utf-8")
  });
  const del=document.createElement("button");del.type="button";del.className="danger";del.textContent="삭제";del.addEventListener("click",()=>{
   if(!confirm("저장된 전시 '"+p.title+"'를 삭제할까요?"))return;
   const old=projects.slice();projects=projects.filter(x=>x.id!==p.id);
   if(!store()){projects=old;alert("삭제 정보를 저장할 수 없습니다.");return}
   renderProjects();
  });
  controls.append(edit,exportBtn,del);el.append(summary,controls);list.append(el);
 }
 const recentItems=projects.slice(0,3);
 if(!recentItems.length){const d=document.createElement("p");d.className="empty";d.textContent="아직 저장된 미술 전시가 없습니다. 새 전시를 시작하세요.";recent.append(d)}
 for(const p of recentItems){
  const b=document.createElement("button");b.type="button";b.className="recent-item studio-project-card";
  const artwork=p.artworks?.find(w=>safeImage(w.dataUrl));
  const thumb=safeImage(p.cover)||safeImage(artwork?.dataUrl);
  if(thumb){const img=document.createElement("img");img.className="studio-project-thumb";img.src=thumb;img.alt=(p.title||"전시")+" 대표 작품";img.loading="lazy";b.append(img)}
  else{const icon=document.createElement("div");icon.className="studio-project-empty";icon.textContent="MYEONGDOJAE · ART";b.append(icon)}
  const details=document.createElement("span");details.className="studio-project-details";
  const name=document.createElement("strong");name.textContent=p.title||"제목 없음";
  const meta=document.createElement("small");meta.textContent=(p.artist||"작가 미등록")+" · "+(p.artworks||[]).filter(w=>w.dataUrl).length+"점 · "+p.status;
  details.append(name,meta);b.append(details);
  b.addEventListener("click",()=>{applyForm(p);show("create")});recent.append(b)
 }
 if(!list.children.length){const d=document.createElement("p");d.className="empty";d.textContent="표시할 미술 전시가 없습니다.";list.append(d)}
 syncDashboardChecklist();
}
async function importProject(e){
 const file=e.target.files?.[0];if(!file)return;
 try{
 if(file.size>28*1024*1024)throw Error("JSON 백업 파일은 28MB 이하여야 합니다.");
 const doc=JSON.parse(await file.text());
 const data=Array.isArray(doc)?doc:Array.isArray(doc?.projects)?doc.projects:[doc];
 const items=data.filter(p=>p&&(p.template===undefined||p.template==="exhibition")).map(normalize).filter(p=>p&&p.title&&p.artist);
 if(!items.length)throw Error("가져올 미술 전시 데이터가 없습니다.");
 const previous=projects.slice();
 for(const item of items){item.id="import-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);projects.unshift(item)}
 if(!store()){projects=previous;throw Error("브라우저 저장 용량을 초과했습니다. 이미지 수를 줄여주세요.")}
 renderProjects();alert(items.length+"개의 미술 전시 프로젝트를 가져왔습니다.")
 }catch(err){alert("가져오기 실패: "+err.message)}
 finally{e.target.value=""}
}
for(const b of document.querySelectorAll("[data-view]"))b.addEventListener("click",()=>{
 show(b.dataset.view);
 if(b.dataset.jump){
  const jump=b.dataset.jump;
  const target=jump==="music-controls"||jump==="video-controls"
   ?document.querySelector('#artwork-list [data-act="'+(jump==="music-controls"?"make-music":"make-video")+'"]')?.closest(".work-create-media")
   :$(jump);
  if(target){
   if(target.tagName==="DETAILS")target.open=true;
   requestAnimationFrame(()=>target.scrollIntoView({behavior:"smooth",block:"center"}));
  }
 }
});
for(const b of document.querySelectorAll("[data-open-projects]"))b.addEventListener("click",()=>show("projects"));
$("start-create").addEventListener("click",()=>{applyForm(freshProject());show("create")});
$("projects-new").addEventListener("click",()=>{applyForm(freshProject());show("create")});
$("new-project").addEventListener("click",()=>{if(dirty&&!confirm("저장하지 않은 변경을 버리고 새 전시를 시작할까요?"))return;applyForm(freshProject());show("create")});
$("add-artwork").addEventListener("click",()=>{if(draft.artworks.length>=MAX)return;draft.artworks.push(freshWork());renderWorks();setDirty()});
$("batch-artwork-upload").addEventListener("change",async e=>{
 const items=[...(e.target.files||[])];if(!items.length)return;
 const empty=draft.artworks.filter(w=>!w.dataUrl&&!w.title&&!w.caption&&!w.musicUrl&&!w.videoUrl);
 const available=MAX-(draft.artworks.length-empty.length);
 const take=items.slice(0,available);
 let added=0,failed=0;
 for(const file of take){
  try{
   const dataUrl=await fileAsImage(file);
   const work=empty.shift()||freshWork();
   if(!draft.artworks.includes(work))draft.artworks.push(work);
   work.title=file.name.replace(/\.[^.]+$/,"").replace(/[_-]+/g," ").trim()||"무제";
   work.dataUrl=dataUrl;work.filename=file.name;added++;
  }catch{failed++}
 }
 renderWorks();setDirty();e.target.value="";
 notify("사진 "+added+"점 등록 완료"+(failed?" · 처리하지 못한 파일 "+failed+"개":"")+". 작품 실행 버튼을 누르면 음악 영상이 만들어집니다.",failed>0);
});
$("quick-preview").addEventListener("click",()=>preview());
$("publish-project").addEventListener("click",publishToGithub);
$("copy-public-url").addEventListener("click",copyPublicAddress);
$("quick-finish").addEventListener("click",async()=>{
 const btn=$("quick-finish");btn.disabled=true;
 try{await downloadHtml()}finally{btn.disabled=false}
});
$("exhibition-form").addEventListener("submit",e=>{e.preventDefault();save()});
$("preview-project").addEventListener("click",preview);
$("download-html").addEventListener("click",downloadHtml);
$("export-project").addEventListener("click",exportProject);
connectPreviewNavigation();
$("hide-preview").addEventListener("click",()=>{$("preview-panel").hidden=true});
$("import-json").addEventListener("change",importProject);
$("video-manifest-import").addEventListener("change",importVideoManifest);
$("video-project-export").addEventListener("click",exportProject);
$("status-filter").addEventListener("change",renderProjects);
for(const id of Object.keys(fields))$(id).addEventListener("input",setDirty);
$("rights-confirm").addEventListener("change",setDirty);
registerImage("cover");registerImage("portrait");
document.addEventListener("myeongdo:workflow-change",setDirty);
document.addEventListener("myeongdo:load-starter",event=>{if(!event.detail)return;applyForm(event.detail);show("create")});
applyForm(freshProject());
renderProjects();
const start=location.hash.slice(1);
show(["create","projects","guide"].includes(start)?start:"dashboard");
window.addEventListener("hashchange",()=>{const v=location.hash.slice(1);if(v!==currentView)show(v)});
})();

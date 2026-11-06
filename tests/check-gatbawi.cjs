// 명도재 디지털 법당: 외부 패키지 없이 동작하는 정적 점검
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=path.resolve(__dirname,'../Gatbawi');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
function assert(v,m){if(!v)throw new Error(m)}
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
assert(scripts.length>0,'법당 동작 스크립트가 없습니다');
scripts.forEach((script,i)=>new vm.Script(script,{filename:'Gatbawi-script-'+(i+1)+'.js'}));
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
const refs=[...html.matchAll(/\$\('([A-Za-z][\w-]*)'\)/g)].map(m=>m[1]);
for(const id of refs)assert(ids.has(id),'누락된 화면 요소: '+id);
for(const id of ['summitPrayer','wish','wishBtn','admissionName','admissionSchool','admissionWish','admissionBtn','prayerCard','prayerHeading','prayerText','readPrayer','stopPrayer','hidePrayer','bgStart','bgStatus','heartStart','heartKoreanStart'])assert(ids.has(id),'필수 화면 요소 누락: '+id);
for(const id of ['startBtn','pauseBtn','resetBtn','summitBtn','musicBtn','climbControls','climbPanel','stairsPath'])assert(!ids.has(id),'삭제된 산행 메뉴가 다시 나타났습니다: '+id);
assert(html.includes('createWishMessage'),'일반 소원 기도문 생성 기능이 없습니다');
assert(html.includes('createAdmissionPrayer'),'대학진학 기도문 생성 기능이 없습니다');
assert(html.includes('speechSynthesis'),'기도문 음성 낭독 기능이 없습니다');
assert(html.includes('startChant'),'나무아미타불 염불 기능이 없습니다');
assert(html.includes('showChantCard')&&html.includes('chant-mode')&&html.includes('아미타부처님께 귀의합니다.'),'나무아미타불 메시지창 뜻풀이 기능이 없습니다');
assert(html.includes("if($('prayerCard').classList.contains('chant-mode'))"),'염불 끄기 시 메시지창 숨기기 기능이 없습니다');
assert(html.includes('startHeartSutra')&&html.includes('stopHeartSutra')&&html.includes('마하반야바라밀다심경'),'반야심경 낭독 기능이 없습니다');
assert(html.includes('showHeartSutra')&&html.includes('sutra-mode')&&html.includes('markHeartLine'),'반야심경 본문·스크롤 표시 기능이 없습니다');
assert(html.includes('heartKoreanLines')&&html.includes("startHeartSutra('korean')")&&html.includes('반야심경 한글 끄기'),'우리말 반야심경 표시·낭독·끄기 기능이 없습니다');
assert(html.includes('card.scrollTo({top:target')&&!html.includes('lines[index].scrollIntoView'),'반야심경 내부 스크롤 방식이 올바르지 않습니다');
assert(html.includes('heart.utterance=null')&&html.includes("heart.mode==='original')stopHeartSutra()")&&html.includes("heart.mode==='korean')stopHeartSutra()"),'반야심경 두 읽기 버튼의 전환·정지 기능이 없습니다');
assert((html.match(/u\.rate=(?:0\.)?6/g)||[]).length>=2&&html.includes('audio.playbackRate=0.6'),'독경 음성과 MP3 모두 0.6배 속도로 설정되지 않았습니다');
assert(!/id="(?:bgStop|heartStop)"/.test(html),'별도의 끄기 버튼이 남아 있습니다');
assert(html.includes("if(heart.active&&heart.mode==='original')stopHeartSutra()")&&html.includes("if(heart.active&&heart.mode==='korean')stopHeartSutra()")&&html.includes("if(bg.active)stopBackground()"),'하나의 버튼에서 각 낭독의 켜기·끄기가 동작하지 않습니다');
assert(!html.includes('startInstrumental')&&!html.includes('AudioContext'),'삭제된 경음악 기능이 남아 있습니다');
for(const name of ['퀼트 산사에서 맞이한 평온한 아침.png'])assert(fs.existsSync(path.join(base,name)),'이미지 파일 누락: '+name);

// 실제 버튼 클릭 흐름을 가상 DOM으로 확인합니다.
class FakeElement{
  constructor(id=''){
    this.id=id;this.children=[];this.dataset={};this.hidden=id==='prayerCard';
    this.value='';this.attributes={};this._text='';
    const classes=new Set();
    this.classList={add:(...names)=>names.forEach(x=>classes.add(x)),
      remove:(...names)=>names.forEach(x=>classes.delete(x)),
      contains:name=>classes.has(name),
      toggle:(name,on)=>{if(on===undefined? !classes.has(name):on)classes.add(name);else classes.delete(name)}};
  }
  set textContent(value){this._text=String(value);this.children=[]}
  get textContent(){return this._text+this.children.map(x=>x.textContent).join('')}
  setAttribute(name,value){this.attributes[name]=String(value)}
  appendChild(child){this.children.push(child)}
  replaceChildren(...children){this.children=[...children];this._text=''}
  querySelectorAll(selector){return selector==='.sutra-line'?this.children.filter(x=>x.classList.contains('sutra-line')):[]}
  scrollIntoView(){} scrollTo(){} focus(){} addEventListener(){}
}
const elements=new Map([...ids].map(id=>[id,new FakeElement(id)]));
const doc={
  getElementById:id=>elements.get(id)||null,
  createElement:tag=>new FakeElement(tag),
  querySelector:()=>null,
  body:{appendChild(){},append(){}}
};
let lastSpoken=null;
const synth={
  getVoices:()=>[{lang:'ko-KR',name:'Korean'}],
  speak:u=>{lastSpoken=u;synth.speaking=true},
  cancel:()=>{synth.speaking=false;synth.paused=false},
  pause:()=>{synth.paused=true},
  resume:()=>{synth.paused=false},
  speaking:false,paused:false
};
class MockUtterance{constructor(value){this.text=value}}
const sandbox={document:doc,navigator:{userAgent:'Mozilla/5.0 Chrome desktop'},window:{speechSynthesis:synth,addEventListener(){},open(){},location:{href:''}},
  SpeechSynthesisUtterance:MockUtterance,
  setTimeout:()=>1,clearTimeout:()=>{},console};
scripts.forEach(script=>vm.runInNewContext(script,sandbox));
const get=id=>elements.get(id);
get('bgStart').onclick();
assert(!get('prayerCard').hidden&&get('prayerCard').classList.contains('chant-mode'),'염불 시작 시 메시지창이 열리지 않습니다');
assert(get('prayerText').textContent.includes('아미타부처님께 귀의합니다'),'염불 뜻풀이가 보이지 않습니다');
assert(lastSpoken?.rate===0.6,'염불 읽기 속도가 0.6이 아닙니다');
get('bgStart').onclick();
assert(get('prayerCard').hidden&&!get('bgStart').attributes['aria-pressed'].includes('true'),'염불 끄기 시 메시지창이 닫히지 않습니다');
get('heartStart').onclick();
assert(!get('prayerCard').hidden&&get('prayerHeading').textContent.includes('반야심경'),'반야심경 본문을 표시할 수 없습니다');
assert(lastSpoken?.rate===0.6,'반야심경 읽기 속도가 0.6이 아닙니다');
get('heartKoreanStart').onclick();
assert(get('prayerHeading').textContent.includes('한글 풀이')&&get('prayerText').children.length>10,'한글 반야심경으로 전환할 수 없습니다');
get('heartKoreanStart').onclick();
assert(get('prayerCard').hidden,'한글 반야심경 끄기 시 메시지창이 사라지지 않습니다');
get('wish').value='가족 건강';
get('wishBtn').onclick();
assert(!get('prayerCard').hidden&&get('prayerHeading').textContent.includes('소원 기도문'),'소원 기도문이 표시되지 않습니다');
get('bgStart').onclick();
get('admissionName').value='수험생';
get('admissionSchool').value='희망 대학';
get('admissionBtn').onclick();
assert(!get('prayerCard').classList.contains('chant-mode')&&get('prayerText').textContent.includes('취업'),'대학진학 소원으로 전환되지 않습니다');
assert(!get('admissionStats').hidden,'대학 진학 기도문 아래 입시 안내가 표시되지 않습니다');
assert(get('admissionStats').textContent.includes('2025학년도')&&get('admissionStats').textContent.includes('수시')&&get('admissionStats').textContent.includes('정시'),'수시·정시 입시 결과 참고 안내 누락');
assert(get('admissionStats').textContent.includes('공식 결과 확인 필요'),'검증되지 않은 입결을 임의로 표시하면 안 됩니다');
get('wish').value='가족의 평안';get('wishBtn').onclick();
assert(get('admissionStats').hidden,'일반 소원 기도문에는 입시 안내가 숨겨져야 합니다');
console.log('PASS: 염불·반야심경·한글 반야심경·소원 버튼 클릭 흐름');

console.log('PASS: 명도재 디지털 법당 HTML / JavaScript / 화면 요소 / 이미지 확인');

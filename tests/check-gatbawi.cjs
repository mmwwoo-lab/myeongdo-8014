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
for(const id of ['summitPrayer','wish','wishBtn','admissionName','admissionSchool','admissionWish','admissionBtn','prayerCard','prayerHeading','prayerText','readPrayer','stopPrayer','hidePrayer'])assert(ids.has(id),'필수 화면 요소 누락: '+id);
for(const id of ['startBtn','pauseBtn','resetBtn','summitBtn','musicBtn','climbControls','climbPanel','stairsPath'])assert(!ids.has(id),'삭제된 산행 메뉴가 다시 나타났습니다: '+id);
assert(html.includes('createWishMessage'),'일반 소원 기도문 생성 기능이 없습니다');
assert(html.includes('createAdmissionPrayer'),'대학진학 기도문 생성 기능이 없습니다');
assert(html.includes('speechSynthesis'),'기도문 음성 낭독 기능이 없습니다');
for(const name of ['퀼트 산사에서 맞이한 평온한 아침.png'])assert(fs.existsSync(path.join(base,name)),'이미지 파일 누락: '+name);
console.log('PASS: 명도재 디지털 법당 HTML / JavaScript / 화면 요소 / 이미지 확인');

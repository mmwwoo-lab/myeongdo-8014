const poets={
'김소월':'민요적 운율, 반복, 이별과 그리움',
'윤동주':'성찰과 양심, 별·하늘 이미지, 투명한 어조',
'정지용':'감각적 이미지, 정교한 사물 묘사, 절제',
'서정주':'생명력과 신화적 상상, 시간의 순환',
'백석':'향토적 생활 풍경, 따뜻한 사물의 이름',
'한용운':'역설과 기다림, 내면의 신념',
'이상':'낯선 이미지, 실험적 시선, 도시적 불안',
'박목월':'자연 서정, 간결한 음악성',
'신동엽':'공동체적 시선, 역사와 삶, 담백한 언어',
'김수영':'자유에 대한 성찰, 일상과 사회의 긴장, 직설성'};
export default async function handler(req,res){
if(req.method!=='POST')return res.status(405).json({error:'POST 요청만 지원합니다.'});
if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'서버에 OPENAI_API_KEY 환경변수가 없습니다. Vercel Production에 등록하고 재배포하세요.'});
const {seed='',image='',poets:chosen=[]}=req.body||{};
if(typeof seed!=='string'||[...seed].length>300||typeof image!=='string'||image.length>5e6||!Array.isArray(chosen)||chosen.length>3||chosen.some(p=>!Object.hasOwn(poets,p)))return res.status(400).json({error:'입력값을 확인하세요. 글 300자, 시인 3명, 이미지 5MB 이내입니다.'});
if(!seed.trim()&&!image)return res.status(400).json({error:'글이나 사진 중 하나를 입력하세요.'});
if(image&&!/^data:image\/jpeg;base64,/.test(image))return res.status(400).json({error:'지원하지 않는 이미지 형식입니다.'});
const style=chosen.length?chosen.map(p=>p+': '+poets[p]).join('; '):'독창적인 현대 한국 자유시';
const instructions='당신은 한국어 현대 자유시 창작을 돕는 문학 편집자다. 입력 문장과 이미지가 있다면 실제 이미지에 보이는 장면을 읽고, 구체적인 사물과 감각을 바탕으로 독창적인 자유시를 지어라. 선택한 시인들의 일반적 문학 특징을 추상적으로 조합하되 특정 시인의 문체를 그대로 재현하거나 유명한 시구를 인용하지 마라. 상투적인 비유와 불필요한 감탄을 피하고 독창적인 언어, 선명한 이미지, 시적 긴장과 여운을 살려라. 시의 본문은 줄바꿈을 포함해 반드시 300자 이내. 제목은 본문과 별도로 30자 이내. 오직 JSON 객체 {"title":"...","poem":"..."}만 출력.';
const content=[{type:'input_text',text:'창작 소재: '+(seed.trim()||'(사진만 제공됨)')+'\n참고할 시적 특징: '+style+'\n한국어 자유시를 창작해 주세요.'}];if(image)content.push({type:'input_image',image_url:image});
try{
const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',instructions,input:[{role:'user',content}],max_output_tokens:700,text:{format:{type:'json_object'}}}),signal:AbortSignal.timeout(55000)});
const d=await r.json();if(!r.ok)return res.status(r.status).json({error:d.error?.message||'OpenAI API 요청 실패'});
const raw=(d.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');let parsed;try{parsed=JSON.parse(raw)}catch{return res.status(502).json({error:'AI 응답 형식을 해석하지 못했습니다.'})}
let title=String(parsed.title||'무제').trim().slice(0,30),poem=String(parsed.poem||'').trim();if(!poem)return res.status(502).json({error:'AI가 시를 반환하지 않았습니다.'});poem=[...poem].slice(0,300).join('');return res.status(200).json({title,poem});
}catch(e){return res.status(500).json({error:e?.message||'시 창작 중 서버 오류'})}
}
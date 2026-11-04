export default async function handler(req,res){
if(req.method!=='POST')return res.status(405).json({error:'POST 요청만 허용됩니다.'});
if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'OPENAI_API_KEY 미설정: Vercel 환경변수에 API 키를 등록한 후 재배포하세요.'});
try{
const {image,style='figure'}=req.body||{};
if(typeof image!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(image)||image.length>10_000_000)return res.status(400).json({error:'7MB 이하 PNG/JPG/WebP 사진을 선택하세요.'});
const styles={
figure:'a premium hand-sculpted 3D collectible resin doll, beautiful dimensional sculpted facial features, detailed miniature clothing, soft studio highlights',
quilt:'a charming handcrafted three-dimensional quilted fabric doll, visible patchwork fabric panels, fine embroidery, padded seams, soft textile stitching, realistic cotton fiber',
ceramic:'a premium hand-sculpted glazed ceramic porcelain doll, elegant glossy porcelain glaze, finely modeled face, subtle cobalt blue ceramic details, authentic fired clay sculpture'
};
const prompt='Using the uploaded image as a visual reference, reinterpret ONLY the main subject as '+(styles[style]||styles.figure)+'. Preserve the recognizable face, clothing, colors and identity cues where applicable. Full figure, head to feet, three-dimensional freestanding doll with genuine sculpted volume, seated or standing naturally on a simple seamless light neutral studio FLOOR, subtle soft contact shadow. NO pedestal, NO plinth, NO base, NO platform, NO nameplate, NO writing. Remove all original photo scenery and unrelated objects. Clean minimal studio composition, centered square product photography, sophisticated realistic material details.';
const buf=Buffer.from(image.slice(image.indexOf(',')+1),'base64'),mime=image.slice(5,image.indexOf(';'));
const form=new FormData();form.append('model','gpt-image-1.5');form.append('prompt',prompt);form.append('size','1024x1024');form.append('quality','high');form.append('image',new Blob([buf],{type:mime}),'reference.png');
const response=await fetch('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY},body:form,signal:AbortSignal.timeout(240000)});
const result=await response.json();if(!response.ok)return res.status(response.status).json({error:result.error?.message||'OpenAI 생성 요청 실패'});
if(!result.data?.[0]?.b64_json)return res.status(502).json({error:'이미지 데이터가 반환되지 않았습니다.'});
res.status(200).json({image:'data:image/png;base64,'+result.data[0].b64_json});
}catch(e){res.status(500).json({error:e?.message||'서버 오류'})}
}
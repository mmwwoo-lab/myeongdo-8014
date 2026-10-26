#!/usr/bin/env python3
"""명도재 Python 프로그램 지원부: 이미지 최적화, 시화 합성, 오디오 기술 점검.
AI 이미지/음악 생성 모델이 아닌 파일 편집 유틸리티입니다.
Requirements: pip install pillow
Usage: python asset_pipeline.py optimize input.jpg output.webp --width 1400
       python asset_pipeline.py sihwa photo.jpg output.png --title "가을의 시" --author "시인"
       python asset_pipeline.py inspect-audio sample.wav
"""
import argparse, json, wave
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont

def font_path():
    paths=["/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
           "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
           "C:/Windows/Fonts/malgun.ttf"]
    return next((p for p in paths if Path(p).exists()),None)

def optimize(src,dst,width):
    im=ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    if im.width>width: im.thumbnail((width,20000),Image.Resampling.LANCZOS)
    Path(dst).parent.mkdir(parents=True,exist_ok=True)
    im.save(dst,quality=82,optimize=True)
    return {"file":dst,"size":im.size,"bytes":Path(dst).stat().st_size}

def sihwa(src,dst,title,author):
    image=ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    canvas=ImageOps.fit(image,(1080,1920),Image.Resampling.LANCZOS)
    overlay=Image.new("RGBA",canvas.size,(0,0,0,0))
    drawer=ImageDraw.Draw(overlay)
    drawer.rounded_rectangle((55,75,1025,460),radius=18,fill=(251,247,236,218))
    path=font_path()
    f1=ImageFont.truetype(path,62) if path else ImageFont.load_default()
    f2=ImageFont.truetype(path,32) if path else ImageFont.load_default()
    drawer.text((95,145),title,font=f1,fill=(32,39,34,255))
    drawer.text((98,305),author,font=f2,fill=(82,74,63,255))
    out=Image.alpha_composite(canvas.convert("RGBA"),overlay)
    Path(dst).parent.mkdir(parents=True,exist_ok=True)
    out.save(dst)
    return {"file":dst,"size":out.size,"bytes":Path(dst).stat().st_size}

def inspect_audio(src):
    with wave.open(src,"rb") as f:
        return {"path":src,"channels":f.getnchannels(),"sample_rate":f.getframerate(),
        "duration_seconds":round(f.getnframes()/f.getframerate(),2),"sample_width":f.getsampwidth()}
def main():
    p=argparse.ArgumentParser()
    sub=p.add_subparsers(dest="cmd",required=True)
    a=sub.add_parser("optimize");a.add_argument("src");a.add_argument("dst");a.add_argument("--width",type=int,default=1400)
    a=sub.add_parser("sihwa");a.add_argument("src");a.add_argument("dst");a.add_argument("--title",required=True);a.add_argument("--author",required=True)
    a=sub.add_parser("inspect-audio");a.add_argument("src")
    args=p.parse_args()
    if args.cmd=="optimize":result=optimize(args.src,args.dst,args.width)
    elif args.cmd=="sihwa":result=sihwa(args.src,args.dst,args.title,args.author)
    else:result=inspect_audio(args.src)
    print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=="__main__":main()


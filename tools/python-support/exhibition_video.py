#!/usr/bin/env python3
"""MYEONGDOJAE offline exhibition video maker.

Reads JSON exported by /admin/#create and renders per-artwork MP4s and an
exhibition film. Runs locally, never on GitHub Pages.
Requires: Pillow and ffmpeg (H.264/libx264).
"""
from __future__ import annotations

import argparse
import base64
import html
import io
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from PIL import Image, ImageDraw, ImageFont, ImageOps

WIDTH, HEIGHT = 1280, 720
IMAGE_RE = re.compile(r"^data:image/(jpeg|png|webp);base64,(.+)$", re.I | re.S)


def font_file(requested: str = "") -> str | None:
    options = [
        requested, "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "C:/Windows/Fonts/malgun.ttf",
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    ]
    return next((str(p) for p in options if p and Path(p).is_file()), None)


def font(path: str | None, size: int):
    return ImageFont.truetype(path, size) if path else ImageFont.load_default()


def short(text: object, limit: int = 55) -> str:
    value = str(text or "").replace("\n", " ").strip()
    return value if len(value) <= limit else value[: limit - 1] + "…"


def load_image(data_url: object) -> Image.Image | None:
    if not isinstance(data_url, str):
        return None
    matched = IMAGE_RE.fullmatch(data_url)
    if not matched:
        return None
    encoded = matched.group(2)
    if len(encoded) > 28_000_000:
        raise ValueError("이미지 크기가 너무 큽니다 (base64 28 MB 제한).")
    raw = base64.b64decode(encoded, validate=True)
    with Image.open(io.BytesIO(raw)) as original:
        img = ImageOps.exif_transpose(original)
        if img.width * img.height > 36_000_000:
            raise ValueError("이미지 픽셀이 허용 범위를 초과했습니다.")
        return img.convert("RGB").copy()


def draw_card(work: dict, project: dict, font_path: str | None) -> Image.Image:
    art = load_image(work.get("dataUrl"))
    if art is None:
        raise ValueError("작품 이미지가 등록되어 있지 않습니다.")
    canvas = Image.new("RGB", (WIDTH, HEIGHT), "#17251f")
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((40, 34, 840, 682), radius=9, fill="#eae7dc")
    image_box = (57, 50, 823, 666)
    thumb = ImageOps.contain(art, (image_box[2] - image_box[0], image_box[3] - image_box[1]), Image.Resampling.LANCZOS)
    x = image_box[0] + ((image_box[2] - image_box[0]) - thumb.width) // 2
    y = image_box[1] + ((image_box[3] - image_box[1]) - thumb.height) // 2
    canvas.paste(thumb, (x, y))
    draw = ImageDraw.Draw(canvas)
    draw.text((883, 70), "MYEONGDOJAE", font=font(font_path, 27), fill="#dcc09b")
    draw.line((881, 123, 1210, 123), fill="#c5a675", width=2)
    draw.text((883, 164), short(project.get("artist"), 18), font=font(font_path, 25), fill="#d9dfd8")
    draw.text((883, 214), short(work.get("title") or "무제", 13), font=font(font_path, 34), fill="#ffffff")
    draw.text((883, 282), short(work.get("year"), 22), font=font(font_path, 22), fill="#b9bcb4")
    draw.text((883, 320), short(work.get("material"), 18), font=font(font_path, 22), fill="#b9bcb4")
    draw.text((883, 358), short(work.get("size"), 24), font=font(font_path, 22), fill="#b9bcb4")
    draw.line((881, 412, 1210, 412), fill="#667166", width=1)
    caption = str(work.get("caption") or "").replace("\n", " ")
    for i in range(3):
        draw.text((883, 440 + i * 33), short(caption[i * 18:(i + 1) * 18], 18), font=font(font_path, 18), fill="#d1d8d0")
    draw.text((883, 636), "ARTWORK EXHIBITION FILM", font=font(font_path, 14), fill="#c5a675")
    return canvas


def render_clip(image_path: Path, out: Path, seconds: int, fps: int) -> None:
    cmd = [
        "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
        "-loop", "1", "-framerate", str(fps), "-i", str(image_path),
        "-t", str(seconds), "-vf", "fade=t=in:st=0:d=0.45,fade=t=out:st="
        + str(max(0.5, seconds - 0.55)) + ":d=0.45",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "25",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out),
    ]
    subprocess.run(cmd, check=True)


def make_full_film(clips: list[Path], output: Path, audio: Path | None) -> None:
    playlist = output.parent / "_concat_list.txt"
    # concat demuxer is used with safe=0 for temporary absolute paths.
    playlist.write_text(
        "".join("file '" + str(c.resolve()).replace("'", "'\\''") + "'\n" for c in clips),
        encoding="utf-8",
    )
    cmd = ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
           "-f", "concat", "-safe", "0", "-i", str(playlist)]
    if audio:
        cmd += ["-stream_loop", "-1", "-i", str(audio)]
    cmd += ["-map", "0:v:0"]
    if audio:
        cmd += ["-map", "1:a:0", "-shortest", "-c:a", "aac", "-b:a", "160k"]
    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output)]
    try:
        subprocess.run(cmd, check=True)
    finally:
        playlist.unlink(missing_ok=True)


def get_project(path: Path, index: int) -> dict:
    doc = json.loads(path.read_text(encoding="utf-8-sig"))
    records = doc.get("projects") if isinstance(doc, dict) else doc
    if not isinstance(records, list) or index >= len(records):
        raise ValueError("전시 JSON 파일에 해당 번호의 프로젝트가 없습니다.")
    project = records[index]
    if not isinstance(project, dict) or not isinstance(project.get("artworks"), list):
        raise ValueError("작품 목록이 있는 전시 프로젝트만 처리할 수 있습니다.")
    return project


def video_url(base: str, relative: str) -> str:
    return base.rstrip("/") + "/" + quote(relative, safe="/") if base else ""


def make_index(out: Path, manifest: dict) -> None:
    cards = []
    for entry in manifest["videos"]:
        url = html.escape(entry["videoFile"], quote=True)
        cards.append("<article><h2>" + html.escape(entry["artworkTitle"]) + "</h2>"
                     + "<p>영상 제작 완료 · 등록 준비</p>"
                     + '<video controls preload="metadata" src="' + url + '"></video></article>')
    gallery = """<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MYEONGDOJAE 전시 영상</title><style>
body{background:#17251f;color:#f8f5ee;font:17px/1.7 system-ui,sans-serif;margin:0;padding:35px 18px}
main{max-width:1000px;margin:auto}article{border:1px solid #526153;padding:20px;margin:18px 0}
video{width:100%;max-height:70vh}h1{font:normal 36px Georgia,serif}
</style></head><body><main><h1>MYEONGDOJAE · 전시 영상</h1>
<p>이 페이지는 Python으로 생성한 로컬 영상 감상용입니다. 온라인 공개는 별도 업로드가 필요합니다.</p>
""" + "".join(cards) + '<h2>전체 전시 영상</h2><video controls src="exhibition-film.mp4"></video></main></body></html>'
    (out / "index.html").write_text(gallery, encoding="utf-8")


def build(args: argparse.Namespace) -> dict:
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg 설치가 필요합니다 (ffmpeg 명령을 찾을 수 없습니다).")
    project = get_project(args.input, args.project)
    if not project.get("rightsConfirmed"):
        raise ValueError("저작권·전시 사용 권한 확인 표시가 없는 프로젝트는 처리하지 않습니다.")
    out: Path = args.output.resolve()
    if out == args.input.resolve().parent:
        raise ValueError("출력 폴더는 프로젝트 JSON 폴더와 다르게 지정해 주세요.")
    videos = out / "videos"
    videos.mkdir(parents=True, exist_ok=True)
    font_path = font_file(args.font)
    records, clips = [], []
    for pos, work in enumerate(project["artworks"][:20], 1):
        if not isinstance(work, dict) or not work.get("dataUrl"):
            continue
        frame = videos / f"artwork-{pos:02}.jpg"
        clip = videos / f"artwork-{pos:02}.mp4"
        draw_card(work, project, font_path).save(frame, quality=90)
        render_clip(frame, clip, args.duration, args.fps)
        clips.append(clip)
        relative = f"videos/{clip.name}"
        records.append({
            "artworkId": str(work.get("id") or ""),
            "artworkTitle": str(work.get("title") or f"작품 {pos}"),
            "videoFile": relative,
            "videoUrl": video_url(args.base_url, relative),
            "status": "영상 제작 완료",
            "fileBytes": clip.stat().st_size,
        })
    if not clips:
        raise ValueError("이미지가 등록된 작품이 없습니다. 제작기에서 작품을 먼저 등록하세요.")
    audio = args.audio.resolve() if args.audio else None
    if audio and not audio.is_file():
        raise FileNotFoundError("지정한 음악 파일을 찾을 수 없습니다.")
    full = out / "exhibition-film.mp4"
    make_full_film(clips, full, audio)
    manifest = {
        "format": "MYEONGDOJAE-VIDEO-MANIFEST",
        "version": 1,
        "projectId": str(project.get("id") or ""),
        "artist": str(project.get("artist") or ""),
        "exhibition": str(project.get("title") or ""),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "videos": records,
        "exhibitionVideoFile": "exhibition-film.mp4",
        "exhibitionVideoUrl": video_url(args.base_url, "exhibition-film.mp4"),
        "note": "videoUrl의 주소에 MP4를 실제 업로드한 뒤 공개 여부를 확인하세요.",
    }
    (out / "video-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    make_index(out, manifest)
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="명도재: 작품 등록 JSON → 작품별 MP4 · 전시 영상 · 상태 manifest")
    parser.add_argument("input", type=Path, help="관리자에서 내려받은 전시 프로젝트 JSON")
    parser.add_argument("--output", "-o", type=Path, default=Path("myeongdo-video-output"))
    parser.add_argument("--project", type=int, default=0, help="JSON의 프로젝트 번호 (0부터)")
    parser.add_argument("--duration", type=int, default=5, help="작품당 길이(초), 2~30")
    parser.add_argument("--fps", type=int, default=24, help="초당 프레임, 12~30")
    parser.add_argument("--audio", type=Path, help="저작권 허락받은 로컬 음악 파일(MP3/WAV 등)")
    parser.add_argument("--base-url", default="", help="실제 업로드할 예정인 영상 폴더 HTTPS 주소")
    parser.add_argument("--font", default="", help="한국어 자막용 TrueType/OpenType 폰트 경로")
    args = parser.parse_args()
    if not (2 <= args.duration <= 30 and 12 <= args.fps <= 30):
        parser.error("--duration 2~30, --fps 12~30이어야 합니다.")
    if args.base_url and not args.base_url.startswith("https://"):
        parser.error("--base-url은 HTTPS 주소여야 합니다.")
    try:
        manifest = build(args)
    except (ValueError, RuntimeError, FileNotFoundError, subprocess.CalledProcessError) as err:
        parser.exit(1, f"오류: {err}\n")
    print(f"영상 {len(manifest['videos'])}개와 전체 전시 영상 제작 완료")
    print(f"영상 결과: {args.output.resolve()}")
    print("웹 등록용 파일: video-manifest.json")
    print("※ 온라인 전시관 공개를 위해서는 MP4 파일 업로드가 별도로 필요합니다.")


if __name__ == "__main__":
    main()


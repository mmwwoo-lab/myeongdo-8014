# 명도재 이명우의 창작실: 작품 영상 만들기 (Python)

미술작품 등록 → 프로젝트 JSON 내보내기 → Python으로 MP4 영상 만들기 → 제작 상태 등록 → MP4 웹 업로드/영상 감상 순서입니다.

## 1. 작품 등록

1. [명도재 창작실](https://mmwwoo-lab.github.io/myeongdo-artweb/admin/#create)에서 전시 제목과 작가 이름을 입력합니다.
2. **작품 추가**를 눌러 이미지를 올리고, 제목, 연도, 재료, 크기, 작품 설명을 입력합니다.
3. '작품 이미지와 음악·영상의 전시 이용 권한을 직접 확인했습니다' 항목을 확인하고 **전시 프로젝트 저장**을 누릅니다.
4. **영상 제작용 JSON 내려받기**로 `myeongdo-exhibition-....json` 파일을 내려받습니다. 이 JSON에는 압축된 작품 사진도 포함됩니다. 원본 고해상도 사진은 별도로 보관하세요.

## 2. Windows 컴퓨터에 준비할 프로그램

- Python 3.10 이상
- Python 패키지: `python -m pip install Pillow`
- FFmpeg 설치 후 PowerShell/명령 프롬프트에서 `ffmpeg -version` 실행으로 확인
- [exhibition_video.py](./exhibition_video.py) 파일을 위 JSON과 같은 폴더에 다운로드

아래 명령은 영상 제작 프로그램과 JSON이 같은 폴더에 있다고 가정합니다.

```powershell
python exhibition_video.py "myeongdo-exhibition-전시제목.json" --output "my-exhibition-videos" --duration 5
```

한국어 자막 글꼴을 지정하려면 `--font "C:\Windows\Fonts\malgun.ttf"`을 추가합니다.

원하는 경우 직접 이용 허락을 받은 배경음악을 **전체 전시 영상에만** 넣을 수 있습니다.

```powershell
python exhibition_video.py "myeongdo-exhibition-전시제목.json" --output "my-exhibition-videos" --duration 6 --audio "approved-music.mp3"
```

## 3. 결과물

- `my-exhibition-videos/videos/artwork-01.mp4` 등: 작품별 MP4 영상 (1280×720, H.264)
- `my-exhibition-videos/exhibition-film.mp4`: 작품들을 순서대로 연결한 전체 전시 영상
- `my-exhibition-videos/index.html`: 로컬 영상 시사회 페이지
- `my-exhibition-videos/video-manifest.json`: 작품별 등록 상태를 가져오는 파일

Python 프로그램은 정적 이미지를 화면에 배치하고 캡션을 넣어 영상으로 만듭니다. 실제 움직이는 사물이나 사람을 AI 영상으로 생성하는 기능은 아닙니다.

## 4. 웹앱에 영상 제작 상태 등록

1. 원래 전시를 창작실에서 **편집** 화면으로 엽니다.
2. **Python 영상 결과 등록**에서 `video-manifest.json`을 선택합니다.
3. 작품별 상태가 **Python 영상 제작 완료 · 파일 업로드 대기**로 표시됩니다.
4. 전시 프로젝트를 저장합니다.

### 공개 영상 연결 (중요)

위 단계에서는 영상 제작 상태만 기록됩니다. 로컬 MP4는 인터넷으로 자동 업로드되지 않습니다.
MP4 파일을 본인 소유의 웹 호스팅 또는 GitHub Pages에 실제 업로드해야 다른 방문자가 감상할 수 있습니다.
예를 들어 `https://mmwwoo-lab.github.io/myeongdo-artweb/media/내전시/videos/artwork-01.mp4`에 파일을 업로드해 두었다면, 창작실의 각 작품 **영상 감상 링크**에 해당 HTTPS URL을 등록합니다.
전체 전시 영상은 **전체 전시 영상 공개 URL**에 등록합니다.

파일 업로드와 URL 등록을 돕기 위해 다음과 같이 Python 실행 시 공개 예정 주소를 입력할 수도 있습니다.

```powershell
python exhibition_video.py "myeongdo-exhibition-전시제목.json" --output "my-exhibition-videos" --base-url "https://mmwwoo-lab.github.io/myeongdo-artweb/media/내전시"
```

이때 결과 JSON에는 예정 URL이 기록되지만, **파일을 실제 업로드하기 전까지는 재생되지 않습니다.**
큰 영상 파일은 GitHub 저장소 크기와 용량 정책을 확인하고 동영상 호스팅 서비스도 고려하세요.

## 저장·개인정보 및 권리 안내

- GitHub Pages의 공개 페이지에는 Python을 실행하거나 영상 파일을 서버로 업로드하는 기능이 없습니다.
- 새 창작실의 저장은 **브라우저별 localStorage** 방식입니다. 다른 PC에서 접근하려면 JSON 백업이 필요합니다.
- 타인의 이미지, 초상, 음원 등은 사용 허락을 확인하고 등록하세요.
- 동영상 제작본은 고해상도 원본의 대체재가 아니며, 재생 전에 실제 사이트에서 링크 동작을 점검하세요.


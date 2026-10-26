# Python 프로그램 지원부 (부서 10)
**업무 범위:** 이미지 웹 최적화, 시화 레이아웃 합성, 썸네일·만화 컷 규격 관리, 음원 WAV 기술 점검, 결과물 품질 검증.

## 운영 흐름
콘텐츠기획부 → 그림/문학/음악 부서의 원본 파일·저작권 정보 전달 → Python 지원부가 기술 처리 → 편집부가 이미지/글자 검수 → 웹개발부가 실제 URL에 게시.

## 실행
```bash
python -m pip install pillow
python asset_pipeline.py optimize input.jpg output.webp --width 1400
python asset_pipeline.py sihwa photo.jpg sihwa.png --title "시화 제목" --author "시인명"
python asset_pipeline.py inspect-audio song.wav
```
글자 삽입에는 한글 글꼴이 설치되어 있어야 합니다. 원시 전문을 시화에 자동 삽입하지 않으며 원작자 이용 허가를 먼저 확인하세요.

## 품질검수
- 원본과 파생 이미지 구분, EXIF 방향 확인
- 모바일 크기 1400px 이하, 원본 비율 유지, 그림 내 문자 표기 교정
- 만화 2×4행 각 컷 크기 및 이미지 경로 확인
- WAV 샘플레이트/재생시간 확인
- 제작 이미지 저작권과 생성 AI 표기 검토

## 경계
이 스크립트는 **이미지를 새로 그리거나 음악을 작곡하는 AI가 아닙니다**. 나노바나나·Suno·Gemini 등 외부 생성 서비스의 실제 API 자격/중계 서버가 마련되기 전에는 생성 기능이 작동하지 않습니다. GitHub Pages 역시 Python을 서버 측에서 실행하지 않습니다.


# 오디오 재생 오류 점검 기록 (2026-10-28)

- GitHub 저장소: mmwwoo-lab/myeongdo-8014/literary-newspaper/
- Vercel 공개 프로젝트: myeongdo-literary-times-1027
- Chromium Playwright 테스트: 데스크톱 1400×900 / 모바일 390×844
- 99편 목록 표시 및 검색: 통과
- 작품 1/99번 원문, 시 해설 표시: 통과
- 모의 한국어 음성 엔진 재생·일시정지·재개·종료: 통과
- 음성 엔진 불허(not-allowed) 처리 및 외부 브라우저 도움말: 통과
- 한국어 음성 목록이 비어 있을 때 기본 음성 시도: 통과
- 음성 합성 자체가 없는 브라우저에서 실패 원인 표시: 통과
- 모바일 가로 넘침·JavaScript 오류: 발견되지 않음
- 문법 검사: app.js/data.js/narration.js 통과

본 시험의 TTS 음성은 브라우저의 합성 엔진을 모의한 것으로, 사용자의 실제 Android 앱 내 음성 출력 성공을 보장하지는 않습니다.
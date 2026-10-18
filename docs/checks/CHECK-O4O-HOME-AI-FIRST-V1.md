# CHECK-O4O-HOME-AI-FIRST-V1

2026-10-18 · LOCAL_VERIFIED · 기준 main `716504eaf2924988f5a79aa709b0d02bfa0cb3ab`

- 로그인 전·후 공통 본문: AI → 전체 폭 Hero → 가입 서비스/공개 탐색 → 소식.
- 단일 AI 입력·단일 Hero·단일 h1. My Home 계정 영역과 기존 AI 실행 제한 유지.
- frozen offline install, build:packages 통과. Node 22.18.0 / pnpm 10.25.0 / npm 10.9.3.
- 대표 홈 기존 회귀 테스트 12개 통과 (순서·로그인·약관·단일 Hero).
- Neture production build (tsc 포함) 통과. 대상 ESLint 오류 0, 기존 unused-disable warning 1.
- Chromium 실제 홈·Hero·가입 서비스 패널: 1440/390/320px × 게스트·회원·약관 미동의·조회 실패·로딩·Neture 승인 대기 = 18개 화면 통과. AI 우선 DOM/시각 순서, Hero 양끝 전체 폭, 가로 넘침 없음, 입력 제한 확인. 회원 가입 서비스가 다른 서비스 소개보다 먼저 표시됨을 확인.
- 브라우저는 합성 인증·홈 조회 데이터 및 외부 소식 경계를 사용했다. 실제 운영 로그인·AI 요청·DB 쓰기는 수행하지 않았다.
- 오래된 Browserslist 및 큰 chunk 경고는 기존 상태이며 의존성은 변경하지 않았다.

병합·배포·운영 공개 파일 확인 결과는 해당 PR에 기록한다. 현행 배치 정본 §2·§6과 색인을 정정했으며 과거 실행 기록은 보존했다.

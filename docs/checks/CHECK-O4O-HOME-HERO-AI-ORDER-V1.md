# CHECK-O4O-HOME-HERO-AI-ORDER-V1

> **진행 현황 안내 (2026-10-30)**: 헤더 → 전체 폭 Hero → AI → 서비스 목록 → 소식 순서는 PR #702(`186c1d3593`)로 main에 반영됐다. 아래 로컬 검증·병합 결과 후속 기록 예정 문구는 당시 기록이다. 후속 [Hero 운영 정비 CHECK](CHECK-O4O-SERVICE-HERO-OPERATOR-COMPLETION-V1.md)에 누적 main의 2026-10-20 배포 결과가 있으며, 실계정 AI 호출 검증과 구분한다.
> 전체 경과와 남은 확인은 [디자인 정비 진행 현황](../guides/O4O-PUBLIC-DESIGN-PROGRESS-V1.md)을 참조한다. 아래 기존 본문·수치·실행일은 과거 회차 기록으로 보존한다.

2026-10-18 · 로컬 검증. 기준 main `d830f200df8edfba5710933fb2b21b901d17d1fb`.

- 로그인 전·후: 헤더 → 전체 폭 Hero → AI → 서비스 목록 → 소식.
- My Home 상단 계정 진입·가입 서비스 우선·기존 AI 실행 제한 유지.
- frozen offline install 및 build:packages 통과. Node 22.18.0 / pnpm 10.25.0.
- 홈 회귀 테스트 12개 PASS. 단일 Hero·AI, Hero 다음 AI, AI 다음 서비스 목록, 로그인·약관 제한 확인.
- Neture production build(tsc 포함) PASS. 대상 ESLint 오류 0, 기존 unused-disable warning 1.
- Chromium 18화면 PASS: 1440/390/320px × 게스트·회원·약관 미동의·조회 오류·로딩·승인 대기. Hero 최상단·AI 바로 아래·서비스 목록 순서, Hero 양끝 전체 폭·가로 넘침 없음, 단일 h1 확인. 모바일 스크린샷 육안 확인.
- 브라우저는 합성 인증·홈 조회 데이터, 실제 홈·Hero·가입 서비스 패널을 사용했다. 운영 로그인·AI 호출·DB 쓰기 미수행.
- 오래된 Browserslist·큰 chunk 경고는 기존 상태이며 의존성을 변경하지 않았다.

현행 배치 정본 §2·§6과 색인을 정정했다. 과거 실행 기록은 보존한다. 병합·배포 실제 결과는 PR에 기록한다.

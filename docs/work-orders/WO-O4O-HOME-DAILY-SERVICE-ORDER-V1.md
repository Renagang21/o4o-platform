# 대표 홈 일상 서비스 순서·미가입 서비스 배치 정비

> **상태**: ACTIVE
> **작성일**: 2026-10-30 · **최종 갱신**: 2026-10-30 (Asia/Seoul)
> **근거**: 사용자 화면·지시 — 업무 → 커뮤니티·강의 → 펀딩 → 참여한 약국협력체, 미가입 목록 한 행 2~4개
> **기준**: main `1b25114069` · branch `wo/home-daily-service-order`
> **정본**: [대표 홈 탐색](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md)

## 범위·소비처

- `HomeEntryPanel`의 `servicesOnly`는 `O4OHomePage`만 사용한다. 기본·summary·workspaceOnly는 My Home 등에서도 사용하므로 변경하지 않는다.
- 순서는 표시 계층에서 정리하고 서버 소유의 가입·참여·매장·공급자 판정과 기존 EntryButton 이동 경로를 유지한다. 사업·조합·서비스 가입을 서로 대체하지 않는다. 파트너 기능을 신설·복구하지 않는다.
- `ServiceDiscovery`는 대표 홈에서 로그인 전 전체 탐색과 로그인 후 미가입 탐색에 사용한다. 로그인 후 미가입 목록만 분류 경계를 넘어 한 그리드로 묶고, 카드 그리드는 모바일 2열·중간 3열·큰 화면 4열로 표시한다. 공개 도구·준비 중 서비스 분리와 조회 실패 대체 목록은 유지한다.
- 공통 package·API·권한·DB·dependency·workflow 변경 없음. Hero·AI 순서와 My Home 화면의 기존 표시도 유지한다.

## 검증 계획

1. 혼합 역할·가입 순서 변경·매장만 있음·미가입/대기·오류 회귀 테스트.
2. HomeEntryPanel의 기존 My Home·뒤로가기 회귀, ServiceDiscovery와 대표 홈 회귀.
3. Neture 타입 검사·프로덕션 빌드·변경 파일 lint.
4. PC·태블릿·모바일 합성 브라우저에서 순서·2~4열·가로 넘침·이동 경로 확인. 운영 계정 자격이 없으면 실제 로그인 검증과 구분한다.
5. PR CI·리뷰 후 사용자 승인 범위의 main 통합·Delivery·운영 공개 번들 검증. 앱 배포는 Neture가 대상이다.

## 결과

- 고정 버전 Node 22.18.0·pnpm 10.25.0, frozen offline 설치와 `build:packages` PASS.
- HomeEntryPanel(기본·My Home·대표 홈)·뒤로가기·ServiceDiscovery·O4OHomePage 회귀: 4 files / 49 tests PASS.
- Neture TypeScript·프로덕션 Vite 빌드 PASS. 기존 Browserslist·큰 chunk 경고 유지.
- 변경 TS/TSX 4개 lint 오류·경고 0. 문서 민감정보 검사·diff check PASS.
- 실제 컴포넌트·서비스 CSS와 합성 가입/업무 데이터로 Chromium 1440/1024/800/390/320px 5건 PASS. 일상 서비스 순서 유지, 미가입 그리드 4/4/3/2/2열, 공급자 기존 진입 주소, 가로 넘침 0·pageerror 0. PC·모바일 캡처를 시각 확인했다. 임시 화면·캡처는 ignored 경로와 `/tmp`에만 두었다.
- 실제 계정 파일이 작업/기준 checkout 모두 없어 운영 로그인·실계정 이동 검증은 미실행이다. 운영 DB·계정·가입 상태를 변경하지 않았다.
- main 병합·배포는 아직 미실행이며 PR·CI·운영 결과를 후속 기록한다.

문서 정합: 대표 홈 정본 §2에 사용자 확정 순서와 미가입 2~4열 배치를 추가했다. 과거 CHECK·canonical index는 변경하지 않았다.

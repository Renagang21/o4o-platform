# Hero 상단 배치·전체 폭 검증

> 2026-10-17 · 기준 main `900f8043af` · branch `wo/home-hero-full-width`
> [WO](../work-orders/WO-O4O-HOME-HERO-FULL-WIDTH-V1.md)

## 수정

사용자가 제공한 대표 홈 화면의 Hero는 AI와 My Home 아래의 카드였다. 로그인 전/후 공통 헤더 다음에 Hero를 한 번 배치하고, 그 뒤 AI → My Home → 서비스 탐색을 유지했다. 큰 O4O 제목은 헤더의 로고 링크로 정리하고 Hero가 h1을 담당한다. 사용자 최신 위치 지시는 기존 AI 우선 안내보다 우선하며, 현행 canonical 본문을 임의 수정하지 않았다. 이후 대표 홈 정본 정합 작업에서 이 사용자 결정을 반영할 필요가 있다.

공통 ServiceHomeHero는 안정된 wrapper의 화면 좌표와 document.clientWidth를 측정해 좁은 부모 안에서도 화면 양 끝에 배경을 맞춘다. border radius와 좌우 테두리를 제거하고 내부 콘텐츠/조작은 최대 1180px로 정렬한다. resize observer·window resize를 정리하며 공통 HomeHeroView 자체와 운영자 미리보기의 폭은 바꾸지 않는다. 인증·게시·광고 데이터·권한·API·dependency·DB 변경은 없다.

## 검증

- frozen offline install, `build:packages` PASS. 최초 Neture 실행은 패키지 build 완료 전에 시작해 dist 해석 실패가 있었고, build 완료 후 전체 재실행 PASS.
- Neture 전체 **117 files / 1124 tests PASS**. 로그인 전/후 단일 Hero가 AI와 My Home보다 앞에 오는 회귀 포함. 기존 AI 제출/로그인/약관 경계 검증 유지.
- shared-space-ui 전체 **11 files / 118 tests PASS**.
- Neture·약국·강의·분회 production build PASS. 기존 chunk 크기·Browserslist 경고 유지.
- 변경 TS/TSX lint error 0, 기존 unused eslint-disable warning 1. diff whitespace PASS.
- 실제 대표 홈 소스·서비스 CSS와 합성 인증/업무 데이터로 Chromium: 1440/1256/390/320px × 로그인 전/후 8화면. Hero left=0/right=clientWidth, 가로 overflow 없음, AI보다 먼저 표시, 이전/다음 및 Enter 전환 PASS.
- 나머지 7개 표현 영역 × 1440/390/320px 21화면은 좁은 컨테이너의 실제 ServiceHomeHero로 검사했다. 전체 서비스 앱의 로그인부터 업무까지 검증한 것은 아니다.
- mounted 화면 320→1440 resize 후 좌우 경계 재계산, 운영자 preview containment PASS.
- 실제 17px 스크롤바 강제: innerWidth1256/clientWidth1239, Hero right1239/scrollWidth1239/left0 PASS.
- 위 브라우저 시나리오 page error 0. 실제 운영 인증·DB 쓰기는 하지 않았다. 증거는 `/tmp/o4o-hero-width-browser`(임시 fixture, 제품/배포 코드 아님).

## Consumer Impact Matrix

| 소비처 | 영향 | route/role 영향 | 확인 |
|---|---|---|---|
| 대표 Neture | Hero 상단·전체 폭·헤더 로고, 중복 h1 제거 | 없음 | 전체 1124 tests·build·로그인 전/후 8화면 |
| 공급자·펀딩·커뮤니티·CarePharm | 공통 방문자 Hero 전체 폭 | 없음, 기존 진입/승인 유지 | Neture build·공통 컴포넌트 12화면 |
| 약국 | 사업 회원 홈 Hero 전체 폭 | 없음, 업무 바로가기 유지 | build·공통 3화면 |
| 강의 | 공개 홈 Hero 전체 폭 | 없음, 수강/로그인 CTA 유지 | build·공통 3화면 |
| 분회 | 분회 홈 Hero 전체 폭 | 없음, 분회 제목/목록 유지 | build·공통 3화면 |
| 운영자 편집기 | 미리보기 기존 폭 보존 | 없음 | 공통 118 tests·browser containment |
| 내 매장·admin·계정·원내·협동조합 신설 앱 | 이 Hero 미사용 | 없음 | import 소비처 조사 |

문서 정합: 이번 WO·CHECK만 추가. 대표 홈 정본의 기존 AI 우선 설명과 사용자 최신 Hero 위치 결정의 차이를 기록했으며 정본 본문·색인은 변경하지 않았다.

통합·배포 결과는 후속 확인 후 별도 기록한다. 이번 작업 외 다른 세션의 worktree·변경은 수정하지 않는다.

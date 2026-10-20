# 내 매장 상단 메뉴 순서 조정

작성일: 2026-10-20 · 기준 main: `c53bd3c24baa` · branch: `wo/store-navigation-order`

## 요청과 변경

- [x] 최신 AGENTS·canonical index·역할별 공간·공통 모듈 변경 절차 및 소비처 확인.
- [x] 새 전용 branch/worktree에서 매장 운영을 대시보드 다음으로 이동.
- [x] 범위 검사와 PC/모바일 표시·이동 검증.
- 명칭 후보는 사용자에게 제안하며 아직 바꾸지 않는다.

상단 메뉴는 `대시보드 → 매장 운영 → 상품·거래 → 안내 만들기` 순서다. `STORE_WORKSPACE_AREAS` 항목 순서만 옮겼다. URL·key·권한·기능·명칭은 유지한다. Core/API/DB/의존성 선언 변경은 없다.

직접 소비처는 같은 서비스의 `StoreWorkspaceShell`(상단 메뉴·현재 영역), `StoreAiAssistant`(영역 key로 label 조회), `currentWorkspaceArea`(subPath 조회)다. 위치 인덱스에 의존하는 소비처는 없으며 공통 `/store`와 사업 지정 `/work/kpa-society/store`에서 같은 순서를 사용한다. 다른 앱·Core에서 이 배열을 import하는 소비처는 없다.

## 명칭 검토

기존 화면은 신규 작성뿐 아니라 저장한 콘텐츠 조회·수정, 자료 가져오기, 파일·참고 자료 보관과 개별 편집기 진입을 포함한다. 따라서 ‘매장 콘텐츠’를 우선 추천한다. ‘콘텐츠 관리’, ‘콘텐츠 작업실’, ‘매장 자료실’, ‘홍보·안내 자료’도 비교 후보이며 사용자 선택 전에는 반영하지 않는다.

## 검증

Node 22.18.0 / pnpm 10.25.0, 전용 worktree frozen lockfile·무결성 검증 유지 설치.

| 검사 | 결과 |
|---|---|
| Store 의존 패키지 build | PASS |
| 기존 workspace·공통 AI 회귀 | 2 files / 47 tests PASS |
| Store TypeScript·Vite build | PASS |
| 변경 config ESLint, warnings 0 | PASS |
| PC 1440px / 모바일 390px, 두 mount × 네 목적지 | 16 cases PASS |
| diff·문서 민감정보·staged scope | PASS |

브라우저는 실제 Shell/config와 합성 인증/매장 문맥을 사용했다. DOM 순서, PC 가로 배치·모바일 행 순서, 기존 URL 이동·활성 메뉴, 가로 넘침·page error 0을 확인했다. 실계정·운영 화면의 반영 검증은 아니다. 실제 업무 페이지 내부를 다시 검증한 것으로 주장하지 않는다.

환경 증적: `/workspace/.o4o-navigation-order-20261020/`의 install/dependency-build/tests/build/lint 로그와 `/workspace/.o4o-store-navigation-order-browser/`의 fixture·results.json·PC/모바일 스크린샷.

종료점: commit·named branch push. 이번 순서 변경의 PR·main 병합·배포는 아직 실행하지 않았다. `WORKTREE_DISPOSITION = KEEP`(미병합 수정 및 검증 재현 자료).

문서 정합: 이번 변경과 명칭 선택 대기 상태를 이 CHECK에 기록했다. 기존 운영 배포 기록은 변경하지 않았다.

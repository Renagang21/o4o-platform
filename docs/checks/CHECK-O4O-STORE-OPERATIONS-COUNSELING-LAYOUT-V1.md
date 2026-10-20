# 내 매장 운영 화면 배치 검증

작성일: 2026-10-20 · 상태: LOCAL_VALIDATED · branch: `wo/store-operations-counseling-layout`

## 변경 결과

운영 첫 화면에서 위치 집계와 여러 관리 업무가 이어지던 구성을 상담·사이니지·태블릿·QR 선택 화면으로 바꿨다. 선택한 업무의 실행만 표시하며 대시보드·상품·거래·안내 만들기 목적지는 유지한다.

| 업무 | 주요 실행 | 추가 진입 |
|---|---|---|
| 상담 | 기존 다국어 상담, 상품 위치·기본 안내 | 상담 요청, 접힌 상품·안내 참고 자료 |
| 사이니지 | 재생할 안내·순서 변경 | 일정 관리, 재생 화면 |
| 태블릿 | 위치·화면 관리 | 기존 관리 화면에서 적용·수정 |
| QR | QR 배치·출력 | POP 출력 |
| 접힌 현황 상세 | 위치별 저장 설정, 게시·활용 상태, 마케팅 분석 | 기존 상세 URL 유지 |

- 다국어 상담 메뉴가 보조 설정으로 빠지던 분류 누락을 수정했다. 직원 지원·다국어 상담 직접 URL도 매장 운영을 활성화한다. 기존 상담·음성 구현은 [상담 통합 CHECK](CHECK-O4O-PHARMACY-CONSULTATION-MAIN-INTEGRATION-V1.md)를 따르며 새 AI 기능은 구현하지 않았다.
- 이미 권한·사업 기능 필터를 통과한 메뉴만 재배치한다. 약국 상담을 일반 매장에 추가하거나, 빠진 태블릿·QR·자료함·상품 진입을 복원하지 않는다. 허용된 상담이 없으면 첫 번째 이용 가능 업무를 선택한다.
- 선택은 `topic` query로 보존한다. 업무 전환 시 같은 landing의 다른 query·hash·state와 브라우저 이력을 유지한다. 상세 페이지에는 같은 운영 업무 선택을 제공하고 기존 `workspace=use`, 매장 base path를 유지한다.
- 첫 화면은 기기/QR/상담 context API를 미리 조회하지 않는다. 기존 상세 화면을 열 때 필요한 조회가 시작된다. 공통 AI 인스턴스·입력 수명과 기존 전문인/직원 모드·이용 판정은 유지한다.
- `/execution` 상세에서도 outlet의 필터된 메뉴를 전달해 QR만 제공되는 매장이 태블릿 조회·재시도·이동을 만들지 않게 했다. 스캔을 조회 QR의 누적 기록으로 명시하고 ‘미배치’는 위치 미등록임을 설명한다. 미제공 항목은 ‘조회 제외’로 구분한다. 기존 공통 현황 view의 행 구성은 유지한다.
- 작업 선택은 기존 `workspaceGroups` 분류를 재사용한다. 서비스 로컬 페이지·작은 공통 이동 컴포넌트만 추가했고 Core/API/DB/의존성/route/권한 계약은 변경하지 않았다.

## 검증

Node 22.18.0 / pnpm 10.25.0. 전용 worktree에서 frozen lockfile·무결성 검증을 켠 offline 설치 후 검사했다.

| 검사 | 결과 |
|---|---|
| Store 의존 패키지 build (`--workspace-concurrency=2 --filter 'store-web^...'`) | PASS |
| Store 전체 Vitest (`pnpm --filter store-web test`) | 60 files / 709 tests PASS |
| Store build (`pnpm --filter store-web build`, TypeScript 포함) | PASS |
| 변경 TS/TSX 9개 집중 ESLint, `--max-warnings=0` | PASS |
| PC/모바일 Chromium 합성 fixture | 88개 확인 PASS |
| diff·문서 민감정보·staged scope | PASS |

단위 회귀는 두 매장 mount·직접 상담 진입·그룹의 누락/중복·상위 필터 유지·query/hash/state·뒤로가기·첫 화면 무조회·상세의 필터 상속을 포함한다. 기존 상담/음성·AI 입력·조회 실패/재시도·매장 변경/지연 응답 검사도 전체 suite에 포함된다. 이전 전체 업무 메뉴를 기대하던 회귀는 새 업무 선택 화면과 실제 route 기준으로 갱신했다.

브라우저는 실제 Shell·운영 첫 화면·다국어 상담·직원 지원·QR·사이니지·태블릿·실행 현황 컴포넌트에 합성 인증/매장/API를 연결했다. 1440×1000 / 390×844, 공통/사업 지정 mount, 경영자/직원 8조합에서 다음을 확인했다.

- 상담 실행이 첫 화면 안에 표시되고, 선택한 업무만 표시되며 업무 선택 링크 높이는 44px 이상이다.
- 이력 복귀, 같은 매장 내 AI 미전송 입력 보존, 매장 전환 시 초기화.
- 상담의 실제 모드 선택 화면, 직원 지원, 기존 QR·사이니지·태블릿 진입과 운영 복귀.
- 권한 축소 시 허용 업무로 복귀하고 상세 현황도 미제공 태블릿을 조회하지 않는다.
- page error·가로 넘침·미지정 API·쓰기 요청 0.

브라우저 결과는 합성 조회·화면 연결 검증이다. 실계정·유료 번역·실제 음성·QR 출력/스캔·기기 연결/재생 품질 검증을 의미하지 않는다. 빌드에는 기존 Browserslist/큰 chunk 경고가 남고 실패는 없다.

환경 내 증적: `/workspace/.o4o-operations-layout-20261020/`의 설치·build·test·lint 로그, `/workspace/.o4o-operations-layout-browser/`의 fixture/check.mjs/results.json과 PC/모바일 스크린샷. 외부 사이트 요청과 비조회 API는 fixture에서 차단했다.

## 인계

- 시작 main `d176026c2485`. push 전 확인 main `762bed8cc1dd`; 이번 수정 경로와 겹치는 main 변경은 없다. 자동 merge/rebase는 하지 않았다.
- 개발 종료점은 commit·named branch push다. PR/CI 운영·main 병합·배포는 통합 담당이 최신 main과 함께 검증한다. 이번 작업은 운영에 아직 반영되지 않았다.
- `WORKTREE_DISPOSITION`: owned worktree `/workspace/o4o-wt/store-operations-counseling-layout`, branch 동일 WO, main integration/CI/deployment 미실행, verdict `KEEP`(미병합 변경 검토·통합용). 기존 작업공간은 정리하지 않았다.

문서 정합: 이번 [WO](../work-orders/WO-O4O-STORE-OPERATIONS-COUNSELING-LAYOUT-V1.md)와 이 검증 기록을 추가했다. 과거 CHECK와 canonical 정책은 변경하지 않았다.

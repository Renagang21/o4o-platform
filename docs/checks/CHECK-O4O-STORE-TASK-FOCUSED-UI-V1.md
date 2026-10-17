# CHECK-O4O-STORE-TASK-FOCUSED-UI-V1

> 상태: COMPLETED · 작성일: 2026-10-17
> 범위: 내 매장 작업 중심 UI와 이에 필요한 Store 로컬 코드 정비
> 근거: [WO](../work-orders/WO-O4O-STORE-TASK-FOCUSED-UI-V1.md)

## 1. 기준과 종료점

최신 origin/main `7323fce6a99bce13317ccd3374346b74ca7172bb`에서 전용 worktree
`/workspace/o4o-wt/store-task-focused-ui`, branch `wo/store-task-focused-ui`를 만들었다.
기존 checkout/worktree는 수정하지 않았다. 검증 중 main은 `9eb5b19592bda28ec72764a9eda9f5168f363959`로 이동했다.
추가된 변경은 홈 hero의 shared-space-ui·Neture 소비처 및 관련 기록이며 이번 변경 파일과 겹치지 않는다.
AGENTS·CANONICAL-INDEX·SETUP 변경은 없다. 자동 merge/rebase하지 않았다.
사용자 지정 종료점은 commit·push이며 PR 생성·main 병합·자동 병합·배포는 실행하지 않는다. worktree/branch는 통합 전 KEEP.

## 2. 반영과 코드 정비

| 소비처 | 반영 |
|---|---|
| Store 로컬 workspace shell | 네 목적지와 보조 설정 메뉴. 중복된 큰 시작 카드/AI 폼 대신 제목 다음 한 줄 입력, 기존 빠른 작업, 실제 목록을 배치한다. |
| 대시보드 | 확인할 일·매장 현황과 세 업무 링크. 활성 O4O listing 수를 전체 소유 상품 수로 표현하지 않는다. My Home 역할은 바꾸지 않는다. |
| 상품·거래 / 안내 만들기 / 매장 운영 | 중복 목적지 카드 구현을 기존 상품 목록·내 콘텐츠 목록·위치별 실행 현황으로 대체한다. 기존 상세 URL과 전체 업무·서비스별 B2B 진입은 권한 필터를 거쳐 유지한다. |
| AI 표시 | 한 계정/매장/서비스의 AssistantSession을 한 번 유지하고 작은 StoreAiPlacement 슬롯으로 페이지/작성 모달 간 표시 위치만 바꾼다. 대화 상태·유료 호출 엔진을 화면별로 복제하지 않는다. |
| 자료함·편집 복귀 | StoreTaskPageShell에서 AI·빠른 작업의 배치만 조합한다. 실패·빈 결과·재시도를 구분하고 상세에서 원래 studio 목적지·검색으로 돌아온다. 같은 매장 scope와 허용된 기존 목록 경로만 복귀 주소로 사용한다. |
| QR | 연결 안내는 펼침으로, 출력은 활용 모드로 배치한다. 작성 중 관리 목록은 숨기고 취소 후 복귀한다. 미지원 외부 URL 버튼은 화면에서 제거하며 기존 자료를 통한 URL 연결은 유지한다. |
| 태블릿 | 고급 설정을 대기 화면·화면 설정·상품 진열·공통 영상 중 하나씩 표시한다. 패널 이동 때 컴포넌트는 유지해 기존 입력을 보존한다. |
| 사이니지 | 일정 요약은 운영 모드/일정 탭에 표시한다. 저장 사본·게시·일정·재생 및 원래 snapshot/media ID 계약은 유지한다. |

페이지별 목록은 lazy import로 불러오며 첫 목적지 진입 때 다른 두 업무의 편집기를 한꺼번에 로드하지 않는다.
공통 Core/API/DB/의존성/lockfile은 수정하지 않는다. 전체 레거시 파일 재포맷·범용 워크플로 엔진은 추가하지 않는다.
기존 소비자 commerce 금지와 서비스 미가입 매장 소유 제품 계약을 유지한다.
AI에 전달하는 내용은 기존처럼 업무 이름·직접 입력·최근 대화다. 비공개 업무 데이터 자동 수집·제작형 AI 복구·자동 저장/게시/기기 실행·사용자 간 학습은 추가하지 않는다.

## 3. 자동 검증

Node `22.18.0`, pnpm `10.25.0`, `/workspace/.o4o-cloud/activate.sh` 사용.

| 검사 | 결과 |
|---|---|
| 설치 | PASS — frozen lockfile·무결성 유지. `pnpm install --frozen-lockfile --verify-store-integrity=true --store-dir /workspace/.pnpm-store` |
| 공용 패키지 | PASS — `pnpm run build:packages` |
| Store 전체 테스트 | PASS — 57 files / 649 tests. `pnpm exec vitest run --config services/web-store/vitest.config.mjs --maxWorkers=2` |
| Store 빌드 | PASS — `pnpm --filter store-web build` |
| 집중 ESLint | PASS — 변경 TS/TSX 29개, `--max-warnings=0`. 최종 표시 문구/중복 fragment 정비 3개 파일도 재검사 PASS |
| 문서·diff | PASS — docs 민감정보 패턴 0건(4049 files), 상대 링크 26개, `git diff --check`. staged 32개 scope 검사 PASS |

기존 권한/상태/라우트 회귀 외에 실제 목적지 목록 구성, capability 없는 페이지 비노출, 위치별/빈 실행 현황 링크의 capability 유지,
동일 AI의 모달 이동·미전송 입력/진행 중 요청/추가 입력 보존·추가 유료 요청 방지, Enter/Shift+Enter/IME,
studio 검색과 상세 복귀를 검사했다. 최초 추가 복귀 테스트가 목적지 대신 canonical 자료함으로 돌아가는 오류를 검출해 보정했다.
Vite chunk 크기·Browserslist 안내는 남아 있으며 설정·의존성은 변경하지 않았다.
빌드 필터를 잘못 지정한 `No projects matched` 실행은 PASS에 포함하지 않고 실제 `store-web` 빌드를 수행한다.

## 4. 합성 API 브라우저

실제 Store 컴포넌트·API client·편집기를 별도 Vite harness에서 실행했다. 인증·선택 매장·API 응답만 합성이다.
Chromium desktop 1440×1000, mobile 390×844, `/store/*`와 `/work/kpa-society/store/*` 두 mount에서 검사한다.

- 작업 UI: 대시보드 → 실제 상품/콘텐츠 목록, 검색 → 상세 → 원래 목적지 복귀, AI 입력의 작성창 진입/응답/복귀, 한도 실패와 명시 재시도, 태블릿 상세 한 항목 표시, 매장 전환 뒤 늦은 AI 응답 격리, 직원 보조 메뉴.
- QR: 활용 목록/출력 → 기존 동영상 진입 state로 작성 → 관리/출력 비노출 → 취소 후 동일 목록.
- 사이니지 회귀: 빠른 제작/부분 거부 재시도·미리보기/키보드·같은 사본 수정·게시 확인·선택 일정 실패/입력 보존·현재 일정의 같은 안내 수정·재생 조회 실패와 빈 결과·기존 공개 재생 reader.
- **최종 PASS 72개**: 작업 UI 40개 + QR 8개 + 사이니지 회귀 24개. 세 runner exit 0 및 현재 결과 JSON의 failure=null을 확인했다. pageerror·예상 밖 API·검사한 가로 넘침은 0건이다. 중단/실패한 runner는 PASS에 합산하지 않았다.
- 화면 검토에서 AI 입력의 포커스 해제 시 높이 변화가 아래 버튼을 이동시켜 첫 클릭을 놓칠 수 있음을 발견했다. 포커스 높이 상태를 제거해 입력은 한 줄이며 명시 줄바꿈 때만 늘어나도록 보정했다. 모바일 placeholder도 한 줄에 맞췄다.
- 브라우저 fixture의 direct 콘텐츠 reader URL을 실제 계약 `/store-contents/direct/:id`로 보정하고 상세 복귀를 다시 검사했다. 제품 API 계약을 fixture에 맞추지 않았다.

harness·runner·JSON·합성 스크린샷은 `/workspace/.o4o-task-ui-browser`, 로그는 `/tmp/o4o-task-ui-*.log`에 둔다.
실제 계정 로그인·운영 데이터 변경·유료 AI 요청·실제 QR 스캔·태블릿/사이니지 기기 연결·재생은 수행하지 않았다.
합성 직원 메뉴 검증은 운영 계정의 전체 업무/매장 간 접근 격리 검증 완료를 뜻하지 않는다. push 검증을 PR CI·배포 완료로 해석하지 않는다.

## 5. 문서 정합

새 WO/CHECK와 기존 DRAFT 설계의 사용자 승인 반영 절을 업데이트했다.
과거 CHECK/WO·Frozen 정본·canonical index의 당시 범위나 완료 판정은 다시 쓰지 않았다.
AI 기능 범위는 2026-10-16 승인 절, 이번 화면 배치는 2026-10-17 승인 절로 구분한다.

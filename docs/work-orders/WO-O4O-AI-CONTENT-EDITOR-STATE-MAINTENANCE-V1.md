# AI 콘텐츠 편집기 상태·저장 책임 정비

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13
> **근거 WO/IR**: 사용자 다음 작업 지시 · [항목별 조사 STATE-01](WO-O4O-AI-ITEMIZED-COMPLEXITY-MAINTENANCE-V1.md)

## 범위·기준

최신 main `aa59a0962f`에서 `wo/ai-content-editor-state-maintenance` 전용 worktree를 만들고 앞 push `f7bc67eea5`를 연결했다. 앞 AI 정비는 아직 main에 없으며 이 branch에 포함된다. 이번 작업은 기존 공통 content-editor의 내부 상태 정비다. 서비스 간 공통화·새 Core/패키지·메뉴/route·provider/요금·DB/권한·외부 인증/결제 변경은 포함하지 않는다. 종료는 push까지.
[공통 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md), [콘텐츠 운영](../baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md), [제작 흐름](../architecture/O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1.md), [상품 자료 소유권](../design/DESIGN-O4O-PRODUCT-AI-CONTENT-OWNERSHIP-AND-STORE-DESCRIPTION-CONTRACT-V1.md), [설치·검증](../../SETUP.md), canonical index와 AGENTS를 읽었다. 매장 내부 AI가 은퇴된 현재 진입은 유지하고 복구하지 않는다. 기존 저장 prop은 호환 계약이며 새 매장 mount를 만들지 않는다.

## 조사·상태 지도

최신 코드 후보 322 files·5107 functions·101 duplicate groups를 재수집했다. AiContentModal 본체 1283줄/자체 797줄/분기 85/nested functions 37, useState 32개·Effect 3개. 단순 줄 수가 아니라 갱신이 함께 필요한 상태와 업무 소유권을 조사했다.

| 상태 묶음 | 입력/갱신 주체 | reset·유지 계약 | 정비 |
| --- | --- | --- | --- |
| input/mode/tone/length | 사용자·초기 props, 3 Effects | open 시 각 Effect 의존성대로 주입. template 옵션 객체 변경 시 재설정도 기존 동작 | Effect 범위/의존성 그대로 |
| generation/result/error | text/URL 요청·검증 | 시작 시 result/error/copy clear; validation 실패는 기존 result 유지; 완료 후 preview; URL 90초 guard | 원자적 이벤트 reducer |
| resultTab/copied/usage snippets | 사용자 표시 | close는 copied/snippets clear, resultTab 유지. source 변경은 result/error만 clear | generation reducer에서 정확한 이벤트별 clear 범위 |
| community panel/form/job | 포럼 저장·목록 조회 | title/forumId/status 초기화; close도 목록 cache/로딩은 유지. 무목록/조회 실패 시 저장 가능 | 내부 saving hook, form/catalog/job 별 소유 |
| store panel/form/job | 기존 store endpoint | 403 경영자 오류 안내, close reset. 다른 패널과 독립 | 기존 request/오류 형상 보존 |
| production panel/form/job | 기존 assets endpoint | category/usageType/sourceMetadata/templateId 유지; 성공 콜백 후 자동 닫기 없음 | 기존 callback/추적 메타 보존 |
| channel job | 호출 측 callback | 다른 저장과 독립. 실패 후 retry 가능 | pending/status를 한 저장 상태로 관리 |
| sourceTab/URL/customPrompt | 사용자·close | source 변경은 입력/옵션 유지. close는 초기 탭·mode 및 입력만 reset; URL tone/length 유지 | 기존 lifecycle 유지 |

여러 저장 패널은 동시에 열릴 수 있으므로 단일 destination enum으로 강제하지 않는다. generation 결과/validation 오류의 동시 표시도 기존 의미이므로 금지 조합으로 오판하지 않는다. loading/status 같은 저장 job의 연관 상태는 한 값으로 갱신해 pending+완료 상태를 새로 만들지 않는다.

## 소비처·검증 계획

직접 mount는 content-editor Toolbar와 shared-space-ui CommunityContentWriteShell이며 RichTextEditor가 여러 서비스/관리자/LMS/자료 작성 화면에 공급한다. showInternalAi 가드와 은퇴 store raw-source tests를 포함해 확인한다. 저장 요청에는 기존 `credentials: include`와 aiRequestHeaders를 그대로 전달하고 기존 서버의 ownership/권한 판단을 따른다. 프론트 표시 flag를 권한으로 취급하지 않는다.

- [x] identifier/import/경로/endpoint/raw-source 소비처와 상태 지도 재조사.
- [x] 생성/표시 reducer와 내부 saving controller 정비. public props·package exports 유지.
- [x] 초기 prop/Effect, text/URL 결과·YouTube/삽입·닫기/재진입, 네 저장 영역/실패/retry/metadata/인증 회귀.
- [x] 기존 save panel/conversion·retirement/boundary 회귀, build/type/lint.
- [x] 격리 browser fixture에서 desktop/mobile 실제 모달 상호작용·mock 요청 검증.
- [x] 전후 지표/검증/후속을 기록하고 소유 경로만 commit/push.

## 발견한 후속 문제

닫기/탭 변경 뒤 기존 in-flight 요청·clipboard timer가 끝나면 이전 closure의 상태를 갱신할 수 있다. 이번 내부 책임 분리로 취소/최신 요청 우선 정책을 암묵적으로 추가하지 않는다. 세션 epoch/AbortController·저장 완료 콜백 및 실제 서버 write와의 관계를 별도 lifecycle 항목에서 검증한 뒤 정비한다. Effect의 template 객체 참조 의존성, 부모가 open만 false로 바꾼 경우 handleClose와 다른 reset 의미도 별도로 확인할 항목이다.

다음은 STATE-02 Work Agent closure/세션 상태 조사다. 중복 후보 공통화는 전체 플랫폼 정비 때 한다.

## 결과·문서 정합

### 구현 경계·전후 지표

- `ai-content-generation-state.ts`: 생성 시작/결과/오류/종료, 표시 탭/복사/이용조건 토글, source 변경/close의 9개 이벤트. 서로 다른 reset 범위를 보존한다. 네트워크·권한 판정 없음.
- `useAiContentSaving.ts`: channel/community/store/production 네 내부 hook. domain별 좁은 입력과 독립 form/catalog/job. 저장 중 여부와 receipt는 `SaveJob` 한 값으로 갱신하며 pending+receipt 조합을 만들지 않는다. 전체 generic fetch/retry/저장 runner를 만들지 않았다.
- AiContentModal은 기존 입력·3 Effects·text/URL 호출·복사·YouTube/Editor 삽입·화면 조율을 맡는다. saving controller를 closed render에서도 무조건 호출해 hook 순서를 보존한다. Effect 의존성도 그대로다.
- `AiContentSavePanels`는 표시/동작 위임 계약을 그대로 유지하고 책임 주석을 현재 소유자에 맞췄다.
- 기존 package exports/index·외부 prop 형상은 그대로다. 내부 type-only import를 위해 props/mode 타입을 module 내부에서 export했지만 public package index에 추가하지 않았다. reducer/hook도 public index에서 export하지 않는다.

| 지표 | 변경 전 | 변경 후 | 해석 |
| --- | --- | --- | --- |
| AiContentModal 본체 전체/자체 줄 | 1283 / 797 | 1055 / 743 | 렌더 JSX가 여전히 크다. 전체를 완료했다고 판정하지 않음 |
| Modal nested functions | 37 | 25 | 저장 closure를 업무별 hook으로 좁힘 |
| Modal useState | 32 | 9 + reducer 1 | 내부 saving hook useState 8개를 포함하면 총 state 저장 slot 32→18 |
| Effect | 3 | 3 | open·초기 input/mode·template 옵션 의존성 보존 |
| Modal 분기 / 관련 모듈 분기 합 | 85 / 206 | 86 / 216 | reducer case 9개와 내부 상태 선택이 추가됨. 숫자 감소를 목표로 조건을 없애지 않음 |
| AI 후보 모집단 files/functions/duplicate groups | 322 / 5107 / 101 | 324 / 5131 / 101 | 새 중복 hash 그룹 0. 새 파일은 이 modal 내부이며 전 서비스 공통화 없음 |

Private hook 본체 줄 수: channel 40, community 115, store 74, production 108, coordinator 18. 타입·전이 표현으로 관련 전체 줄/함수 수는 증가했다. 사업 요청/오류가 명시적으로 남고 상태 소유권이 분명해졌다는 효과를 검증했다. 포함 파일의 상대 import declaration cycle은 0개이며 alias/dynamic 전체 dependency 무순환의 증거가 아니다.

### 실제 검증

- 기존 의존성 `pnpm install --frozen-lockfile --verify-store-integrity=true` PASS. package.json/lockfile/빌드 설정 변경 없음.
- `pnpm run build:packages`, `pnpm --filter @o4o/content-editor typecheck`, `pnpm --filter @o4o/content-editor build` PASS.
- 소비처 사전 빌드 `pnpm --filter '@o4o/web-neture^...' run build`, 소비 앱 `pnpm --filter @o4o/web-neture run build` PASS. 최종 내부 form 갱신 정비 후 content-editor 및 Neture build를 다시 확인했다. Vite의 기존 큰 chunk 경고는 남아 있으며 bundle 튜닝은 이번 범위가 아니다.
- `pnpm exec vitest run --config services/web-neture/vitest.config.mjs services/web-neture/src/components/__tests__/AiContentModalState.test.tsx services/web-neture/src/components/__tests__/AiContentSavePanels.test.tsx`: **2 files / 23 tests PASS** (신규 상태/실제 모달 19 + 기존 panel/conversion 4).
- 신규 회귀를 HEAD의 변경 전 모달 snapshot에도 실행: **19 tests PASS**. UI/저장 동작의 전후 계약을 비교했고 temporary snapshot/test는 삭제했다. reducer 직접 경계 1건은 신규 reducer 검사이므로 변경 전 reducer가 있었다고 주장하지 않는다.
- API Jest store-internal-ai-retirement/store-external-llm-content-authoring/store-production-external-llm-realignment/store-ai-first-editor-boundary: **4 suites / 141 tests PASS**. 은퇴 화면에 새 AiContentModal mount·AI 호출·저장 write 연결을 만들지 않았다.
- 수정 TS/TSX 5개 파일 ESLint: **오류 0 / 경고 0**. 이전 상호작용 단언을 약화하지 않았다. 첫 실행의 기존 화면 문구/버튼 이름과 다른 selector 3건은 실제 문구를 확인해 수정하고 재검증했다.
- Playwright + 로컬 Chromium, 별도 fixture·새 context: desktop 1280×900 / mobile 390×844 **PASS**, runtime error 0. 생성·mock 저장 성공 메시지·콜백/삽입·close/reopen·URL 및 credentials/header 전달 확인. desktop mock 요청 6회, mobile 2회. 원격 요청은 차단했고 실제 API/유료 AI/DB write/계정은 사용하지 않았다.
- 변경 전/후 같은 모바일 fixture 결과 screenshot pixel 차이 0. fixture 서버·임시 snapshot은 제거하며 public 제품 route를 추가하지 않는다. 실제 서비스 로그인/운영 QA를 수행했다는 증거는 아니다.
- identifier/import·endpoint/path/raw-source census와 은퇴 경계 모두 확인. 문서 sensitive guard·상대 링크·diff check PASS. staged scope는 이번 소유 파일 6개로 확인한다.

### 문서 정합·Git

이번 상태 지도와 구현·검증이 일치한다. 이전 항목별 WO의 STATE-01은 당시 후보 기록으로 보존한다. 다음 STATE-02 및 위 비동기 lifecycle 문제는 남은 TODO다. Frozen/canonical index/기준 본문, 콘텐츠 audience/소유권/게시 권한, 기존 서버 검증, 메뉴와 서비스 공통화 시점을 바꾸지 않았다.

검토 branch `wo/ai-content-editor-state-maintenance`에 앞 unmerged AI 정비를 포함하며 main/배포/운영 변경과 별개다. 종료는 이번 소유 경로 commit/push·원격 HEAD 일치·worktree clean 확인까지다.

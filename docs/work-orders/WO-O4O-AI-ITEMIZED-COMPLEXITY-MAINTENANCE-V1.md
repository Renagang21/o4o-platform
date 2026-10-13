# AI 항목별 복잡성 정비 — 조사와 내부 책임 분리

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13 (Asia/Seoul)
> **근거 WO/IR**: 사용자 항목별 정비 진행 지시 · [앞 비용/실행 정비](WO-O4O-AI-QUOTA-RUNTIME-MAINTENANCE-V1.md)
> 종료 범위: push까지 · 서비스 간 공통화는 전체 정비 때 수행

## 범위·기준

최신 main `f66ed5f5f8`에서 전용 `wo/ai-maintenance-phase2-items` worktree를 만들고 앞 push `e9b8549a8c`를 연결했다. 앞 AI 변경은 아직 main에 없으므로 이 branch는 앞 Core/코드/비용 정비를 포함한다. push 전 main이 `aa59a0962f`로 이동한 것을 확인했다. upstream 변경 57개 경로와 AI 조사 모집단의 겹침은 0개이며, 이를 작업 branch로 conflict 없이 연결하고 API build/실제 공통 HTTP 회귀를 재검증했다.
항목별 기준은 O4O 전체에 적용하되 이번 첫 모집단은 AI 관련 경로와 직접 import 소비처다. 서비스 간 공통화는 후보 등록만 하고 전체 정비 단계에서 모든 소비처·정책·소유권을 비교한 뒤 판정한다. 기존 공통 구현의 내부 책임 분리는 새 서비스 공통화와 구분한다.
Auth/RBAC/자료 ownership·Core 공개 계약·route·UI·모델/업체·timeout/retry·quota/DB schema/정책은 변경하지 않는다. 원문/비밀정보를 조사 결과에 복사하지 않는다. 운영 write·유료 호출·main 반영·배포 없음. 종료는 push까지.
[Core+Extension](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md), [공통 소비처 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md), [자동화 원칙](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md), [Assistant V2 §18](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md), [업무공간 §9](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md), [설치](../../SETUP.md)를 기준으로 읽었다. Runtime 성능 튜닝이 아닌 구조 정비다.

## 조사 방법·한계

- `scripts/quality/audit-code-complexity.mjs --ai`: tracked production TS/TSX의 AI 경로/이름 + 직접 AI 관련 import를 재수집. tests/fixtures/declarations/migrations 제외. metadata와 hash만 출력하며 파일 수정·설치 없음.
- main 경로 seed 190개, 앞 변경 연결 후 경로/import 후보 321 files·5097 functions (constructor 제외). 이는 업무 활성 판정이나 전체 repository 전수 감사가 아니다. 콘텐츠 편집기 소비처(상품/태블릿 UI 등)도 포함된다.
- 함수별 전체/자체 줄 수, 분기 AST 수, syntactic nesting, 인자, await, nested function을 함께 본다. 분기 수는 ESLint cyclomatic/Sonar cognitive complexity와 다르며 else-if 등도 syntactic nesting에 포함한다. 숫자로 자동 수정·품질 합격을 선언하지 않는다.
- AST leaf token에서 comment/whitespace를 제외하되 식별자·문자열·정규식·template·JSX 리터럴을 유지한 60 token 이상 함수 body hash: 101 동일-body 후보 그룹. 이 중 4개는 같은 파일, 97개는 여러 파일. semantic duplication 확정이 아니며 일부 UI callback/동적 등록/이력 코드의 활성 여부를 추가 확인해야 한다.
- 포함 파일의 상대 import declaration graph에서 cycle 0개. 명시적 type-only는 제외하며 .ts/.tsx/index.ts로 해석되는 경로만 포함한다. reexport·alias·범위 밖 노드·dynamic import·compiler의 실제 import 소거는 분석하지 않는다. 전체 dependency 무순환/미사용 증명이 아니다.
- 수정 대상은 identifier/import·파일 경로·raw-source contract·기존 회귀를 확인한다. source guard를 약화하거나 문자열 단언을 없애지 않는다.

## 항목별 후보·판정

| ID | 항목·후보 | 문제/확인한 사실 | 이번 처리와 검증 |
| --- | --- | --- | --- |
| DUP-01 | ai-proxy/hospital validateInjectedTargetSchema | 동일 body. 서버 신원과 public/device 진입 계약은 서로 다름 | 전체 정비의 공통화 후보. 이번 추출/통합 없음 |
| DUP-02 | storeQr/storeSns response parser | 동일 body지만 업무 prompt·향후 응답 계약은 독립 | 전체 정비의 공통화 후보. 기존 parser 유지 |
| DUP-03 | assistant-task-store/procedural-memory-store row shape 처리 | ORM raw UPDATE 반환 해석 중복 | 전체 persistence 소비처 확인 후 공통화 판정 |
| DUP-04 | POP staff 공통 패키지/KPA/web-store callback | 동일 저장/삭제 callback 여러 그룹 | 활성/은퇴 여부·서비스별 권한/endpoint를 확인할 전체 정비 후보 |
| FUNC-01 | AiAccountedExecution.invoke | 186줄·자체 170줄·분기 39. config/budget/provider/failure receipt/success settlement가 혼재 | 우선 정비: readonly 준비 계획→provider→성공 정산 private 단계. 같은 예산/가격 version/오류/호출 순서 회귀 |
| FUNC-02 | dispatchWorkProposal | 345줄·분기 76. inspect/UIA/DOM read·unit batch·single batch가 혼재 | 우선 정비: 읽기→단위 행동→단발 행동 단계. 좁은 context view. history/계측/거절·관찰/예산/재전송 금지 회귀 |
| BRANCH-01 | performHomeChat tool→prompt 표시 | 분기 58·syntactic nesting 15. 신원 확정과 단순 표시 변환이 한 함수에 있음 | 우선 정비: 도구 결과의 표시 facts/browserSiteOpened를 순수 내부 helper로 분리. authenticate/scope resolution/allowlist/execute 직전 검증 유지 |
| STATE-01 | AiContentModal | 자체 797줄·nested functions 37. 생성/저장/미리보기 상태와 callback 분산 | UI 상태·Effect·중복 state의 의미를 다음 항목에서 상세 조사. 이번 UI/저장 정책 변경 없음 |
| STATE-02 | runWorkAgent | 전체 1184줄/자체 530줄/nested functions 49. 좁힌 loop와 별개로 세션 상태·closure가 큼 | 소유/재개/계측 capture 지도 작성 후보. 함수만 옮겨 인자·공유 상태가 커지는 정비는 하지 않음 |
| DEP-01 | WorkExecutionContext | 읽기/단위/재생이 받는 context에 해당 단계에서 쓰지 않는 callback도 있음 | FUNC-02 내부 단계에 Pick view 적용. 외부 dispatch/replay 공개 형상 확대 없음 |
| DEAD-01 | 전체 후보의 미사용처럼 보이는 export | route/registry/raw-source/dynamic 소비처 때문에 lexical 검색만으로 삭제 불가 | 확인 대기. 이번 삭제 없음 |
| TEST-01 | 기존 비용/실행/HTTP 회귀 | 실제 행동·예약·재시도·정산 실패를 검증하는 tests가 이미 있음 | 기존 테스트를 우선 활용하고 새 표시 helper/진단 도구의 경계만 추가 검증 |

TabletKioskPage·SupplierProductCreatePage·ProductDetailDrawer·registerDomainRoutes도 높은 지표 후보지만 이번 AI 내부 수정 범위가 아니다. 소스가 존재한다는 이유만으로 현행 업무/복구 대상으로 판정하지 않는다. 기능·권한 변경과 구조 정비를 섞지 않는다.

## TODO·개발 순서

- [x] 최신 코드 재수집·8개 항목 후보와 공통화 보류 기록.
- [x] read-only audit 도구의 nested 함수·body 중복·type-only import·경계 검증.
- [x] FUNC-01 준비/provider/정산 책임 분리, non-null assertion 제거와 단계 간 명시적 값 전달.
- [x] FUNC-02 읽기/단위/단발 행동 단계와 context view 정비.
- [x] BRANCH-01 도구 표시 순수 변환, 실제 권한 판정은 원래 실행 경로 유지.
- [x] 기존 비용/실행/HTTP/동적 모델/도구별 안전 회귀·build/type/lint·docs 검증.
- [x] before/after 지표와 남은 후보를 기록하고 이번 경로만 commit/push.

같은 body가 여러 서비스에 있다고 새 Core/shared package를 만들지 않는다. 전체 정비 때 기존 공통 구현, 모든 caller의 입력/출력/권한/실패 정책, 각 서비스에서 달라야 하는 부분을 함께 확인한다.

## 조사한 개발 지침

- [Google code review](https://github.com/google/eng-practices/blob/master/review/reviewer/looking-for.md): 이해/변경 어려움과 over-engineering을 검토.
- [ESLint max-lines 토론](https://github.com/eslint/eslint/issues/9842): 줄 수·분기·중첩은 서로 다른 문제를 포착하며 nested 함수 계수에도 해석이 필요.
- [React state](https://github.com/reactjs/react.dev/blob/main/src/content/learn/choosing-the-state-structure.md): 모순·중복·파생 state와 동기화 부담을 조사.
- [Google small changes](https://github.com/google/eng-practices/blob/master/review/developer/small-cls.md): 기능 변경과 정비를 구분하고 검토 가능한 변경 단위 유지.

지침의 숫자/예시를 O4O의 자동 수정/삭제/공통화 정책으로 승격하지 않는다. 공통화 시점은 사용자 지시가 우선한다.

## 구현 결과·지표

| 대상 | 변경 전 함수 줄/분기/중첩 | 변경 후 함수 줄/분기/중첩 | 책임 분리의 실제 경계 |
| --- | --- | --- | --- |
| AiAccountedExecution.invoke | 186 / 39 / 3 | 27 / 2 / 1 | prepare(61줄)→reserve→callProviders(59줄)→settleResult(50줄). 준비 값은 호출별 readonly 타입, 실행 결과가 없는 실패와 생성 후 정산 실패를 구분 |
| dispatchWorkProposal | 345 / 76 / 5 | 18 / 5 / 1 | dispatchRead(192줄)→dispatchUnit(100줄)→dispatchSingle(54줄). NOT_HANDLED와 null(처리 후 계획 계속)을 구분해 lost 응답을 단발로 재전송하지 않음 |
| performHomeChat | 239 / 58 / 15 | 197 / 34 / 4 | 도구 표시 actionFacts(41줄)/buildHomeChatToolPresentation(26줄). 신원·자료 소유권·allowlist·tool 실행은 원래 route/contract에서 수행 |

줄 수는 서식·타입 선언의 영향을 받으며 검토 보조 지표다. 분기를 함수로 옮겼으므로 업무 판단 전체가 사라진 것은 아니다. 비용 모듈의 함수별 분기 합계는 48→49, dispatch 모듈은 89→91이다. Home 표시 분리 전후 해당 책임의 분기 합계는 58→58이다. 타입·단계 경계로 전체 줄 수는 늘었고, provider/account/session을 mutable 클래스 필드에 새로 담지 않았다. 같은 context 참조로 session history/관찰/계측 소유권을 보존한다.

최종 같은 AST 도구로 변경 전 HEAD의 321 파일을 별도 scratch에 읽기 전용 재구성해 비교했다. 변경 후 새 표시 helper를 포함하면 322 files·5107 functions·101 동일-body 후보이며 새 중복 hash 그룹은 0개다. 초기 lexical scanner의 92개는 예비 수치였고, 정규식/template/JSX의 토큰 문맥을 보존하도록 보강한 최종 AST 수치 101개로 확정했다. 전후 같은 도구/모집단 기준이며 운영 활성 여부를 증명하지 않는다.

## 검증 결과

- `pnpm install --frozen-lockfile --verify-store-integrity=true`: 기존 의존성 설치 PASS. 의존성/lockfile 변경 없음.
- `pnpm run build:packages`, `pnpm --filter @o4o/api-server run build`: PASS. API production TypeScript 검사 포함. 최신 main 연결 후 API build와 공통 HTTP 2 suites / 57 tests 재검증도 PASS (위 회귀와 중복 합산하지 않음).
- API Jest 비용·가격·서비스 Extension·HTTP·tool/Local Agent·retirement/raw-source·Planner 회귀: **18 suites / 496 tests PASS**.
- API Jest Work Agent·unit dispatch·visual loop·discovery·recovery·experience·assistance·workflow·UIA·safety·finalization: **12 suites / 130 tests PASS**.
- 신규 표시 helper 최종 fixture 수정 후 재검증: **19 tests PASS** (위 496개에 포함, 중복 합산하지 않음). 기존 코드 경로의 assertions를 제거하거나 약화하지 않았다.
- `node --test scripts/quality/audit-code-complexity.test.mjs`: **5 tests PASS**. nested 함수 제외·식별자/리터럴 보존·주석 무시·정규식/template 공백·type-only/cycle·경로 경계 검증.
- 수정 TS 6개 파일 `pnpm exec eslint <paths> --format json`: **오류 0 / 경고 0**. 새 .mjs 두 파일 `node --check`: PASS.
- identifier/import 및 `check-literal-consumers.mjs`로 실제 소비처 20건 확인. 비용 경로 policy/질의/Neture/Copilot/LMS, Home/request의 HTTP와 원문 검사 tests, dispatch runtime을 함께 검증했다.
- 문서 sensitive guard·상대 링크·`git diff --check`: PASS. staged scope: 이번 소유 파일 9개 PASS.

초기 audit fixture가 최소 60 token 기준에 미달한 실패와 test 실행 cwd 오지정은 수정 후 해당 tests를 다시 통과했다. Provider/Node/DB 접근은 기존 mock 회귀다. 운영 smoke·실제 유료 호출·실서비스 quota/청구/배포를 검증한 결과가 아니다. 앞 비용 WO의 migration 적용 경계와 legacy 직접 transport 미전환 범위는 그대로 남는다.

## 후속 TODO·순서

1. **STATE-01** 콘텐츠 modal의 상태/파생 값/Effect/저장·미리보기 전이를 자료 ownership 및 실제 UI 사용과 대조한다. 먼저 조사표를 만들고 내부 상태 정비만 진행한다.
2. **STATE-02** Work Agent의 관찰·재생·unit·계측 closure capture/상태 변경 지도를 만든다. dispatchRead 안의 inspect/UIA/DOM read 추가 분리는 그 소비 상태를 확인한 뒤 판정한다. 이번 phase helper에도 남은 분기·중첩을 계속 조사한다.
3. **DEP/DEAD** reexport/alias/dynamic registry/실제 route 활성까지 확인해 dependency·미사용 후보를 판정한다. lexical 0건만으로 삭제하지 않는다.
4. **DUP** 전체 플랫폼 정비 때 101개 후보의 활성 상태, 모든 caller의 계약·권한·실패 정책, 기존 공통 구현을 비교한다. 개별 서비스 작업에서는 공통화 후보만 갱신한다.

## 문서 정합·Git 경계

Core/Extension/provider 공개 계약, Auth/RBAC/Node 소유권, Assistant V2 A→I, 비용 정책을 바꾸지 않았다. 앞 Foundation의 최초 조사·전환 계획과 완료 WO는 당시 기록으로 보존한다. P2 예약/정산·가격 구현 현황과 운영 미적용 범위는 [앞 비용 WO의 결과·후속 경계](WO-O4O-AI-QUOTA-RUNTIME-MAINTENANCE-V1.md)를 읽는다. 이번 문서는 구조 정비 결과 및 후속 조사 순서이며 새로운 운영/요금 정본이 아니다. Canonical index/Freeze/기준 문서 본문 변경 없음.

`wo/ai-maintenance-phase2-items`는 확인한 최신 main `aa59a0962f`와 앞 unmerged AI branch를 연결한 검토 branch다. 이 작업을 push해도 main/운영에 적용되지 않는다. 이번 소유 경로만 path-specific commit/push하고 배포·운영 인증 변경·결제·DB migration 실행은 포함하지 않는다.

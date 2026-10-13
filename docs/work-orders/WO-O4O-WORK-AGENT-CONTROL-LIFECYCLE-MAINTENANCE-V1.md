# Work Agent 계획·복구·Task 문맥·종료 흐름 정비

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13
> **근거 WO/IR**: 사용자 다음 작업 지시(너무 작게 나누지 않음) · [요청 세션 정비](WO-O4O-WORK-AGENT-SESSION-MAINTENANCE-V1.md)

## 조사·범위

최신 main `76941a5dae`에서 전용 branch/worktree를 시작하고 앞 push `c4323f607a`를 연결했다. 앞 AI 작업은 아직 main에 포함되지 않았으므로 이 branch에 함께 보존한다. 이번 납품은 계획 수립 → 복구·도움 요청 → 재개 → 종료 기록의 연결된 흐름 하나다. 서비스 간 중복 공통화는 전체 정비 때 한다.

AGENTS, canonical index, [공통 소비처](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md), [자동화 §25](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md), [Assistant V2 §18](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md), [업무공간 §9](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md), [Memory 배치](../baseline/O4O-ASSISTANT-MEMORY-PLACEMENT-POLICY-V1.md), [설치](../../SETUP.md)를 기준으로 재조사한다. 기존 Core/Extension/provider 계약·Assistant 완료 계약·권한·Node/Memory 소유권을 변경하지 않는다. Runtime 내부 책임 정비이며 V1 확장·polling/vision/provider 최적화가 아니다. 운영 인증·유료 계약·DB/실 PC write·main 병합·배포 없이 push까지 진행한다.

## 문제·구조안

앞 관찰 세션 분리 뒤에도 Runtime의 계획/수락 closure는 각각 23/29개 직접 local binding을 capture했다. Planner 역할·복구·방법 탐색 카운터, Task 선언·회상·사용자 교정·재개 구조가 한 함수에서 읽고 쓰이며 finish도 40개 binding을 capture한다. 상태 snapshot을 복사하거나 모두 한 mutable context에 넣으면 await 이후 현재값과 소유권이 흐려진다.

| 책임 | 소유 상태·입력 | 경계 |
| --- | --- | --- |
| 계획 세션 | active Planner/mode, 복구 상태 신호, 같은 행동·방법 탐색, 제안 거절 | 현재 관찰·Task 조회를 사용. 계획 제안 검증 후에만 기존 dispatch로 전달 |
| Task 문맥 세션 | 선언·첫 입력 분류·패턴·재개 구조·도움 이벤트 | 검증된 node/owner로 생성. 마지막 질문 노드만 Local 재개 사용, Cloud 패턴 우선, 원문·slot 값 미저장 |
| Runtime 조율 | identity/대상 준비/run claim, 행동 안전·dispatch/replay, 종료 기록 순서 | segment 완료를 Assistant Task 완료로 승격하지 않음 |
| 종료 결과 투영 | 기존 종료 kind·실행 근거·Memory 구조 | 기존 finalization 기반 활용. QUESTION/TAKEOVER 및 run 미개시 결과 보존 |

초기 종료에서는 세션이 아직 없다. 요청 로컬 binding과 기존 기본값(discovery/null)으로 처리한다. 생성 후 읽기는 현재 세션 method를 사용하며 raw field를 공개하지 않는다. 기록은 terminal → workflow → Experience → 질문 문맥 → assistance → usage → report 순서다. recovery와 method discovery의 관찰 reset/restore, successful call에서만 일회 탐색 문맥 해제, 첫 userInput 분류, takeover 우선, best-effort 기록을 보존한다.

## TODO·개발 순서

- [x] 최신 코드/문서·소비처·현재 모집단을 조사하고 연결된 흐름의 상태 소유권 확정.
- [x] Task 회상·선언·도움·Memory와 Planner/Recovery 수락 흐름을 함께 정비.
- [x] 기존 finalization에 종료 결과 투영을 연결하고 초기 종료·재개 경계 확인.
- [x] 요청 격리·await 이후 현재값·거절/회복·기록 순서와 기존 회귀 검증.
- [x] 전후 지표·문서 정합·소유 경로를 확인하고 commit/push.

## Consumer impact matrix

`runWorkAgent`를 쓰는 기존 HTTP/Personal Assistant 실행 경로와 planner 재수출 소비처가 대상이다. public symbol과 호출 signature는 보존한다. raw-source 소비처는 work-agent/LLM-closure/windows safety의 실제 소스 목록에 새 helper를 포함해 단언 범위를 확장한다. 기존 단언을 삭제·완화하지 않는다. CI 경로 분류 소비처도 확인한다. UI/메뉴/role/capability/route 변경이 없어 화면 smoke 대신 기존 HTTP·Task ownership·Memory continuity·실행 회귀를 수행한다.

## 결과·문서 정합

### 구현·전후 지표

`createWorkPlanningSession`은 Planner 역할·복구 신호·방법 탐색·같은 행동/거절 상태를 요청마다 소유한다. `createWorkTaskSession`은 검증된 node/owner/run claim 뒤에 생성해 Task 선언·첫 입력 분류·회상·재개·도움/교정 구조를 소유한다. 상태 field 대신 method를 반환한다. 기존 dispatch feedback은 계획 세션의 현재 거절 값을 사용하고, `readFeedback`은 호출 시 현재 읽기/안전 거절 값을 읽는다. 실행 actor는 현재 replay/planner를 따라간다.

방법 탐색 재관찰에서 기존 반복 횟수를 restore하며 탐색 문맥은 성공한 provider 호출에서만 비운다. Task 패턴 recall을 await한 뒤 역할을 다시 선택하고 그 패턴이 있으면 해당 제안을 실행하지 않는다. assistance의 검증/Memory 파생은 기존 함수 그대로이며 best-effort 노드 기록 실패 후에도 이미 만든 구조 이벤트를 report에 사용한다.

종료는 기존 기록 함수를 호출하는 Runtime 조율로 남겼다. `buildWorkExecutionReport`는 기존 finalization 모듈 안의 순수 결과 투영이다. 완료 claim과 결과 관찰 근거를 구분하고 Assistant의 Task 완료 정책을 대신하지 않는다. 회복 카운터나 업무 권한을 새로 정의하지 않았다.

| 항목 | 변경 전 | 변경 후 |
| --- | --- | --- |
| runWorkAgent 전체/자체 줄 | 979 / 467 | 508 / 353 |
| runWorkAgent 직접 nested 함수 / 분기 | 35 / 89 | 26 / 61 |
| finish 직접 local capture | 40 | 33 |
| planNextProposal 직접 local capture | 23 | 17 |
| acceptProposal 직접 local capture / 분기 / nesting | 29 / 42 / 4 | 20 / 31 / 3 |
| 관련 Runtime/Task/Planning/finalization 함수별 분기 합 | 473 | 470 |
| 이번 정비 AI 후보 files/functions/duplicate groups | 325 / 5139 / 101 | 327 / 5165 / 101 |

Task factory 전체 394줄/자체 97줄, Planning factory 전체 347줄/자체 75줄이다. getter/전달 함수와 private interface 및 formatter로 관련 전체 코드/함수 수는 늘었다. Runtime 줄 감소를 전체 업무 복잡성 제거로 해석하지 않는다. 분기 합 3개 감소는 run claim 이후 guard 위치와 private helper 조건 배치 차이이며 업무 검증·안전 단언을 없앤 결과가 아니다. 새 중복 hash 그룹 0, 조사 범위 relative import cycle 0이다. type-only runtime 참조를 사용하며 public 재수출 경로를 보존한다. alias/reexport/dynamic import까지 전체 그래프 무순환을 증명하는 지표는 아니다.

capture 수는 TypeScript local symbol의 직접 값 참조 기준(앞 WO와 동일)이다. nested callback/property mutation/alias 전체의 증명은 아니다. Task/Planning 생성자에 모든 raw 상태를 담는 하나의 mutable context를 만들지 않았다. Task 입력은 노드 원장/실행 상태/재개/intent로 제한하고 goal은 같은 state의 참조를 쓴다. Planning의 private 입력 타입은 사용하는 관찰/Task method만 Pick해 직접 DOM/UIA/computer dispatch나 Task 기록 method를 제공하지 않는다. 기존 실행 feedback과 좁은 종료 callback만 연결한다. `execActOnce`는 여전히 17개 local capture를 가지며 안전·행동 해석을 Runtime에 보존했다.

### 검증

- frozen lockfile/무결성 확인 설치 PASS. package.json/dependency/lockfile 변경 없음.
- `pnpm --filter '@o4o/api-server^...' run build`와 최종 `pnpm --filter @o4o/api-server run build` PASS.
- 새 연결 회귀 10개는 정비 후 코드와 정비 전 Runtime 양쪽에서 모두 PASS. 동일 node/provider/mock fixture를 사용해 await 뒤 역할 전환, 첫 입력 유지, 두 요청의 Task/node/owner/계수 격리, 마지막 질문 노드 우선·stale node 생략·Cloud 패턴 우선, optimistic claim 거부, 초기 미개시 종료, 기록 순서/실패, Discovery 일회 문맥, credential 인계/완료 근거를 비교했다. 동시 요청의 goal/history 참조 격리 단언을 강화한 최종 비교에서도 2 suites / 20 tests PASS(정비 전후 각 10개)였다. 비교용 파일은 자기 작업공간의 임시 파일이며 제거했다.
- discovery/recovery/신규 연결 focused **3 suites / 24 tests PASS**. 최종 Work Agent/단위 실행/visual/discovery/recovery/Experience/assistance/workflow/target/UIA/safety/finalization/observation/HTTP/Task 소유권·저장·완료 경계/Assistant Planning·Memory 연속성 **22 suites / 293 tests PASS**. focused 및 비교 재실행은 중복 합산하지 않는다.
- TS 8개 수정 파일 ESLint 오류 0/경고 0. source 검사 3개 파일은 새 모듈을 추가해 검사 범위만 확대했고 기존 단언은 유지했다.
- census 도구/CI 경로 분류 **34 Node tests PASS**. identifier/import/endpoint·파일 경로/raw-source 소비처 재조사 결과 기존 살아있는 소비처 87건을 확인하고 새 helper 소비처까지 확대했다.

추출 중 Task 선언의 이전 local 참조 잔여를 production type-check와 focused 회귀가 잡아 Task 세션 호출로 수정했다. 새 테스트 초기 fixture는 TASK_KEY_RE에 맞지 않아 recall을 기다리지 못했으며 기존 계약에 맞는 구조 키로 바로잡았다. 테스트 단언/상한을 낮추거나 규칙을 꺼서 통과시키지 않았다.
테스트는 command driver·Memory DB와 provider/node mock이다. 유료 AI/운영 DB/실 PC·노드/배포의 동작 검증이 아니다. UI·메뉴 변경은 없다.

### 문서 정합·남은 범위

앞 WO의 당시 기록·canonical/Freeze/index는 변경하지 않는다. Runtime 주석을 현재 계획 세션 검증·관찰 세션 단위 차단 책임에 맞췄다. Core/업무 Extension/provider 경계·Task 완료·Memory 배치/보존 기준은 기존 정본을 따른다. 앞 unmerged AI 작업은 이 branch에 포함되지만 push로 main/운영에 적용되지는 않는다.

안전 거절·실행 단위 결과를 해석하는 `execActOnce`, 큰 private observation/Task helper, 전 서비스 중복 후보, 프론트 늦은 응답 lifecycle은 남아 있다. 이번 연결된 실행 흐름 납품을 끝낸 뒤 다음 조사에서 우선순위를 정한다. 다른 서비스로 helper를 확대·공통화하거나 generic setter bag으로 바꾸지 않는다.

### Git·종료 경계

이번 구현/회귀/문서 소유 경로는 9개다. path-specific stage·scope guard·commit 후 작업 branch만 push한다. 종료 전 main `e36bcf9318`의 운영자 UI·문서 53개 경로 및 후속 `75a28d9313`의 운영자 검증 문서 2개 경로 갱신을 확인했다. 이번 소유 경로·API/의존성/lockfile 겹침 0개다. 정비 커밋 `e437b17a59` 뒤 clean 상태에서 작업 branch에 최신 main을 충돌 없이 연결했다(`b0e3f8c7b7`). `git diff --exit-code e437b17a59..HEAD -- apps/api-server package.json pnpm-lock.yaml` 차이 0으로 검증 코드·의존성의 동일성을 확인했다. 따라서 UI/문서 통합을 이유로 API 전체 회귀를 반복하지 않았다. AI 조사 모집단의 SemiFranchiseContentFormPage가 별도 작업으로 변경되어 최종 census는 **327 files / 5171 functions / 101 duplicate groups**, scoped cycle 0이다. 이번 정비 기준 5165에서 늘어난 함수 6개는 upstream UI 변경이며 새 중복 hash 그룹은 0개다. main branch 직접 변경·PR 병합·배포는 이번 요청 범위가 아니다.

WORKTREE_DISPOSITION: 전용 worktree `/workspace/o4o-wt/ai-work-agent-control-lifecycle-maintenance`, branch `wo/ai-work-agent-control-lifecycle-maintenance`, base `76941a5dae` + 앞 AI push `c4323f607a`. 작업 branch의 최신 main 연결은 완료했고 main branch 반영·배포·실 PC smoke는 미실행이다. branch-only 변경 보존 때문에 KEEP이다. 최종 원격 HEAD·미커밋 0은 push 직후 확인한다.

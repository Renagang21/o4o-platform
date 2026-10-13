# Work Agent 요청 세션·closure 정비

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13
> **근거 WO/IR**: 사용자 진행 지시 · [항목별 STATE-02](WO-O4O-AI-ITEMIZED-COMPLEXITY-MAINTENANCE-V1.md) · [앞 편집기 상태 정비](WO-O4O-AI-CONTENT-EDITOR-STATE-MAINTENANCE-V1.md)

## 범위·근거

최신 main `aa59a0962f`에서 `wo/ai-work-agent-session-maintenance` 전용 worktree를 만들고 앞 push `dae538aacd`를 연결했다. 앞 unmerged AI 정비를 포함한다. 현재 Runtime의 구조 정비이며 V1 기능 확장/성능·polling/vision/provider 최적화가 아니다. 새 Core·서비스 간 공통화·public route/API/권한/DB/프로토콜·운영 인증·결제·실 PC write·배포 없음. 종료는 push까지.
AGENTS, canonical index, [공통 소비처](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md), [자동화 §25](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md), [Assistant V2 §18](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md), [업무공간 §9](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md), [Memory 배치](../baseline/O4O-ASSISTANT-MEMORY-PLACEMENT-POLICY-V1.md), [설치](../../SETUP.md)를 확인했다. 기존 Assistant A→I, Task 완료 계약, Node/Memory 소유권을 대체하지 않는다.

## 재조사·상태 소유권

이번 단계 AI 모집단은 324 files·5131 functions·101 duplicate groups로 재수집했다. runWorkAgent는 전체 1184줄/자체 530줄/분기 89/직접 nested 함수 49개다. 파일·함수 존재는 현행 사업 기능 활성의 증거가 아니다. TypeScript local symbol binding으로 runWorkAgent 안의 직접 closure captures를 메타데이터로 비교하고, 실제 read/write와 await 뒤 소비 위치를 소스로 확인한다. nested callback 내부·별도 module·property별 alias mutation 전체의 증명은 아니다.

| 상태 묶음 | 쓰기·소비 | lifetime/경계 | 이번 처리 |
| --- | --- | --- | --- |
| goal/state/history | 계획·실행·재생·관찰·종료 | 같은 요청의 동일 object. segment/run 완료 ≠ Assistant Task 완료 | 원본 참조 보존 |
| target/device/ledger owner | resume read→node 선택→prepare→version claim | 선택/ownership 검증을 먼저 통과. 이전 노드 기억은 최신 질문 노드일 때만 | 선택/검증 코드 그대로 |
| same observation/visual mode/image/unit disabled | DOM/UIA/visual 관찰·unit 응답·복구/Discovery | 요청 안에서만. snapshot/docId/지문 최신값, unit lost/denied 후 해당 run의 단위 경로 차단 | private observation session 소유 |
| step/command budget | 단발 executor·unit report 해석·관찰 probe | live state.stepCount, 유효 관찰과 재시도 환급의 기존 차이 유지 | 원래 상한/순서 유지 |
| timing/count metrics | Planner·대기·dispatch/probe·Experience | 요청별 숫자만. 전역 공유/원문·이미지 없음 | 요청별 measurements object |
| lastRead/lastReject/lastActRecord | dispatch/replay/Planner | getter/setter로 현재값을 전달, 복사 snapshot 금지 | 기존 context/단계 interface 유지 |
| visual action failures/safety rejects | execActOnce·takeover | 관찰 횟수와 다른 의미. 자격/COMMIT/사용자 개입 즉시 인계 | 행동 해석에 유지 |
| planner/recovery/Discovery | plan/accept/recover | 현재 actor와 강한 planner 전환·무진전 카운터 reset 연결 | Runtime에 유지. 관찰 reset/restore만 위임 |
| Task declarations/assistance/recall | 사용자 도움·교정·재개·Memory | 원문/slot 값은 저장하지 않고 검증 구조만 사용 | 이번 외부 위치/보존 정책 변경 없음 |
| trajectory/stepMeta/workflow/terminal | 행동 성공·재생·최종 기록 | 기록 순서/QUESTION vs TAKEOVER/version/정직한 report 유지 | 앞 finalization/replay 기반 그대로 |

우선 묶음은 관찰+기존 명령 wrapper다. 단순 함수 이동과 달리 같은-관찰 횟수, 시각 모드·이미지, unit 차단을 factory closure가 소유하고 반환 객체는 함수만 제공한다. 큰 all-purpose mutable context를 새로 만들지 않는다. measurements도 이미지/관찰/원문을 담지 않는다.

## 구조안·TODO

`runWorkAgent`는 신원/대상/재개/노드를 검증하고 기존 순서로 run을 연다. 그 뒤 `createWorkObservationSession`을 한 번 생성한다. DOM/UIA/computer/unit은 기존 executor를 호출하며 snapshot/예산/시간/상한/retry/settle 값을 바꾸지 않는다. 관찰 세션은 Task 완료·재생·Experience persistence·권한 판정 자체를 담당하지 않는다.
초기 종료는 아직 session이 없으므로 시각 모드 false·계수 0으로 기록한다. late binding은 요청 로컬 holder만 사용한다. 이미지는 private closure에서 Planner가 필요할 때만 method로 읽고 session/계측 객체의 직렬화 field로 내놓지 않는다.

- [x] 최신 모집단·symbol/import/경로/raw-source와 상태/closure 지도 조사.
- [x] 요청별 observation session 및 numeric measurements 정비.
- [x] concurrent request 격리·live observation/budget·unit disabled/lost·이미지 미저장·초기 종료·Discovery reset/restore 검증.
- [x] 기존 실행/replay/recovery/experience/resume/node selection/HTTP/안전 회귀, source guard 범위 확대(단언 유지).
- [x] package/API build·lint·문서·전후 지표를 확인하고 소유 경로 commit/push.

## 후속 후보

Planner/Recovery routing과 Task declaration·assistance/Memory finalization capture는 아직 Runtime에서 연결된다. 해당 상태를 조사하지 않고 한 세션 객체에 모두 넣거나 generic setter context로 넘기지 않는다. 프론트 늦은 응답 lifecycle은 앞 편집기 WO의 별도 TODO이며 이번 Runtime과 합치지 않는다. 전 서비스 중복 공통화는 전체 정비 때 한다.

## 결과·문서 정합

### 전후 지표·남은 경계

| 항목 | 변경 전 | 변경 후 | 해석 |
| --- | --- | --- | --- |
| runWorkAgent 전체/자체 줄 | 1184 / 530 | 979 / 467 | 계획/교정/종료 조율은 아직 큼 |
| runWorkAgent 직접 nested 함수 | 49 | 35 | 관찰 상태 소유를 private factory로 옮김 |
| runWorkAgent 분기 수 | 89 | 89 | 업무 판단을 제거한 정비가 아님 |
| finish 직접 local capture | 45 | 40 | 숫자 계수를 요청별 값으로 묶고 session late binding을 명시 |
| planNextProposal / acceptProposal local capture | 25 / 30 | 23 / 29 | 관찰/시각 상태는 현재 session method로 읽음. 여전히 다른 세션 상태 capture가 있음 |
| Runtime+관찰 모듈 함수별 분기 합 | 473 | 475 | 시각 진입 wrapper와 초기 모드 기본값을 명시하면서 2개 추가 |
| AI 후보 files/functions/duplicate groups | 324 / 5131 / 101 | 325 / 5139 / 101 | 새 중복 hash 그룹 0. 조사 범위 상대 import cycle 0 |

관찰 factory 전체 421줄/자체 101줄/nested 함수 20개다. 내부 observe/runUnit/observeUia의 분기 수는 각각 기존 27/12/10으로 같다. formatter 때문에 helper의 개별 줄 수는 늘었고 관련 전체 모듈 줄/함수 수도 증가했다. capture 수는 local variable/parameter/destructuring binding에 대한 직접 값 참조이며 전체 alias·property read/write의 증명이나 dead-code 판정이 아니다.
계수 초기화는 요청마다 새 object를 만들고 값 복사 없이 Runtime/관찰에서 공유한다. factory 입력은 이 실행의 기존 dataSource/검증 ctx/node/target/state/measurements이며 공개 Core/shared 계약에 추가하지 않는다. callback은 snapshot을 capture하지 않고 live state/ref를 사용한다. 원본의 command→계수/관찰→기록·회복 순서를 보존했다.

### 실제 검증

- 기존 dependency 설치 `pnpm install --frozen-lockfile --verify-store-integrity=true` PASS, package.json/lockfile 변화 없음.
- `pnpm run build:packages`, `pnpm --filter '@o4o/api-server^...' run build`, `pnpm --filter @o4o/api-server run build` PASS. production TypeScript build 포함.
- Work Agent/unit dispatch/visual loop/discovery/recovery/experience/assistance/workflow/target/UIA/safety/finalization **12 suites / 130 tests PASS**.
- 신규 observation session·Planner closure·공통 HTTP·Cloud Memory continuity·Task ownership **5 suites / 103 tests PASS**. 신규 session 직접 회귀는 9개이며 두 요청의 관찰/actor/node/계수·unit 차단 격리, live budget/docId, probe 환급, UIA/시각 이미지 비직렬화와 기존 마지막 캡처 유지 동작을 검증했다.
- 마지막 source inventory/강화한 동시 요청 단언 후 observation session/windows safety/target discovery **3 suites / 26 tests PASS** (위 집합과 중복 합산하지 않음). 초기 대상 준비 실패도 factory 생성 전에 끝나는 기존 흐름을 확인했다.
- `node --test scripts/ci/__tests__/level3-precision.test.mjs`: **29 tests PASS**. 기존 delivery의 API 경로 분류 소비처도 확인.
- 수정 TS 6개 파일 ESLint **오류 0 / 경고 0**. raw-source tests에 새 helper를 포함해 검사 범위를 늘렸으며 기존 assertion을 제거·완화하지 않았다.
- identifier/import/endpoint·파일 경로/raw-source census: 기존 tracked 소비처 70건을 확인하고 새 경로도 포함한다. Runtime의 V0 주석 중 DOM 전용/저장 서비스 미반영 표현은 현재 DOM/UIA/computer·기존 coordination/finalization 위임에 맞춰 정합했다.
- 처음 새 테스트 명령의 cwd가 root로 지정되어 0개 실행 실패했다. API 디렉토리에서 다시 실행해 위 결과를 확인했다. lint의 late binding/unused type 문제도 실제 binding holder와 import 정리로 해결했으며 규칙을 꺼서 통과시키지 않았다.
- 문서 sensitive guard·상대 링크·diff check PASS. staged scope는 이번 소유 파일 7개로 확인한다.

테스트는 기존 memory DB/command driver 및 provider/node mock이다. 운영 DB/유료 AI/실제 PC·노드/캡처·배포를 실행한 증거가 아니다. 서로 다른 요청의 서버 메모리 격리를 검증했으며 실 PC 탭/창 격리나 Worker 단계 완료를 뜻하지 않는다. 기존 이미지 refresh 실패 시 이전 캡처 유지/캡처 roundTrip 계수 규칙도 보존했다. 그 정확도/계측 정책 변경은 별도 검토해야 한다.

### 문서 정합·Git

기준 문서·Freeze/index·앞 WO의 당시 기록을 바꾸지 않았다. 새 factory도 Core/업무 Extension/provider 분리를 대체하지 않는 실행 내부다. 앞 단계들의 unmerged 변경을 이 검토 branch에 포함하므로 push만으로 main/운영에 적용되지 않는다.
후속 조사 우선순위는 Planner/Recovery 전환 상태 → Task declaration/assistance/Memory 종료 capture → 포함 범위 밖 dependency/reexport/dynamic 소비처다. 원문·이미지·scope/owner를 한 mutable context에 모두 넣는 정비와 서비스 간 성급한 공통화는 하지 않는다.
이번 소유 경로만 path-specific commit/push하고 원격 HEAD 일치 및 worktree clean을 확인한다.

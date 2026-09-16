# CHECK-O4O-PHASE1-SAME-RUN-CI-AND-MIGRATION-EXPECTED-STATE-REPAIR-V1

> **WO**: `WO-O4O-PHASE1-SAME-RUN-CI-AND-MIGRATION-EXPECTED-STATE-REPAIR-V1` (사용자 채팅 전달)
> **성격**: 회귀/배포 차단 수리 — 기능 변경 0
> **작성일**: 2026-09-16
> **구현 commit**: `7dfed9a19`(수리 본체) · `851552cf6`(local-agent 테스트 기대값)
> **상태**: **CI · migration Job · API 배포 정상화 = PASS** · `/api/ai/request` 운영 NOT 404 · Composer 운영 smoke PASS · **PHASE1_REAL_SMOKE = PENDING**(Local Agent 미연결 환경)

---

## A. 재현한 root cause

origin/main `68c18634a` 기준 CI Pipeline = failure(API Server Jest 7 suites · Code Quality 47>46) · Deploy API = failure(migration Job). 실측:

1. **expected schema state 누락** — PHASE 1 `d9b11d204` 이 `1789540958496-CreateWorkRunCoordination` 을 manifest 에 넣으면서 `expected-schema-states.ts` 5번째 항목을 등록하지 않음. 운영 Job 로그: `expected schema states: 4` → `CLASSIFICATION = UNKNOWN_PARTIAL` → `post-migration schema fingerprint does not match the expected final state` exit 1. jest `[C22] EXPECTED_SCHEMA_STATES has 4 entries, expected 5` 2 suites 도 같은 원인.
   격리 PostgreSQL 15.19(docker) 에서 `migrate.ts` 로 **그대로 재현**: `LIVE_FINGERPRINT = 8b5be7bd… (5722)` · `EXPECTED = UNREGISTERED` · `MIGRATION_JOB = FAILED`.
2. **ledger 명령 spec 미반영** — PHASE 1 이 `local.data.work_run_upsert` · `work_run_set_status` 를 추가하고 `work-agent.spec` 만 갱신. `windows-automation-safety` · `windows-ui-automation` · `work-target-discovery`(드라이버 seen 배열) · `local-data-bridge`(allowlist 3→5) 실패.
3. **lint 47 > 46** — 신규 오류는 `local-agent-protocol.ts:278 no-control-regex`(PHASE 1 `sanitizeWorkRunText` 의 정규식에 raw 제어문자 3개가 소스에 박혀 git 이 바이너리로 취급). 나머지 46 은 기존 baseline 과 동일(CI 로그 diff 로 확인).
4. **부수 발견(Unified Composer c01bd80f1)** — `unified-request-router.spec › 크기 · 개수 상한` 이 CI 에서만 실패: `validateUnifiedAttachments` 가 10MB base64 에 `^[A-Za-z0-9+/]+={0,2}$` backtracking 정규식을 걸어 Linux V8 `Maximum call stack size exceeded`(Windows 로컬은 스택이 커서 통과). 운영에서 대용량 PDF 첨부 시 500 이 될 결함.

## B. expected schema 수정

- `apps/api-server/src/database/incremental/expected-schema-states.ts` append: `{ appliedThrough: 'CreateWorkRunCoordination1789540958496', fingerprint: '8b5be7bdad427bea966dedd13dd8ef86c4923e981ba6ccb2f9976a611d600f5b', fingerprintLineCount: 5722 }`.
- 산출: docker `postgres:15`(15.19) 격리 DB, fresh bootstrap + incremental 1..4(`npx tsx src/migrate.ts`, DB_* 는 격리 컨테이너).
- **운영 read-only 교차검증**(Cloud SQL Auth Proxy · pg_catalog SELECT · 트랜잭션 rollback): `typeorm_migrations` 최신 = `CreateWorkRunCoordination1789540958496` · `work_run_coordination` 테이블 존재(실패한 Job 이 migration 은 적용하고 post-assertion 에서 exit) · **live fingerprint `8b5be7bd…` 5722 = 격리 산출값**. 운영 write 0.
- 격리 DB 재실행(운영과 같은 prefix 4/4 상태): `PRE_MIGRATION_SCHEMA_ASSERTION = PASS` · `INCREMENTAL_PENDING = 0` · `MIGRATION_JOB = SUCCESS`. 새 DB end-to-end: `INCREMENTAL_EXECUTED = 4` · `POST_MIGRATION_SCHEMA_ASSERTION = PASS`.
- migration 재작성 · squash · 이력 수정 없음.

## C. ledger/test 수정

- 3개 드라이버에 `work-agent.spec` 과 동일한 `local.data.work_run_*` skip(success 응답 · seen 제외) — 관찰 loop 밖 부수 채널.
- `local-data-bridge.spec` 9 · V1-3: 기대값에 PHASE 1 이 실제 추가한 **2개만** 반영. allowlist · Safety 확장 0, generic escape hatch 0.

## D. lint 수정

- `local-agent-protocol.ts` `sanitizeWorkRunText`: 제어문자 정규식 → 코드값 필터(`code < 0x20 || code === 0x7f → ' '`). 의미 동일. 소스에서 제어문자 0.
- `unified-request-contract.ts`: 크기 상한을 형상 검사보다 먼저 + 선형 `isWellFormedBase64`(부정 문자클래스 1회 · 패딩 위치 검사). baseline 숫자 변경 없음(47→46 = 기존 baseline).

## E. CI 결과 (HEAD `7dfed9a19` 실제 run)

| commit | CI Pipeline | CodeQL | Deploy API |
|---|---|---|---|
| `7dfed9a19` | **failure** — API Server Jest ✅ · Code Quality: ESLint ratchet `46 errors (baseline 46)` ✅ · **`Run tests (o4o-local-agent node:test)` ❌** (`local-db.test.mjs` tableCount 9≠10 — PHASE 1 이 agent SQLite 에 `local_work_runs`(work_runs_v1) 를 더하고 기대값 미갱신 · A 의 4번째 누락 항목) | success | **success** |
| `851552cf6` | **success** — Code Quality Check ✅ · API Server Jest ✅ · Build Applications ✅ (https://github.com/Renagang21/o4o-platform/actions/runs/35105498536) | success | (agent 테스트만 변경 — path filter 로 미트리거, API 재배포 불필요) |

CI 로그 실측(취소된 run 이 아니라 현재 HEAD 의 run). 로컬: `node --test tools/o4o-local-agent/test/{local-db,native-bridge,browser-dom}.test.mjs` = 18/24/17 pass.

## F. API deploy revision

- Deploy API run(`7dfed9a19`) = **success**. migration Job 실행 `o4o-api-migrations-gf587` 로그: `CLASSIFICATION = LEGACY_ESTABLISHED` · `CURRENT_INCREMENTAL_PREFIX = 4 / 4` · `INCREMENTAL_PENDING = 0` · `POST_MIGRATION_SCHEMA_ASSERTION = PASS` · `MIGRATION_JOB = SUCCESS`.
- serving revision **`o4o-core-api-03682-9zv`** · traffic 100% · image tag `7dfed9a19…`(= HEAD descendant). 착수 전 `fb08c0dd1`.

## G. `/api/ai/request` production 확인

- 비인증 `POST /api/ai/request` → **401**(route present; 착수 전 404).
- 인증(sohae2100 · 쿠키 jar · UTF-8 body) API smoke:

| 케이스 | http | kind · reason | 결과 |
|---|---|---|---|
| A `UDCA가 뭐야?` | 200 | chat · no_registered_target | UDCA 설명 답변 |
| B `약학정보원에서 우루사정 동일성분 찾아줘` | **403** | `WORK_AGENT_NOT_AVAILABLE` | **work 경로로 판정**(chat 답변 없음) → 이 PC/세션에 Local Agent 미연결이라 기존 안전 경계 그대로 거절 |
| C `닥터스 반납` | 200 | confirm · ambiguous | "Doctors 프로그램에서 직접 작업을 진행할까요?" |
| D 1×1 PNG + 질문 | 200 | chat | "연두색(라임 그린)입니다" (Gemini inline) |
| E CSV + 질문 | 200 | chat | "타이레놀정(5개)" |
| F setup.exe | 400 | `ATTACHMENT_TYPE_UNSUPPORTED` | 지원 목록 문구 |
| G `네뚜레 열려 있어?` | 200 | chat · status_inquiry | 1-step 축 유지 |

## H. Composer production smoke

neture.co.kr(web `287419491`) · Playwright chromium · 로그인 = SSOT §4-3 웹 모달 검증 계정(정상 로그인 경로 · `sohae2100` 은 L2 neture 자격 unknown 이라 모달 401 이 SSOT 대로 정상):

| 항목 | 결과 |
|---|---|
| G 단일 실행 버튼 | composer 버튼 `["자료 추가","요청 실행"]` — 두 버튼으로 되돌아가지 않음 |
| F ＋ 메뉴 | `파일 첨부` / `내 PC 자료 연결(준비 중)` 표시 |
| A 일반 text | 816자 답변 렌더(`/api/ai/request` 200) |
| C 첨부 없는 기본 요청 | = A |
| D 이미지 첨부 | "단색 녹색 배경 이미지" + `참고한 첨부: dot.jpg`(1600px JPEG 재인코딩 계약) |
| E CSV 첨부 | "타이레놀정(5개)" + `참고한 첨부: stock.csv` |
| B 웹 작업 intent | `/api/ai/request` **403** → 화면 오류 문구 "이 PC 의 O4O 확장이 연결되어 있어야 합니다"(work 경로 · Local Agent 미연결) |
| 404 fallback | 발동 0 (API 가 `/request` 제공) |

콘솔 오류 = B 의 403 리소스 로그 1건뿐(기대 동작). 스크린샷 scratchpad(미커밋).

## I. PHASE 1 same-run smoke

**PENDING.** `Work Agent → QUESTION(waiting_for_user) → 같은 runId 재개 → 재관찰` 은 등재 대상(약학정보원 탭 / Doctors 창)과 **연결된 Local Agent + Chrome 확장**이 있는 PC 세션에서만 가능하다. 이 세션(headless · agent 미기동)에서는 B 가 `WORK_AGENT_NOT_AVAILABLE` 로 멈추므로 실측하지 않았고 PASS 로 쓰지 않는다. backend 계약(runId 통과 · resumable)은 `unified-request-http.spec` ②⑧ 과 `work-agent.spec` 이 고정.

## J. 남은 PENDING

| # | 항목 | 상태 |
|---|---|---|
| 1 | PHASE 1 same-run 실 production smoke | PENDING — 사용자 PC 에서 agent 기동 후 `약학정보원에서 …` → QUESTION → 답변 재요청(runId 자동 첨부) 확인 |
| 2 | Unified Composer B(Work Agent 실행) · Doctors visual fallback 실측(aiPlanCount · 시간) | PENDING — 위와 같은 환경 필요 |
| 3 | web-neture 404 fallback 제거 | 후속 정리 WO 후보(§K) — 이번 WO 미삭제 |
| 4 | 기존 lint baseline 46건 | 기존 부채 · 범위 밖 |

## K. 배포 간극 fallback (web-neture)

`unified-request.ts` 의 404 fallback 은 API 배포 후 타지 않는 분기(응답 404 일 때만). 정상 배포 상태에서 무해 — 제거하지 않음. 후속 정리 필요 여부: API 가 `/request` 를 영구 제공하므로 **차기 web-neture 정리 WO 에서 삭제 가능**(근거: 404 조건이 성립하지 않음 · 코드 20줄 · 테스트 1건). 이번 WO 에서 삭제하지 않음.

## L. 검증 명령

- `node scripts/db/check-migration-contract.mjs` → 21 pass / 0 fail
- `cd apps/api-server && npx jest <10 suites>` → 197 pass · 4 skipped(격리 PG 미설정 시) / `O4O_ISOLATED_PG_URL=<docker pg15>` 시 classifier 29/29 실 PostgreSQL
- `npx tsc --noEmit -p tsconfig.json` → EXIT 0
- `node scripts/lint-ratchet.mjs` → `46 errors (baseline 46)` exit 0

---

```text
PHASE1_CI_REPAIR = PASS (jest 7 suites · ratchet 46/46 · local-agent node:test)
MIGRATION_JOB = PASS (o4o-api-migrations-gf587 SUCCESS · PENDING 0 · ASSERTION PASS)
API_DEPLOY = PASS (o4o-core-api-03682-9zv · image 7dfed9a19 · 100%)
UNIFIED_REQUEST_PRODUCTION = PASS (NOT 404 — 비인증 401 · 인증 A/C/D/E/F/G 200/400 기대값)
COMPOSER_PRODUCTION_SMOKE = PASS (A·C·D·E·F·G · 단일 버튼 · ＋ 메뉴 / B = work 경로 403 안전 거절)
SAME_RUN_PRODUCTION_SMOKE = PENDING (Local Agent 연결 환경 필요)
NEXT_STEP = 사용자 PC 에서 agent 기동 → same-run smoke → PHASE 2 Workflow Candidate / deterministic replay
```

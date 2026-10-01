# CHECK-O4O-CICD-UNIFIED-DELIVERY-PIPELINE-V1

> **WO**: WO-O4O-CICD-UNIFIED-DELIVERY-PIPELINE-V1
> **선행**: [CHECK-O4O-CICD-PUSH-TO-PRODUCTION-FLOW-REDESIGN-AUDIT-V1](../investigations/CHECK-O4O-CICD-PUSH-TO-PRODUCTION-FLOW-REDESIGN-AUDIT-V1.md)
> **구현 commit**: `066dde821` · `b70f9ac0b`(commit status 재시도) (2026-10-01)
> **상태**: P0 · P1 · P2 · P4 구현 + 실측 · **P3 cutover = NOT_EXECUTED (§17 STOP — 사용자 승인 대기)**

---

## 0. 최종 판정

| 항목 | 판정 | 근거 |
|---|---|---|
| P0_VISIBILITY | **PASS** | §5 — deploy-auto run 이름 = target SHA · commit status `production` 실측 |
| P1_UNIFIED_ORCHESTRATOR | **PASS** | §6 — `delivery.yml` SHADOW 실가동 (main CI → classify) |
| P2_REUSABLE_DEPLOY | **PASS** | §7 — 배선 검증 2회(API→의존 web→admin · 병렬 web) 모두 success, dry_run 으로 build/deploy 0 |
| AUTO_TAG_REMOVED | **PASS** (Delivery 경로) | `delivery.yml` 태그 생성 0 — 정적 검사 + 실행. deploy-auto 는 cutover 때 비활성 |
| AUTO_DISPATCH_REMOVED | **PASS** (Delivery 경로) | `workflow_call` 만. `/dispatches` 호출 0 |
| TARGET_SHA_IDENTITY | **PASS** | §4 — target == github.sha == main HEAD 아니면 SUPERSEDED |
| LEVEL1_FLOW | **PASS** | fixture + 실측(docs commit → NO_DEPLOY) |
| LEVEL2_FLOW | **READY** | 판정 · 계획 · reusable 호출 검증 완료. 실제 production 배포는 cutover + DEPLOY_FREEZE 해제 후 |
| LEVEL3_HOLD | **PASS** | fixture(auth · migration · RBAC) + 실 serving 판정(§9) |
| ROLLOUT_PENDING | **PASS** | `HELD_ROLLOUT_PENDING` 표시 · promote 로 해소 |
| API_FRONTEND_DEPENDENCY | **PASS** | §10 — 독립이 증명될 때만 분리 배포, 나머지 fail-closed |
| DEPLOY_FREEZE | **PASS** | 모든 진입점 fail-closed 유지 · 이 WO 는 값을 바꾸지 않음(현재 `true`) |
| CI_PRODUCTION_BUILD_COVERAGE | **PARTIAL** | §13 — vite production build 은 CI 에서 검증(9개 205초 · 병렬) · Docker 이미지 빌드는 배포 시점 |
| LEVEL3_FALSE_NEGATIVE | **0** | §15 — 300 commit × (단일 · 10-commit 누적) |
| DEPLOY_AUTO_RETIRED | **NO** | cutover 미실행 — §17 |
| PRODUCTION_CHANGE | **0** | DEPLOY_FREEZE=true · Delivery SHADOW · 배선 검증은 dry_run |
| UNIFIED_DELIVERY_CUTOVER | **NOT_EXECUTED** | §17 승인 대기 |

---

## 1. Before / After

### Before (cutover 이후 ~ 이 WO 전)

```text
push main → CI Pipeline ─ workflow_run ─▶ Deploy Auto (run 목록엔 main 최신 commit 으로 표시)
                                              ├ POST git/refs  deploy/auto-<sha12>
                                              ├ POST dispatches deploy-api.yml (ref=태그) → 폴링(최대 45분)
                                              └ POST dispatches deploy-web-services.yml × 서비스 · deploy-admin.yml
LEVEL_3 / 첫 rollout: 사람이 태그 생성 → API dispatch → 대기 → 서비스마다 web dispatch → serving 확인 (6~10 조작)
결과: Job Summary 에만 (commit 에는 없음)
```

### After (cutover 후 목표 — 현재 SHADOW 로 병행 가동)

```text
push main → CI Pipeline ─ workflow_run ─▶ Delivery <target SHA>        ← run 1개 = commit 1개
                                            classify  (CI · freeze · identity · serving→target · LEVEL · 의존)
                                            ├ API             uses deploy-api.yml          (workflow_call)
                                            ├ Web (after API) uses deploy-web-services.yml  matrix · API 성공 뒤
                                            ├ Web             uses deploy-web-services.yml  matrix · 병렬(독립)
                                            ├ Admin           uses deploy-admin.yml
                                            └ Report          serving SHA 재조회 → DEPLOYED/FAILED → commit status
LEVEL_3 / 첫 rollout: commit status 에 적힌 명령 1줄
                      gh workflow run promote.yml -f sha=<40자>  → 같은 Delivery 경로 (mode=promote)
```

사람의 일상 조작: **push 뿐**. L3 일 때만 **promote 1회**.

---

## 2. Workflow 변경

| 파일 | 변경 |
|---|---|
| `.github/workflows/delivery.yml` | **신규** — Unified Delivery (workflow_run · workflow_call(promote) · workflow_dispatch(판정 재현 · 배선 검증)) |
| `.github/workflows/promote.yml` | **신규** — 승인 1회 진입점 (`sha` 필수 · `services` · `dry_run` 선택) |
| `deploy-api.yml` · `deploy-web-services.yml` · `deploy-admin.yml` | `workflow_call` 진입점 추가 · `github.event.inputs.*` → `inputs.*` · web 서비스 지정 = 입력 유무 · `dry_run` 이면 ci-gate 닫힘. **build · migration · deploy · verified rollout step 은 한 줄도 바꾸지 않음** |
| `deploy-auto.yml` | P0 — `run-name` = target SHA · `statuses: write` · commit status 기록. 배포 동작 불변 |
| `ci-pipeline.yml` | P4 — `Web production build (affected)` job · detect 출력 `web_build_dirs` |
| `scripts/ci/deploy-orchestrate.mjs` | plan-only · promote · 의존 정밀화 · L3 누적 표시 · commit status · report · wiring |
| `scripts/ci/deploy-risk.mjs` | `delivery.yml` · `promote.yml` = CONTROL_ONLY (판정/오케스트레이션) |
| `scripts/ci/detect-affected.mjs` | `web_build_dirs` 출력 추가 (판정 불변) |

`github.event.inputs` → `inputs` 이유: `workflow_call` 에서 `github.event` 는 **호출자의 이벤트**(workflow_run · promote 의 workflow_dispatch)다. 그대로 두면 `rollout_mode` 가 null 이 되어 verified 가 아닌 legacy 경로로 빠진다. `inputs` 는 dispatch · call 양쪽에서 해당 workflow 의 입력이다(dispatch 에서는 종전과 같은 값).

---

## 3. 자동 경로의 태그 · dispatch

- `delivery.yml` 에 `git tag` · `refs/tags` · `deploy/auto` · `/dispatches` · `gh workflow run` · `gcloud run deploy` · `update-traffic` 0 — `deploy-workflow-gates.test.mjs` 가 고정한다.
- 기존 `deploy/auto-*` 태그: 재확인 **0개** (`git ls-remote --tags origin 'deploy/auto-*'`). 정리할 것 없음.
- 사람의 `deploy/<날짜>-*` 태그: 삭제하지 않는다(이력). 신규 통제 배포는 `promote.yml` 로 대체되고, 태그 dispatch 는 break-glass 로만 남는다(`migrate_only` 는 태그 ref 전용 그대로).
- `deploy-auto.yml` 은 cutover 전까지 태그 + dispatch 경로를 유지한다(권한 경로이므로 이 WO 에서 바꾸지 않음).

---

## 4. TARGET_SHA 처리

- 자동: `TARGET_SHA = github.event.workflow_run.head_sha` (CI 가 끝난 정확한 commit). checkout 도 이 SHA.
- 판정기에 `--workflow-sha $GITHUB_SHA` 를 넘긴다. **target == github.sha == main HEAD(GitHub API) · ref == refs/heads/main** 이 아니면 전 서비스 `SUPERSEDED_BY_NEWER_MAIN`.
  - 이유: `workflow_run` · promote(dispatch) run 의 `github.sha` 는 **main 최신 commit** 이고, reusable deploy workflow 의 정의와 그 안의 `github.sha`(이미지 태그 · `o4o-commit-sha` label · `--tag=sha-*`)가 이것을 쓴다. 셋이 같을 때만 "배포되는 코드 = 배포 절차 = target" 이 보장되고, 그래서 **검증된 deploy step 을 고치지 않고** reusable 로 쓸 수 있다.
- 진행 중 main 에 새 commit 이 생겨도 이 run 은 target 을 따라가지 않는다(입력으로 고정). 새 commit 은 자기 Delivery 에서 누적 diff 로 처리.
- feature / PR branch: `workflow_run.branches: [main]` + `workflow_run.event == 'push'` → Production candidate 아님. PR merge 와 direct push 는 모두 "main 새 commit" 으로 같다.

---

## 5. P0 — run 이름 · commit status

- `Delivery <40자 SHA>` · `Promote <SHA>` · `Deploy Auto <SHA>` — 목록에서 판정 대상 commit 이 그대로 보인다(종전: workflow_run run 이 main 최신 commit 으로 표시).
- commit status context `production` (Statuses API · 새 dashboard 없음). 상태 체계:

| 상태 | GitHub state | 의미 · 사람 행동 |
|---|---|---|
| NO_DEPLOY | success | 끝 |
| DEPLOYING → DEPLOYED | pending → success | 끝 |
| HELD_LEVEL_3 | pending | description 끝의 `gh workflow run promote.yml -f sha=…` 1회 |
| HELD_ROLLOUT_PENDING | pending | 같음 |
| HELD_DEPENDENCY | pending | API 처리되면 자동 |
| BLOCKED_FREEZE | pending | 비상 정지 중 |
| BLOCKED_CI | failure | CI 수정 |
| SUPERSEDED | success | 새 commit 이 누적 처리 |
| FAILED | failure | 조사 (rollback 은 deploy job 이 자동) |

- 실측:
  - `066dde821`: Deploy Auto(36872673189) 판정은 정상이었으나 status POST 가 `fetch failed`(판정 ~1분 뒤 idle keep-alive 소켓 재사용 — 같은 날 ensureTag 에서 본 것과 같은 원인)로 **미기록**, 경고만 남김(배포 판정 무영향).
  - 수정 `b70f9ac0b`: status POST 는 멱등(같은 context 덮어쓰기)이라 GET 과 같은 3회 재시도 허용 · dispatch POST 는 종전대로 재시도 0 · 시험 1건 추가.
  - `b70f9ac0b`: **`production | pending | BLOCKED_FREEZE`**, target_url = Deploy Auto run 36874585542 — commit 화면에서 결과 1줄 확인.

---

## 6. P1 — delivery.yml (SHADOW)

- `DELIVERY_ENFORCE: 'false'` → classify 가 판정 · Job Summary · 판정 JSON(artifact 30일)만 남기고 `execute=false` → 배포 job · report 0, commit status 기록 0(권한 경로 deploy-auto 와 중복 방지).
- concurrency: 자동 = `delivery-production`(진행 중 run 은 끝까지, 대기 run 은 더 새 것으로 대체) · promote/수동 = run 별 group (자동 대기열을 밀어내지 않음) · promote.yml 자체 = `promote-production`.
- 실측: `066dde821` push → CI Pipeline success → workflow_run → **`Delivery 066dde821…`(run 36872673523) success** · 같은 시각 `Deploy Auto 066dde821…`(36872673189) success. Delivery summary: `CI green true · DEPLOY_FREEZE true → frozen · target==main HEAD true (main HEAD 066dde821 · workflow 066dde821 · ref refs/heads/main)` · 상태 `BLOCKED_FREEZE` · plan 0 · 배포 job 실행 0.
- 로컬 판정 재현(같은 코드, `--freeze false --dry-run true`, GitHub · gcloud read-only, target `f2acde173`): API `BLOCKED_BY_PENDING_LEVEL3 since 69233c347 — LEVEL_3 (db-migration …expected-schema-states.ts)` · admin · k-cosmetics · kpa-society · pharmacy-hub · lecture · store · kpa-branch `BLOCKED_BY_PENDING_LEVEL3 since 138657460 — LEVEL_3 (auth-package packages/auth-client/src/client.ts)` · neture · signage-player · hospital-pharmacy NO_DEPLOY · commit status `HELD_LEVEL_3 · held: api(L3),admin(L3),… · gh workflow run promote.yml -f sha=f2acde17…`.

---

## 7. P2 — workflow_call 구조 · 배선 검증

```text
delivery.yml
  classify ──┬─ deploy-api            uses deploy-api.yml           with rollout_mode=verified, dry_run
             ├─ deploy-web-after-api  uses deploy-web-services.yml  matrix(service) · needs deploy-api success
             ├─ deploy-web-parallel   uses deploy-web-services.yml  matrix(service)
             ├─ deploy-admin          uses deploy-admin.yml         (after api | parallel)
             └─ report
promote.yml → uses delivery.yml (mode=promote)   [중첩 3단: promote → delivery → deploy-*]
secrets: inherit · permissions: contents read · actions read · statuses write · id-token write
```

배선 검증 (`gh workflow run delivery.yml -f target_sha=066dde821… -f wiring_services=…`, reusable 을 `dry_run: 'true'` 로 호출 → 호출된 workflow 는 freeze-notice · detect 까지만, ci-gate 닫힘 → build · migration · deploy 0):

| run | 입력 | 결과 |
|---|---|---|
| `36871257468` | `api,neture,admin` | **success** — `API /` freeze-notice · detect ✅ · ci-gate · build-and-deploy skipped / `Web (after API) (neture) /` detect-changes · summary ✅ · 9 deploy job skipped / `Admin /` detect ✅ · deploy skipped / Report skipped |
| `36871265515` | `store` | **success** — `Web (store) /` 병렬 경로 · deploy skipped / API · Web(after API) · Admin skipped |

→ reusable 호출 · 입력 전달 · secrets · permissions · 중첩 job 표시 · after-api 순서 · 병렬 경로 모두 실제 GitHub 에서 확인. 한 commit 의 배포가 **root run 1개 아래 job 들**로 보인다.

---

## 8. LEVEL 1 · 2 · 3 흐름

| | 조건 | Delivery | commit status |
|---|---|---|---|
| L1 | runtime 무영향 | NO_DEPLOY · run 종료 | NO_DEPLOY |
| L2 | CI green · DEPLOY_FREEZE=false · L2 · rollout_pending 아님 | 자동 verified 배포 (API → 의존 프런트 / 독립 프런트 병렬) → report | DEPLOYING → DEPLOYED / FAILED |
| L3 | L3 규칙 · serving 불명 | HOLD — `AUTO_DEPLOY_BLOCKED` | HELD_LEVEL_3 + promote 명령 |
| 누적 L3 | target 은 L2 지만 serving→target 에 이전 L3 | HOLD — 사유 `BLOCKED_BY_PENDING_LEVEL3 since <sha>` | HELD_LEVEL_3 |
| 첫 rollout | rollout 방식 변경 뒤 | `CONTROLLED_FIRST_ROLLOUT_REQUIRED` | HELD_ROLLOUT_PENDING |

Summary 1개에 표시: commit · CI 결론 · DEPLOY_FREEZE · identity(HEAD · workflow SHA · ref) · 서비스별 serving SHA(source) · status · level · decision · state · 사유(L3 규칙 · 파일 · 누적 원인 commit) · 실행 계획 · API 의존 판정 · (report) 배포 후 serving SHA · revision.

---

## 9. promote 준비 (§13 · §14)

```bash
gh workflow run promote.yml -f sha=<40자 SHA>            # 승인 1회
gh workflow run promote.yml -f sha=<SHA> -f dry_run=true  # 판정만
gh workflow run promote.yml -f sha=<SHA> -f services=api  # 범위 좁히기 (선택)
```

사람이 다시 입력하지 않는 것: 서비스 목록 · 태그 · rollout mode · serving SHA · migration 여부 — SHA 에서 다시 계산(migration 은 deploy-api 의 migration Job 이 배포 전에 실행 · 종전 그대로).

안전 조건: CI green · DEPLOY_FREEZE=false · **SHA == main HEAD == workflow SHA** · serving 불명(UNKNOWN) 서비스 거절 · `services` 로 API 를 빼면 의존 프런트 보류.

**"HEAD only" 검토 결과 (§14) — 유지한다.**
- 우려: L3 commit A 뒤에 L1/L2 commit 이 쌓이면 승인이 불가능해지는가 → **아니다.** 승인 대상은 HEAD 이고 serving → HEAD 누적 범위(A 포함)가 그대로 승격된다. promote dry-run / Delivery summary 가 범위 안의 모든 L3 사유와 원인 commit 을 보여준다.
- 불가능해지는 유일한 경우: "A 만 승격하고 그 뒤의 미검토 L3 D 는 빼고 싶다". 이것은 break-glass(태그 + 수동 dispatch)로 남긴다.
- HEAD only 가 주는 것: ① 승인 범위 = serving → SHA 가 실행 시점에 정확히 고정되고 HEAD 가 움직이면 거절 → 보지 않은 commit 이 승인에 섞이지 않는다 ② reusable deploy workflow 정의와 `github.sha` 가 target 과 같아 배포 step 을 다시 쓰지 않아도 된다(§4). 오래된 SHA 승격을 허용하려면 deploy step 전반의 `github.sha` 를 입력 SHA 로 바꿔야 하고, 그것은 검증된 배포 로직 재작성이다(WO §9 금지 방향).
- 실측: `gh workflow run promote.yml -f sha=b70f9ac0b… -f dry_run=true` → run 36874627238 **`Promote b70f9ac0b1784870332d9af9a1fa92ea1342dbee (dry-run)` success**. 중첩 job `Promote / Classify` success · API/Web/Admin/Report skipped. Summary: `CI green true · DEPLOY_FREEZE true → frozen · target==main HEAD true (main HEAD b70f9ac0b · workflow b70f9ac0b · ref refs/heads/main)` → 전 서비스 BLOCKED_FREEZE 또는 NO_DEPLOY, plan 0. promote → delivery(workflow_call) → classify 경로와 identity 검사가 실제로 동작함을 확인. 실제 승격은 freeze 해제 + cutover 승인 뒤.

---

## 10. API / Frontend 의존 (§17)

규칙 (`computeApiDependency` — Delivery · promote 에만 적용, deploy-auto 는 cutover 전까지 종전 규칙):

```text
API 가 배포 대상인데 이번에 배포되지 않음(L3 · 첫 rollout · 실패) → 프런트 X 보류 여부
  A = API 의 serving→target first-parent commit 중 API 를 바꾼 commit (commit 단위 assessRisk)
  B = X 의 serving→target commit 중 X 를 바꾼 commit
  의존(HOLD): A∩B ≠ ∅ (같은 commit — 공유 계약 package 변경 포함)
            | A 또는 B 에 WO 키 없는 commit | A·B 의 WO 키 교집합 | A 또는 B 를 특정 불가(누적 효과) | git · serving 판정 실패
  그 외 → 독립 → X 는 자체 LEVEL 대로 (L2 면 자동 배포, 병렬)
API 를 배포할 때: 의존 프런트 = API 성공 뒤(needs) · 독립 프런트 = 병렬
```

- WO 키 보유율(최근 400 first-parent commit): **293/400 (73%)** — 키 없는 commit 은 항상 의존(보수).
- 실 serving 판정(2026-10-01, `f2acde173`): API 는 #262 migration 으로 L3, 프런트 7개의 변경(#257 의 auth-client)은 API 쪽 #257 이 **이미 serving** 이라 API 미배포분(#262)과 무관 → `독립`. 프런트 자체가 L3 라 HOLD 는 유지(의존 때문이 아니라 자기 L3 때문).
- fixture: 같은 WO → HOLD · 다른 WO → 독립 배포 · 같은 commit → HOLD · 키 없음 → HOLD · git 실패 · serving 불명 → HOLD · `@o4o/types` 변경 → 전부 HOLD.

## 11. Shared package 의존

새 엔진을 만들지 않았다. 서비스 영향은 기존 `detect-affected.mjs` 의 workspace dependency **transitive closure** 와 lockfile importer 정밀 비교 그대로이고(package allowlist 0), 의존 판정은 그 결과를 commit 단위로 다시 쓴다. global fallback 은 루트 manifest · `.dockerignore` 등 실제 빌드 입력뿐이며 `.github/` · `scripts/` 는 배포 축에서 중립(CI 축만 global). 감사 문서 §9-3 의 소비 표(auth-client 9 · auth-react 8 · types 8 · ui 6)는 이 graph 에서 나온다.

## 12. rollout_pending · DEPLOY_FREEZE

- rollout_pending: 판정 규칙 불변(serving→target 에 rollout 방식 파일 = 다음 배포 1회 통제). 상태명 `HELD_ROLLOUT_PENDING`, 해소 경로 = promote.
- **이 WO 의 commit 자체가 다음 배포를 통제로 만든다**(정상): `deploy-workflow-diff` 분석 결과 web 9 · admin = `rollout`(배포 불필요 · 다음 배포 1회 통제), API = `config`(shell 의 `migrate_only` 분기 줄이 `inputs.*` 로 바뀌어 config 로 분류 → L3 · 배포 대상). 분석기를 고치지 않았다 — 보수 방향이며, 결과적으로 **새 경로의 첫 API 배포는 promote(통제)** 로 이루어진다.
- DEPLOY_FREEZE: 모든 진입점(Delivery classify · promote · reusable deploy job 의 `if`) fail-closed 유지. 현재 값 `true`(2026-10-01 12:49Z 갱신 — 이 WO 가 설정한 것이 아님) 그대로. 구현 · 검증 전부 freeze 상태에서 수행.

## 13. P4 — Production build coverage

- 갭: Web 9개의 production 산출물은 Dockerfile 의 `npx vite build` 에서만 만들어졌고 CI 는 tsc 까지만 봤다 → vite build 실패가 배포 job 에서 처음 드러날 수 있었다.
- 조치: CI Pipeline 에 `Web production build (affected)` job. 대상 = detector 의 **Web 배포 영향 축 그대로**(`web_build_dirs`), 명령 = Dockerfile 과 같은 `npx vite build`(산출물은 버림). dependency closure 는 `pnpm --filter "<svc>^..." run build`.
- 실측 (push CI `066dde821`, deploy-web-services.yml 변경으로 9개 전부 대상): job **205초 success**, vite build 2.9~16.6초/서비스. 같은 run 의 Code Quality Check 638초 · API Jest 최대 501초 옆에서 병렬 → **critical path 증가 0**.
- 판정 **PARTIAL**: vite production build 실패는 이제 CI 에서 잡힌다. Docker 이미지 빌드 자체(Dockerfile 의 package 목록 · COPY · base image)는 여전히 배포 시점에만 실행된다 — build once / 이미지 digest 승격은 WO-O4O-CICD-ARTIFACT-PROMOTION-V1.

## 14. 테스트

| 묶음 | 결과 |
|---|---|
| `scripts/ci/__tests__/*.test.mjs` (CI blocking) | **281 / 281** — 신규: 배선 계약 17 · Unified Delivery 판정 28 (fixture §31 13종 포함) · status 재시도 1 |
| api-server workflow 계약 spec (deploy-api-migrate-only-path 등 10개) | **191 / 191** — migrate-only 평가기에 `inputs.*` · workflow_call 사례 추가 |
| api-server workflow 를 읽는 나머지 spec 7개 | 101 / 103 — 실패 2건 = `main-site-full-source-deletion.spec.ts` · **로컬 잔여 `apps/main-site/{dist,node_modules}`**(미추적 · 9/10 생성) 때문. 이번 변경 무관 · CI 환경에는 없음 · junction 위험으로 삭제하지 않고 보고만 |
| workflow YAML · 호출 배선 정적 검사 | 7 파일 파싱 · reusable 호출 5곳 입력/필수/secrets 일치 |
| push CI (`066dde821`) | **success** — Code Quality 638s · API Jest 3 shard · Admin build · **Web production build (affected) 205s** |
| push CI (`b70f9ac0b`, status 재시도 수정) | **success** · 뒤이어 Deploy Auto · Delivery(SHADOW, 36874586075) success · commit status 기록 |

## 15. Historical replay (§32)

`origin/main` first-parent 300 commit (`cc287d3ee` … `f2acde173`), old = deploy-auto 결정(`decideAll`, 의존 판정 없음) · new = Delivery 결정(의존 판정 적용):

| 모드 | 창 | L3 서비스 | **L3 false negative** | 결정 차이 | 기대 밖 차이 | 의존/독립 판정 |
|---|---|---|---|---|---|---|
| 단일 commit | 300 | 160 | **0** | 0 | 0 | 의존 164 · 독립 53 |
| 10-commit 누적 창 (release train 모사, `75058fc0c` …) | 300 | 1,192 | **0** | 20 | **0** | 의존 1,379 · 독립 78 |

- 차이 20건은 전부 `HELD_API_NOT_DEPLOYED → AUTO_DEPLOY` 이고 해당 서비스의 의존 판정이 `독립`(예: base `082f5887f` → head `58f655218` 의 neture · hospital-pharmacy — API 변경 commit 과 공유 commit · 작업 키 없음). 배포 결정 수 old 122 → new 142.
- 위험 판정(`deploy-risk.mjs` LEVEL 규칙)은 이 WO 에서 바뀌지 않았다(CONTROL_ONLY 에 신규 파일 2개 추가 — 과거 이력에 없는 경로). 따라서 LEVEL 의미 변화 0, 결정 변화는 의존 정밀화뿐이다.
- 재현: scratchpad `replay.mjs <N> <window>` (판정 전용 · git read-only).

## 16. Run 수 변화

| | Before (L2 · API+web 1개) | After |
|---|---|---|
| commit 당 Actions 화면 | CI · CodeQL · Deploy Auto(최대 3회, 다른 commit 판정이 섞여 보임) · Deploy API · Deploy Web × N | CI · CodeQL · **Delivery 1개**(내부 job 으로 API · Web · Admin · Report) |
| GitHub REST 경계 | workflow_run · 태그 · dispatch × N · run 폴링 | workflow_run 1 |
| CI 결과 재조회 | 3회 | classify 1회 + reusable ci-gate(같은 SHA · 즉시 green) |
| L3 사람 조작 | 6~10 | promote 1 |

## 17. Cutover — STOP (승인 요청)

| 항목 | 내용 |
|---|---|
| 기존 자동 경로 | `deploy-auto.yml` (workflow_run → 태그 → dispatch). 현재 권한 경로 |
| 신규 자동 경로 | `delivery.yml` (workflow_run → classify → workflow_call). 현재 SHADOW |
| cutover 변경 | **한 commit 에서** `delivery.yml` `DELIVERY_ENFORCE: 'true'` + `deploy-auto.yml` 의 trigger 를 `workflow_dispatch` 만 남기고 job `if: false`(또는 `gh workflow disable deploy-auto.yml`) |
| 중복 실행 방지 | ① 같은 commit 에서 전환 — 두 경로가 동시에 enforcement 인 순간이 없다 ② reusable deploy workflow 의 서비스별 concurrency(`deploy-api-production` · `deploy-web-<svc>` · `deploy-admin-production`)는 dispatch · call 공통이라 혹시 겹쳐도 rollout 은 서비스당 1개 ③ 판정은 serving SHA 기준 — 이미 반영된 서비스는 NO_DEPLOY |
| rollback | `DELIVERY_ENFORCE: 'false'` + deploy-auto 재활성 (한 commit · 또는 `gh workflow enable deploy-auto.yml`). 배포된 revision 은 각 verified rollout 의 자동 rollback 대상 |
| DEPLOY_FREEZE 현재값 | **`true`** — cutover 자체는 freeze 중에도 안전(배포 0). 실제 첫 자동 배포는 freeze 해제 후 |
| cutover 직후 예상 상태 | 이 WO commit 영향으로 API = L3(config) · web/admin = rollout_pending, 그 외 기존 L3 누적(#257 auth-client · #262 migration) → **전 서비스 HOLD** → 첫 배포는 `promote` 1회(통제)로 새 경로 실증 |

**PASS 조건(§34) 상태**: TARGET_SHA identity ✅ · CI handoff ✅(`066dde821` · `b70f9ac0b` 두 번 — CI 완료 → Delivery 자동 기동 · 실제 target SHA 이름) · risk ✅ · affected services ✅ · dependency ✅ · freeze ✅ · rollout_pending ✅ · verified reusable deploy ✅(배선 · 실 배포 step 은 불변) · duplicate execution prevention ✅(설계 · §17).

## 18. Production 변경

**0.** DEPLOY_FREEZE 변경 0 · traffic 변경 0 · DB write 0 · deploy-auto 비활성 0 · 배선 검증은 dry_run(ci-gate 닫힘) · promote 검증은 dry_run.

## 19. 남은 것 · 다음

1. **cutover 승인** (§17) → 같은 commit 전환 → 첫 promote 실측.
2. WO-O4O-CICD-LEVEL3-RULE-PRECISION-REVIEW-V1 — 현재 누적 L3(#257 auth-client → 7개 프런트 · #262 migration → API) 해소는 promote 1회로 가능하지만, 재발 빈도는 규칙 정밀도 문제.
3. WO-O4O-CICD-ARTIFACT-PROMOTION-V1 — P4 job 의 vite 산출물 / 이미지 digest 승격.
4. 범위 밖 발견: 로컬 `apps/main-site/{dist,node_modules}` 잔여(이 PC) — junction 확인 후 정리 필요(사용자 판단).

## 20. 문서 정합

- `.github/workflows/README.md` 배포 절 — delivery · promote · cutover 상태 반영(이 commit).
- 선행 CHECK 기록물은 수정하지 않음.

`문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건`

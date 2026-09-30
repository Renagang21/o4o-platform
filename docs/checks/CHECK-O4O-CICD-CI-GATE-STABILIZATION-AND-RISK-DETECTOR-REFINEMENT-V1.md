# CHECK-O4O-CICD-CI-GATE-STABILIZATION-AND-RISK-DETECTOR-REFINEMENT-V1

> **WO**: WO-O4O-CICD-CI-GATE-STABILIZATION-AND-RISK-DETECTOR-REFINEMENT-V1
> **기준**: `origin/main` = `201c066fb` (2026-09-30) · 선행 [SAFE-AUTODEPLOY](CHECK-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1.md) · [CONTROLLED-RELEASE](CHECK-O4O-PRODUCTION-PENDING-DELTA-CENSUS-AND-CONTROLLED-RELEASE-V1.md) · [조사](../investigations/CHECK-O4O-CICD-PRODUCTION-DEPLOY-CENSUS-AND-SIMPLIFICATION-V1.md)
> **Production 변경**: 0 (배포 · traffic · DB write · `DEPLOY_ENABLED` · secret 변경 없음 — GitHub · Cloud Run 은 read-only 조회만)

---

## 0. 최종 판정

```text
IMPLEMENTATION                  = PASS
CI_MISSING_RETRY                = PASS   (단위 19/19 · 실 GitHub read-only 2건)
CI_FAIL_CLOSED                  = PASS   (재조회 창 종료 후 *_AFTER_RETRY 로 차단 · 확정 실패는 즉시 차단)
WORKFLOW_ATTRIBUTION            = PASS   (control / build / config / rollout — job · 줄 · flag 단위)
BUILD_ARG_ATTRIBUTION           = PASS   (env → build-arg → 서비스 귀속 + ARG 소비 판정. k-cosmetics/kpa-society 실측 사례 자동 판정)
RISK_REDUCING_DELETE_HANDLING   = PASS   (DB write 진입점 삭제만 · 대체 추가 시 downgrade 안 함)
LEVEL3_FALSE_NEGATIVE           = 0      (300 commit 재현 — 하향 8건 전부 workflow control/빌드 환경 · runtime 고위험 규칙 손실 0 · 숨은 미탐 1건 추가 발견 · 보정)
SHADOW_MODE                     = READY  (enforcement 연결 없음)
PRODUCTION_CHANGE               = 0
AUTODEPLOY_CUTOVER              = NOT_EXECUTED
DEPLOY_FREEZE_CUTOVER           = NOT_EXECUTED
CUTOVER_READINESS               = READY  (조건 §8 — 첫 LEVEL_2 자동 배포는 rollout_pending 서비스에서 1회 통제)
```

---

## 1. 변경 파일

| 파일 | 내용 |
|---|---|
| `scripts/ci/ci-gate.mjs` | MISSING · UNAVAILABLE 을 재조회 상태로 분리, `pollCiGate`(시계 · sleep · 조회 주입), `--missing-wait-seconds` · `--interval-seconds`, `CI_GATE_WAIT` 로그, `*_AFTER_RETRY` 사유 |
| `scripts/ci/deploy-workflow-diff.mjs` | **신규** — deploy workflow 변경의 job/줄/flag 단위 의미 분류 · build-arg 귀속 |
| `scripts/ci/deploy-risk.mjs` | `deploy-pipeline` 규칙 분해(→ `deploy-infra` L3 · `ROLLOUT_MECHANISM` · `CONTROL_ONLY`), workflow 분석 연결, `risk_reducing` 삭제 처리, `session` 인증 규칙, git 공급자 `readFile` · `consumesAt` |
| `scripts/ci/__tests__/ci-gate.test.mjs` | 재작성 19건 (§18 시나리오 전부) |
| `scripts/ci/__tests__/deploy-workflow-diff.test.mjs` | **신규** 20건 (W1–W9 분류 · 통합 · 삭제 D1–D4) |
| `scripts/ci/__tests__/deploy-risk.test.mjs` | R8b 의미 변경 · R8c · R8d · R6e 추가 |
| `.github/workflows/ci-pipeline.yml` | 새 테스트 파일을 기존 node:test step 에 추가 |
| `.github/workflows/cd-risk-gate-shadow.yml` | shadow 의 CI 조회에 MISSING 재조회 120s (기록 정확도) |

deploy workflow 3종(`deploy-api/web-services/admin.yml`)은 **수정하지 않았다** — 이미 `--wait-seconds 1800` 을 넘기므로 MISSING 창은 기본값 `min(1800, 300)=300s` 가 적용된다.

---

## 2. CI gate — MISSING retry

| 상태 | 동작 |
|---|---|
| `completed/success` | GREEN |
| `completed/failure · cancelled · timed_out · action_required` 등 | **즉시 BLOCKED** (재조회 없음) |
| target 형식 오류 | 즉시 BLOCKED |
| `queued · in_progress · waiting · requested · pending` (GitHub `workflow_run.status` 값 그대로) | PENDING → `--wait-seconds`(deploy 1800s) 안에서 재조회 |
| run 0건 · 다른 SHA 의 run 만 존재 | MISSING → `--missing-wait-seconds`(기본 min(wait, 300)s) 안에서 재조회 |
| GitHub API 5xx · 네트워크 | UNAVAILABLE → MISSING 과 같은 창 |
| 창 종료 | `REQUIRED_CI_MISSING_AFTER_RETRY` · `REQUIRED_CI_PENDING_AFTER_RETRY` · `CI_STATUS_UNAVAILABLE_AFTER_RETRY` 로 **차단 (fail-closed)** |

- 재조회 간격 30s(기본), 최대 시도 = 창/간격 + 1 — 무한 대기 없음. 항상 같은 target SHA 만 본다(다른 HEAD 로 이동 0).
- 로그: `CI_GATE_WAIT reason=REQUIRED_CI_MISSING (CI Pipeline) target_sha=<sha> attempt=n/N`.
- 단위(가짜 시계): MISSING→success · MISSING→MISSING→success · MISSING timeout · pending→success · pending→failure(실패 즉시 중단) · pending timeout · immediate failure(재조회 0) · wrong SHA · API 5xx→success · API 계속 실패 · 창 0.
- 실측(read-only): main `201c066fb` → GREEN(1회). CI 없는 SHA `ffff…` (창 20s · 간격 10s) → `CI_GATE_WAIT … attempt=1/7` → `REQUIRED_CI_MISSING_AFTER_RETRY` · exit 1.
- 2026-09-30 API 1차 dispatch 차단(순간 0건)은 이 창 안에서 해소되는 모양이다(직후 조회 success).

---

## 3. Workflow 변경 분류 (§7 · §8)

`deploy-workflow-diff.mjs` 가 base/head 원문을 `top:env` · `top:other` · `job:<name>` 구역으로 나누고, 주석 · 빈 줄을 버린 뒤 **줄**과 **flag 토큰**(`--x=v`, `"${ARR[@]}"`)의 multiset 차이를 본다. job → 서비스는 `build-and-deploy`→api · `deploy`→admin · `deploy-<key>`→web key, 그 외 job(detect · ci-gate · hold · summary)은 control.

| 분류 | 예 | 서비스 효과 |
|---|---|---|
| **control** | 주석 · echo 문구 · `if` · `needs` · permissions · 게이트/판정 job · on/inputs/concurrency | 무영향 |
| **build** (B) | `--build-arg` · docker build · 빌드 명령 · `VITE_*=` · 빌드 설정 값 | 그 서비스 artifact 변경 → 배포 필요 · L2 (인증 진입 입력 `HANDOFF/AUTH/LOGIN/OAUTH/CLIENT_ID/GOOGLE` 은 L3) |
| **config** (C) | `gcloud run deploy` 의 env · secret · 리소스 · ingress 등 flag, migration 호출, 이미지 · 대상 이름, 어떤 job 도 참조하지 않는 top env | 배포 필요 · **L3** |
| **rollout** (방식) | `--no-traffic` · `--tag` · `--update-labels` · `ROLLOUT_ARGS` · 전환 스크립트/액션 · checkout/sparse/도구 설치/setup action | **배포 불필요** · `rollout_pending` — 그 서비스의 다음 배포 1회만 L3 |

- 판정 불가(원문 없음 · 신규 A · 삭제 D · jobs 없음) → 종전처럼 classifier 로 넘겨 전 서비스 + `deploy-config` L3 (보수).
- `scripts/ci/cloud-run-rollout.mjs`(전 서비스) · `.github/actions/cloud-run-verified-rollout/**`(web+admin) · `scripts/ci/cloud-run-env.mjs`(api) = rollout 방식. `ci-gate.mjs` · `deploy-risk.mjs` · `deploy-workflow-diff.mjs` · `cd-risk-gate-shadow.yml` = control. `setup-build-env` · Dockerfile · nginx conf · `infra/**` · `package.production.json` = `deploy-infra` L3 유지.

## 4. build-arg 서비스 귀속 (§9)

top env 값이 바뀌면 그 env 를 참조하는 job 만 영향. job 안의 `--build-arg ARG=${{ env.NAME }}` 로 ARG 를 찾고, **서비스 디렉터리 + workspace closure 의 runtime 파일**에 ARG 이름이 나오는지 `git grep -w`(target SHA)로 본다. Dockerfile(ARG/ENV 선언) · 테스트 · `.env*` 는 소비가 아니다. 한 번이라도 나오면 소비(보수), git 실패는 모름 → 소비로 취급. 정적 분석은 하지 않는다.

실측: k-cosmetics(`2edfe9b33` → HEAD) → `env VITE_SERVICE_URL_K_COSMETICS → build-arg VITE_SERVICE_URL 변경 — 서비스 소스가 VITE_SERVICE_URL 를 읽지 않음 → artifact 무영향` (census 에서 수동 확인했던 결론을 자동 판정).

## 5. 위험 감소 삭제 (§10 · §11)

- 대상 규칙: `db-write-runtime` 만. 상태 D 이고 **같은 diff 에 같은 규칙의 A/M 파일이 없을 때만** `risk_reducing` 으로 기록하고 L3 hit 에서 뺀다(이동 · rename 우회 방지).
- 대상 아님: migration 삭제 · middleware/guard/auth 삭제(접근을 여는 변경일 수 있음) — L3 유지.
- 서비스는 여전히 affected(이미지에서 파일이 빠짐) → 주변 변경이 없으면 L2.
- 실측 사례 `e2adfe4f3`: seed job 진입점 3개는 `risk_reducing` 으로 빠졌지만 같은 commit 의 **Dockerfile 변경(`deploy-infra`)** 때문에 L3 유지 — 규칙대로.

## 6. Fixture · 재현 결과

**단위**: `scripts/ci/__tests__` 전체 **188/188** (ci-gate 19 · deploy-workflow-diff 20 · deploy-risk 36 · rollout 12 · env 7 · workflow 계약 19 · detect-affected 75). WO §13 fixture 대응:

| 분류 | fixture |
|---|---|
| LEVEL 1 | #259 CI-only(R2) · docs(R1) · CHECK · comment/hold 문구 workflow(W1 · 통합) · 판정 스크립트(R8c) · 소비 안 되는 build-arg(W3) · rollout 만(R8b · W5) |
| LEVEL 2 | frontend(R3) · backend(R4) · 소비되는 build-arg(W2 · 통합) · DB write 진입점 삭제만(D1) |
| LEVEL 3 | migration(R5) · auth backend/package/frontend(R6*) · session-origin(R6e) · RBAC/middleware/guard(R7) · DB write 추가/수정(D4) · 배포 설정 flag(W6) · top env(W7) · 인증 진입 build 입력(W4) · 신규 workflow(통합) · 삭제+대체(D2) · migration/guard 삭제(D3) |

**main 300 commit 재현** (`cd8c7ab3e` 기준 first-parent · 각 commit 의 parent..commit · 원문 · 소비 판정 git 주입):

| 회차 | L1 | L2 | L3 | migration 경로인데 L3 아님 |
|---|---|---|---|---|
| 이전(SAFE-AUTODEPLOY 보정 후) | 180 | 48 | 72 | 0 |
| **이번** | **188** | **48** | **64** | **0** |

하향 8건 전수 검토 — 전부 deploy workflow 의 control 또는 빌드 환경 변경이며 **하향 후 runtime 고위험 규칙 hit 0**:
`22fa01975`(develop trigger 제거) · `559740cde`(주석 · README) · `f2fdead81`(environment 표기) · `3c7083be5`(DEPLOY_ENABLED 게이트) · `682c1eea7`(web detect job) · `da8767b57`(api detect job) · `93964ffc6`(admin detect job) · `6ae232ea1`(sparse checkout · gcloud 설치 = 빌드 환경 → rollout). 상향 0건.

**숨은 미탐 발견 · 보정**: `773d6c54c` 의 `apps/api-server/src/utils/session-origin.ts`(로그인 세션 origin 판정 = 인증 경계)는 종전에 workflow 파일 때문에 L3 였을 뿐 **규칙 자체에는 걸리지 않았다**. backend 파일명 `session` 을 auth 규칙에 추가(대상 9파일 전부 세션/인증 — 오탐 범위 확인) → L3 유지.

## 7. 남은 6개 서비스 재판정 (현재 serving → main `201c066fb`, read-only)

| service | serving | 이전 | 이번 | 사유 |
|---|---|---|---|---|
| admin | `f838fd036` | BEHIND L3 | **BEHIND_NO_RUNTIME_CHANGE · L1** | deploy-admin.yml 변경이 control(ci-gate · hold · if) + rollout(ROLLOUT_ARGS · label) 뿐 |
| kpa-branch | `f838fd036` | BEHIND L3 | 〃 | web workflow control + rollout |
| k-cosmetics | `2edfe9b33` | BEHIND L3 | 〃 | + `VITE_SERVICE_URL` build-arg 비소비(§4) |
| pharmacy-hub · lecture · signage-player | `2edfe9b33` | BEHIND L3 | 〃 | control + rollout |

6개 모두 `rollout_pending=true` — **다음 실제 runtime 변경의 첫 배포 1회는 LEVEL_3(통제)**. 배포된 5개(api · neture · store · hospital-pharmacy · kpa-society)는 `e2e1be6cc` label → docs-only 차이만 → `BEHIND_NO_RUNTIME_CHANGE · L1`. 전체 **11개 NO_DEPLOY · risk LEVEL_1**.

## 8. Cutover readiness

| 항목 | 상태 |
|---|---|
| CI_GATE_RACE_FIXED | ✅ |
| WORKFLOW_CHANGE_ATTRIBUTION | ✅ |
| BUILD_ARG_ATTRIBUTION | ✅ |
| RISK_REDUCING_DELETE | ✅ |
| LEVEL3_FALSE_NEGATIVE | ✅ 0 (재현 · 숨은 미탐 보정) |
| SHADOW_STABILITY | ✅ push 후 shadow run 확인 (§9) |

`CUTOVER_READINESS = READY` 의 조건:
1. cutover WO 에서도 **LEVEL_3 는 자동 배포하지 않는다** (통제 배포 유지).
2. `rollout_pending` 인 6개 서비스는 첫 runtime 변경 배포가 L3(통제)로 한 번 지나간다 — 정상 동작이며, 이후 L2 자동화 대상.
3. shadow 는 계속 기록 — cutover 직전 최근 기록에서 L3 미탐 사례가 없는지 한 번 더 확인.

## 9. push 후 확인

(push 후 기록)

## 10. 불변

#257 HOLD · glucoseview-web LEGACY · `origin/wo/service-identity-deploy2-boundary` 미처리 · `DEPLOY_ENABLED=false` · `DEPLOY_FREEZE` 미도입 — 변동 없음. 원래 작업공간(`o4o-platform`)은 건드리지 않았다.

## 11. 문서 정합

해당 없음 (기준 문서 drift 발견 0).

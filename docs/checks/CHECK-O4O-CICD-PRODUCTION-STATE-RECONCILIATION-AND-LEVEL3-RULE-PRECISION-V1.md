# CHECK — O4O CI/CD Production State Reconciliation & LEVEL_3 Rule Precision V1

> WO: `WO-O4O-CICD-PRODUCTION-STATE-RECONCILIATION-AND-LEVEL3-RULE-PRECISION-V1`
> 성격: READ-ONLY PRODUCTION RECONCILIATION + LEVEL_3 CLASSIFIER REFINEMENT
> 일자: 2026-10-02 · 기준 main: `810133154` → origin `c99f2a1bf` (다른 세션 test 정정 1건)
> 이번 WO 에서 하지 않은 것: DEPLOY_FREEZE 변경 · promote · deploy · traffic 변경 · DB write · migration 실행 · #257/#262 revert · rollout_pending 해제

---

## 1. 운영 상태 정합 (§3–§6)

### 1-1. 외부 API run `36955274975` — success

| 단계 | 결과 |
|---|---|
| build · migrations · deploy · readiness smoke · switch · verify after switch | 전부 success, rollback 없음 |
| 새 revision | `o4o-core-api-03786-lec` traffic 100% (이전 `03783-jex`) |
| label | `o4o-commit-sha=353c11d04` · digest `sha256:581a4122…` |
| 공개 `/health/ready` | 200 |
| migration job `o4o-api-migrations-c2xww` | typeorm_migrations 696 · pending 0 · INCREMENTAL_EXECUTED=0 · EXPECTED_SCHEMA_STATE=`CreateDemoAccounts1790940000000` · PRE/POST assertion PASS |

→ #262 Demo migration 은 이 run 이전에 이미 운영에 반영되어 있었다. 이번 run 은 migration 을 새로 실행하지 않았다.
→ §25: run 은 완료 상태였으며 이번 WO 는 재시도 · 덮어쓰기 promotion 을 하지 않았다.

### 1-2. DEPLOY_FREEZE

`true` (2026-10-02T02:22:53Z 갱신, 이후 재확인에서도 `true`). 이번 WO 는 이 값을 바꾸지 않았다.

### 1-3. Cloud Run serving census (11 서비스, 직접 조회)

| service | revision | serving SHA | 출처 |
|---|---|---|---|
| api | 03786-lec | 353c11d04 | revision-label |
| admin | 01317-9bx | f838fd036 | registry-tag |
| neture | 01671-xil | eab0474f0 | revision-label |
| k-cosmetics | 01169-4dj | 2edfe9b33 | registry-tag |
| kpa-society | 02008-wiz | e2e1be6cc | revision-label |
| pharmacy-hub | 00259-9mj | 2edfe9b33 | registry-tag |
| lecture | 00018-pkv | 2edfe9b33 | registry-tag |
| hospital-pharmacy | 00014-dof | e2e1be6cc | revision-label |
| store | 00020-lez | e2e1be6cc | revision-label |
| kpa-branch | 00180-nlb | f838fd036 | registry-tag |
| signage-player | 00092-bzl | 2edfe9b33 | registry-tag |

모든 서비스에서 latest ready revision 이 traffic 100% 를 받고 있다.

---

## 2. #257 / #262 의미 분해 (§7 · §8 · §18)

판정 원칙(§16): 위험은 **serving SHA → target** 누적 diff 로만 센다. 이미 serving 에 포함된 변경은 위험으로 다시 세지 않는다.

### 2-1. 이미 운영 반영 (API serving `353c11d04` 에 포함)

- backend auth: email-auth controller/service · password-credential · session policy · auth middleware
- rateLimiter · require-json-body middleware
- migrations `1790683000000` · `1790684000000` · #262 `CreateDemoAccounts1790940000000` (pending 0)
- web-neture 의 #257 소스 (serving `eab0474f0` 이후 포함)

### 2-2. 미반영 — 프런트 7개 (admin · k-cosmetics · kpa-society · pharmacy-hub · lecture · store · kpa-branch)

첫 위험 commit (§15) = `138657460` (#257). k-cosmetics · pharmacy-hub · lecture 는 serving `2edfe9b33` 뒤에 #241 `880642e9b` 도 auth 를 건드렸지만, 누적 diff 의 파일은 #257 과 같다.

| 파일 | 의미 | 판정 |
|---|---|---|
| `packages/auth-client/src/client.ts` | `loginWithEmail` 등 credential 전송 + `adoptSessionResponse` | **L3 유지** (§27 credential · session) |
| `packages/auth-client/src/types.ts` · index | 위 계약 타입 | L3 (auth-package) |
| `packages/auth-react/src/useServiceAuth.ts` · types · index | session 채택 | **L3 유지** (§27 session) |
| `packages/auth-utils/src/emailCredential.ts` · index | password policy (서버와 공유) | **L3 유지** (secret-handling) |
| `packages/auth-react/src/email/*.tsx` | 표현층이지만 password 입력과 인증 호출을 포함 | L3 (민감 구문 hit) |

→ 프런트 7개의 L3 는 **정당한 L3** 다. 판정기 정밀화로 downgrade 하지 않는다.

---

## 3. LEVEL_3 규칙 정밀화 (§9–§14) — deterministic rule only

AI classifier 는 쓰지 않았다. 변경 파일 2개: `scripts/ci/detect-affected.mjs`, `scripts/ci/deploy-risk.mjs`.

### 3-1. Non-runtime global 제외 (§12 · §13)

`detect-affected.mjs` 에 `isNonRuntimeGlobal(file)` 를 추가하고, `classifyApiDeploy` · `classifyWebDeploy` · `classifyAdminDeploy` 에서 workspace fallback 직전에 건너뛴다. CI 축(classify)은 바꾸지 않았다.

**fallback census 4분류**

| 분류 | 경로 | 처리 |
|---|---|---|
| NON_RUNTIME_GLOBAL | `.gitignore` · `.editorconfig` · `.lighthouserc.json` · `sonar-project.properties` · `start-chrome-debug.sh` · `.claude/` · `.playwright-mcp/` · `.idx/` · root `*.md` (README · AGENTS · CLAUDE · SETUP · CHANGELOG) · root `*.cmd` | **제외** (배포 무영향) |
| TRUE_GLOBAL | `.dockerignore` · `.gcloudignore` · `.gitattributes` · `.npmrc.pnpm` · `.nvmrc` · `tsconfig.json` · `tsconfig.packages.json` · `vite.config.shared.ts` · `_generated/` · eslint config · `pnpm-lock` (lock 판정) | 유지 |
| UNKNOWN | `.env.example` · `bundles/` · `config/` · `extensions/` · `infra/` (deploy-infra 규칙) · `monitoring/` · `output/` · `public/` · `reports/` · `tests/` · `tmp/` · `ui-guidelines/` · `apps/.gitkeep` · `packages/.gitkeep` | 유지 (fail-closed, 보류) |
| CI control | `.github/workflows/**` · `scripts/ci/**` | 기존 CONTROL_ONLY / ROLLOUT_MECHANISM 규칙 그대로 |

근거: Web Dockerfile 은 서비스 · package 디렉터리만 COPY 하고, API 이미지는 dist + `package.production.json` 만 담는다. 목록에 없는 root 파일은 전부 기존대로 전체 fallback(fail-closed) 이다.

### 3-2. API ↔ 프런트 의존 판정 근거 (§14)

`computeApiDependency` 는 commit 마다 `assessRisk` 의 affects 를 쓰므로, 3-1 이 적용되면 non-runtime-only commit(예: `e242fc800` `.gitignore`)은 더 이상 "API 와 공유 commit" 근거가 되지 않는다. 공유 types 동시 변경 · 같은 WO 키 · 키 없음 규칙은 그대로 dependent 다.

### 3-3. Auth 표현층 판정 (§9–§11 그룹 정밀화)

`deploy-risk.mjs` 에 다음을 추가했다.

- **대상 규칙:** `auth-frontend` · `auth-package` 두 개만 (`PRESENTATION_ELIGIBLE_RULES`)
- **후보 경로:** 서비스 · admin 화면 소스 또는 `packages/auth-react/src/` 의 `.tsx/.jsx/.css/.scss/.less`. contexts · hooks · lib · api · services · stores · utils · providers · guards · middleware · config 디렉터리와 `use*` · `*Context` · `*Provider` · `*Guard` · `*Client` · `*Api` · `*Token` · `*Session` · `*Storage` · `*Handoff` · `*Callback` · `*Redirect` · `*OAuth` · `*Sso` 이름은 제외
- **줄 diff:** `changedLinesOf` 가 LCS 로 바뀐 줄만 뽑는다. 원문이 없거나 비용 상한(4,000,000 cell)을 넘으면 null → L3 유지 (fail-closed)
- **민감 구문(`AUTH_SENSITIVE_CONSTRUCT`):** storage · token · session · credential · password · OTP · IdP 이름 · Authorization/Bearer/handoff/identity · fetch/axios/api/client 호출 · login/signup/logout/refresh/adoptSession/setUser/checkAuth/useAuth/onSubmit · handler · setter · hook 호출 · arrow · async/await · function · redirect/returnUrl/window/location/navigate/history/postMessage · role/permission/scope/membership/isAdmin/guard · innerHTML/eval/crypto/hash · import/require/export/process.env/import.meta
- **판정:** 파일의 hit 가 전부 eligible 규칙이고, 후보 경로이며, 바뀐 줄에 민감 구문이 0 이면 L3 hit 에서 빼고 `presentation_only` 와 advisory 에 기록한다 — 「로그인 화면 표현층만 변경(민감 구문 0 · N줄) — LEVEL_3 아님」
- replay 로 보정: `fc02334fd` 의 `onStart={() => setError(null)}` 가 처음에 표현층으로 판정됐다. 동작 배선 변경이므로 handler · setter · hook · arrow · async 를 민감 구문에 넣어 L3 로 유지되게 했다.

### 3-4. 하향 금지 축 (§27) — 변경 없음

migration · migration runner · prod DB write · RBAC · access-control · backend auth · token validation · credential · session validation · secret · deploy-infra · deploy-config · service-deletion · payment · auth-build-input 은 표현층 판정 대상이 아니다. 같은 파일에 이 규칙이 같이 hit 하면 L3 를 유지한다.

---

## 4. Fixture (§26)

`scripts/ci/__tests__/level3-precision.test.mjs` (신규, 29 tests)

| 그룹 | 내용 |
|---|---|
| P (표현층 vs 의미) | className only → L2 · Google 문구 → L3 · 인증 호출 → L3 · 원문 없음 → L3 · 줄 이동 · auth-react 컴포넌트 L2 / password 포함 L3 · 후보 경로 · 정규식(`onStart={() => setError(null)}` 포함) |
| N (§27 금지 축 10종) | auth-client · auth-utils credential · useServiceAuth · backend auth · session policy · roles.ts · RoleGuard · migration · jobs · env-loader · auth-frontend + rbac 동시 hit → 전부 L3 |
| G (non-runtime global) | `.gitignore` · docs · root md · tooling · CI control → 배포 0 · 미등록 root → 전체 fallback · `.dockerignore`/`.gcloudignore`/`.gitattributes`/`_generated/`/`.env.example`/`vite.config.shared.ts`/`tsconfig.packages.json` 은 non-runtime 아님 · `docs/README.md` 는 isNonRuntimeGlobal 대상 아님 |
| K (의존 근거) | `.gitignore` commit · README + CI commit 은 근거 아님 · 공유 types 동시 변경 · 같은 WO 키는 dependent 유지 |

`node --test scripts/ci/__tests__/*.test.mjs` → **310 / 310 PASS**

---

## 5. Replay — false negative 검사 (§17)

first-parent 400 commits, 구 판정기(HEAD 원본) vs 신 판정기.

| 항목 | 결과 |
|---|---|
| skipped | 0 |
| L3 commit 수 | old 79 / new 79 |
| 보호 규칙 FN (db-migration · db-migration-runner · db-write-runtime · rbac · access-control-layer · auth-backend · secret-handling · deploy-infra · deploy-config · service-deletion · payment · auth-build-input) | **0** |
| 서비스 L3 → L2 downgrade | **0** |
| affected 해제 | `e242fc800` 1건 (.claude 명령 2 · .gitignore · CLAUDE.md) — 11 서비스 |
| presentation_only 판정 | `bbd61992a` 의 주석 줄만 (AuthBootstrapDebug · kpa LoginModal · neture LoginModal). 해당 commit 은 다른 파일로 L3 유지 |

→ **LEVEL3_FALSE_NEGATIVE = 0**

---

## 6. 서비스별 재판정 (§19 · §20)

| service | serving | 구 판정기 (main 810133154) | 신 판정기 (target c99f2a1bf) | API 의존 |
|---|---|---|---|---|
| api | 353c11d04 | L2 | **L2** (`87ebdb074` automation runtime) | — |
| admin | f838fd036 | L3 | **L3** (#257 auth-package + secret-handling) | 의존 → **독립** |
| k-cosmetics | 2edfe9b33 | L3 | **L3** | 의존 → **독립** |
| kpa-society | e2e1be6cc | L3 | **L3** | 의존 → **독립** |
| pharmacy-hub | 2edfe9b33 | L3 | **L3** | 의존 → **독립** |
| lecture | 2edfe9b33 | L3 | **L3** | 의존 → **독립** |
| store | e2e1be6cc | L3 | **L3** | 의존 → **독립** |
| kpa-branch | f838fd036 | L3 | **L3** | 의존 → **독립** |
| neture | eab0474f0 | L3 (rollout_pending, `066dde821`) | **L1 NO_DEPLOY** (runtime 변경 없음) | — |
| signage-player | 2edfe9b33 | L3 (rollout_pending) | **L1 NO_DEPLOY** | — |
| hospital-pharmacy | e2e1be6cc | L3 (rollout_pending) | **L1 NO_DEPLOY** | — |

- neture · signage-player · hospital-pharmacy 의 rollout_pending 은 해제하지 않았다. runtime 변경이 없어 이번엔 배포 대상이 아니고, 다음 실제 배포 때 통제(L3)로 이월된다.
- 구 판정기에서 10개 프런트가 API 의존이던 이유는 `e242fc800` `.gitignore` fallback 하나였다.

---

## 7. Promotion dry-run 과 결정 (§21–§24)

로컬 `deploy-orchestrate.mjs --plan-only --mode promote --target c99f2a1bf --freeze false --dry-run true` (실행 아님, 계획 계산만).

| 항목 | 값 |
|---|---|
| target SHA | `c99f2a1bf` (main HEAD) — 커밋 후에는 이 WO 의 commit 이 HEAD 가 되며 판정은 같다 (scripts/ci · docs 만 변경) |
| 대상 서비스 | admin · k-cosmetics · kpa-society · pharmacy-hub · lecture · store · kpa-branch (7) |
| L3 사유 | #257 프런트 auth: credential 전송(`loginWithEmail`) · session 채택(`adoptSessionResponse`/`useServiceAuth`) · password policy(`emailCredential.ts`) |
| migration | **없음** — serving→target 사이 `apps/api-server/src/database` 변경 0, 운영 pending 0 |
| 예상 배포 | 위 7개 web/admin 서비스, API 의존 없음 → 병렬 web 배포 + admin |
| 예상 traffic | 각 서비스 새 revision 100% 전환 (smoke 후 switch) |
| rollback | 각 서비스 직전 revision (위 1-3 표) 으로 traffic 복귀. backend 는 이미 #257 API 를 서빙 중이므로 프런트만 되돌려도 계약이 깨지지 않는다 |
| dry-run 표시 | 7개 `BLOCKED_CI_NOT_GREEN` — dry-run 시점 target CI 가 진행 중이었다. promote 실행 시 CI green 이 선행 조건 |

**PROMOTION_DECISION = PROMOTE_REQUIRED (승인 대기, 실행하지 않음)**
`gh workflow run promote.yml` 는 실행하지 않았다.

---

## 8. Freeze 해제 readiness (제안만, 해제하지 않음)

DEPLOY_FREEZE=false 가 되면 다음 main push 의 Delivery 에서 즉시:

1. **api — L2 자동 배포** (`87ebdb074` automation runtime 등). migration 0.
2. 프런트 7개 — **HOLD** (L3, promote 필요).
3. neture · signage-player · hospital-pharmacy — 배포 없음.

권장 순서: (a) freeze 해제 승인 → api L2 자동 배포 관찰 → (b) 프런트 7개 promote 승인 → promote 1회. 또는 freeze 를 유지한 채 promote 를 먼저 하는 경우 promote 경로의 freeze 처리 규칙을 따른다. 어느 쪽이든 사용자 승인이 필요하다.

---

## 9. 최종 판정

```text
PRODUCTION_STATE_RECONCILED   = YES (11 서비스 serving census · api 03786-lec=353c11d04)
EXTERNAL_API_DEPLOY_STATUS    = SUCCESS (run 36955274975 · migration 신규 실행 0 · pending 0)
LEVEL3_RULE_PRECISION         = APPLIED (non-runtime global 제외 + auth 표현층 판정, deterministic)
GITIGNORE_GLOBAL_FALLBACK     = REMOVED (.gitignore · docs · root md · tooling 메타)
API_FRONTEND_DEPENDENCY       = INDEPENDENT (프런트 7 전부)
LEVEL3_FALSE_NEGATIVE         = 0 (replay 400 · downgrade 0)
CURRENT_PENDING_L3            = 7 (admin · k-cosmetics · kpa-society · pharmacy-hub · lecture · store · kpa-branch — #257 프런트 auth)
PROMOTION_DECISION            = PROMOTE_REQUIRED (승인 대기 · 미실행)
DEPLOY_FREEZE                 = TRUE
PRODUCTION_DEPLOY             = 0
TRAFFIC_CHANGE                = 0
DB_WRITE                      = 0
```

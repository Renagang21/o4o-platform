# CHECK-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1

> **WO**: WO-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1
> **기준 조사**: [CHECK-O4O-CICD-PRODUCTION-DEPLOY-CENSUS-AND-SIMPLIFICATION-V1](../investigations/CHECK-O4O-CICD-PRODUCTION-DEPLOY-CENSUS-AND-SIMPLIFICATION-V1.md)
> **기준 SHA**: `origin/main` = `cd8c7ab3e` (2026-09-30)
> **상태**: IMPLEMENTED + SHADOW READY · production cutover 미실행
> **Production 변경**: 배포 0 · `DEPLOY_ENABLED` 변경 0 · Environment 변경 0 · traffic 변경 0 · DB write 0 · migration 0 · secret 변경 0 · PR merge 0

---

## 0. 최종 판정

```text
IMPLEMENTATION              = PASS
SHADOW_MODE                 = READY        (cd-risk-gate-shadow.yml — main CI 완료마다 기록만)
CI_GATE                     = PASS         (enforced · 단위 8/8 · 실측 read-only 2건)
SERVING_SHA_DETECTOR        = PASS         (web 9 + admin: registry 태그로 실측 10/10 · API: 첫 label 배포 전까지 UNKNOWN → LEVEL_3 fail-safe)
RISK_CLASSIFIER             = PASS         (단위 33/33 · main 300 commit 재현: migration 미탐 0 · 미탐 3건/오탐 1건 발견 후 규칙 보정)
REVISION_SMOKE              = PASS         (단위 · 실 URL 판정 메커니즘까지. **0% revision 실배포 smoke 는 미실측**)
TRAFFIC_SWITCH              = NOT_READY    (코드 · 단위 시험 완료, production 에서 전환 · rollback 을 한 번도 실행하지 않음)
DEPLOY_FREEZE_CUTOVER       = NOT_READY
PRODUCTION_CUTOVER_EXECUTED = NO
```

이 WO 에서 **실제 production 동작이 바뀐 것은 하나뿐이다**: 게이트가 열렸을 때 CI 가 green 이 아닌 commit 은 배포되지 않는다(Phase 1 enforced). 나머지는 모두 dispatch 입력으로 선택해야 동작하거나(verified rollout), 기록만 한다(shadow).

---

## 1. 변경 파일

| 파일 | 종류 | 내용 |
|---|---|---|
| `scripts/ci/deploy-risk.mjs` | 신규 | serving SHA → target SHA 서비스별 판정 · risk_level · Admin 배포 축 · Cloud Run read-only 수집 · shadow 요약 |
| `scripts/ci/ci-gate.mjs` | 신규 | target SHA 의 필수 CI(`CI Pipeline`) green 판정 · 대기 · 차단 메시지 |
| `scripts/ci/cloud-run-rollout.mjs` | 신규 | plan · revision 직접 smoke · 전환(방식 보존) · 전환 후 검사 · rollback |
| `scripts/ci/cloud-run-env.mjs` | 신규 | optional env 를 빈 값으로 덮지 않는 set/carry/omit 판정 |
| `scripts/ci/__tests__/{deploy-risk,ci-gate,cloud-run-rollout,cloud-run-env,deploy-workflow-gates}.test.mjs` | 신규 | node:test 79건 (네트워크 · GCP 0) |
| `.github/actions/cloud-run-verified-rollout/action.yml` | 신규 | web · admin verified rollout composite (plan / finish) |
| `.github/workflows/cd-risk-gate-shadow.yml` | 신규 | shadow 판정 workflow (배포 0 · 쓰기 0) |
| `.github/workflows/deploy-api.yml` | 수정 | ci-gate · rollout_mode · commit label · optional env 보호 · hold 문구 |
| `.github/workflows/deploy-web-services.yml` | 수정 | ci-gate · rollout_mode · 9 job commit label · verified rollout · hold 문구 · summary 오해 문구 |
| `.github/workflows/deploy-admin.yml` | 수정 | ci-gate · rollout_mode · commit label · verified rollout · hold 문구 |
| `.github/workflows/ci-pipeline.yml` | 수정 | 새 node:test 5개를 기존 detector step 에 blocking 연결 |
| `README.md` · `.github/workflows/README.md` | 수정 | 배포 절에 CI gate · rollout_mode · shadow 설명 |
| `docs/investigations/CHECK-O4O-CICD-PRODUCTION-DEPLOY-CENSUS-AND-SIMPLIFICATION-V1.md` | 신규(선행 WO 산출물) | 조사 CHECK — 이전 세션에서 작성, 동기화 문제로 미커밋이던 것 |

작업 공간: 기본 worktree 가 57커밋 뒤처지고 타 세션 변경으로 dirty 여서, `origin/main` 기반 별도 worktree(`wo/cicd-safe-autodeploy-risk-gate`)에서 구현했다.

병행 수정 확인(§32 중단 기준): `origin/wo/service-identity-deploy2-boundary` 가 `deploy-api.yml` 을 고친 흔적이 있으나 마지막 commit 2026-09-28 · PR 없음 · main 이 같은 기능(`migrate_only`)을 1ca2ea981 로 다른 방식으로 이미 반영 → **방치된 대안 브랜치**로 판단하고 중단하지 않았다. 그 브랜치를 나중에 병합하려 하면 이 WO 의 deploy-api 변경과 충돌한다.

---

## 2. Phase 1 — CI success gate

**필수 CI 결정 (조사 근거)**

| workflow | 판정 | 이유 |
|---|---|---|
| `CI Pipeline` (`ci-pipeline.yml`) | **필수** | 모든 main push 에서 paths 필터 없이 실행. type-check · lint ratchet · 정적 guard · Jest/Vitest · Admin build 전부 포함 |
| CodeQL (`ci-security.yml`) | advisory (출력만) | SARIF upload 실패로 코드와 무관하게 red 가 된 이력 (#257 head 실측: CI Pipeline success · CodeQL failure). #259 병합 후 필수 승격 검토 |
| AppStore Guard · Guard Policy | 제외 | paths 필터 — SHA 마다 존재하지 않는다(부재를 차단으로 만들면 안 됨) |
| SonarCloud | 제외 | 외부 서비스 · main 상시 red 이력 |

**구현**: 세 deploy workflow 에 `ci-gate` job 을 추가하고 모든 배포 job 이 `needs` 로 의존한다 (api 1 · web 9 · admin 1).
- `node scripts/ci/ci-gate.mjs --target ${{ github.sha }} --wait-seconds 1800 --enforce`
- target SHA 의 `CI Pipeline` **최신 run**(re-run 은 attempt 로 구분) 기준. success 만 통과.
- failure · cancelled · timed_out · pending(30분 대기 후) · run 없음 · SHA 형식 오류 · API 조회 실패 → 차단.
- 차단 출력: `DEPLOY_BLOCKED: TARGET_SHA_CI_NOT_GREEN` / `TARGET_SHA=` / `CI_REASON=FAILED_CHECK=CI Pipeline (...)`
- 실행 조건은 "배포가 실제로 열릴 수 있을 때"(`DEPLOY_ENABLED=='true'` + 영향 있음, 또는 `migrate_only`) — 게이트가 닫힌 평상시에는 러너 시간을 쓰지 않는다.
- `migrate_only` 도 CI gate 를 통과해야 한다 (태그 commit 은 main push CI 가 이미 돌았으므로 추가 부담 없음).

**실측 (read-only)**: `cd8c7ab3e`(main) → `CI_STATE=GREEN` · CodeQL success. #257 head `647336c1d` → CI Pipeline GREEN · `ADVISORY CodeQL: completed/failure`.

**동작 변화 (유일한 production-path 변경)**: 종전에는 게이트가 열린 채 main push 가 오면 CI 와 병렬로 즉시 배포됐다. 이제는 CI 완료를 기다린 뒤 green 일 때만 배포된다 — push 배포가 최대 CI 소요 시간만큼 늦어진다.

---

## 3. Phase 2 — Serving SHA → Target SHA

**serving SHA 획득 방식** (서비스별 · 새 DB/저장소 0)

1. revision label `o4o-commit-sha` — 이 WO 부터 **모든** `gcloud run deploy` 가 `--update-labels="o4o-commit-sha=${{ github.sha }}"` 로 남긴다 (api 1 · web 9 · admin 1, 계약 시험으로 고정).
2. label 이 없으면: serving revision 의 image digest → registry 태그 중 40자 hex (`gcloud container images list-tags --filter=digest=…`).
3. 둘 다 실패 · traffic 이 여러 revision 에 분할 · 저장소 이력에 없는 SHA · target 의 조상이 아님 → `UNKNOWN` → 해당 서비스 **LEVEL_3** (fail-safe).

**실측 (2026-09-30 · read-only)**

| service | serving SHA | source | status |
|---|---|---|---|
| api | — | label 없음 · digest 에 태그 없음 | UNKNOWN (LEVEL_3) |
| admin | `f838fd036` | registry-tag | BEHIND |
| neture | `21e965436` | registry-tag | BEHIND |
| k-cosmetics · kpa-society · pharmacy-hub · lecture · store · signage-player | `2edfe9b33` | registry-tag | BEHIND |
| kpa-branch | `f838fd036` | registry-tag | BEHIND |
| hospital-pharmacy | `bb26f3a26` | registry-tag | BEHIND |

- **API 가 태그로 안 풀리는 이유**: API 이미지는 `docker buildx --push` 로 올라가 태그가 manifest list(index)에 붙고, Cloud Run 은 플랫폼 manifest digest 로 고정한다. 그 digest 에는 태그가 없다. → 다음 API 배포부터 label 로 해결된다. 그 전까지는 fail-safe(LEVEL_3)다.
- label 이 revision 에 전파되는 근거: 현재 API revision 에 과거 `--update-labels` 흔적인 `restart` label 이 revision metadata 에 존재. **실배포로 재확인 필요** (§10).
- 판정기는 `readChangedFiles(serving, target)` (기존 SSOT) 로 **누적 diff 전체**를 본다 — 마지막 commit 이 docs 여도 앞의 migration 을 놓치지 않는다 (단위 S2).

---

## 4. Phase 3 — Risk classification

**입력**: 변경 파일 목록(`{status, path}`) — serving..target diff 또는 임의 base..head(PR 재현).
**출력**: `risk_level` · `deploy_required` · `affected_services` · 서비스별 `{affected, level, reasons, level3[]}` · `level3_hits` · `pipeline_hits` · `advisories`.

**처리 순서**
1. runtime 무영향 파일 제외 — 테스트 · 테스트 설정 · mock · Markdown · `apps/api-server/tests/**` · `apps/api-server/src/scripts/**`(tsconfig.build 제외 · tsup entry 밖 · Dockerfile COPY 밖 → 이미지에 없음. 운영 CLI 이므로 advisory 로만 기록, 실행은 기존대로 사용자 승인).
2. 서비스 영향 — API · Web 은 기존 SSOT(`classifyApiDeploy` · `classifyWebDeploy`) 그대로. **Admin 은 배포 축을 새로 만들었다** — 기존 `admin_affected` 는 CI 축이라 `.github/**` · `scripts/**` 에도 참이어서 CI-only 변경을 Admin 배포로 오판했다.
3. LEVEL_3 규칙 hit 를 그 파일이 영향을 주는 서비스에 귀속. 어느 서비스에도 귀속되지 않는 배포 기계 변경은 `pipeline_hits` 로 두고, 영향받는 모든 서비스의 **다음 배포**를 LEVEL_3 로 만든다(첫 배포는 통제).
4. 서비스 level = affected 이고 (LEVEL_3 hit 또는 pipeline hit) → LEVEL_3, 아니면 LEVEL_2. 전체 = 최대값.

**LEVEL_3 규칙 (실제 경로 근거)**

| rule | category | 대상 |
|---|---|---|
| `db-migration` | DB migration | `apps/api-server/src/database/{migrations,incremental,bootstrap}/**` · `packages/*/src/**/migrations/**` |
| `db-migration-runner` | DB migration | `migrate.ts` · `database/{connection,data-source,migration-config}.ts` |
| `db-write-runtime` | production DB write | `apps/api-server/src/jobs/**`(예: 개인정보 실삭제 job) · runtime `*seed*` |
| `auth-backend` | auth | `src/{auth,common/auth,common/middleware/auth,modules/auth,services/auth}/**` · `google-identity.config.ts` · `types/auth.ts` · backend 파일명 token · auth · login · password · 인증 handoff |
| `auth-package` | auth | `packages/{auth-client,auth-context,auth-core,auth-react,auth-utils,security-core}/**` |
| `auth-frontend` | auth | `services/*/src` · admin src 의 `auth/ login/ oauth/ sso/ handoff/` 디렉터리 · Auth*/Login*/SignIn/SignUp/Password 파일명 (`Author*` 제외) |
| `rbac` | RBAC | `types/roles.ts` · `operator-role-catalog.ts` · `service-scopes.ts` · `packages/types/src/auth/**` · backend/package 파일명 role · permission · rbac · scope-guard · membership · frontend RoleGuard · role-constants |
| `access-control-layer` | RBAC | `apps/api-server/src/**/middleware/**` · `**/guards/**` |
| `secret-handling` | secret | `env-loader.ts` · backend/package 파일명 crypto · secret · credential · encrypt |
| `payment` | payment-sensitive | `packages/payment-core/**` · api src 경로 payment · refund · toss · settlement · checkout |
| `deploy-pipeline` | infra | `.github/workflows/deploy-*.yml` · `.github/actions/**` · `scripts/ci/{deploy-risk,ci-gate,cloud-run-rollout}.mjs` · `infra/**` · Dockerfile* · nginx*.conf · `apps/api-server/package.production.json` |
| `service-deletion` | service deletion | `services/*` · `apps/*` 의 `package.json` · `Dockerfile` 삭제(D) |

**단위 시험 (WO §28 Detector)**: docs-only → L1 · CI-only → L1 · 테스트만 → L1 · frontend → L2 · backend → L2 · migration → L3 · auth(backend/package/frontend) → L3 · RBAC → L3 · infra → L3 · 결제 · job → L3 · 서비스 삭제 → L3 — **33/33 PASS**.

### 4-1. PR 검증 사례

| PR | diff | 판정 | 기대 |
|---|---|---|---|
| **#259** `ci(security): skip CodeQL SARIF upload` | `.github/workflows/ci-security.yml` 1개 | **LEVEL_1 · deploy_required=false · affected 없음** | LEVEL_1 ✅ |
| **#257** `feat(auth): 이메일·비밀번호 가입·로그인` | 63 파일 | **LEVEL_3** — api(L3 hit 24) · admin · neture · k-cosmetics · kpa-society · pharmacy-hub · lecture · store · kpa-branch 전부 L3 (auth-package 소비). hit: `db-migration`(migration 2 · incremental manifest) · `auth-backend` · `auth-package` · `auth-frontend` · `access-control-layer`(rateLimiter · validation middleware) | LEVEL_3 ✅ |

#257 · #259 는 merge · deploy 하지 않았다.

### 4-2. Shadow 재현 — main first-parent 최근 300 commit (각 commit 의 parent..commit)

판정기와 **독립된 기준**(commit 제목 키워드 · migration 경로)과 교차 대조했다.

| 회차 | L1 | L2 | L3 | 오류 | migration 경로인데 L3 아님 |
|---|---|---|---|---|---|
| 1차 | 180 | 54 | 66 | 0 | **0** |
| 보정 후 | 180 | 48 | 72 | 0 | **0** |

1차에서 발견해 보정한 것:

| 구분 | commit | 파일 | 조치 |
|---|---|---|---|
| 미탐 | `6bfccbd4d` Supplier authorization → organization_members | `modules/neture/middleware/neture-identity.middleware.ts` · `supplier-context.resolver.ts` | `access-control-layer` 규칙 신설 |
| 미탐 | `23212304f` platform-admin-service-role-reset | `utils/role-revoke-safety.ts` · `MembershipConsoleController.ts` | backend 파일명 role · membership 추가 |
| 미탐 | `c5a3db0cd` supplier-operator-console-scope | `web-neture/src/lib/role-constants.ts` | frontend role-constants 추가 |
| 오탐 | `303221b8b` Supplier Domain 경계 동결 | `supplier-library-handoff.service.ts` (콘텐츠 handoff) | handoff 는 인증 handoff(token · controller · page)만 |

남은 FN 후보(제목 키워드만 걸린 L2)는 AI 기능 commit 5건과 `7a44a97bc`(merge 시점 delta 가 계정 API client 1개 — 본체는 먼저 반영)이며 모두 L2 가 정당하다고 판정했다. L3 로 새로 잡힌 `dc1c9f542`(`guards/drug-access.guard.ts` — 의약품 접근 guard) · `3c0a62665`(멤버십 승인) 등은 정당.

**관찰 — 자동 배포 비율**: 배포가 필요한 commit 120개 중 L3 가 72개(60%)다. O4O 변경이 인증 · 역할 · middleware · 배포 설정을 자주 건드리기 때문이다. cutover 후에도 **runtime commit 의 약 40% 만 자동 배포 대상**이 된다는 뜻이며, 규칙을 느슨하게 하는 것이 아니라 "LEVEL_3 통제 배포 절차를 가볍게 만드는 것"이 다음 과제다(§11).

---

## 5. Shadow mode

- `.github/workflows/cd-risk-gate-shadow.yml` — trigger: `workflow_run(CI Pipeline, completed, main)` + `workflow_dispatch(target_sha)`. PR run 은 제외.
- 순서: checkout(target, full history, 데이터 manifest 제외) → ci-gate(기록만, `--enforce` 없음) → GCP 인증 → `deploy-risk.mjs --target --serving-from-gcloud` → Job Summary + artifact `deploy-risk-shadow-<sha>`(JSON, 30일).
- 기록 항목: target SHA · 서비스별 serving SHA/source/revision · changed files · affected services · risk_level · reasons · level3 hits · deploy_required · CI green · DEPLOY_FREEZE · 현재 게이트 · **would-be 결정** · timestamp.
- would-be 결정 우선순위: `NO_DEPLOY` → `BLOCKED_CI_NOT_GREEN` → `BLOCKED_DEPLOY_FREEZE` → `BLOCKED_HIGH_RISK_CONTROLLED_DEPLOY_REQUIRED` → `AUTO_DEPLOY_WITH_REVISION_SMOKE`.
- **배포 결정에 쓰이지 않는다.** 쓰기 명령 0 (계약 시험: `gcloud run deploy` · `update-traffic` · `jobs execute` · `gh variable set` 부재).

로컬 실측(read-only, target=`cd8c7ab3e`, CI green): risk **LEVEL_3** · 11개 서비스 전부 BEHIND/UNKNOWN. neture 만 L2(`AUTO_DEPLOY_WITH_REVISION_SMOKE`), 나머지는 BLOCKED_HIGH_RISK. web 7개가 L3 인 이유는 09-30 `559740cde` 가 `deploy-web-services.yml` **주석**을 고쳤기 때문(workflow 파일 변경 = 배포 기계 변경 — 보수적 판정).

---

## 6. Phase 4 — zero-traffic revision 검증 · 전환

`rollout_mode` dispatch 입력 (세 workflow 공통). **기본 `legacy` = 종전 동작 그대로** (push 이벤트는 항상 legacy).

| 서비스 | verified 모드 동작 |
|---|---|
| web 9 · admin | plan(배포 전 traffic 기록) → `gcloud run deploy … --no-traffic --tag=sha-<sha12>` → **tag URL(새 revision 전용 주소) HTTP smoke**(`/` 는 HTML 이어야 PASS, signage 는 `/health` 포함, 3회) → PASS 시 전환 → tag 제거 → 전환 상태 확인 |
| API | ingress = `internal-and-cloud-load-balancing` → tag URL 에 러너가 닿지 못한다(실측 확인). **HTTP revision smoke 불가** → 새 revision `Ready` 조건(startup probe = DB 연결 후 listen) 확인 → 전환 → LB `/health/ready` 5회 → 실패 시 **이전 revision 으로 자동 복귀** 후 job 실패 |

- 전환은 **배포 전 방식을 보존**한다: latest 추종 서비스 → `--to-latest`, pin 서비스 → `--to-revisions <new>=100`. (`--no-traffic` 은 latest 추종 서비스를 pin 으로 바꾸므로, 보존하지 않으면 이후 legacy 배포가 0% 로 쌓인다.)
- smoke 실패 → 전환 명령 0 → 기존 revision 유지. 출력 `DEPLOY_FAILED_BEFORE_TRAFFIC_SWITCH SERVICE=<svc> REVISION=<rev>`.
- 새 revision 이 이미 traffic 을 받고 있으면(=`--no-traffic` 누락) smoke 실패로 처리.
- 단위 시험 12/12: 성공 → 전환 · 실패 → traffic 유지(쓰기 0) · 전환 후 실패 → rollback · 방식 보존.
- 실측(read-only): `plan` 이 kpa-society-web · o4o-core-api = pinned, neture-web = latest 로 실제와 일치. web run.app URL 외부 GET → `evaluateSmoke` PASS (tag URL 도 같은 ingress=all).
- 인증 사용자 smoke(Google 로그인 · 2FA · 실계정)는 자동 smoke 에 넣지 않았다.
- **legacy 모드의 기존 Verify step 은 그대로다** — pin 서비스에서 옛 revision 을 보는 문제는 legacy 에 남아 있다(verified 로만 해소).

---

## 7. §22 undefined env

- 확인: `AI_DEFAULT_PROVIDER` · `AI_DEFAULT_MODEL_OPENAI`(vars) · `TOSS_PAYMENTS_CLIENT_KEY` · `TOSS_PAYMENTS_SECRET_KEY`(secrets) 모두 저장소에 없고, Cloud Run 현재 값도 **4개 모두 빈 문자열**(gcloud JSON 이 value 키를 생략).
- 코드: 네 값 모두 `|| 기본값` · `?.trim()` 로 읽는다 → 빈 값과 부재가 같은 동작.
- 구현: deploy-api 의 직접 `--set-env-vars` 4줄 제거 → `cloud-run-env.mjs optional` 이 set/carry/omit 결정. `--set-env-vars` 는 전체 교체라 "생략 = 삭제"이므로, 값이 없고 현재 값이 있으면 **carry(현재 값 재주입, ::add-mask::)**, 둘 다 없으면 omit.
- 실측(read-only): 4개 → `omit` (다음 배포부터 빈 값 설정 대신 생략). carry 경로는 기존 값이 있는 이름으로 read-only 확인(값 출력 0).
- 값 생성 · 추측 · secret 추가 0.

---

## 8. §21 hold 문구 · summary

- 세 workflow 의 `deploy-hold-notice` 에서 종료된 사유("Lecture Phase 2 … data cutover")를 제거하고 `Production deploy currently paused by deployment gate` + 현재 게이트 값 + 운영 방식 + shadow 참조로 교체.
- Web summary 의 "Services deployed: true"(skip 돼도 배포된 것처럼 보임) → "Change detection (not deploy result)" + DEPLOY_ENABLED · ci-gate 결과.

---

## 9. §23 glucoseview-web 판정 = **LEGACY**

| 근거 | 사실 |
|---|---|
| 코드 | `4274982e5`(2026-08-05) "종료된 GlucoseView 서비스 전 계층 잔재 제거" · 서비스 디렉터리 · workflow 없음 |
| DB | `20260600000000-DropGlucoseviewAndCgmTables` |
| Cloud Run | 존재 · 마지막 revision `glucoseview-web-00183-l92` 2026-04-14 · creator `github-actions@…` · latest 추종 100% |
| LB | `neg-glucoseview-web` · `backend-glucoseview-web-advanced` 존재, **URL map(`o4o-global-lb` · `neture-https-frontend-redirect`) 참조 0** — 라우팅되지 않는다 |
| 비용 기록 | `04ca42d4e` 비용 절감 CHECK 가 active 이미지 143일 경과를 기록 |

→ 서비스는 은퇴했고 인프라 잔재만 남았다. 배포 workflow 를 만들지 않았다. 삭제(Cloud Run · NEG · backend)는 **서비스 삭제 = 사용자 승인 대상**이므로 별도 WO 제안.

---

## 10. 테스트 결과

| 대상 | 결과 |
|---|---|
| `scripts/ci/__tests__/*.test.mjs` 전체 (기존 detect-affected 포함) | **154/154 PASS** (deploy-risk 33 · ci-gate 8 · rollout 12 · env 7 · workflow 계약 19 · detect-affected 75) |
| workflow 를 raw text 로 읽는 api-server spec 15개 | **272/272 PASS** (migrate-only 경로 · readiness gate · ref 판정 · migration 소유권 · signage/store 배포 계약 등 — 기존 계약 불변) |
| YAML 파싱 (변경 workflow 4 + composite 1) | PASS |
| ESLint (신규 스크립트 · 테스트) | 0 error · 0 warning |
| 제어문자 스캔 | 0 |
| main 300 commit shadow 재현 | §4-2 |
| 실측 read-only | CI gate 2 · serving SHA 11 서비스 · plan 3 서비스 · optional env 1 · HTTP smoke 판정 2 URL |

**미실측 (production 실행이 필요해 이 WO 에서 하지 않음)**
- verified rollout 전 구간(0% 배포 → tag URL smoke → 전환 → tag 제거) 실제 1회
- API readiness → 전환 → LB 실패 시 rollback 실제 1회
- revision label 전파 (다음 배포 revision 의 `o4o-commit-sha`)
- shadow workflow 의 GitHub Actions 상 첫 실행 (push 후 CI 완료 시 발생)

---

## 11. Cutover readiness

| 조건 (WO §19) | 상태 |
|---|---|
| CI gate PASS | ✅ (enforced) |
| serving SHA detector PASS | ✅ web/admin · ⏳ API 는 첫 label 배포 후 |
| risk detector shadow PASS | ⏳ workflow 준비 완료 · **실 운영 기록 1주 누적 필요** (오탐 0 · 미탐 0 확인) |
| LEVEL 3 detection PASS | ✅ (#257 · 300 commit 재현) |
| revision-specific smoke PASS | ⏳ 단위 · 메커니즘만. 실배포 1회 필요 |
| traffic switch PASS | ❌ 미실행 |
| rollback 확인 | ❌ 미실행 |

→ `DEPLOY_FREEZE_CUTOVER = NOT_READY`.

**cutover 전에 필요한 순서 (제안)**
1. 다음 통제 배포 창에서 **1개 web 서비스**(latest 추종 · 저위험, 예: signage-player 또는 neture)를 `rollout_mode=verified` 로 배포 → smoke · 전환 · label 확인.
2. 같은 창에서 pin 서비스 1개(예: kpa-society) verified → 방식 보존 확인.
3. API 를 verified 로 1회 → label 로 serving SHA 해소 · readiness · 전환 후 검사 확인. rollback 은 `cloud-run-rollout.mjs rollback` 을 명시 실행해 1회 확인.
4. shadow 기록 1주 → 오탐/미탐 검토.
5. 그 뒤 cutover WO: `DEPLOY_FREEZE` 도입(평상시 false) · 배포 trigger 를 `workflow_run(CI success)` 로 · LEVEL_2 자동 · LEVEL_3 거부 · `DEPLOY_ENABLED` 은퇴.
6. LEVEL_3 비율(60%)을 고려해 "LEVEL_3 통제 배포 = 태그 + verified dispatch 1회" 로 절차를 가볍게 문서화.

### DEPLOY_ENABLED · DEPLOY_FREEZE 상태

- `DEPLOY_ENABLED`: **유지 · 의미 변경 없음** (현재 `false`). 삭제하지 않았다.
- `DEPLOY_FREEZE`: 저장소 변수 **미생성**. shadow 판정 입력으로만 읽는다(`vars.DEPLOY_FREEZE == 'true'`). 배포 job 조건에는 아직 넣지 않았다 — cutover WO 에서 `DEPLOY_ENABLED` 대체와 함께 넣는다.
- 수동 dispatch: 그대로 유지(fallback).

---

## 12. Git · 배포 영향

- 이 commit 은 `deploy-*.yml` 자체를 바꾸므로 push 시 세 deploy workflow 가 뜬다. `DEPLOY_ENABLED=false` 이므로 **ci-gate skip → 배포 job skip → hold notice 만** 남는다 (push 직전 변수 값 재확인).
- shadow workflow 는 main 에 들어간 뒤부터 CI 완료 시 동작한다.

## 13. 문서 정합

- 발견 1건: `.github/workflows/README.md` "배포 게이트는 DEPLOY_ENABLED 하나다" — CI gate 추가로 불완전 → 같은 절에 보강(이 WO 범위).
- SUPERSEDED 표기 0 · 링크 수정 0 · 별도 WO 제안 2건: ① cutover WO(§11) ② glucoseview-web 인프라 잔재 삭제(§9).

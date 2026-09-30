# CHECK-O4O-PRODUCTION-PENDING-DELTA-CENSUS-AND-CONTROLLED-RELEASE-V1

> **WO**: WO-O4O-PRODUCTION-PENDING-DELTA-CENSUS-AND-CONTROLLED-RELEASE-V1
> **target SHA**: `e2e1be6cc` (main HEAD, 2026-09-30) · `CI Pipeline` success (run 36714220555) · CodeQL success
> **상태**: **CENSUS 완료 · 배포 계획 사용자 승인 대기 (WO §24)** — production 변경 0
> **선행**: [CHECK-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1](CHECK-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1.md)

---

## 0. 판정 (census 단계)

```text
PENDING_DELTA_CENSUS       = PASS
MIGRATION_SAFETY           = PASS     (serving → target 사이 migration · DB 경로 0 · 운영 DB INCREMENTAL_PENDING=0)
AUTH_RBAC_SAFETY           = PASS     (auth · RBAC · middleware · guard · auth package 변경 0)
CONTROLLED_RELEASE         = NOT_EXECUTED (승인 대기)
WEB_VERIFIED_DEPLOY        = NOT_EXECUTED
PIN_SERVICE_VERIFIED       = NOT_EXECUTED
API_VERIFIED_DEPLOY        = NOT_EXECUTED
ROLLBACK_VERIFICATION      = NOT_EXECUTED
SHADOW_CONTINUITY          = PASS     (shadow run 36713802794 기록 유지)
DEPLOY_ENABLED_FINAL       = FALSE
AUTODEPLOY_CUTOVER         = NOT_EXECUTED
```

---

## 1. 서비스별 pending delta

detector(`scripts/ci/deploy-risk.mjs`) 를 그대로 쓰고, LEVEL_3 사유를 **A = 배포 기계 변경(이번 CI/CD 정비)** / **B = runtime 고위험** 으로 분해했다. 그 뒤 A 를 제외하고 다시 판정해 "실제로 이미지가 바뀌는가"를 구했다.

| service | serving revision | serving SHA | commits | detector | A | B | A 제외 시 | 판정 |
|---|---|---|---|---|---|---|---|---|
| api | `o4o-core-api-03758-wdt` (pin) | `bfa48c135` ※1 | 19 | L3 | deploy-api.yml · Dockerfile · actions · scripts/ci | `db-write-runtime` 3 — **삭제(D)** 된 one-off job 진입점 ※2 | **deploy · L2 의미** | **배포 대상** |
| neture | `neture-web-01665-7wf` (latest) | `21e965436` | 5 | L3 | deploy-web-services.yml · scripts/ci | 0 | deploy · L2 | **배포 대상** |
| store | `store-web-00019-x5v` (latest) | `2edfe9b33` | 125 | L3 | 〃 | 0 | deploy · L2 | **배포 대상** |
| hospital-pharmacy | `hospital-pharmacy-web-00013-2xt` (latest) | `bb26f3a26` | 69 | L3 | 〃 | 0 | deploy · L2 | **배포 대상** |
| admin | `o4o-admin-dashboard-01317-9bx` (pin) | `f838fd036` | 35 | L3 | deploy-admin.yml · scripts/ci | 0 | no deploy | 불필요 |
| kpa-branch | `kpa-branch-web-00180-nlb` (latest) | `f838fd036` | 35 | L3 | deploy-web-services.yml · scripts/ci | 0 | no deploy | 불필요 |
| kpa-society | `kpa-society-web-02001-9wc` (pin) | `2edfe9b33` | 125 | L3 | 〃 | 0 | no deploy ※3 | 불필요 |
| k-cosmetics | `k-cosmetics-web-01169-4dj` (pin) | `2edfe9b33` | 125 | L3 | 〃 | 0 | no deploy ※3 | 불필요 |
| pharmacy-hub | `pharmacy-hub-web-00259-9mj` (pin) | `2edfe9b33` | 125 | L3 | 〃 | 0 | no deploy | 불필요 |
| lecture | `lecture-web-00018-pkv` (pin) | `2edfe9b33` | 125 | L3 | 〃 | 0 | no deploy | 불필요 |
| signage-player | `signage-player-web-00092-bzl` (latest) | `2edfe9b33` | 125 | L3 | 〃 | 0 | no deploy | 불필요 |

※1 **API serving SHA 확정 방법** — label 없음 · buildx index 라 digest 에 태그 없음(detector UNKNOWN). registry push 시각(KST)으로 교차 확정: serving digest `d327…`(09:22:33) = index `b088…` 태그 `bfa48c135`(09:22:34). 또 0% revision `o4o-core-api-03759-cgw` digest `e759…`(16:40:01) = index `c87a…` 태그 `21e965436`.
   - 09-30 07:35 dispatch(`21e965436`)는 revision 을 만들었지만 API 가 02:07Z 부터 `03758-wdt` 에 pin 돼 **트래픽 0%**. 그 run 로그의 gcloud 출력("03758-wdt … serving 100 percent")은 pin 상태에서 **새 revision 을 가리키지 않는다** — 배포 판정을 gcloud 출력으로 하면 안 된다는 근거 (cloud-run-rollout.mjs 는 traffic 상태를 직접 읽는다).
   - `CHECK-O4O-MAIN-AUTOMATION-RESUME-AND-REPLAY-PREFLIGHT-FIX-V1` §3-1 과 일치: "api traffic 미승격 · DEPLOY_PAUSED(사용자 지시: 배포 과정 정비 후 재개)". **현재 production 은 web-neture(21e965436) 가 `4a1bec70e` 프런트 부분을 서빙하고 API 는 그 이전 — 프런트/API 불일치 상태.**

※2 `e2adfe4f3` — `drug-seed-candidate-import-job.ts` 등 7개 one-off DB write Job 진입점과 Dockerfile COPY 삭제. 실행 경로를 **없애는** 변경. 현재 Cloud Run Job 은 `o4o-api-migrations` 하나뿐이라 삭제된 진입점을 참조하는 Job 없음. 규칙상 L3(보수) · 의미상 위험 감소.

※3 `deploy-web-services.yml` 의 build-arg `VITE_SERVICE_URL_KPA_SOCIETY`(kpa-society.co.kr → pharmacy.neture.co.kr) · `_K_COSMETICS`(k-cosmetics.site → retail.neture.co.kr) 가 `773d6c54c` 이후 미배포. 그러나 이 값은 Dockerfile `ENV` 로만 설정되고 **소스 어디에서도 읽히지 않는다**(`git grep` 0) → Vite 번들 불변 → 실효 runtime 변경 없음.
   - **detector 보완 과제**: deploy workflow 의 env/build-arg 변경을 "배포 기계(A)" 로만 보고 서비스별 runtime 변경으로 귀속하지 않는다. 이번에는 무해했지만 소비되는 build-arg 였다면 A 로 가려진다 → 규칙 보완 필요(§6).

---

## 2. 주요 변경 (배포 대상 4개)

| service | commit | 내용 | 위험 검토 |
|---|---|---|---|
| api | `4a1bec70e` | AI work-agent: replay preflight · resume 대상 상속 · resume anchor 유지 (`ai-proxy.routes.ts` · `work-agent-runtime.ts` · `workflow-candidate.ts`) | 인증 · DB 무관. 프런트(neture)는 이미 서빙 중 — **승격이 불일치를 해소** |
| api | `e2adfe4f3` | one-off drug job 진입점 7개 · Dockerfile COPY · image-refresh step 은퇴, `.dockerignore` · `tsup.config.ts` | 이미지에서 파일 제거. main.js · migrate.js 무관 |
| api | `4844bbc98` | 운영 CLI(`src/scripts`) fail-fast — 이미지 밖 | 배포 무영향 |
| api | 8526b64e1 | deploy-api: optional env 4개 빈 값 덮어쓰기 중단(현재 값 모두 빈 값 → 생략, 코드 동작 동일) · commit label · ci-gate · verified | 배포 기계 — 이번 배포가 첫 실측 |
| neture | `31202e731` | API base URL 해석 함수 분리 · dev server 에서만 localhost 기본값 | production build 는 Dockerfile `VITE_API_BASE_URL=https://api.neture.co.kr` 그대로. smoke 에 "번들에 `localhost:3002` 없음" 추가 |
| store | `773d6c54c` | `serviceContext.ts` `SERVICE_PUBLIC_ORIGIN`(QR 호스트 mirror)을 canonical(pharmacy/retail.neture.co.kr)로 | 서버(API)는 이미 canonical 서빙 중 — 프런트가 따라감. 새 호스트 200 확인 |
| hospital-pharmacy | `46a803dbc` · `9b8579ac8` | `hospital-pharmacy-core` surface 판정(일반 약품 질문 fallback · 대상 있는 질문은 조사) | 순수 판정 로직 · 인증/DB 무관 |

---

## 3. Migration census

- `bfa48c135..e2e1be6cc` 에서 `apps/api-server/src/database/**` · `migrate.ts` 변경 **0**.
- 운영 migration Job 최근 3회(`djrk8` 09-29 · `lpvcw` 09-30 00:22 · `ljktw` 09-30 07:40, 마지막은 `21e965436` 이미지) 모두 `DATABASE_STATE=LEGACY_ESTABLISHED` · `CURRENT_INCREMENTAL_PREFIX=9/9` · `INCREMENTAL_PENDING=0` · `INCREMENTAL_EXECUTED=0` · fingerprint MATCH · `MIGRATION_JOB=SUCCESS` (Cloud Logging read-only).
- 배포 시 migration Job 은 자동 실행되며 **예상 결과 PENDING=0 · EXECUTED=0** (새 migration 없음). 별도 승인 대상 migration 없음.

## 4. Auth / RBAC census

- API: `**/auth/**` · `**/middleware/**` · `**/guards/**` · `types/roles.ts` · `packages/auth-*` · `security-core` 변경 **0**.
- web 배포 대상 3개: 인증 관련 파일 변경 0 (변경 파일 전수: neture 5 · store 1 · hospital-core 3).
- #257(이메일/비밀번호 로그인)은 main 밖 — 포함되지 않음. merge · deploy 금지 유지.

## 5. 배포 그룹

| Group | 서비스 |
|---|---|
| **A SAFE NORMAL** | api · neture · store · hospital-pharmacy (runtime 의미 L2, migration 0, auth/RBAC 0, CI green) |
| B CONTROLLED HIGH-RISK | 없음 |
| C HOLD | 없음 (main 기준). #257 은 main 밖 HOLD |
| 배포 불필요 | admin · kpa-branch · kpa-society · k-cosmetics · pharmacy-hub · lecture · signage-player |

## 6. detector 관찰 (규칙 보완 후보 — 이번 WO 에서 수정하지 않음)

1. deploy workflow 파일의 **env/build-arg 변경**을 서비스별 runtime 변경으로 귀속하지 못한다(※3).
2. **삭제(D)** 된 DB write 진입점도 `db-write-runtime` L3 로 본다 — 실행 경로 제거는 위험 감소.
3. API serving SHA: buildx index → label 없으면 UNKNOWN. 이번 배포로 label 이 생기면 해소 예정.
4. 0% 로 남은 revision(`03759-cgw`)은 "배포됐지만 서빙 안 됨" 상태 — detector 는 serving 기준이라 정확히 BEHIND 로 봤다(정상).

---

## 7. 배포 계획 (승인 대기)

**고정**: 태그 `deploy/2026-09-30-pending-delta-release` → `e2e1be6cc` (창 중 main 이 움직여도 대상 SHA 불변). 모든 dispatch 는 이 태그 ref.
**창**: `DEPLOY_ENABLED=true` → 아래 순서로 **한 번에 하나씩**(같은 workflow 다중 dispatch 는 대기 run 이 취소될 수 있다) → 끝나면 즉시 `false`. 예상 30~45분.
**각 dispatch 에서 자동 확인**: ci-gate(첫 실운영 — target CI green 요구) · `o4o-commit-sha` label.

| # | 대상 | 방식 | 트래픽 동작 | 확인 |
|---|---|---|---|---|
| 1 | neture-web | `rollout_mode=verified` | 0% 새 revision → tag URL smoke → **`--to-latest`** (latest 추종 보존) | 새/옛 revision · tag URL · smoke · traffic 전후 · 번들에 `localhost:3002` 없음 |
| 2 | neture-web rollback 실측 | 수동 `update-traffic --to-revisions neture-web-01665-7wf=100` → 공개 URL 200 → `--to-latest` 재전환 | 수십 초간 옛 revision(현재 서빙본과 같은 코드 + local-dev 기본값 차이뿐) | ROLLBACK_VERIFICATION |
| 3 | store-web | verified | latest 추종 보존 | 〃 |
| 4 | hospital-pharmacy-web | verified | latest 추종 보존 | 〃 |
| 5 | o4o-core-api | `rollout_mode=verified` | migration Job(예상 PENDING 0) → 0% revision → Ready → **pin 보존: `--to-revisions <new>=100`** → LB `/health/ready` 5회, 실패 시 `03758-wdt` 자동 복귀 | PIN_SERVICE_VERIFIED + API_VERIFIED · optional env 처리 로그 · label → serving SHA 해소 |
| 6 | shadow 재실행 | `cd-risk-gate-shadow.yml` dispatch (read-only) | — | 배포 서비스 UP_TO_DATE · API serving SHA 가 label 로 읽히는지 |
| 7 | 종료 | `DEPLOY_ENABLED=false` 복구 · 진행 run 0 | — | DEPLOY_ENABLED_FINAL |

**배포하지 않는 것**: admin · kpa-branch · kpa-society · k-cosmetics · pharmacy-hub · lecture · signage-player(실효 runtime 변경 없음) · glucoseview-web · #257 · 0% revision `03759-cgw` 는 그대로 둔다(새 revision 이 대체).

**rollback 방법**: web — `gcloud run services update-traffic <svc> --to-revisions <이전 revision>=100` (plan 에 기록) · API — verify step 이 자동 복귀, 수동은 `--to-revisions o4o-core-api-03758-wdt=100`. DB migration 없음 → 코드 rollback 만으로 완결.

**남는 위험**: 창이 열린 동안 다른 세션이 main 에 push 하면 그 commit 도 (CI green 후) 배포된다 — 창을 짧게 유지, 창 시작 전 병행 세션 확인.

(§8 이후는 실행 후 기록)

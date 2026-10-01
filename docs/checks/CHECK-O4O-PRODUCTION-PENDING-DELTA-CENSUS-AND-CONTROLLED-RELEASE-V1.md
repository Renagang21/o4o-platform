# CHECK-O4O-PRODUCTION-PENDING-DELTA-CENSUS-AND-CONTROLLED-RELEASE-V1

> **WO**: WO-O4O-PRODUCTION-PENDING-DELTA-CENSUS-AND-CONTROLLED-RELEASE-V1
> **target SHA**: `e2e1be6cc` (main HEAD, 2026-09-30) · `CI Pipeline` success (run 36714220555) · CodeQL success
> **상태**: **CONTROLLED RELEASE 완료 (2026-09-30 13:04–13:52Z · 사용자 승인)** — 5개 서비스 배포 · DB write 0 · `DEPLOY_ENABLED=false` 복구
> **선행**: [CHECK-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1](CHECK-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1.md)

---

## 0. 최종 판정

```text
PENDING_DELTA_CENSUS       = PASS
MIGRATION_SAFETY           = PASS     (diff DB 경로 0 · 배포 시 migration Job wr98c: PENDING 0 · EXECUTED 0 · 9/9 · fingerprint MATCH)
AUTH_RBAC_SAFETY           = PASS     (auth · RBAC · middleware · guard · auth package 변경 0)
CONTROLLED_RELEASE         = PASS     (계획한 5개 전부 · 나머지 6개는 실효 변경 없음으로 비대상)
WEB_VERIFIED_DEPLOY        = PASS     (neture · store · hospital-pharmacy — latest 추종 보존)
PIN_SERVICE_VERIFIED       = PASS     (kpa-society web · o4o-core-api — pin 보존)
API_VERIFIED_DEPLOY        = PASS     (Ready → 전환 → /health/ready 200 · rollback 불필요) — 1차 dispatch 는 CI gate 가 fail-closed 차단(§8-3)
ROLLBACK_VERIFICATION      = PASS     (neture: 이전 revision 100% → 옛 번들 서빙 확인 → 재전환 → 새 번들 확인)
SHADOW_CONTINUITY          = PASS     (재실행 36724810709: 배포 5개 UP_TO_DATE · API serving SHA 가 label 로 해소)
DEPLOY_ENABLED_FINAL       = FALSE    (13:51:55Z 확인 · 진행/대기 run 0)
AUTODEPLOY_CUTOVER         = NOT_EXECUTED
PRODUCTION_DB_WRITE        = 0
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

사용자 조정(승인 시): pin 대상 web 검증으로 **kpa-society 를 추가**(실효 runtime 변경 없음 · cutover 선행 검증 목적).

---

## 8. 실행 기록

### 8-0. 창 · 고정

| 항목 | 값 |
|---|---|
| 태그 | `deploy/2026-09-30-pending-delta-release` (annotated) → `e2e1be6cc` |
| target CI | `CI Pipeline` run 36714220555 success |
| 게이트 | 13:04:33Z `true` 설정(13:04:41 반영 확인) → 13:51:54Z `false` (13:51:55 확인) — 약 47분 |
| main | 창 전 · 중 · 후 `ce5830861` 고정 (예상 밖 push 0) |
| 순서 | 한 번에 하나씩 — 앞 단계 실제 상태 확인 후 다음 dispatch |

### 8-1. 서비스별 결과 (판정 근거 = Cloud Run traffic · revision label · job 로그. gcloud 배포 출력 문구는 근거로 쓰지 않음)

| # | service | run | old revision | new revision | label | revision 직접 검사 | 전환 | 공개 확인 |
|---|---|---|---|---|---|---|---|---|
| 1 | neture-web | 36719084850 | `01665-7wf` | `01666-qam` | `e2e1be6cc` | tag URL `sha-e2e1be6ccf08---neture-web…` `/` HTML PASS | `--to-latest` (latest 추종 보존) · tag 제거 | 200 · 번들 ↓ |
| 3 | store-web | 36720755113 | `00019-x5v` | `00020-lez` | `e2e1be6cc` | tag URL PASS | `--to-latest` · tag 제거 | store.neture.co.kr 200 |
| 4 | hospital-pharmacy-web | 36721407626 | `00013-2xt` | `00014-dof` | `e2e1be6cc` | tag URL PASS | `--to-latest` · tag 제거 | neture.co.kr/hospital 200 |
| 5 | kpa-society-web (pin) | 36722733255 | `02001-9wc` | `02008-wiz` | `e2e1be6cc` | tag URL PASS | **pin 보존** `--to-revisions 02008-wiz=100` · tag 제거 | pharmacy.neture.co.kr · kpa-society.co.kr 200 |
| 6 | o4o-core-api (pin) | 36723753741 | `03758-wdt` | `03774-qeq` | `e2e1be6cc` | revision Ready=True (traffic 0%) | **pin 보존** `03774-qeq=100` · tag 제거 | LB `/health/ready` 200 (workflow + 수동) |

- 모든 run 의 `CI gate` job success(6번은 재시도 run) — **CI gate 의 첫 실운영**.
- neture 번들 확인: 운영 entry `index-mqUwf5ew.js` 의 `localhost:3002` 1건은 배포 **전** 번들(`index-CtKBFBcN.js`)에도 있던 `@o4o/auth-client` 의 `window.location.hostname === 'localhost'` 조건부 fallback(`packages/auth-client/src/client.ts:464`). 이번 변경의 `apiBaseUrl.ts` 상수는 production 번들에서 제거됨(배포 전 동일 SHA · 동일 build-arg 로컬 production 빌드로 선확인). 운영 API 는 `api.neture.co.kr`. 기준을 "부재"가 아니라 **"새로 들이지 않음"** 으로 판정 — composite 은 smoke 와 전환 사이에 멈추지 않으므로 이 확인은 배포 전(로컬 빌드) + 배포 후(운영 번들) 두 번 했다.
- API optional env: 4개 모두 `omit` (값 없음 · 현재 빈 값) — 빈 문자열 덮어쓰기 중단 실측.
- API migration Job `o4o-api-migrations-wr98c`: `DATABASE_STATE=LEGACY_ESTABLISHED` · `CURRENT_INCREMENTAL_PREFIX=9/9` · `INCREMENTAL_PENDING=0` · `INCREMENTAL_EXECUTED=0` · fingerprint MATCH · SUCCESS.

### 8-2. neture rollback 실측

| 시각(Z) | 동작 | traffic | HTTP | 서빙 entry |
|---|---|---|---|---|
| 13:17:58 | `update-traffic --to-revisions neture-web-01665-7wf=100` | 01665-7wf 100% | 200 ×3 | `index-CtKBFBcN.js` (옛 번들 — 실제로 되돌아감) |
| 13:18:23 | `update-traffic --to-latest` | LATEST = 01666-qam 100% | 200 ×3 | `index-mqUwf5ew.js` (새 번들) |

약 25초. latest 추종 방식까지 복원. 장애 유발 0.

### 8-3. API 1차 dispatch 차단 (fail-closed 실측)

- run 36723445876: `CI gate` → `DEPLOY_BLOCKED: TARGET_SHA_CI_NOT_GREEN` · `CI_REASON=REQUIRED_CI_MISSING (CI Pipeline)` → `build-and-deploy` skipped (빌드 · migration · 배포 0).
- 같은 SHA 에 대해 직전 web run 4건은 GREEN, 직후 수동 재조회 3회도 `total_count=1 · 36714220555:success` → **GitHub API 가 일시적으로 run 0건을 돌려준 것**(이날 502 · 목록 불일치 다수 관측).
- 조치: 실제 CI green 확인 후 **1회 재시도** → run 36723753741 성공.
- **결함 (보완 과제)**: `ci-gate.mjs` 는 PENDING 만 재조회하고 MISSING 은 즉시 차단한다. push 직후 CI run 이 아직 생성되지 않은 경우에도 같은 차단이 난다 → cutover 전 **MISSING 도 wait 창 안에서 재조회**하도록 수정 필요 (창 중에는 target 고정을 위해 코드 수정하지 않음).

### 8-4. shadow 재실행 (run 36724810709, target `e2e1be6cc`)

| service | serving SHA (source) | 배포 전 → 후 |
|---|---|---|
| api | `e2e1be6cc` (**revision-label**) | UNKNOWN L3 → **UP_TO_DATE** |
| neture · store · hospital-pharmacy · kpa-society | `e2e1be6cc` (revision-label) | BEHIND L3 → **UP_TO_DATE** |
| admin · kpa-branch | `f838fd036` (registry-tag) | BEHIND L3 (A 만) |
| k-cosmetics · pharmacy-hub · lecture · signage-player | `2edfe9b33` (registry-tag) | BEHIND L3 (A 만) |

11개 전부 L3 → **6개 L3(전부 배포 기계 변경 A 뿐)** 로 축소. 남은 6개는 실효 runtime 변경이 없는데도 detector 가 `deploy-web-services.yml` · `deploy-admin.yml` 변경을 "해당 서비스 전부 배포 필요"로 본다(classifyWebDeploy 의 workflow 자체 변경 = 전 서비스 true) → 배포 전까지 L3/BLOCKED 로 남는다.

### 8-5. 서비스별 최종 serving

| service | revision | SHA |
|---|---|---|
| o4o-core-api | `03774-qeq` (pin) | `e2e1be6cc` |
| neture-web | `01666-qam` (latest) | `e2e1be6cc` |
| store-web | `00020-lez` (latest) | `e2e1be6cc` |
| hospital-pharmacy-web | `00014-dof` (latest) | `e2e1be6cc` |
| kpa-society-web | `02008-wiz` (pin) | `e2e1be6cc` |
| o4o-admin-dashboard | `01317-9bx` (pin) | `f838fd036` (실효 변경 없음) |
| kpa-branch-web | `00180-nlb` | `f838fd036` (〃) |
| k-cosmetics · pharmacy-hub · lecture · signage-player | 변경 없음 | `2edfe9b33` (〃) |
| glucoseview-web | 변경 없음 (LEGACY) | — |

**web-neture ↔ API 불일치 해소**: 둘 다 `e2e1be6cc` label revision 이 100% 서빙 (§1 ※1 의 "프런트만 `4a1bec70e` 반영" 상태 종료). `CHECK-O4O-MAIN-AUTOMATION-RESUME-AND-REPLAY-PREFLIGHT-FIX-V1` §3 실 PC 재검증의 선행조건("api traffic 이 4a1bec70e 포함 revision 으로 100% 승격")이 충족됐다 — 재검증 자체는 그 WO 소관.

## 9. 남은 backlog · 후속

- 실효 runtime backlog: **0** (남은 6개는 배포 기계 변경만).
- cutover 전 보완 (별도 WO):
  1. `ci-gate.mjs` — MISSING 을 wait 창 안에서 재조회 (§8-3).
  2. detector — deploy workflow 의 **env/build-arg 변경**을 서비스별로 귀속하고, 주석 · 게이트 로직만 바뀐 workflow 변경은 "전 서비스 배포 필요"로 만들지 않기 (§6-1 · §8-4).
  3. detector — 삭제(D)된 DB write 진입점은 L3 로 보지 않기 (§6-2).
- 0% 로 남은 과거 revision(`o4o-core-api-03759-cgw` 등)은 트래픽 0 · 무해 — 정리는 선택.
- #257 HOLD · glucoseview-web LEGACY · `origin/wo/service-identity-deploy2-boundary` 미처리 — 변동 없음.

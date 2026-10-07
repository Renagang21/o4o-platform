# CHECK — API main lineage 복귀 · 통제 promote (break-glass)

> WO: `WO-O4O-CICD-API-MAIN-LINEAGE-REALIGNMENT-AND-CONTROLLED-PROMOTION-V1`
> 일시: 2026-10-02 (UTC 07:04–07:10)
> 결과: **PASS** — API serving SHA 가 main 계보로 복귀, 11개 재판정 UNKNOWN/L3 0, `DEPLOY_FREEZE=true` 유지 (해제는 별도 결정)

## 1. 배경

- API 는 `o4o-core-api-03789-gic` / `fd3a7c8b5` 를 서빙하고 있었다. `fd3a7c8b5` 는 tag 배포(`deploy/2026-10-02-demo-terms-enforced-pending-api`)로 올라간 SHA 라 main 계보 밖이다.
- 그래서 판정기는 API 를 `UNKNOWN` → `PROMOTE_REFUSED_UNKNOWN_SERVING` (`HELD_LEVEL_3`) 로 판정했다 (`scripts/ci/deploy-orchestrate.mjs` `decidePromoteOne`).
- promote.yml 은 UNKNOWN serving 을 승인으로도 배포하지 않는다. 남은 경로는 break-glass, 즉 `deploy-api.yml` 의 수동 dispatch 다. 사용자가 이 경로를 승인했다. 판정기 예외 경로는 쓰지 않았다.

## 2. Target

| 항목 | 값 |
|---|---|
| 승인 target (최초) | `370f8d75a` |
| 실행 target | **`21a413fde`** — 사전 점검 때 HEAD 이동을 감지해 STOP 했다. `370f8d75a..21a413fde` 는 다른 세션의 CHECK 문서 1개(docs only)였다. dry-run 판정을 다시 돌려 이전과 같음을 확인한 뒤, 사용자에게 다시 승인받았다. |
| 고정 ref | annotated tag `deploy/2026-10-02-api-main-lineage` → `21a413fde` |
| CI (target) | CI Pipeline · CodeQL · Delivery 모두 success |

`fd3a7c8b5 → 21a413fde` 범위 판정 (fixture dry-run):

- API: `LEVEL_3` 4건. 모두 #266 auth 파일(`authentication.middleware.ts` 등)이다. 내용은 운영 이미지와 같고, commit 범위 기준이라 다시 카운트된 것이다. 실질적인 새 auth/RBAC 변경은 0이다.
- 런타임 실변경: `work-agent-runtime.ts` 1건 (87ebdb074, Strong-First Discovery routing, L2). 사용자가 함께 배포되는 것을 인지하고 승인했다.
- migration 파일 diff 0.
- frontend 10개: `BEHIND_NO_RUNTIME_CHANGE`.

## 3. 실행 타임라인 (UTC)

| 시각 | 사건 |
|---|---|
| 07:04:45 | 사전 점검 PASS: 진행 중 non-PR run 0 · origin/main == target · freeze=true · API label `fd3a7c8b5` · CI success |
| 07:04:49 | tag push. 태그 생성 제한 ruleset 을 owner bypass 로 통과했다 (`Bypassed rule violations … creations being restricted`). |
| 07:04:50 | `DEPLOY_FREEZE=false` |
| 07:04:52 | `gh workflow run deploy-api.yml --ref deploy/2026-10-02-api-main-lineage` (입력 없음) → run 36976702838 |
| 07:04:55–07:05:20 | Detect API deploy scope success |
| 07:05:23–07:05:34 | CI gate success |
| 07:05:38 | build-and-deploy 시작 |
| 07:05:44 | **`DEPLOY_FREEZE=true` 복구** (window 54초) |
| 07:09:06 | migration Job `o4o-api-migrations-qxtcc` 완료 |
| 07:09:36 | `o4o-core-api-03792-ded` 배포, traffic 0% |
| 07:09:52 | readiness smoke → traffic 전환 → 공개 `/health/ready` 200 |
| 07:09:58 | build-and-deploy success |

window 스크립트: 이전 window.sh 는 skipped job 까지 active 로 세는 결함이 있었다. 이번 스크립트는 대상 job(`build-and-deploy`) 이 `in_progress` 가 되는 순간만 lock 조건으로 쓰도록 바로잡았다. skipped/failure/cancelled 는 즉시 lock 하고 중단하며, EXIT trap 으로도 lock 한다. 이 스크립트는 scratchpad 의 일회성 스크립트이고 저장소 코드는 바꾸지 않았다.

## 4. 결과

| 항목 | 값 |
|---|---|
| old revision / SHA | `o4o-core-api-03789-gic` / `fd3a7c8b5` |
| new revision / SHA | **`o4o-core-api-03792-ded` / `21a413fde`** |
| label `o4o-commit-sha` | `21a413fde10f4e7231880b3bbe659cdbc5cac464` (일치) |
| traffic | `03792-ded` = 100% (pin 방식 보존) |
| Ready | `Ready` · `ConfigurationsReady` · `RoutesReady` = True |
| `/health/ready` | 200 (workflow verify PASS + 로컬 재확인 200) |
| rollback | 없음 |
| migration | `INCREMENTAL_PENDING = 0` · `INCREMENTAL_EXECUTED = 0` · PRE/POST `SCHEMA_ASSERTION = PASS` · prefix 12/12 |
| production DB write | 0. migration Job 은 실행됐지만 적용한 migration 은 0건이다. 그 외 write 경로는 없다. |
| frontend 배포 | 0 |

## 5. 재판정 (실 serving 기준, plan-only, freeze=true)

| service | serving SHA | status | level | decision | rollout_pending |
|---|---|---|---|---|---|
| api | `21a413fde` | **UP_TO_DATE** | L1 | NO_DEPLOY | — |
| admin | `37d63e859` | BEHIND_NO_RUNTIME_CHANGE | L1 | NO_DEPLOY | false |
| neture | `eab0474f0` | BEHIND_NO_RUNTIME_CHANGE | L1 | NO_DEPLOY | true ¹ |
| k-cosmetics | `37d63e859` | BEHIND_NO_RUNTIME_CHANGE | L1 | NO_DEPLOY | false |
| kpa-society | `37d63e859` | BEHIND_NO_RUNTIME_CHANGE | L1 | NO_DEPLOY | false |
| pharmacy-hub | `37d63e859` | BEHIND_NO_RUNTIME_CHANGE | L1 | NO_DEPLOY | false |
| lecture | `37d63e859` | BEHIND_NO_RUNTIME_CHANGE | L1 | NO_DEPLOY | false |
| store | `37d63e859` | BEHIND_NO_RUNTIME_CHANGE | L1 | NO_DEPLOY | false |
| kpa-branch | `37d63e859` | BEHIND_NO_RUNTIME_CHANGE | L1 | NO_DEPLOY | false |
| signage-player | `2edfe9b33` (registry-tag) | BEHIND_NO_RUNTIME_CHANGE | L1 | NO_DEPLOY | true ¹ |
| hospital-pharmacy | `e2e1be6cc` | BEHIND_NO_RUNTIME_CHANGE | L1 | NO_DEPLOY | true ¹ |

¹ 사유: "rollout 방식만 변경 — 배포 불필요 · 다음 배포 1회는 통제(L3)". 이 값은 판정기가 diff 로 계산하며, 이번 작업 전부터 있던 상태다. 임의로 해제하지 않았다.

UNKNOWN 0 · L3 0 · deploy_required 0. 판정 기준 HEAD 는 `21a413fde` 다. 로컬 실행이라 `head_is_target=false` 로 표시되지만 판정표에는 영향이 없다.

## 6. 후속 관찰 (이 WO 범위 밖)

- 판정 직후 origin/main 에 다른 세션의 `1ce41d5c0` (WO-O4O-PUBLIC-COLLABORATOR-PRODUCTION-BOUNDARY-AND-MAIN-PROTECTION-V1) 가 올라왔다. 수정 범위는 `.github/workflows/deploy-*.yml` · `delivery.yml` 이다. 이 커밋 이후의 재판정은 해당 커밋의 Delivery run 이 정본이다.
- freeze 해제 전에 고려할 것: rollout_pending 3개 서비스는 다음 배포 1회가 통제(L3) 대상이다.

## 7. 판정

```text
API_MAIN_LINEAGE_REALIGNED      = PASS
API_PROMOTION                   = PASS (break-glass deploy-api.yml dispatch, tag ref → 21a413fde)
AFFECTED_SERVICES               = api only
MIGRATION_PENDING               = 0
MIGRATION_EXECUTED              = 0
PRODUCTION_DB_WRITE             = 0
API_VERIFIED_ROLLOUT            = PASS (0% → readiness → 100%, rollback 없음)
API_HEALTH_READY                = 200
SERVING_SHA_MAIN_LINEAGE        = YES (21a413fde)
API_UNKNOWN_AFTER_PROMOTION     = NO (UP_TO_DATE)
FRONTEND_257_L3                 = 0 (frontend 7 NO_DEPLOY 유지)
DEPLOY_FREEZE_FINAL             = true
FREEZE_RELEASE_READINESS        = READY_FOR_DECISION (해제는 별도 결정 · rollout_pending 3 다음 배포 1회 L3 유의)
```

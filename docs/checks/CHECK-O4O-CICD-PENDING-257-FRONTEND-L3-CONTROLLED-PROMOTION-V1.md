# CHECK — #257 Frontend LEVEL_3 Controlled Promotion V1

> WO: `WO-O4O-CICD-PENDING-257-FRONTEND-L3-CONTROLLED-PROMOTION-V1`
> 일자: 2026-10-02 · 상태: **BLOCKED_EXTERNAL (GitHub Actions billing)** — 배포 0 · freeze 복구 완료
> 선행: [CHECK-O4O-CICD-PRODUCTION-STATE-RECONCILIATION-AND-LEVEL3-RULE-PRECISION-V1](CHECK-O4O-CICD-PRODUCTION-STATE-RECONCILIATION-AND-LEVEL3-RULE-PRECISION-V1.md)

---

## 1. 사전검증 (§2 · §4 · §17) — read-only

| 항목 | 값 |
|---|---|
| main HEAD = promote target | `e43d071e3214b6748a35e8c925e021cddd2d85c1` · CI Pipeline success · Delivery BLOCKED_FREEZE (배포 0) |
| DEPLOY_FREEZE | `true` |
| 진행 · 대기 workflow | 0 |
| migration | serving api `353c11d04` → HEAD 의 database · migrations 변경 0 · 마지막 job `o4o-api-migrations-c2xww` (02:27Z) 완료 |
| API serving | `o4o-core-api-03786-lec` = `353c11d04` |

## 2. Freeze ↔ API auto-deploy 상호작용 (§6)

| 질문 | 결과 |
|---|---|
| freeze=false 전환만으로 Delivery 가 시작되는가 | **아니다.** 자동 경로 trigger 는 `workflow_run` (CI Pipeline 완료) 뿐 |
| promote 를 `services` 없이 실행하면 | **API L2 도 같이 PROMOTE** — `decidePromoteOne` 이 `LEVEL_2 (같은 SHA 승격)` 반환 (`scripts/ci/deploy-orchestrate.mjs` L139) |
| window 중 다른 세션 push | 그 CI 가 window 안에 끝나면 Delivery 가 API L2 를 자동 배포 |

→ 결과 B. 분리 방법 = 기존 `services` 입력. 로컬 plan-only dry-run (`--mode promote --freeze false`):

- services 비움 → `plan: api=true · web(parallel)=6 · admin=parallel`
- services = 프런트 7 → `api=NOT_SELECTED` · `plan: api=false · web(parallel)=k-cosmetics,kpa-society,pharmacy-hub,lecture,store,kpa-branch · admin=parallel` · 7 개 모두 `API 와 독립` · neture · signage-player · hospital-pharmacy `NO_DEPLOY`

사용자 결정 (2026-10-02): **services 7 개 지정 + 최소 window**.

### 2-1. Freeze 복구 시점 보정

하위 reusable deploy workflow 의 각 deploy job 이 `if: vars.DEPLOY_FREEZE == 'false'` 를 갖는다 (`deploy-web-services.yml` 서비스별 · `deploy-admin.yml` deploy). `vars` 가 job 평가 시점에 읽히는지 run 시작 시점에 고정되는지 확인되지 않았다 (선례 run `36955274975` 는 `build-and-deploy` 시작 02:22:46Z 뒤 02:22:54Z 에 재잠금 — 고정 여부를 증명하지 못한다). 따라서 복구 시점 = **gate 된 deploy job 8 개(web 7 + admin 1)가 모두 in_progress 가 된 직후**로 정했다. 시작 전 진행 · 대기 CI 0 을 확인해 window 안 foreign Delivery 가능성을 막고, window 중 foreign Delivery `workflow_run` 이 보이면 즉시 잠그도록 했다.

## 3. 실행 (§7)

| 시각 (UTC) | 사건 |
|---|---|
| 04:19:54 | HEAD 재확인 (`e43d071e3`) → `DEPLOY_FREEZE=false` |
| 04:19:57 | `gh workflow run promote.yml -f sha=e43d071e3… -f services=admin,k-cosmetics,kpa-society,pharmacy-hub,lecture,store,kpa-branch -f dry_run=false` → run `36964082637` |
| 04:20:11 | Classify `failure` 감지 → **`DEPLOY_FREEZE=true` 복구** (window ≈ 17 초) |

Classify 실패 원인 (run annotation 원문):

> The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings

→ runner 가 배정되지 않아 Classify 가 시작되지 않았다. API · Web · Web (after API) · Admin · Report 전부 `skipped`. commit status 갱신 없음 (`production` = 03:13Z `BLOCKED_FREEZE` 그대로). 03:51Z PR CI 들도 같은 시각대에 실패 — 계정 단위 billing 문제로 보인다.

## 4. 사후 확인

| 항목 | 값 |
|---|---|
| Cloud Run 11 서비스 | 전부 사전 revision 그대로 · traffic 100% (api `03786-lec` · admin `01317-9bx` · k-cosmetics `01169-4dj` · kpa-society `02008-wiz` · pharmacy-hub `00259-9mj` · lecture `00018-pkv` · store `00020-lez` · kpa-branch `00180-nlb` · neture `01671-xil` · signage-player `00092-bzl` · hospital-pharmacy `00014-dof`) |
| DEPLOY_FREEZE | `true` (04:20:11Z) |
| migration · DB write | 0 · 0 |
| rollout_pending | 변화 없음 (대상 7 중 rollout_pending 없음) |
| pending L3 | 7 그대로 (#257 프런트 auth) |

## 5. 재개 조건

1. GitHub `Billing & plans` 결제 · spending limit 정상화 (사용자 조치)
2. 재개 시 HEAD · CI green · 진행 run 0 · freeze 를 다시 확인. HEAD 가 움직였으면 새 SHA 로 dry-run 재계산 후 진행 (§5 — 기존 승인 재사용 금지)
3. 같은 절차: services = 프런트 7 · deploy job 8 개 in_progress 직후 freeze 복구 · API `NOT_SELECTED` 확인

## 6. 판정

```text
FRONTEND_257_PROMOTION          = FAIL (BLOCKED_EXTERNAL — GitHub Actions billing · job 미시작)
AFFECTED_SERVICES               = 7 (계획) / 실제 배포 0
MIGRATION_EXECUTED              = 0
PRODUCTION_DB_WRITE             = 0
VERIFIED_ROLLOUT                = NOT_STARTED
ROLLOUT_PENDING_UPDATED         = NOT_APPLICABLE
PENDING_257_L3_AFTER_PROMOTION  = NONZERO (7)
DEPLOY_FREEZE_FINAL             = TRUE
API_AUTO_DEPLOY                 = NOT_EXECUTED
```

---

## 7. 재개 시도 (2026-10-02, 저장소 public 전환 후) — HOLD

| 시각 (UTC) | 사건 |
|---|---|
| ~04:5x | 사용자가 저장소를 private → **public** 으로 전환 (Actions billing 차단 해소). workflow 점검: `pull_request_target` · `self-hosted` 0 · Delivery classify 는 `workflow_run.event == 'push'` 만 |
| — | billing 차단 중 실패한 HEAD `38850e50f` CI 를 rerun (attempt 2) → success · 후속 Delivery `36966309593` BLOCKED_FREEZE · 배포 0 |
| — | `38850e50f` dry-run = 이전과 동일 (차이는 이 CHECK 문서 1건) |
| 04:54 | window 사전 점검에서 STOP (freeze 변경 전) — 다른 세션 push `dab919a84` (#266) CI 진행 중 |
| — | `dab919a84` CI success · Delivery `36967118383` BLOCKED_FREEZE · 배포 0 |

`dab919a84` dry-run (services = 프런트 7):

- 프런트 7 = 이전과 동일 (PROMOTE · L3 `auth-package packages/auth-client/src/client.ts` · API 와 독립) · `plan: api=false`
- **api = LEVEL_3** (`NOT_SELECTED`) — #266 이 `authentication.middleware.ts` · `email-auth.controller.ts` · `auth-account.controller.ts` · `policy-acceptance.*` 를 바꿨다 (API 전용, 프런트 파일 0). freeze 해제 뒤에도 API 는 자동 배포되지 않고 promote 대상이다.

§5 (승인 외 commit 유입 → 승인 재사용 금지) 에 따라 새 SHA 실행 여부를 확인 → 사용자 결정 **보류**. promote · freeze 변경 없음.

```text
FRONTEND_257_PROMOTION          = HOLD (사용자 보류 · dab919a84 승인 대기)
PRODUCTION_DEPLOY               = 0
DEPLOY_FREEZE_FINAL             = TRUE
API                             = LEVEL_3 (#266 · NOT_SELECTED)
```

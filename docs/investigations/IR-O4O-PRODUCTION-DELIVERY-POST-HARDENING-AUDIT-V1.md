# IR-O4O-PRODUCTION-DELIVERY-POST-HARDENING-AUDIT-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-06 · **최종 갱신**: 2026-10-06
> **근거 WO/IR**: WO-O4O-PRODUCTION-DELIVERY-POST-HARDENING-AUDIT-V1 · 선행 [CHECK-O4O-CLOUD-BUILD-LEGACY-FOOTPRINT-RETIREMENT-V1](../checks/CHECK-O4O-CLOUD-BUILD-LEGACY-FOOTPRINT-RETIREMENT-V1.md) · [CHECK-O4O-CLOUD-RUN-RUNTIME-SA-LEAST-PRIVILEGE-V1](../checks/CHECK-O4O-CLOUD-RUN-RUNTIME-SA-LEAST-PRIVILEGE-V1.md) · [CHECK-O4O-GITHUB-ACTIONS-GCP-WIF-CUTOVER-V1](../checks/CHECK-O4O-GITHUB-ACTIONS-GCP-WIF-CUTOVER-V1.md)

CI/CD · WIF · IAM · runtime SA hardening 을 마친 뒤 실제로 돈 production Delivery · Promote 기록을 전수 조사했다.
목적은 지금 구조가 반복 운영에서 안정적인지 확인하고, hardening 을 더 할 필요가 있는지 판단하는 것이다.
이미 일어난 운영 기록만 읽었다(GitHub Actions run · job · step 로그, Cloud Run revision 목록, Cloud Run Job 실행 로그, Cloud Audit Log). IAM · workflow · WIF · 배포 정책 · freeze 변경 0, 감사용 배포 0, DB write 0.

---

## 0. 판정

```text
조사 창                              = 2026-10-04T12:36Z ~ 2026-10-06T02:53Z
workflow run                         = 28 (Delivery 21 · Promote 7) — 전부 success

ACTUAL_DEPLOY_COUNT                 = 21   (새 revision 생성 + traffic 100% 전환 + Report DEPLOYED)
API_DEPLOY_COUNT                    = 4
WEB_ADMIN_DEPLOY_COUNT              = 17   (Web 15 · Admin 2)
MIGRATION_PATH_COUNT                = 4    (migration Job 실행 4 · 실제 적용 2건 · pending 0 → 0 2건)
  자동 L2 배포                       = 1    (API · Delivery 37404362099)
  통제 L3 promote 배포               = 20   (promote run 4건)

PERMISSION_DENIED                   = 0 / 21
WIF_AUTH_FAILURE                    = 0 / 54   (WIF 인증 step 54회 전부 success)
RUNTIME_SA_FAILURE                  = 0 / 21   (+ migration Job 4)
AR_PERMISSION_FAILURE               = 0 / 21
MIGRATION_FAILURE                   = 0 / 4
ROLLOUT_FAILURE                     = 0 / 21
ROLLBACK                            = 0 / 21
UNKNOWN_CLASSIFICATION              = 0 / 28 run
UNEXPECTED_L3                       = 0 / 5    (L3 원인 commit)

PROMOTE_REAPPROVAL_CASES            = 0    (같은 묶음을 이전 SHA 로 승인한 뒤 다시 승인한 기록 — 확인 0)
PROMOTE_SCOPE_EXTENSION_CASES       = 3    (L3 발생 뒤 commit 이 누적돼 승인 SHA 가 원 변경 SHA 와 달라진 사례)
  HEAD 불일치로 거절된 promote run   = 0
PROMOTE_REAPPROVAL_POLICY_REVIEW    = NOT_NEEDED   (§4 — 재검토 조건은 §4-4)

POST_HARDENING_STABILITY            = PASS
NEXT_HARDENING_REQUIRED             = NO
```

실제 배포가 10건 이상이고 이상 징후가 0이므로 WO 기준대로 `PASS` 다. 배포 hardening 은 **현재 구조 유지 + 필요할 때만 개선** 단계로 넘긴다.

---

## 1. 조사 범위 · 방법

### 1-1. 창(window)

- **시작 2026-10-04T12:36Z** — 마지막 hardening 인 Cloud Build legacy footprint 은퇴의 회귀 배포(`deploy-web-services` 37201734050, 12:23Z 종료) 다음이다. 이 시점 이후 첫 run 은 Delivery 37202822990(12:38Z)이다.
- **끝 2026-10-06T02:53Z** — 조사 시점 마지막 Delivery 37406175470.
- 창 안에서 `deploy-api.yml` · `deploy-web-services.yml` · `deploy-admin.yml` 의 직접 dispatch(break-glass)는 **0건**이다. 모든 배포는 Delivery(workflow_run) 또는 Promote(workflow_dispatch → Delivery mode=promote) 경로로만 일어났다.

### 1-2. 근거

| 근거 | 무엇을 셌나 |
|---|---|
| `gh run list` · `gh run view --json jobs` | run 28건의 job · step 결론(111 job 실행 · 실패 step 0) |
| run 로그(큰 promote run 2건은 job 단위 로그) | Classify 판정표 · deploy step 출력 · Report 판정 |
| `gcloud run revisions list` (`o4o-core-api`) | API revision 4개(03825 · 03828 · 03831 · 03834)가 deploy 4건과 1:1 |
| Cloud Run Job `o4o-api-migrations` 실행 로그 | 실행 4건의 `INCREMENTAL_EXECUTED` · schema assertion |
| Cloud Audit Log(activity) | `status.code=7`(PERMISSION_DENIED) 0 · `SetIamPolicy` 0 · Cloud Run 쓰기 호출 주체 |

"workflow run 수"와 "실제 배포 수"는 구분했다. 실제 배포 1건 = **새 revision 생성 → 0% smoke → traffic 100% 전환 → Report `DEPLOYED`** 를 모두 만족한 서비스 1개다.

---

## 2. 실제 배포 census

### 2-1. run 분류

| 구분 | run 수 | 결과 |
|---|---|---|
| Delivery → `NO_DEPLOY` | 10 | 배포 0. 런타임 변경 없음(LEVEL_1) |
| Delivery → `HELD_LEVEL_3` | 9 | 배포 0. L3 보류(§3-2) |
| Delivery → `SUPERSEDED` | 1 | 배포 0. 더 새 main commit 이 누적 처리 |
| Delivery → 자동 L2 배포 | 1 | API 1 |
| Promote dry-run | 3 | 배포 0 |
| Promote 실행 | 4 | API 3 · Web/Admin 17 |
| **합계** | **28** | **실제 배포 21** |

Delivery 21건 중 배포를 실제로 한 것은 1건이다. 같은 main SHA 에 Delivery 가 두 번 도는 쌍(예: 37202822990 · 37202913681)은 앞선 commit 의 CI 가 HEAD 이동 뒤에 끝나 그 시점 HEAD 로 다시 판정된 것이다. 둘 다 `NO_DEPLOY` · `SUPERSEDED` 로 끝나 중복 배포는 없다.

### 2-2. 실제 배포 21건

| run | 경로 | target | 서비스 | revision (이전 → 새) |
|---|---|---|---|---|
| 37256583338 | Promote (API 1) | `a68a15d00` | api | 03822-quk → **03825-kax** |
| 37260859488 | Promote (10) | `f66e908ef` | api | 03825-kax → **03828-nec** |
| | | | admin · neture · k-cosmetics · kpa-society · pharmacy-hub · lecture · store · kpa-branch · hospital-pharmacy | 각 새 revision (Report DEPLOYED 10/10) |
| 37392776775 | Promote (API 1) | `4263d5fae` | api | 03828-nec → **03831-wew** |
| 37392779073 | Promote (8) | `4263d5fae` | admin · neture · k-cosmetics · kpa-society · pharmacy-hub · lecture · store · kpa-branch | 각 새 revision (Report DEPLOYED 8/8) |
| 37404362099 | **Delivery 자동 L2** | `e0be29869` | api | 03831-wew → **03834-fuh** |

- 모든 배포가 `rollout_mode=verified` 로 돌았다. 새 revision 을 0% 로 만들고 Ready 확인 뒤 전환했으며, 전환 방식(pin / `--to-latest`)도 이전 그대로 보존됐다.
- API 4건은 전환 뒤 `https://api.neture.co.kr/health/ready` HTTP 200 을 받았다.
- Cloud Audit Log 에서 `github-actions` SA 의 `Services.ReplaceService` 는 **63건**이다. 21 배포 × 3 과 정확히 맞는다(배포당 쓰기 호출 수가 일정하다). 배포 경로 밖의 Cloud Run 쓰기는 **2건**이다. 둘 다 사람 계정이 퇴역 서비스를 삭제한 것이다(`glucoseview-web` · `signage-player-web`, 별도 WO 기록). 승인된 퇴역 작업인 이 2건을 빼면 예상 밖 쓰기는 0이다.
- `hospital-pharmacy` 는 `rollout_pending`(첫 verified rollout)이 이월돼 있었는데, 37260859488 에서 함께 배포되며 해소됐다. 이후 판정은 LEVEL_1 이다.

### 2-3. migration 경로

| Job 실행 | 배포 | 결과 |
|---|---|---|
| `o4o-api-migrations-zp26w` | 37256583338 | `INCREMENTAL_EXECUTED = 1` (`CreateAssistantProceduralMemory…`) · POST assertion PASS |
| `o4o-api-migrations-dknmk` | 37260859488 | pending 0 · executed 0 · PRE/POST assertion PASS |
| `o4o-api-migrations-6sp4c` | 37392776775 | `INCREMENTAL_EXECUTED = 1` (`AddLocalAgentDeviceCapabilities…`) · POST assertion PASS |
| `o4o-api-migrations-5jbx9` | 37404362099 | pending 0 · executed 0 · PRE/POST assertion PASS |

- 4건 모두 `MIGRATION_JOB = SUCCESS` 다. `typeorm_migrations` 는 697 → 698 → 699 행이 됐다. legacy history fingerprint(684행)는 baseline 과 일치를 유지했다.
- 실제 migration 이 있었던 2건은 모두 **L3 promote 경로**로만 적용됐다. 자동 L2 로 migration 이 적용된 사례는 0이다.
- migration Job 은 runtime SA(`o4o-runtime`)로 돌았다. actAs 거부는 0이다.

---

## 3. 이상 징후 판정

### 3-1. 실패 계열 — 전부 0

| 항목 | 결과 | 근거 |
|---|---|---|
| PERMISSION_DENIED | 0 | Audit Log `status.code=7` 0건 · run 로그 `denied` / `does not have permission` 0 |
| WIF / auth | 0 | `Authenticate to Google Cloud` step 54회 전부 success |
| Runtime SA / actAs | 0 | 배포 21 · migration Job 4 전부 성공 |
| Artifact Registry | 0 | `Build and push` step 21회 전부 success(AR writer repo scope) |
| migration | 0 | §2-3 |
| readiness / smoke | 0 | 0% smoke · 전환 후 공개 검사 전부 PASS |
| traffic switch | 0 | 21건 모두 새 revision 100% |
| rollback | 0 | `Verify after switch (rollback on failure)` 가 rollback 분기로 들어간 사례 0. 전환 대상은 전부 새 revision |
| Cloud Run IAM 변경 | 0 | `SetIamPolicy` 0(반복 배포에서 IAM 을 건드리지 않는 계약 유지) |

**오탐 1종 기록**: Audit Log 에 `Jobs.CreateJob` `status.code=6`(ALREADY_EXISTS) 4건이 ERROR 등급으로 남는다. `deploy-api.yml` 의 migration 단계가 `gcloud run jobs create … || gcloud run jobs update …` 로 쓰여 있어, Job 이 이미 있으면 create 가 실패하고 update 로 넘어간다. 의도된 동작이고 권한 문제가 아니다. 다만 Audit Log 로 오류를 셀 때 매 API 배포마다 1건씩 섞인다(§5 관찰 항목).

### 3-2. 판정 계열

**UNKNOWN 0.** 28 run 의 판정표 전 행에서 serving SHA 출처는 `revision-label` 이다. `UNKNOWN` · `PROMOTE_REFUSED_UNKNOWN_SERVING` 은 0건이다(2026-10-02 의 release 브랜치 격리 배포로 생긴 UNKNOWN 은 이 창 전에 해소됐다).

**L3 판정 사유 — 예상 밖 0.**

| 원인 commit | L3 사유(규칙) | 대상 | 실제 내용 | 판정 |
|---|---|---|---|---|
| `57b1dc149` | db-migration | api | 실제 migration 1건 | 예상대로 |
| `b67a15a5b` | db-migration | api | 실제 migration 1건 | 예상대로 |
| `9e2e95571` | deploy-infra (삭제된 `services/signage-player-web/Dockerfile`) + lockfile | api · admin · web 8 | 퇴역 서비스 소스 삭제 · lockfile importer 정리 · API CORS 퇴역 origin 제거 | 규칙대로(web · admin 쪽은 보수적 — §5 O2) |
| `6a9ac2df4` | auth-package (`packages/auth-react`) | admin · web 7 | 로그인 UI 변경 | 예상대로 |
| `4263d5fae` | auth-frontend / auth-package | admin · web 7 | 로그인 진입 · 복귀 흐름 변경 | 예상대로 |

이후 commit 의 HOLD 는 모두 `BLOCKED_BY_PENDING_LEVEL3 since <원인>` 으로 이월 표시됐고 새 L3 사유는 아니었다. LEVEL_2 인데 HOLD 되거나, LEVEL_3 인데 자동 배포된 사례는 0이다.

---

## 4. Promote 재승인 현상 조사 (정책 변경 없음)

`promote.yml` 은 `sha == main HEAD == workflow SHA` 를 요구한다. HEAD 가 움직이면 거절하고, 최신 SHA 로 다시 승인하게 한다. 그래야 승인 없이 뒤의 commit 이 섞이지 않는다. 이 창에서 "처음 L3 를 만든 SHA 와 실제 승인한 SHA 가 달라진" 사례를 셌다. 이 사례는 **승인 범위 확장**으로 부른다. 이전 SHA 로 승인한 뒤 다시 승인한 **재승인**과 구분하며, 재승인은 기록으로 입증될 때만 센다.

### 4-1. 사례

| # | L3 원인 → 승인 SHA | 사이의 HEAD 이동 | 이동한 commit 의 성격 | 보류 → 배포 완료 |
|---|---|---|---|---|
| A | `57b1dc149` → `a68a15d00` | 3회 | `4cfcbf339` **CI 판정 스크립트(deploy-risk · detect-affected) + workflow + api 1 파일** · `e6ff76c23` workflow + docs · `a68a15d00` docs | 23:42Z → 02:51Z (약 3시간 9분) |
| B | `9e2e95571` → `f66e908ef` | 1회 | `f66e908ef` **docs 전용**(46 파일) | 03:41Z → 03:59Z (약 18분) |
| C | `b67a15a5b` → `4263d5fae` | 3회 | `85b50d8db` docs + `packages/ai-core` · `6a9ac2df4` auth UI(새 L3 사유) · `4263d5fae` auth UI(새 L3 사유) | 07:13Z → 00:25Z(+1일) (약 17시간) |

- **HEAD 불일치로 거절된 promote run 은 0건이다.** 창 안의 promote 7건은 모두 dispatch 시점의 HEAD 와 일치했다. 승인 SHA 변경은 실패 run 으로 드러나지 않았다. 승인 요청 시점에 최신 HEAD 를 대상으로 고르는 방식으로 반영됐다.
- **이전 SHA 로 이미 승인한 뒤 다시 승인했다는 기록은 3건 모두에서 확인되지 않는다.** B 에 인용할 수 있는 [CHECK-O4O-RETIRED-WEB-RESIDUAL-CLEANUP-V1](../checks/CHECK-O4O-RETIRED-WEB-RESIDUAL-CLEANUP-V1.md) §4-1 도 "promote 는 main HEAD 기준이라 `f66e908ef` 로 진행"했다는 사실만 적는다. `9e2e95571` 승인이 먼저 있었다는 기록은 없다. A · C 는 승인 시점 기록이 저장소에 없다. 그래서 확정하는 사실은 세 묶음에서 L3 가 생긴 뒤 commit 이 더 쌓여 승인 SHA 가 달라졌다는 것까지다. 이 3건은 재승인 횟수 · 비용에 넣지 않는다.

### 4-2. 지연 (승인 범위 확장 기준 — 재승인 비용 아님)

- **B**: HEAD 이동 때문에 늘어난 몫은 `f66e908ef` 의 Delivery 1 cycle(약 3분)과 dry-run 1회가 상한이다. 운영 지연은 무시할 수준이다.
- **A**: 3시간 중 대부분은 같은 시간대의 퇴역 웹 정리 작업(PR #306 · #307 · #305 연속 merge)을 기다린 시간이다. HEAD 고정 규칙이 직접 만든 지연은 아니다.
- **C**: 17시간 중 마지막 약 16시간 동안 HEAD 는 `4263d5fae` 에 고정돼 있었다(08:07Z ~ 다음날 00:12Z). 지연은 사람의 승인 대기에서 왔고 HEAD 고정 규칙과는 무관하다. 같은 SHA 에 dry-run 이 2회(11:37Z · 00:09Z) 있었던 것도 HEAD 이동이 아니라 시간이 지난 뒤의 재확인이다.

### 4-3. 안전성 기여 (최신 HEAD 로 승인하게 한 효과)

- **A — 기여 있음.** 승인 묶음에 `4cfcbf339`(배포 판정 스크립트 자체 + api 1 파일)가 들어 있었다. 원 SHA `57b1dc149` 로 승인했다면 판정기 변경이 승인자 눈에 띄지 않은 채 같이 배포됐을 것이다.
- **B — 기여 없음.** docs 전용 이동이라 배포 산출물은 같다. 절차만 한 번 더 돈 것이다.
- **C — 기여 있음.** 사이에 들어온 `6a9ac2df4` · `4263d5fae` 는 그 자체로 새 L3 사유(auth UI)였다. 최신 SHA 로 승인하는 것이 맞다.

### 4-4. 판정

```text
PROMOTE_REAPPROVAL_CASES          = 0   (반복 승인 기록 없음)
PROMOTE_SCOPE_EXTENSION_CASES     = 3   (안전 기여 2 · 절차만 1)
HEAD 고정이 만든 실질 지연        = 상한 약 3분 (B) — A · C 의 지연은 다른 원인
PROMOTE_REAPPROVAL_POLICY_REVIEW  = NOT_NEEDED
```

반복 승인이 일어났다는 증적은 없다. 승인 범위 확장 3건 중 2건에서는 최신 HEAD 로 승인하게 한 규칙이 새 위험 변경을 승인 범위에 드러냈다. 절차만 남은 경우는 docs 전용 1건이었고 비용은 몇 분이었다. 지금 HEAD 고정 규칙을 완화할 근거는 없다.

**재검토 조건**(이 중 하나가 생기면 정책 검토 WO 를 연다):
1. docs 전용(runtime diff 0) HEAD 이동 때문에 생긴 재승인 또는 승인 범위 확장이 한 번의 L3 묶음에서 2회 이상 반복되거나, 30일 안에 5회를 넘는다.
2. HEAD 이동으로 promote run 이 실제 거절돼 재실행한 사례가 나온다.
3. 재승인 대기 때문에 운영 장애 대응 배포가 늦어진 사례가 나온다.

---

## 5. 관찰 항목 (지금은 조치 불필요)

hardening 결함이 아니다. 다음 개선 WO 를 열 때 참고할 수 있도록 기록만 한다.

| # | 관찰 | 영향 | 지금 판단 |
|---|---|---|---|
| O1 | migration Job `create \|\| update` 패턴이 API 배포마다 Audit Log 에 ALREADY_EXISTS ERROR 1건을 남긴다 | 오류 집계 · 경보를 만들 때 오탐이 생긴다 | 그대로 둔다. 경보를 만들 때 이 1종을 제외한다 |
| O2 | 퇴역 서비스 소스 삭제(`9e2e95571`)가 deploy-infra · lockfile 규칙으로 api · admin · web 8 전체를 L3 로 만들었다 | promote 1회로 10개 서비스가 재배포됐다(web 8 · admin 은 런타임 소스 변경 0, api 만 CORS 변경) | 규칙대로 동작한 것이고 빈도가 낮다(퇴역 작업 때만 생김). 보수 판정을 유지한다 |
| O3 | 같은 SHA 에 Delivery 쌍이 생긴다(늦게 끝난 앞 commit 의 CI → 현재 HEAD 로 재판정) | 판정 run 이 늘어난다. 배포 중복은 0 | 영향 없음 |
| O4 | 자동 L2 배포가 이 창에서 1건뿐이다 | 대부분의 런타임 변경이 migration · auth 성격이라 L3 로 갔다 | 정상. 자동 경로는 첫 L2 에서 수동 개입 0 으로 끝났다 |

---

## 6. 결론

- 마지막 hardening 이후 production 배포 21건(API 4 · Web 15 · Admin 2)과 migration Job 4건(실제 적용 2)이 권한 · 인증 · runtime SA · AR · migration · rollout 오류 없이 끝났다. rollback · UNKNOWN 판정 · 예상 밖 L3 는 모두 0이다.
- `POST_HARDENING_STABILITY = PASS`, `NEXT_HARDENING_REQUIRED = NO`.
- 배포 hardening 트랙은 **현재 구조 유지 + 필요할 때만 개선**으로 넘긴다. promote HEAD 고정 정책은 유지하고, §4-4 재검토 조건이 생기면 다시 본다.
- `DEPLOY_FREEZE = false`(2026-10-03 이후 변경 없음) · 마지막 Delivery(37406175470) 기준 10개 서비스 전부 `NO_DEPLOY`(L3 보류 0 · UNKNOWN 0)다.

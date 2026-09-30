# CHECK-O4O-CICD-DEPLOY-FREEZE-CUTOVER-V1

> **WO**: WO-O4O-CICD-DEPLOY-FREEZE-CUTOVER-V1
> **cutover commit**: `f505e661d` (cutover) + `bb1699388` (자가 검증 오탐 보정) — push 2026-09-30 17:10Z
> **선행**: [조사](../investigations/CHECK-O4O-CICD-PRODUCTION-DEPLOY-CENSUS-AND-SIMPLIFICATION-V1.md) · [SAFE-AUTODEPLOY](CHECK-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1.md) · [CONTROLLED-RELEASE](CHECK-O4O-PRODUCTION-PENDING-DELTA-CENSUS-AND-CONTROLLED-RELEASE-V1.md) · [REFINEMENT](CHECK-O4O-CICD-CI-GATE-STABILIZATION-AND-RISK-DETECTOR-REFINEMENT-V1.md)
> **상태**: **CUTOVER DONE** · 첫 자연 LEVEL_2 자동 배포 검증 PENDING

---

## 0. 최종 판정

```text
CUTOVER_IMPLEMENTATION          = PASS
DEPLOY_FREEZE_CANONICAL         = PASS   (정확히 'false' 만 배포 · 부재/공백/true/오타 = freeze)
DEPLOY_ENABLED_RETIRED          = PASS   (결정 로직 참조 0 · 저장소 변수 삭제 2026-09-30 17:2xZ)
CI_GATE                         = PASS
RISK_ENFORCEMENT                = PASS   (shadow → deploy-auto enforcement · 기록 유지)
LEVEL1_NO_DEPLOY                = PASS   (cutover commit 실 run 36750835710 · 11개 NO_DEPLOY · dispatch 0)
LEVEL2_AUTODEPLOY               = READY  (결정 실측: fixture 31202e731 → AUTO_DEPLOY. 실 dispatch 는 첫 자연 L2 변경에서)
LEVEL3_BLOCK                    = PASS   (#257 fixture → 전 서비스 AUTO_DEPLOY_BLOCKED reason=LEVEL_3)
ROLLOUT_PENDING_GUARD           = PASS   (단위 · 6개 서비스 rollout_pending 유지 확인)
VERIFIED_ROLLOUT_DEFAULT        = PASS   (자동 = verified 강제 · 수동 dispatch 기본값도 verified)
EMERGENCY_FREEZE                = PASS   (true → L2 fixture BLOCKED_DEPLOY_FREEZE · 수동 dispatch 차단 → false 복구)
PRODUCTION_DB_WRITE             = 0
AUTODEPLOY_CUTOVER              = EXECUTED
FIRST_RUNTIME_AUTO_DEPLOY       = PENDING
```

Production 변경: 저장소 변수 2건(`DEPLOY_FREEZE` 생성 · `DEPLOY_ENABLED` 삭제)만. **배포 0 · traffic 변경 0 · DB write 0 · migration 0.**

---

## 1. 전환 결과 — O4O production deploy 표준

```text
main push → CI Pipeline → deploy-auto.yml (workflow_run, 경로 필터 없음)
  CI gate (target SHA green · MISSING/PENDING 제한 재조회)      → 아니면 BLOCKED_CI_NOT_GREEN
  DEPLOY_FREEZE == 'false'                                     → 아니면 BLOCKED_DEPLOY_FREEZE
  target == main HEAD                                          → 아니면 SUPERSEDED_BY_NEWER_MAIN
  서비스별 serving SHA → target 누적 diff 판정
    LEVEL_1                          → NO_DEPLOY
    LEVEL_2                          → AUTO_DEPLOY (verified)
    LEVEL_2 + rollout_pending        → CONTROLLED_FIRST_ROLLOUT_REQUIRED
    LEVEL_3 · serving 판정 불가       → AUTO_DEPLOY_BLOCKED reason=LEVEL_3
    API 배포 대상인데 자동 배포 안 됨  → 프런트 HELD_API_NOT_DEPLOYED
  AUTO_DEPLOY → deploy/auto-<sha12> 태그 → deploy-api 먼저(성공 확인) → web · admin dispatch (rollout_mode=verified)
비상 · 정비 → DEPLOY_FREEZE=true
```

사람의 개입: LEVEL_3 · 첫 rollout 의 통제 배포(태그 + 수동 dispatch), `DEPLOY_FREEZE` 해제, 비상 freeze.

## 2. 구현

| 파일 | 내용 |
|---|---|
| `.github/workflows/deploy-auto.yml` | **신규** 자동 배포 진입점 (shadow workflow 대체). `workflow_run(CI Pipeline, main)` + dispatch(dry-run 기본 · fixture base/head). target = `workflow_run.head_sha`. `concurrency: deploy-auto`. permissions contents:write(태그) · actions:write(dispatch) |
| `scripts/ci/deploy-orchestrate.mjs` | **신규** `isFrozen` · `decideOne` · `decideAll`(API 의존 규칙) · `executeDecisions`(태그 고정 · API 먼저 · 성공 확인 뒤 프런트) · GitHub client |
| `.github/workflows/deploy-{api,web-services,admin}.yml` | push trigger 은퇴(수동 통제 dispatch 전용) · 게이트 `vars.DEPLOY_FREEZE == 'false'`(ci-gate · 배포 job · api migrate_only 포함) · `freeze-notice` job · `rollout_mode` 기본 `verified` · 서비스 단위 concurrency(`deploy-api-production` · `deploy-web-<service>` · `deploy-admin-production`) |
| `.github/workflows/cd-risk-gate-shadow.yml` | **삭제** — deploy-auto 가 판정 기록(Job Summary + artifact 30일)을 이어받음 |
| `scripts/ci/deploy-risk.mjs` | CONTROL_ONLY 에 orchestrator · deploy-auto 추가 · `CONTROLLED_FIRST_ROLLOUT_REQUIRED` · DEPLOY_ENABLED 제거 |
| `scripts/ci/deploy-workflow-diff.mjs` | `if:` 조건식(한 줄 · `if: >-` 여러 줄)을 control 로 (§6 자가 검증 오탐) |
| 테스트 | orchestrate 18 · workflow 계약 갱신(freeze · trigger · concurrency · deploy-auto) · diff W10 · detect-affected 옛 push-trigger 단언 → deploy-auto 무필터 보장으로 이관 · api spec 3개(migrate-only 를 freeze 의미로 · signage/store 는 registry 기준) |
| 문서 | README 배포 절 · 변경 원칙, `.github/workflows/README.md`, `.github/SECRETS_SETUP.md`, `docs/development/COLLABORATOR-START-HERE.md` |

## 3. DEPLOY_FREEZE 정책 (§4 · §5 · §21)

- 판정: **정확히 `'false'`(대소문자 무관) 일 때만 배포**. GitHub 식 `vars.DEPLOY_FREEZE == 'false'` 는 대소문자 무시 비교이고, 변수가 없으면 빈 문자열 → 불일치 → freeze. `true` · `TRUE` · `1` · `yes` · 공백 · 오타(`flase`) 전부 freeze (단위 F1 · F2).
- 근거: "변수 누락 = 자동 배포 허용" 이 되면 변수 삭제 · 오타 한 번이 무제한 자동 배포가 된다. fail-closed 가 기본.
- **진행 중 rollout**: freeze 는 **새 job 시작**을 막는다(각 deploy job · ci-gate 의 `if`, deploy-auto 판정). 이미 시작된 run 은 그 run 안에서 smoke → 전환 → 검증 · rollback 까지 마친다. 전환 전 smoke 실패는 원래대로 전환 0, API 전환 후 health 실패는 이전 revision 복귀. (진행 중 run 안에서 변수를 다시 읽지 않는다 — GITHUB_TOKEN 의 variables 읽기 권한이 불명확해 도입하지 않았다. rollout 1회는 수 분 단위.)
- freeze 는 `migrate_only` 에도 적용 (정책 변경 — freeze 중 migration 0).

## 4. DEPLOY_ENABLED 은퇴 (§6 · §23)

| 단계 | 결과 |
|---|---|
| 참조 census | workflow 3종(게이트 · hold · 주석) · shadow workflow · README 2곳 · SECRETS_SETUP · COLLABORATOR · api spec · 테스트 fixture · 판정기 주석 |
| 코드 참조 제거 | `origin/main` 의 `.github` · `scripts`(테스트 제외) 결정 로직 참조 **0** (계약 시험 고정: workflow · action 에 `DEPLOY_ENABLED` 없음) |
| 남은 언급 | SECRETS_SETUP · workflows README 의 "은퇴" 설명, 계약 시험의 "없어야 한다" 단언, 과거 CHECK 기록물(불변) |
| 변수 | cutover push · freeze 차단 실측 뒤 **삭제** (`gh variable list` 에서 사라짐 확인) |

## 5. 서비스 독립 판정 · 의존 규칙 (§11)

- 판정은 서비스별 독립이다 — 예: API 무변경 · KPA L2 · store L3 → KPA 만 배포 (단위 I1).
- **API 의존 규칙**: API 가 배포 대상인데 자동 배포되지 않으면(L3 · 첫 rollout · 실패) web · admin 의 L2 도 `HELD_API_NOT_DEPLOYED`. 근거: 프런트는 같은 target 의 API 변경에 의존할 수 있다 — 2026-09-30 실측(neture 프런트만 반영 · API 미반영 불일치). 프런트끼리 · 프런트→API 방향은 서로 막지 않는다.
- API 와 프런트가 함께 L2 면 **API 먼저 dispatch → 완료 · success 확인 → 프런트 dispatch**. API 실패 · 45분 초과 → 프런트 dispatch 0 (단위 X3 · X4).

## 6. cutover 자가 검증 (push 전)

cutover commit 자체를 판정기에 넣었더니 API 가 `deploy-config` L3 — `build-and-deploy` 의 **if 조건식** 안 `migrate_only` 가 config 패턴(`migrat`)에 걸렸다(오탐 · 안전 방향). `if:` 조건식을 control 로 분류하도록 보정(`bb1699388`, 단위 W10) → cutover 가 **11개 서비스 NO_DEPLOY · L1**. main 300 commit 재현 결과 불변(L1 188 · L2 48 · L3 64 · migration 미탐 0 · 하향/상향 0). 배포된 5개 서비스에 rollout_pending 이 새로 붙지 않음 확인.

## 7. Production 순서 (§27) · 실측

| # | 시각(Z) | 동작 | 결과 |
|---|---|---|---|
| 1 | 17:09 | main `ed8d463d0` · CI GREEN · 진행 run 0 · 병행 workflow 변경 0 확인 | OK |
| 2–3 | 17:10:27 | `DEPLOY_FREEZE=true` **생성** (코드가 읽기 전) | 반영 확인 |
| 4 | 17:10 | cutover push `ed8d463d0..bb1699388` | push 트리거 deploy workflow **0** |
| 5 | — | CI Pipeline | success · CodeQL failure(기존 SARIF upload — advisory) |
| 6a | — | 수동 `deploy-web-services` service=neture (freeze 중) run `36749569580` | `freeze-notice` 만 · CI gate · 배포 job 9개 **skipped** |
| 6b | — | `deploy-auto` 첫 자동 실행 run `36750835710` (ENFORCEMENT) | CI GREEN · frozen=true · 11개 NO_DEPLOY · dispatch 0 |
| 6c | — | fixture L2 `31202e731` (freeze 중) run `36751158081` | neture L2 → **BLOCKED_DEPLOY_FREEZE** |
| 7 | 17:2x | `DEPLOY_ENABLED` 참조 0 재확인 → 변수 **삭제** | 목록에서 제거 |
| 8 | 17:26:03 | `DEPLOY_FREEZE=false` | 반영 확인 |
| 9 | — | fixture L2 `31202e731` run `36751374395` | neture **AUTO_DEPLOY** (dry-run · dispatch 0) |
| 10 | — | fixture L3 #257 (merge-base..head) run `36751490736` | api · admin · 7 web **AUTO_DEPLOY_BLOCKED reason=LEVEL_3** (auth-backend · auth-package) |
| 11 | — | fixture 혼합 `773d6c54c` run `36751640107` | api L3 BLOCKED → store L2 **HELD_API_NOT_DEPLOYED** |
| 12 | 17:29:33 | **비상 freeze** `DEPLOY_FREEZE=true` → fixture L2 run `36751759746` | neture **BLOCKED_DEPLOY_FREEZE** |
| 13 | 17:30:35 | `DEPLOY_FREEZE=false` 복구 | 반영 확인 |

fixture 모드(base/head)는 스크립트가 dry-run 을 강제한다 — 실측 중 dispatch · 태그 생성 0 (`deploy/auto-*` 태그 0개 확인).

## 8. rollout_pending 6개 서비스 (§12 · §13)

`admin` · `kpa-branch` · `k-cosmetics` · `pharmacy-hub` · `lecture` · `signage-player` — serving revision 이 verified 배포 방식 이전 것. 저장소 없이 **serving SHA → target diff 에서 매번 계산**되므로 별도 상태 저장 0: 첫 verified 배포(통제)가 끝나 serving SHA 가 바뀌면 자동으로 `false` 가 된다. 실제 runtime 변경이 오면 → `CONTROLLED_FIRST_ROLLOUT_REQUIRED`(자동 배포 안 함) → 사람이 태그 + `rollout_mode=verified` 수동 dispatch 1회.

## 9. 동시성 · newer commit (§18 · §19)

- 서비스 단위 concurrency group, `cancel-in-progress: false` — 진행 중 rollout 은 끝까지, 대기 run 은 GitHub 규칙대로 더 새 dispatch 로 대체(새 target 의 누적 diff 가 이전 변경을 포함).
- deploy-auto 는 `target == main HEAD` 일 때만 dispatch — CI 완료 순서가 뒤바뀌어도 오래된 commit 이 새 commit 을 덮지 않는다(`SUPERSEDED_BY_NEWER_MAIN`).
- deploy-auto 자체도 `concurrency: deploy-auto` 로 한 번에 한 판정.
- 수동 `service=all` 은 개별 서비스 group 과 다르다 — 자동 배포와 동시에 쓰지 않는다(문서화).

## 10. 테스트

| 대상 | 결과 |
|---|---|
| `scripts/ci/__tests__` 전체 | **220/220** |
| workflow · scripts 를 읽는 api-server spec (15 + docs 소비 3) | 전부 PASS (migrate-only 21 · signage/store 33 · 기타) |
| YAML 파싱 · ESLint · 제어문자 | PASS · 0 · 0 |
| main 300 commit 재현 | 불변 (§6) |

## 11. 현재 serving (2026-09-30 17:3xZ, read-only — controlled release 직후와 동일)

api `03774-qeq` · neture `01666-qam` · store `00020-lez` · hospital-pharmacy `00014-dof` · kpa-society `02008-wiz` (이상 `e2e1be6cc`) · admin `01317-9bx` · kpa-branch `00180-nlb` · k-cosmetics `01169-4dj` · pharmacy-hub `00259-9mj` · lecture `00018-pkv` · signage-player `00092-bzl` · glucoseview-web `00183-l92`(LEGACY, 불변).

## 12. 첫 LEVEL_2 자동 배포 (§30)

`FIRST_RUNTIME_AUTO_DEPLOY = PENDING` — 테스트용 runtime 변경을 만들지 않는다. 다음 자연 L2 변경(rollout_pending 이 아닌 api · neture · store · hospital-pharmacy · kpa-society 중)에서 확인할 것:
deploy-auto `AUTO_DEPLOY_DISPATCHED` → deploy run 의 CI gate → verified(0% → smoke → 전환) → serving label = target → 다음 deploy-auto 에서 UP_TO_DATE. 결과는 이 문서 §13 에 추가한다.

## 13. 후속 기록

(첫 자연 L2 자동 배포 후 기록)

## 14. 불변 · 남은 것

- #257 HOLD · glucoseview-web LEGACY · `origin/wo/service-identity-deploy2-boundary` 미처리(이제 deploy workflow 와 확실히 충돌) — 변동 없음.
- 원래 작업공간(`o4o-platform`)은 사용하지 않았다.
- 운영 잔여: rollout_pending 6개의 첫 통제 배포(실제 변경 발생 시).

## 15. 문서 정합

발견 4건(README 배포 절 · 변경 원칙 / workflows README / SECRETS_SETUP / COLLABORATOR — `DEPLOY_ENABLED` 운영 설명) → 모두 이 WO 범위로 갱신. SUPERSEDED 표기 0 · 링크 수정 0 · 별도 WO 제안 0.

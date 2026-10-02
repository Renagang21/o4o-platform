# GitHub Actions Workflows

이 폴더의 워크플로 목록이다. **배포 인프라·서비스 대응표의 정본은
[`scripts/README.md`](../../scripts/README.md)** 이며, 여기서는 중복 서술하지 않는다.

## 검증 (CI)

| 워크플로 | 트리거 | 역할 |
|---|---|---|
| `ci-pipeline.yml` | main push · PR | type-check · lint(ratchet) · test · build · **affected Web production build(vite)**. **대부분 blocking** |
| `ci-guard-policy.yml` | PR (`services/web-*/src/**`) | RoleGuard 정적 분석 (GUARD-005~007) |
| `ci-appstore-guard.yml` | manifest·lifecycle 변경 | App Store 일관성 가드 |
| `ci-security.yml` | main push · PR · 주간 | CodeQL 보안 분석 |
| `e2e-auth-runtime.yml` | 수동 · auth 관련 경로 변경 | 4개 서비스 auth 런타임 E2E |

## 배포

| 워크플로 | 대상 |
|---|---|
| `deploy-api.yml` | `o4o-core-api` (+ 마이그레이션 Job) |
| `deploy-web-services.yml` | 서비스별 웹 9종 (변경 감지 후 선별 배포) — `neture-web` · `k-cosmetics-web` · `kpa-society-web` · `pharmacy-hub-web` · `lecture-web` · `hospital-pharmacy-web` · `store-web` · `kpa-branch-web` · `signage-player-web` |
| `deploy-admin.yml` | `o4o-admin-dashboard` |
| `deploy-auto.yml` | **은퇴** (P3 cutover 2026-10-02) — 종전 자동 경로(태그 ref dispatch). workflow_run trigger 제거 · job `if: false` |
| `delivery.yml` | **Unified Delivery** — main CI 완료 → 판정 → 위 deploy workflow 를 `workflow_call` 로 호출(태그 · dispatch 0) → serving SHA 확인 → commit status. **자동 배포의 유일한 진입점**(`DELIVERY_ENFORCE: 'true'` · P3 cutover 2026-10-02) |
| `promote.yml` | LEVEL 3 · 첫 rollout **승인 1회** — `gh workflow run promote.yml -f sha=<40자>` (SHA == main HEAD). 서비스 · migration · rollout 방식은 다시 계산 |

배포 게이트는 저장소 변수 `DEPLOY_FREEZE`(정상 `false` · 부재/공백/오타 = freeze · fail-closed) 하나다. `DEPLOY_ENABLED` 는 은퇴했다.
deploy workflow 3종은 push 에 반응하지 않는다 — `delivery.yml`/`promote.yml` 의 `workflow_call` · 사람의 통제 dispatch(break-glass)로만 실행된다.
cutover(`DELIVERY_ENFORCE: 'true'` + `deploy-auto.yml` 비활성, 같은 commit · 2026-10-02) 로 자동 경로는 `delivery.yml` 하나다 — 절차와 상태는
[`CHECK-O4O-CICD-UNIFIED-DELIVERY-PIPELINE-V1`](../../docs/checks/CHECK-O4O-CICD-UNIFIED-DELIVERY-PIPELINE-V1.md).
각 deploy workflow 의 `ci-gate` job 이 target SHA 의 `CI Pipeline` green 을 요구하고, rollout 은 서비스 단위 concurrency 로 1개씩이다.
job 의 `environment: production` 은 승인 게이트가 아니라 배포 ref 경계다 — `main` · `deploy/*` 에서만 실행되고 production credential 은 environment secret 이다(required reviewer 없음). 수동 dispatch 는 소유자만 `ci-gate` 를 연다.
예외 경로(`migrate_only`)와 변경 원칙은 루트 [`README.md`](../../README.md) "배포" · "Production 변경 원칙" 절이 정본이다.

## 자동화

| 워크플로 | 역할 |
|---|---|
| `automation-pr-labeler.yml` | PR 크기 라벨 |
| `automation-repo-setup.yml` | 저장소 설정 자동화 |

## 공통 액션

`.github/actions/setup-build-env/action.yml` — pnpm/Node 셋업 + 의존성 설치 + 공유 패키지 빌드.
`strict-lockfile: 'true'` 로 opt-in 하면 lockfile drift 를 실패로 만든다(CI Pipeline 이 사용).

`.github/actions/cloud-run-verified-rollout/action.yml` — `rollout_mode=verified` 전용. 배포 전 traffic 기록(plan) ·
traffic 0% 새 revision 의 tag URL smoke → PASS 일 때만 전환(finish). 로직은 `scripts/ci/cloud-run-rollout.mjs`.

## 규칙

- 로컬 검증 명령과 CI 의 의미를 일치시킨다 — [`SETUP.md`](../../SETUP.md) §5.
- lint 는 회귀 차단 ratchet 이다. baseline 은 내리는 방향으로만 갱신한다
  ([`scripts/lint-ratchet.mjs`](../../scripts/lint-ratchet.mjs)).

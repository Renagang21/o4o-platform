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
| `deploy-web-services.yml` | 서비스별 웹 7종 (변경 감지 후 선별 배포) — `neture-web` · `pharmacy-business-web` · `lecture-web` · `hospital-pharmacy-web` · `store-web` · `kpa-branch-web` (`signage-player-web` 은 2026-10-05 배포 은퇴 · `k-cosmetics-web` 은 2026-10-06 배포 경로 · 앱 소스 은퇴 — Cloud Run 정리는 별도 작업) |
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
production credential 7개는 `production` Environment 에만 있고 repository secret 은 0개다(2026-10-02 이전 완료). DB 비밀번호 runtime source 는 Secret Manager `o4o-db-password`.
scope 검증은 `production-secret-resolution-check.yml`(수동 · 소유자 · 값 출력 0) — 이름 · 용도는 [`SECRETS_SETUP.md`](../SECRETS_SETUP.md).
GCP 인증은 WIF(`workload_identity_provider` + `service_account` · 장기 key 없음)다 — provider 조건과 인증 smoke(`gcp-wif-auth-smoke.yml`)는 [`SECRETS_SETUP.md`](../SECRETS_SETUP.md).
예외 경로(`migrate_only`)와 변경 원칙은 루트 [`README.md`](../../README.md) "배포" · "Production 변경 원칙" 절이 정본이다.

## 자동화

| 워크플로 | 역할 |
|---|---|
| `automation-pr-labeler.yml` | PR 크기 라벨 |
| `automation-repo-setup.yml` | 저장소 설정 자동화 |

## 비공개 전환 비용 준비

`CI_COST_PROFILE=budget` repository variable을 **명시적으로 설정한 경우에만** Draft PR의 무거운 검사를 미룬다.
진행 중에는 Draft PR을 사용하고, 최종 commit을 올린 뒤 Ready for review로 전환한다.
`ready_for_review`에서 기존 전체/affected 검사를 다시 실행하며, Ready 상태에서 추가 push하면 다시 검증한다.
미룬 Draft의 `CI Gate`는 **실패**로 표시한다. 검사 없이 병합 가능한 green을 만들지 않는다.
main/develop push·수동 전체 검사·정기 API Jest·기존 배포 게이트는 유지된다.
변수를 제거하면 기존 자동 실행 방식으로 복귀한다. 이 설정만으로 월 예산 달성을 보장하지 않는다.

- budget 모드에서는 자동 CodeQL을 생략한다. 수동 실행은 공개 저장소에서 가능하다.
- 비공개 CodeQL은 기본 생략한다. 사용 자격·라이선스를 확인한 뒤 `CODEQL_PRIVATE_ENABLED=true`로 명시적으로 켠 경우에만 실행한다.
- 공개 Sonar PR 진단 조회·업로드는 budget 모드 또는 비공개에서 생략한다. **외부 Sonar App 자체를 해제하거나 구독을 취소하지 않는다.**
- AI 리뷰는 빌드·테스트·권한/격리 검증의 통과 증거를 대신하지 않는다.

읽기 전용 비용 재계산(`GITHUB_TOKEN` 또는 `GH_TOKEN`, 최대 31일):

```sh
node scripts/ci/actions-cost.mjs --repo Renagang21/o4o-platform --from 2026-09-30 --to 2026-10-29 --sample 10
```

실행 건수는 전체 조회하고, workflow·event·결과별 시간 분산 표본의 job 시간을 분 단위 올림해 추정한다.
재실행 attempt는 포함하며, 진행 중 run은 별도 집계한다. 청구 내역·저장 공간·외부 검사 구독은 포함하지 않는다.
공개 실행시간이 그대로 유지된다는 가정이다. private 표준 runner는 public보다 CPU·메모리가 작으므로 실제 시간·비용은 증가할 수 있다.
재현 도구는 자동 CI에 등록하지 않는다. 전환 준비와 잔여 항목은
[`IR-O4O-PRIVATE-CI-BUDGET-V1`](../../docs/investigations/IR-O4O-PRIVATE-CI-BUDGET-V1.md)를 따른다.

## 공통 액션 구성

`.github/actions/setup-build-env/action.yml` — pnpm/Node 셋업 + 의존성 설치 + 공유 패키지 빌드.
`strict-lockfile: 'true'` 로 opt-in 하면 lockfile drift 를 실패로 만든다(CI Pipeline 이 사용).

`.github/actions/cloud-run-verified-rollout/action.yml` — `rollout_mode=verified` 전용. 배포 전 traffic 기록(plan) ·
traffic 0% 새 revision 의 tag URL smoke → PASS 일 때만 전환(finish). 로직은 `scripts/ci/cloud-run-rollout.mjs`.

## 규칙

- 로컬 검증 명령과 CI 의 의미를 일치시킨다 — [`SETUP.md`](../../SETUP.md) §5.
- lint 는 회귀 차단 ratchet 이다. baseline 은 내리는 방향으로만 갱신한다
  ([`scripts/lint-ratchet.mjs`](../../scripts/lint-ratchet.mjs)).

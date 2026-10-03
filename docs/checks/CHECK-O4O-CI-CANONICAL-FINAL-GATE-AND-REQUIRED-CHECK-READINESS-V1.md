# CHECK-O4O-CI-CANONICAL-FINAL-GATE-AND-REQUIRED-CHECK-READINESS-V1

> **WO**: WO-O4O-CI-CANONICAL-FINAL-GATE-AND-REQUIRED-CHECK-READINESS-V1
> **일자**: 2026-10-03
> **선행 STOP**: WO-O4O-PUBLIC-COLLABORATOR-REQUIRED-CI-AND-LIVE-ACCESS-SMOKE-FINAL-CLOSURE-V1 §5 — `REQUIRED_CHECK_CANDIDATE = NONE · BLOCKER = NO_STABLE_CANONICAL_PR_CHECK`
> **구현 PR**: #270 (merge `809b512ca`) · **검증 smoke PR**: #271 (close · merge 안 함) · 이 CHECK 의 PR (docs-only 경로)
> **ruleset 변경 0** — required status check 등록은 원래 collaborator WO §6 에서 한다.

---

## 0. 최종 판정

```text
CANONICAL_CI_GATE_IMPLEMENTED      = YES
CANONICAL_CI_GATE_NAME             = CI Gate
ALWAYS_CREATED                     = PASS
DOCS_ONLY_PR                       = PASS   (§4-3 · 이 CHECK 의 PR)
FRONTEND_ONLY_PR                   = PASS   (#271 commit 1)
BACKEND_PR                         = PASS   (#270 · CI infra 변경 → detect global fallback = full CI)
SKIPPED_JOB_HANDLING               = PASS
UPSTREAM_FAILURE_PROPAGATION       = PASS   (#271 commit 2)
PRODUCTION_DEPLOY_DEPENDENCY       = NONE

READY_FOR_REQUIRED_STATUS_CHECK    = YES
CI_CANONICAL_FINAL_GATE            = CLOSED
```

---

## 1. Census — `ci-pipeline.yml` job (변경 전)

| job id | 표시 이름 | 실행 조건 | 비고 |
|---|---|---|---|
| `detect` | Detect affected scope | 항상 | 판정만 · CodeQL 에 같은 이름 job 존재 |
| `quality-check` | Code Quality Check | admin_only ≠ true · docs_fast ≠ true | |
| `api-tests` | API Server Jest (`${{ matrix.shard }}`/3) | 〃 | matrix 3 shard · skip 시 이름 미렌더 |
| `build` | Build Applications | 〃 | matrix — 실행 시 `Build Applications (admin-dashboard)` |
| `web-build` | Web production build (affected) | 〃 + web_build_dirs ≠ 빈 값 | |
| `docs-fast-validate` | Docs Fast — docs consumer tests | docs_fast = true | |
| `admin-fast-validate` | Admin Fast — validate & build | admin_only = true | |
| `admin-fast-guards` | Admin Fast — repo static guards | admin_only = true | |

8개 모두 검증 job — deploy · delivery · 알림 job 없음. `continue-on-error` 없음.
배포 경로(`delivery.yml` · `promote.yml` · `deploy-*.yml` · `scripts/ci/ci-gate.mjs`)는 job 이름이 아니라 **CI Pipeline workflow 전체 결과**만 본다 → gate 추가로 배포 판정이 바뀌지 않는다(gate 가 실패하는 경우 = upstream 이 이미 실패해 workflow 가 이미 실패하는 경우).

## 2. 구현

`ci-pipeline.yml` 끝에 `ci-gate` 1개 추가 (PR #270).

```text
name     CI Gate (고정 · matrix 없음)
needs    detect · quality-check · api-tests · build · web-build · docs-fast-validate · admin-fast-validate · admin-fast-guards (= 다른 job 전부)
if       always()
판정     contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled') → exit 1
         그 외(success · skipped) → 통과
기록     toJSON(needs) 출력 (job 별 result)
```

설계 결정 2건:

1. **`always()` (not `!cancelled()`)** — `!cancelled()` 면 run 취소 시 gate 가 skipped 가 되고, GitHub 는 skipped required check 를 통과로 본다 → CI 없이 merge 가능.
2. **판정은 expression 하나** — 첫 구현은 `jq` 로 실패 목록을 만들었는데, 로컬 replay 에서 `jq` 부재 시 목록이 비어 **통과(fail-open)** 하는 것을 확인 → 외부 도구 의존을 없앴다.

"실행돼야 했는데 skip" 판정은 detect(`scripts/ci/detect-affected.mjs`) 책임 — gate 가 다시 판정하지 않는다(WO 범위).

계약 테스트 추가 (`scripts/ci/__tests__/detect-affected.test.mjs`): 이름 정확히 `CI Gate` · matrix 아님 · `if: always()` · needs = 다른 job 전부(job 추가 시 needs 누락을 잡는다). `scripts/ci` 전체 333/333 PASS · YAML 파싱 PASS.

## 3. 검증 — 자연 PR CI 경로

### 3-1. BACKEND / full — PR #270 (gate 구현 자체 · CI infra 변경 → global fallback)

`CI Gate` **pass** — 실행: Detect · Code Quality · API Jest 1/2/3 · Build (admin-dashboard) / skip: Docs Fast · Admin Fast 2 · Web build.
→ 실행 job success + path skip 공존에서 통과.

### 3-2. FRONTEND-only — PR #271 commit 1 (`services/web-neture/src/main.tsx` 주석 1줄 · detect = `web:neture` 만)

`CI Gate` **pass** — Web production build (affected) 실행 · Docs Fast / Admin Fast skip.

### 3-3. DOCS-only — 이 CHECK 의 PR

detect 로컬 판정 `docs_only = true · docs_fast_eligible = true`. 결과는 §4-3.

### 3-4. 실패 전파 — PR #271 commit 2 (같은 파일에 의도적 syntax error · smoke branch 한정)

| job | 결과 |
|---|---|
| Code Quality Check | failure |
| Web production build (affected) | failure |
| API Jest 1/2/3 · Build · Detect | success |
| Docs Fast · Admin Fast 2 | skipped |
| **CI Gate** | **failure** |

→ upstream failure 1개 이상이면 gate failure. PR #271 은 merge 하지 않고 close · branch 삭제.

### 3-5. main push

merge commit `809b512ca` 의 CI Pipeline(push): `CI Gate` success.
같은 SHA 의 Delivery: Classify 만 success · API / Web / Admin / Report **전부 skipped** → production 동작 0.

## 4. 이름 안정성

| PR | 경로 | 표시 이름 |
|---|---|---|
| #270 | full | `CI Gate` |
| #271 | frontend-only (green · red) | `CI Gate` |
| main push `809b512ca` | push | `CI Gate` |
| 이 CHECK PR | docs-only | §4-3 |

접미사 · matrix 표기 · 미렌더 expression 없음.

### 4-3. docs-only 결과

(이 PR 의 CI 결과를 확인한 뒤 기록)

## 5. 정리

- 원격 branch: `wo/ci-canonical-final-gate`(merge 시 삭제) · `wo/ci-gate-smoke-frontend`(close 시 삭제) → 잔존 0.
- `main` 에 smoke 변경 유입 0.

## 6. 다음

원래 WO-O4O-PUBLIC-COLLABORATOR-REQUIRED-CI-AND-LIVE-ACCESS-SMOKE-FINAL-CLOSURE-V1 **§6 재개** — `main-collaborator-pr-required` 에 required status check `CI Gate` 추가 → readback.
check 이름 `CI Gate` 는 이 workflow 에만 있다(다른 workflow 와 이름 충돌 없음 — `Detect affected scope` 와 다름).

`문서 정합: 해당 없음`

# CHECK · O4O CI Build 잡 병렬화

> **WO**: `WO-O4O-CI-BUILD-JOB-PARALLELIZATION-V1` (사용자 직접 지시 · 배포/CI 소요시간 개선 2번 항목)
> **구현 commit**: `9c3a619d2`
> **선행**: [`CHECK-O4O-CI-API-JEST-SHARD-PARALLELIZATION-V1`](CHECK-O4O-CI-API-JEST-SHARD-PARALLELIZATION-V1.md)
> **상태**: 구현 완료 · 병렬 스케줄링 실측 PASS · **CI 전체 wall-clock 실측 PENDING (main red — 본 변경과 무관)**
> **작성일**: 2026-09-24

---

## 0. 한 줄 요약

`build` 잡의 `needs: [detect, quality-check, api-tests]` → `needs: [detect]`.
build 가 quality-check · api-tests 뒤에 직렬로 붙던 84~102s 를 critical path 에서 뺐다.

## 1. 근거

- build 는 quality-check · api-tests 의 산출물(artifact · output)을 쓰지 않는다. 별도 runner 에서 독립적으로 frozen install + `@o4o/admin-dashboard^...` closure build 를 한다.
- 소비처 조사: `needs.build` · `needs.quality-check` · `needs.api-tests` 참조 0. 이 `needs` 선언을 읽는 test/script 0 (Grep, docs 제외).
- 세 잡 모두 blocking 이고 run 결론은 하나라도 실패하면 실패다 → **약해지는 게이트 없음**. 달라지는 것은 quality/test 실패 시에도 build 가 돌아 runner 시간을 쓰는 것뿐 (public repo).

## 2. 검증

| 항목 | 결과 |
|---|---|
| `node --test scripts/ci/__tests__/detect-affected.test.mjs` | 72 pass / 0 fail |
| workflow 를 읽는 api-server spec 3개 (`ci-build-app-target-validity` · `canonical-database-bootstrap-…` · `partnerops-registry-and-lint-gate-…`) | 3 suites / 48 tests pass |
| 실 Actions run `35937365310` — build 시작 시각 | detect 종료(00:14:25) 직후 **00:14:27** 시작, quality-check · Jest 3 shard 와 동시 → **병렬 스케줄링 PASS** |
| build 잡 결과 | success · 102s |

### 2-1. CI 전체 wall-clock — PENDING

run `35937365310` 은 **failure** 다. 원인은 본 변경이 아니라 선행 commit 이다:

| run | commit | 결론 |
|---|---|---|
| `35935998863` | `21e8ad587` (Jest shard) | success |
| `35936532173` | `0af9db301` Merge `wo/legacy-password-auth-retirement` (타 세션) | **failure** |
| `35936965490` | `174dae05c` (docs only) | failure (상속) |
| `35937365310` | `9c3a619d2` (본 변경) | failure (상속) |

실패 내용 (전부 `0af9db301` 이 머지한 password 인증 은퇴 범위):

- Code Quality Check — `services/web-pharmacy-hub` `src/lib/api/pharmacyHubAccount.ts(17,1)` TS6133 `SERVICE_KEY` unused
- API Jest — `legacy-partner-runtime-retirement.spec.ts` · `database-migration-ownership-startup-health-final-closure.spec.ts` (8.5 dangling script) · `serviceCredentialLifecycle.test.ts` (hard delete 4건) · `pharmacy-hub-member-model-contract.spec.ts`

quality-check 가 type-check 에서 265s 에 중단되어 이 run 의 total 451s 는 기준선과 비교할 수 없다.
**main 이 green 으로 돌아온 뒤 첫 run 에서 total 을 기록한다.** 예상치: detect 28s + quality-check ≈ 474s ≈ 500s (8분대).

## 3. 범위 밖 발견 (보고만)

- main red (`0af9db301` 이후) — password 인증 은퇴 WO 소유 세션이 처리할 사항. 본 WO 는 수정하지 않았다.

## 4. 문서 정합

해당 없음.

*작성: 2026-09-24*

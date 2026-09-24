# CHECK · O4O CI API Jest shard 병렬화

> **WO**: `WO-O4O-CI-API-JEST-SHARD-PARALLELIZATION-V1` (사용자 직접 지시 · 배포/CI 소요시간 개선 1번 항목)
> **구현 commit**: `21e8ad587`
> **상태**: COMPLETE — 실 Actions 실측 PASS
> **작성일**: 2026-09-24

---

## 0. 한 줄 요약

CI `api-tests` 의 전체 API Jest 를 **3 runner 로 분할(shard)** 해 동시에 돌린다.
선별(affected)이 아니라 분할이다 — 3 shard 의 합집합이 전체 suite 이며, 결과 합계가
직전 full 실행과 **완전히 일치**했다. API Jest 잡 wall-clock **654s → 349s**,
CI 전체 **약 13분 → 594s**.

## 1. 배경 — 실측 기준선 (변경 전)

| 잡 | 소요 | 비고 |
|---|---|---|
| API Server Jest | 603~654s | 그중 `jest --maxWorkers=1` 545s (단일 runner 직렬) |
| Code Quality Check | 475~477s | Jest 와 병렬 |
| Build Applications | 92~99s | `needs: [quality-check, api-tests]` 로 Jest 뒤에 직렬 |
| **CI 전체** | **740~880s** | critical path = Jest → Build |

## 2. 변경

| 파일 | 변경 |
|---|---|
| `.github/workflows/ci-pipeline.yml` | `api-tests` → `matrix.shard: [1, 2, 3]` · `fail-fast: false` · `npx jest --maxWorkers=1 --shard=${{ matrix.shard }}/3` · shadow 계산/업로드는 `matrix.shard == 1` 에서만 |
| `scripts/ci/__tests__/detect-affected.test.mjs` | J17 — 허용 추가 인자는 `--shard` 하나뿐 · matrix 가 `1..N` 을 빠짐없이 덮는지 검사 |

**바꾸지 않은 것**

- 각 shard 내부 `--maxWorkers=1` (OOM 보호) 그대로
- Phase 0 shadow 계약 — selector 출력은 jest 인자로 흐르지 않는다 (J17 유지). `--shard` 는 범위가 아니라 분할
- `scheduled-api-full-jest.yml` · admin-fast · docs-fast 경로 불변
- `fail-fast: false` — 한 shard 실패가 다른 shard 를 취소해 실패 suite 목록을 가리지 않게 함 (shadow false-negative 대조에 전체 실패 목록 필요)
- branch protection 없음(404) → 잡 이름이 `API Server Jest (i/3)` 로 바뀌어도 머지 게이트 영향 없음

## 3. 검증

### 3-1. 로컬 — 분할 완전성

`npx jest --listTests` vs `--listTests --shard=i/3`:

| 항목 | 결과 |
|---|---|
| 전체 | 357 |
| shard 1 / 2 / 3 | 119 / 119 / 119 |
| 중복 | 0 |
| 누락 (full ↔ union diff) | 0 |

`node --test scripts/ci/__tests__/detect-affected.test.mjs` → 72 pass / 0 fail.

### 3-2. 실 Actions — run `35935998863` (commit `21e8ad587`, push)

| 잡 | 결과 | 소요 | jest Time |
|---|---|---|---|
| Detect affected scope | success | 26s | — |
| Code Quality Check | success | 474s | — |
| API Server Jest (1/3) | success | 295s | 190.2s |
| API Server Jest (2/3) | success | 267s | 164.0s |
| API Server Jest (3/3) | success | 349s | 240.2s |
| Build Applications (admin-dashboard) | success | 84s | — |
| **CI 전체** | **success** | **594s** | — |

shadow artifact: `api-jest-shadow-35935998863-1` 1건만 업로드됨 (충돌 없음).

### 3-3. 결과 합계 동치 — 직전 full 실행 (run `35932511327`, `e45a57813`) 대비

| 항목 | 직전 full | shard 합계 | 일치 |
|---|---|---|---|
| Suites passed / skipped / total | 353 / 4 / 357 | 118+118+117 / 1+1+2 / 119×3 | ✅ |
| Tests passed / skipped / total | 6,050 / 32 / 6,082 | 2,209+1,892+1,949 / 2+5+25 / 2,211+1,897+1,974 | ✅ |

`e45a57813..21e8ad587` 사이 `apps/api-server` 변경 없음.

## 4. 관찰 · 남은 개선

- **critical path 가 Code Quality Check(474s) 로 이동**했다. Jest 추가 분할(4 shard)은 CI 전체를 줄이지 못한다.
- Build 잡은 여전히 `needs: [quality-check, api-tests]` 로 직렬 +84s → 개선 후보 2(Build 병렬화).
- shard 간 편차: jest Time 164~240s. Jest 기본 분할은 파일 수 기준이라 무거운 suite 가 shard 3 에 몰렸다. critical path 가 아니므로 현재는 조치 불필요.
- shard 당 고정 overhead ≈ 105s (checkout fetch-depth 0 · setup · api deps build).
- 개선 후보 3·4 (API Docker 캐시/`chown` 정리 · deploy-api 패키지 빌드 범위 축소)는 별도 WO.

## 5. 문서 정합

`docs/checks/CHECK-O4O-API-JEST-AFFECTED-TEST-EXECUTION-PHASE0-SHADOW-V1.md` 와 `scripts/ci/detect-affected.mjs:1011` 주석은
"CI 는 `npx jest --maxWorkers=1` 전체를 돌린다"고 적고 있다. 의미(전체 실행)는 여전히 참이며 shard 는 분할이므로
판정 변경 없음 — 기록물이라 수정하지 않는다.

*작성: 2026-09-24*

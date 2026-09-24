# CHECK · CI Frontend type-check 병렬화

> **WO**: `WO-O4O-CI-FRONTEND-TYPECHECK-PARALLELIZATION-V1` (사용자 직접 지시 · 배포/CI 소요시간 개선 5번 — 조사 후 판단 위임)
> **구현 commit**: `cd8cce839`
> **선행**: [`CHECK-O4O-DEPLOY-API-PACKAGE-BUILD-SCOPE-V1`](CHECK-O4O-DEPLOY-API-PACKAGE-BUILD-SCOPE-V1.md)
> **상태**: COMPLETE — 로컬 동치 · 실패 경로 · 실 Actions 실측 PASS
> **작성일**: 2026-09-24

---

## 0. 한 줄 요약

`type-check:frontend` 가 워크스페이스 13개의 tsc 를 `execSync` 로 직렬 실행하던 것을, CI 에서만 4개 동시 실행으로 바꿨다.
Frontend type-check **153s → 74s**, Code Quality Check **449s → 327s**, CI 전체 **367s**.

## 1. 조사 — Code Quality Check 449s 구성 (run `35941279765`)

| 구간 | 소요 |
|---|---|
| checkout | 25s |
| Setup (캐시 복원 13 · install 7 · `build:packages` 96) | 119s |
| **Frontend type-check (13개 직렬)** | **153s** |
| api-server type-check | 26s |
| ESLint ratchet + admin ratchet | 56 + 6s |
| guard · Vitest 등 | ≈60s |

runner 4 vCPU 중 type-check 는 1개만 사용. 후보 비교:

| 후보 | 절감 | 판정 |
|---|---|---|
| **B. frontend type-check 병렬** | ≈−80~100s | **채택** — `scripts/dev.mjs` 한정, 로컬 기본 동작 불변 |
| A. quality-check 잡 분할 | B 이후 Jest shard(≈340s)와 병목 동률이라 단독 효과 제한 | 보류 |
| C. `build:packages` 직렬 체인 병렬화 | ≈−30s | 루트 package.json scripts 변경 = 중지 조건 → 보류 |
| D. ESLint `--concurrency` | ≈−30s | ESLint 9.33→9.34+ 의존성 변경 = 중지 조건 → 보류 |

## 2. 변경

| 파일 | 변경 |
|---|---|
| `scripts/dev.mjs` | `typeCheckWorkspace` → `planTypeCheckWorkspace`(계획) + 직렬 실행 래퍼로 분리 · `runTypeCheckPlansParallel` 추가 · `O4O_TYPECHECK_CONCURRENCY` (>1 일 때만 병렬, 기본 1 = 기존 직렬) · `type-check:frontend` 가 Promise 결과도 `finish` 로 전달 |
| `.github/workflows/ci-pipeline.yml` | quality-check 의 `Run TypeScript check (Frontend only)` 에 `O4O_TYPECHECK_CONCURRENCY: '4'` |

동치를 지키는 설계:

- 검사 대상 목록 · 대상별 명령(`pnpm run type-check` / `tsc -b` / `tsc --noEmit`) · 독립 install 보장 로직은 그대로 (계획 단계는 직렬)
- 병렬 실행은 산출물이 없는 tsc 만 대상 — 대상 간 순서 의존 없음
- 출력은 대상별로 모아 끝날 때 한 덩어리로 출력(섞임 방지) + 대상별 소요시간 표시
- 실패는 **계획 순서**로 tracker 에 기록 → 최종 보고가 직렬과 같은 순서
- 전체 `type-check` 명령 · App Store packages 검사는 직렬 그대로

## 3. 검증

### 3-1. 로컬 동치 (Windows, `O4O_PACKAGES_PREBUILT=1` 동일 조건)

| 실행 | rc | 소요 | 실패 목록 |
|---|---|---|---|
| 직렬 (기본) | 1 | 191s | web-k-cosmetics · web-neture · web-pharmacy-hub |
| 병렬 4 | 1 | 82s | web-k-cosmetics · web-neture · web-pharmacy-hub (**순서·오류 메시지 동일**) |
| 병렬 4 + 주입 오류 (`services/web-lecture/src/` 임시 파일, 실행 후 삭제) | 1 | 77s | 위 3개 + **web-lecture** (TS2322 검출) |

로컬 기존 실패 3건(`onChangePassword` missing)은 로컬 `packages/account-ui/dist` 가 08-25 빌드로 src(09-23 변경)보다 오래된 **로컬 stale dist** 때문이다 — CI(main)는 green. 직렬·병렬이 같은 조건에서 같은 결과를 냈다는 동치 근거로만 사용했다.

### 3-2. 실 Actions — run `35952680028` (commit `cd8cce839`)

| 잡 / step | 기준선 (`35941279765`) | 본 run |
|---|---|---|
| Frontend type-check | 153s | **74s** (`concurrency=4`, 13개 전부 ok, `type-check:frontend: OK`) |
| Code Quality Check | 449s | **327s** |
| API Server Jest 1/2/3 | 284 / 248 / 345s | 278 / 285 / 336s |
| Build Applications | 105s | 94s |
| **CI 전체** | **490s** | **367s** (success) |

대상별 (CI): kpa-society 49.3s · admin-dashboard 44.6s · neture 37.3s · k-cosmetics 31.1s · pharmacy-hub 26.3s · web-store 26.0s · lecture 14.1s · 나머지 6개 4.8~8.6s. 검사 대상 수 13 = 기준선 13.

## 4. 관찰 — 다음 병목

- critical path 가 **Code Quality Check(327s) ≈ API Jest shard 3(336s)** 로 동률이 됐다. 한쪽만 줄여서는 CI 전체가 줄지 않는다.
- 추가 단축에는 Jest 4 shard + quality-check 분할(A)을 **함께** 하거나, C · D(의존성/package.json 변경, 별도 승인) 가 필요하다.

## 5. 문서 정합

해당 없음.

*작성: 2026-09-24*

# CHECK · CI sparse checkout — 운영 데이터 manifest 제외

> **WO**: `WO-O4O-CI-SPARSE-CHECKOUT-DATA-EXCLUSION-V1` (사용자 판단 위임 · 배포/CI 소요시간 개선 7번)
> **구현 commit**: `cd4f8baab`
> **선행**: [`CHECK-O4O-DEPLOY-JOB-BOOTSTRAP-SLIMMING-V1`](CHECK-O4O-DEPLOY-JOB-BOOTSTRAP-SLIMMING-V1.md) §5-3
> **상태**: COMPLETE — 실 Actions PASS · sparse 패턴 실증 (배포 job 패턴의 선행 증명 겸함)
> **작성일**: 2026-09-24

---

## 0. 한 줄 요약

CI job 4종의 checkout 에서 `apps/api-server/src/scripts/data/`(≈1.25GB)를 제외했다.
**sparse 패턴이 정확히 그 디렉터리만 제외함을 실 runner 에서 실증**했고(28,086 − 3,817 = 24,269),
이는 배포 job 11개(`6ae232ea1`)에 넣은 **동일 패턴**의 검증이기도 하다. 시간 절감은 job 당 ≈6~8s 로 작다.

## 1. 적용 범위

| job | 변경 |
|---|---|
| Code Quality Check | sparse (depth 1) |
| Build Applications | sparse (depth 1) |
| admin-fast-validate | sparse (depth 1) |
| API Server Jest shard 2..N | sparse (depth 1) — `if: matrix.shard != 1` 별도 checkout step |
| API Server Jest shard 1 | **불변** (`fetch-depth: 0`, full) |
| detect · docs-fast-validate · admin-fast-guards | **불변** (`fetch-depth: 0`) |

shard 1 을 제외한 이유: Phase 0 shadow selector 가 `git diff --name-status` 로 full history 를 본다.
blob:none 부분 fetch 에서는 rename 판정이 blob 을 하나씩 지연 fetch 할 수 있고, 관측 조건을 바꾸지 않기 위해 그대로 둔다.

## 2. 안전성 근거

| 항목 | 결과 |
|---|---|
| 제외 디렉터리 파일 형식 | json 3,705 · jsonl 74 · md 9 · html 2 · 기타 소수 — **ts/js 0** |
| ESLint 대상 | `eslint.config.js` `files: ['**/*.{ts,tsx,mts,cts}']` → 영향 0 |
| tsc · guard · Jest/Vitest | `src/scripts/**` 안 spec 0 · 이 경로를 읽는 test/package.json script 0 (선행 CHECK §5-3) |
| 정적 | YAML OK · detect-affected node:test 72/0 · workflow 를 읽는 spec 5 suites / 77 tests pass |

## 3. 실 Actions — run `35956356976` (commit `cd4f8baab`) · success · 368s

### 3-1. sparse 실증 (Code Quality Check job log)

```
git ... fetch --filter=blob:none --depth=1 origin +cd4f8baab…   (0.9s)
git checkout --progress --force -B main refs/remotes/origin/main
Updating files: 100% (24269/24269), done.
```

| 항목 | 값 |
|---|---|
| HEAD tree 전체 파일 | 28,086 |
| `apps/api-server/src/scripts/data` 파일 | 3,817 |
| checkout 된 파일 | **24,269 = 28,086 − 3,817** (정확히 해당 디렉터리만 제외) |

### 3-2. 시간

| job | checkout 전 | checkout 후 | job 전체 |
|---|---|---|---|
| Code Quality Check | 25s | 18s | 328s (기준 327s) |
| Build Applications | 22s | 17s | 78s (기준 94s) |
| API Jest 2/3 · 3/3 | 21~23s | 17s | 270s · 332s |
| API Jest 1/3 (불변) | 23s | 23s | 289s |
| **CI 전체** | — | — | **368s** (기준 367s — runner 편차 범위) |

- `git fetch` 자체는 ≈19s → 0.9s. 남은 ≈16s 는 checkout 중 **나머지 24,269 파일(≈330MB — docs 87MB · tmp 등) blob 지연 fetch** 다.
- 결과적으로 job 당 ≈6~8s 절감이며, critical path(Quality Check ≈ Jest 3/3)는 사실상 그대로다.

## 4. 판단 · 후속

- 본 변경의 주된 가치는 **배포 job 패턴의 사전 실증**이다 — `CHECK-O4O-DEPLOY-JOB-BOOTSTRAP-SLIMMING-V1` §3 의 "sparse 패턴 로컬 재현 미실행" 을 실 runner 로 대체한다.
- 추가 단축은 docs · tmp 등 **다른 경로까지 제외**해야 하나, CI 에는 docs 를 읽는 test(기록물 보존 guard 등)가 있어 경로별 소비처 전수 확인이 필요하다 — 이득(≈10s)에 비해 위험이 커 **진행하지 않는다**.

## 5. 문서 정합

해당 없음.

*작성: 2026-09-24*

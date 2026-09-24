# CHECK · deploy-api 패키지 빌드 범위 축소

> **WO**: `WO-O4O-DEPLOY-API-PACKAGE-BUILD-SCOPE-V1` (사용자 직접 지시 · 배포/CI 소요시간 개선 4번 항목)
> **구현 commit**: `a95384b78`
> **선행**: [`CHECK-O4O-API-DOCKER-BUILD-CACHE-AND-OWNERSHIP-V1`](CHECK-O4O-API-DOCKER-BUILD-CACHE-AND-OWNERSHIP-V1.md)
> **상태**: COMPLETE — 정적 검증 PASS · 실 배포 PASS (§4, run `35978611257`)
> **작성일**: 2026-09-24

---

## 0. 한 줄 요약

deploy-api 의 `Setup build environment` 가 root `build:packages` 전체(프론트 패키지 포함)를 빌드한 뒤
하드코딩 18개 패키지를 **다시** 빌드하던 것을, api-server workspace dependency closure 1회 빌드로 바꿨다.

## 1. 기준선

| step | run `35864390517` | run `35947666020` |
|---|---|---|
| Setup build environment (install + `build:packages` 전체) | 133s | 106s |
| Build API-specific packages (하드코딩 18개 재빌드) | 28s | 20s |

`build:packages` 의 마지막 체인은 `build:api-deps` = `pnpm --filter "@o4o/api-server^..." run build` 이다.
즉 하드코딩 18개는 이미 한 번 빌드된 상태에서 재빌드되고 있었다.

## 2. 변경

| 파일 | 변경 |
|---|---|
| `.github/workflows/deploy-api.yml` | `setup-build-env` 에 `build-packages: 'false'` · `Build API-specific packages` step 을 `pnpm --fail-if-no-match --filter '@o4o/api-server^...' run build` 한 줄로 교체 (step 이름 유지) |

같은 방식이 이미 CI `api-tests` · `scheduled-api-full-jest.yml` 에서 쓰이고 있다 (`build-packages: 'false'` + closure build).

## 3. 정적 검증 — closure 충분성

| 항목 | 결과 |
|---|---|
| `@o4o/api-server^...` closure | 29 패키지 |
| 하드코딩 18개 중 closure 밖 | **0** |
| api-server 런타임 코드(테스트 제외)의 `@o4o*` static import | 20종 — **전부 package.json 선언** |
| dynamic `import()` / `require()` 대상 | `ai-core` · `platform-core` · `security-core` · `types` — 전부 선언 |
| 선언 없이 import 되는 6종 (`hospital-pharmacy-core` · `lms-client` · `lms-ui` · `shared-space-ui` · `tablet-kiosk-core` · `tablet-screen-set-editor`) | **전부 `src/__tests__/` 안** (문자열 단언 또는 jest moduleNameMapper → src). `tsconfig.build.json` 이 `src/__tests__/**` · `*.spec.ts` · `*.test.ts` 를 exclude, tsup entry 는 main/migrate/job 9개 → 배포 빌드 무관 |
| `O4O_PACKAGES_PREBUILT` 의존 | deploy-api 경로에 없음 (`scripts/ci-build-app.sh` 는 CI build 잡 전용) |
| `node --test scripts/ci/__tests__/detect-affected.test.mjs` | 72 pass / 0 fail |
| `database-migration-ownership-startup-health-final-closure.spec.ts` · `build-packages-workspace-dependency-coverage.spec.ts` | 2 suites / 32 tests pass |
| YAML parse | OK |

> 판단 근거의 한계: api-server 의 `tsconfig.json` `paths` 가 `@o4o/*` → `packages/*/dist` 로 매핑되므로,
> 향후 런타임 코드가 **선언 없이** 새 `@o4o/*` 를 import 하면 closure 밖이라 dist 가 없어 deploy 빌드가 실패한다.
> 이는 조용한 누락이 아니라 **빌드 실패로 드러나는** 방향이며, 올바른 수정은 package.json 에 의존성을 선언하는 것이다.

## 4. 실 배포 검증 — run `35978611257` (commit `b2925e765`, Password Phase B-1 통제 배포 · 타 세션)

push run `35950968950` 은 workflow-only 변경이라 `build-and-deploy` skipped 였고, 사용자 결정에 따라
측정 전용 배포 없이 다음 자연 배포를 관측했다.

| step | 기준선 (`35864390517` / `35947666020`) | 본 run |
|---|---|---|
| Setup build environment | 133s / 106s | **28s** |
| Build API-specific packages | 28s / 20s (하드코딩 18개 재빌드) | 35s (closure 1회 — 이 step 이 유일한 패키지 빌드) |
| 패키지 빌드 관련 합계 (Setup + API packages) | 161s / 126s | **63s** |
| Build API server (tsup) | 33s / 25s | 22s — closure 만으로 tsc · tsup 빌드 성공 |
| build-and-deploy 잡 전체 | 490s / 378s | **272s** (3·6번 효과 포함) |

closure 충분성(§3)은 실 배포에서 확인됐다 — 빌드 · migration · deploy 전부 success.

## 5. 문서 정합

해당 없음.

*작성: 2026-09-24*

# CHECK · deploy-api 패키지 빌드 범위 축소

> **WO**: `WO-O4O-DEPLOY-API-PACKAGE-BUILD-SCOPE-V1` (사용자 직접 지시 · 배포/CI 소요시간 개선 4번 항목)
> **구현 commit**: `a95384b78`
> **선행**: [`CHECK-O4O-API-DOCKER-BUILD-CACHE-AND-OWNERSHIP-V1`](CHECK-O4O-API-DOCKER-BUILD-CACHE-AND-OWNERSHIP-V1.md)
> **상태**: 구현 · 정적 검증 PASS · **실 배포 실측 PENDING (사용자 결정: 다음 자연 API 배포에서 확인)**
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

## 4. 실 배포 검증 — PENDING

push run `35950968950` 은 workflow-only 변경이라 `build-and-deploy` **skipped** (정상 — detect 판정).
사용자 결정: 측정만을 위한 운영 강제 배포는 하지 않고 **다음 자연 API 배포**에서 확인한다.

다음 배포에서 기록할 것:

- `Setup build environment` 소요 (기대: 106~133s → ≈30~40s, install 만)
- `Build API-specific packages` 소요 (기대: ≈50s, CI api-tests 의 동일 명령 실측 51s)
- 잡 전체 합계 변화 (기대: −60~80s)
- 같은 run 에서 3번의 warm cache 실측 (`CHECK-O4O-API-DOCKER-BUILD-CACHE-AND-OWNERSHIP-V1` §4)

**실패 시**: 실패 지점은 `Build API-specific packages` 또는 `Build API server (bundled with tsup)` 이며,
둘 다 이미지 push · migration · Cloud Run deploy **이전**이라 운영 영향 없음. 복구는 `a95384b78` revert 1 커밋.

## 5. 문서 정합

해당 없음.

*작성: 2026-09-24*

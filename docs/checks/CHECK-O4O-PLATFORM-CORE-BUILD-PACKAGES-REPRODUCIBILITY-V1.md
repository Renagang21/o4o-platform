# CHECK-O4O-PLATFORM-CORE-BUILD-PACKAGES-REPRODUCIBILITY-V1

> WO: `WO-O4O-PLATFORM-CORE-BUILD-PACKAGES-REPRODUCIBILITY-V1`
> 성격: 클린 환경 **빌드 재현성** 수정 (기능 변경 · 패키지 구조 개편 아님)
> 작성일: 2026-09-09

---

## 1. 시작 · 종료 HEAD

| 항목 | 값 |
|---|---|
| 기준 branch | `origin/main` |
| 작업 branch | `work/platform-core-build-packages-reproducibility-v1` |
| 시작 HEAD | `86bf574aebb6d8a06d4d01353ee815342edf60f5` |
| 종료 HEAD | 본 문서 커밋 (아래 §9) |
| `pnpm install --frozen-lockfile` | PASS — `Lockfile is up to date` |

---

## 2. 실제 원인

루트 `build:packages` 는 **프론트엔드 패키지만 하드코딩으로 나열**하고 있었다.
api-server 가 소비하는 워크스페이스 의존 **28개 중 17개가 체인에 없었고**, `@o4o/platform-core` 는 그중 하나다.

체인에 없던 17개:

```text
@o4o-apps/cms-core          @o4o-apps/content-core      @o4o-apps/digital-signage-core
@o4o-extensions/organization-forum
@o4o/action-log-core        @o4o/ai-core                @o4o/asset-copy-core
@o4o/cpt-registry           @o4o/education-extension    @o4o/interactive-content-core
@o4o/lms-core               @o4o/mail-core              @o4o/market-trial
@o4o/payment-core           @o4o/platform-core          @o4o/security-core
@o4o/store-core
```

api-server 의 [tsconfig.json](../../apps/api-server/tsconfig.json) 은 platform-core 타입을
`packages/platform-core/dist/*` 로 직접 해석한다 (project `references` 없음).

```json
"@o4o/platform-core/store-identity": ["../../packages/platform-core/dist/store-identity"],
"@o4o/platform-core/store-policy":   ["../../packages/platform-core/dist/store-policy"],
```

따라서 `dist` 가 없으면 type-check 가 즉시 실패한다.

**기존 `dist` 가 남아 있을 때만 성공하는 구조였다.** 이를 다음과 같이 실증했다
(`packages/platform-core/dist` · `tsconfig.tsbuildinfo` 는 `.gitignore` 대상 생성물 — 추적 파일 0건):

| 단계 | 결과 |
|---|---|
| `platform-core/dist` 제거 후 `pnpm run build:packages` | 성공(exit 0)하지만 `platform-core/dist` **미생성** |
| 그 상태의 `apps/api-server` type-check | **26 errors** — 25건이 platform-core `TS2307` |

```text
src/database/entities.ts(196,35): error TS2307: Cannot find module '@o4o/platform-core/store-identity' ...
src/database/entities.ts(406,65): error TS2307: Cannot find module '@o4o/platform-core/store-policy' ...
```

나머지 1건은 **동일 계열의 stale dist 문제**였다. `@o4o/ai-core` 도 체인에 없어
`packages/ai-core/dist` 가 낡은 채로 소비되고 있었다.

```text
src/copilot/insight-rules.ts(38,7): error TS2741: Property 'glycopharm' is missing ... 'Record<AIServiceId, ...>'
  - src: packages/ai-core/src/orchestration/types.ts → 'kpa' | 'neture' | 'cosmetics'
  - stale dist: packages/ai-core/dist/orchestration/types.d.ts → 'kpa' | 'neture' | 'glycopharm' | 'cosmetics'
```

`pnpm install` 의 prepare/postinstall 의존은 `packages/types` **한 곳뿐**이며
(`prepare: npm run build`), platform-core 에는 없다. 즉 설치만으로는 생성되지 않는다.

### 배포 경로는 정상이었다

- [deploy-api.yml](../../.github/workflows/deploy-api.yml) 은 자체 목록으로 `@o4o/platform-core` 를 빌드한다 (line 77).
- [ci-pipeline.yml](../../.github/workflows/ci-pipeline.yml) 은 선행 WO(`WO-O4O-CI-BLOCKING-GATE-FINALIZATION-V1`)에서
  `pnpm --filter '@o4o/api-server^...' run build` 토폴로지 빌드를 이미 도입해 두었다.
- 누락은 **루트 `build:packages` 에만** 남아 있었고, 로컬 클린 작업공간이 그 영향을 받았다.

---

## 3. 수정한 빌드 계약

[package.json](../../package.json) — 루트 스크립트 3줄 추가 (주석 1 · 신규 script 1 · 체인 1항목).

```jsonc
"build:packages": "... && pnpm run build:account-ui && pnpm run build:api-deps",
"build:api-deps": "pnpm --filter \"@o4o/api-server^...\" run build",
```

설계 판단:

1. **하드코딩 목록을 늘리지 않았다.** 목록은 drift 하며 이번 결함이 그 증거다.
   CI 가 이미 쓰는 pnpm 의존성 토폴로지(`^...`)를 루트에도 동일하게 도입했다.
2. **빌드 순서는 pnpm 토폴로지가 보장한다** — 의존 패키지가 소비처보다 먼저 빌드된다.
3. **개별 package build script 는 변경하지 않았다.**
4. **기존 프론트엔드 체인은 그대로 두고 뒤에 append 했다.**
   중복되는 12개 패키지는 `tsc --build` / `tsup` 증분 빌드라 재emit 이 없는 no-op 이다.
   중복을 완전히 없애려면 프론트엔드 목록을 api-server 의존 그래프에 종속시켜야 하는데,
   그것은 프론트엔드 빌드 커버리지가 api-server 의 dependency 변경에 끌려가는 **설계 변경**이므로
   본 WO 범위(`전체 빌드 시스템 재설계로 확대하지 않는다`)에서 제외했다.
5. **인용부호는 큰따옴표.** 최초 구현에서 CI 와 동일하게 작은따옴표를 썼더니
   Windows `cmd.exe` 가 리터럴로 처리해 `No projects matched the filters` 로 **조용히 no-op** 했다.
   큰따옴표는 bash · cmd 양쪽에서 동작한다. 이 함정은 회귀 가드 4번으로 고정했다.

API · runtime 동작 변경 0. dependency 추가·삭제·버전 변경 0. `pnpm-lock.yaml` 변경 0.

### 회귀 가드 (신규)

[apps/api-server/src/__tests__/build-packages-workspace-dependency-coverage.spec.ts](../../apps/api-server/src/__tests__/build-packages-workspace-dependency-coverage.spec.ts)
— 기존 raw-source spec 관례를 따른다 (스크립트 실행 · DB · 네트워크 접근 0). 기존 api-server test job 에서 자동 실행된다.

고정 계약 5건:

1. 루트 `build:api-deps` 존재 + `@o4o/api-server^...` 토폴로지 필터 사용
2. `build:packages` 체인이 `build:api-deps` 를 포함
3. api-server 워크스페이스 의존이 체인으로 전부 커버 (체인을 재귀 전개해 판정)
4. `@o4o/platform-core` 가 api-server 의존으로 선언돼 있음
5. `cmd.exe` 에서 깨지는 작은따옴표 필터 금지

CI workflow 파일은 수정하지 않았다 (본 WO 승인 범위는 루트 빌드 스크립트).

---

## 4. 클린 환경 재현 결과

`.gitignore` 대상 생성물임을 확인한 뒤, **위 17개 패키지의 `dist` · `tsconfig.tsbuildinfo` 만**
정확히 지정해 세션 임시 디렉터리로 이동했다. 광범위한 clean 명령은 쓰지 않았다.

| 검증 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | **PASS** (`Lockfile is up to date`) |
| 17개 `dist` 비운 상태에서 `pnpm run build:packages` | **PASS** (exit 0) |
| 빌드 후 `dist` 전수 확인 (34개 = 프론트 17 + api 의존 17) | **전부 존재** (missing 0) |

---

## 5. `platform-core/dist` 생성 확인

```text
packages/platform-core/dist/index.js
packages/platform-core/dist/store-identity/index.d.ts
packages/platform-core/dist/store-policy/index.d.ts
```

api-server tsconfig paths 가 가리키는 3개 진입점이 모두 생성된다.

---

## 6. api-server type-check · test

| 항목 | 수정 전 (dist 없는 클린 상태) | 수정 후 |
|---|---|---|
| `pnpm --filter @o4o/api-server run type-check` | **FAIL — 26 errors** (platform-core 25 + ai-core stale 1) | **PASS — 0 errors** |
| `pnpm run test` (jest) | — | **231/233 suites · 3,779/3,781 tests PASS** |
| 신규 회귀 가드 spec | — | **5/5 PASS** |

### 실패 2건 — 이번 변경과 무관 (로컬 환경 잔재)

| spec | 단언 | 원인 |
|---|---|---|
| `legacy-wordpress-block-editor-retirement.spec.ts` | `packages/block-core` 부재 | 로컬 디스크에 `dist/` · `node_modules/` 잔재 |
| `shortcode-domain-retirement.spec.ts` | `packages/cosmetics-seller-extension` 부재 | 로컬 디스크에 `dist/` · `node_modules/` · `tsconfig.tsbuildinfo` 잔재 |

두 디렉터리 모두 **git 추적 파일 0건**이며 내용은 `.gitignore` 대상 빌드 산출물뿐이다.
선행 은퇴 WO 가 소스를 제거한 뒤 남은 로컬 잔재이므로 **clean checkout(CI)에서는 재현되지 않는다.**
본 WO 범위 밖이고 다른 세션(`C:/tmp/o4o-block-core-retire`)의 작업 영역과 겹칠 수 있어 **삭제하지 않았다.**

---

## 7. lockfile · dependency 변경 여부

| 항목 | 결과 |
|---|---|
| `pnpm-lock.yaml` | **변경 0** |
| dependency 추가·삭제·버전 변경 | **0** (루트 `package.json` 의 `scripts` 절만 수정) |
| 개별 package `build` script 변경 | **0** |

---

## 8. 영향받지 않은 범위

- `.github/workflows/**` · `apps/api-server/Dockerfile` — 미변경 (조사만 수행)
- runtime · API 계약 · entity · migration — 미변경
- ops-metrics `services`·`opsStatus` / Channel schema / Cafe24 B2B / GlycoPharm 복구 / dependency 정리 — WO 제외 범위, 미접촉
- `scratchpad/` — 미접촉 (삭제·이동·수정·커밋 0)
- `C:/tmp/o4o-cafe24-pilot` worktree 및 그곳의 `main` — 미접촉
- `work/kpa-branch-annual-report-review-v1` branch — 미접촉

---

## 9. 최종 판정

```text
PLATFORM_CORE_IN_CANONICAL_BUILD = PASS
CLEAN_WORKSPACE_BUILD            = PASS
API_SERVER_TYPECHECK             = PASS
API_SERVER_TEST                  = PASS (무관한 로컬 잔재 2건 제외 — §6)
LOCKFILE_CHANGE                  = 0
DEPENDENCY_CHANGE                = 0
UNRELATED_CHANGE                 = 0
```

**판정: CLOSED**

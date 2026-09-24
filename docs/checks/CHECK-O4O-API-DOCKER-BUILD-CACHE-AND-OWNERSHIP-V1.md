# CHECK · O4O API Docker 빌드 캐시 · 소유권 정리

> **WO**: `WO-O4O-API-DOCKER-BUILD-CACHE-AND-OWNERSHIP-V1` (사용자 직접 지시 · 배포/CI 소요시간 개선 3번 항목)
> **구현 commit**: `6245d41df`
> **선행**: [`CHECK-O4O-CI-BUILD-JOB-PARALLELIZATION-V1`](CHECK-O4O-CI-BUILD-JOB-PARALLELIZATION-V1.md)
> **상태**: COMPLETE — 운영 배포 · smoke PASS · warm cache 실측 PASS (§4, run `35978611257`)
> **작성일**: 2026-09-24

---

## 0. 한 줄 요약

API 이미지 빌드를 `docker build --no-cache` → `docker buildx` + Artifact Registry `:buildcache` 레이어 캐시로 바꾸고,
마지막 `RUN chown -R o4oapi:nodejs /app` 를 `COPY --chown` 으로 대체했다.
cold cache 첫 배포에서도 **Build and Push 152s → 96s**, build-and-deploy 잡 **490s → 378s**.

## 1. 기준선 (run `35864390517`, `3c7083be5`)

| 구간 | 소요 |
|---|---|
| npm install (deps stage) | 32.5s |
| `RUN chown -R o4oapi:nodejs /app` | 27.9s — node_modules 전체를 한 레이어 더 복제 |
| exporting to image | 25.8s |
| push | ≈45s |
| **Build and Push Docker image** | **152s** |
| build-and-deploy 잡 | 490s |

`--no-cache` 는 2025-12 `9ef911fde`("Docker layer caching was reusing old dist folder")에서 추가됐다.
GitHub-hosted runner 는 매번 빈 Docker 로 시작하므로 **현재 경로에서는 실효가 없었다**.

## 2. 변경

| 파일 | 변경 |
|---|---|
| `apps/api-server/Dockerfile` | `adduser` 와 같은 RUN 에서 `/app` 만 비재귀 chown · 모든 `COPY` 에 `--chown=o4oapi:nodejs` · `RUN chown -R` 제거 · **ownership guard**(`/app` 아래 o4oapi:nodejs 아닌 항목 1개라도 있으면 빌드 실패) · `RUN ls -la /app/dist/` (과거 post-build 목록 출력 이동) |
| `.github/workflows/deploy-api.yml` | `docker buildx create --driver docker-container` · `--cache-from/--cache-to type=registry,ref=…:buildcache,mode=max,image-manifest=true,oci-mediatypes=true` · `--push` · push 후 `docker buildx imagetools inspect` · `--no-cache` 제거 |

**바꾸지 않은 것 / 안전성 근거**

- `CACHEBUST` (`RUN echo ${CACHEBUST}`) 는 모든 dist · assets · templates COPY **앞**에 그대로 있다 → 그 레이어들은 캐시 재사용 불가. 캐시가 재사용할 수 있는 것은 base image · npm install · node_modules 뿐이며 키는 `package.production.json` 내용이다 → `9ef911fde` 의 stale dist 사고는 재발 경로가 없다.
- 이미지 내용 검사(`dist/main.js` · `dist/migrate.js` · migrations 존재)는 Dockerfile RUN 으로 빌드 실패를 강제 — 기존과 동일.
- 캐시 ref 가 없거나 읽기 실패면 buildx 는 경고 후 캐시 없이 빌드한다(배포 실패 아님) — 첫 run 에서 실증 (§3-2).
- step 이름(`Build and Push Docker image` 등) · 순서 · CMD 불변 → 소비처 테스트 영향 없음.

## 3. 검증

### 3-1. 소비처 · 정적

| 항목 | 결과 |
|---|---|
| `node --test scripts/ci/__tests__/detect-affected.test.mjs` | 72 pass / 0 fail |
| `node scripts/db/check-migration-contract.mjs` (C19 Dockerfile CMD 포함) | 21 pass / 0 fail |
| `database-migration-ownership-startup-health-final-closure.spec.ts` · `api-database-readiness-cold-start-gate.spec.ts` | 2 suites / 49 tests pass |
| deploy-api.yml YAML parse | OK |
| `--no-cache` · `chown` 을 단언하는 소비처 | 0 (`apps/api-server/deploy-cloudrun.sh` 는 레거시 수동 스크립트 — 범위 밖, 미변경) |

### 3-2. 실 배포 — run `35947666020` (commit `6245d41df`)

- `environment: production` 승인 게이트(`f2fdead81`, 타 세션 추가)에서 대기 → 배포 대상이 `7a44a97bc..6245d41df` = 본 변경 2파일뿐(앱 코드 0)임을 확인 후 **사용자 승인 하에** API 로 approve.

| step | 기준선 | 본 run |
|---|---|---|
| Setup build environment | 133s | 106s |
| Build and Push Docker image | **152s** | **96s** |
| Run database migrations | 42s | 32s |
| Refresh one-off Cloud Run job image references | 40s | 36s |
| **build-and-deploy 잡** | **490s** | **378s** |

Docker 로그:

- `importing cache manifest … :buildcache` → `not found` (첫 run, 예상) → 캐시 없이 계속 진행
- npm install 32.3s (cold) · ownership guard 통과 · exporting layers 9.7s · pushing layers 15.7s
- `exporting cache to registry` DONE 21.7s → Artifact Registry 에 `buildcache` tag 생성 확인

> cold 에서도 줄어든 이유: `chown -R` 레이어(27.9s + node_modules 중복분 export/push) 제거.
> Setup · migration 편차는 runner/네트워크 편차이며 본 변경 효과로 계상하지 않는다.

### 3-3. 운영 smoke

| 항목 | 결과 |
|---|---|
| `o4o-core-api` 이미지 | `api-server:6245d41df…` · revision `o4o-core-api-03749-9p8` · traffic 100% |
| `GET /health` | 200 `alive` |
| `GET /health/ready` | 200 `ready` |
| `GET /api/health` | 200 · `database.status = healthy` |
| migration Job (`o4o-api-migrations`, 새 이미지 · 비루트 사용자) | success |
| one-off Job 8개 이미지 참조 | 전부 `6245d41df…` |
| 새 revision ERROR / `EACCES` 로그 (30분) | 0 / 0 |

## 4. warm cache 실측 — run `35978611257` (commit `b2925e765`, Password Phase B-1 통제 배포 · 타 세션)

측정만을 위한 운영 재배포는 하지 않았다. 타 세션의 통제 배포 창을 그대로 관측했다.

| 항목 | 결과 |
|---|---|
| `importing cache manifest … :buildcache` | DONE 5.2s (hit) |
| `[deps 4/4] RUN npm install --omit=dev …` | **`CACHED`** |
| base · WORKDIR · COPY package.json · node_modules COPY | `CACHED` |
| **Build and Push Docker image** | **54s** (기준선 152s · cold 96s) |
| build-and-deploy 잡 전체 | **272s** (기준선 490s — 4·6번 효과 포함) |
| 운영 | `o4o-core-api` = `b2925e765` · `/api/health` 200 · `database: healthy` |

## 5. 남은 개선 (별도 항목)

- 4번: deploy-api `Setup build environment` 가 `build:packages` 전체(프론트 패키지 포함)를 빌드 → `@o4o/api-server^...` closure 로 축소.

## 6. 문서 정합

해당 없음.

*작성: 2026-09-24*

# CHECK · 배포 job 부트스트랩 경량화 (checkout · Cloud SDK)

> **WO**: `WO-O4O-DEPLOY-JOB-BOOTSTRAP-SLIMMING-V1` (사용자 판단 위임 · 배포/CI 소요시간 개선 6번)
> **구현 commit**: `6ae232ea1`
> **선행**: [`CHECK-O4O-CI-FRONTEND-TYPECHECK-PARALLELIZATION-V1`](CHECK-O4O-CI-FRONTEND-TYPECHECK-PARALLELIZATION-V1.md)
> **상태**: COMPLETE — 실 배포 실측 완료 (§4-1). checkout 절감 확인 · `skip_install` 은 **효과 미미**(인증 첫 호출이 시간을 차지)
> **작성일**: 2026-09-24

---

## 0. 한 줄 요약

배포 job 11개(web 9 · admin 1 · api 1) 모두가 매번 **1.25GB 운영 데이터 매니페스트를 checkout** 하고
**Cloud SDK 를 새로 설치**하던 것을 없앴다.

## 1. 조사

### 1-1. web 배포 step (run `35942371391`, 9 job 병렬)

| step | 소요 (job 별) |
|---|---|
| Checkout code | 22~25s — 그중 `git fetch --depth=1` 단일 commit 이 ≈19s |
| Set up Cloud SDK | 17~27s — SDK 다운로드·설치 |
| Build and push Docker image | 38~80s |
| Deploy to Cloud Run | 11~21s |

admin · api 배포 job 도 같은 checkout · setup-gcloud 구성.

### 1-2. checkout 이 느린 이유

| 경로 | HEAD tree 크기 |
|---|---|
| 전체 | 1,585 MB / 28,085 files |
| `apps/api-server/src/scripts/data` | **1,248 MB** (HFF/OTC 운영 manifest JSON, 단일 파일 최대 33.6 MB) |
| `docs/checks` | 87 MB |

`scripts/data` 를 배포 빌드가 쓰는지 전수 확인:

| 경로 | 결과 |
|---|---|
| api `tsconfig.build.json` | `src/scripts/**/*` exclude |
| api tsup | entry 9개 명시 (main · migrate · job 7) — scripts/data import 없음 |
| api `Dockerfile` | COPY 대상 아님 |
| web Dockerfile | build context 전송 726 KB (필요 경로만 COPY) |
| runtime 코드 · `__tests__` (`src/scripts/**` 외) 의 `scripts/data` 참조 | 0 (문자열 · `path.join('scripts','data')` 형태 모두) |

## 2. 변경

| 파일 | 변경 |
|---|---|
| `deploy-web-services.yml` | 배포 job 9개 checkout: `sparse-checkout` (`/*` · `!/apps/api-server/src/scripts/data/`, non-cone) · `setup-gcloud` 9개 `skip_install: true` |
| `deploy-admin.yml` | deploy job checkout 1 · setup-gcloud 1 동일 |
| `deploy-api.yml` | build-and-deploy checkout 1 · setup-gcloud 1 동일 |

- actions/checkout 은 `sparse-checkout` 지정 시 `blob:none` 부분 fetch 를 쓰므로 제외 경로의 blob 은 **다운로드 자체가 없다**.
- **바꾸지 않은 것**: detect job 3개(`fetch-depth: 0`, push batch diff 용) · CI workflow · 승인 게이트 · 빌드 명령.
- `skip_install: true` — GitHub ubuntu runner 이미지에 gcloud 가 설치돼 있다. auth · project 설정은 그대로 action 이 한다.

## 3. 검증

| 항목 | 결과 |
|---|---|
| 적용 개수 (sparse / skip_install) | web 9/9 · admin 1/1 · api 1/1 · detect checkout 불변 |
| YAML parse 3파일 | OK |
| `node --test scripts/ci/__tests__/detect-affected.test.mjs` | 72 pass / 0 fail |
| `node scripts/db/check-migration-contract.mjs` | 21 pass / 0 fail |
| deploy workflow 를 읽는 api-server spec 8개 (signage-player-web-deployment-contract · unified-store-workspace-foundation · canonical-database-bootstrap… · ecommerce-core… · api-database-readiness… · database-migration-ownership… · build-packages-workspace-dependency-coverage · deployment-domain-retirement) | 8 suites / 155 tests pass |
| CI run `35953831688` (`6ae232ea1`) | success · 435s |
| deploy run 3개 (`6ae232ea1`) | 배포 job 전부 **skipped** (`deploy-hold-notice` 실행 = `DEPLOY_ENABLED` 차단 상태, workflow-only 변경) |
| sparse 패턴 로컬 재현 (별도 clone) | **미실행** — 로컬 clone 명령이 권한 거부됨. 패턴은 actions/checkout 문서의 non-cone 예시 형식 그대로 |
| sparse 패턴 실 runner 실증 (후속) | **PASS** — 동일 패턴을 CI 에 적용한 run `35956356976` 에서 `fetch --filter=blob:none` · checkout 24,269 = 28,086 − 3,817(`scripts/data`) 로 정확히 해당 디렉터리만 제외됨. 근거: [`CHECK-O4O-CI-SPARSE-CHECKOUT-DATA-EXCLUSION-V1`](CHECK-O4O-CI-SPARSE-CHECKOUT-DATA-EXCLUSION-V1.md) §3-1. 남은 checkout 시간(≈16s)은 나머지 파일 blob fetch 라 §4 의 checkout 기대치는 **≈17~18s** 로 정정 |

## 4. PENDING — 다음 배포 창에서 기록

| 항목 | 기대 |
|---|---|
| Checkout code (web/admin/api) | 22~25s → ≈17~18s (CI 실증치 기준으로 정정 — 초판 기대 ≈5~8s 는 과대) |
| Set up Cloud SDK | 17~27s → ≈2~5s |
| web 배포 job 1개 | ≈110~150s → ≈75~115s |
| log 에서 `apps/api-server/src/scripts/data` 부재 · 빌드 성공 | 필수 |

**실패 시**: checkout · SDK 설정 · 빌드는 모두 이미지 push · migration · Cloud Run deploy **이전** 단계라 운영 영향 없음. 복구는 `6ae232ea1` revert 1 커밋.

### 4-1. 실측 결과 (2026-09-24, Password Phase B-1 통제 배포 창 · 타 세션 — 측정 전용 배포 없음)

| run | job | Checkout (기준 22~25s) | Set up Cloud SDK (기준 17~27s) | job 전체 |
|---|---|---|---|---|
| `35978611257` api `b2925e765` | build-and-deploy | **19s** | 22s | 272s (기준 490s — 3·4번 포함) |
| `35978614989` admin `b2925e765` | deploy | **18s** | 28s | failure (아래) |
| `35989259445` admin `a6571915c` | deploy | **18s** | 10s | 140s (기준 142s) |
| `35979164238` web `18d519a5d` | deploy-neture | **16s** | 8s | **111s** (기준 146~153s) |

- **sparse checkout: 효과 확인** — 매 job ≈5~8s 절감, 전 run 에서 빌드 성공 (scripts/data 부재가 빌드에 영향 없음 실증).
- **`skip_install: true`: 효과 미미** — 로그상 `Skipping installation ("skip_install" was true)` 로 설치는 생략됐으나,
  직후 **첫 gcloud 인증 호출(`Successfully authenticated`)이 ≈19s** 를 차지해 step 합계가 8~28s 로 기준과 비슷하다.
  해가 없어 되돌리지 않는다(되돌리면 오히려 배포 경로 변경 1회 추가).
- **admin `35978614989` 실패는 본 변경과 무관** — `refs/tags/deploy/2026-09-24-phase-b1-r2` 태그 ref 로 dispatch 됐는데
  `Determine deployment target` 이 `refs/heads/main|develop` 만 처리해 `image_name` 이 비어 Docker tag 가 `…/o4o-api/:<sha>` 로 조립됐다
  (`invalid reference format`, Cloud Run 이전 단계 · 운영 영향 0). 타 세션이 `a6571915c` 에서 태그 ref 지원 + fail-closed 로 수정했고 재배포 성공.
  같은 run 에서 본 변경의 checkout · Cloud SDK step 은 success.
- 운영: `o4o-core-api` = `b2925e765` · `o4o-admin-dashboard` = `a6571915c` · `/api/health` `database: healthy` · admin 200.

## 5. 범위 밖 발견 (보고만 — 별도 판단)

1. **배포 wall-clock 의 대부분은 승인 대기다.** run `35942371391`(web) · `35942373982`(admin): detect 종료 01:20 → 배포 job 시작 02:20, **총 64분 중 ≈60분이 `environment: production` 승인 대기**.
   게이트(`f2fdead81`)는 2026-09-23 사건 후 도입된 의도적 보안 정책이며 본 트랙이 완화하지 않는다.
   가능한 마찰 감소(정책 불변) 예: 한 push 가 만든 API · Web · Admin 대기 run 을 **변경 요약과 함께 한 번에 승인**하는 절차/도구 — 사용자 결정 사항.
2. **운영 데이터 1.25GB 가 git tree 에 있다** (`apps/api-server/src/scripts/data`). 본 변경은 배포 job 에서만 피했을 뿐,
   CI job 7개 · 로컬 clone · 신규 worktree 는 계속 받는다. 저장 위치 정책(GCS 이전 · 별도 저장소 등)은 데이터 생산 트랙 소관 — 별도 WO.
3. CI job(quality-check · Jest shard · build)에도 같은 sparse 를 적용할 수 있다. 사전 조사 결과:
   `src/scripts/**` 안의 spec/test 0개 · `scripts` 경로를 읽는 test 2개(`encryption-key-rotation-runner` = `../scripts/encryption-key-rotation.js` import,
   `database-migration-ownership…` = package.json script 참조 파일 존재 검사) 모두 `scripts/data` 무관 · package.json 의 `scripts/data` 참조 0.
   단 CI 는 모든 push 의 게이트이므로 배포 job 실측(§4) 후 별도 적용한다. detect job(`fetch-depth: 0`)은 rename 판정 시 blob 지연 fetch 위험이 있어 제외.

## 6. 문서 정합

해당 없음.

*작성: 2026-09-24*

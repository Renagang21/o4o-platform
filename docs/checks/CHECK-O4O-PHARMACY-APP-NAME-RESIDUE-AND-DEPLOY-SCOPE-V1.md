# CHECK-O4O-PHARMACY-APP-NAME-RESIDUE-AND-DEPLOY-SCOPE-V1

- 작성: 2026-10-25 · branch `wo/pharmacy-stage6-name-residue` · base `42dddc91b5`
- 상태: ACTIVE · 로컬 정리 · 검증 완료, main 통합 · 배포 전 · 운영 이름 전환은 미실행(§5)
- 연결: [WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1](../work-orders/WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1.md) 단계 6 · DONE_CRITERIA 5
- 범위: 약국 공통 앱(`services/web-kpa-society` · Cloud Run `kpa-society-web`)의 명칭 잔재 목록과 처리 여부, Lecture 전용 변경이 약국 앱을 배포한 원인 수정

## 1. 불필요 배포 — 증상과 원인

- 증상: PR #809(Lecture) 병합 commit `42dddc91b5` 의 Promote 가 `api` · `lecture` 와 함께 `kpa-society`(약국 앱)를 배포했다. Classify 판정은 `kpa-society | BEHIND | LEVEL_2 | PROMOTE`.
- 원인: 판정기(`scripts/ci/detect-affected.mjs` `classifyWebDeploy` — Delivery 와 Promote(`deploy-risk.mjs`) 공통)는 workspace `package.json` 선언으로 의존 closure 를 만든다. 약국 앱 serving SHA `4ee5a8ecda` 이후 Web 쪽 변경 중 약국 앱에 닿은 것은 `packages/lms-ui/**` 5개 파일뿐이었고, 약국 앱은 `@o4o/lms-ui` 를 **선언만** 하고 import 하지 않았다. 단계 4-a 에서 옛 KPA 화면 329개를 지울 때 manifest 를 정리하지 않은 잔재다.
- 판정기 자체는 설계대로 동작했다. 예외 목록 · 약국 앱 제외 규칙을 추가하지 않고 선언을 실제 의존에 맞췄다.

## 2. 처리 — 약국 앱 선언 의존성 정리

`services/web-kpa-society/src` 에서 import 0건인 workspace 선언 9개를 뺐다. 남은 의존 package 가 이 9개를 import 하는 곳도 0건이다(간접 사용 없음).

| 선언 | src import | 설정 참조 |
|---|---|---|
| `@o4o/admin-ux-core` · `@o4o/ai-components` · `@o4o/lms-ui` · `@o4o/screen-content-core` · `@o4o/store-asset-policy-core` · `@o4o/store-products-ui` · `@o4o/tablet-screen-set-editor` | 0 | Dockerfile COPY 만 |
| `@o4o/lms-client` | 0 | Dockerfile COPY · build, vite alias, tsconfig paths |
| `@o4o/operator-core` | 0 | Dockerfile COPY, tailwind content glob |

- 바꾼 파일: `package.json`(9줄) · `Dockerfile`(COPY 18줄 · `lms-client` build 1줄) · `vite.config.ts` · `tsconfig.json`(alias 각 1줄) · `tailwind.config.js`(glob 1줄) · `pnpm-lock.yaml`(약국 앱 importer 27줄 삭제만).
- lockfile: `pnpm install --lockfile-only` 가 `services/web-store` importer 의 순서만 바꾼 hunk 를 함께 만들었다. 이 hunk 가 남으면 store 가 lockfile 변경으로 배포 대상이 되므로 원래 순서로 되돌렸다.
- 약국 앱 closure: 27 → 18 package. 빠진 것은 위 9개뿐이다.
- 회귀 고정: `scripts/ci/__tests__/detect-affected.test.mjs` §23b(약국 앱 DECLARED_UNUSED 0) · §23c(Lecture 전용 package → 약국 앱 배포 안 함 · lecture 배포 · 약국 앱 소스 / manifest / 실사용 공통 모듈 → 약국 앱 배포).

### 수정 전후 판정 (실제 구간 `4ee5a8ecda..42dddc91b5`)

| | Web 배포 대상 | 약국 앱 사유 |
|---|---|---|
| 수정 전 | `kpa-society` · `lecture` | `@o4o/lms-ui` closure 변경 5건 |
| 수정 후 | `lecture` | — |

## 3. 검증 (로컬, worktree `42dddc91b5` + 이 변경)

| 검사 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | PASS — lockfile 추가 변동 0 |
| `pnpm --filter "@o4o/web-kpa-society^..." build`(약국 앱 closure, 순차) | PASS |
| `pnpm run build:packages`(전체 병렬) | FAIL — `digital-signage-core` 등 closure 밖 package 병렬 tsc 중 Node 네이티브 크래시(exit 2147483651). 이 변경과 무관, 위 closure 빌드로 대체 |
| 약국 앱 `tsc --noEmit` · `vite build` | PASS · PASS |
| 약국 앱 vitest | PASS — 19 files / 140 tests |
| `node --test scripts/ci/__tests__/detect-affected.test.mjs` | PASS — 80 (신규 §23b · §23c 포함) |
| deploy-risk · deploy-orchestrate · level3-precision · deploy-workflow-diff · deploy-workflow-gates | PASS — 227 |
| api-server `unified-store-workspace-foundation.spec`(약국 Dockerfile 을 읽는 spec) | PASS — 22 |
| `node scripts/check-doc-sensitive.mjs` · `git diff --check` | PASS · PASS |
| 브라우저(390 · 1440px) | 해당 없음 — UI 이름 · 메뉴 · 경로 변경 없음 |
| 세션 전용 DB | 해당 없음 — DB 검증 불필요, 생성 데이터 0 |

- API · LEVEL 3 · freeze · SHA/CI gate 판정 코드는 바꾸지 않았다. 이 변경이 main 에 들어가면 약국 앱 자체 변경이므로 `kpa-society` 1개만 Web 배포 대상이 된다(§4 이후 판정 실측).

## 4. 명칭 잔재 목록과 처리 여부

| # | 잔재 | 현재 연결 | 처리 | 근거 |
|---|---|---|---|---|
| R1 | 약국 앱 manifest 의 미사용 선언 9개 | 판정기 closure | **처리**(§2) | 불필요 배포의 직접 원인 |
| R2 | 앱 디렉터리 `services/web-kpa-society` · package 이름 `@o4o/web-kpa-society` | 비문서 파일 56개(api-server raw-path spec 21개 포함) · Dockerfile · `deploy-web-services.yml` · 판정기 registry · lockfile importer | **유지** | 새 이름이 정해지지 않았다(WO OUT_OF_SCOPE "네 사업 상위 분류 이름 결정"). 이름 없이 옮기면 절반 rename 이 된다 |
| R3 | Cloud Run 서비스 · 이미지 `kpa-society-web` | `deploy-web-services.yml` build · deploy · rollout · describe, LB backend(`scripts/README.md` 기준 pharmacy · megapharm host — 이번에 운영 LB 는 조회하지 않았다) | **유지 · 전환안만**(§5) | 운영 인프라 변경 — 이번 요청 범위 밖 |
| R4 | run.app 주소 `kpa-society-web-…run.app` | `apps/api-server/src/bootstrap/setup-middlewares.ts:78` CORS 허용, `deploy-web-services.yml:75` `VITE_KPA_URL` | **유지 · R3 와 함께** | `VITE_KPA_URL` 소비처 0, CORS 항목은 ingress 가 LB 전용이면 쓰이지 않는다. 다만 workflow 수정은 판정기에서 전 서비스 배포가 되고, CORS 는 API 계약이라 R3 전환 작업에 묶는다 |
| R5 | 서비스 키 `kpa-society` | 비문서 파일 412개, 운영 DB(`service_memberships` · `platform_services` · 콘텐츠 행 등) | **유지** | 단계 3(서비스 키 일반화) · 단계 5(테스트 데이터 정리) 범위. 문자열 치환 금지 |
| R6 | 문서 · 주석의 `kpa-society-web` 서술(`scripts/README.md`, `.github/workflows/README.md`, `setup-middlewares.ts:74` 주석) | 현행 이름 그대로 맞다 | **유지** | 실제 Cloud Run 이름이 바뀌기 전까지는 정확한 서술 |

### 범위 밖에서 발견 — 보고만

다른 Web 서비스에도 import 0건인 선언이 있다. 같은 종류의 불필요 배포가 생길 수 있으나 약국 앱 작업 범위 밖이라 고치지 않았다.

- `services/web-neture`: `@o4o/operator-core` · `@o4o/screen-content-core` · `@o4o/tablet-kiosk-core`
- `services/web-store`: `@o4o/lms-client` · `@o4o/screen-content-core` — Lecture 의 `lms-client` 변경이 store 를 배포시킨다
- `services/web-kpa-branch`: `@o4o/types`
- 약국 앱 Dockerfile 이 closure 밖 `packages/hub-core` · `packages/utils` 를 COPY 한다(판정에는 영향 없음).

## 5. 운영 이름 전환안 (미실행)

Cloud Run 이름을 바꾸는 것은 **새 서비스를 만들고 트래픽을 옮기는 작업**이다. 이름 변경 명령은 없다.

1. 사전: 새 이름 결정(R2 와 같은 결정) · 현재 `kpa-society-web` 의 env · secret 참조 · 서비스 계정 · ingress · 최소 인스턴스 · revision label 기록.
2. 새 서비스 배포: 같은 SHA 이미지로 새 이름 서비스를 만들고 LB 가 아닌 경로로는 접근할 수 없게 ingress 를 같게 둔다.
3. LB: 새 serverless NEG · backend service 를 만들고 pharmacy · megapharm host rule 을 새 backend 로 바꾼다(`validate` 후 import).
4. 코드: `deploy-web-services.yml` 의 이름 · 이미지 경로 · `VITE_KPA_URL` 제거, CORS run.app 항목 제거, `scripts/ci/__tests__/deploy-workflow-diff.test.mjs` fixture, README 2곳. 이 commit 은 판정기에서 전 서비스 배포가 된다.
5. 검증: 두 host 200 · 새 revision 이 serving · 옛 서비스 트래픽 0.
6. 복구: 3단계 전이면 새 서비스 삭제만. 3단계 뒤 문제가 생기면 host rule 을 옛 backend 로 되돌린다(옛 서비스는 검증 기간 동안 지우지 않는다).
7. 정리: 검증 기간 후 옛 서비스 · 이미지 · NEG 삭제 — 운영 리소스 삭제라 사용자 승인 필요.

## 6. 단계 6 항목별 상태

| 항목 | 상태 |
|---|---|
| Cloud Run 이름 `kpa-society-web` | 잔여 — 전환안 §5, 이름 결정 · 사용자 승인 대기 |
| 앱 디렉터리 `services/web-kpa-society` | 잔여 — 이름 결정 대기 |
| 서비스 키 `kpa-society` | 잔여 — 단계 3 · 5 |
| 명칭 잔재 목록 · 처리 여부 기록(DONE_CRITERIA 5) | 이 문서 |

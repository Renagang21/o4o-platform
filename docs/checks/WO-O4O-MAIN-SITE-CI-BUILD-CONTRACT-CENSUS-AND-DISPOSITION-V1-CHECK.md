# WO-O4O-MAIN-SITE-CI-BUILD-CONTRACT-CENSUS-AND-DISPOSITION-V1 — CHECK

> **최종 판정: `REDUCE_TO_LIGHTWEIGHT_CHECK`**
> `apps/main-site` 를 CI build matrix 에서 제외한다.
> 경량 검사(`type-check:frontend` + `eslint .`)는 그대로 유지한다.
> 루트 aggregate build 스크립트는 **변경하지 않는다**.

- 작성일: 2026-08-26
- 기준 commit: `d525575a1831c8c3f312fedc06327eb1fa16a363`
- DB 변경: schema change 0 / migration 0 / production write 0 / SELECT 0
- runtime 변경: **0** (main-site 는 이미 RETIRED_RUNTIME)

---

## 1. 배경 — 왜 다시 보는가

`apps/main-site` 는 이미 세 번 축소됐다.

| WO | 내용 |
|---|---|
| `WO-O4O-MAIN-SITE-DECOMMISSION-FINAL-CLOSURE-V1` | Cloud Run `o4o-main-site` · `deploy-main-site.yml` 폐기 → **RETIRED_RUNTIME** |
| `WO-O4O-MAIN-SITE-APPSTORE-PARALLEL-AXIS-CENSUS-AND-RETIREMENT-V1` | 병렬 App Store 축 은퇴 |
| `WO-O4O-MAIN-SITE-NEXTGEN-VIEWRENDERER-DOMAIN-CENSUS-AND-RETIREMENT-V1` | NextGen ViewRenderer 프레임워크 197파일 은퇴 |

그런데 runtime 이 사라진 뒤에도 `ci-pipeline.yml` 은 push/PR 마다 main-site 를
**full production build** 한다. 이 WO 는 "배포 안 하니 build 도 빼자" 가 아니라
**현재 build 가 실제로 무엇을 보호하는지 먼저 증명한 뒤** 유지/축소/제거를 정한다.

---

## 2. 결론 요약

| 질문 | 측정 결과 |
|---|---|
| build artifact 를 쓰는 곳이 있나 | **없다** — 저장소 전체 `uses: actions/download-artifact` **0회** |
| build job 에 의존하는 job 이 있나 | **없다** — `build` 는 terminal job (`needs: build` 0회) |
| required status check 인가 | **아니다** — `main` 에 branch protection 없음, ruleset 0개 |
| 최근 build 가 회귀를 잡았나 | **아니다** — 최근 run 60회에서 `Build Applications` 실패 **0회** |
| build 만이 보호하는 소스가 있나 | **없다** — tsc 검사 범위(102) ⊃ Vite graph(27) |
| production 영향이 있나 | **없다** — `NO_RUNTIME_EFFECT` |
| 비용은 | main-site build 1회 **2분24초 ~ 3분13초** × 모든 push/PR |

→ main-site build 는 **품질 보호가 아니라 역사적 관성**이다. 다만 "컴파일 가능 상태 유지"
라는 원래 의도(`apps/main-site/README.md` 에 명시)는 유효하므로, 그 의도를 **이미 더 넓게
수행 중인 경량 검사**에 위임하고 build 만 제거한다 → `REDUCE_TO_LIGHTWEIGHT_CHECK`.

---

## 3. CI Build 계약 Census

`main-site` 문자열은 전체 workflow 11개 중 **`ci-pipeline.yml` 단 한 곳**(build matrix)에만 있다.

| 계약 | 호출자 | 실제 동작 | Production 영향 | 판정 |
|---|---|---|---|---|
| `ci-pipeline.yml` `build` matrix `main-site` | GitHub Actions (push main/develop, PR→main, dispatch) | `bash scripts/ci-build-app.sh main-site` → `cd apps/main-site && pnpm run build` (= `tsc && vite build`) | **없음** | **REMOVE** |
| `Upload build artifacts` (`main-site-dist`) | 같은 job | `upload-artifact@v7`, `continue-on-error: true`, 보존 7일 | **없음** (소비자 0) | **REMOVE (동반)** |
| root `build:main-site` | `build:apps` · `build:apps:all` · `build:web` | `cd apps/main-site && pnpm run build` | 없음 | **KEEP** (§11) |
| root `build:apps` | root `build` · `ci-build-app.sh:83`(`all` 분기) · `ci-complete-setup.sh:36` | `build:main-site && build:admin` | 없음 | **KEEP** |
| root `build:apps:all` / `build:web` | 없음 (root package.json 정의만) | — | 없음 | **KEEP** (§11 근거) |
| `scripts/dev.mjs` `runBuild()` | 로컬 `node scripts/dev.mjs build` | `apps/{main-site,admin-dashboard,api-server}` 순회 build | 없음 | **KEEP** |
| `type-check:frontend` → main-site | `ci-pipeline.yml` `quality-check` (**blocking**) | `apps/main-site` `pnpm run typecheck` (`tsc --noEmit`) | 없음(소스 품질) | **KEEP — 이것이 실질 보호막** |
| `lint-ratchet.mjs` | 같은 job (**ratchet blocking**) | 루트 `eslint .` — main-site 포함 | 없음(소스 품질) | **KEEP** |

### 3-1. build job 구조

```
quality-check  ──needs──▶  build (matrix: main-site, admin-dashboard)  ──▶ (끝)
```

- `ci-pipeline.yml` 은 job 2개뿐이고 파일은 `build` job 에서 끝난다.
- 저장소 어떤 workflow 도 `needs: build` 를 쓰지 않는다.
- 저장소 어떤 workflow 도 `main-site-dist` 를 참조하지 않는다.
- `concurrency.cancel-in-progress: true` 라 연속 push 시 `cancelled` 가 많다(최근 60회 중 28회).
  이는 실패가 아니다.

---

## 4. 이 build 가 실제로 보호하는 것 / 보호하지 않는 것

**보호하는 것**

- Vite/Rollup module resolution 오류 (진입점에서 도달 가능한 27개 파일 범위)
- asset import · tailwind/postcss 파이프라인 동작
- 워크스페이스 패키지 `dist` 와의 결합(단, 이는 admin-dashboard build 가 동일하게 커버)

**보호하지 않는 것**

- **production 동작** — 배포 대상이 아니다.
- **타입 안정성** — `quality-check` 의 `tsc --noEmit` 이 이미 더 넓게 한다.
- **lint 회귀** — 루트 `eslint .` 가 이미 한다.
- **고아 소스 75개** — Vite graph 밖이라 build 는 애초에 보지 않는다 (§7).

**중복 지적:** main-site 의 `build` 는 `tsc && vite build` 다.
그 **tsc 절반은 `quality-check` 에서 이미 실행된 것과 동일**하다. 즉 build job 이
추가로 제공하는 유일한 가치는 `vite build`(번들링) 한 겹이다.

---

## 5. Live graph 재확인 — route 판정

실제 라우터는 `apps/main-site/src/router/index.tsx` 의 명시적 Route 표다.

| Route | 컴포넌트 | 판정 |
|---|---|---|
| `/login` | `pages/auth/LoginPage` | `HISTORICAL_ROUTE` |
| `/` | `pages/dashboard/DashboardPage` | `HISTORICAL_ROUTE` |
| `/org/:orgId` | `pages/dashboard/DashboardPage` | `HISTORICAL_ROUTE` |
| `/forum` · `/forum/post/:slug` | `pages/forum/*` | `HISTORICAL_ROUTE` |
| `/forum/write` | 인라인 "준비 중" placeholder | `HISTORICAL_ROUTE` |
| `/lms` · `/lms/courses` · `/lms/course/:id` · `/lms/course/:courseId/lesson/:lessonId` | `pages/lms/*` | `HISTORICAL_ROUTE` |
| `/seller/dashboard` · `/seller/dashboard/:sellerId` | `pages/seller/dashboard` | `HISTORICAL_ROUTE` |
| `/mypage/*` | 인라인 "준비 중" placeholder | `HISTORICAL_ROUTE` |
| `*` (404) | 인라인 | `HISTORICAL_ROUTE` |

**`ACTIVE_SOURCE_ROUTE` 는 0개다.** 이유는 라우트가 깨져서가 아니라(코드는 정상 컴파일된다)
**main-site 를 서빙하는 runtime 자체가 없기 때문**이다. Cloud Run service 0 · deploy workflow 0 ·
`deploy-main-site.yml` 부재. 따라서 `BROKEN_ROUTE` 가 아니라 `HISTORICAL_ROUTE` 로 판정한다.

실제 서비스되는 웹은 `services/web-neture` · `web-glycopharm` · `web-kpa-society` ·
`web-k-cosmetics` · `web-pharmacy-hub` · `web-kpa-branch` · `web-account` ·
`signage-player-web` 이며, 이들은 `deploy-web-services.yml` 로 배포된다.
그 workflow 의 `paths:` 필터에 `apps/main-site` 는 **없다**.

---

## 6. Source asset 가치 판정

| 축 | 파일 | 판정 | 근거 |
|---|---:|---|---|
| 진입점 도달분 (`src/router/` · `src/pages/**` · `layouts/MainLayout` · `src/context` · `components/common`) | 27 | `REFERENCE_SOURCE` | 컴파일 가능하고 구조가 온전해 신규 서비스 작성 시 참고 가치가 있다. 단 실행되지 않는다 |
| 고아 75개 (`hooks/queries/` 17, `components/forum/` 12, `design/components/` 10, `components/yaksa/` 7, `pages/yaksa/` 7, `design/tokens/` 6, `design/utils/` 3, 단독 13) | 75 | `HISTORICAL_SOURCE` | 진입점에서 도달 불가. `yaksa` 계열은 이미 도메인 제거됨 |
| 전체 `apps/main-site` | 102 | **`REFERENCE_SOURCE`** | 배포·소비 0이지만 참고 자산으로 README 에 명시적으로 보존 선언됨 |

**`ACTIVE_SOURCE_ASSET` 은 0개다.**
저장소 전체에서 `apps/main-site` 를 코드로 참조하는 곳은 **0**이다
(유일한 hit 2건은 은퇴 계약 spec 의 주석 문자열).
`apps/main-site` 를 workspace dependency 로 선언한 package 도 0이다.

> "언젠가 쓸 수도 있음" 만으로 active 판정하지 않는다는 §6 원칙에 따라,
> 참고 가치는 인정하되 **CI 가 강제 build 할 근거로는 쓰지 않는다.**

---

## 7. 고아 75개 vs build — Vite module graph 對 tsc project scope

이 WO 에서 가장 중요한 비교다.

| | 검사 주체 | 범위 결정 방식 | 실제 커버 |
|---|---|---|---|
| `vite build` | Rollup module graph | `index.html` → `src/main.tsx` 에서 **정적/동적 import 로 도달 가능한 것만** | **27 / 102** |
| `tsc --noEmit` | TypeScript project | `tsconfig.json` `"include": ["src"]` — **디렉터리 전체** | **102 / 102** |

`apps/main-site/tsconfig.json` 은 `strict` · `noUnusedLocals` · `noUnusedParameters` 이므로
고아 파일의 타입 오류·미사용 심볼도 전부 검출된다.

**결론: 고아 75개를 지키고 있는 것은 build 가 아니라 tsc 다.**
build 를 제거해도 고아 소스의 컴파일 가능성 보장은 **1도 줄지 않는다.**
반대로 build 만 남기고 tsc 를 빼면 75개는 즉시 무검사 상태가 된다.

이 사실은 §20 과도 연결된다 — 고아 정리 WO 는 이 build 제거와 **독립적으로** 진행 가능하다.

---

## 8. Build 비용

`gh run view` 로 최근 CI run 20회의 `Build Applications (main-site)` job 시간을 측정했다.

| run | 시간 |
|---|---|
| 32925776569 | 2분 54초 |
| 32923282004 | 3분 12초 |
| 32917547608 | 3분 03초 |
| 32854974602 | 3분 06초 |
| 32835720167 | 3분 13초 |
| 32822314907 | 2분 24초 |
| 32820698429 | 2분 27초 |
| 32818608671 | 3분 11초 |
| 32817079442 | 3분 07초 |
| 32814873873 | 3분 13초 |
| 32813367896 | 2분 38초 |
| 32812300585 | 2분 37초 |
| 32801888238 | 2분 59초 |

- 성공 13회 · `skipped` 7회(= `quality-check` 실패로 미실행) · 실패 **0회**
- 중앙값 약 **3분**, `runs-on: ubuntu-latest` runner 1대를 별도 점유
- 로컬 실측(직전 WO): `vite build` 39.19초 / 2036 modules. CI 시간의 대부분은
  `ci-build-app.sh` 의 `build:packages` + `pnpm install` 재실행이다

판정: **`MODERATE_COST`**
(단일 build 자체는 가볍지만, **모든 push/PR 마다** runner 1대 × 3분을 쓰고 얻는 것이 0 이다.)

---

## 9. CI 실패 이력 분류

최근 `ci-pipeline.yml` run **60회** 전수.

| conclusion | 횟수 |
|---|---:|
| success | 22 |
| cancelled | 28 |
| failure | 9 |
| (진행 중) | 1 |

실패 9회의 실패 job/step:

| run | 실패 job | 실패 step | 분류 |
|---|---|---|---|
| 32931469385 | Code Quality Check | Run TypeScript check (Frontend only) | `FOREIGN_WIP_ONLY` |
| 32930987464 | Code Quality Check | Run TypeScript check (Frontend only) | `FOREIGN_WIP_ONLY` |
| 32929926941 | Code Quality Check | Run TypeScript check (Frontend only) | `FOREIGN_WIP_ONLY` |
| 32927332527 | Code Quality Check | Run TypeScript check (Frontend only) | `FOREIGN_WIP_ONLY` |
| 32926963888 | Code Quality Check | Run TypeScript check (Frontend only) | `FOREIGN_WIP_ONLY` |
| 32703819368 | Code Quality Check | Run tests (api-server Jest) | `REAL_PROTECTION` |
| 32699251152 | Code Quality Check | Run tests (api-server Jest) | `REAL_PROTECTION` |
| 32697833247 | Code Quality Check | Run tests (api-server Jest) | `REAL_PROTECTION` |
| 32492746398 | Code Quality Check | Run tests (api-server Jest) | `REAL_PROTECTION` |

**`Build Applications` 실패는 0회다.** 60회 표본에서 main-site build 가 잡은 회귀는 없다.

가장 최근 실패(`32931469385`, sha `f6b35153e`)의 실제 오류는
`services/web-glycopharm/src/pages/store-management/b2b-order/B2BOrderPage.tsx(467,17): error TS1109`
로, main-site 와 무관한 다른 세션의 진행 중 작업이다.

**주목:** 실패를 잡아낸 것은 전부 `quality-check` 의 type-check 와 jest 다.
즉 **회귀를 실제로 막고 있는 것은 경량 검사 쪽**이라는 §4 결론과 일치한다.

---

## 10. Production linkage

| 항목 | 값 |
|---|---|
| Cloud Run service | **0** (`o4o-main-site` 폐기됨) |
| deploy workflow | **0** (`deploy-main-site.yml` 부재) |
| `deploy-web-services.yml` `paths:` 포함 | **아니오** |
| build artifact 소비자 | **0** |
| downstream job | **0** |

판정: **`NO_RUNTIME_EFFECT`**
main-site build 의 성공/실패는 어떤 production 자산에도 도달하지 않는다.

---

## 11. 루트 스크립트 consumer census

| 스크립트 | consumer | 판정 | 조치 |
|---|---|---|---|
| `build:main-site` | `build:apps` · `build:apps:all` · `build:web` (root 내부) | `MAIN_SITE_ONLY` | **유지** |
| `build:apps` | root `build` · `scripts/ci-build-app.sh:83`(`all` 분기) · `scripts/ci-complete-setup.sh:36` · 루트 `README.md:69`(개발자 안내) | `ACTIVE_GENERAL` | **유지** |
| `build:apps:all` | 없음 | `DEAD` 후보 | **유지** (§2 "consumer 확인 없이 삭제 금지" — 로컬 수동 사용 배제 불가) |
| `build:web` | 없음 | `DEAD` 후보 | **유지** (동일) |
| root `build` | `build:apps` 소비. CI 직접 호출 0 (`deploy-api.yml:122` 의 `pnpm run build` 는 `cd apps/api-server` 안이라 api-server 자체 build) | `ACTIVE_GENERAL` | **유지** |
| `scripts/ci-build-app.sh` | `ci-pipeline.yml:169` (`${{ matrix.app }}`) | `ACTIVE_REQUIRED` | **유지** — main-site 분기도 그대로 둔다 |
| `scripts/ci-complete-setup.sh` | 문서(`scripts/README.md:73`)에서만 안내. workflow 호출 0 | `ACTIVE_GENERAL`(로컬 도구) | **유지** |

**이번 WO 는 루트 build 스크립트를 하나도 건드리지 않는다.**
`build:main-site` 는 경로 기반이라 정상 동작하고, 로컬에서 main-site 를 수동 빌드할 길은
남겨두는 것이 참고 자산 보존 결정과 일관된다.
`ci-build-app.sh` 의 main-site 분기도 제거하지 않는다 — CI 가 더 이상 호출하지 않을 뿐,
수동 호출 경로로는 유효하다.

> **보정 (census 후속):** 최초 작성 시 `build:apps` consumer 목록에서 루트 `README.md:69`
> (`pnpm run build:apps       # 앱만` — 개발자 빌드 안내)이 누락돼 있었다.
> 판정은 그대로 `ACTIVE_GENERAL` / **유지** 이며 근거가 1건 늘어난 것뿐이라
> §13·§14 결론에는 영향이 없다.

---

## 12. Matrix 분리 가능성

`matrix.app` 은 job 안에서 **정확히 3곳**에만 쓰인다.

1. `name: Build ${{ matrix.app }}`
2. `run: bash scripts/ci-build-app.sh ${{ matrix.app }}`
3. artifact `name: ${{ matrix.app }}-dist` / `path: apps/${{ matrix.app }}/{dist,build}`

- matrix 개수에 의존하는 조건문·집계·리포팅 **없음**
- `fail-fast` 설정 없음(기본값) — 항목 축소가 다른 항목 동작을 바꾸지 않음
- job 이름은 `Build Applications (admin-dashboard)` 로 유지된다.
  이 이름에 의존하는 required check·다른 workflow 참조 **0** (§17)

→ `main-site` 만 빼고 `admin-dashboard` 는 완전히 동일하게 동작한다. **분리 가능.**

---

## 13. 경량 대안 검토

| 대안 | 평가 |
|---|---|
| A. 그대로 유지 | 회귀 검출 0 / production 영향 0 / 비용 3분 → 유지 근거 없음 |
| B. `tsc --noEmit` 만 CI 에 남기고 build 제거 | **이미 그 상태다.** `quality-check` 가 이미 수행 중 → 추가 작업 0 |
| C. `paths:` 필터로 main-site 변경 시에만 build | build 자체가 보호하는 게 없으므로 조건부로 만들 이유도 없다 |
| D. main-site 디렉터리 통째 삭제 | 이번 WO 범위 밖. README 가 참고 자산으로 보존을 선언했고, 삭제는 별도 판단이 필요하다 |

**채택: B** — build matrix 에서만 제외. 경량 검사는 신규 추가 없이 기존 것으로 충분하다.

---

## 14. 최종 판정

```
REDUCE_TO_LIGHTWEIGHT_CHECK
```

- CI full build: **제거** (`ci-pipeline.yml` build matrix)
- CI 경량 검사: **유지** (`type-check:frontend` + `eslint .`, 둘 다 blocking, 이미 존재)
- 루트 build 스크립트: **변경 0**
- main-site 소스: **변경 0**
- runtime: **변경 0**

---

## 15. §22 중지 조건 점검

| 중지 조건 | 결과 |
|---|---|
| required branch protection dependency | **없음** — `GET /branches/main/protection` → 404 "Branch not protected", `GET /rulesets` → `[]` |
| source asset active consumer 발견 | **없음** — 저장소 코드 참조 0, workspace dependency 0 |
| build artifact 를 다른 workflow 가 사용 | **없음** — `uses: actions/download-artifact` 0회 |
| root aggregate build contract 불명확 | 해당 없음 — **루트 스크립트를 변경하지 않는다** |
| CI job naming dependency | **없음** — `Build Applications` 이름 참조는 문서 2건뿐(과거 기록) |
| UNKNOWN 발생 | **없음** — 모든 축이 측정값으로 확정됨 |

→ **중지 조건 해당 없음.** CI 계약 변경을 진행한다.

---

## 16. 변경 내역

| 파일 | 변경 |
|---|---|
| `.github/workflows/ci-pipeline.yml` | build matrix `[main-site, admin-dashboard]` → `[admin-dashboard]` + 판정 근거 주석 |
| `apps/main-site/README.md` | "CI build 검증에 계속 포함" 문구를 현재 상태로 갱신 |
| `apps/api-server/src/__tests__/main-site-ci-build-contract.spec.ts` | **신규** — 재등록 방지 계약 13개 |
| `docs/checks/WO-O4O-MAIN-SITE-CI-BUILD-CONTRACT-CENSUS-AND-DISPOSITION-V1-CHECK.md` | **신규** — 이 문서 |

`.github/workflows/**` 중 다른 workflow 변경 0. 애플리케이션 코드 변경 0.

---

## 17. Required check / branch protection

```
$ gh api repos/:owner/:repo/branches/main/protection
{"message":"Branch not protected","status":"404"}

$ gh api repos/:owner/:repo/rulesets
[]
```

`main` 브랜치에 branch protection 도 ruleset 도 설정돼 있지 않다.
따라서 `Build Applications (main-site)` 를 required status check 로 요구하는 설정은 **없다**.
matrix 항목 제거로 merge 가 막히는 경우는 발생하지 않는다.

> 참고: 이는 "required check 이 없다" 는 사실 확인이지, 브랜치 보호를 켜지 말자는 제안이 아니다.
> 보호 설정 도입 여부는 이 WO 의 범위가 아니다.

---

## 18. 검증

| 검증 | 명령 | 결과 |
|---|---|---|
| workflow YAML 파싱 | `yaml.safe_load(ci-pipeline.yml)` | **PASS** — jobs `quality-check`/`build`, matrix `app: [admin-dashboard]` |
| 신규 계약 spec | `npx jest src/__tests__/main-site-ci-build-contract.spec.ts` | **PASS 13/13** |
| 기존 main-site 은퇴 spec 2종 | `npx jest .../main-site-*-retirement.spec.ts` | **PASS 58/58** |
| main-site 경량 검사 유지 확인 | `pnpm run type-check:frontend` | `apps/main-site (pnpm run typecheck)` 실행 확인, main-site 오류 **0** |
| admin-dashboard build 회귀 | `pnpm --filter=@o4o/admin-dashboard run build` | §18-2 |
| 루트 스크립트 | 변경 0 | 해당 없음 |

### 18-1. 알려진 무관 실패

`pnpm run type-check:frontend` 는 현재 `services/web-glycopharm` 에서 실패한다:

```
src/pages/store-management/b2b-order/B2BOrderPage.tsx(467,17): error TS1109: Expression expected.
```

이는 **다른 세션의 진행 중 작업**이며 이 WO 의 변경과 무관하다.
동일 오류가 이 WO 시작 전 CI run(`32926963888`~`32931469385`)에서도 재현된다.
이 WO 는 해당 파일을 건드리지 않았다.

### 18-2. admin-dashboard build

`bash scripts/ci-build-app.sh admin-dashboard` 대신
`pnpm --filter=@o4o/admin-dashboard run build` 로 검증했다.
스크립트 내부의 `pnpm install` 재실행이 shared dirty worktree 에서
lockfile 을 건드릴 위험을 피하기 위함이며, 빌드 명령 자체는 동일하다
(`ci-build-app.sh:53` 이 실행하는 것과 같은 줄).

---

## 19. Production 검증

runtime 변경이 **0** 이므로 production smoke 를 수행하지 않는다(§19).
main-site 는 배포 대상이 아니고, 이번 변경은 CI job 구성만 바꾼다.
`deploy-api.yml` · `deploy-admin.yml` · `deploy-web-services.yml` 은 **변경 0**.

---

## 20. 고아 75개 WO 와의 순서

§7 에서 증명했듯 고아 75개를 검사하는 주체는 **tsc(`include: ["src"]`)** 이며,
그 tsc 는 build job 이 아니라 `quality-check` 에 있다.

→ 두 작업은 **서로 독립적**이다. 순서 제약이 없다.
이번 WO 는 고아 파일을 하나도 삭제하지 않는다(§20 준수).
후속 `WO-O4O-MAIN-SITE-RESIDUAL-ORPHAN-AXIS-CENSUS-V1` 은 이 변경과 무관하게 진행 가능하며,
그때도 검증 수단은 여전히 `tsc --noEmit` 이다.

---

## 21. 보호 범위 무변경 확인

| 보호 대상 | 상태 |
|---|---|
| `APPS_CATALOG` | 변경 0 |
| `packages/**/manifest.ts` | 변경 0 |
| `app_registry` | 변경 0 (DB 접근 0) |
| `/api/v1/admin/apps` | 변경 0 |
| `/api/v1/apps/availability` | 변경 0 |
| `AppManager` | 변경 0 |
| `store_cart_items` · `checkout_orders` · `/api/v1/store/cart/*` (CLAUDE.md 3-A) | 변경 0 |

---

## 22. 재추가 조건

다음 중 하나가 발생하면 main-site 를 build matrix 에 되돌린다.

1. `apps/main-site` 를 배포하는 Cloud Run service 또는 deploy workflow 가 생길 때
2. `main-site-dist` artifact 를 소비하는 downstream job 이 생길 때
3. 다른 workspace 가 `apps/main-site` 를 의존성으로 선언할 때

계약 spec `main-site-ci-build-contract.spec.ts` 는 위 조건 없이 matrix 에 다시 추가되면 실패한다.

# WO-O4O-MAIN-SITE-FULL-SOURCE-DELETION-V1 — CHECK

- **작업 성격**: 구현 (은퇴 애플리케이션 단위 최종 폐기)
- **선행 조사**: [IR-O4O-MAIN-SITE-RETIRED-SOURCE-AND-WORDPRESS-LEGACY-FULL-CENSUS-V1](../investigations/IR-O4O-MAIN-SITE-RETIRED-SOURCE-AND-WORDPRESS-LEGACY-FULL-CENSUS-V1.md)
- **작성일**: 2026-09-10
- **작업 worktree**: `C:\tmp\o4o-main-site-delete` (전용 격리 worktree)
- **작업 브랜치**: `work/o4o-main-site-full-source-deletion-v1`

---

## 1. 기준 SHA

| 항목 | 값 |
|---|---|
| 작업 기준 SHA (worktree 생성 시점 `origin/main`) | `38377ed873a42cd3dfe7848e212099d0de5e6eb7` |
| rebase 대상 `origin/main` | `48631bab2` (작업 중 3회 갱신) |
| 기준선 dirty | 0건 |
| 기준선 `HEAD == origin/main` | YES |
| 본 작업 커밋 | 단일 커밋 (69 files · +571 / −7,279) |

작업 중 `origin/main` 에 다른 세션 커밋 3건이 추가되었다.

| SHA | WO |
|---|---|
| `ed5f51ac0` · `7dc483874` | WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0 |
| `48631bab2` | WO-O4O-POP-HUB-LIBRARY-HANDOFF-TO-V2-CANONICAL-V1 |

세 커밋이 건드린 26개 파일(api-server ai-* · `store-ui-core` pop-v2 · `services/web-*` POP 화면)과
본 작업의 69개 변경 경로는 **교집합 0** 이었다(`comm -12` 로 실측). 덮어쓴 변경 없음.
rebase 는 충돌 0 으로 통과했고 force-push 를 사용하지 않았다.

**선행 IR 수치를 복사하지 않고 최신 `main` 에서 재계수했다.** 그 결과 IR 에 없던 참조 5곳
(`.idx/dev.nix` / `sonar-project.properties` 3줄 / admin-dashboard 문서 2건 / `ui-guidelines`)과
추가 2곳(`apps/admin-dashboard/.env.example` / `docs/services/cosmetics/service-definition.md`)을
새로 발견해 함께 처리했다.

---

## 2. 삭제 전 · 후 파일 수

| 항목 | 값 |
|---|---|
| 기준 SHA 전체 tracked 파일 | 28,174 |
| 작업 후 전체 tracked 파일 | 28,132 |
| 순감소 | −42 |
| `apps/main-site` tracked 파일 (전량 삭제) | 38 |
| 그중 `apps/main-site/src` | 28 |
| 회귀 spec 삭제 | 5 |
| 회귀 spec 신설 | 1 |

38 + 5 − 1 = 42 로 순감소와 일치한다.

---

## 3. 삭제 파일 경계

### 3-1. 본체 (§4-A)

`git rm -r apps/main-site` 로 디렉터리 전체를 삭제했다. 추적되고 있던 빌드 산출물
`vite.config.js` · `vite.config.d.ts` 도 포함된다.

삭제 후 `apps/` 구성: `admin-dashboard` · `api-server` · `forum-api` · `forum-web` · `mobile-app` · `page-generator`.

**복사·archive 이동·대체 shell·redirect 앱을 만들지 않았다.** 회귀 spec 이 `apps/` 하위에
`main-site` 로 시작하는 디렉터리가 0개임을 단언한다.

### 3-2. 삭제하지 않은 것

| 대상 | 사유 |
|---|---|
| `docs/checks/**` · `docs/investigations/**` · `docs/work-orders/**` 의 main-site 기록 | 기록물. CLAUDE.md §16-1 삭제 금지 |
| `packages/appearance-system/src/css-generators.ts` 의 "Consolidated from … main-site implementations" 3줄 + 통합 출처 목록 1줄 | 살아 있는 설계 설명의 **과거 출처 기록**. 현재형 경로 안내가 아니다 (WO §4-E 명시 경고) |
| `apps/api-server/src/bootstrap/register-routes.ts:236` · `public-appstore-read-retirement.spec.ts:16` | 과거 appstore 은퇴 **판정 근거 주석**. 과거 시점 사실 기록이므로 수정하면 근거가 훼손된다 |
| `scripts/audit/REGISTRY_AUDIT_REPORT.md:202,208` | 일자 고정 audit 기록물. WO §4-E "과거 조사 대량 수정 금지" |
| `apps/api-server/src/bootstrap/setup-middlewares.ts:45` 의 `http://localhost:5175` | **아래 3-3 참조** |

### 3-3. 정당화된 미수정 1건 — `setup-middlewares.ts:45`

해당 줄은 `5173, 5174, 5175, 5176, 5177` 이 연속으로 나열된 **일반 Vite dev 포트 허용 범위**다.
main-site 전용 계약이 아니라 범위이므로, 5175 만 뽑아 제거하면 범위의 연속성이 깨지고
다른 로컬 dev 서버의 CORS 를 근거 없이 좁힌다. **이름(포트 번호)만 보고 일반 설정을 제거하지 않는다**
는 WO 원칙에 따라 유지했다.

---

## 4. tsconfig · workspace · lockfile 변경

### 4-1. tsconfig

| 파일 | 변경 |
|---|---|
| `tsconfig.base.json` | `references` 에서 `{ "path": "./apps/main-site" }` 제거 |
| `packages/organization-core/tsconfig.json` | `paths` 의 `"@/*": ["../../apps/admin-dashboard/src/*"]` 제거 |

**`organization-core` 의 `@/*` 는 이름이 아니라 실제 resolve 경로로 판정했다** (WO §4-B 경고).

```
git grep "from '@/" -- packages/organization-core/src   →  (결과 없음)
```

`@/*` 를 통해 resolve 되는 import 가 패키지 내부에 **0건**이므로, 이 alias 는 어떤 모듈 해석에도
관여하지 않는 죽은 매핑이다. 이름만 보고 일반 alias 를 제거한 것이 아니라, 소비 0 을 실측한 뒤 제거했다.
`tsconfig.base.json` 의 전역 `@/*` 는 그대로 유지했다.

### 4-2. workspace

- `pnpm-workspace.yaml` 은 `apps/*` glob 만 쓰고 main-site 명시 항목이 없어 **변경 불필요** (편집 0).
- root `package.json`:
  - `"build:main-site"` 스크립트 제거
  - `build:apps` / `build:apps:all` / `build:web` 에서 `build:main-site` 호출 제거
  - 주석 키 1개를 본 WO 근거로 교체 (`dev:web` 을 다시 추가하지 않는다는 계약은 유지)

### 4-3. pnpm-lock.yaml

`pnpm install --lockfile-only` (일반 workspace 명령) 로 반영했다. **전체 재생성 없음.**

```
1 file changed, 8 insertions(+), 212 deletions(-)
```

| 검증 항목 | 결과 |
|---|---|
| `apps/main-site:` importer 제거 | YES (52줄, 잔여 0) |
| 다른 importer 의 의존 목록 변경 | 없음 (`apps/` · `packages/` · `services/` importer 헤더 중 제거된 것은 `apps/main-site` 뿐) |
| 고아 dependency 제거가 실제 고아인지 | YES — 제거된 snapshot 은 `vite@6.4.1`(peer suffix 없는 단독 인스턴스) 및 그에 딸린 `tailwindcss` · `postcss-load-config` · `ts-node` · `typeorm` · `ts-jest` 변형. 모두 main-site 만 참조하던 조합 |
| registry metadata churn | **없음** — `resolution:` 줄 변화는 삭제 1건(위 `vite@6.4.1`)뿐, 추가 0건 |

**비-main-site 변경 1줄 (정직 기록):** `apps/api-server` 의 `ts-jest` 해석 키가
`…(esbuild@0.27.0)…` peer suffix 를 새로 갖게 되었다. `esbuild@0.27.0` 은 삭제 전 lockfile 에도
이미 존재하던 패키지이며(5회 → 7회), ts-jest 의 **optional peer** 가 기존 인스턴스로 해석된 것이다.
버전 변경·신규 패키지 도입이 아니다. `pnpm install --frozen-lockfile` 과 api-server Jest 실행이
모두 통과함으로써 무해함을 확인했다.

---

## 5. 회귀 spec 6건 처리표

| # | spec | 처리 | 근거 |
|:-:|---|:-:|---|
| 1 | `ci-build-app-target-validity.spec.ts` (123줄) | **유지 + docblock 근거 갱신** | 특정 앱이 아니라 `ci-build-app.sh` 의 **모든** build target(`--filter` / `cd apps/<x>` / root `pnpm run <script>`)이 실재하는지 검증하는 일반 계약. 본문 단언은 무수정, main-site 를 보존 선례로 인용하던 docblock 3줄만 갱신 |
| 2 | `main-site-ci-build-contract.spec.ts` (123줄) | **삭제 → 부재 계약으로 흡수** | CI build target 부재 단언이 신설 spec §3 으로 이관 |
| 3 | `main-site-residual-dependency-cleanup.spec.ts` (133줄) | **삭제** | `lock.indexOf('\n  apps/main-site:\n')` 가 **존재해야 한다**고 단언 — 삭제와 정면 충돌. 반대 방향 단언이 신설 spec §2 에 있음 |
| 4 | `main-site-residual-orphan-axis-retirement.spec.ts` (245줄) | **삭제** | 삭제된 앱 **내부**의 부분 은퇴 축 계약. 유일한 외부 단언인 "web-kpa-society 는 main-site 를 import 하지 않는다" 는 신설 spec §4 로 이관 |
| 5 | `main-site-nextgen-viewrenderer-retirement.spec.ts` (256줄) | **삭제** | 삭제된 앱 내부 프레임워크 계약. 부수적 APPS_CATALOG · route mount 단언은 `app-management-runtime-residue-retirement.spec.ts` · `public-appstore-read-retirement.spec.ts` 에 이미 중복 존재 (grep 으로 확인) |
| 6 | `main-site-appstore-parallel-axis-retirement.spec.ts` (206줄) | **삭제** | 위와 동일. main-site 외 단언(APPS_CATALOG 존재, `/api/v1/apps` · `/api/v1/admin/apps` mount)이 위 두 spec 에 **이미 중복** — 고유 커버리지 손실 0 |

### 5-1. 신설 canonical 부재 계약 1개

`apps/api-server/src/__tests__/main-site-full-source-deletion.spec.ts` (**신규**)

WO 가 요구한 4개 계약을 **단일 spec** 에 모았다. 중복된 부재 테스트를 여러 spec 에 분산하지 않았다.

```text
apps/main-site directory                = absent   (§1, 3 it)
@o4o/main-site-nextgen workspace package = absent   (§2, 4 it)
main-site CI build/deploy target        = absent   (§3, 3 it)
main-site external runtime reference    = absent   (§4, 4 it)
```

**삭제한 디렉터리를 fixture · 임시 파일로 다시 만들지 않았다.** 전부 raw-source 단언이며
DB · 네트워크 접근 0. `REPO_ROOT` 오지정을 잡는 sanity 단언을 각 축에 넣어 "경로가 틀려서
공허하게 통과" 하는 상태를 방지했다.

### 5-2. lockstep 확인

| 쌍 | 결과 |
|---|---|
| `tsconfig.base.json` ↔ `packages/organization-core/tsconfig.json` | 함께 수정 (4-1) |
| `ci-build-app-target-validity.spec.ts` ↔ `scripts/ci-build-app.sh` | 함께 수정 — script 의 `"main"\|"main-site")` case 및 usage 문자열(`Valid options: admin, api, main, forum` → `admin, api, forum`) 제거, spec docblock 근거 갱신. spec 실행 PASS |

---

## 6. CI · script 참조 처리

| 파일 | 변경 |
|---|---|
| `.github/CODEOWNERS` | "프론트엔드 - 메인 사이트" 소유권 블록 3줄 + 헤더 제거 |
| `.github/labeler.yml` | `frontend` 라벨의 `apps/main-site/**/*` glob 제거 (`admin-dashboard` glob 유지) |
| `.github/workflows/ci-pipeline.yml` | build matrix 제외 근거 주석 24줄 제거 → 3줄 요약으로 교체. matrix 는 이미 `[admin-dashboard]` 라 실행 대상 변화 없음 |
| `.idx/dev.nix` | 유일한 preview 대상이던 `cwd = "apps/main-site"` preview 정의 제거 → `previews = { }` |
| `sonar-project.properties` | `sonar.sources` · `sonar.tests` · `sonar.typescript.tsconfigPaths` 3줄에서 main-site 경로 제거 |
| `scripts/ci-build-app.sh` | `"main"\|"main-site")` case 전체 + usage 문자열 |
| `scripts/dev.mjs` | build 경로의 하드코딩 배열 `['main-site', 'admin-dashboard', 'api-server']` → `['admin-dashboard', 'api-server']` |
| `scripts/development/dev.sh` | type-check · build 루프 3곳의 app 목록, dev 서버 기동 1줄, 안내 출력 2줄 |
| `scripts/update-package-versions.sh` | "4. Updating Main Site packages" 단계 삭제, 이후 단계 번호 재정렬(5·6 → 4·5), 제외 조건에서 `main-site` 제거 |
| `package.json` (root) | 4-2 참조 |
| `apps/api-server/src/services/BackupService.ts` | 백업 대상 env 목록에서 `'apps/main-site/.env'` 제거 |
| `apps/api-server/src/modules/lms/utils/lms-service-scope.ts` | 무필터 사유 열거에서 `legacy(main-site)` 제거 (admin / platform 카탈로그 사유 유지) |

- `scripts/dev.mjs` 의 `type-check:frontend` 는 `discoverWorkspaces('apps')` 자동 탐색이라
  main-site 가 사라지면 자동으로 빠진다. **편집 불필요** — 실행으로 확인 (§8).
- Docker · Cloud Build · deployment manifest: main-site 대상 **0건** (원래 배포 대상이 아님).

---

## 7. 문서 정합 처리

| 파일 | 처리 | 분류 |
|---|---|---|
| `apps/admin-dashboard/CUSTOMIZER_DEVELOPER_GUIDE.md:517` | "Create `apps/main-site/src/hooks/…`" → `<frontend-app>/src/hooks/…` 로 일반화 | **현재형 지시** 교정 |
| `apps/admin-dashboard/RENDERING_COMPLEXITY.md` | 상단 상태 노트 추가 + `**Location**:` 1줄에 "(삭제됨)" 명시 | 현재형 위치 안내 교정 |
| `apps/admin-dashboard/src/docs/mobile-header-implementation.md` | 상단 상태 노트 추가 (본문은 과거 구현 기록이므로 보존) | 기록 + 현행 표기 |
| `apps/admin-dashboard/.env.example:2` | `(main-site default Vite port)` → `(public site Vite dev server)` | 신규 발견 · 현재형 안내 교정 |
| `ui-guidelines/theme-profiles/consumer.commerce.md:62` | 대표 레퍼런스 목록에서 `apps/main-site/` 항목 제거 | 신규 발견 · 현재형 안내 교정 |
| `docs/services/cosmetics/service-definition.md:78` | Applications 목록에서 `main-site` 제거 | 신규 발견 · 현재형 안내 교정 |
| `packages/appearance-system/README.md:133` | "Legacy Systems … **Do not create new appearance logic in these locations**" 목록에서 삭제된 경로 항목 제거 | 현재형 지시 교정 |
| `packages/appearance-system/src/tokens.ts:16` | 실행 불가가 된 `// TODO: Phase 2 - Merge with apps/main-site/…` 제거 | 실행 불가 TODO |
| `packages/appearance-system/src/css-generators.ts` (4곳) | **유지** | 통합 출처의 과거 기록. WO §4-E 가 명시적으로 보호 |
| `scripts/audit/REGISTRY_AUDIT_REPORT.md` | **유지** | 일자 고정 audit 기록물 |
| `docs/checks/**` · `docs/investigations/**` · `docs/work-orders/**` (78개 파일) | **유지** | 기록물 · 대량 수정 금지 |
| `docs/archive/**` (10개 파일) | **유지** | archive 역사 기록 |

`appearance-system` 의 살아 있는 설계 설명은 main-site 삭제를 이유로 제거하지 않았다.
삭제된 경로를 **현재형으로 가리키는 부분만** 정리했다.

---

## 8. 잔여 검색 분류

검색 토큰: `apps/main-site` / `@o4o/main-site` / `@o4o/main-site-nextgen` / `o4o-main-site` /
`main-site-nextgen` / `build:main-site` / `main-site` / 포트 `5175`.
(저장소 규모 때문에 `git grep` + 명시 pathspec 사용. `5175` 는 HFF JSON/JSONL 데이터 디렉터리를 제외.)

| 분류 | 요구 | 실측 | 판정 |
|---|:-:|:-:|:-:|
| 활성 runtime 참조 | 0 | **0** | PASS |
| workspace · package 참조 | 0 | **0** | PASS |
| CI · 배포 target | 0 | **0** | PASS |
| 삭제된 파일을 가리키는 활성 문서 링크 | 0 | **0** | PASS |
| 부재 회귀 가드 | 허용 | 1 spec (신설 canonical) | 허용 |
| 과거 CHECK · 조사 기록 | 허용 | `docs/` 기록물 78 파일 | 허용 |
| archive 역사 기록 | 허용 | `docs/archive/**` 10 파일 | 허용 |
| 설계 출처 기록 주석 | 허용 | `css-generators.ts` 4줄, `register-routes.ts` 1줄, `public-appstore-read-retirement.spec.ts` 1줄, `REGISTRY_AUDIT_REPORT.md` 2줄 | 허용 (§3-2) |
| 일반 dev 포트 범위 | 허용 | `setup-middlewares.ts:45` 1줄 | 허용 (§3-3) |

세부:
- `build:main-site` — `docs/` 기록물 밖 **0건**
- `@o4o/main-site` · `main-site-nextgen` · `o4o-main-site` — `docs/`·`archive/` 밖 **0건**
- `archive/` 최상위 디렉터리 — main-site 참조 **0건**
- 활성 기준 문서(`docs/` 중 checks·investigations·work-orders·archive 제외) — 잔여 **0건**

---

## 9. 로컬 검증 결과

| # | 명령 | 결과 |
|:-:|---|:-:|
| 1 | `pnpm install --frozen-lockfile` | **PASS** (1m 57s) |
| 2 | `pnpm run build:packages` | **PASS** |
| 3 | `pnpm run type-check:frontend` | **PASS** (`type-check:frontend: OK`, exit 0) |
| 4 | `pnpm --filter @o4o/api-server exec tsc --noEmit` | **PASS** (exit 0, 출력 없음) |
| 5 | `pnpm --filter @o4o/admin-dashboard run type-check` | **PASS** (exit 0) |
| 6 | `pnpm --filter @o4o/admin-dashboard run build` | **PASS** (built in 32.76s) |

`type-check:frontend` 는 `discoverWorkspaces('apps')` 자동 탐색이 main-site 를 더 이상 열거하지 않음을
실행으로 확인했다(별도 편집 없이 통과).

### 9-1. 회귀 spec 실행

| 대상 | 결과 |
|---|:-:|
| 신설 `main-site-full-source-deletion.spec.ts` + 유지 `ci-build-app-target-validity.spec.ts` | **21 passed / 21** |
| 영향권 spec 10건 (lockfile · root package.json · ci-build · tsconfig 를 읽는 spec 전수 + 커버리지 중복 확인 대상 2건) | **279 passed / 279** |

영향권 10건: `auth-runtime-and-legacy-package-final-closure` · `block-registry-report-untrack` ·
`build-packages-workspace-dependency-coverage` · `ci-install-lockfile-contract` ·
`ecommerce-core-and-commerce-residue-retirement` · `legacy-wordpress-block-editor-retirement` ·
`shortcode-domain-retirement` · `windows-pnpm-filter-noop-guard` ·
`app-management-runtime-residue-retirement` · `public-appstore-read-retirement`.

신설 spec 은 최초 실행에서 root `package.json` 의 낡은 주석 키 1건을 실제로 잡아냈고(의도한 동작),
해당 주석을 본 WO 근거로 교체한 뒤 통과했다.

---

## 10. CI · 배포 결과

<!-- push 후 관측하여 갱신 -->

| workflow | 결과 |
|---|---|
| CI Pipeline | 관측 중 |
| CodeQL | 관측 중 |
| AppStore Guard | 관측 중 |
| Deploy API Server | 관측 중 |
| Deploy Admin Dashboard | 관측 중 |
| Deploy Web Services | 관측 중 |

main-site 자체에 대한 신규 배포 · 브라우저 smoke 는 필요하지 않다 (배포 대상이 아니었고 삭제되었다).
경로 필터로 배포 workflow 가 트리거되지 않으면 `NOT_TRIGGERED` 로 기록하며 성공으로 바꾸어 표현하지 않는다.

---

## 11. 중지 조건 발생 여부

| # | 조건 (WO §3) | 실측 | 발생 |
|:-:|---|---|:-:|
| 1 | 다른 workspace 의 실제 import | `@o4o/main-site*` import 0건. export barrel 없음, `private: true` | NO |
| 2 | 활성 배포 workflow | main-site 대상 deploy workflow 0건 | NO |
| 3 | Cloud Run · LB · NEG · 도메인의 활성 소비 | main-site Cloud Run service 0 (선행 IR 실측) | NO |
| 4 | main-site 에만 있는 고유 기능 | `MAIN_SITE_UNIQUE_FUNCTION = ZERO` (선행 IR) | NO |
| 5 | 최근 추가된 main-site 기능 커밋 | 기준 SHA 기준 없음 | NO |
| 6 | 다른 세션의 겹치는 변경 | 작업 중 추가된 `ed5f51ac0` 의 변경 파일 3개와 교집합 0 | NO |
| 7 | 삭제가 현재 서비스 API·화면을 깨뜨림 | 로컬 검증 6종 + 회귀 spec 300건 전부 PASS | NO |

**중지 조건 발생 0건.** 미처리 항목 없음.

---

## 12. 다음 WordPress 정비 작업과의 경계

본 작업은 **A축(은퇴 앱 소스 폐기) 한정**이다. 다음은 의도적으로 **손대지 않았다.**

- WordPress 호환 필드 · `theme.json` 의 외부 계약 판단
- 죽은 shortcode 표현 · 권한 · 문서 제거
- `archive/**` 보존 정책 확정
- CPT · block-renderer 전역 정비

`apps/admin-dashboard/RENDERING_COMPLEXITY.md` 의 block-renderer 축 서술은 상태 노트만 덧붙이고
본문 재정리를 하지 않았다. 그 판단은 후속 WordPress 정비 WO 의 범위다.

범위 밖 발견 (수정하지 않고 보고):
`docs/services/cosmetics/service-definition.md` 의 Applications 목록에 존재하지 않는 앱
`ecommerce (소비자 프론트엔드)` 가 남아 있다. main-site 와 무관한 별개 drift 이므로 건드리지 않았다.

---

## 최종 판정

```text
MAIN_SITE_SOURCE_DIRECTORY          = ABSENT
MAIN_SITE_WORKSPACE_PACKAGE         = ABSENT
MAIN_SITE_TSCONFIG_REFERENCE        = ZERO
MAIN_SITE_LOCKFILE_IMPORTER         = ZERO
MAIN_SITE_EXTERNAL_IMPORT           = ZERO
MAIN_SITE_ACTIVE_RUNTIME_REFERENCE  = ZERO
MAIN_SITE_CI_BUILD_TARGET           = ZERO
MAIN_SITE_DEPLOY_TARGET             = ZERO
MAIN_SITE_STALE_ACTIVE_DOC_LINK     = ZERO
OTHER_SERVICE_REGRESSION            = PASS
CI_PIPELINE                         = PENDING
CODEQL                              = PENDING
MAIN_SITE_FULL_SOURCE_DELETION      = IMPLEMENTATION_COMPLETE / CI_CONFIRMATION_PENDING
```

CI 성공 확인 전에는 `CLOSED` 로 쓰지 않는다.

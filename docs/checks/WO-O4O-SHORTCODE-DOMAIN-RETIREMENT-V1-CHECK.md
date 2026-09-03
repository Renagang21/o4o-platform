# WO-O4O-SHORTCODE-DOMAIN-RETIREMENT-V1 — CHECK

**Date:** 2026-09-03
**Verdict:** `SHORTCODE_DOMAIN_RETIRED`
**성격:** 실사용 0으로 확정된 기능 축(shortcode)을 코드베이스에서 **완전 제거**.
교체가 아니라 은퇴다. 호환 shim 0 · legacy renderer 0 · placeholder/fallback renderer 0 ·
dead shortcode 자동 변환 0 · production DB write 0 · migration 0.

---

## 1. Baseline

| 항목 | 값 |
|---|---|
| 기준 저장소 | `C:\Users\home\coding\o4o-platform` |
| `git fetch` | 수행 |
| 시작 시점 `origin/main` | `dae057f1687d52d9f67b40bcb762b1f18a0472bf` |
| 작업 브랜치 | `work/o4o-shortcode-domain-retirement-v1` |
| 선행 CHECK(참조) | `docs/checks/WO-O4O-SHORTCODE-ACTUAL-USAGE-AND-RETIREMENT-READINESS-CENSUS-V1-CHECK.md` |

선행 CHECK 의 "60 files" 는 **복사하지 않았다**. 모집단은 현재 HEAD 에서 재계산했다.

---

## 2. 모집단 재계산 (현재 HEAD 기준)

| 단계 | 건수 |
|---|---:|
| raw 대소문자 무시 hit (tracked, `node_modules` 제외) | **182** |
| QR `shortCode` / `short_code` 전용 파일 (무관 도메인) | −25 |
| **실제 shortcode 도메인 모집단** | **160** |

내역: `packages/shortcodes` 37 tracked files · `docs/` 41 · 기타 코드/설정/스크립트 93.

### 분류 결과 (§4)

| 분류 | 건수 | 비고 |
|---|---:|---|
| `DELETE` | 60 staged path (59 D + 1 R) | 아래 §3 |
| `EDIT_REMOVE_SHORTCODE_ONLY` | 62 M | 아래 §4 |
| `KEEP_UNRELATED` | 30 | QR shortCode 25 · Gutenberg `[gallery]` 3 · DB-backed form shortcode · auth permission catalog · `workspace-packages.json`(stale npm 스냅샷의 `@wordpress/shortcode`) |
| `HISTORICAL_DOC` | 다수 | `docs/archive/**`, 과거 `docs/checks/**`, `docs/investigations/**` — **수정하지 않음** |
| `UNKNOWN` | **0** | |

`UNKNOWN 0` 근거: `@o4o/shortcodes` · `ShortcodeRenderer` · `globalRegistry` ·
`registerPresetShortcode` · `registerDynamicShortcodes` · `registerAuthShortcodes` ·
`loadShortcodes` · `shortcodeMetadata` · `registerLazyShortcode` 전수 `git grep` 으로
소비자 목록을 전부 열거했고 미해결 항목이 없다.

---

## 3. 삭제 (DELETE)

### 패키지
- `packages/shortcodes/**` — tracked 37 files (registry · parser · renderer · provider ·
  metadata · types · components · dynamic · preset · auth · template · utils · README ·
  package.json · tsconfig · .eslintignore)
- `apps/api-server/packages/shortcodes/package.json` — workspace glob 밖 inert stub

로컬에 남아 있던 **untracked 빌드 산출물**(`packages/shortcodes/{dist,node_modules,tsbuildinfo}`,
`apps/api-server/packages/shortcodes/dist`)도 제거했다. `node_modules/@o4o/*` 는 base repo 를
가리키는 **junction** 이었으므로 재귀 삭제 전에 링크를 개별 unlink 하고 대상 패키지
(`auth-client` · `content-editor` · `types` · `utils`) 무결성을 확인한 뒤 진행했다.

### admin-dashboard
`blocks/definitions/shortcode.tsx` · `components/editor/blocks/ShortcodeBlock.tsx` ·
`components/shortcodes/**` (ApprovalQueue · admin/index · productShortcodes) ·
`utils/{shortcode-loader,shortcode-parser,register-dynamic-shortcodes}.ts` ·
`components/ShortcodeReference.tsx` · `pages/documentation/Shortcodes.tsx` ·
`features/cpt-acf/components/{ShortcodeRenderer,ACFShortcodeRenderer,ShortcodeFormRenderer}.tsx` ·
`services/ai/shortcode-registry.ts` · `tests/shortcode-runtime-registration.test.ts`

### 기타
- `packages/block-renderer/src/renderers/special/ShortcodeBlock.tsx`
- `packages/cosmetics-seller-extension/src/shortcodes/index.tsx` (6 정의)
- `scripts/audit/check-shortcode-registry.ts` · `scripts/verify-shortcodes.ts`
- `apps/api-server/src/types/shortcode.types.ts` (importer 0)
- `apps/api-server/src/__tests__/shortcode-registry-ssot-and-runtime-reachability.spec.ts`
- `scripts/audit/shortcode-registry-report.json` (untracked 생성 산출물, 생성기와 함께 제거)

### rename
`apps/api-server/src/__tests__/shortcode-registry-report-untrack.spec.ts`
→ `block-registry-report-untrack.spec.ts` (R100)

**이유:** 이 spec 안에 **block** report 의 untrack 계약이 함께 들어 있었고 다른 거처가
없었다. 통째로 삭제하면 block 계약이 사라지므로 rename 후 shortcode 절반만 제거했다.

---

## 4. 편집 (EDIT_REMOVE_SHORTCODE_ONLY)

| 축 | 파일 | 제거한 것 |
|---|---|---|
| admin bootstrap | `src/main.tsx` | `globalRegistry` import · `window.__shortcodeRegistry` DEV 노출 |
| | `src/App.tsx` | `register-dynamic-shortcodes` import · `loadShortcodes()/logShortcodeSummary()` |
| | `src/blocks/index.ts` | shortcode block import · `blockRegistry.register` |
| | `src/blocks/registry/DynamicRenderer.tsx` | `'shortcode': 'o4o/shortcode'` |
| | `src/utils/block-icons.tsx` | `'o4o/shortcode': Brackets` (`Brackets` 는 타 용도로 잔존) |
| dependency | admin-dashboard · block-renderer · cosmetics-seller-extension · api-server mirror stub 2 | `@o4o/shortcodes: workspace:*` |
| build config | 루트 `package.json` | `build:shortcodes` · `verify:shortcodes` · 체인 참조 |
| | `apps/api-server/package.json` | `build:deps` 의 shortcodes 빌드 |
| | `packages/block-renderer/tsconfig.json` | project reference `../shortcodes` |
| | `apps/admin-dashboard/vite.config.ts` | alias · `optimizeDeps.exclude` |
| | `.github/workflows/ci-pipeline.yml` | 패키지 목록 2곳 |
| | `scripts/{dev.mjs,development/dev.sh}` · `services/web-kpa-society/Dockerfile` · `scripts/ci-build-app.sh` | 빌드/복사/검증 항목 |
| block-renderer | `renderers/index.ts` | import · 3 registry alias(`shortcode`·`core/shortcode`·`o4o/shortcode`) · re-export |
| | `metadata.ts` | `o4o/shortcode` 메타데이터 entry |
| cosmetics | `src/index.ts` · `src/manifest.ts` | shortcodes export · manifest `shortcodes[]` (6 dangling entry) |
| block 정규화 | `scripts/cms/normalize-blocknames.ts` | shortcode alias **3줄만** 제거 (§16 준수, 파일 유지) |
| AI 축 | `services/ai/block-registry-extractor.ts` · `types.ts` · `SimpleAIGenerator.ts` · `reference-fetcher.service.ts` · `packages/ai-prompts/src/admin/simple-generator.prompt.ts` | shortcode 레퍼런스 추출·프롬프트 규칙·타입 |
| UI 라벨 | `api/ai-references.api.ts` · `ReferenceEditor.tsx` · `ReferencesTab.tsx` · `AdminBreadcrumb.tsx` · `CPTDashboardToolset.tsx` | `shortcodes` 옵션/라벨 |
| entity 주석 | `apps/api-server/src/entities/AIReference.ts` | 문서 주석의 shortcode 예시 (컬럼은 `varchar(50)`, **스키마 무변경**) |
| 테스트 페이지 | `pages/test/PresetIntegrationTest.tsx` | shortcode Test 3·4·5 만 (Preset/Form/Template 축 보존) |
| 산출물 | `apps/admin-dashboard/dist-node/.../vite.config.js` | 추적 중인 컴파일 산출물의 동일 3줄 |

---

## 5. §6 — mirror / stale path 판정

`apps/api-server/packages/*` 는 package.json 만 있는 **22개 stub** 이고
`pnpm-workspace.yaml` 의 어떤 glob(`apps/*`·`packages/*`·`packages/@o4o-apps/*`·`services/*`)
에도 걸리지 않는다. 선행 CHECK(CGM-PHARMACIST-APP-RETIREMENT · DROPSHIPPING)가 이미
"workspace 밖 스텁 → inert" 로 판정해 두었다.

→ **shortcode stub 1개만 삭제**하고, block-renderer / cosmetics stub 에서는
`@o4o/shortcodes` dependency 문자열만 제거했다.
**단순 문자열 hit 으로 중복 package 를 삭제하지 않았다.**

---

## 6. §31 STOP CONDITION 판정

| 조건 | 결과 |
|---|---|
| production 저장 콘텐츠에 shortcode 사용 > 0 | **아니오** (선행 census 확정, DB 재조회 불필요) |
| 신규 service runtime consumer | **아니오** |
| external/public package consumer | **아니오** |
| 다른 활성 package 의 필수 API | **아니오** |
| cosmetics-seller-extension runtime 이 실제 mount | **아니오** — manifest 의 6 entry 는 존재하지 않는 `./frontend/shortcodes/*.js` 를 가리키는 dangling |
| UNKNOWN consumer | **아니오** (0) |

### 판정 편차 1건 — 보고 대상

선행 census 의 "production render usage = 0" 과 달리, **살아 있는 render consumer 1건**을
발견했다: 라우팅된 admin 디버그 페이지
[`PresetIntegrationTest.tsx`](apps/admin-dashboard/src/pages/test/PresetIntegrationTest.tsx)
(`/admin/test/preset-integration`) 가 `ShortcodeRenderer` 를 실제로 렌더했다.

**STOP 하지 않은 근거:** service/production/external consumer 가 아니라 admin 내부
test·debug 페이지다(§31 열거 항목 어디에도 해당하지 않음). 페이지 자체는 유지하고
**shortcode 축(Test 3·4·5)만 제거**했으며 Preset/Form/Template 축은 그대로다.

---

## 7. §13 / §16 금지사항 준수

- cosmetics-seller-extension **전체 package 삭제 0** · frontend component 삭제 0 ·
  lifecycle 삭제 0 · manifest 파일 삭제 0 · APPS_CATALOG entry 삭제 0
- `scripts/cms/normalize-blocknames.ts` **파일 전체 삭제 0** — alias 3줄만 제거,
  나머지 block 정규화 전부 보존 (`core/buttons` · `core/paragraph` 등 확인)
- 과거 CHECK/archive 문서 수정 0 (REGISTRY-AUDIT-GENERATOR-CANONICALIZATION ·
  REGISTRY-AUDIT-MISSING-AND-DANGLING-CLOSURE · SHORTCODE-REGISTRY-SSOT-AND-RUNTIME-REACHABILITY ·
  SHORTCODE-ACTUAL-USAGE-AND-RETIREMENT-READINESS-CENSUS 포함)

---

## 8. 테스트 정합 (§17) · 은퇴 가드 (§18)

### 신규 — `apps/api-server/src/__tests__/shortcode-domain-retirement.spec.ts`
raw-source literal guard. 8개 계약 전부 고정: dependency 0 · `packages/shortcodes` 부재 ·
admin bootstrap import 0 · `o4o/shortcode` block 정의 0 · block-renderer alias 0 ·
`verify:shortcodes` 0 · `check-shortcode-registry` 0 · cosmetics shortcode 정의 0.
역방향 보존 단언(다른 block 정규화 · `o4o/buttons` renderer · cosmetics manifest/lifecycle)도 함께 건다.

### shortcode 전용 → 삭제
`shortcode-registry-ssot-and-runtime-reachability.spec.ts` ·
`apps/admin-dashboard/src/tests/shortcode-runtime-registration.test.ts`

### block+shortcode 공용 → shortcode 단언만 제거
- `registry-audit-generator-canonicalization.spec.ts` — `SHORTCODE_REL` · `describe.each` shortcode 케이스 · shortcode report 항목
- `registry-audit-missing-and-dangling-closure.spec.ts` — `SHORTCODE_SCANNER` · `AUTH_REGISTRY` · shortcode describe · shortcode report 단언
- `block-registry-report-untrack.spec.ts` (rename 후) — block 축만 남김
- `main-site-residual-dependency-cleanup.spec.ts` — KEEP_ACTIVE 판정 요약을 `RETIRED` 로 갱신, shortcode describe 2개 제거
- `main-site-residual-orphan-axis-retirement.spec.ts` — 주석 판정 갱신

`main-site-appstore-parallel-axis-retirement.spec.ts` ·
`main-site-nextgen-viewrenderer-retirement.spec.ts` 는 **이미 은퇴한 main-site 경로의 부재 단언**
이라 이번 은퇴와 무관 → 변경 0.

---

## 9. §14 도구 잔재 · §15/§19 문서

- `.gitignore` — shortcode report ignore 규칙 + 주석 블록 제거, **block report 규칙은 유지**
- `scripts/audit/README.md` — block 축 전용으로 재작성, 상단에 은퇴 고지
- `scripts/audit/REGISTRY_AUDIT_REPORT.md` — 헤더 박스에 `RETIRED` 명시 (본문 §2~§8 은 2025-11-21 역사 기록이라 보존)
- 현재형 서술 수정: `README.md` · `SETUP.md` (verify 설명에서 shortcode 제거),
  `apps/admin-dashboard/RENDERING_COMPLEXITY.md`, `src/components/editor/REFACTORING.md`,
  `src/features/cpt-acf/README.md` (Shortcode Reference 섹션·컴포넌트·데이터흐름·트러블슈팅 정리)
- `apps/main-site/README.md:27` 은 **이미 은퇴한 축의 제거 대상 표**라 역사 기록 → 변경 0
- `docs/archive/**` · 과거 `docs/checks/**` · `docs/investigations/**` → 변경 0

---

## 10. §21 DB

migration **0** · DB cleanup **0** · production write **0** · DB 재조회 **0**.

- `AIReference.type` 은 `varchar(50)` 평문 컬럼 → 스키마 변경 불필요 (주석만 정리)
- `App.ts` 의 `type` enum 은 **실제 DB enum** 이고 `'shortcode'` 값을 포함 → **손대지 않음**
- `Form.shortcode` (`[form name="..."]` 문자열) · `FormsController` 응답 필드 →
  `@o4o/shortcodes` 와 무관한 form-builder 자체 문자열 → `KEEP_UNRELATED`

---

## 11. 검증 결과

| 항목 | 결과 |
|---|---|
| consumer zero census 재실행 (§22) | shortcode 도메인 잔재 **0** (잔존 hit 전부 `KEEP_UNRELATED`) |
| lockfile (§6) | `pnpm install --lockfile-only` → `pnpm-lock.yaml` **43줄 삭제만** (shortcode importer 4개 블록). 신규 추가 0 |
| retirement guard | **28/28 PASS** |
| registry 공용 spec 5종 | **PASS** (`block-registry-report-untrack` · `registry-audit-generator-canonicalization` · `registry-audit-missing-and-dangling-closure` · `main-site-residual-dependency-cleanup` · `main-site-residual-orphan-axis-retirement`) — 합계 120 tests |
| `pnpm run build:packages` | exit 0 |
| typecheck (admin-dashboard · block-renderer · cosmetics-seller-extension) | **PASS** — 상세 §11-A |
| api-server 전체 Jest | **PASS** 222 suites / 3,709 tests — 상세 §11-A |
| admin-dashboard vitest | **PASS** 13 files / 229 tests — 상세 §11-A |
| `pnpm install --frozen-lockfile` | **PASS** (lockfile 정합) — 상세 §11-A |
| builds (admin production · block-renderer · cosmetics-seller-extension) | **PASS** 3/3 — 상세 §11-A |
| 브라우저 스모크 (§26) | **부분 PASS** — boot·registry 실측 PASS, 인증 편집기 화면은 CORS 로 미수행 — 상세 §11-A |
| Buttons 스모크 (§27, 이월 항목) | **부분 PASS** — registry 수준 확인, 화면 조작 미수행 — 상세 §11-A |

---

## 12. §28 Safe Commit

`autostash 0` · `rebase 0` · `--amend 0` · `git add . 0` · path-specific `git add` 만 사용.

### 동시 세션 격리 — 실측

작업 중 **다른 세션의 변경이 같은 워크트리에 존재**했다. 전부 staged 대상에서 제외했다.

**foreign unstaged (10):** `routes/cosmetics/controllers/cosmetics-order.controller.ts` ·
`routes/glycopharm/controllers/{checkout,pharmacy}.controller.ts` ·
`routes/glycopharm/glycopharm.routes.ts` · `routes/kpa/controllers/kpa-checkout.controller.ts` ·
`routes/o4o-store/controllers/pharmacy-products.controller.ts` ·
`services/cart/{b2b-checkout-confirm.core,offer-exposure-strategy}.ts` ·
`packages/store-ui-core/src/{components/store-cart/useStoreCart.ts,index.ts}`

**foreign untracked (3):** `__tests__/b2b-remaining-debt-final-closure.spec.ts` ·
`middleware/service-membership.middleware.ts` · `packages/store-ui-core/.../__tests__/`

**foreign commit 1:** `ae2e8373b docs(check): signage forced-content legacy purge …` —
다른 세션이 이 워크트리에 커밋해 내 브랜치 tip 에 얹혔다(`work/signage-forced-content-legacy-data-purge-v1`
에도 존재). 내 push 에 섞이면 안 되므로 **§30 절차(임시 worktree + cherry-pick)** 로 분리한다.

---

---

## 11-A. 검증 실측 로그 (2026-09-03 실행)

이전 절에서 `*§11-A*` 로 남겨둔 항목을 실제로 실행한 결과다.

### 정적 · 계약

| 항목 | 명령 | 결과 |
|---|---|---|
| consumer zero census 재실행 | §4 패턴 전수 grep | tracked live source 잔재 **0**. 잔존 hit 은 (a) 은퇴 가드 spec 자신, (b) `RETIRED` 주석, (c) 역사 문서 헤더뿐 |
| lockfile 정합 | `pnpm install --frozen-lockfile` | **exit 0** — package.json 3건 dependency 제거와 `pnpm-lock.yaml` 이 일치 |
| 은퇴 가드 + registry 공용 spec 6종 | `npx jest` (api-server) | **6 suites / 122 tests PASS** |

### Typecheck · Build

| 대상 | 명령 | 결과 |
|---|---|---|
| block-renderer | `pnpm --filter=@o4o/block-renderer run build` (`tsc --build`) | **exit 0** |
| cosmetics-seller-extension | `pnpm --filter=@o4o/cosmetics-seller-extension run build` (`tsc`) | **exit 0** |
| admin-dashboard typecheck | `npx tsc --noEmit` | **exit 0** (에러 0) |
| admin-dashboard production build | `pnpm run build:prod` | **exit 0** — `✓ built in 34.90s` |

`@o4o/shortcodes` dependency 제거 후에도 workspace resolution·project reference·
tree-shaking 결함(unresolved import)이 발생하지 않았다.

**번들 잔재 실측:** 빌드 산출물 `apps/admin-dashboard/dist/` 전체에서
문자열 `shortcode` 출현 **0회**. 은퇴가 소스뿐 아니라 배포 산출물까지 반영됐다.

### Test

| 대상 | 결과 |
|---|---|
| api-server 전체 Jest | **222 suites / 3,709 tests PASS**, 실패 0 |
| admin-dashboard vitest | **13 files / 229 tests PASS**, 실패 0 |

shortcode 전용 spec 2종을 삭제하고 공용 spec 4종에서 shortcode 단언을 제거했음에도
회귀 0. 삭제한 계약은 신규 은퇴 가드가 반대 방향(부재 단언)으로 대체한다.

### 브라우저 스모크 (§26)

로컬 production 빌드를 `vite preview`(`http://localhost:4173`)로 띄우고 실제 브라우저로 접속했다.

| 확인 | 결과 |
|---|---|
| 앱 부팅 · 첫 화면 렌더 | **PASS** — `/login` 정상 렌더 (`O4O Admin Dashboard v0.5.9`) |
| JS exception | **0** — 콘솔 에러 2건은 전부 `api.neture.co.kr` CORS/네트워크(로컬 origin 미허용)이며 모듈·런타임 예외 아님 |
| `window.__shortcodeRegistry` | **부재** (§7 DEV 노출 제거 확인) |
| block 등록 런타임 실측 | **PASS** — `registerAllBlocks()` throw 0, 등록 블록 **32개**, 이름에 `shortcode` 포함 **0개** |

**미수행 항목과 사유 (은폐하지 않고 명시한다):**
편집기 진입 · Block Inserter 조작 · Slash command · preview 등 **인증이 필요한 화면 조작은
수행하지 못했다.** 로컬 origin(`localhost:4173`)이 프로덕션 API 의 CORS 허용 목록에 없어
로그인이 차단된다. 배포된 `admin.neture.co.kr` 은 아직 **은퇴 이전 코드**이므로 그쪽을
스모크해도 이번 변경을 검증하지 못한다.

대신 이번 변경이 실제로 건드린 축(부트스트랩 · block 등록)은 위와 같이 **런타임으로 직접
확인**했다. 인증 화면 스모크는 **배포 후 잔여 항목**으로 남긴다.

### Buttons 스모크 (§27, 이월 항목)

같은 실측에서 Buttons 축이 살아 있음을 registry 수준으로 확인했다.

- `registerAllBlocks()` 결과에 buttons 계열 블록 **존재** (`HAS_BUTTONS=true`)
- `renderers/index.ts` 의 `'o4o/buttons'` 매핑 · `normalize-blocknames.ts` 의
  `'core/buttons': 'o4o/buttons'` 유지 (은퇴 가드가 양성 단언으로 고정)

inner Button 추가 · DynamicRenderer 화면 조작은 위와 같은 CORS 사유로 **미수행**이며
배포 후 잔여 항목으로 남긴다. shortcode 은퇴 결과와는 **별도 항목**이다.

---

## 13. Commit / Push

- 시작 HEAD `ae2e8373b` / `origin/main` `b96f30945` (diverged)
- `ae2e8373b` 은 **다른 세션의 signage 커밋**이며 `origin/work/signage-forced-content-legacy-data-purge-v1`
  에 이미 존재한다. 내 push 에 섞지 않기 위해 §30 절차로 분리했다.
- 워크트리의 foreign unstaged 11 · untracked 4 는 전부 **B2B WO(`b96f30945`) 내용**이며
  `origin/main` 과 동일함을 실측 확인했다. staged 대상에서 제외했다.
- 최신 `origin/main` 기반 임시 worktree 에서 cherry-pick → patch 동일성 확인 → FF push.

*(commit hash 는 아래 절에 기록)*

# CHECK-O4O-NETURE-O4O-BRAND-HEADER-SEO-ALIGNMENT-V1

> **WO**: `WO-O4O-NETURE-O4O-BRAND-HEADER-SEO-ALIGNMENT-V1`
> **상태**: CLOSED (2026-09-17)
> **구현 커밋**: `afee9ae8e` · **배포**: Deploy Web Services run `35171117548` (deploy-neture success)
> **선행**: [`CHECK-O4O-HOME-ROLE-WORKSPACE-ENTRY-REALIGNMENT-V1`](CHECK-O4O-HOME-ROLE-WORKSPACE-ENTRY-REALIGNMENT-V1.md) §4 관찰 O1(헤더 부제) · O2(SEO 기본값)
> **기준 문서**: [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §7 (Legacy Partner 은퇴) · Service Catalog (`neture` = `O4O 공급자 및 유통 플랫폼`, `REPRESENTATIVE_ENTRY_SERVICE_KEY = 'neture'`)

---

## 1. 목적

Role Workspace 리팩터링 · 대표 홈 재정렬(`97bfcbe0c`) 이후 Neture 웹(`services/web-neture`)에 남은 **브랜드 문구 drift** 를 정리한다.

- Legacy Partner 은퇴(2026-09-15) 이후에도 헤더 부제가 「공급자·파트너 협업 플랫폼」 이었다.
- `NETURE_SEO_DEFAULTS` 가 옛 정체성 「Neture — O4O 유통·협업 플랫폼」 을 미등록 경로 전체에 퍼뜨리고 있었다.
- 대표 홈(`/`)의 정체성은 O4O 로 확정됐으나(`index.html` · `/` registry), 그 외 surface 와의 관계(어디까지 O4O · 어디부터 Neture)가 코드에 명시돼 있지 않았다.

**확정 원칙(사용자 지시)**
1. 「공급자·파트너 협업 플랫폼」 문구를 현행 UI 에 남기지 않는다.
2. `neture.co.kr` 대표 홈 정체성 = **O4O**. description = `소규모 사업자를 위한 O4O(Online for Offline) 통합 업무 공간입니다.`
3. 대표 O4O surface 와 Supplier 전용 Neture surface 를 구분한다 — O4O 대표 화면을 Neture 브랜드로 덮지 않고, Supplier Workspace 의 Neture 명칭도 무리하게 제거하지 않는다.
4. `NETURE_SEO_DEFAULTS` 가 O4O 대표 title 을 모든 페이지에 잘못 퍼뜨리지 않도록 page override / fallback 관계를 정리한다.
5. 새 브랜드 시스템 · config package 금지. Header/Footer 공통화 재개 금지.

## 2. Fresh Census (origin/main `5ed603aed` 기준, 변경 전)

| # | 위치 | 변경 전 | 판정 |
|---|---|---|---|
| C1 | `NetureGlobalHeader.tsx` brand.subtitle | `공급자·파트너 협업 플랫폼` | **DRIFT** (Legacy Partner 문구) |
| C2 | `config/seoRegistry.ts` `NETURE_SEO_DEFAULTS` | title `Neture — O4O 유통·협업 플랫폼` / description `공급자·파트너 협업 플랫폼` | **DRIFT** (옛 정체성 + Partner 문구, 미등록 경로 전체 fallback) |
| C3 | `seoRegistry['/']` | O4O 대표 title/description (이전 WO 에서 정렬) | OK |
| C4 | `seoRegistry['/community']` | `Neture — O4O 유통·협업 플랫폼` | **DRIFT** (옛 정체성) |
| C5 | `seoRegistry['/supplier']` description | `Neture 파트너 참여 안내 …` | **DRIFT** (Partner 문구) |
| C6 | `seoRegistry['/guide']` description | `공급자 · 파트너 · 유통참여형 펀딩 …` | **DRIFT** |
| C7 | `index.html` 정적 title / description / og | O4O 대표 문구 | OK |
| C8 | `App.tsx SeoWatcher` | `usePageSeo({registry, pathname, defaults: NETURE_SEO_DEFAULTS})` — 단일 fallback | 구조 정리 필요 (surface 구분 없음) |
| C9 | `NetureLayout.tsx` / `MainLayout.tsx` footer | `© 2026 Neture. 공급자·파트너 협업 플랫폼` | **DRIFT** |
| C10 | `SupplierOpsLayout.tsx` footer | `© 2026 Neture. 공급자·파트너 협업 플랫폼` | **DRIFT** |
| C11 | `SupplierSpaceLayout.tsx` footer | `© 2026 Neture. 공급자 업무공간` | OK (Supplier surface Neture 명칭 유지) |
| C12 | `CommunityPage.tsx` NetureHero tagline | `O4O 공급자 · 운영자 · 파트너 플랫폼` | **DRIFT** |
| C13 | `NetureGlobalHeader` 소비처 | NetureLayout · MainLayout · SupplierSpaceLayout · SupplierOpsLayout · OperatorLayoutWrapper · AdminLayoutWrapper — `O4OHomePage(/)` 는 **미사용** | 대표 홈은 Neture 헤더를 쓰지 않음 → 헤더 부제는 Neture surface 전용 |
| C14 | 페이지 본문의 「파트너」 잔존 (GuideHomePage 파트너 안내 섹션 · CommunityPage usageItems · SupplierLandingPage 「파트너 마케팅」 카드 · NetureResourcesPage heroDesc · operator/admin 문의유형 · AdminServiceApprovalPage 라벨) | 다수 | **범위 밖** (브랜드 문구가 아니라 페이지 콘텐츠 — §7) |
| C15 | Seller 페이지 footer `© 2026 o4o Platform · Neture` | — | 범위 밖 (Legacy seller surface, 처분 트랙 소관) |
| C16 | active docs — `docs/architecture/ui/GLOBAL-HEADER-STANDARD-V1.md:446` 표 행 `neture … 공급자 협업 플랫폼 (O4O 대표 진입)` · `docs/architecture/O4O-COMMONIZATION-STANDARD.md:168` 「Neture는 공급자/파트너 협업 공간이 1차 도메인」 | — | **문서 drift 2건 (보고만, §16-2)** |

## 3. 변경 (커밋 `afee9ae8e`)

### 3-1. 브랜드 계약 — `services/web-neture/src/config/seoRegistry.ts`

- `O4O_BRAND_TITLE = 'O4O — 소규모 사업자를 위한 통합 업무 공간'` · `O4O_BRAND_DESCRIPTION = '소규모 사업자를 위한 O4O(Online for Offline) 통합 업무 공간입니다.'` 상수화 (`index.html` 정적 값과 동일 — 테스트로 고정).
- `NETURE_SEO_DEFAULTS` = O4O 대표 (미등록 공개 경로 fallback).
- surface 별 fallback 신설: `NETURE_SUPPLIER_SEO_DEFAULTS` (`공급자 업무 공간 — Neture`) · `NETURE_OPERATOR_SEO_DEFAULTS` (`서비스 운영 — Neture`) · `O4O_ADMIN_SEO_DEFAULTS` (`플랫폼 관리 — O4O`).
- `resolveNetureSeoDefaults(pathname)` — `/supplier(/…)` · `/operator(/…)` · `/admin(/…)` prefix 매칭, 그 외 O4O 대표. 같은 surface 는 항상 같은 객체(usePageSeo effect deps 안정).
- registry: `/community` → `Neture — O4O 공급자 서비스` (catalog description 기반) · `/supplier` · `/guide` description 에서 파트너 문구 제거. 나머지 항목 불변.
- `@o4o/shared-space-ui` `usePageSeo` 는 **변경 없음** (registry exact-match → defaults 규칙 그대로, defaults 만 surface 별로 주입).

### 3-2. `App.tsx SeoWatcher`
`usePageSeo({ registry: netureSeoRegistry, pathname, defaults: resolveNetureSeoDefaults(pathname) })`.

### 3-3. 헤더 — `NetureGlobalHeader.tsx`
`NETURE_HEADER_BRAND = { icon:'🌿', name:'Neture', subtitle:'O4O 통합 업무 공간', primaryColor:'#059669' }` export. `@o4o/ui GlobalHeader` 불변 (새 브랜드 시스템 · 공통화 없음).

### 3-4. 푸터 · 히어로
- `NetureLayout.tsx` · `MainLayout.tsx` → `© 2026 Neture. O4O 통합 업무 공간`
- `SupplierOpsLayout.tsx` → `© 2026 Neture. O4O 공급자 서비스`
- `SupplierSpaceLayout.tsx` `© 2026 Neture. 공급자 업무공간` 유지
- `CommunityPage.tsx` 히어로 tagline → `O4O 공급자 · 운영자 · 매장 협력 플랫폼`

### 3-5. 테스트 신설
- `src/config/__tests__/seoRegistry.brand.test.ts` (4) — 브랜드 상수 = `index.html` 값 · surface fallback(`/supplierx` 는 대표) · Neture workspace title ≠ O4O title · LEGACY 정규식 `/유통·협업 플랫폼|유통 · 협업 플랫폼|파트너 협업 플랫폼|공급자·파트너/` 가 registry + defaults 전체에 0.
- `src/components/__tests__/NetureGlobalHeader.brand.test.tsx` (1) — name/subtitle · `파트너|협업 플랫폼` 0.

### 3-6. 미변경 (의도)
- `index.html` (이미 O4O) · `@o4o/ui GlobalHeader` · `@o4o/shared-space-ui usePageSeo` · Service Catalog · Header/Footer 구조(공통화 재개 없음) · 페이지 콘텐츠의 「파트너」 잔존(§7).

## 4. 검증

| 항목 | 결과 |
|---|---|
| `npx vitest run --config services/web-neture/vitest.config.mjs` | **12 files / 86 tests PASS** (신규 5 포함) |
| `npx tsc --noEmit -p tsconfig.json` (services/web-neture) | exit 0 |
| `pnpm --filter "@o4o/web-neture" build` | OK |
| 배포 | Deploy Web Services `35171117548` success (deploy-neture success · 다른 서비스 skipped) |

### 4-1. 프로덕션 smoke (Playwright · 배포 후 · 2026-09-17)

**비로그인 · desktop 1280×900**

| 경로 | document.title | meta description | og:title | og:site_name | 헤더 부제 | footer | Legacy 문구 |
|---|---|---|---|---|---|---|---|
| `/` | `O4O — 소규모 사업자를 위한 통합 업무 공간` | 확정 description | = title | `O4O` | (Neture 헤더 없음 — 대표 홈) | 이용약관 · 개인정보 · Contact | 0 |
| `/community` | `Neture — O4O 공급자 서비스` | 커뮤니티 홈 description | = title | `O4O` | `🌿 Neture / O4O 통합 업무 공간` | `© 2026 Neture. O4O 통합 업무 공간` · 히어로 tagline `O4O 공급자 · 운영자 · 매장 협력 플랫폼` | 0 |
| `/guide` | `이용 안내 — Neture` | 파트너 제거된 description | = title | `O4O` | 동일 | `© 2026 Neture. O4O 통합 업무 공간` | 0 |
| `/supplier` | `Supplier — Neture` | `Neture 공급자 참여 안내. O4O 유통망 진입 안내.` | = title | `O4O` | 동일 | 동일 | 0 |
| `/contact` | `연락처 — Neture` | 불변 | = title | `O4O` | 동일 | 동일 | 0 |
| `/unknown-xyz` (미등록) | O4O 대표 title | 확정 description | = title | `O4O` | — | — | 0 |

**비로그인 · mobile 390×844** — `/` title O4O · 가로 스크롤 없음 / `/community` 헤더 `🌿 Neture O4O 통합 업무 공간` · footer `© 2026 Neture. O4O 통합 업무 공간` · 가로 스크롤 없음 · Legacy 0.

**로그인(KPA 체험용 약국 경영자 계정 → `POST /auth/handoff {targetServiceKey:'neture'}`) · desktop**

| 경로 | document.title / og:title | meta description | 헤더 | footer | 비고 |
|---|---|---|---|---|---|
| `/supplier/dashboard` (handoff landing) | `공급자 업무 공간 — Neture` | `O4O 공급자 서비스 Neture 의 공급자 업무 공간 — 상품 · 주문 · 콘텐츠.` | `🌿 Neture / O4O 통합 업무 공간` + 공급자 nav | `© 2026 Neture. 공급자 업무공간` (SupplierSpaceLayout) | Legacy 0 |
| `/supplier/products` (client-side 이동) | 동일 | 동일 | 동일 | 동일 | 상품 API 는 체험 계정 권한으로 오류(WO 무관) |
| `/operator` | `서비스 운영 — Neture` | `O4O 공급자 서비스 Neture 의 서비스 운영 업무 공간.` | — | — | 체험 계정은 운영자 아님 → 「접근 권한이 없습니다」 화면. **SEO fallback 만 검증**, OperatorLayoutWrapper 헤더/푸터는 미검증(헤더는 단위 테스트로 공통 확인) |
| `/admin` | `플랫폼 관리 — O4O` | `O4O 플랫폼 관리.` | — | — | 체험 계정은 관리자 아님 → 동일. **SEO fallback 만 검증** |
| `/` (로그인 상태 · client-side 이동) | O4O 대표 title | 확정 description | Neture 헤더 없음 | — | Legacy 0 |

**로그인 · mobile 390×844** — `/supplier/dashboard` title `공급자 업무 공간 — Neture` · 헤더 `🌿 Neture O4O 통합 업무 공간` · footer `© 2026 Neture. 공급자 업무공간` · 가로 스크롤 없음.

### 4-2. 검증하지 않은 것 (정직 기록)
- `/operator/*` · `/admin/*` 안의 **레이아웃 헤더/푸터 실화면** — 체험 계정에 역할이 없어 진입 불가. 헤더는 `NetureGlobalHeader` 단일 컴포넌트라 단위 테스트로 공통 담보, SEO fallback 은 프로덕션에서 확인.
- OG 이미지 · `og:url` — `usePageSeo` 가 다루지 않음(기존과 동일, 이 WO 범위 아님).
- 로그인 상태에서의 `page.goto` 전체 reload — 알려진 handoff 세션 소실(§7 IR) 때문에 client-side 이동(pushState)으로 검증. 비로그인 경로는 전부 실제 reload 로 검증.

## 5. 원칙 대조

| 원칙 | 결과 |
|---|---|
| Legacy Partner 문구 현행 UI 0 | 헤더 · SEO · footer · 히어로 = 0 (테스트 고정). 페이지 본문 콘텐츠 잔존은 §7 |
| 대표 홈 = O4O | `/` · 미등록 공개 경로 · `index.html` 모두 O4O 대표 title/description |
| O4O surface ≠ Neture surface | 대표 홈 은 Neture 헤더 미사용 · `/supplier/*` `/operator/*` 는 Neture title · `/admin/*` 은 O4O |
| SEO fallback 오염 없음 | 옛 「유통·협업 플랫폼」 0 · O4O 대표 title 이 Supplier/Operator 페이지에 퍼지지 않음 (테스트 `Neture workspace title ≠ O4O title`) |
| 새 브랜드 시스템 · package 0 | 상수 3개 + resolver 1개 (기존 파일 안) |
| Header/Footer 공통화 재개 0 | 구조 변경 없음 · 문구만 |

## 6. 문서 정합 (CLAUDE.md §16)

**발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건** (아래 2건을 한 WO 로 묶어 정정 권장 — 둘 다 active 기준 문서의 **내용** 이라 §16-4 인라인 금지):

1. [`docs/architecture/ui/GLOBAL-HEADER-STANDARD-V1.md`](../architecture/ui/GLOBAL-HEADER-STANDARD-V1.md) L446 — 서비스 표 `neture` 행 부제 `공급자 협업 플랫폼 (O4O 대표 진입)` → 현행 `O4O 통합 업무 공간`.
2. [`docs/architecture/O4O-COMMONIZATION-STANDARD.md`](../architecture/O4O-COMMONIZATION-STANDARD.md) L168 — 「Neture는 공급자/파트너 협업 공간이 1차 도메인」 → Legacy Partner 은퇴 반영(공급자 서비스 · O4O 대표 진입).

## 7. 범위 밖 관찰 (미수정 · 후속 후보)

| # | 관찰 | 제안 |
|---|---|---|
| O1 | 페이지 **콘텐츠** 의 「파트너」 잔존 — `GuideHomePage.tsx` 파트너 안내 섹션/flowLabels · `CommunityPage.tsx` usageItems 「파트너 협력 방식을 안내합니다」 · `SupplierLandingPage.tsx` 「파트너 마케팅」 카드 · `NetureResourcesPage.tsx` heroDesc 「공급자·파트너를 위한」 · operator/admin 문의 유형 · `AdminServiceApprovalPage` 라벨 | 브랜드 문구가 아니라 안내 콘텐츠 — 「파트너 → 매장」 의미 재정의가 필요한 항목이 섞여 있어 별도 콘텐츠 정리 WO |
| O2 | Seller 페이지 footer `© 2026 o4o Platform · Neture` | Legacy seller surface — dead surface 처분 트랙 판단에 위임 |
| O3 | handoff 로 얻은 neture 세션이 전체 reload 시 소실 (pre-existing) | `IR-O4O-CROSSSERVICE-HANDOFF-SESSION-PERSISTENCE-V1` (조사부터) |
| O4 | `/supplier/products` 상품 API 가 체험 계정에서 오류 | 계정 권한 문제로 추정 · 이 WO 무관 |

## 8. Git

- 구현 `afee9ae8e` (path-specific · `services/web-neture/src/**` 8 파일) → `origin/main` push 완료.
- 본 CHECK 는 별도 docs 커밋.

## 9. 최종 판정

```
HEADER_SUBTITLE        = PASS   (공급자·파트너 협업 플랫폼 → O4O 통합 업무 공간 · 프로덕션 desktop/mobile 확인)
SEO_DEFAULTS           = PASS   (대표 = O4O · 옛 유통·협업 플랫폼 0)
SURFACE_FALLBACK       = PASS   (/supplier → Neture · /operator → Neture · /admin → O4O · 미등록 → O4O 대표, 프로덕션 확인)
REPRESENTATIVE_HOME    = PASS   (/ title · description · og = O4O · Neture 헤더 없음)
LEGACY_PARTNER_PHRASE  = 0      (헤더/SEO/footer/히어로 · 테스트 고정)
OLD_IDENTITY_PHRASE    = 0      (유통·협업 플랫폼)
NEW_BRAND_SYSTEM       = 0
HEADER_FOOTER_COMMONIZATION = 0
TESTS                  = 86/86 · tsc 0 · build OK
DEPLOY                 = 35171117548 success
DESKTOP_SMOKE          = PASS   (비로그인 6 경로 + 로그인 supplier 2 경로 + operator/admin SEO fallback)
MOBILE_SMOKE           = PASS   (/ · /community · /supplier/dashboard)
UNVERIFIED             = operator/admin 레이아웃 실화면(체험 계정 역할 없음)
DOC_DRIFT              = 발견 2 / 인라인 0 / 별도 WO 제안 1
NEXT                   = CLOSED
```

# CHECK-O4O-POST-LEGACY-RESIDUE-AND-ENVIRONMENT-CLEANUP-V1

> **WO**: `WO-O4O-POST-LEGACY-RESIDUE-AND-ENVIRONMENT-CLEANUP-V1`
> **일자**: 2026-08-05
> **브랜치**: `main` (직접 작업)
> **선행 WO**: `WO-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1`, `WO-O4O-GLUCOSEVIEW-FULL-LEGACY-REMOVAL-V1` (`4274982e5`)
> **판정**: **PASS (부분 중지 1건 · 전제 정정 1건)**

---

## 0. 요약

Dropshipping·GlucoseView 제거 후 남은 코드·설정·문서·로컬 환경 잔재를 4개 범위로 조사·정리했다.

| 범위 | 결과 |
|---|---|
| 1. Dropshipping 잔여물 제거 | **완료** — 실행 코드·CPT·shortcode·script 잔존 0 |
| 2. `operator-core-ui` 타입 오류 | **완료** — 근본 원인은 `@o4o/error-handling` 공용 패키지, 최소 수정 |
| 3. GlycoPharm·K-Cos 계정 경로 재검증 | **검증 완료 / 부분 중지** — 사용 가능한 매장 스코프 계정 부재 확인 |
| 4. 로컬 환경 정리 | **완료** — 본 세션 proxy(PID 25688) 종료, 타 세션 6개 미접촉 |

**운영 DB write 0건.** 모든 DB 접근은 read-only census(SELECT / COUNT / information_schema)로만 수행했다.

---

## 1. 운영 DB Census (read-only)

WO 실행 순서 ③④ 전제 확인.

| 확인 항목 | 결과 |
|---|---|
| `custom_posts` 테이블 | **존재하지 않음** (프로덕션 미생성) |
| `custom_post_types` row | **0 건** |
| `ds_product` / `ds_supplier` / `ds_partner` / `ds_commission_policy` 운영 row | **0 건** |
| `dropshipping_*` 물리 테이블 | **0 개** |

→ WO 실행 순서 **④ 조건 충족**(`ds_*` 운영 row = 0) → Dropshipping 잔재 통삭제 진행.
→ 부분 중지 조건 "`ds_*` 운영 row 존재" **미발동**.

**유지 항목 (삭제 금지)**

- 모든 `migration` 이력 — WO 원칙 "migration 이력 삭제 금지"
- 역사 문서 — `docs/checks/CHECK-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1.md`, `docs/**/phase-b4-*.md`
- `packages/ecommerce-core/**` — 주문 정본, 구조 변경 금지

---

## 2. 범위 1 — 삭제한 잔여물 (23 파일)

### 2-1. CPT / ACF / 타입 / 템플릿 (api-server)

| 경로 | 근거 |
|---|---|
| `src/schemas/ds_product.schema.ts` | 유일 소비처가 `cpt.init.ts` |
| `src/schemas/ds_supplier.schema.ts` | 〃 |
| `src/schemas/ds_partner.schema.ts` | 〃 |
| `src/schemas/ds_commission_policy.schema.ts` | 〃 |
| `src/services/cpt/dropshipping-cpts.ts` | 소비처 0 |
| `src/services/acf/dropshipping-fields.ts` | 소비처 0 |
| `src/types/dropshipping.ts` | 소비처 0 |
| `templates/system/archive-ds-products.json` | 소비처 0 |

`src/init/cpt.init.ts` — `ds_*` import 4건 및 등록 배열 항목 4건 제거. 잔여 등록은 `products` / `portfolio` / `testimonials` / `team`.

### 2-2. 미실행 스크립트 / 테스트 setup

| 경로 | 근거 |
|---|---|
| `scripts/test-e2e-workflow.ts` | 존재하지 않는 `src/modules/dropshipping/services/*` import |
| `scripts/test-settlement-workflow-simple.ts` | 〃 |
| `src/__tests__/setup/test-database.ts` | 존재하지 않는 `modules/dropshipping/entities/*` import. `jest.config.cjs:13` `testPathIgnorePatterns` 로 이미 제외 상태 |
| `src/__tests__/setup/test-fixtures.ts` | 〃 (실사용 setup 은 `jest.setup.ts`) |
| `tmp/dropshipping_core_install.sql` | git tracked, dropshipping 참조 44건 |

### 2-3. Shortcode / UI

| 경로 | 근거 |
|---|---|
| `packages/shortcodes/src/dropshipping/{AffiliateDashboard,SellerDashboard,SupplierDashboard,index}.tsx` | 폐지된 `/api/v1/dropshipping/*` 호출 |
| `apps/main-site/src/shortcodes/_functions/dropshipping/{partner,seller,supplier}Dashboard.ts` | 〃 |
| `apps/main-site/src/components/ui/dropshipping/DropshippingDashboard.tsx` | 〃 |
| `apps/admin-dashboard/public/shortcode-config.js` (387줄) | 소비처 0 |
| `apps/admin-dashboard/src/components/shortcodes/ShortcodeRenderer.tsx` (252줄) | 정적 소비처 0 (`ShortcodeBlock.tsx` 는 `@o4o/shortcodes` 쪽을 import) |

레지스트리·메타데이터 정리:

- `packages/shortcodes/src/index.ts` — dropshipping export 블록 제거
- `packages/shortcodes/src/metadata.ts` — `category: 'dropshipping'` 메타 4건 제거 (`customer_dashboard`, `supplier_application`, `seller_application`, `partner_application` — 모두 **구현 0**)
- `apps/main-site/src/components/registry/ui.tsx` — `DropshippingDashboard` import·등록 제거
- `apps/main-site/src/components/registry/function.ts` — dropshipping function 3건 import·등록 제거
- `apps/admin-dashboard/src/types/global.d.ts` — `renderShortcode?` 제거 (생산자·소비자 모두 삭제됨)

### 2-4. Signage 폐지 API 기본값

`services/signage-player-web/src/components/blocks/CornerDisplayBlock.tsx`

- `DEFAULT_LISTINGS_API = '/api/v1/dropshipping/core'` 상수 제거
- base URL 이 블록 설정으로 **명시되지 않으면 요청을 보내지 않고 빈 목록** 처리로 변경 (폐지 엔드포인트로의 무의미한 요청 제거)

### 2-5. 설정 / 카탈로그 / 문자열

| 경로 | 변경 |
|---|---|
| `apps/api-server/src/app-manifests/appsCatalog.ts` | 선행 WO 의 tombstone 주석 8블록 제거, 그중 3건은 실질 내용(serviceGroup 유지 사유 / `partnerops`=`@o4o/partner-core` / 건강기능식품 담당 모듈)으로 압축 보존 |
| `apps/api-server/create-cpt-tables.sql` | `'product,ds_product'` → `'product'` (2건) |
| `apps/api-server/test-cpt-endpoints.js` | 〃 (2건) |
| `apps/api-server/scripts/bootstrap-install-apps.{ts,mjs}` | `CORE_APPS_INSTALL_ORDER` 에서 `dropshipping-core`, `dropshipping-cosmetics` 제거 |
| `apps/api-server/tests/multi-tenant/setup.ts` | fixture appId `dropshipping-cosmetics` → `cosmetics-seller-extension` (6건). spec assertion 의존 없음 확인 |
| `scripts/dev.mjs:148,197` | `appStorePackages` 에서 dropshipping 2건 제거 |
| `packages/api-types/package.json` | 깨진 `"./dropshipping"` export map 제거 (`src/dropshipping.ts` 부재, 소비처 0) |
| `apps/admin-dashboard/src/styles/toolset-tables.css` | dead `.cpt-type-badge.dropshipping` 규칙 제거 |
| `apps/admin-dashboard/src/components/editor/blocks/ShortcodeBlock.tsx:1091` | 예시 문자열 `type="ds_product"` → `type="products"` |
| `apps/admin-dashboard/src/services/ai/block-registry-extractor.ts` | tombstone 주석 제거 |
| `apps/admin-dashboard/src/routes/commerce.routes.tsx` | tombstone 주석 제거 |
| `packages/types/src/listing-display.ts` | 문서 주석 2건 일반화 (`/api/v1/dropshipping/core/listings` → `{listingsApiBaseUrl}/listings`) |

---

## 3. 전역 잔존 참조 및 유지 근거

전역 검색 결과 **실행 코드 · 라우트 · CPT · shortcode · script 잔존 0**. 아래는 의도적으로 유지한다.

| 대상 | 유지 근거 |
|---|---|
| `apps/admin-dashboard/src/pages/{sellerops,supplierops}/` | **WO 전제 정정 — §4 참조** |
| `packages/types/src/auth/permissions.ts` (+ 체크인된 `.js`/`.d.ts`) dropshipping 권한 상수 | RBAC 인접(F9 Freeze). 동작 영향 있음 → 최소 수정 범위 밖 |
| `packages/market-trial/src/entities/*.entity.ts` 문서 주석 (`dropshipping_sellers/suppliers`) | 주석 한정, 역사 기술 |
| `apps/api-server/tests/multi-tenant/appstore.spec.ts` `not.toContain('dropshipping-*')` | **재발 방지 회귀 가드** — 유지가 정답 |
| `CLAUDE.md:143` `OrderType.DROPSHIPPING` | CLAUDE.md §4 에서 **✅ 허용**으로 명시 |
| `packages/ecommerce-core/**`, 전체 migration, 역사 문서 | WO 원칙(구조·이력 변경 금지) |
| `apps/admin-dashboard/src/components/shortcodes/admin/`, `productShortcodes.tsx` | `shortcode-loader.ts:110` 의 `import.meta.glob('../components/shortcodes/**/index.{ts,tsx}')` 로 **동적 로드 중** |

---

## 4. WO 전제 정정 — `sellerops` / `supplierops`

WO 범위 1 은 이를 "admin 의 **미참조** 로컬 페이지"로 기술했으나 **사실과 다르다.**

- `apps/admin-dashboard/src/routes/apps.routes.tsx:37,40` — lazy import 존재
- 동 파일 `:172,183` — `AppRouteGuard` 하위에 **라우팅 등록됨**
- `ViewComponentRegistry.ts:252-254` — 선행 감사 §5-4 의 **보존 판정**이 기록되어 있음

→ 삭제 시 실사용 화면이 사라진다. **유지**하며, 본 CHECK 에 전제 오류를 명시 기록한다.

---

## 5. 범위 2 — 타입 오류 원인 및 수정

**증상**: `@o4o/operator-core-ui` typecheck 에서 `ImportMeta.env` TS2339.

**원인**: `operator-core-ui` 자체가 아니라 그것이 의존하는 **공용 패키지** `packages/error-handling/src/hooks/useApiErrorHandler.ts` 가 `import.meta.env.DEV` 를 직접 참조한다. `import.meta.env` 는 **Vite 전용 확장**이므로 `vite/client` 타입을 갖지 않는 소비 패키지에서 컴파일이 깨진다. → 판정: **공용 패키지의 잘못된 환경 의존**.

**수정** (`useApiErrorHandler.ts:34-38`) — 광범위 ambient shim 금지 원칙에 따라 지역 캐스팅으로 좁힘:

```ts
const isDev = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;
```

런타임 동작 불변(Vite 환경에서는 그대로 `DEV` 를 읽고, 그 외 환경에서는 `undefined` → false).

---

## 6. 범위 3 — GlycoPharm·K-Cos 계정 / organization 검증

브라우저 자동화는 **타 세션이 Playwright 프로필(`~/.playwright-o4o-profile`)을 점유** 중이어서 사용할 수 없었다. 타 세션 브라우저 종료는 WO 금지 사항이므로, CLAUDE.md §8 이 명시 허용하는 **운영 API 직접 호출**로 대체 검증했다.

### 6-1. 결과 (자격증명·토큰 미기재)

| 계정 | 로그인 | store-hub 접근 | 판정 |
|---|---|---|---|
| `renagang21@gmail.com` | **401 `INVALID_CREDENTIALS`** | 검증 불가 | 기록된 비밀번호 무효 |
| `sohae2100@gmail.com` | 200 | `data: null` / 403 `STORE_OWNER_REQUIRED` | 매장 스코프 없음 |

### 6-2. 구조적 사실 — 역할이 아니라 organization 이 스코프를 결정한다

- `/store-hub/*` 는 `optionalStoreAuth(dataSource, serviceKey)` 로 `req.organizationId` 를 얻으며, 이는 **`{service}:store_owner` 역할을 요구**한다 (서비스 간 유출 방지 가드).
- 해당 계정들의 `role_assignments."organizationId"` 는 NULL (`scope_type='global'`) 이고, 실제 조직 결속은 **`organization_members`** 에 있다.
- `service_memberships` 에는 `organization_id` 컬럼이 **없다**. → 서비스 가입 여부만으로 매장 스코프를 판단할 수 없다.
- 구조적으로 올바른 계정은 `renagang21@gmail.com`(`glycopharm:store_owner` + `cosmetics:store_owner` + 약국/매장/공급자 조직 보유)이나 **로그인 불가**.

→ WO 의 "무효한 `renagang21` 전제 제거" 지시가 타당함을 확인했다.

### 6-3. 부분 중지 (WO 정의대로 계속 진행)

WO 부분 중지 조건 **"GlycoPharm·K-Cos 유효 계정 확인 불가" 발동**. 기능 작업은 중단 없이 완주했다.

`docs/local/TEST-ACCOUNTS.local.md` 에 검증 상태 메모를 추가했다. 이 문서는 `.gitignore:139` 로 **추적 제외**이며 **커밋되지 않는다.** 자격증명·토큰은 보고서·문서·커밋 어디에도 기록하지 않았다.

---

## 7. 범위 4 — 로컬 환경 정리

`Get-CimInstance Win32_Process` 로 전체 `cloud-sql-proxy` 프로세스를 열거해 **PID 25688 이 본 세션 것임을 커맨드라인으로 확인**:

```
C:\Users\home\coding\o4o-platform\bin\cloud-sql-proxy.exe --address 127.0.0.1 --port 5447 netureyoutube:asia-northeast3:o4o-platform-db
```

→ `Stop-Process -Id 25688 -Force` 실행. **종료 완료** (차단 없음).

**미접촉 (타 세션 소유)**: PID `21428`(55437), `15432`(5439), `18704`(5441), `28864`(15441), `1236`(15433), `3288`(15434).

---

## 8. 검증 결과

| 항목 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | ✅ |
| `pnpm type-check:frontend` | ✅ |
| `@o4o/operator-core-ui` tsc | ✅ exit 0 (**범위 2 목표 달성**) |
| `@o4o/error-handling` tsc | ✅ exit 0 |
| `@o4o/shortcodes` tsc | ✅ exit 0 |
| `signage-player-web` tsc | ✅ exit 0 |
| `web-glycopharm` tsc | ✅ exit 0 |
| api-server `tsconfig.build.json` | ✅ exit 0 (CI·빌드 기준 tsconfig) |
| multi-tenant tests | ✅ 4 files / 75 tests |
| admin-dashboard tests | ✅ 14 files / 237 tests |
| api-gateway tests | ✅ 1 / 1 |
| `@o4o/main-site-nextgen` build | ✅ |
| `@o4o/admin-dashboard` build | ✅ |
| api-server jest | 72 / 73 suites PASS — 실패 1건은 **본 WO 무관 선행 결함**(§8-1) |

### 8-1. 선행 CI RED (본 WO 무관 · 병렬 세션 소유)

`apps/api-server/src/__tests__/store-local-product-description.spec.ts` 4건 실패 (PUT → 404, `detail_html` → null).

**본 WO 무관 근거**:

1. 해당 spec 은 `store-local-product.routes.js` 만 import 하며, 그 경로는 본 WO 에서 **미변경**.
2. `gh run list` 기준 **HEAD `19442dd5c` 에서 CI Pipeline 이 이미 `failure`**, 직전 `83ba214b9` 는 `success`.
3. `19442dd5c feat(pharmacy-hub): add handled and local products` 는 **병렬 세션 작업물**.

→ 본 WO 범위 밖이며 소유 세션에 귀속된다. 수정하지 않았다.

### 8-2. commit · push · CI

- commit: `196b84a58` (45 files, +288 / −5694)
- push: `origin/main` fast-forward 완료
- 직후 병렬 세션이 `574724c1c fix(store): local product 추출본의 자체 유입 UUID 가드 제거` 를 push 하여
  `196b84a58` 의 CI Pipeline 은 **concurrency 로 cancelled**(실패 아님).
- 본 커밋을 포함하는 `574724c1c` 기준 **CI Pipeline `success` / CodeQL `success`**,
  `196b84a58` 기준 **AppStore Guard · Deploy Main Site · Deploy Admin Dashboard · Deploy Web Services 모두 `success`**.
- §8-1 의 선행 결함은 소유 세션이 `574724c1c` 로 직접 해소했다.

---

## 9. 승인 필요 — 미조치 항목

**Cloud Run 서비스 `glucoseview-web` 이 아직 존재한다** (`https://glucoseview-web-3e3aws7zqa-du.a.run.app`).

선행 WO `WO-O4O-GLUCOSEVIEW-FULL-LEGACY-REMOVAL-V1` 은 코드 계층을 제거했으나 배포된 서비스는 남아 있다. 삭제는 **되돌리기 어려운 외부 영향 작업**이므로 사용자 승인 전까지 조치하지 않았다.

---

## 10. 판정

**PASS** — 범위 1·2·4 완료, 범위 3 은 검증 완료 후 WO 정의된 부분 중지.

- WO 전체 중지 조건 **미발동** (병렬 세션 핵심 파일 충돌 없음 / 현재 기능의 삭제 대상 소비 없음 / DB schema·migration 변경 없음)
- 운영 DB write **0건**
- 자격증명·토큰 노출 **0건**
- 병렬 세션 작업물(HFF·OTC 등) **미접촉**

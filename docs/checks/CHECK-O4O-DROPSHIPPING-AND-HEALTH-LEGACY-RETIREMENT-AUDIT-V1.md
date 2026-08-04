# CHECK-O4O-DROPSHIPPING-AND-HEALTH-LEGACY-RETIREMENT-AUDIT-V1

- **WO**: `WO-O4O-DROPSHIPPING-AND-HEALTH-LEGACY-RETIREMENT-AUDIT-V1`
- **일자**: 2026-08-04
- **성격**: READ-ONLY 조사 (**코드 변경 0 / DB write 0** — 본 CHECK 문서 신규 1건 외 수정 없음)
- **판정 요약**: 중지 조건 **해당 없음**. 삭제 가능 범위 확정.

---

## 0. 한 문장 결론

드롭쉬핑·혈당측정 잔재는 **DB 측에서 이미 전량 소멸**했고(운영 테이블 0 / 운영 row 0), 남은 것은 **소비처 없는 코드·패키지·카탈로그 항목**뿐이다. 다만 **`/api/v1/dropshipping` 라우터만은 아직 살아서 mount 되어 있고 존재하지 않는 테이블을 조회**하므로, 이것이 삭제 1순위다.

---

## 1. 실제 사용 지도

### 1-1. Dropshipping — 백엔드

| 항목 | 상태 | 근거 |
|------|------|------|
| `/api/v1/dropshipping` 라우터 | **LIVE (mount 됨)** | `apps/api-server/src/bootstrap/register-routes.ts:114, 868-874` — `createDropshippingAdminRoutes(dataSource)` → `app.use('/api/v1/dropshipping', ...)` |
| 해당 라우터의 조회 대상 | **존재하지 않는 테이블** | `routes/dropshipping-admin/repositories/*.ts` 가 raw `dataSource.query()` 로 `dropshipping_seller_offers` / `dropshipping_supplier_catalog_items` / `dropshipping_offer_logs` 조회 → **§2 에서 프로덕션에 전부 부재 확인** |
| 가드 | `requireDropshippingScope()` (`dropshipping:admin` / `neture:admin` / `platform:admin` / `platform:super_admin`, else 403 `DS_403`) | `routes/dropshipping-admin/dropshipping-admin.routes.ts` |
| `@o4o/dropshipping-core` 런타임 import | **0건** | api-server 전역 grep — 참조는 `database/entities.ts:65` 주석뿐 |
| `@o4o/dropshipping-cosmetics` 런타임 import | **0건** | `database/entities.ts:547` "DOMAIN ENTITIES REMOVED (Phase R1)" 목록에만 존재 |
| TypeORM entity 등록 | **0건** | `database/entities.ts:64-76` 전 항목 주석 처리 |
| manifest 등록 | **0건** | `app-manifests/index.ts` — `manifestRegistry = {}` (Phase R1 Core API only), `loadLocalManifest` 는 `[Phase R1] Manifest not found` throw |
| `appsCatalog.ts` 노출 | 항목 잔존 (dropshipping-core / dropshipping-cosmetics / sellerops / supplierops / partnerops) | `manifestRegistry` 가 비어 있으므로 **열람만 되고 설치 불가** |

### 1-2. Dropshipping — 패키지 의존 체인

```
pharmacyops ──┬─▶ pharmaceutical-core ──▶ dropshipping-core
              └─▶ dropshipping-core
sellerops ───────────────────────────────▶ dropshipping-core
supplierops ─────────────────────────────▶ dropshipping-core
dropshipping-cosmetics ──────────────────▶ dropshipping-core
partnerops ──▶ partner-core            (dropshipping 무관 — 범위 밖)
```

- `pharmaceutical-core` 는 `registerExtension` / `unregisterExtension` / `DropshippingCoreExtension` 를 **실제로 import** 하지만, 그 `pharmaceutical-core` 자체의 소비처는 `pharmacyops` 뿐이고 `pharmacyops` 의 소비처는 **0** → **전체가 dead chain**.
- `sellerops` / `supplierops` / `pharmacyops` 패키지: 리포 전역 소비처 **0건**.
- **주의(오탐 방지)**: `apps/admin-dashboard/src/pages/{sellerops,supplierops,partnerops}/` 는 **동명의 admin 로컬 페이지**이며 위 패키지를 import 하지 않는다(주석에만 언급). 별개 자산이다.

### 1-3. Dropshipping — 프론트엔드 (admin-dashboard)

| 항목 | 파일 수 | 상태 |
|------|:---:|------|
| `src/pages/dropshipping/*` (OrderRelay·Settlement·Products·Commissions 등) | 25 | 라우팅 **LIVE** — `routes/commerce.routes.tsx:6-9, 28-55` (`/admin/dropshipping/order-relays`, `/settlements`) |
| `src/pages/dropshipping-offers/*` | 6 | 라우팅 존재 |
| `src/components/shortcodes/dropshipping/*` | 다수 | `/api/v1/dropshipping/{verification,dashboard,affiliate/*,partner/*}` 호출 — **백엔드에 해당 경로 없음**(백엔드는 `/admin/*` 만 제공) → **전량 404** |
| `src/api/dropshipping-admin.ts`, `dropshipping-cpt.ts` | 2 | |
| `src/pages/test/DropshippingUsersTest.tsx` | 1 | |
| **합계 (tracked)** | **56** | |
| `vite.config.ts:45,105` | — | `@o4o/dropshipping-core` alias + optimizeDeps 등록 |

`components/routing/ViewComponentRegistry.ts:256,266,276` 에 Seller/Supplier/PartnerOps 라우터 등록.

### 1-4. Health / 혈당측정

`health` 전수 검색 결과는 **세 갈래로 명확히 분리**된다.

| 분류 | 대상 | 판단 |
|------|------|------|
| **A. 활성 — 건강기능식품 (HFF)** | `apps/api-server/src/modules/neture/drug-import/health-functional-food-*` (10 + 테스트 3), `apps/api-server/src/scripts/health-functional-food-*.ts` (5) | **RETAIN** — 현재 KO/ZH 생산이 진행 중인 정상 트랙. 이름만 `health` |
| **B. 활성 — health check 엔드포인트** | `apps/api-server/src/routes/health.ts`, `apps/forum-api/src/routes/health.routes.ts` | **RETAIN** — 인프라 헬스체크. 혈당측정과 무관 |
| **C. 혈당측정 legacy** | 아래 표 | **삭제 대상** |

**C. 혈당측정 legacy 실체:**

| 항목 | 상태 |
|------|------|
| `packages/cgm-pharmacist-app` (38 files) | **admin-dashboard 가 실제 lazy import** — `routes/apps.routes.tsx:34-56, 191-227` (Patient List/Detail/Coaching/Alerts, `AppRouteGuard appId="cgm-pharmacist-app"`). `package.json:49` workspace dep, `vite.config.ts:49,107` alias. CI dist 검증 루프 및 `build:cgm-pharmacist-app` 포함 |
| `packages/cgm-pharmacist-app` 백엔드 | `src/backend/mock/mockPatients.ts` — **mock 데이터 기반**. api-server 에 mount 없음 |
| `apps/api-server/packages/cgm-pharmacist-app` | 스텁 |
| `packages/pharmacy-ai-insight` (23 files) | admin `/pharmacy-ai-insight` 라우트 LIVE. `cgm-pharmacist-app/src/manifest.ts:24` 가 optional 의존. **혈당 전용 유틸 `src/backend/utils/glucoseUtils.ts` 보유** → 패키지 자체는 별도 판단 필요 |
| `packages/diabetes-core`, `packages/diabetes-pharmacy` | **git tracked 0 — 소스 이미 삭제됨**. `dist/`·`node_modules/`·`tsbuildinfo` 만 잔존한 유령 디렉터리. 그런데 root `package.json:33 build:diabetes-packages` 가 여전히 `pnpm --filter` 로 이들을 빌드 시도 |
| `packages/health-extension` | **git tracked 0, `package.json` 조차 없음** — `node_modules/` 만 남은 유령 디렉터리 |
| glucoseview 마이그레이션 7건 | `1737100000000-UpdateGlucoseViewTestAccountPasswords`, `1737100100000-ActivateGlucoseViewTestAccounts`, `20260222300000-CreateGlucoseViewCustomersTable`, `20260222400000-AddOrganizationIdToGlucoseViewCustomers`, `20260326300000-AddUserIdToGlucoseviewCustomers`, `20260404200000-RemoveGlucoseViewFromFeatured`, `20260600000000-DropGlucoseviewAndCgmTables` |
| care/health_readings 마이그레이션 16건 | `2026021500000{1,2}`, `2026021510000{1,2}`, `20260222500000`, `20260306120000-CreateHealthReadings`, `20260308{2,3,5}00000`, `20260312100000`, `20260313100000`, `20260314100000`, `20260322000001-CreatePatientHealthProfiles`, `20260322120000`, `20260326400000`, `20260327000100`, `20260401100000`, `20260401200000`, `20260409500000`, `20260601000000-DropCareTables` |
| `glucoseview` **service key** | `service-catalog.ts` 5키 중 하나. `service-scopes.ts`, `rbac-catalog.ts`, `ServiceMembership`, `register.dto.ts`, CMS 채널/슬롯/콘텐츠 셀렉터, `PartnerApplication/Content/Event/Target` 등 **공유 enum·셀렉터 전반에 분포** |
| 프론트 잔재 | `apps/admin-dashboard/src/components/guards/GlucosecareParticipationNotice.tsx`, `services/web-glycopharm/src/pages/business/BloodCareBusinessStatusPage.tsx` |

---

## 2. DB 테이블·row census (프로덕션 read-only)

접속: `cloud-sql-proxy` → `psql -h 127.0.0.1 -p 15477 -U o4o_api -d o4o_platform` (SELECT/COUNT 전용).

### 2-1. 삭제 대상 후보 테이블 — **전부 부재**

| 패턴 | 결과 |
|------|:---:|
| `%dropship%` | **0 테이블** |
| `ds\_%` | **0 테이블** |
| `%health%` | **0 테이블** |
| `%patient%` | **0 테이블** |
| `%glucose%` | **0 테이블** |
| `cgm%` | **0 테이블** |
| `%blood%` | **0 테이블** |
| `care\_%` | **0 테이블** |

즉 **보존이 필요한 운영 데이터가 존재하지 않는다.** `DATA_ARCHIVE_THEN_DELETE` 대상은 **0건**이다.

### 2-2. 소멸 경위 — 이미 실행된 DROP 마이그레이션

`typeorm_migrations` 에 아래가 기록되어 있고, 실제 테이블 부재와 일치한다.

- `20260600000000-DropGlucoseviewAndCgmTables` → `glucoseview_{connections,view_profiles,applications,customers,pharmacists,pharmacies,chapters,branches,vendors}`, `cgm_{glucose_insights,patient_summaries,patients}` (12개)
- `20260601000000-DropCareTables` → `care_{messages,appointments,actions,coaching_sessions,coaching_drafts,alerts,llm_insights,kpi_snapshots}`, `patient_ai_insights`, **`health_readings`**, `care_pharmacy_link_requests`, **`patient_health_profiles`**, `ai_model_settings` (13개)

`dropshipping_*` 테이블은 **생성 마이그레이션 자체가 존재하지 않는다** (app lifecycle 설치 경로로만 생성되도록 설계됨 → 미설치 = 미생성).

### 2-3. 앱 레지스트리 / 멤버십

| 항목 | 결과 |
|------|------|
| `app_registry` (6 rows) | `annualfee-yaksa`, `digital-signage`, `digital-signage-core`, `membership-yaksa`, `partnerops`, `reporting-yaksa` — **dropshipping·sellerops·supplierops·cgm 계열 0건** |
| `apps` | 1 row |
| `app_instances` / `app_usage_logs` | **0 rows** |
| `service_memberships` by `service_key` | `platform` 7 / `k-cosmetics` 6 / `pharmacy-hub` 5 / `kpa-society` 5 / `glycopharm` 4 / `neture` 4 — **`glucoseview` 0건** |

> `partnerops` 는 `app_registry` 에 `active` 이나 `partner-core` 의존이며 dropshipping 체인 밖이다. **본 WO 삭제 범위에서 제외**한다.

---

## 3. 현재 정본과의 중복

| Legacy (dropshipping-core, `packages/dropshipping-core/src/entities/*`) | 현재 정본 | 프로덕션 row |
|------|------|:---:|
| `ProductMaster.entity.ts` → `dropshipping_product_masters` | `public.product_masters` | **239,361** |
| `SupplierProductOffer.entity.ts` → `dropshipping_supplier_product_offers` | `public.supplier_product_offers` (Neture Distribution Engine, F8) | 2 |
| 진열/리스팅 | `public.organization_product_listings` | 20 |
| 주문 | `public.checkout_orders` + `checkout_order_logs` (E-commerce Core, `checkoutService.createOrder()` — CLAUDE.md §4) / `neture_orders` | — |
| 정산 | `neture_settlements`, `neture_settlement_orders`, `partner_settlements`, `partner_settlement_items` | — |
| 수수료 | `partner_commissions`, `supplier_partner_commissions` | — |
| 콘텐츠·설명 | `shared_product_descriptions` (F12 계층1 canonical) | **177,626** |
| `dropshipping-cosmetics` `@Entity('cosmetics_brands')` 등 (**schema 무지정**) | `apps/api-server/src/routes/cosmetics/entities/*` — `@Entity({ name: 'cosmetics_products', schema: 'cosmetics' })` | — |

**결론: legacy 측이 담당하던 개념은 전부 현재 정본으로 대체 완료되었으며, 대체되지 않은 필수 기능은 발견되지 않았다.** (중지 조건 3 미해당)

`dropshipping-cosmetics` 는 schema 무지정이라 만약 등록되면 `cosmetics` 스키마의 정본이 아니라 `public` 에 동명 테이블을 만들 위험이 있다 — **유지 시 오히려 위험 요소**다.

---

## 4. 삭제 전 이동해야 할 타입·기능

전수 확인 결과 **필수 이관 대상은 없다.**

| 후보 | 판단 |
|------|------|
| `@o4o/dropshipping-core` 의 `registerExtension`/`unregisterExtension`/`DropshippingCoreExtension` | 실제 import 는 `pharmaceutical-core` 1곳뿐이며 그 체인 전체가 dead → **동시 삭제. 이관 불필요** |
| `dropshipping-core` 의 `ProductMaster`/`SupplierProductOffer` 타입 | 정본 엔티티가 별도 존재 → **이관 불필요** |
| `pharmacy-ai-insight` 의 `src/backend/utils/glucoseUtils.ts` | 패키지가 admin 라우트로 살아 있으므로 **패키지 삭제 시에만 문제**. 본 WO 는 `pharmacy-ai-insight` 를 **RETAIN(보류)** 으로 두고 별도 판단 권고 |
| admin-dashboard 로컬 `pages/{sellerops,supplierops}` | 패키지와 무관한 별개 자산 → **패키지 삭제와 분리** |

---

## 5. 삭제 대상 목록 (판정별)

### 5-1. `DELETE` — 즉시 삭제 가능 (소비처 0 / 데이터 0)

**패키지 (git tracked 파일 수)**

| 패키지 | files | 비고 |
|------|:---:|------|
| `packages/dropshipping-core` | 50 | |
| `packages/dropshipping-cosmetics` | 85 | schema 무지정 위험 포함 |
| `packages/sellerops` | 41 | |
| `packages/supplierops` | 29 | |
| `packages/pharmacyops` | 54 | |
| `packages/pharmaceutical-core` | 31 | dropshipping-core 유일 실사용자, 자체 소비처 0 |
| `apps/api-server/packages/dropshipping-core`, `.../dropshipping-cosmetics` | 스텁 | |

**유령 디렉터리 (tracked 0 — `git rm` 불필요, 로컬/빌드 설정 정리 대상)**

- `packages/health-extension` (`node_modules/` 만 존재, `package.json` 없음)
- `packages/diabetes-core`, `packages/diabetes-pharmacy` (`dist/`·`tsbuildinfo` 잔존)

**백엔드 라우트**

- `apps/api-server/src/routes/dropshipping-admin/**` (14 files)
- `register-routes.ts` 의 import(`:114`) 와 mount(`:868-874`)

**카탈로그·엔티티 주석**

- `app-manifests/appsCatalog.ts` 의 `dropshipping-core`(257) / `dropshipping-cosmetics`(336) / `sellerops`(98,506) / `supplierops`(107,523) 항목
- `database/entities.ts:64-76` 주석 블록, `:547` 항목

**프론트엔드 (admin-dashboard, 56 tracked)**

- `src/pages/dropshipping/**` (25), `src/pages/dropshipping-offers/**` (6)
- `src/components/shortcodes/dropshipping/**` (전량 404 호출)
- `src/api/dropshipping-admin.ts`, `src/api/dropshipping-cpt.ts`
- `src/pages/test/DropshippingUsersTest.tsx`
- `src/routes/commerce.routes.tsx` 의 dropshipping 라우트 4개
- `vite.config.ts:45,105` alias/optimizeDeps

**빌드·CI 설정**

- root `package.json` — `build:diabetes-packages`(:33, 대상 소스 부재), `build:app-store-packages` 의 `dropshipping-core` 항목
- `.github/workflows/ci-pipeline.yml:119` dist 검증 루프의 `dropshipping-core`
  > ⚠ 이 루프는 `build:packages` 와 **반드시 동기 유지** (선행 WO `WO-O4O-WORKSPACE-DEPENDENCY-AND-CI-EXIT-CODE-HARDENING-V1` §6-A 의 CI-only 실패 재발 방지)

**마이그레이션 (23건)** — 이미 실행 완료·테이블 소멸 상태. 이력 정합성상 **파일 삭제는 `typeorm_migrations` row 를 건드리지 않는 전제**에서만 안전하므로, **`RETAIN`(§5-4) 로 분류**한다.

### 5-2. `MIGRATE_THEN_DELETE`

| 대상 | 선행 조치 |
|------|------|
| `packages/cgm-pharmacist-app` | admin `routes/apps.routes.tsx` 의 5개 라우트 + `AppRouteGuard appId` 제거 → `package.json` dep, `vite.config.ts` alias, `build:cgm-pharmacist-app`, CI dist 루프 항목 제거 → 패키지 삭제. **백엔드가 mock 이므로 데이터 이관 없음** |
| `glucoseview` service key | 공유 enum/셀렉터 다수 분포. 멤버십 0건이라 데이터 위험은 없으나, **CHECK 제약·enum 변경은 별도 마이그레이션 WO** 필요 → 코드 제거와 DB enum 정리를 분리 |
| `GlucosecareParticipationNotice.tsx`, `BloodCareBusinessStatusPage.tsx` | 참조 라우트 확인 후 제거 |

### 5-3. `DATA_ARCHIVE_THEN_DELETE`

**0건** — §2 에서 대상 테이블이 전부 부재이므로 아카이브할 운영 데이터가 없다.

### 5-4. `RETAIN`

| 대상 | 사유 |
|------|------|
| `health-functional-food-*` 전체 (18 files) | 활성 건강기능식품 트랙 |
| `routes/health.ts`, `forum-api/health.routes.ts` | 인프라 헬스체크 |
| 마이그레이션 23건 (glucoseview 7 + care/health 16) | 실행 이력 정합성. 파일 삭제 시 `typeorm_migrations` 와의 대조 근거 소실 |
| `packages/partnerops`, `packages/partner-core` | `partner-core` 의존, `app_registry` active — dropshipping 체인 밖 |
| `packages/pharmacy-ai-insight` | admin 라우트 LIVE. 혈당 유틸 포함이나 별도 판단 필요 |
| admin-dashboard 로컬 `pages/{sellerops,supplierops,partnerops}` | 패키지와 별개 자산 |

---

## 6. 삭제 작업 분할안 (권고 순서)

| 단계 | 내용 | 위험 | 검증 |
|:---:|------|:---:|------|
| **R1** | `/api/v1/dropshipping` mount + `routes/dropshipping-admin/**` 제거 | 낮음 (조회 테이블 부재 = 현재도 실패 경로) | api-server typecheck·test, 라우트 목록 diff |
| **R2** | admin-dashboard dropshipping 프론트 56 files + 라우트 + shortcode + alias 제거 | 낮음 (백엔드 404/500 상태) | admin typecheck·vitest·build |
| **R3** | 패키지 6종 삭제 (`dropshipping-core`, `dropshipping-cosmetics`, `sellerops`, `supplierops`, `pharmacyops`, `pharmaceutical-core`) + api-server 스텁 | 중 (pnpm-lock·CI 루프 동기 필요) | `pnpm install`, `build:packages`, CI dist 루프 대조 |
| **R4** | 유령 디렉터리 정리 + root `package.json` 의 `build:diabetes-packages` 제거, `appsCatalog`·`entities.ts` 주석 정리 | 낮음 | `build:packages` EXIT 0 |
| **R5** | `cgm-pharmacist-app` 라우트 해제 → 패키지 삭제 (§5-2) | 중 | admin build, `/apps` 화면 스모크 |
| **R6** | `glucoseview` service key 코드 정리 (**DB enum/CHECK 변경은 별도 WO 로 분리**) | 높음 (공유 enum) | 4서비스 typecheck + 회원가입·CMS 셀렉터 스모크 |

> **R1~R4 는 단일 WO 로 묶어도 무방**하고, **R5·R6 은 각각 독립 WO** 를 권고한다.

---

## 7. 최종 판정

### 7-1. 항목별 판정표

| # | 대상 | 판정 | 근거 (runtime / DB / 소비처) |
|:--:|------|:---:|------|
| 1 | `apps/api-server/src/routes/dropshipping-admin/**` (14) + `register-routes.ts:114,868-874` mount | **DELETE** | mount 는 LIVE 이나 조회 대상 3개 테이블 전부 프로덕션 부재 → 현재도 실패 경로 |
| 2 | `packages/dropshipping-core` (50) | **DELETE** | api-server import 0 · entity 등록 0 · manifest 0 · 테이블 0. 소비처는 §7-2 dead chain 뿐 |
| 3 | `packages/dropshipping-cosmetics` (85) | **DELETE** | 소비처 0. schema 무지정 엔티티 → 등록 시 `cosmetics` 정본 대신 `public` 오염 위험 |
| 4 | `packages/sellerops` (41) | **DELETE** | 소비처 0. admin 동명 페이지는 이 패키지를 import 하지 않음 |
| 5 | `packages/supplierops` (29) | **DELETE** | 동일 |
| 6 | `packages/pharmacyops` (54) | **DELETE** | 소비처 0. dead chain 최상단 |
| 7 | `packages/pharmaceutical-core` (31) | **DELETE** | `dropshipping-core` 를 실제 import 하는 유일 패키지이나, 자체 소비처는 `pharmacyops` 뿐 → 함께 소멸 |
| 8 | `apps/api-server/packages/{dropshipping-core,dropshipping-cosmetics}` 스텁 | **DELETE** | 스텁 |
| 9 | admin-dashboard dropshipping 자산 56 files + 라우트 4 + alias | **DELETE** | 백엔드 경로 부재(shortcode 계열 404) 또는 테이블 부재 |
| 10 | `appsCatalog.ts` dropshipping/sellerops/supplierops 항목 | **DELETE** | `manifestRegistry={}` 로 설치 불가 — 열람만 되는 유령 카탈로그 |
| 11 | `database/entities.ts:64-76`, `:547` 주석 블록 | **DELETE** | 주석 |
| 12 | `packages/health-extension` (tracked 0) | **DELETE** | 소스 부재, `package.json` 조차 없음 |
| 13 | `packages/diabetes-core`, `packages/diabetes-pharmacy` (tracked 0) | **DELETE** | 소스 부재. root `package.json:33` 만 빌드 시도 중 |
| 14 | root `build:diabetes-packages` / `build:app-store-packages` 의 dropshipping 항목 / CI dist 루프 항목 | **DELETE** | 위 삭제와 lockstep |
| 15 | `packages/cgm-pharmacist-app` (38) + `apps/api-server/packages/cgm-pharmacist-app` | **MIGRATE_THEN_DELETE** | admin 라우트 5개가 실제 lazy import 중 → 라우트 해제 선행. 백엔드는 mock 이라 데이터 이관 없음 |
| 16 | `glucoseview` service key (공유 enum·셀렉터 다수) | **MIGRATE_THEN_DELETE** | `service_memberships` 0 row 이나 enum·CHECK 제약이 4서비스 공유 → 코드 제거와 DB enum 정리 분리 필수 |
| 17 | `GlucosecareParticipationNotice.tsx`, `BloodCareBusinessStatusPage.tsx` | **MIGRATE_THEN_DELETE** | 참조 라우트 확인 후 제거 |
| 18 | glucoseview·care·health 마이그레이션 23건 | **RETAIN** | 이미 실행 완료. `typeorm_migrations` 이력과의 대조 근거 |
| 19 | `health-functional-food-*` 18 files | **RETAIN** | 활성 HFF 생산 트랙. 이름만 `health` |
| 20 | `routes/health.ts`, `forum-api/health.routes.ts` | **RETAIN** | 인프라 헬스체크 |
| 21 | `packages/partnerops`, `packages/partner-core` | **RETAIN** | `partner-core` 의존. `app_registry` active. dropshipping 체인 밖 |
| 22 | `packages/pharmacy-ai-insight` (23) | **RETAIN (조건부)** | admin `/pharmacy-ai-insight` LIVE. 혈당 유틸(`glucoseUtils.ts`) 보유 → 별도 판단 |
| 23 | admin 로컬 `pages/{sellerops,supplierops,partnerops}` | **RETAIN** | 동명이나 패키지와 무관한 별개 자산 |
| — | **`DATA_ARCHIVE_THEN_DELETE`** | **0건** | 대상 테이블 0개 / row 0 |

### 7-2. 판정 요지

- **dead chain 전체가 하나의 덩어리**다: `pharmacyops → pharmaceutical-core → dropshipping-core`, `sellerops/supplierops/dropshipping-cosmetics → dropshipping-core`. 진입점(`pharmacyops`, `sellerops`, `supplierops`)의 소비처가 0 이므로 **부분 삭제가 아니라 체인 통삭제**가 맞다.
- `pharmaceutical-core` 가 `dropshipping-core` 를 실제 import 한다는 사실은 **유지 근거가 되지 않는다** (WO 원칙: 단순 타입/참조 때문에 전체 패키지를 유지하지 않는다).
- **삭제하지 않는 쪽이 더 위험한 항목이 2개** 있다: ① `/api/v1/dropshipping` (존재하지 않는 테이블을 raw query 하는 LIVE 라우터), ② `dropshipping-cosmetics` (schema 무지정 엔티티).

---

## 8. 후속 제거 WO 초안

### 8-1. `WO-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1` (R1~R4 통합)

> **목표** — 소비처 0 인 dropshipping 계열 코드·패키지·카탈로그·빌드 설정을 제거한다. DB 변경 없음.
>
> **전제** — 본 CHECK §2 (대상 테이블 0 / row 0), §3 (정본 대체 완료), §7-1 항목 1~14.
>
> **범위**
> 1. `register-routes.ts` 의 dropshipping import(`:114`) · mount(`:868-874`) 제거 → `apps/api-server/src/routes/dropshipping-admin/**` 14 files 삭제
> 2. admin-dashboard 56 files 삭제 + `routes/commerce.routes.tsx` dropshipping 라우트 4개 + `ViewComponentRegistry.ts:256,266,276` + `vite.config.ts:45,105`
> 3. 패키지 6종 + api-server 스텁 2종 삭제 (`dropshipping-core`, `dropshipping-cosmetics`, `sellerops`, `supplierops`, `pharmacyops`, `pharmaceutical-core`)
> 4. `appsCatalog.ts` 5 항목 · `database/entities.ts:64-76,:547` 주석 정리
> 5. 유령 디렉터리 3개 정리 + root `package.json` `build:diabetes-packages`(:33) 제거 + `build:app-store-packages` 의 `dropshipping-core` 제거 + `.github/workflows/ci-pipeline.yml:119` dist 루프 동기화
>
> **원칙** — DB write 0 / 마이그레이션 파일 미삭제 / `partnerops`·`pharmacy-ai-insight` 계열 미접촉 / admin 로컬 `pages/{sellerops,supplierops}` 미접촉
>
> **중지 조건** — 삭제 중 예상 밖 소비처 발견 / `pnpm install` lockfile 충돌이 병렬 세션 작업물과 겹침
>
> **검증** — `pnpm install` → `build:packages` EXIT 0 → api-server typecheck·test → admin-dashboard typecheck·vitest·build → CI dist 루프 대조 → 배포 후 `/api/v1/dropshipping/admin/*` 404 확인
>
> **CHECK** — `docs/checks/CHECK-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1.md`

### 8-2. `WO-O4O-CGM-PHARMACIST-APP-RETIREMENT-V1` (R5)

> **목표** — 혈당측정 legacy `cgm-pharmacist-app` 을 admin 라우트 해제 후 삭제한다.
>
> **범위** — `routes/apps.routes.tsx:34-56,191-227` 의 lazy import 4 + `AppRouteGuard appId="cgm-pharmacist-app"` 5 제거 → `apps/admin-dashboard/package.json:49` dep · `vite.config.ts:49,107` · root `build:cgm-pharmacist-app`(:36) · `build:packages` 말단 · CI dist 루프 항목 제거 → `packages/cgm-pharmacist-app` 38 files + api-server 스텁 삭제
>
> **주의** — `cgm-pharmacist-app/src/manifest.ts:24` 가 `pharmacy-ai-insight` 를 optional 의존한다. **역방향 아님** — `pharmacy-ai-insight` 는 영향 없음
>
> **데이터** — 백엔드가 `src/backend/mock/mockPatients.ts` 기반이고 `cgm_*` 테이블은 이미 DROP 됨 → **이관·아카이브 0**
>
> **검증** — admin typecheck·build, `/apps` 화면 스모크(잔여 앱 카드 정상)
>
> **CHECK** — `docs/checks/CHECK-O4O-CGM-PHARMACIST-APP-RETIREMENT-V1.md`

### 8-3. `WO-O4O-GLUCOSEVIEW-SERVICE-KEY-RETIREMENT-V1` (R6)

> **목표** — `glucoseview` service key 를 코드에서 제거한다. **DB enum·CHECK 제약 변경은 본 WO 에 포함하지 않는다** (별도 마이그레이션 WO).
>
> **위험** — 최고. `service-catalog.ts` 5키 중 하나이며 `service-scopes.ts`, `rbac-catalog.ts`, `ServiceMembership`, `register.dto.ts`, `approval-service-keys.ts`, CMS 채널/슬롯/콘텐츠 셀렉터, `PartnerApplication/Content/Event/Target`, `OperatorNotificationSettings`, `store-policy.routes.ts` 등에 분포. **CLAUDE.md Shared Module Change Rule 적용 대상** — 4서비스(KPA / K-Cosmetics / Neture / Pharmacy-Hub) 전 소비처 선식별 필수
>
> **안전 근거** — `service_memberships` 에 `glucoseview` **0 row**
>
> **검증** — 4서비스 typecheck + 회원가입 · CMS 채널/슬롯 셀렉터 · 파트너 대상 선택 스모크
>
> **CHECK** — `docs/checks/CHECK-O4O-GLUCOSEVIEW-SERVICE-KEY-RETIREMENT-V1.md`

### 8-4. 권고

`8-1` → `8-2` → `8-3` 순서. `8-1` 과 `8-2` 는 서로 독립이라 순서를 바꿔도 무방하나, `8-3` 은 반드시 마지막에 둔다(공유 enum 영향이 가장 넓다).

---

## 9. 중지 조건 대조

| 조건 | 결과 |
|------|------|
| 현재 운영 주문·정산이 해당 엔티티나 서비스에 실제 의존 | **미해당** — 주문=`checkout_orders`(+`neture_orders`), 정산=`neture_settlements`/`partner_settlements` 로 완전 분리. dropshipping 엔티티 등록 0 |
| 삭제 대상 DB 에 보존이 필요한 운영 데이터 존재 | **미해당** — 대상 테이블 0개, row 0 |
| 현재 정본으로 대체되지 않은 필수 기능 발견 | **미해당** — §3 대조 완료 |
| 모집단이 예상보다 크게 확장되어 독립 감사로 분리해야 하는 경우 | **부분 해당 → 분리 처리** — `glucoseview` **service key** 만 공유 enum 전반으로 확장된다. 이를 §8-3 독립 WO 로 분리했고, 나머지 모집단(패키지 6 + 라우트 14 + 프론트 56)은 예상 범위 내 |

---

## 10. 완료 조건 대조

| WO 기준 | 결과 |
|---------|------|
| READ-ONLY / 코드 변경 0 | ✅ (본 CHECK 문서 1건 신규 외 없음) |
| DB write 0 | ✅ (SELECT / `information_schema` 조회만) |
| 병렬 세션 WIP 미접촉 | ✅ (`AuditLogManagement.tsx` · `yaksa.routes.tsx` · `admin-operation-boundary.test.ts` 미접촉, 커밋은 pathspec 지정) |
| 삭제 가능 범위 확정 | ✅ §5 · §7 |
| 유지 항목 최소화 + 근거 | ✅ §7-1 (RETAIN 6항목, 각 근거 명시) |
| 즉시 사용 가능한 파일 목록·순서 | ✅ §5 · §6 |
| 후속 제거 WO 초안 | ✅ §8 (3건) |
| CHECK 문서 작성 | ✅ 본 문서 |
| commit · push | ✅ §11 |

---

## 11. 이력

| 커밋 | 내용 |
|------|------|
| `a1ef18265` | 초판 (보고 1~6 + 중지/완료 조건) |
| 본 커밋 | WO 재발행 반영 — §7 최종 판정 · §8 후속 제거 WO 초안 3건 · §9 중지 조건 4항 · §10 완료 조건 확장 |

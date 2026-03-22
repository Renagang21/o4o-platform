# IR-O4O-OVERSIZED-FILE-AUDIT-PHASE2-V1

> **O4O 구조정비 2단계 — 500+ Line Oversized File Audit**

| 항목 | 값 |
|------|------|
| 작성일 | 2026-03-21 |
| 범위 | api-server, admin-dashboard, main-site, page-generator, packages (15+) |
| 기준 | 500+ lines + 구조적 위험 평가 |
| 선행 | WO-O4O-NETURE-SERVICE-SPLIT-V1 (완료) |
| 산출물 | 후보 목록 + P0/P1/P2/SKIP/DONE 분류 |

---

## 1. Executive Summary

전체 O4O 플랫폼 스캔 결과, **500+ line 파일 150+ 개** 발견.
구조적 위험이 있는 파일을 중심으로 **P0 15개 / P1 35개 / P2 7개 / SKIP 16개 / DONE 1개** 분류.

| 분류 | 파일 수 | 총 Lines | 핵심 패턴 |
|------|---------|----------|----------|
| **P0** | 15 | ~15,600 | God-service, mega-route, multi-domain controller |
| **P1** | 35 | ~26,700 | Inline business logic, single-class overload |
| **P2** | 7 | ~4,700 | Justified complexity, low risk |
| **SKIP** | 16 | ~12,100 | Type-only, config, migration, mock, test |
| **DONE** | 1 | 304 | neture.service.ts (modules/) — split 완료 |

---

## 2. DONE — Already Resolved

| File | Lines | Status | Work Order |
|------|-------|--------|------------|
| `modules/neture/neture.service.ts` | 304 (was 3,021) | **DONE** | WO-O4O-NETURE-SERVICE-SPLIT-V1 |

6개 sub-service 추출 완료: catalog, partnership, partner-contract, dashboard, offer, supplier.

---

## 3. P0 — Split Urgently (15 files, ~15,600 lines)

### 3.1 api-server

| # | File | Lines | Type | Risk Pattern |
|---|------|-------|------|-------------|
| 1 | `services/authentication.service.ts` | 1277 | Service | **God-service**: 36+ methods. Login, OAuth, token, session, password reset, account linking, social login, email verification, audit log, role derivation 혼합. Split → LoginService, TokenService, PasswordResetService, AccountLinkingService |
| 2 | `routes/platform/unified-store-public.routes.ts` | 1090 | Routes | **Mega-route**: 16 endpoints + 59 conditionals. Store resolution, B2C visibility gating, featured products, tablet requests 전부 inline. Split → StorePublicService, VisibilityGateService |
| 3 | `routes/cms-content/cms-content.routes.ts` | 1065 | Routes | **Mega-route**: 13+ endpoints + 18 parallel stats queries + status transitions + slot management. Business logic inline. Split → CmsContentService, CmsStatsService |
| 4 | `modules/neture/controllers/partner.controller.ts` | 1055 | Controller | **Multi-domain**: 31+ endpoints (recruiting, applications, dashboard, content, contracts, commissions, pool, settlements). 6+ business domain 혼합. Split → RecruitmentController, ApplicationController, DashboardController, CommissionController |
| 5 | `services/AppManager.ts` | 951 | Service | **God-service**: app lifecycle (install/activate/deactivate), dependency resolution, data migration, table ownership validation, extension merging. 5+ helper 서비스 필요 |
| 6 | `controllers/cpt/DropshippingCPTController.ts` | 867 | Controller | **God-class**: CPT read + ACF field + product/supplier/partner CRUD + image upload + initialization. 4+ entity types 혼합 |
| 7 | `modules/neture/controllers/admin.controller.ts` | 866 | Controller | **Multi-domain**: suppliers + products + brands + categories + dashboard + image uploads + OCR trigger. 10+ distinct endpoints |
| 8 | `routes/neture/services/neture.service.ts` | 792 | Service | **Legacy duplicate**: routes/ 하위 별도 존재하는 Neture service. modules/ 쪽 split 완료했으나 이 파일은 별개. 정리 또는 facade 전환 필요 |

### 3.2 admin-dashboard

| # | File | Lines | Type | Risk Pattern |
|---|------|-------|------|-------------|
| 9 | `pages/digital-signage/v2/ContentBlockLibrary.tsx` | 1237 | Page | **Mega-page**: block list + filter + create/edit dialog + preview modal + delete confirm. 6+ useState |
| 10 | `pages/vendors/VendorsCommissionAdmin.tsx` | 1161 | Page | **Mega-page**: table + 5 filter types + bulk actions + screen options + column visibility + edit forms. 13+ useState |
| 11 | `pages/vendors/VendorsAdmin.tsx` | 1077 | Page | **Mega-page**: vendor table + status tabs + search + sort + quick-edit inline + hover + column toggle + pagination |
| 12 | `pages/digital-signage/v2/TemplateBuilder.tsx` | 1038 | Page | **Mega-page**: template editor + zone management + layout preset selection + duplicate/preview. Multiple modals |

### 3.3 packages

| # | File | Lines | Type | Risk Pattern |
|---|------|-------|------|-------------|
| 13 | `mail-core/src/mail.service.ts` | 1226 | Service | **God-service**: SMTP config + template rendering + email logging + error handling. Infrastructure + delivery + persistence + template 혼합 |
| 14 | `membership-yaksa/src/backend/services/MemberService.ts` | 936 | Service | **God-service**: member CRUD + verification + fee status computation + role assignment + affiliation tracking. 5+ domain 혼합 |
| 15 | `forum-core/src/backend/services/forum.service.ts` | 681 | Service | **God-service**: category + post + comment + tag + search + statistics + permission. 5+ entity 관리 단일 서비스 |

### 3.4 main-site

(main-site P0 없음 — 아래 P1 참조)

---

## 4. P1 — Split Next Cycle (35 files, ~26,700 lines)

### 4.1 api-server (22 files)

| # | File | Lines | Type | Notes |
|---|------|-------|------|-------|
| 1 | `routes/signage/services/signage.service.ts` | 1337 | Service | 36+ methods, 6 entity types (Playlist, Media, Schedule, Template, Layout, Block). Entity별 split |
| 2 | `routes/signage/controllers/signage.controller.ts` | 1231 | Controller | Endpoint handlers for all signage entities. Scope extraction duplicated |
| 3 | `modules/auth/controllers/auth.controller.ts` | 1047 | Controller | 10 static methods. Role assignment + scope derivation + pharmacist qualification 혼합 |
| 4 | `routes/signage/repositories/signage.repository.ts` | 1040 | Repository | 9 entities, 40+ methods. Entity별 repository split |
| 5 | `common/middleware/auth.middleware.ts` | 1019 | Middleware | 7+ middleware functions + token extraction + DB lookup + role caching. TokenExtractor, RoleValidator 분리 |
| 6 | `routes/dashboard/dashboard-assets.routes.ts` | 1010 | Routes | 6+ endpoints + inline business logic (status derivation, exposure computation) |
| 7 | `services/IncidentEscalationService.ts` | 976 | Service | 20+ methods. Rule evaluation + state transitions + notifications 혼합 |
| 8 | `services/GracefulDegradationService.ts` | 967 | Service | 50+ methods. 8 degradation action types + revert logic. In-memory state |
| 9 | `services/block-registry.service.ts` | 937 | Service | Block registry SSOT + category mgmt + search + AI formatting |
| 10 | `services/tenant-consolidation.service.ts` | 921 | Service | Merge/split engine + job queue. Clear boundaries but large |
| 11 | `routes/kpa/controllers/branch-admin-dashboard.controller.ts` | 905 | Controller | 7+ route handlers. Inline business logic |
| 12 | `services/forum/ForumRecommendationService.ts` | 891 | Service | Recommendation engine. Clean but approaching limit |
| 13 | `routes/glycopharm/controllers/store-applications.controller.ts` | 876 | Controller | App state mgmt + validation + email + auto-listing 혼합 |
| 14 | `services/template-switch.service.ts` | 875 | Service | Template migration engine. Well-organized but large |
| 15 | `routes/cosmetics/controllers/cosmetics-store.controller.ts` | 861 | Controller | Store CRUD + member + playlist + insights. Mostly delegation |
| 16 | `services/PerformanceOptimizationService.ts` | 854 | Service | Monitoring + caching + query optimization + auto-tuning |
| 17 | `routes/glycopharm/controllers/cockpit.controller.ts` | 852 | Controller | 6+ dashboard data builders inline |
| 18 | `services/ai-proxy.service.ts` | 821 | Service | LLM proxy. Well-structured but large |
| 19 | `routes/cosmetics/controllers/cosmetics-order.controller.ts` | 818 | Controller | Order CRUD + metadata parsing + channel filtering |
| 20 | `controllers/operator/MembershipConsoleController.ts` | 817 | Controller | Inline SQL + boundary checks |
| 21 | `routes/glycopharm/controllers/checkout.controller.ts` | 812 | Controller | Checkout validation + sales limit + cleanup 혼합 |
| 22 | `routes/kpa/kpa.routes.ts` | 808 | Routes | 30+ sub-router mount. Service composition layer |

### 4.2 admin-dashboard (8 files)

| # | File | Lines | Type | Notes |
|---|------|-------|------|-------|
| 1 | `components/editor/blocks/ShortcodeBlock.tsx` | 1129 | Component | Monaco editor + preview + metadata + form handling |
| 2 | `pages/cosmetics-partner/CosmeticsPartnerRoutines.tsx` | 1070 | Page | List + form + drag/drop steps builder + preview |
| 3 | `components/editor/blocks/shared/FileSelector.tsx` | 1050 | Component | File browser + upload + filter + pagination |
| 4 | `pages/lms-yaksa/assignments/index.tsx` | 954 | Page | Dashboard + alerts + stats + table + modals |
| 5 | `pages/editor/StandaloneEditor.tsx` | 934 | Page | Block editor + responsive + viewport + theme |
| 6 | `pages/pages/PageList.tsx` | 924 | Page | Status tabs + search + sort + quick-edit |
| 7 | `components/shortcodes/dropshipping/shared/LinkGenerator.tsx` | 906 | Component | Link table + editor + QR + analytics |
| 8 | `pages/services/ServiceOverview.tsx` | 881 | Page | Dashboard layout. Limited interaction |

### 4.3 packages (8 files)

| # | File | Lines | Type | Notes |
|---|------|-------|------|-------|
| 1 | `hub-exploration-core/src/components/B2BTableList.tsx` | 902 | Component | Sorting + pagination + filtering + mobile/desktop rendering 혼합 |
| 2 | `groupbuy-yaksa/src/backend/routes/groupbuy.routes.ts` | 862 | Routes | Campaign + product + order routes 혼합 |
| 3 | `annualfee-yaksa/src/backend/services/CsvPaymentImporter.ts` | 859 | Service | CSV parsing + 6 bank formats + matching + confidence scoring |
| 4 | `annualfee-yaksa/src/backend/services/SettlementAutomation.ts` | 853 | Service | Policy + distribution + cascade + invoice + org hierarchy |
| 5 | `groupbuy-yaksa/src/backend/services/GroupbuyOrderService.ts` | 754 | Service | Order lifecycle + campaign validation + stock management |
| 6 | `membership-yaksa/src/backend/services/StatsService.ts` | 720 | Service | 4+ aggregation domains: member, fee, activity, hierarchy |
| 7 | `reporting-yaksa/src/frontend/admin/pages/YaksaReportDetailPage.tsx` | 687 | Component | Form + RPA + payload editing + status + history |
| 8 | `forum-cosmetics/src/backend/services/CosmeticsForumService.ts` | 634 | Service | Cosmetics-specific forum logic |

### 4.4 main-site (7 files)

| # | File | Lines | Type | Notes |
|---|------|-------|------|-------|
| 1 | `lib/cms/client.ts` | 1319 | Lib | Massive API surface. Type-heavy but needs audit |
| 2 | `pages/member/MemberHome.tsx` | 1242 | Page | Multi-domain (membership/reporting/annualfee/lms, 4 tabs). God-page |
| 3 | `pages/mypage/MemberProfilePage.tsx` | 684 | Page | Basic info + affiliations + audit + fees 혼합 |
| 4 | `lib/yaksa/forum-data.ts` | 656 | Lib | Data fetching utilities. Type-heavy |
| 5 | `lib/cms/loader.ts` | 635 | Lib | Fetch + cache + adapter 혼합 |
| 6 | `pages/forum/ForumDetailPage.tsx` | 625 | Page | Post + comments + navigation 혼합 |
| 7 | `components/blocks/forum/CosmeticsPostList.tsx` | 600 | Component | Filtering config + business logic + presentation 혼합 |

---

## 5. P2 — Low Risk, Defer (7 files, ~4,700 lines)

| # | File | Lines | Location | Notes |
|---|------|-------|----------|-------|
| 1 | `main.ts` | 1621 | api-server | App initialization. Monolithic startup but functional |
| 2 | `channels.routes.ts` | 796 | api-server | 12 endpoints. Mostly delegation. Clean structure |
| 3 | `cross-service-migration.service.ts` | 799 | api-server | ETL engine. Good structure, type-heavy |
| 4 | `MenuItemTree.tsx` | 920 | admin-dashboard | Drag-drop tree. Justified complexity |
| 5 | `WidgetBuilder.tsx` | 909 | admin-dashboard | Widget form builder. Well-scoped |
| 6 | `tailwind-mapper.ts` | 764 | page-generator | Pure declarative config mapping |
| 7 | `block-mapper.ts` | 515 | page-generator | Core conversion logic. Tight but justified |

---

## 6. SKIP — No Action Needed (16 files, ~12,100 lines)

| # | File | Lines | Location | Reason |
|---|------|-------|----------|--------|
| 1 | `database/connection.ts` | 1074 | api-server | TypeORM entity registry. Config file |
| 2 | `app-manifests/appsCatalog.ts` | 1034 | api-server | App catalog registry. Data file |
| 3 | `swagger/schemas/index.ts` | 806 | api-server | OpenAPI schema definitions |
| 4 | `routes/signage/dto/index.ts` | 741 | api-server | DTO definitions. Type-only |
| 5 | `service-groups/index.ts` | 767 | api-server | Service group registry. Config |
| 6 | `services/acf/dropshipping-fields.ts` | 858 | api-server | ACF field config + templates |
| 7 | `types/roles.ts` | 539 | api-server | Role type definitions |
| 8 | `entities/Alert.ts` | 539 | api-server | Entity definitions |
| 9 | `entities/OperationsDashboard.ts` | 538 | api-server | Entity definitions |
| 10 | `database/migrations/*` | ~1,800 | api-server | Migration files (multiple) |
| 11 | `types/dashboard-api.ts` | 1715 | admin-dashboard | Pure type definitions |
| 12 | `lib/api/signageV2.ts` | 977 | admin-dashboard | API client. Type-only |
| 13 | `api-types/src/cosmetics.ts` | 963 | packages | Auto-generated OpenAPI types |
| 14 | `types/src/ecommerce.ts` | 800 | packages | Type definitions |
| 15 | `block-renderer/src/metadata.ts` | 733 | packages | Block metadata registry. Config |
| 16 | `cgm-pharmacist-app/src/backend/mock/mockPatients.ts` | 708 | packages | Mock data for testing |

---

## 7. Risk Heat Map by Domain

| Domain | P0 | P1 | Total Risk Lines | Hotspot |
|--------|----|----|-----------------|---------|
| **Signage** | 0 | 3 | 3,608 | service + controller + repository triple |
| **Neture** | 3 | 0 | 2,713 | partner.controller + admin.controller + legacy service |
| **Auth** | 1 | 2 | 3,343 | authentication.service + auth.controller + auth.middleware |
| **Glycopharm** | 0 | 4 | 3,416 | store-apps + cockpit + checkout + glycopharm controllers |
| **Cosmetics** | 0 | 2 | 1,679 | store + order controllers |
| **KPA** | 0 | 2 | 1,713 | branch-admin-dashboard + kpa.routes |
| **CMS/Content** | 1 | 1 | 2,075 | cms-content.routes + dashboard-assets.routes |
| **Admin Dashboard** | 4 | 8 | ~10,200 | vendor pages + signage pages + editor components |
| **Packages** | 3 | 8 | ~8,000 | mail-core + membership + forum-core + annualfee + groupbuy |
| **Main Site** | 0 | 7 | ~5,761 | MemberHome + CMS client + forum pages |

---

## 8. Recommended Execution Order

### Phase 1 — Immediate (P0 Critical Path)

| Priority | File | Estimated Sub-services | Pattern |
|----------|------|----------------------|---------|
| 1 | `authentication.service.ts` | 4 | God-service → sub-service split (neture 패턴 재활용) |
| 2 | `partner.controller.ts` (neture) | 4-5 | Multi-domain controller → domain controllers |
| 3 | `admin.controller.ts` (neture) | 3 | Multi-domain controller → domain controllers |
| 4 | `unified-store-public.routes.ts` | 2-3 | Mega-route → service extraction |
| 5 | `cms-content.routes.ts` | 2-3 | Mega-route → service extraction |
| 6 | `AppManager.ts` | 3 | God-service → lifecycle/migration/resolver |
| 7 | `DropshippingCPTController.ts` | 3-4 | God-class → entity controllers |
| 8 | `routes/neture/services/neture.service.ts` | 0 | Legacy cleanup or facade redirect |

### Phase 2 — Admin Dashboard P0

| Priority | File | Split Pattern |
|----------|------|--------------|
| 9 | `ContentBlockLibrary.tsx` | Page → ListContainer + EditorModal + PreviewModal |
| 10 | `VendorsCommissionAdmin.tsx` | Page → Table + FilterPanel + BulkActions + EditModal |
| 11 | `VendorsAdmin.tsx` | Page → Table + QuickEditModal + ColumnSelector |
| 12 | `TemplateBuilder.tsx` | Page → ZoneEditor + LayoutPresetSelector + TemplateForm |

### Phase 3 — Packages P0

| Priority | File | Split Pattern |
|----------|------|--------------|
| 13 | `mail.service.ts` | Service → MailTransporter + TemplateRenderer + EmailLogger |
| 14 | `MemberService.ts` | Service → MemberCrud + Verification + FeeService |
| 15 | `forum.service.ts` | Service → Category + Post + Comment + Search + Permission |

---

## 9. Anti-Patterns Identified

### 9.1 God-Service (6 instances)
`authentication.service.ts`, `AppManager.ts`, `mail.service.ts`, `MemberService.ts`, `forum.service.ts`, `signage.service.ts`

**Solution**: Neture split 패턴 재활용 — sub-service 추출 + thin facade

### 9.2 Mega-Route with Inline Logic (3 instances)
`unified-store-public.routes.ts`, `cms-content.routes.ts`, `dashboard-assets.routes.ts`

**Solution**: Business logic → dedicated service class 추출. Route 파일은 delegation만.

### 9.3 Multi-Domain Controller (4 instances)
`partner.controller.ts`, `admin.controller.ts`, `DropshippingCPTController.ts`, `MembershipConsoleController.ts`

**Solution**: Domain별 controller split. 공통 middleware는 shared 레이어로.

### 9.4 Mega-Page (7 instances, admin-dashboard)
`ContentBlockLibrary.tsx`, `VendorsCommissionAdmin.tsx`, `VendorsAdmin.tsx`, `TemplateBuilder.tsx`, etc.

**Solution**: Container + Presenter 패턴. Table/Filter/Modal/Form 별도 컴포넌트로 추출.

---

## 10. Metrics

| Metric | Value |
|--------|-------|
| Total files scanned | ~1,200+ TypeScript/TSX |
| Files 500+ lines | ~150 |
| Files with structural risk (P0+P1) | 50 |
| Total P0+P1 lines | ~42,300 |
| Already resolved (DONE) | 1 (neture.service.ts) |
| SKIP (safe to ignore) | 16 |

---

*Report generated: 2026-03-21*
*Classification: Internal Investigation*
*Next action: WO 작성 시 Phase 1 파일들부터 개별 Work Order 생성*

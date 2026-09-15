# IR-O4O-ROLE-WORKSPACE-REFACTOR-PREFLIGHT-V1

> **상태**: COMPLETED (조사 기록 — 다음 단계의 모집단으로 재사용하지 않는다, §0)
> **작성일**: 2026-09-15
> **근거 WO**: `WO-O4O-ROLE-WORKSPACE-REFACTOR-BASELINE-AND-PREFLIGHT-V1`
> **산출 정본**: [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)
> **기준 commit**: `ccf55329458fbeccd1ca2123b989d732b6e80d4f` (HEAD == origin/main, 작업트리 clean · 타 세션 미추적 1건 불가침)

---

## 0. 요약

```text
BASELINE              = CREATED   (docs/baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)
SERVICE_STORE_MODEL   = REUSE_AS_IS
PARTNER_RETIRE_SCOPE  = COMPLETE  (모집단 역방향 소비처 포함 · 프로덕션 데이터 0행 실측)
DOCUMENT_SUPERSESSION = READY
RUNTIME_CODE_CHANGE   = 0
DB_CHANGE             = 0
NEXT                  = GO_PARTNER_RETIREMENT
```

**반복 조사 원칙** — 이 IR 의 파일 목록은 2026-09-15 `ccf553294` 시점의 기록이다. `Partner Retirement` 착수 시 최신 `origin/main` 에서 모집단을 **다시** 산출하며, 이 문서를 그 모집단으로 쓰지 않는다 (Architecture §9).

**조사 방법** — 문서 목록이 아니라 코드에서 직접 산출: `git grep -il partner -- apps packages services scripts .github` (dist · map 제외) 498 파일 → 이름 충돌(HFF "partner 성분" · 의약품 영문 원문 · foreign-visitor 유입 파트너) 및 migration · docs 를 분리한 뒤 353 파일을 runtime 모집단으로 분류 (부록 A). 프로덕션 DB 는 Cloud SQL Auth Proxy 경유 **read-only SELECT** 만 수행 (§B-6).

---

## A. Service ↔ Store 관계 판정

### A-1. 판정

```text
SERVICE_STORE_MODEL = REUSE_AS_IS
```

신규 ServiceMembership / Store-Service 테이블을 만들지 않는다. 스키마 변경 없음. 아래 세 관계가 모두 현행 스키마·가드로 표현된다.

| 관계 | 판정 | 근거 (코드/테이블/가드) |
|---|---|---|
| **1 Store : N Services** | 지원 (스키마) | `organizations` 에 service 컬럼 없음(서비스 중립) — `apps/api-server/src/modules/store-core/entities/organization-store.entity.ts`. 연결은 `organization_service_enrollments` `UNIQUE(organization_id, service_code)` + FK → `platform_services.code` — `routes/kpa/entities/organization-service-enrollment.entity.ts` ("하나의 조직이 여러 서비스에 가입할 수 있음 (1:N)"). 해석기 `utils/store-organization.resolver.ts` `isOrganizationLinkedToService()` 주석: "한 organization 이 복수 서비스에 정상 귀속될 수 있으므로(합법 구조)". 보조 근거 `platform_store_slugs(service_key)` 와 합집합으로 판정 (`STORE_SERVICE_ORG_LINKAGE`). |
| **1 Service : N Stores** | 지원 | 동일 테이블의 `service_code` 축. `controllers/operator/StoreConsoleController.ts` 가 `service_code = ANY($1)` 로 서비스별 매장 목록을 뽑는다. 프로덕션 active enrollment 20건 = k-cosmetics 2 · kpa-society 7 · neture 3 · pharmacy-hub 8. |
| **1 Operator : 1 or N Services** | 지원 | 사용자 ↔ 서비스 = `service_memberships` `UNIQUE(user_id, service_key)` (`modules/auth/entities/ServiceMembership.ts`, F10/F11 Core). 운영자 역할 = `role_assignments` 서비스 접두 role(`kpa:operator` · `neture:operator` · `cosmetics:operator`) — partial unique `(user_id, role) WHERE is_active` 라 한 사용자가 복수 서비스 operator role 보유 가능. 가드 `@o4o/security-core` `createServiceScopeGuard` 는 요청 서비스 role 보유 시 통과하고 `blockedServicePrefixes` 는 **미보유일 때만** 거부 → 두 서비스 operator 를 동시에 가진 사용자는 양쪽 모두 통과. `common/middleware/membership-guard.middleware.ts` 가 membership(active) 을 서비스별로 확정. 프로덕션: 복수 active membership 사용자 4명 · 복수 서비스 operator role 사용자 1명. |

### A-2. 조사한 축 (전수)

| 축 | 위치 | 판정 관련 사실 |
|---|---|---|
| `platform_services` | `entities/PlatformService.ts` · 프로덕션 9 row(cafe24-b2b · cosmetics · k-cosmetics · kpa · kpa-branch · kpa-groupbuy · kpa-society · neture · pharmacy-hub, 모두 active) | 서비스 카탈로그 DB. `code` 가 enrollment FK 대상. `kpa`/`cosmetics` 는 legacy alias row 가 공존 (canonical 은 `kpa-society`/`k-cosmetics` — `resolveCanonicalServiceKey()`). |
| service catalog (code) | `config/service-catalog.ts` `O4O_SERVICES` 6종 + `REPRESENTATIVE_ENTRY_SERVICE_KEY='neture'` | Neture 는 O4O 대표 진입. 다른 서비스 회원이 Neture membership 없이 대표 홈 로그인 가능 — Architecture §1 의 "O4O / Neture" 루트와 정합. |
| `service_memberships` | `modules/auth/entities/ServiceMembership.ts` (Core Freeze) | user ↔ service 1:N. `role` 컬럼에 가입 시 역할('supplier' · 'partner' …) — Partner 은퇴 시 값 'partner' 잔존 row 는 프로덕션 0건 (§B-6). |
| `role_assignments` | `modules/auth/entities/RoleAssignment.ts` (F9 RBAC SSOT) | 서비스 접두 role. `scope_type/scope_id` 컬럼은 organization scope 표현 가능(현재 대부분 global). |
| `organizations` | `modules/store-core/entities/organization-store.entity.ts` · `packages/organization-core` | 서비스 중립. `type` 컬럼으로 pharmacy/store 등 구분. |
| `organization_members` | `packages/organization-core/src/entities/OrganizationMember.ts` | user ↔ organization. 매장 접근 role 집합 `STORE_MEMBER_ROLES = owner/admin/manager` (SSOT `store-organization.resolver.ts`). |
| `organization_service_enrollments` | `routes/kpa/entities/organization-service-enrollment.entity.ts` · 소비처 backend 30+ 파일(부록 B 참조 없음 — Census A 는 코드 grep 결과로 확인) | 1 Org : N Service junction. KPA 는 과거 enrollment 를 기록하지 않았으나 `routes/kpa/services/kpa-store-organization.provisioning.ts` step 5 가 현재 기록한다(멱등). |
| store organization resolver | `utils/store-organization.resolver.ts` · `controllers/pharmacy-hub/store-organization.resolver.ts` | serviceKey 지정 시 "그 서비스에 등록된 조직" 만 후보. 0=none · 1=resolved · 2+=ambiguous(임의 선택 금지). 서비스 미지정 back-compat 경로는 결정적 정렬. |
| service scope guards | `packages/security-core/src/service-configs.ts` (KPA · NETURE · PLATFORM · COSMETICS) · `middleware/*-scope.middleware.ts` (kpa-branch · pharmacy-hub 포함) · `common/middleware/membership-guard.middleware.ts` | 위 A-1 Operator 행. `NETURE_SCOPE_CONFIG.allowedRoles` 에 `neture:partner` 포함 → §B. |
| home-entry | `routes/neture/controllers/neture-home-entry.controller.ts` `GET /api/v1/neture/home/entry` | 대표 홈이 **복수 매장을 자동 선택 없이 나열** (`STORE_CAPABLE_SERVICES` 3종 × 후보 해석기). 이미 "한 사용자 · 여러 서비스 · 여러 매장" 을 전제. 공급자·파트너 상태도 함께 반환(`resolveNetureServiceStates`) → §B 소비처. |
| operator scope | `security-core` scopeRoleMapping (`*:admin ⊃ *:operator`) | 서비스별 admin/operator 2단. |
| store provisioning | `services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts` · `routes/kpa/services/kpa-store-organization.provisioning.ts` · `services/cafe24-b2b/Cafe24B2bStoreProvisioningService.ts` · `routes/cosmetics/services/cosmetics-store.service.ts` | 모두 `organizations + organization_members + organization_service_enrollments (+ platform_store_slugs)` 공통 SSOT 를 쓴다. 서비스 전용 매장 테이블 없음. |

### A-3. 주의 — 스키마가 아니라 **정책** 수준의 후속 과제 (중지 사유 아님)

1. **PharmacyHub 프로비저닝의 조직 공유 HOLD** — `PharmacyHubStoreProvisioningService` 는 다른 서비스 active enrollment 가 있는 조직을 **자동 재사용하지 않고 held** 로 넘긴다 (D-2: "매장 자산 경계가 `organization_id` 단독이라 enrollment 만 추가해도 자산이 PH 화면에 유입"). 이는 "서비스별 Store" 전제의 보수적 정책이며, Architecture §3 의 "My Store = Store 소유, 경계 = organizationId" 와는 **오히려 정합**한다(자산은 매장 것이지 서비스 것이 아니다). Store 단계 WO 에서 HOLD 정책의 재판정 필요. 스키마 변경 아님.
2. **프로덕션에는 아직 2개 이상 서비스에 귀속된 조직이 0건** (enrollment ∪ slug 기준). 모델은 지원하나 데이터로 검증된 적이 없다 → Store 단계에서 실 계정으로 1 Store : N Services 를 최초 실증해야 한다.
3. `kpa` / `cosmetics` alias 키 이원화(enrollment code vs slug key vs role prefix)는 기존 `listing-service-key.ts` · `resolveCanonicalServiceKey()` 가 흡수 중. 통일은 별도 축.

---

## B. Legacy Partner 은퇴 모집단

### B-1. 분류 어휘

| 분류 | 뜻 |
|---|---|
| `DELETE_RUNTIME` | 소비처가 Partner 도메인 내부뿐 — 은퇴 WO 에서 바로 삭제 |
| `DELETE_AFTER_DEPENDENCY` | Partner 외부(공유 파일 · Frozen 계약 · 테스트 가드)가 참조 — 참조 해제 후 삭제 |
| `KEEP_SHARED_NOT_PARTNER` | 이름 충돌 또는 공유 자원 — 삭제하지 않는다 |
| `HISTORICAL_ONLY` | 이력·기록물 — 손대지 않는다 |
| `DB_FORWARD_MIGRATION_REQUIRED` | 프로덕션 테이블/컬럼 제거는 forward migration 으로 (후속 WO 후보) |

### B-2. 프로덕션 실측 (read-only, 2026-09-15)

| 대상 | 값 |
|---|---|
| partner 이름 테이블 (public + neture 스키마) | 16개 — 코드 `canonical-schema-baseline.ts` 와 **완전 일치** |
| `neture.neture_partners` (all / type=partner / active) | 0 / 0 / 0 |
| `neture_partner_applications` · `neture_partner_dashboard_items` · `neture_partner_dashboard_item_contents` · `neture_partner_recruitments` · `neture_partnership_products` · `neture_partnership_requests` · `neture_seller_partner_contracts` | 모두 0 |
| `partner_commissions` · `partner_referrals` · `partner_settlements` · `partner_settlement_items` · `supplier_partner_commissions` | 모두 0 |
| `foreign_visitor_partners` | 0 (별개 도메인) |
| `role_assignments` active — `neture:partner` / `partner` / `cosmetics:partner` | 0 / 0 / 0 |
| `service_memberships.role='partner'` | 0 |
| `checkout_orders."partnerId" IS NOT NULL` | 0 |
| `store_products.is_partner_recruiting = true` | 0 |
| `neture.neture_products.partner_id IS NOT NULL` | 0 |
| `app_registry("appId"='partnerops')` | 1 (status inactive — 20270404 migration) |
| **존재하지 않는 테이블** (엔티티/패키지만) | `partners` · `partner_clicks` · `partner_conversions` · `partner_links` · `partner_settlement_batches` (`packages/partner-core`) · `partner_contents` · `partner_events` · `partner_targets` (`modules/partner`) · `partner_applications` |

→ **Partner 프로덕션 데이터 = 0행.** 은퇴 forward migration 은 데이터 손실 없이 DROP 만 남는다 (그래도 DDL 이므로 사용자 명시 승인 대상).

### B-3. 백엔드 (apps/api-server)

| 항목 | 경로 | 분류 | 소비처 / 비고 |
|---|---|---|---|
| Partner API mount `/api/partner` | `bootstrap/register-routes.ts` L396-398 → `routes/partner.routes.ts` → `controllers/partner/partnerController.ts` | DELETE_RUNTIME | `requireRole(['partner','platform:super_admin'])` bare role. dashboard/summary · commissions · analytics · links/generate · products |
| Partner Dashboard API `/api/v1/partner` | `register-routes.ts` L400-402 → `modules/partner/**` (index · partner-dashboard.routes · partner.controller · guards/partner-context.guard · services/{event,content,overview,status,target} · dto · entities/{PartnerContent,PartnerEvent,PartnerTarget}) 15 파일 | DELETE_RUNTIME | 엔티티 3종은 `database/entities.ts` L336-339 · L806-808 에 등록되나 **테이블 부재**(§B-2). `server.ts` L183 endpoint 안내 문자열 |
| Neture Partner 도메인 | `modules/neture/controllers/partner.controller.ts` · `partner-dashboard.controller.ts` · `partner-commerce.controller.ts` · `partner-recruitment.controller.ts` · `admin-partner.controller.ts` · `operator-partner.controller.ts` | DELETE_AFTER_DEPENDENCY | `modules/neture/neture.routes.ts` L193 · L199-200 mount. `partner-recruitment.controller` 는 §B-8 판매자 모집 축과 **엔드포인트를 공유**(`/neture/partner/applications*`) — 분리 후 삭제 |
| Neture Partner 서비스 | `modules/neture/services/partner.service.ts` · `partner-contract.service.ts` · `partner-commission.service.ts` · `partnership.service.ts` · `neture-partner-service-application.service.ts` · `neture-service-state.service.ts`(partner 절반) | DELETE_AFTER_DEPENDENCY | `neture-service-state.service` 는 supplier 상태도 같이 해석 → partner 부분만 제거 |
| Neture 통합 partner 참조 | `modules/neture/neture.service.ts` (getPartnerByUserId 등) · `services/neture-dashboard.service.ts` · `services/supplier.service.ts`(`NeturePartnerStatus` import) · `services/operator-registration.service.ts` L268-291 · L328 (partner 승인 → `neture.neture_partners` 자동 생성) · `middleware/neture-identity.middleware.ts` L118-154 · `controllers/seller.controller.ts` `createPartnerContractController` · `services/seller.service.ts` · `controllers/supplier-settlement.controller.ts` · `controllers/admin-settlement.controller.ts` · `controllers/operator-dashboard.controller.ts` L139-163 · `controllers/admin-dashboard.controller.ts` L68 · `controllers/operator-action-queue.controller.ts` L90 · `controllers/hub-trigger.controller.ts` L390-424 (`manage-partnership`) · `controllers/operator-contact.controller.ts` · `controllers/contact.controller.ts` · `services/store-product-request-notify.ts` · `services/operator-ai-action.service.ts` · `services/product-master-audit-log.service.ts` · `controllers/supplier-contract.controller.ts` · `controllers/service-recruitment-exposure-proxy.controller.ts` · `controllers/product-db-write-authority.ts` | DELETE_AFTER_DEPENDENCY | 공유 파일 — partner 분기·KPI·트리거만 제거. `hub-trigger manage_partnership` 은 F1 `BASELINE-OPERATOR-OS-V1` L83 action key 와 `packages/ai-core/src/orchestration/action-keys.ts` L32 에 등재 → F1 문서·ai-core 정리 동반 |
| Neture Partner 엔티티 (public) | `modules/neture/entities/NeturePartnerApplication` · `NeturePartnerDashboardItem` · `NeturePartnerDashboardItemContent` · `NeturePartnerRecruitment` · `NeturePartnershipProduct` · `NeturePartnershipRequest` · `NetureSellerPartnerContract` (+ `entities/index.ts`) | DELETE_AFTER_DEPENDENCY + DB_FORWARD_MIGRATION_REQUIRED | `database/entities.ts` L208-214 · L698-704 등록. `NeturePartnerRecruitment` / `NeturePartnerApplication` 는 §B-8 |
| `neture.neture_partners` (seller/supplier/partner 통합 엔티티) | `routes/neture/entities/neture-partner.entity.ts` · `routes/neture/repositories/neture.repository.ts` · `routes/neture/services/neture.service.ts` · `routes/neture/controllers/neture.controller.ts` · `routes/neture/dto/index.ts` · `controllers/admin/adminDashboardController.ts` L21-348 · `routes/admin/dashboard.routes.ts` | DELETE_AFTER_DEPENDENCY + DB_FORWARD_MIGRATION_REQUIRED | `neture.neture_products.partner_id` FK (`routes/neture/entities/neture-product.entity.ts` L74-178) 가 이 테이블을 참조. `type` enum 에 seller/supplier 도 있으나 프로덕션 0행 · 공급자 SSOT 는 `neture_suppliers` → 테이블 자체 은퇴 후보. FK 컬럼 처리 포함 |
| Partner role 정의 | `types/roles.ts` L64 `neture:partner` · L78 `partner`(legacy bare) · L91 `cosmetics:partner` (+ L362-466 카탈로그) · `config/service-scopes.ts` L64-68 `neture:partners:*` · L126 `cosmetics:partners:manage` · `modules/auth/entities/User.ts` L217 `partner` relation · L309-317 `isPartner()` · `modules/auth/services/role-assignment.service.ts` L120-123 · L395 · `entities/RoleApplication.ts` L40 · `utils/scope-assignment.utils.ts` | DELETE_AFTER_DEPENDENCY | `packages/security-core/src/service-configs.ts` L141 · L149 `neture:partner` (F1 baseline security-core) · RBAC 문서(F9 계열 `RBAC-ROLE-CATALOG-V1` L51-70 · `ROLE-POLICY-AND-GUARD-V1` L135) 동반 정정. 프로덕션 보유자 0 |
| 가입 경로 | `modules/auth/controllers/auth-register.controller.ts` L57 `VALID_ROLES` 'partner' · L70-77 `NETURE_ALLOWED_SIGNUP_ROLES=['supplier','partner']` · L334 · L623 운영자 알림 | DELETE_AFTER_DEPENDENCY | supplier 경로와 같은 배열 — partner 값만 제거 |
| commerce 잔여 컬럼 | `entities/checkout/CheckoutOrder.entity.ts` L99 `partnerId` · `services/checkout.service.ts` L57 · L186 · L456-479 · `controllers/admin/adminOrderController.ts` · `routes/cosmetics/controllers/cosmetics-order.controller.ts` | DELETE_AFTER_DEPENDENCY + DB_FORWARD_MIGRATION_REQUIRED | `checkout_orders."partnerId"` 컬럼(0건 사용). `checkoutService.createOrder()` 단일 지점 계약(§4) 은 유지 — DTO 필드만 제거 |
| `store_products.is_partner_recruiting` | `modules/store/entities/store-product.entity.ts` L74-75 | DELETE_AFTER_DEPENDENCY + DB_FORWARD_MIGRATION_REQUIRED | §B-8 판매자 모집 축이 이 플래그를 쓰는지 확인 후 처분 (0건 true) |
| 기타 문자열 참조 | `middleware/metrics.middleware.ts` · `middleware/pharmacy-hub-scope.middleware.ts` · `init/cpt.init.ts` · `entities/{ContactRequest,PlatformInquiry,AuditLog,OperatorNotificationSettings}.ts` · `controllers/platformInquiryController.ts` · `modules/contact-inquiry/**` · `modules/service-legal/**` · `modules/platform/platform-hub.controller.ts` · `routes/kpa/controllers/contact-request.controller.ts` · `routes/kpa/services/operator-dashboard.service.ts` · `routes/kpa-branch/entities/branch-event.entity.ts` · `routes/o4o-store/controllers/store-hub.controller.ts` · `routes/users.routes.ts` · `routes/admin/users.routes.ts` · `services/ai-prompts/homeChat.ts` · `services/cart/store-cart.service.ts` · `entities/cart/StoreCartItem.entity.ts` · `utils/work-scope-store-resolution.ts` · `types/auth.ts` · `common/docs/module-structure.md` | KEEP_SHARED_NOT_PARTNER | 주석 · enum 라벨(문의 유형 'partner') · 알림 설정 키 등. 은퇴 WO 에서 **문자열 정리 여부는 건별 판단**, 삭제 대상 아님 |
| Foreign Visitor Partner | `modules/foreign-visitor-partner/**` 8 파일 · mount `register-routes.ts` L790-810 · `database/entities.ts` L428-432 · L835-839 | KEEP_SHARED_NOT_PARTNER | 매장 소유(organizationId + serviceKey) 외국인 방문객 유입 파트너 = Store Ops. 엔티티 주석이 Neture B2B 제휴와 "완전히 별개" 를 명시 |

### B-4. 프런트엔드

| 항목 | 경로 | 분류 | 소비처 / 비고 |
|---|---|---|---|
| `/partner/*` Partner Space | `services/web-neture/src/App.tsx` L762 · L964-982 · `components/layouts/PartnerSpaceLayout.tsx` · `pages/partner/{PartnerHubDashboardPage,ProductPoolPage,PartnerRecruitmentApplicationsPage,ReferralLinksPage,PartnerSettlementBatchPage,PartnerOverviewPage,SettlementsPage,PromotionsPage}.tsx` · `pages/PartnerLandingPage.tsx` · `pages/PartnerOverviewInfoPage.tsx`(L1024) | DELETE_RUNTIME | `/partner/forum*` 는 공통 `ForumPage` 재사용 — 라우트만 제거 |
| `/account/partner/*` Partner Account | `App.tsx` L953-960 · `components/layouts/PartnerAccountLayout.tsx` · `pages/partner/{PartnerAccountDashboardPage,PartnerContentsPage,PartnerLinksPage,PartnerStoresPage}.tsx` | DELETE_RUNTIME | |
| Partner redirect 잔여 | `App.tsx` L1253 · L1267-1276 (`/workspace/partner*` · `/partners/*` → redirect) · L630 `WORKSPACE_PREFIXES` '/partner' | DELETE_RUNTIME | |
| `/workspace/partners/*` Partnership Requests | `App.tsx` L1052-1056 · `pages/partners/requests/{List,Detail,Create}Page.tsx` · `pages/PartnerInfoPage.tsx` | DELETE_AFTER_DEPENDENCY | 백엔드 `neture_partnership_requests` (§B-3) 와 쌍 |
| Neture admin/operator Partner 화면 | `App.tsx` L1132-1136 · L1242 · `pages/admin/{AdminPartnerMonitoringPage,AdminPartnerDetailPage,AdminPartnerSettlementsPage,AdminCommissionsPage}.tsx` · `pages/operator/OperatorPartnerApprovalPage.tsx` · `pages/supplier/SupplierPartnerCommissionsPage.tsx` (L887 `/supplier/partner-commissions`) · `config/operatorMenuGroups.ts` · `config/navigation.ts` · `config/dashboard.ts` · `config/seoRegistry.ts` | DELETE_AFTER_DEPENDENCY | 메뉴/네비 config 는 공유 파일 — partner 항목만 제거 (`O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1` 절차) |
| API 클라이언트 | `lib/api/partner.ts` · `lib/api/admin.ts`(partner 절) · `lib/api/supplier.ts`(partner-commissions) · `lib/api/index.ts` · `lib/api/neture.ts` · `lib/api/dashboard.ts` · `lib/api/contact.ts` | DELETE_AFTER_DEPENDENCY | `admin.ts` · `supplier.ts` · `index.ts` 는 공유 |
| 홈 · 진입 · 게이트 | `lib/home-entry.ts` · `lib/neture-service-state.ts` · `components/home/HomeEntryPanel.tsx` · `components/home/LatestUpdatesSection.tsx` · `components/auth/ServiceUsageGate.tsx` · `components/auth/ServiceApplyPanel.tsx` · `components/NetureUserMenu.tsx` · `components/NetureGlobalHeader.tsx` · `components/RegisterModal.tsx` · `pages/O4OHomePage.tsx` · `lib/role-constants.ts` · `lib/work-scope/{types,routeWorkspaceMap}.ts` · `contexts/AuthContext.tsx` · `pages/hub/HubPage.tsx` | DELETE_AFTER_DEPENDENCY | supplier 와 같은 구조에서 partner 분기만 제거. 백엔드 `home/entry` 응답 계약(`serviceStates.partner`) 변경 동반 |
| 가이드 · 공개 페이지 | `pages/guide/GuideFeaturePartnerProgramPage.tsx` (L843 `/guide/features/partner-program`) · `pages/guide/GuideHomePage.tsx` · `pages/guide/index.ts` · `pages/SupplierLandingPage.tsx` · `pages/CommunityPage.tsx` · `pages/ContactPage.tsx` · `public/robots.txt` · `public/sitemap.xml` · `packages/shared-space-ui/src/guide/copy/neture.ts` | DELETE_AFTER_DEPENDENCY | `/guide` 시리즈는 메모리상 "재작성 금지" 트랙 — partner 항목 **제거만**, 재작성 아님 |
| admin-dashboard Neture Partner | `apps/admin-dashboard/src/pages/neture/NetureRouter.tsx` L18-55 · `PartnerListPage` · `PartnerDetailPage` · `PartnershipRequestListPage` · `PartnershipRequestDetailPage` · `routes/apps.routes.tsx` L128-131 · `pages/users/{ActiveUsers,UserDetail}.tsx` · `lib/rbac-catalog.ts` | DELETE_AFTER_DEPENDENCY | 테스트 가드 §B-7 |
| K-Cosmetics | `services/web-k-cosmetics/src/App.tsx` · `pages/PartnerInfoPage.tsx` · `components/layouts/DashboardLayout.tsx` · `components/auth/MembershipGate.tsx` · `pages/RoleNotAvailablePage.tsx` · `pages/operator/*` · `pages/admin/*` | DELETE_AFTER_DEPENDENCY | `WO-O4O-LEGACY-COSMETICS-PARTNER-REMOVAL-V1` 로 본체는 이미 제거됨 — 잔존 문자열·안내 페이지 |
| 판매자 모집 소비 화면 | `services/web-kpa-society/src/pages/pharmacy/{SellerRecruitmentsBrowsePage,StoreRecruitmentApplicationsPage}.tsx` · `services/web-pharmacy-hub/src/pages/store-owner/RecruitmentApplicationsPage.tsx` · `services/web-k-cosmetics/src/pages/store/StoreRecruitmentApplicationsPage.tsx` · `services/web-neture/src/pages/supplier/{SupplierRecruitmentDetailPage,SupplierProfilePage}.tsx` · `packages/store-ui-core/src/config/storeMenuConfig.ts` · `packages/store-ui-core/src/components/supply-catalog/SupplyCatalogHub.tsx` | KEEP_SHARED_NOT_PARTNER (§B-8) | `/neture/partner/applications*` 엔드포인트 이름만 partner |
| referral 유틸 | `services/web-neture/src/lib/referral.ts` · `services/web-kpa-society/src/utils/referral.ts` · `pages/store/QrLandingPage.tsx` | DELETE_AFTER_DEPENDENCY | `?ref=` 파트너 추천 코드 저장 유틸 — QR landing 이 호출. 사용 여부 은퇴 WO 에서 재확인 |
| 문의 · 계약 · 기타 라벨 | `services/web-kpa-society/src/pages/contact/*` · `api/contactRequest.ts` · `pages/operator/CollaborationRequestsPage.tsx` · `services/web-k-cosmetics/src/pages/ContactPage.tsx` · `services/web-account/src/components/UserProfileCard.tsx` · `packages/account-ui/**` · `packages/operator-ux-core/src/member-list/MemberBadges.tsx` · `packages/operator-core-ui/**` · `packages/ui/src/layout/{AGStorefrontLayout,GlobalHeader}.tsx` · `packages/content-core/**` · `packages/platform-core/src/store-identity/**`(reserved slug 'partner') | KEEP_SHARED_NOT_PARTNER | 라벨 · 예약어 · 배지. 건별 판단 |
| Foreign Visitor Partner 화면 | `services/web-kpa-society/src/pages/pharmacy/ForeignVisitor*` · `api/foreignVisitorPartner*` · `services/web-pharmacy-hub/src/pages/store-owner/ForeignVisitor*` · `lib/api/pharmacyHubForeignVisitor*` | KEEP_SHARED_NOT_PARTNER | §B-3 동일 |

### B-5. 패키지 · 타입 · 스크립트

| 항목 | 경로 | 분류 | 비고 |
|---|---|---|---|
| `@o4o/partner-core` | `packages/partner-core/**` (31 파일 · 엔티티 6종 `partners` · `partner_clicks` · `partner_conversions` · `partner_links` · `partner_commissions` · `partner_settlement_batches`) | DELETE_AFTER_DEPENDENCY | **import 0** (dead package). 존재를 고정하는 테스트 3종(§B-7) · `app-manifests/appsCatalog.ts` L258-267 `partner-core` 앱 항목 · `serviceGroups: ['platform-core','partnerops']` · workspace 목록(`pnpm-workspace` / lockfile) → **dependency/lockfile 변경 = 중지 조건** 대상, 은퇴 WO 에서 사용자 승인 후 |
| `packages/partnerops/` | 미추적 빌드 잔여(dist · node_modules · tsbuildinfo 만, git 에 없음) | HISTORICAL_ONLY | 타 세션/과거 빌드 산출물 — 불가침 |
| `@o4o/financial-core` | `packages/financial-core/src/commission-engine.ts` · `types.ts` · `index.ts` | DELETE_AFTER_DEPENDENCY | import 0 (dead, `neture-asset-mount-and-dead-package-residue.spec.ts` 가 목록화). partner 커미션 엔진 |
| `@o4o/types` | `packages/types/src/affiliate.ts` · `partner.ts` · `index.ts` · `auth/roles.ts` L25-144 (`ROLES.PARTNER` · `PARTNERSHIP_ROLES`) · `auth/permissions.ts` L42-350 · `business-registration.ts` · `dashboard.ts` · `api.ts` | DELETE_AFTER_DEPENDENCY | 공유 타입 — 소비처 전수 식별 필요(`check-literal-consumers.mjs`) |
| `@o4o/auth-utils` · `@o4o/auth-client` · `@o4o/auth-context` · `@o4o/utils` | `rolePriority.ts` · `roleDashboardMap.ts`('partner' → '/partner') · `rbac.ts` L93 · `adminRouteAccess.ts` · `accessControl.ts` L113 | DELETE_AFTER_DEPENDENCY | role 우선순위/라우팅 맵에서 partner 항목 제거 |
| `@o4o/security-core` | `service-configs.ts` L141 · L149 | DELETE_AFTER_DEPENDENCY | F1 baseline 소속 — 명시적 변경 승인 필요 |
| `@o4o/ai-core` · `@o4o/operator-core` | `action-keys.ts` L32 `NETURE_MANAGE_PARTNERSHIP` · `threshold.ts` L22 `partner?` | DELETE_AFTER_DEPENDENCY | |
| `@o4o/market-trial` | `packages/market-trial/**` (participant type 'partner') | KEEP_SHARED_NOT_PARTNER (판정 확인 필요) | 시장 실험 참여자 유형에 partner 포함 — 은퇴 WO 에서 enum 값만 제거할지 판단 |
| CI · 스크립트 | `.github/workflows/ci-pipeline.yml` L71(주석) · `scripts/lint-ratchet.mjs` L48(주석) · `scripts/reset/O4O-RESET-DRYRUN-V1.sql` L164-302 · `scripts/rollback-phase{1,2}.sh` · `scripts/audit/REGISTRY_AUDIT_REPORT.md` · `apps/api-server/scripts/reset-product-test-data.sql` | HISTORICAL_ONLY / KEEP_SHARED_NOT_PARTNER | lint-ratchet 는 `web-neture partner.ts` 의 `no-useless-catch` 2건을 baseline 에 포함 → partner.ts 삭제 시 ratchet 수치 재조정 필요 (게이트 정합) |
| HFF · 의약품 데이터 | `apps/api-server/src/scripts/data/**` 52 · `scripts/hff-fiber-partner-*` · `hff-*` · `easy-drug-en-full-retranslation/**` | KEEP_SHARED_NOT_PARTNER | "partner" = 동반 영양성분 / 영문 원문 어휘. **Partner 도메인 아님** |

### B-6. DB · migration

| 항목 | 분류 | 비고 |
|---|---|---|
| 과거 migration 48 파일 (`1736950000000-CreateNetureTables` … `20270404000000-DeactivateRetiredPartnerOpsAppRegistry`) | HISTORICAL_ONLY | 삭제·수정 금지. `historical-migrations.manifest.json` · `historical-migration-names.ts` 도 그대로 |
| `canonical-schema-baseline.ts` (127 hits) | HISTORICAL_ONLY | 부트스트랩 baseline 은 이력. forward migration 으로만 제거 |
| forward migration 후보 (후속 WO) | DB_FORWARD_MIGRATION_REQUIRED | DROP: `neture_partner_applications` · `neture_partner_dashboard_items` · `neture_partner_dashboard_item_contents` · `neture_partnership_products` · `neture_partnership_requests` · `neture_seller_partner_contracts` · `partner_commissions` · `partner_referrals` · `partner_settlement_items` · `partner_settlements` · `supplier_partner_commissions` · `neture.neture_partners`(FK `neture.neture_products.partner_id` 선처리). ALTER: `checkout_orders."partnerId"` · `store_products.is_partner_recruiting`. `neture_partner_recruitments` 는 §B-8 판정 후. 모두 0행 — 청크·snapshot 불필요, 그러나 **DDL = 사용자 명시 승인** |
| `app_registry` partnerops row | HISTORICAL_ONLY | 이미 inactive. 추가 조치 없음 |

### B-7. 테스트 가드 (은퇴 시 함께 갱신)

| 테스트 | 고정하는 것 |
|---|---|
| `apps/api-server/src/__tests__/auth-runtime-and-legacy-package-final-closure.spec.ts` L74-75 | `packages/partner-core` 존재 |
| `apps/api-server/src/__tests__/partnerops-registry-and-lint-gate-final-closure.spec.ts` L97-99 | `packages/partner-core/package.json` · `src` 존재 |
| `apps/api-server/src/__tests__/neture-asset-mount-and-dead-package-residue.spec.ts` L23-29 | partner-core · financial-core = import 0 dead 목록 |
| `apps/api-server/src/__tests__/public-appstore-read-retirement.spec.ts` L109 · `app-management-runtime-residue-retirement.spec.ts` · `partner-application-retirement.spec.ts` · `shortcode-domain-retirement.spec.ts` | appsCatalog `partner-core` 유지 · partner_applications 은퇴 상태 |
| `apps/admin-dashboard/src/tests/admin-authorization-registry-and-dead-surface-final-closure.test.ts` L264-267 · `admin-platform-only-access-and-post-refactor-closure.test.ts` L221 · `admin-legacy-route-api-and-navigation-closure.test.ts` · `admin-protected-route-access.test.ts` · `admin-operation-boundary.test.ts` | `partnerops` serviceGroup · `partner-core` 카탈로그 보존 |
| `apps/api-server/src/__tests__/security/{legacy-role,scope-guard}.spec.ts` · `bootstrap/__tests__/{admin-route-auth-boundary,product-db-write-authority}.test.ts` · `utils/__tests__/role-admin-tier.test.ts` · `services/approval/__tests__/MembershipApprovalService.bareRoleContract.test.ts` · `__tests__/work-scope-store-resolution.spec.ts` · `__tests__/home-chat-ai-input.spec.ts` · `tests/multi-tenant/appstore.spec.ts` | `neture:partner` role · partner 워크스페이스 문자열 |
| `apps/api-server/src/modules/neture/**/__tests__/{neture-service-state,operator-registration.roleContract,neture-identity.middleware}.test.ts` | partner 서비스 상태 · 승인 → `neture.neture_partners` 계약 |
| `services/web-neture/src/**/__tests__/{ServiceUsageGate,AuthContext.crossTab,home-entry.service-states}.test.*` · `packages/auth-client/src/__tests__/client-refresh-race.test.ts` | 프런트 partner 상태 |
| `packages/partner-core/src/__tests__/*` | 패키지와 함께 삭제 |

### B-8. 판정 확인 필요 (사용자) — 이름은 partner, 실체는 다른 축

| 대상 | 현 실체 | 잠정 분류 | 확인 요청 |
|---|---|---|---|
| `neture_partner_recruitments` · `neture_partner_applications` · `partner-recruitment.controller` · `/neture/partner/applications*` · `store-seller-recruitment-browse.controller` | 공급자의 **판매자(매장) 모집** 공고 + 매장의 참여 신청. `WO-O4O-SELLER-RECRUITMENT-TERMINOLOGY-BOUNDARY-FIX-V1` 이 "파트너 모집과 무관" 을 명시. KPA/PH/K-Cos 매장 화면이 소비. B2B 계약 §13 "seller_recruitment 는 주문 경로가 아니다". 프로덕션 0행 | KEEP_SHARED_NOT_PARTNER (이름·경로만 rename 후보 — Supplier 단계 Business Operation 축) | 이 축을 **Supplier › Business Operation 의 사업 프로그램**으로 유지할지, Partner 와 함께 은퇴할지 |
| `neture_partnership_requests` · `neture_partnership_products` · `/workspace/partners/requests` · admin `partnership-requests` · `hub-trigger manage-partnership` | 판매자가 공급자에게 올리는 **제휴 요청 게시판**(수익 구조 · 기간). 프로덕션 0행 | DELETE_AFTER_DEPENDENCY (Architecture §2-2 "Supplier → 특정 Store 직접" 제외 원칙과 반대 방향의 직접 매칭) | 은퇴 동의 여부 |
| `foreign_visitor_partners*` | 매장 소유 외국인 방문객 유입 파트너 (Store Ops) | KEEP_SHARED_NOT_PARTNER | 확인만 |
| `@o4o/market-trial` participant 'partner' | 시장 실험 참여 유형 | KEEP_SHARED_NOT_PARTNER | enum 값 제거 여부 |

---

## C. Documentation 판정

기준: `docs/CANONICAL-INDEX.md` 등재 86 문서 전수 대조(링크 유효 86/86 · MISSING 0). 아래에 없는 등재 문서는 **KEEP** (새 Architecture 와 충돌 없음).

| 문서 | 판정 | 사유 · 처리 |
|---|---|---|
| [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) | **신설 ACTIVE** | §1 사업·정책 정본에 추가 |
| [`O4O-BUSINESS-PHILOSOPHY-V1`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) | UPDATE_REQUIRED (ACTIVE 유지) | §3 · §4 · §7 · 주의사항(Neture 내 매장 금지) · 적용 범위(GlycoPharm 잔존) 가 충돌. 충돌 절은 새 정본 우선. 본문 개정은 후속 WO |
| [`O4O-3-ROLE-FLOW-BASELINE-V1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) | **판정 대기** | §2 단선 흐름 · §6 Drift 금지 2항이 새 정본 §2-1 · §6 과 정면 충돌. 헤더 표기 + 색인 §9 이동 |
| [`NETURE-PARTNER-CONTRACT-FREEZE-V1`](../baseline/NETURE-PARTNER-CONTRACT-FREEZE-V1.md) (F7) | **판정 대기 → RETIRE_CANDIDATE** | Partner 전면 은퇴 대상. 헤더 표기. Partner Retirement 완료 시 SUPERSEDED/archive |
| [`PLATFORM-CONTENT-POLICY-V1`](../baseline/PLATFORM-CONTENT-POLICY-V1.md) (F4) | UPDATE_REQUIRED (FROZEN 유지) | 3축 모델 유지. §3.1 · §6.3 · §10-5 "`producer='supplier'` = legacy 예외" 가 충돌 |
| [`O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1`](../baseline/O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md) | UPDATE_REQUIRED (ACTIVE 유지) | §6 첫 항목 충돌 |
| [`O4O-STORE-MENU-CANONICAL-TREE-V1`](../baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md) | UPDATE_REQUIRED (ACTIVE 유지) | §1.3 Neture 제외 · §5.1 출처 4종 ↔ 3+1 경로 |
| [`NETURE-DISTRIBUTION-ENGINE-FREEZE-V1`](../baseline/NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md) (F8) | KEEP | Partner 무관. Supplier → Store Hub 제품 축 근거 |
| [`NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3`](../baseline/NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3.md) | KEEP | 공급자 Gate 4계층. partner 언급 0 |
| [`O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1`](../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) | KEEP | "공통 매장경영 − capability" 모델이 새 정본과 정합. 원칙 4(운영자 승인 없이 HUB 유입) 는 Supplier → Store Hub 선례 |
| [`o4o-common-structure`](../o4o-common-structure.md) | KEEP (Community 단계에서 재판정) | serviceKey 격리는 Community 리팩터링 전까지 유효 (새 정본 §5) |
| [`BASELINE-OPERATOR-OS-V1`](../baseline/BASELINE-OPERATOR-OS-V1.md) (F1) | KEEP (Partner Retirement 시 L83 `manage_partnership` action key 1행 정정) | |
| [`RBAC-ROLE-CATALOG-V1`](../rbac/RBAC-ROLE-CATALOG-V1.md) · [`ROLE-POLICY-AND-GUARD-V1`](../baseline/ROLE-POLICY-AND-GUARD-V1.md) · [`RBAC-CANONICAL-STATE-V1`](../rbac/RBAC-CANONICAL-STATE-V1.md) | KEEP (Partner Retirement 시 `partner` · `neture:partner` 행 정정) | 보유자 0 은 이미 문서에 기록 |
| [`GLOBAL-HEADER-STANDARD-V1`](../architecture/ui/GLOBAL-HEADER-STANDARD-V1.md) · [`O4O-AI-USAGE-FLOW-BASELINE-V1`](../baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md) L300 · [`O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1`](../baseline/O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1.md) L43 · [`OPERATOR-DASHBOARD-STANDARD-V1`](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md) L372 · [`OPERATOR-INTEGRATION-STATE-V1`](../architecture/OPERATOR-INTEGRATION-STATE-V1.md) L117 · [`O4O-OPERATOR-CANONICAL-WORKFLOW-V1`](../architecture/O4O-OPERATOR-CANONICAL-WORKFLOW-V1.md) L330 · [`EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1`](../baseline/EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1.md) L47 | KEEP (Partner 언급 1~5행 — Partner Retirement 시 기계적 정정) | 구조 충돌 아님 |
| [`E-COMMERCE-ORDER-CONTRACT`](../baseline/E-COMMERCE-ORDER-CONTRACT.md) | 판정 대기 (기존) | `partnerId` 예시 L149 · L201 — 기존 stale 절 정리에 포함 |
| [`O4O-RETAIL-STABLE-V1`](../platform/architecture/O4O-RETAIL-STABLE-V1.md) | 판정 대기 (기존, 변경 없음) | |
| 기타 등재 문서 (Frozen F3 · F5 · F6 · F9 · F10 · F11 · F12 · UX-CORE · 운영/환경/가이드 등) | KEEP | 새 정본 §8 표 |

RETIRE_CANDIDATE = F7 1건. 이번 WO 에서 SUPERSEDED · archive 이동 · 본문 개정은 **하지 않았다** (헤더 1줄 표기 2건 + 색인 정렬만).

---

## D. 다음 구현 단계 판정

```text
NEXT = GO_PARTNER_RETIREMENT
```

근거:

- Service ↔ Store 모델은 `REUSE_AS_IS` — 신규 핵심 schema 불필요 (`BLOCKED_SERVICE_MODEL` 아님).
- 사용자/조직 소유권 모델(`organization_members` + `organization_service_enrollments`)과 새 Architecture 충돌 없음.
- Partner 프로덕션 데이터 0행 — forward migration 범위 명확(DROP/ALTER 만), 데이터 삭제 판단 불필요.
- RBAC/Auth Frozen 계약 변경 선행 불필요 — `neture:partner` 제거는 F1 `security-core` config 1행 · F9 카탈로그 행 정정이며 구조 변경이 아니다(은퇴 WO 에서 명시적 승인 항목으로 처리).
- 새 Architecture 와 충돌하는 **현행 필수 사업 계약 없음** — 충돌 문서는 모두 판정 대기/UPDATE_REQUIRED 로 정렬됨.

**Partner Retirement WO 착수 조건**

1. 최신 `origin/main` 에서 Partner 모집단 재산출 (이 IR 재사용 금지).
2. §B-8 의 4개 판정 확인(특히 판매자 모집 축 · partnership 요청 게시판).
3. 중지 조건 사전 승인 항목: `packages/partner-core` · `financial-core` 삭제(workspace/lockfile) · security-core F1 1행 · forward migration DDL · lint-ratchet 재조정.
4. 삭제 순서: 프런트 라우트/화면 → 백엔드 mount/컨트롤러/서비스 → 엔티티 등록 해제 → role/타입/패키지 → 테스트 가드 갱신 → forward migration(별도 승인) → 문서(F7 SUPERSEDED · RBAC 행).

---

## E. 검증 기록

| 항목 | 결과 |
|---|---|
| 시작 기준 | `git fetch origin` · `git status -sb` = `## main...origin/main` · HEAD = origin/main = `ccf553294` |
| runtime source 변경 | 0 (문서 5 + 신규 2 만) |
| DB / migration 변경 | 0 (read-only SELECT 만, 프록시 종료) |
| 신규 링크 유효성 | 새 정본 · IR · 색인 · CLAUDE.md · AGENTS.md 의 상대 링크 전수 존재 확인 (§E-1 스크립트) |
| CANONICAL-INDEX 중복/충돌 | 새 행 1 · 상태 변경 2(3-ROLE-FLOW · F7) · 주석 4 — 중복 없음 |
| CLAUDE.md / AGENTS.md | 양쪽 우선순위 2 에 동일 정본 추가. § 번호(§0~§16 · §13-A) 불변 |
| 관련 quality script | 별도 링크 검사 스크립트 없음 → ad-hoc 검사 수행 (§E-1). `scripts/git/check-staged-scope.mjs` 커밋 전 실행 |

### E-1. 링크 검사 (ad-hoc)

수정·신설한 7개 markdown 파일(CLAUDE.md · AGENTS.md · CANONICAL-INDEX · 새 정본 · 이 IR · 3-ROLE-FLOW · F7)의 markdown 상대 링크 211건을 파일 존재로 검증 — 깨진 링크 0. 색인의 동일 대상 중복 링크는 §1/§9 · §2/§9 교차 참조(COMMERCE-BOUNDARY · B2B · F7 · ROLE-WORKSPACE-ARCHITECTURE)로 의도된 것이며 행 중복이 아니다.

---

## 부록 A. Partner 문자열 runtime 모집단 (353 파일 · `ccf553294` 기준 · 기록용)

> 이름 충돌(HFF 데이터 · 의약품 영문 · foreign-visitor) · migration · docs · schema baseline 제외. 열 = `git grep -ic partner` 건수. **다음 WO 의 모집단으로 쓰지 않는다.**

| 파일 | hits |
|---|---|
| `.github/workflows/ci-pipeline.yml` | 1 |
| `apps/admin-dashboard/src/api/admin-apps.ts` | 1 |
| `apps/admin-dashboard/src/lib/rbac-catalog.ts` | 1 |
| `apps/admin-dashboard/src/pages/apps/AppStorePage.tsx` | 1 |
| `apps/admin-dashboard/src/pages/content/policies/index.tsx` | 2 |
| `apps/admin-dashboard/src/pages/neture/NetureRouter.tsx` | 11 |
| `apps/admin-dashboard/src/pages/neture/PartnerDetailPage.tsx` | 51 |
| `apps/admin-dashboard/src/pages/neture/PartnerListPage.tsx` | 37 |
| `apps/admin-dashboard/src/pages/neture/PartnershipRequestDetailPage.tsx` | 8 |
| `apps/admin-dashboard/src/pages/neture/PartnershipRequestListPage.tsx` | 8 |
| `apps/admin-dashboard/src/pages/test/ApiResponseChecker.tsx` | 1 |
| `apps/admin-dashboard/src/pages/users/ActiveUsers.tsx` | 2 |
| `apps/admin-dashboard/src/pages/users/UserDetail.tsx` | 1 |
| `apps/admin-dashboard/src/routes/apps.routes.tsx` | 10 |
| `apps/admin-dashboard/src/routes/dashboard.routes.tsx` | 1 |
| `apps/admin-dashboard/src/routes/services.routes.tsx` | 5 |
| `apps/admin-dashboard/src/tests/admin-authorization-registry-and-dead-surface-final-closure.test.ts` | 17 |
| `apps/admin-dashboard/src/tests/admin-legacy-route-api-and-navigation-closure.test.ts` | 3 |
| `apps/admin-dashboard/src/tests/admin-operation-boundary.test.ts` | 1 |
| `apps/admin-dashboard/src/tests/admin-platform-only-access-and-post-refactor-closure.test.ts` | 11 |
| `apps/admin-dashboard/src/tests/admin-protected-route-access.test.ts` | 1 |
| `apps/api-server/.env` | 0 |
| `apps/api-server/.env.example` | 1 |
| `apps/api-server/logs/combined.log` | 0 |
| `apps/api-server/logs/error.log` | 0 |
| `apps/api-server/migrations/20251107_add_partner_fields_to_orders.sql` | 14 |
| `apps/api-server/scripts/reset-product-test-data.sql` | 1 |
| `apps/api-server/src/__tests__/app-management-runtime-residue-retirement.spec.ts` | 2 |
| `apps/api-server/src/__tests__/auth-runtime-and-legacy-package-final-closure.spec.ts` | 12 |
| `apps/api-server/src/__tests__/home-chat-ai-input.spec.ts` | 1 |
| `apps/api-server/src/__tests__/neture-asset-mount-and-dead-package-residue.spec.ts` | 3 |
| `apps/api-server/src/__tests__/partner-application-retirement.spec.ts` | 24 |
| `apps/api-server/src/__tests__/partnerops-registry-and-lint-gate-final-closure.spec.ts` | 17 |
| `apps/api-server/src/__tests__/public-appstore-read-retirement.spec.ts` | 3 |
| `apps/api-server/src/__tests__/security/legacy-role.spec.ts` | 1 |
| `apps/api-server/src/__tests__/security/scope-guard.spec.ts` | 6 |
| `apps/api-server/src/__tests__/shortcode-domain-retirement.spec.ts` | 2 |
| `apps/api-server/src/__tests__/work-scope-store-resolution.spec.ts` | 1 |
| `apps/api-server/src/app-manifests/appsCatalog.ts` | 23 |
| `apps/api-server/src/app-manifests/disabled-apps.registry.ts` | 1 |
| `apps/api-server/src/bootstrap/__tests__/admin-route-auth-boundary.test.ts` | 2 |
| `apps/api-server/src/bootstrap/__tests__/product-db-write-authority.test.ts` | 1 |
| `apps/api-server/src/bootstrap/register-routes.ts` | 29 |
| `apps/api-server/src/config/service-scopes.ts` | 3 |
| `apps/api-server/src/controllers/admin/adminDashboardController.ts` | 39 |
| `apps/api-server/src/controllers/admin/adminOrderController.ts` | 2 |
| `apps/api-server/src/controllers/market-trial/marketTrialOperatorController.ts` | 1 |
| `apps/api-server/src/controllers/partner/partnerController.ts` | 24 |
| `apps/api-server/src/controllers/platformInquiryController.ts` | 1 |
| `apps/api-server/src/database/entities.ts` | 44 |
| `apps/api-server/src/entities/AuditLog.ts` | 1 |
| `apps/api-server/src/entities/ContactRequest.ts` | 3 |
| `apps/api-server/src/entities/OperatorNotificationSettings.ts` | 2 |
| `apps/api-server/src/entities/PlatformInquiry.ts` | 1 |
| `apps/api-server/src/entities/RoleApplication.ts` | 2 |
| `apps/api-server/src/entities/cart/StoreCartItem.entity.ts` | 1 |
| `apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts` | 1 |
| `apps/api-server/src/init/cpt.init.ts` | 1 |
| `apps/api-server/src/middleware/metrics.middleware.ts` | 8 |
| `apps/api-server/src/middleware/pharmacy-hub-scope.middleware.ts` | 1 |
| `apps/api-server/src/modules/auth/controllers/auth-register.controller.ts` | 6 |
| `apps/api-server/src/modules/auth/entities/RoleAssignment.ts` | 1 |
| `apps/api-server/src/modules/auth/entities/ServiceMembership.ts` | 1 |
| `apps/api-server/src/modules/auth/entities/User.ts` | 4 |
| `apps/api-server/src/modules/auth/services/role-assignment.service.ts` | 4 |
| `apps/api-server/src/modules/contact-inquiry/contact-settings.helper.ts` | 1 |
| `apps/api-server/src/modules/contact-inquiry/entities/ContactInquiry.entity.ts` | 1 |
| `apps/api-server/src/modules/contact-inquiry/public-contact-inquiry.controller.ts` | 2 |
| `apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts` | 10 |
| `apps/api-server/src/modules/neture/controllers/admin-partner.controller.ts` | 50 |
| `apps/api-server/src/modules/neture/controllers/admin-settlement.controller.ts` | 7 |
| `apps/api-server/src/modules/neture/controllers/contact.controller.ts` | 2 |
| `apps/api-server/src/modules/neture/controllers/hub-trigger.controller.ts` | 7 |
| `apps/api-server/src/modules/neture/controllers/operator-action-queue.controller.ts` | 11 |
| `apps/api-server/src/modules/neture/controllers/operator-contact.controller.ts` | 6 |
| `apps/api-server/src/modules/neture/controllers/operator-dashboard.controller.ts` | 15 |
| `apps/api-server/src/modules/neture/controllers/operator-partner.controller.ts` | 25 |
| `apps/api-server/src/modules/neture/controllers/partner-commerce.controller.ts` | 82 |
| `apps/api-server/src/modules/neture/controllers/partner-dashboard.controller.ts` | 88 |
| `apps/api-server/src/modules/neture/controllers/partner-recruitment.controller.ts` | 51 |
| `apps/api-server/src/modules/neture/controllers/partner.controller.ts` | 34 |
| `apps/api-server/src/modules/neture/controllers/product-db-write-authority.ts` | 1 |
| `apps/api-server/src/modules/neture/controllers/seller.controller.ts` | 17 |
| `apps/api-server/src/modules/neture/controllers/service-recruitment-exposure-proxy.controller.ts` | 1 |
| `apps/api-server/src/modules/neture/controllers/store-seller-recruitment-browse.controller.ts` | 3 |
| `apps/api-server/src/modules/neture/controllers/supplier-contract.controller.ts` | 1 |
| `apps/api-server/src/modules/neture/controllers/supplier-settlement.controller.ts` | 29 |
| `apps/api-server/src/modules/neture/entities/NetureContactMessage.entity.ts` | 2 |
| `apps/api-server/src/modules/neture/entities/NeturePartnerApplication.entity.ts` | 10 |
| `apps/api-server/src/modules/neture/entities/NeturePartnerDashboardItem.entity.ts` | 10 |
| `apps/api-server/src/modules/neture/entities/NeturePartnerDashboardItemContent.entity.ts` | 4 |
| `apps/api-server/src/modules/neture/entities/NeturePartnerRecruitment.entity.ts` | 4 |
| `apps/api-server/src/modules/neture/entities/NeturePartnershipProduct.entity.ts` | 8 |
| `apps/api-server/src/modules/neture/entities/NeturePartnershipRequest.entity.ts` | 9 |
| `apps/api-server/src/modules/neture/entities/NetureSellerPartnerContract.entity.ts` | 9 |
| `apps/api-server/src/modules/neture/entities/NetureSupplier.entity.ts` | 2 |
| `apps/api-server/src/modules/neture/entities/index.ts` | 7 |
| `apps/api-server/src/modules/neture/middleware/__tests__/neture-identity.middleware.test.ts` | 7 |
| `apps/api-server/src/modules/neture/middleware/neture-identity.middleware.ts` | 25 |
| `apps/api-server/src/modules/neture/neture.routes.ts` | 24 |
| `apps/api-server/src/modules/neture/neture.service.ts` | 61 |
| `apps/api-server/src/modules/neture/services/__tests__/neture-service-state.test.ts` | 18 |
| `apps/api-server/src/modules/neture/services/__tests__/operator-registration.roleContract.test.ts` | 10 |
| `apps/api-server/src/modules/neture/services/neture-dashboard.service.ts` | 28 |
| `apps/api-server/src/modules/neture/services/neture-partner-service-application.service.ts` | 49 |
| `apps/api-server/src/modules/neture/services/neture-service-state.service.ts` | 16 |
| `apps/api-server/src/modules/neture/services/operator-ai-action.service.ts` | 1 |
| `apps/api-server/src/modules/neture/services/operator-registration.service.ts` | 18 |
| `apps/api-server/src/modules/neture/services/partner-commission.service.ts` | 55 |
| `apps/api-server/src/modules/neture/services/partner-contract.service.ts` | 124 |
| `apps/api-server/src/modules/neture/services/partner.service.ts` | 108 |
| `apps/api-server/src/modules/neture/services/partnership.service.ts` | 43 |
| `apps/api-server/src/modules/neture/services/product-master-audit-log.service.ts` | 1 |
| `apps/api-server/src/modules/neture/services/seller.service.ts` | 8 |
| `apps/api-server/src/modules/neture/services/store-product-request-notify.ts` | 1 |
| `apps/api-server/src/modules/neture/services/supplier.service.ts` | 23 |
| `apps/api-server/src/modules/partner/dto/partner.dto.ts` | 11 |
| `apps/api-server/src/modules/partner/entities/PartnerContent.ts` | 11 |
| `apps/api-server/src/modules/partner/entities/PartnerEvent.ts` | 9 |
| `apps/api-server/src/modules/partner/entities/PartnerTarget.ts` | 11 |
| `apps/api-server/src/modules/partner/entities/index.ts` | 8 |
| `apps/api-server/src/modules/partner/guards/partner-context.guard.ts` | 30 |
| `apps/api-server/src/modules/partner/index.ts` | 9 |
| `apps/api-server/src/modules/partner/partner-dashboard.routes.ts` | 18 |
| `apps/api-server/src/modules/partner/partner.controller.ts` | 63 |
| `apps/api-server/src/modules/partner/services/index.ts` | 7 |
| `apps/api-server/src/modules/partner/services/partner-content.service.ts` | 28 |
| `apps/api-server/src/modules/partner/services/partner-event.service.ts` | 28 |
| `apps/api-server/src/modules/partner/services/partner-overview.service.ts` | 13 |
| `apps/api-server/src/modules/partner/services/partner-status.service.ts` | 12 |
| `apps/api-server/src/modules/partner/services/partner-target.service.ts` | 11 |
| `apps/api-server/src/modules/platform/platform-hub.controller.ts` | 1 |
| `apps/api-server/src/modules/service-legal/entities/ServicePolicyDocument.entity.ts` | 1 |
| `apps/api-server/src/modules/service-legal/service-legal-scope.ts` | 1 |
| `apps/api-server/src/modules/store/entities/store-product.entity.ts` | 2 |
| `apps/api-server/src/routes/admin/dashboard.routes.ts` | 14 |
| `apps/api-server/src/routes/admin/users.routes.ts` | 1 |
| `apps/api-server/src/routes/cosmetics/controllers/cosmetics-order.controller.ts` | 1 |
| `apps/api-server/src/routes/kpa-branch/entities/branch-event.entity.ts` | 1 |
| `apps/api-server/src/routes/kpa/controllers/contact-request.controller.ts` | 6 |
| `apps/api-server/src/routes/kpa/services/operator-dashboard.service.ts` | 2 |
| `apps/api-server/src/routes/neture/controllers/neture-home-entry.controller.ts` | 3 |
| `apps/api-server/src/routes/neture/controllers/neture.controller.ts` | 35 |
| `apps/api-server/src/routes/neture/dto/index.ts` | 31 |
| `apps/api-server/src/routes/neture/entities/index.ts` | 1 |
| `apps/api-server/src/routes/neture/entities/neture-partner.entity.ts` | 20 |
| `apps/api-server/src/routes/neture/entities/neture-product.entity.ts` | 6 |
| `apps/api-server/src/routes/neture/repositories/neture.repository.ts` | 28 |
| `apps/api-server/src/routes/neture/services/neture.service.ts` | 67 |
| `apps/api-server/src/routes/o4o-store/controllers/store-hub.controller.ts` | 1 |
| `apps/api-server/src/routes/partner.routes.ts` | 20 |
| `apps/api-server/src/routes/users.routes.ts` | 1 |
| `apps/api-server/src/server.ts` | 2 |
| `apps/api-server/src/services/ai-prompts/homeChat.ts` | 1 |
| `apps/api-server/src/services/approval/__tests__/MembershipApprovalService.bareRoleContract.test.ts` | 2 |
| `apps/api-server/src/services/cart/store-cart.service.ts` | 1 |
| `apps/api-server/src/services/checkout.service.ts` | 6 |
| `apps/api-server/src/types/auth.ts` | 1 |
| `apps/api-server/src/types/roles.ts` | 15 |
| `apps/api-server/src/utils/__tests__/role-admin-tier.test.ts` | 1 |
| `apps/api-server/src/utils/scope-assignment.utils.ts` | 1 |
| `apps/api-server/src/utils/work-scope-store-resolution.ts` | 3 |
| `apps/api-server/tests/multi-tenant/appstore.spec.ts` | 3 |
| `packages/account-ui/src/components/MyRequestsInbox.tsx` | 1 |
| `packages/account-ui/src/components/RequestTypeBadge.tsx` | 1 |
| `packages/ai-core/src/orchestration/action-keys.ts` | 1 |
| `packages/auth-client/src/__tests__/client-refresh-race.test.ts` | 4 |
| `packages/auth-client/src/rbac.ts` | 1 |
| `packages/auth-client/src/types.ts` | 1 |
| `packages/auth-context/src/adminRouteAccess.ts` | 1 |
| `packages/auth-utils/src/isStoreOwnerDual.ts` | 1 |
| `packages/auth-utils/src/roleDashboardMap.ts` | 1 |
| `packages/auth-utils/src/rolePriority.ts` | 1 |
| `packages/content-core/src/types/ContentTypes.ts` | 2 |
| `packages/financial-core/package.json` | 1 |
| `packages/financial-core/src/commission-engine.ts` | 11 |
| `packages/financial-core/src/index.ts` | 1 |
| `packages/financial-core/src/types.ts` | 3 |
| `packages/market-trial/package.json` | 1 |
| `packages/market-trial/src/controllers/MarketTrialController.ts` | 16 |
| `packages/market-trial/src/dto/index.ts` | 4 |
| `packages/market-trial/src/entities/MarketTrial.entity.ts` | 2 |
| `packages/market-trial/src/entities/MarketTrialDecision.entity.ts` | 3 |
| `packages/market-trial/src/entities/MarketTrialParticipant.entity.ts` | 4 |
| `packages/market-trial/src/index.ts` | 1 |
| `packages/market-trial/src/manifest.ts` | 1 |
| `packages/market-trial/src/services/MarketTrialDecisionService.ts` | 6 |
| `packages/market-trial/src/services/MarketTrialForumService.ts` | 10 |
| `packages/market-trial/src/services/index.ts` | 1 |
| `packages/operator-core-ui/src/modules/members/CommonEditUserModal.tsx` | 1 |
| `packages/operator-core-ui/src/modules/service-legal/types.ts` | 1 |
| `packages/operator-core/src/threshold.ts` | 1 |
| `packages/operator-ux-core/src/member-list/MemberBadges.tsx` | 2 |
| `packages/partner-core/package.json` | 2 |
| `packages/partner-core/src/__tests__/integration.test.ts` | 93 |
| `packages/partner-core/src/__tests__/pharmacy-integration.test.ts` | 57 |
| `packages/partner-core/src/__tests__/test-runner.ts` | 15 |
| `packages/partner-core/src/backend/index.ts` | 4 |
| `packages/partner-core/src/entities/Partner.entity.ts` | 29 |
| `packages/partner-core/src/entities/PartnerClick.entity.ts` | 15 |
| `packages/partner-core/src/entities/PartnerCommission.entity.ts` | 15 |
| `packages/partner-core/src/entities/PartnerConversion.entity.ts` | 18 |
| `packages/partner-core/src/entities/PartnerLink.entity.ts` | 16 |
| `packages/partner-core/src/entities/PartnerSettlementBatch.entity.ts` | 12 |
| `packages/partner-core/src/entities/index.ts` | 21 |
| `packages/partner-core/src/index.ts` | 63 |
| `packages/partner-core/src/lifecycle/activate.ts` | 9 |
| `packages/partner-core/src/lifecycle/deactivate.ts` | 9 |
| `packages/partner-core/src/lifecycle/index.ts` | 2 |
| `packages/partner-core/src/lifecycle/install.ts` | 10 |
| `packages/partner-core/src/lifecycle/uninstall.ts` | 19 |
| `packages/partner-core/src/manifest.ts` | 57 |
| `packages/partner-core/src/partner-extension.ts` | 91 |
| `packages/partner-core/src/receivers/index.ts` | 2 |
| `packages/partner-core/src/receivers/pharmacy-event-receiver.ts` | 17 |
| `packages/partner-core/src/services/PartnerClickService.ts` | 36 |
| `packages/partner-core/src/services/PartnerCommissionService.ts` | 55 |
| `packages/partner-core/src/services/PartnerConversionService.ts` | 43 |
| `packages/partner-core/src/services/PartnerLinkService.ts` | 45 |
| `packages/partner-core/src/services/PartnerService.ts` | 73 |
| `packages/partner-core/src/services/PartnerSettlementService.ts` | 56 |
| `packages/partner-core/src/services/index.ts` | 8 |
| `packages/partner-core/src/utils/index.ts` | 11 |
| `packages/partner-core/src/utils/product-type-filter.ts` | 24 |
| `packages/platform-core/src/store-identity/constants/reserved-slugs.ts` | 1 |
| `packages/platform-core/src/store-identity/entities/platform-store-slug.entity.ts` | 1 |
| `packages/security-core/src/service-configs.ts` | 2 |
| `packages/shared-space-ui/src/guide/copy/neture.ts` | 9 |
| `packages/shared-space-ui/src/guide/index.ts` | 1 |
| `packages/shared-space-ui/src/legal/PublicContactForm.tsx` | 1 |
| `packages/store-ui-core/src/components/supply-catalog/SupplyCatalogHub.tsx` | 1 |
| `packages/store-ui-core/src/config/storeMenuConfig.ts` | 1 |
| `packages/types/src/affiliate.ts` | 41 |
| `packages/types/src/api.ts` | 1 |
| `packages/types/src/auth/index.ts` | 1 |
| `packages/types/src/auth/permissions.ts` | 7 |
| `packages/types/src/auth/roles.ts` | 9 |
| `packages/types/src/business-registration.ts` | 2 |
| `packages/types/src/dashboard.ts` | 1 |
| `packages/types/src/index.ts` | 12 |
| `packages/types/src/partner.ts` | 19 |
| `packages/ui/src/layout/AGStorefrontLayout.tsx` | 13 |
| `packages/ui/src/layout/GlobalHeader.tsx` | 1 |
| `packages/utils/src/accessControl.ts` | 1 |
| `scripts/lint-ratchet.mjs` | 1 |
| `scripts/reset/O4O-RESET-DRYRUN-V1.sql` | 8 |
| `scripts/rollback-phase1.sh` | 8 |
| `scripts/rollback-phase2.sh` | 1 |
| `services/web-account/src/components/UserProfileCard.tsx` | 1 |
| `services/web-k-cosmetics/src/App.tsx` | 6 |
| `services/web-k-cosmetics/src/components/auth/MembershipGate.tsx` | 4 |
| `services/web-k-cosmetics/src/components/layouts/DashboardLayout.tsx` | 8 |
| `services/web-k-cosmetics/src/pages/ContactPage.tsx` | 2 |
| `services/web-k-cosmetics/src/pages/PartnerInfoPage.tsx` | 4 |
| `services/web-k-cosmetics/src/pages/RoleNotAvailablePage.tsx` | 2 |
| `services/web-k-cosmetics/src/pages/admin/ContactInquiriesPage.tsx` | 1 |
| `services/web-k-cosmetics/src/pages/admin/KCosmeticsAdminMembersPage.tsx` | 1 |
| `services/web-k-cosmetics/src/pages/operator/EditUserModal.tsx` | 2 |
| `services/web-k-cosmetics/src/pages/operator/OperatorContactInquiriesPage.tsx` | 1 |
| `services/web-k-cosmetics/src/pages/operator/UsersPage.tsx` | 1 |
| `services/web-k-cosmetics/src/pages/store/StoreRecruitmentApplicationsPage.tsx` | 3 |
| `services/web-kpa-society/src/App.tsx` | 6 |
| `services/web-kpa-society/src/api/contactRequest.ts` | 1 |
| `services/web-kpa-society/src/pages/contact/ContactModal.tsx` | 9 |
| `services/web-kpa-society/src/pages/contact/ContactPage.tsx` | 1 |
| `services/web-kpa-society/src/pages/operator/CollaborationRequestsPage.tsx` | 2 |
| `services/web-kpa-society/src/pages/pharmacy/SellerRecruitmentsBrowsePage.tsx` | 4 |
| `services/web-kpa-society/src/pages/pharmacy/StoreRecruitmentApplicationsPage.tsx` | 3 |
| `services/web-kpa-society/src/utils/referral.ts` | 3 |
| `services/web-neture/public/robots.txt` | 2 |
| `services/web-neture/public/sitemap.xml` | 1 |
| `services/web-neture/src/App.tsx` | 91 |
| `services/web-neture/src/components/NetureGlobalHeader.tsx` | 3 |
| `services/web-neture/src/components/NetureUserMenu.tsx` | 6 |
| `services/web-neture/src/components/RegisterModal.tsx` | 4 |
| `services/web-neture/src/components/auth/ServiceApplyPanel.tsx` | 6 |
| `services/web-neture/src/components/auth/ServiceUsageGate.tsx` | 6 |
| `services/web-neture/src/components/auth/__tests__/ServiceUsageGate.test.tsx` | 10 |
| `services/web-neture/src/components/home/LatestUpdatesSection.tsx` | 6 |
| `services/web-neture/src/components/layouts/MainLayout.tsx` | 1 |
| `services/web-neture/src/components/layouts/PartnerAccountLayout.tsx` | 10 |
| `services/web-neture/src/components/layouts/PartnerSpaceLayout.tsx` | 17 |
| `services/web-neture/src/components/layouts/SupplierOpsLayout.tsx` | 2 |
| `services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx` | 3 |
| `services/web-neture/src/config/dashboard.ts` | 6 |
| `services/web-neture/src/config/navigation.ts` | 5 |
| `services/web-neture/src/config/operatorMenuGroups.ts` | 6 |
| `services/web-neture/src/config/seoRegistry.ts` | 3 |
| `services/web-neture/src/contexts/AuthContext.tsx` | 1 |
| `services/web-neture/src/contexts/__tests__/AuthContext.crossTab.test.tsx` | 1 |
| `services/web-neture/src/lib/__tests__/home-entry.service-states.test.ts` | 18 |
| `services/web-neture/src/lib/api/admin.ts` | 47 |
| `services/web-neture/src/lib/api/contact.ts` | 1 |
| `services/web-neture/src/lib/api/dashboard.ts` | 7 |
| `services/web-neture/src/lib/api/index.ts` | 23 |
| `services/web-neture/src/lib/api/neture.ts` | 14 |
| `services/web-neture/src/lib/api/partner.ts` | 60 |
| `services/web-neture/src/lib/api/supplier.ts` | 24 |
| `services/web-neture/src/lib/home-entry.ts` | 15 |
| `services/web-neture/src/lib/neture-service-state.ts` | 2 |
| `services/web-neture/src/lib/referral.ts` | 1 |
| `services/web-neture/src/lib/role-constants.ts` | 14 |
| `services/web-neture/src/lib/work-scope/routeWorkspaceMap.ts` | 3 |
| `services/web-neture/src/lib/work-scope/types.ts` | 5 |
| `services/web-neture/src/pages/CommunityPage.tsx` | 1 |
| `services/web-neture/src/pages/ContactPage.tsx` | 4 |
| `services/web-neture/src/pages/O4OHomePage.tsx` | 3 |
| `services/web-neture/src/pages/PartnerInfoPage.tsx` | 15 |
| `services/web-neture/src/pages/PartnerLandingPage.tsx` | 9 |
| `services/web-neture/src/pages/PartnerOverviewInfoPage.tsx` | 5 |
| `services/web-neture/src/pages/SupplierLandingPage.tsx` | 1 |
| `services/web-neture/src/pages/admin-vault/VaultInquiriesPage.tsx` | 3 |
| `services/web-neture/src/pages/admin/AdminCommissionsPage.tsx` | 2 |
| `services/web-neture/src/pages/admin/AdminContactMessagesPage.tsx` | 2 |
| `services/web-neture/src/pages/admin/AdminPartnerDetailPage.tsx` | 10 |
| `services/web-neture/src/pages/admin/AdminPartnerMonitoringPage.tsx` | 18 |
| `services/web-neture/src/pages/admin/AdminPartnerSettlementsPage.tsx` | 51 |
| `services/web-neture/src/pages/guide/GuideFeaturePartnerProgramPage.tsx` | 5 |
| `services/web-neture/src/pages/guide/GuideHomePage.tsx` | 4 |
| `services/web-neture/src/pages/guide/index.ts` | 1 |
| `services/web-neture/src/pages/hub/HubPage.tsx` | 16 |
| `services/web-neture/src/pages/operator/EditUserModal.tsx` | 2 |
| `services/web-neture/src/pages/operator/HomepageCmsPage.tsx` | 2 |
| `services/web-neture/src/pages/operator/MarketTrialApprovalDetailPage.tsx` | 1 |
| `services/web-neture/src/pages/operator/NetureOperatorDashboard.tsx` | 1 |
| `services/web-neture/src/pages/operator/OperatorContactMessagesPage.tsx` | 6 |
| `services/web-neture/src/pages/operator/OperatorPartnerApprovalPage.tsx` | 15 |
| `services/web-neture/src/pages/operator/UsersManagementPage.tsx` | 2 |
| `services/web-neture/src/pages/operator/registrations/RegistrationRequestsPage.tsx` | 2 |
| `services/web-neture/src/pages/operator/settings/EmailNotificationSettingsPage.tsx` | 3 |
| `services/web-neture/src/pages/partner/PartnerAccountDashboardPage.tsx` | 12 |
| `services/web-neture/src/pages/partner/PartnerContentsPage.tsx` | 9 |
| `services/web-neture/src/pages/partner/PartnerHubDashboardPage.tsx` | 26 |
| `services/web-neture/src/pages/partner/PartnerLinksPage.tsx` | 6 |
| `services/web-neture/src/pages/partner/PartnerOverviewPage.tsx` | 33 |
| `services/web-neture/src/pages/partner/PartnerRecruitmentApplicationsPage.tsx` | 7 |
| `services/web-neture/src/pages/partner/PartnerSettlementBatchPage.tsx` | 13 |
| `services/web-neture/src/pages/partner/PartnerStoresPage.tsx` | 5 |
| `services/web-neture/src/pages/partner/ProductPoolPage.tsx` | 8 |
| `services/web-neture/src/pages/partner/PromotionsPage.tsx` | 2 |
| `services/web-neture/src/pages/partner/ReferralLinksPage.tsx` | 4 |
| `services/web-neture/src/pages/partner/SettlementsPage.tsx` | 8 |
| `services/web-neture/src/pages/partners/requests/PartnershipRequestCreatePage.tsx` | 6 |
| `services/web-neture/src/pages/partners/requests/PartnershipRequestDetailPage.tsx` | 7 |
| `services/web-neture/src/pages/partners/requests/PartnershipRequestListPage.tsx` | 9 |
| `services/web-neture/src/pages/store/QrLandingPage.tsx` | 2 |
| `services/web-neture/src/pages/supplier/SupplierDashboardPage.tsx` | 1 |
| `services/web-neture/src/pages/supplier/SupplierPartnerCommissionsPage.tsx` | 10 |
| `services/web-neture/src/pages/supplier/SupplierProfilePage.tsx` | 4 |
| `services/web-neture/src/pages/supplier/SupplierRecruitmentDetailPage.tsx` | 2 |
| `services/web-neture/src/pages/supplier/index.ts` | 1 |
| `services/web-pharmacy-hub/src/App.tsx` | 5 |
| `services/web-pharmacy-hub/src/pages/store-owner/RecruitmentApplicationsPage.tsx` | 3 |

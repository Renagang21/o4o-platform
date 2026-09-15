# CHECK-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1

> **상태**: COMPLETED (실행 기록)
> **작성일**: 2026-09-15
> **근거 WO**: `WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1`
> **상위 정본**: [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §7 · §9 — `CURRENT PARTNER = FULL RETIREMENT / FUTURE PARTNER = GREENFIELD`
> **선행 기록**: [`IR-O4O-ROLE-WORKSPACE-REFACTOR-PREFLIGHT-V1`](../ir/IR-O4O-ROLE-WORKSPACE-REFACTOR-PREFLIGHT-V1.md) (모집단은 재사용하지 않고 §1 에서 다시 산출)
> **기준 commit**: `585c03eb52d004f51204d42b7c64bc41e18bd200` (HEAD == origin/main · clean · 타 세션 미추적 zip 1건 불가침)
> **실행 commit**: `7efe5b6a5` (280 files · +2,044 / −22,163)

---

## 0. 결과

```text
LEGACY_PARTNER_RUNTIME = RETIRED
SELLER_RECRUITMENT     = PASS   (Supplier → Operator exposure → Store browse/apply → Supplier approve/reject/terminate 계약 재확인)
FOREIGN_VISITOR        = UNCHANGED
MARKET_TRIAL_PARTNER   = RUNTIME_REMOVED (신규 Partner 참여 경로 0 · row 0 · participantType 컬럼은 varchar(20) 라 DB enum 없음)
DB_WRITE               = 0
DDL                    = 0

LEGACY_PARTNER_FRONTEND_RUNTIME = 0
LEGACY_PARTNER_BACKEND_RUNTIME  = 0
LEGACY_PARTNER_AUTH_ENTRY       = 0
LEGACY_PARTNER_HOME_ENTRY       = 0
FUTURE_PARTNER_COMPAT_LAYER     = 0
DB_SCHEMA_PHYSICAL_REMAINS      = §8 목록 (후속 cleanup 만 허용)

NEXT = GO_PARTNER_PHYSICAL_CLEANUP
```

---

## 1. Fresh Census (최신 `origin/main` `585c03eb5` 기준)

`git grep -il partner -- apps packages services scripts .github` (dist · map · migrations · bootstrap · HFF/의약품 데이터 · docs 제외) → **373 파일** → 의미별 5분류.

| 분류 | 건수(대표) | 내용 |
|---|---|---|
| **A. LEGACY_PARTNER_DELETE** | 백엔드 파일 33 삭제 + 공유 파일 60여 곳 수정 · 프런트 파일 30 삭제 + 40여 곳 수정 | §2 · §3 |
| **B. SELLER_RECRUITMENT_KEEP_AND_EXTRACT** | 엔티티 2 · 서비스 1 · 컨트롤러 1 · 소비 화면 6 · API 클라이언트 1 | §4 |
| **C. KEEP_OTHER_DOMAIN** | foreign-visitor-partner 22 파일 · 문의 유형 enum · 콘텐츠 소유자 enum · 승인 거래처(ContactVisibility.PARTNERS) · 협력사 로고 CMS 섹션 · 예약 slug | §7 |
| **D. HISTORICAL_ONLY** | migration 48 · schema baseline · historical manifest · reset/rollback 스크립트 · docs 기록물 | 무변경 |
| **E. PHYSICAL_CLEANUP_DEFERRED** | 테이블 12 · 컬럼 4 · PG enum 4 · dead package 2 · lockfile · `partnerops` 빌드 잔여 | §8 |

이름 충돌(HFF "partner 성분" 60여 파일 · 의약품 영문 원문)은 모집단에서 **제외**했다(Preflight IR §B-5 와 동일 판정).

---

## 2. A. Legacy Partner — 백엔드 삭제 · 수정

### 2-1. 삭제 (git rm)

| 경로 | 내용 |
|---|---|
| `routes/partner.routes.ts` · `controllers/partner/partnerController.ts` | `/api/partner` (Phase K) |
| `modules/partner/**` (15) | `/api/v1/partner` Partner Dashboard API (entities `partner_contents/events/targets` — 테이블 부재) |
| `modules/neture/controllers/{partner,partner-dashboard,partner-commerce,partner-recruitment,admin-partner,operator-partner,supplier-contract}.controller.ts` | 파트너 대시보드 · 상품풀 · 링크 · 정산 · 관리자 모니터링 · 운영자 승인 · 공급자 seller-partner 계약 |
| `modules/neture/services/{partner,partner-commission,partner-contract,partnership,neture-partner-service-application}.service.ts` | (partner-contract 는 §4 로 판매자 모집만 추출 후 삭제) |
| `modules/neture/entities/{NeturePartnerDashboardItem,NeturePartnerDashboardItemContent,NeturePartnershipRequest,NeturePartnershipProduct,NetureSellerPartnerContract,NeturePartnerRecruitment,NeturePartnerApplication}.entity.ts` | 뒤 2종은 §4 의 새 엔티티로 대체 |
| `routes/neture/entities/neture-partner.entity.ts` | `neture.neture_partners` (seller/supplier/partner 통합 legacy 엔티티) |
| `__tests__/partner-application-retirement.spec.ts` | 삭제된 모듈을 읽던 guard → §6 의 새 guard spec 으로 대체 |

### 2-2. 수정 (공유 파일 — partner 분기만 제거)

| 파일 | 변경 |
|---|---|
| `bootstrap/register-routes.ts` · `server.ts` | `/api/partner` · `/api/v1/partner` mount 제거 · endpoints 안내 · `partner.neture.co.kr` CORS origin 제거 |
| `database/entities.ts` | Legacy 엔티티 11종 등록 해제 · `SellerRecruitment` 2종 등록 |
| `modules/neture/neture.routes.ts` | partner/operator-partner/supplier-contract mount 제거 · `/partnership/requests*` 제거 · **`/seller-recruitment` canonical + `/partner` alias mount** |
| `modules/neture/neture.service.ts` | 파트너/제휴 위임 메서드 제거 · `SellerRecruitmentService` 위임 3종 |
| `neture-dashboard.service.ts` · `operator-dashboard.controller.ts` · `admin-dashboard.controller.ts` · `operator-action-queue.controller.ts` · `operator-ai-action.service.ts` · `hub-trigger.controller.ts` | 파트너 KPI · 제휴 요청 통계 · `manage-partnership` 트리거 · `serviceStatus.partners → organizations` |
| `neture-identity.middleware.ts` (+test) | `requireActivePartner/LinkedPartner` · `PartnerRequest` 제거 |
| `neture-service-state.service.ts` (+test) · `neture-home-entry.controller.ts` | `serviceStates = { supplier }` (partner 필드 은퇴) |
| `operator-registration.service.ts` (+test) | 승인/반려 시 `neture.neture_partners` write 제거 · high-priority 판정에서 partner 제거 |
| `seller.controller.ts` · `seller.service.ts` | `createPartnerContractController` · referral attribution(`partner_referrals`/`partner_commissions` write) 제거 |
| `supplier-settlement.controller.ts` · `admin-settlement.controller.ts` | `/partner-commissions` CRUD · admin `/commissions/*` 제거 (공급자 정산 `/settlements/*` 유지) |
| `routes/neture/{controllers/neture.controller,services/neture.service,repositories/neture.repository,dto/index,entities/neture-product.entity,entities/index}.ts` | legacy `/partnership/requests*` · Partner CRUD · `NetureProduct.partnerId/partner` 관계 · commission auto-trigger 제거 |
| `controllers/admin/adminDashboardController.ts` · `routes/admin/dashboard.routes.ts` | `/admin/partners*` · `/admin/cosmetics/partner-metrics` 제거, `OWNED_PREFIXES` 축소 |
| `types/roles.ts` · `config/service-scopes.ts` · `modules/auth/entities/User.ts` · `modules/auth/services/role-assignment.service.ts` · `utils/scope-assignment.utils.ts` · `types/auth.ts` · `routes/users.routes.ts` · `routes/admin/users.routes.ts` · `entities/RoleApplication.ts` | `neture:partner` · `cosmetics:partner` · bare `partner` role · `*:partners:*` scope · `isPartner()` · permission preset 제거 |
| `modules/auth/controllers/auth-register.controller.ts` | Neture 가입 신청 role = `['supplier']` |
| `entities/checkout/CheckoutOrder.entity.ts` · `services/checkout.service.ts` · `controllers/admin/adminOrderController.ts` · `routes/cosmetics/controllers/cosmetics-order.controller.ts` | `partnerId` 매핑/DTO/필터 제거 (`createOrder()` 단일 지점 계약 불변) |
| `modules/store/entities/store-product.entity.ts` | `is_partner_recruiting` 매핑 제거 |
| `entities/OperatorNotificationSettings.ts` · `middleware/metrics.middleware.ts` · `services/ai-prompts/homeChat.ts` · `utils/work-scope-store-resolution.ts` · `modules/service-legal/service-legal-scope.ts` · `modules/neture/controllers/contact.controller.ts` · `.env.example` | `partnerApplication` 알림 키 · `active_partners_count`/`commissions_in_progress` gauge · '파트너 업무 공간' 프롬프트 · partner workspace · 정책문서 유형 'partner' · 문의 유형 'partner' 신규 접수 종료 · `ENABLE_PARTNER_SETTLEMENT` |
| `app-manifests/appsCatalog.ts` | `partner-core` 앱 항목 · `partnerops` serviceGroup 제거 (App Store 노출 0) |
| `routes/kpa/services/operator-dashboard.service.ts` | 물리 테이블명을 `SELLER_RECRUITMENT_TABLE` 상수로 참조 |
| `modules/platform/platform-hub.controller.ts` · `packages/ai-core action-keys.ts` · `BASELINE-OPERATOR-OS-V1` L83 | `neture.trigger.manage_partnership` 은퇴 |

---

## 3. A. Legacy Partner — 프런트 · 패키지

| 앱/패키지 | 삭제 | 수정 |
|---|---|---|
| **web-neture** | `pages/partner/**`(12) · `pages/partners/**`(3) · `PartnerLandingPage` · `PartnerOverviewInfoPage` · `PartnerInfoPage` · `PartnerSpaceLayout` · `PartnerAccountLayout` · `admin/{AdminPartnerMonitoring,AdminPartnerDetail,AdminPartnerSettlements,AdminCommissions}Page` · `operator/OperatorPartnerApprovalPage` · `supplier/SupplierPartnerCommissionsPage` · `guide/GuideFeaturePartnerProgramPage` · `lib/api/partner.ts` · `lib/referral.ts` | `App.tsx`(/partner/* · /account/partner/* · /workspace/partners/* · admin/operator partner routes · redirect · WORKSPACE_PREFIXES) · `lib/api/{index,admin,dashboard,neture,supplier,contact}.ts` · `lib/home-entry.ts`(EntryGroup 'partner' · NETURE_SERVICE_INFO.partner · serviceStates.partner · join/status) · `lib/neture-service-state.ts` · `lib/role-constants.ts`(PARTNER role 상수 4종) · `lib/work-scope/{types,routeWorkspaceMap}.ts` · `components/auth/{ServiceUsageGate,ServiceApplyPanel}.tsx` · `components/{NetureUserMenu,NetureGlobalHeader,RegisterModal}.tsx` · `components/home/LatestUpdatesSection.tsx` · `config/{navigation,dashboard,seoRegistry,operatorMenuGroups}.ts` · `components/layouts/{SupplierSpaceLayout,SupplierOpsLayout,MainLayout}.tsx` · `pages/{O4OHomePage,CommunityPage,ContactPage}.tsx` · `pages/hub/HubPage.tsx` · `pages/guide/{GuideHomePage,index}.ts(x)` · `pages/operator/{UsersManagementPage,EditUserModal,HomepageCmsPage,NetureOperatorDashboard,MarketTrialApprovalDetailPage,registrations/RegistrationRequestsPage,settings/EmailNotificationSettingsPage}.tsx` · `pages/store/{QrLandingPage,StoreProductPage}.tsx` · `pages/supplier/{SupplierDashboardPage,SupplierProfilePage,SupplierRecruitmentDetailPage,index}.ts(x)` · `public/{robots.txt,sitemap.xml}` · tests 2 |
| **admin-dashboard** | `pages/neture/{PartnerList,PartnerDetail,PartnershipRequestList,PartnershipRequestDetail}Page.tsx` | `NetureRouter.tsx` · `routes/apps.routes.tsx` · `api/admin-apps.ts`('partnerops') · `pages/apps/AppStorePage.tsx` · `pages/users/{ActiveUsers,UserDetail}.tsx` · `lib/rbac-catalog.ts` · `pages/test/ApiResponseChecker.tsx` · tests 4 |
| **web-k-cosmetics** | — | `PartnerInfoPage → SupplierInfoPage`(파트너 카드 제거 · `/partners → /suppliers` redirect) · `App.tsx` · `DashboardLayout.tsx`(partner 메뉴 config) · `RoleNotAvailablePage.tsx` · operator/admin 회원 유형 'partner' 3곳 |
| **web-kpa-society** | — | `utils/referral.ts`(ReferrerType 'partner' 제거) · 판매자 모집 2화면 경로 (§4) |
| **web-pharmacy-hub** | — | 판매자 모집 1화면 경로 (§4) |
| **web-account** | — | `UserProfileCard.tsx` 'neture:partner' 라벨 |
| **packages/types** | `src/partner.ts` · `src/affiliate.ts` | `index.ts` · `auth/{roles,permissions,index}.ts`(`ROLES.PARTNER` · `PARTNERSHIP_ROLES` · partners 권한) · `dashboard.ts` · `api.ts` · `business-registration.ts` |
| **packages/ui** | `layout/AGStorefrontLayout.tsx`(Partner storefront, `check-literal-consumers` 0) | `layout/index.ts` |
| **packages/security-core** | — | `NETURE_SCOPE_CONFIG` 'neture:partner' 제거 (F1 baseline security-core — 구조 변경 아님, allowedRoles 1항목·mapping 1항목) |
| **packages/market-trial** | — | §5 |
| **packages/{auth-utils,auth-client,utils,operator-core,operator-ux-core,operator-core-ui,account-ui,store-ui-core,shared-space-ui,ai-core}** | — | role 우선순위/대시보드 맵 · `EnrollmentRole` · 회원 유형 옵션 · threshold · 배지 · 정책문서 유형 · `partner_application` 요청 배지 · guide copy(파트너 프로그램 섹션·항목) · action key |

---

## 4. B. Seller Recruitment 추출 (삭제 금지 · Partner 명칭/의존 분리)

### 4-1. 새 도메인

| 신규 | 내용 |
|---|---|
| `modules/neture/entities/SellerRecruitment.entity.ts` | 구 `NeturePartnerRecruitment`. `@Entity(SELLER_RECRUITMENT_TABLE)` — 물리명 `neture_partner_recruitments` 는 **이 파일의 상수만** 안다 (temporary legacy persistence seam) |
| `modules/neture/entities/SellerRecruitmentApplication.entity.ts` | 구 `NeturePartnerApplication`. `applicantId ← partner_id` · `applicantName ← partner_name` 컬럼 매핑 |
| `modules/neture/services/seller-recruitment.service.ts` | 구 `partner-contract.service.ts` 의 모집·신청·노출승인·C bridge·알림만 추출 |
| `modules/neture/controllers/seller-recruitment.controller.ts` | 상대 경로 `/recruitments*` · `/applications*` — mount `/seller-recruitment`(canonical) + `/partner`(배포 창 alias) |

### 4-2. Legacy Partner 의존 제거 (WO §6)

| 구 동작 (approvePartnerApplication) | 새 동작 (approveApplication) |
|---|---|
| `neture_seller_partner_contracts` 생성 + `ACTIVE_CONTRACT_EXISTS` 검사 | **제거** |
| `neture_partner_dashboard_items` 자동 등록 | **제거** |
| `roleAssignmentService.assignRole({ role: 'partner' })` + membership 활성화 | **제거** — 매장 신청 ≠ Partner 계정 · role · 계약 |
| C bridge(`allowed_seller_ids += 신청자` · 매장 OPL `source_type='seller_recruitment'`) | **유지** = 승인의 실제 결과 |
| 신청자 알림 `recruitment.application_approved` | 유지 (targetUrl 은 매장 셸 경로만: `/store/commerce/recruitment-applications` · PH `/store-owner/recruitment-applications`) |

참여 해지(`terminateParticipation`): 과거 `neture_seller_partner_contracts.contract_status='terminated'` 로 파생 → 이제 **신청 행 자체가 종결 상태 보유**: `status='cancelled' + decided_by=공급자` (신청자 본인 철회는 `decided_by=신청자`). DB enum 추가 없음(DDL 0). 응답 `participationTerminated` 플래그는 유지되어 매장/공급자 화면 계약 불변 (`StoreRecruitmentApplicationsView` · `SupplierRecruitmentDetailPage` 는 서버 플래그만 신뢰하도록 정정). 프로덕션 신청 row 0건이라 데이터 전환 없음.

### 4-3. 소비처 재배선

| 소비처 | 변경 |
|---|---|
| `web-kpa-society` `SellerRecruitmentsBrowsePage` · `StoreRecruitmentApplicationsPage` | `/neture/partner/applications*` → `/neture/seller-recruitment/applications*` |
| `web-pharmacy-hub` `RecruitmentApplicationsPage` · `web-k-cosmetics` `StoreRecruitmentApplicationsPage` | 동일 |
| `web-neture` `lib/api/supplier.ts`(8 경로) · `SupplierRecruitmentDetailPage` | `/neture/seller-recruitment/*` · 응답 필드 `partnerId/Name/Email → applicantId/Name/Email` |
| `operator-recruitment-exposure.controller` · `service-recruitment-exposure-proxy.controller` · `store-seller-recruitment-browse.controller` · KPA `operator-dashboard.service` | `NetureService` 위임 → `SellerRecruitmentService` (엔드포인트 불변) |

### 4-4. E2E 계약 독립 재확인 (코드 추적)

```text
Supplier   POST  /neture/seller-recruitment/recruitments           requireAuth + requireActiveSupplier → createRecruitment (PRIVATE offer · 약국 gate · 서비스당 1 row · exposure=pending)
Operator   GET   /neture/operator/recruitment-exposure?…            getRecruitmentsForExposureReview
           PATCH /neture/operator/recruitment-exposure/:id/approve  setRecruitmentExposure (per-service proxy 는 serviceKey 고정)
Store      GET   /kpa/store/seller-recruitments (proxy)             getRecruitments(exposure=APPROVED · status=recruiting · serviceKey)
           POST  /neture/seller-recruitment/applications            createApplication (RECRUITING · APPROVED 노출 · 중복 차단)
           GET   /neture/seller-recruitment/applications/mine       getApplicationsForApplicant
           POST  …/applications/:id/cancel                          cancelApplication (본인 pending)
Supplier   GET   …/recruitments/mine · …/recruitments/:id/applications
           POST  …/applications/:id/approve | reject | terminate    approveApplication(C bridge) · rejectApplication · terminateParticipation
```

alias `/neture/partner/*` 는 같은 라우터라 배포 순서(web ↔ API Cloud Run 독립)에 관계없이 404 가 나지 않는다. alias 는 physical cleanup 에서 제거한다.

---

## 5. Market Trial `ParticipantType.PARTNER` (WO §9)

Fresh census:

- 신규 생성 경로: api-server `marketTrialController.ts` 가 `participantType: 'store_owner'` 고정 → **Partner 참여 경로 0**. 패키지 자체 Express 컨트롤러(`packages/market-trial/src/controllers/MarketTrialController.ts`)는 **mount 되지 않는다**(register-routes 는 api-server 컨트롤러만 사용).
- API 입력 허용: 패키지 컨트롤러의 `participantType==='partner'` 분기 · `/:id/decision/partner` · `submitPartnerDecision` · `validatePartnerDecisionRequest` → **제거**.
- UI: `MarketTrialApprovalDetailPage` 라벨 · operator CSV 라벨 '파트너' → 제거. `ForumUserRole.PARTNER` · `ForumUserContext.partnerId` → 제거.
- production row: `market_trial_participants` / `market_trial_decisions` `participantType='partner'` = **0**.
- 컬럼 `participantType` 은 `varchar(20)` — **DB enum 없음**. `market_trial_decisions.selectedSellerIds`(Partner 결정 전용 컬럼)는 물리 컬럼으로 잔존 → §8.
- 판정: **RUNTIME_REMOVED**. 기본 참여축 `STORE_OWNER`(legacy `SELLER` fallback) 만 남는다.

---

## 6. 검증

| 항목 | 결과 |
|---|---|
| `pnpm run build:packages` + UI 패키지 6종 재빌드 | EXIT 0 |
| `tsc --noEmit` api-server · web-neture · web-k-cosmetics · web-kpa-society · web-pharmacy-hub · web-account · admin-dashboard · market-trial · security-core | **0 errors** (9/9) |
| jest api-server (targeted 15 suites) | 331 passed / 0 failed — neture-service-state · operator-registration.roleContract · neture-identity.middleware · scope-guard · legacy-role · partnerops-registry · public-appstore-read · auth-runtime-and-legacy-package · neture-asset-mount · home-chat-ai-input · work-scope-store-resolution · role-admin-tier · MembershipApprovalService.bareRoleContract · admin-route-auth-boundary · **legacy-partner-runtime-retirement.spec.ts(신규 47)** |
| vitest web-neture (`ServiceUsageGate` · `home-entry.service-states` · `AuthContext.crossTab`) | 21 passed |
| vitest auth-client `client-refresh-race` | 7 passed |
| vitest admin-dashboard (closure/boundary tests 5 suites) | 152 passed |
| `node scripts/lint-ratchet.mjs` | 46 errors (baseline 51) → 스크립트 안내대로 `ERROR_BASELINE` 46 으로 하향 |
| 프로덕션 read-only 재확인 (Cloud SQL Auth Proxy · SELECT 만) | partner 테이블 13종 0행 · `role_assignments` partner-ish **active 0** (비활성 이력 row 3건 잔존) · `service_memberships.role='partner'` 0 · `checkout_orders.partnerId` 0 · `store_products.is_partner_recruiting` 0 · `neture.neture_products.partner_id` 0 · market_trial partner 0 · `neture_contact_messages.contactType='partner'` 0 · `app_registry` partner-core 0 · PG enum partner-ish 4종 존재 |
| 브라우저 smoke | **미수행** — 이번 WO 는 은퇴(삭제) 중심이며 남은 경로는 컴파일·단위·계약 테스트로 고정. 판매자 모집 실사용 smoke 는 physical cleanup 전 매장 계정(renagang21)으로 별도 확인 권장 |

### 6-1. 신규 guard spec

`apps/api-server/src/__tests__/legacy-partner-runtime-retirement.spec.ts` — 은퇴 파일 34건 부재 · mount 부재 · 엔티티 미등록 · `neture:partner` scope 부재 · Neture 가입 role supplier 만 · SellerRecruitment 엔티티/seam 상수 · canonical+alias mount · 서비스가 Partner 계약/role/대시보드를 만들지 않음 · 매장 3서비스 web 의 새 경로 · Foreign Visitor Partner 보존.

---

## 7. 재-census 잔류 (WO §17) — 전부 설명 가능

최신 working tree `git grep -il partner`(동일 제외 규칙, partner-core/financial-core 제외) → 152 파일 중 코드 본문 잔류 61 파일. 분류:

| 분류 | 잔류 | 근거 |
|---|---|---|
| **ALLOWED_OTHER_DOMAIN** | `modules/foreign-visitor-partner/**` · 매장 3서비스 `ForeignVisitor*` 화면/API (22) | Store Ops(`organization_id + service_key`), WO §8 무변경 |
| | `NetureContactMessage.ContactType 'partner'` · operator/admin 문의 목록 라벨·필터(`OperatorContactMessagesPage` · `AdminContactMessagesPage` · `operator-contact.controller` · `operator-action-queue` mark-read scope · `lib/api/admin.ts` 필터 타입) | 문의 유형 값(기존 row 표시 호환). **신규 접수는 종료**(`contact.controller VALID_CONTACT_TYPES` · web-neture ContactPage · `lib/api/contact.ts`). 프로덕션 row 0 |
| | `PlatformInquiry 'partnership'` · `contact-inquiry 'partnership'`(공급·제휴 문의) · KPA `ContactRequest 'partner'`(운영자/단체 협력 문의) · `VaultInquiriesPage` · shared-space-ui `PublicContactForm` · K-Cos ContactPage | 일반 제휴/협력 **문의** 카테고리 — Legacy Partner 프로그램과 무관 |
| | `ContactVisibility.PARTNERS` · `SupplierProfilePage 'partners'` 옵션 · `supplier.service` 승인 거래처 판정 | 물리 enum 값 = "PRIVATE 공급 승인 거래처". 내부 명칭은 `hasApprovedPrivateSupply` · `isApprovedBuyer` · API `hasApprovedBuyers` / `approved_buyer(s)_*` 로 정정, UI 라벨 '승인 거래처만' |
| | `ContentOwnerType.PARTNER`(content-core · admin content policies) | 콘텐츠 소유자 유형(외부 제공 자산) — F5 계열 |
| | `metadataSection 'partner-logo'` · `HomepageCmsPage` 협력사 로고 탭 · promotion docs | 홈 협력사 로고 CMS 섹션(DB metadata key) |
| | `platform-core reserved-slugs 'partner'` | URL 예약어 — 축소는 slug 충돌 위험 |
| | `partners@neture.co.kr` · `partner@k-cosmetics.site` | 대외 연락처 문자열(메일 계정 변경은 운영 결정) |
| | 은퇴 사실을 적은 주석 · 테스트(guard spec · 은퇴 회귀 검사) | 은퇴 계약 고정 |
| **HISTORICAL_ONLY** | `database/migrations/**`(48) · `canonical-schema-baseline.ts` · `historical-migration*` · `apps/api-server/migrations/20251107_add_partner_fields_to_orders.sql` · `scripts/reset/O4O-RESET-DRYRUN-V1.sql` · `scripts/rollback-phase{1,2}.sh` · `apps/api-server/scripts/reset-product-test-data.sql` · `.github/workflows/ci-pipeline.yml` L71 주석 · `docs/checks·ir·investigations·work-orders·archive` · `apps/api-server/docs/**` | 이력 · 무변경 |
| **PHYSICAL_DB_DEFERRED** | `packages/partner-core/**` · `packages/financial-core/**` · `packages/partnerops/`(미추적 빌드 잔여) · `partnerops-registry-and-lint-gate-final-closure.spec` 의 partner-core 존재 고정 · `neture-asset-mount-and-dead-package-residue.spec` dead 목록 · `SellerRecruitment*.entity.ts` seam 상수 · `HFF/의약품 데이터` 는 이름 충돌 | §8 |

`packages/shared-space-ui/src/guide/copy/neture.ts` 의 서술형 안내(공급자 소개 · 3주체 설명)에서 "파트너" 를 행위 주체로 적은 항목·문장(20여 곳)은 **행위 주체 표현만 제거**했다(가이드 시리즈 재작성 아님 — 항목 삭제 · 단어 제거 · 단계 번호 정렬).

---

## 8. PHYSICAL_CLEANUP (후속 `WO-O4O-LEGACY-PARTNER-PHYSICAL-SCHEMA-AND-DEPENDENCY-CLEANUP-V1`)

프로덕션 실측 전부 0행 — forward migration 은 DROP/ALTER 만이며 데이터 손실 없음. **DDL 이므로 사용자 명시 승인** 후 CI/CD migration.

| 구분 | 대상 |
|---|---|
| DROP TABLE (12) | `neture_partner_dashboard_items` · `neture_partner_dashboard_item_contents` · `neture_partnership_products` · `neture_partnership_requests` · `neture_seller_partner_contracts` · `partner_commissions` · `partner_referrals` · `partner_settlement_items` · `partner_settlements` · `supplier_partner_commissions` · `neture.neture_partners`(FK `neture.neture_products.partner_id` 선처리) — `foreign_visitor_*` 는 **대상 아님** |
| RENAME (Seller Recruitment seam 해소) | `neture_partner_recruitments → seller_recruitments` · `neture_partner_applications → seller_recruitment_applications` · 컬럼 `partner_id → applicant_id` · `partner_name → applicant_name` · enum `neture_partner_recruitment_status_enum` · `neture_partner_recruitment_exposure_status_enum` · `neture_partner_application_status_enum` 이름 (값은 유지) · 엔티티 상수 `SELLER_RECRUITMENT_*_TABLE` 갱신 |
| DROP COLUMN (4) | `checkout_orders."partnerId"` · `store_products.is_partner_recruiting` · `neture.neture_products.partner_id` · `market_trial_decisions."selectedSellerIds"` |
| DROP TYPE (1) | `neture_partnership_status_enum` (+ 위 DROP TABLE 에 종속된 enum 확인) |
| 데이터 row | `role_assignments` 비활성 이력 3건(`partner`/`neture:partner`/`cosmetics:partner`) — 삭제 여부 판단 · `operator_notification_settings.notifications` json 의 `partnerApplication` 키(무해, 코드가 무시) |
| dead package | `packages/partner-core`(엔티티 6종 — 테이블 자체 없음) · `packages/financial-core`(commission engine) 삭제 + `pnpm-workspace` / `pnpm-lock.yaml` 갱신 + 존재 고정 테스트 2종 정정 + `packages/partnerops/` 미추적 빌드 잔여 정리(junction 여부 확인 후) |
| alias | `neture.routes.ts` `router.use('/partner', sellerRecruitmentRouter)` 제거 (web 배포 완료 확인 후) |
| docs | `NETURE-PARTNER-CONTRACT-FREEZE-V1` · `SELLER-PARTNER-CONTRACT-ARCHITECTURE-V1` archive 이동(SUPERSEDED 표기 완료) · `DROPSHIPPING-SETTLEMENT-MODEL.md` §2.4 · `EXTENSION-PARTNER-GUIDE.md`(외부 Extension 개발사 = 다른 의미, 판단 필요) · `ALPHA-STATUS-DISPLAY-STANDARD.md` §7.2/§10 · `O4O-ORGANIZATION-{MEMBERSHIP-ARCHITECTURE,ROLE-STANDARD}-V1` 의 partner 조직/role 절 · RBAC IR 기록 |

---

## 9. 문서 정합

| 문서 | 조치 |
|---|---|
| [`NETURE-PARTNER-CONTRACT-FREEZE-V1`](../baseline/NETURE-PARTNER-CONTRACT-FREEZE-V1.md) (구 F7) | **SUPERSEDED** 헤더(대체: ROLE-WORKSPACE-ARCHITECTURE §7). 본문 불변. archive 이동은 §8 |
| [`SELLER-PARTNER-CONTRACT-ARCHITECTURE-V1`](../architecture/SELLER-PARTNER-CONTRACT-ARCHITECTURE-V1.md) | SUPERSEDED 헤더(비등재 설계 기록) |
| [`CANONICAL-INDEX`](../CANONICAL-INDEX.md) | F7 행 → 은퇴(SUPERSEDED · 번호 재사용 없음) · §9 판정 대기 행 제거 |
| `CLAUDE.md` §14 F7 | 은퇴 표기(§ 번호 · F 번호 순서 불변) |
| [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §7 · §8 · §9-1 | runtime 은퇴 완료 · Seller Recruitment 분리 · physical cleanup 대기 반영 |
| [`BASELINE-OPERATOR-OS-V1`](../baseline/BASELINE-OPERATOR-OS-V1.md) L83 (F1) | `manage_partnership` 트리거 행 은퇴 표기 (본문 구조 불변) |
| [`RBAC-ROLE-CATALOG-V1`](../rbac/RBAC-ROLE-CATALOG-V1.md) · [`ROLE-POLICY-AND-GUARD-V1`](../baseline/ROLE-POLICY-AND-GUARD-V1.md) | `partner` · `neture:partner` 은퇴 표기 |
| [`GLOBAL-HEADER-STANDARD-V1`](../architecture/ui/GLOBAL-HEADER-STANDARD-V1.md) · [`O4O-AI-USAGE-FLOW-BASELINE-V1`](../baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md) · [`O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1`](../baseline/O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1.md) · [`OPERATOR-DASHBOARD-STANDARD-V1`](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md) · [`O4O-OPERATOR-CANONICAL-WORKFLOW-V1`](../architecture/O4O-OPERATOR-CANONICAL-WORKFLOW-V1.md) · [`OPERATOR-INTEGRATION-STATE-V1`](../architecture/OPERATOR-INTEGRATION-STATE-V1.md) · [`EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1`](../baseline/EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1.md) | Partner 를 현행 기능처럼 적은 행 1~3곳씩 은퇴 표기 |

`문서 정합: 발견 12건 / SUPERSEDED 표기 2건 / 링크 수정 0건 / 별도 WO 제안 1건(§8 docs 항목 — archive 이동 · 비등재 partner 설계/조직 문서 정리)`

---

## 10. Git

- path-specific stage(`git add -- <경로>`)만 사용. 타 세션 미추적 `output/minerock600-p1/*.zip` 불가침.
- 실행 commit: `7efe5b6a5013c495b6d6ca836f57ee6e0c35ed0e` — 본 SHA 기록은 후속 커밋. CI/CodeQL/Deploy 결과는 관례대로 후속 `docs(check)` 커밋으로 기록.

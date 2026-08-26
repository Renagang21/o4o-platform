/**
 * Route registration extracted from main.ts
 * WO-O4O-MAIN-TS-BOOTSTRAP-SPLIT-V1
 *
 * IMPORTANT: Route registration ORDER is critical.
 * Do NOT reorder any app.use() calls — path shadowing depends on order.
 *
 * Two phases:
 *   1. registerCoreRoutes()  — before server listen (sync core APIs)
 *   2. registerDomainRoutes() — after DB init (modules + domain APIs)
 */
import { Application } from 'express';
import { DataSource } from 'typeorm';
import logger from '../utils/logger.js';

// ============================================================================
// CORE ROUTE IMPORTS (registered before server listen)
// ============================================================================
import authRoutes from '../modules/auth/routes/auth.routes.js';
import serviceAuthRoutes from '../modules/auth/routes/service-auth.routes.js';
import guestAuthRoutes from '../modules/auth/routes/guest-auth.routes.js';
import lmsRoutes from '../modules/lms/routes/lms.routes.js';
// WO-O4O-LMS-AI-MINIMAL-V1
import aiRoutes from '../modules/ai/routes/ai.routes.js';
// WO-O4O-CREDIT-SYSTEM-V1
import creditRoutes from '../modules/credit/routes/credit.routes.js';
// WO-O4O-POINT-CORE-EXTENSION-V1
import pointRoutes from '../modules/point/routes/point.routes.js';
import { kpaLmsScopeGuard } from '../middleware/kpa-lms-scope-guard.js';
import usersRoutes from '../routes/users.routes.js';
import cptRoutes from '../routes/cpt.js';
import healthRoutes from '../routes/health.js';
import forumRoutes from '../routes/forum/forum.routes.js';
// WO-O4O-NOTIFICATION-CORE-BASELINE-V1: platform-wide notification core
import notificationsRoutes from '../routes/notifications.routes.js';
// WO-O4O-SURVEY-CORE-PHASE1-V1: O4O 공통 Survey (Participation Engine)
import surveyRoutes from '../modules/survey/routes/survey.routes.js';
// WO-O4O-APPRECIATION-POINT-LIKE-SYSTEM-PHASE1-V1
import appreciationRoutes from '../modules/appreciation/routes/appreciation.routes.js';
import settingsRoutes from '../routes/settingsRoutes.js';
import adminAppsRoutes from '../routes/admin/apps.routes.js';
// WO-O4O-ADMIN-APP-AVAILABILITY-READ-CONTRACT-FIX-V1: 인증 사용자용 앱 활성 상태(read-only)
import appAvailabilityRoutes from '../routes/app-availability.routes.js';
import adminUsersRoutes from '../routes/admin/users.routes.js';
// WO-O4O-ADMIN-PLATFORM-SETTINGS-SUPER-ADMIN-ACCOUNT-MANAGEMENT-V1: 관리자 계정 안전 유지관리(additive)
import adminPlatformAccountsRoutes from '../routes/admin/platform-accounts.routes.js';
// WO-O4O-PLATFORM-GLOBAL-USERS-READONLY-LIST-V1: 전체 사용자 read-only 조회(투영, additive)
import adminPlatformUsersRoutes from '../routes/admin/platform-users.routes.js';
// WO-O4O-SECURITY-IP-BLOCK-TTL-AND-UNBLOCK-V1
import adminSecurityBlockedIpsRoutes from '../routes/admin/security-blocked-ips.routes.js';

// ============================================================================
// DOMAIN ROUTE IMPORTS (registered after DB init)
// ============================================================================

import navigationRoutes from '../routes/navigation.routes.js';
import routesRoutes from '../routes/routes.routes.js';
import publicRoutes from '../routes/public.routes.js';
import platformInquiryRoutes, { adminRouter as platformInquiryAdminRoutes } from '../routes/v1/platformInquiry.routes.js';
import { createPlatformServicesRoutes } from '../routes/platform-services/platform-services.routes.js';
import { createAdminPlatformServicesRoutes } from '../routes/platform-services/admin-platform-services.routes.js';
import { createStoreNetworkRoutes } from '../routes/platform/store-network.routes.js';
import { createPhysicalStoreRoutes } from '../routes/platform/physical-store.routes.js';
import { createSlugRoutes } from '../routes/platform/slug.routes.js';
import { createStorePolicyRoutes } from '../routes/platform/store-policy.routes.js';
import { createUnifiedStorePublicRoutes } from '../routes/platform/unified-store-public.routes.js';
import { createStoreLocalProductRoutes } from '../routes/platform/store-local-product.routes.js';
import { createStoreTabletRoutes } from '../routes/platform/store-tablet.routes.js';
// WO-O4O-KPA-STORE-HANDLED-PRODUCTS-UNIFIED-VIEW-V1: 매장 취급제품 통합 조회
import { createStoreHandledProductsRoutes } from '../routes/platform/store-handled-products.routes.js';
import { createStoreCartRoutes } from '../routes/cart/store-cart.routes.js';
import userRoleRoutes from '../routes/user-role.routes.js';
import { createRoleApplicationController } from '../routes/v2/role-application.controller.js';
import organizationRoutes from '../routes/organization.routes.js';
// WO-O4O-LEGACY-YAKSA-ADMIN-AND-DOMAIN-FEATURES-FULL-REMOVAL-V1:
//   `/api/v1/membership` (@o4o/membership-yaksa) mount 와 그 관리자 guard 제거.
//   약사회 전용 회원 자격 도메인이며 다른 운영 서비스 소비처가 없다.
import marketTrialRoutes from '../routes/market-trial.routes.js';
import aiQueryRoutes from '../routes/ai-query.routes.js';
import aiProxyRoutes from '../routes/ai-proxy.routes.js';
import aiAdminRoutes from '../routes/ai-admin.routes.js';
import { MarketTrialController } from '../controllers/market-trial/marketTrialController.js';
import { MarketTrialOperatorController } from '../controllers/market-trial/marketTrialOperatorController.js';
import { createNetureOperatorTrialRoutes } from '../routes/market-trial-operator.routes.js';
import partnerRoutes from '../routes/partner.routes.js';
import { partnerDashboardRoutes } from '../modules/partner/index.js';
import checkoutRoutes from '../routes/checkout.routes.js';
import adminOrderRoutes from '../routes/admin-orders.routes.js';
import adminDashboardRoutes from '../routes/admin/dashboard.routes.js';
import operatorNotificationRoutes from '../routes/operator-notification.routes.js';
import operatorMembershipRoutes from '../routes/operator/membership.routes.js';
import operatorProductRoutes from '../routes/operator/products.routes.js';
import operatorStoreRoutes from '../routes/operator/stores.routes.js';
import operatorRoleRoutes from '../routes/operator/roles.routes.js';
import { createOperatorAnalyticsRoutes } from '../routes/operator/analytics.routes.js';
import { createCosmeticsRoutes } from '../routes/cosmetics/cosmetics.routes.js';
// WO-O4O-LEGACY-YAKSA-API-ROUTE-AND-DEAD-UI-REMOVAL-V1:
//   legacy `/api/v1/yaksa/*` (createYaksaRoutes) 제거. 소비처·운영 데이터 0으로 확정된 dead route 였다.
//   (`/api/v1/membership`·`@o4o/lms-yaksa` 도 이후 WO-O4O-LEGACY-YAKSA-ADMIN-AND-DOMAIN-FEATURES-FULL-REMOVAL-V1 에서 제거됨)
import { createGlycopharmRoutes } from '../routes/glycopharm/glycopharm.routes.js';
// WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
import { createPharmacyHubRoutes } from '../routes/pharmacy-hub/pharmacy-hub.routes.js';
// WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
import { createKpaBranchRoutes } from '../routes/kpa-branch/kpa-branch.routes.js';
import { createKpaRoutes, createKpaJoinPublicRoutes } from '../routes/kpa/kpa.routes.js';
import { createNetureRoutes } from '../routes/neture/neture.routes.js';
import createNetureModuleRoutes from '../modules/neture/neture.routes.js';
import netureLibraryRoutes from '../modules/neture/neture-library.routes.js';
import { createCatalogImportRoutes } from '../modules/catalog-import/catalog-import.routes.js';
import { createGuideContentsRouter } from '../routes/guide/index.js';
import { createCmsContentRoutes } from '../routes/cms-content/cms-content.routes.js';
import { createContentAssetsRoutes } from '../routes/content/content-assets.routes.js';
import { createDashboardAssetsRoutes } from '../routes/dashboard/dashboard-assets.routes.js';
import { createSignageRoutes, createSignagePublicRoutes } from '../routes/signage/index.js';
import { createChannelRoutes } from '../routes/channels/channels.routes.js';
import { createAdminPlaybackLogRoutes } from '../routes/admin/channel-playback-logs.routes.js';
import { createAdminHeartbeatRoutes } from '../routes/admin/channel-heartbeat.routes.js';
import { createAdminChannelOpsRoutes } from '../routes/admin/channel-ops.routes.js';
import { createAdminOpsMetricsRoutes } from '../routes/admin/ops-metrics.routes.js';

// ============================================================================
// PHASE 1: Core routes — registered BEFORE server listen
// ============================================================================
export async function registerCoreRoutes(app: Application): Promise<void> {
  // Register core API routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/auth', authRoutes);  // Legacy path for backward compatibility
  // Phase 1: Service User 인증 기반 (WO-AUTH-SERVICE-IDENTITY-PHASE1)
  app.use('/api/v1/auth/service', serviceAuthRoutes);
  // Phase 3: Guest 인증 (WO-AUTH-SERVICE-IDENTITY-PHASE3-QR-GUEST-DEVICE)
  app.use('/api/v1/auth/guest', guestAuthRoutes);
  // LMS routes (WO-KPA-B-LMS-GUARD-BYPASS-AUDIT-AND-IMPLEMENTATION-V1: KPA org scope guard BEFORE lmsRoutes)
  app.use('/api/v1/lms', kpaLmsScopeGuard);
  app.use('/api/v1/lms', lmsRoutes);
  // WO-O4O-LMS-AI-MINIMAL-V1
  app.use('/api/v1/ai', aiRoutes);
  // WO-O4O-CREDIT-SYSTEM-V1: Credit balance & transactions
  app.use('/api/v1/credits', creditRoutes);
  // WO-O4O-POINT-CORE-EXTENSION-V1: Point admin grant/spend
  app.use('/api/v1/points', pointRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/cpt', cptRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/health', healthRoutes); // Cloud Run HEALTHCHECK compatibility

  // Internal ops metrics — WO-O4O-INTERNAL-BETA-ROLL-OUT-V1
  try {
    const { createOpsMetricsController } = await import('../routes/internal/ops-metrics.controller.js');
    app.use('/internal/ops', createOpsMetricsController());
    logger.info('✅ Internal ops metrics registered at /internal/ops/metrics');
  } catch (opsMetricsError) {
    logger.warn('Internal ops metrics registration skipped:', opsMetricsError);
  }

  app.use('/api/v1/forum', forumRoutes);
  // WO-O4O-NOTIFICATION-CORE-BASELINE-V1: platform-wide notifications
  // (forum-specific notifications stay under /api/v1/forum/notifications/*)
  app.use('/api/v1/notifications', notificationsRoutes);
  // WO-O4O-SURVEY-CORE-PHASE1-V1: 공통 설문 도메인
  app.use('/api/v1/surveys', surveyRoutes);
  // WO-O4O-APPRECIATION-POINT-LIKE-SYSTEM-PHASE1-V1: 기여 감사 포인트
  app.use('/api/v1/appreciation', appreciationRoutes);
  app.use('/api/v1/settings', settingsRoutes);
  // WO-O4O-ADMIN-APP-AVAILABILITY-READ-CONTRACT-FIX-V1:
  //   인증 사용자용 read-only 앱 활성 상태(메뉴·라우트 게이팅 전용, 관리 필드 미노출).
  //   아래 /api/v1/admin/apps 의 requireAdmin 경계는 변경하지 않는다.
  app.use('/api/v1/apps', appAvailabilityRoutes);
  app.use('/api/v1/admin/apps', adminAppsRoutes);
  app.use('/api/v1/admin/users', adminUsersRoutes);
  app.use('/api/v1/admin/platform-accounts', adminPlatformAccountsRoutes);
  app.use('/api/v1/admin/platform-users', adminPlatformUsersRoutes);
  app.use('/api/v1/admin/security', adminSecurityBlockedIpsRoutes);
  // WO-O4O-SERVICE-MONITOR-SITES-TABLE-DEPENDENCY-AUDIT-AND-CLOSURE-V1 (판정 MONITOR_LEGACY_RETIRE):
  //   `/api/v1/service/monitor/*` 8개는 `sites` 테이블(Multi-Site Builder, 2025-12 설계)에만 의존했다.
  //   해당 migration 은 실행된 적 없이 2026-01-08 `chore(migrations): remove 124 unexecuted migrations`
  //   에서 제거됐고, site 를 생성하는 `modules/sites/sites.routes.ts` 도 mount 돼 있지 않았다.
  //   즉 production 에 데이터가 존재할 수 있는 경로 자체가 없어 summary·report 는 500,
  //   나머지 5개는 항상 빈 배열이었다. 대체 canonical table 도 없어 schema 복구 대상이 아니다.
  //   → router 미등록(404)으로 retire. 상세는 CHECK 문서.
  // WO-O4O-MULTI-SITE-BUILDER-SITES-DOMAIN-CENSUS-AND-RETIREMENT-V1 (판정 RETIRE_CONFIRMED):
  //   후속으로 `modules/sites/*`(entity·routes·dto)와 `database/entities.ts` 의 Site 등록까지
  //   제거했다. `/api/sites`·`/api/v1/sites` mount 는 2025-12-11 `refactor(api-server):
  //   Phase 8-3 Legacy Entity Removal & Service Cleanup` 에서 이미 해제된 상태였다.
  //   `branch_sites`(KPA 분회 홈페이지)는 별개 ACTIVE 도메인이며 유지한다.
  // WO-O4O-DEPLOYMENT-DOMAIN-CENSUS-AND-RETIREMENT-V1 (판정 RETIRE_CONFIRMED):
  //   같은 2025-12 설계의 후속 단계였던 application-level Deployment 도메인
  //   (`modules/deployment/*` = DeploymentInstance entity + DTO)도 retire 했다.
  //   `/api/deployment`·`/api/v1/deployment` mount 는 2025-12-11 Phase 8-3 에서 해제됐고
  //   route 파일은 2026-01-06 `chore(api-server): remove 30 unused route files` 에서 삭제됐다.
  //   서버 provisioning 은 setTimeout 기반 mock 구현이었고 `deployment_instances`
  //   테이블은 production 에 생성된 적이 없다.
  //   ⚠ 실제 배포 인프라(GitHub Actions `.github/workflows/deploy-*.yml`, Cloud Run,
  //   Dockerfile, Artifact Registry)는 별개 축이며 이 retire 와 무관하다.

  logger.info('✅ Core API routes registered');
}

// ============================================================================
// PHASE 2: Domain routes — registered AFTER DB init (inside startServer)
// ============================================================================
export async function registerDomainRoutes(app: Application, dataSource: DataSource): Promise<void> {
  try {
    // ========================================================================
    // WO-O4O-APP-MANAGEMENT-CANONICAL-MODEL-AND-RUNTIME-RESIDUE-CLOSURE-V1
    //   (판정 MODULE_LOADER_RETIRE)
    //
    // 여기에 있던 ModuleLoader 부트 4단계(loadAll → installModule → activateModule →
    // getModuleRouter 동적 mount)와 getAllEntities() 수집을 제거했다.
    //
    // 실측 근거:
    //   - production 부트 로그(전 revision 공통):
    //       [ModuleLoader] Loading 0 modules...  /  Loaded 0 app modules:
    //       Install hooks ran for 0/0 modules    /  Activated 0/0 modules
    //       Registered 0 dynamic routes:
    //     배포 이미지에 packages/ 가 없어 glob 대상이 0 이었다.
    //   - 로컬 workspace 에서 같은 스캔을 재현해도 17개 manifest 중 13개가
    //     top-level `id` 가 없어 loadModule() 에서 거부된다. 남는 4개도
    //     dist/backend/index.js 가 named export `routes` 를 내보내지 않아 라우터 0.
    //     → 어떤 환경에서도 동적 route 0 · entity 0 이다.
    //   - ModuleLoader 소비처는 이 부트 블록이 유일했다(선행 WO 들에서
    //     service-admin.routes · appstore /modules · AppStoreService 가 모두 은퇴).
    //
    // 앱 설치·활성 정본은 `app_registry` 테이블이며, 그 read 는 AppManager 와
    // `/api/v1/apps/availability` 가 담당한다. 도메인 route 는 아래처럼 정적 mount 한다.
    // ========================================================================

    // ========================================================================
    // WO-O4O-PUBLIC-APPSTORE-READ-CONTRACT-CENSUS-AND-DISPOSITION-V1
    //   판정 PUBLIC_APPSTORE_READ_RETIRE — 공개 카탈로그 API 2종 은퇴
    //     GET /api/v1/appstore
    //     GET /api/v1/appstore/:appId
    //
    //   - code consumer 0: 저장소 전체에서 '/api/v1/appstore' 문자열을 호출하는 코드가
    //     이 mount 와 자기 자신의 테스트뿐이었다.
    //   - frontend consumer 0: admin AppStore 화면은 '/admin/apps/*' 만 호출한다.
    //     main-site 의 appstore UI 는 별도 client-side registry 를 쓰며 라우팅도 없다.
    //   - external contract 0: swagger/OpenAPI 에 appstore 경로가 등재된 적이 없고
    //     SDK · partner docs · public developer docs 어디에도 나오지 않는다.
    //   - organic traffic 0: 로그 보존 30일 관측창(2026-07-27~08-26) 전체 65건이
    //     전부 curl 2개 IP 의 선행 WO 검증 트래픽이었다. 브라우저 · 봇 · 외부 클라이언트 0.
    //   - unique value 0: 목록 응답은 인증된 'GET /api/v1/admin/apps/market' 이
    //     반환하는 APPS_CATALOG 와 동일하다(DUPLICATE_READ). 상세는 그 부분집합이다.
    //   - 무인증으로 앱 topology · 의존 그래프 · experimental 상태를 노출하고 있었다.
    //
    //   ⚠ APPS_CATALOG(정본 metadata) 는 유지한다. 이번 판정은 "정본을 인터넷에
    //     공개하는 HTTP surface" 만 닫는 것이며, catalog 자체는 '/admin/apps' 와
    //     CI AppStore Guard · multi-tenant 스펙이 계속 소비한다.
    // ========================================================================

    // 4.1 Register Navigation routes (Phase P0 Task A - Dynamic Navigation)
    app.use('/api/v1/navigation', navigationRoutes);
    logger.info('✅ Navigation routes registered at /api/v1/navigation');

    // 4.2 Register Routes API (Phase P0 Task B - Dynamic Routing)
    app.use('/api/v1/routes', routesRoutes);
    logger.info('✅ Routes API registered at /api/v1/routes');

    // 5–7. WO-O4O-SERVICE-PROVISIONING-CANONICAL-CONTRACT-AND-LEGACY-API-CLOSURE-V1
    //   (판정 SERVICE_PROVISIONING_LEGACY_RETIRE — 전 축)
    //
    //   Phase 7/8 Service Provisioning · Service Admin 축 전체를 retire 했다.
    //   `/api/v1/service/*`(7) · `/api/v1/service-admin/*`(8) 모두 더 이상 mount 하지 않는다.
    //
    //   production 실측 (o4o-core-api Cloud Run, 전 revision 공통):
    //     [TemplateRegistry] Templates directory not found: /app/dist/templates   → 0 templates
    //     [InitPackRegistry] Init packs directory not found: /app/dist/init-packs → 0 packs
    //   Dockerfile 은 dist/main.js 번들과 dist/database · src/assets · mail-templates 만 COPY 하고
    //   `service-templates/{templates,init-packs}/*.json` 은 이미지에 들어간 적이 없다.
    //   따라서 templates read 는 항상 빈 배열, template detail · preview · create · install 은
    //   항상 404 였다 — provisioning write 실효 0.
    //
    //   복구하지 않고 제거한 근거:
    //     - `serviceInitializer.initializeService()` 8단계(menus/categories/settings/theme/
    //       pages/seedData/roles/hooks)가 전부 `// TODO: Integrate with ...` + logger.debug 스텁이었다.
    //       생성 개수를 돌려주지만 어느 테이블에도 쓰지 않는다(응답이 사실과 다름).
    //     - `serviceInstaller` 의 install 경로는 in-memory ModuleLoader registry 만 건드리고
    //       App Store canonical 정본인 `app_registry` 테이블에는 전혀 쓰지 않았다.
    //     - `themePresetService` 저장소는 `new Map()` 이며 주석에도 "would be DB in
    //       production" 으로 명시돼 있었다. Cloud Run 에서 PUT theme 는 즉시 유실된다.
    //
    //   소비처 실측:
    //     - `/api/v1/service-admin/*` : 저장소 전수 검색 소비처 0 (frontend · packages · scripts).
    //     - `/api/v1/service/*` : admin-dashboard `ServiceTemplateSelector` 가 templates/preview/
    //       install 3개를 호출했으나 production 에선 항상 빈 목록이어서 install 까지
    //       도달할 수 없었고, 그 UI 는 AppStore READ-ONLY 계약(WO-APPSTORE-UI-DEMOTION)과도
    //       충돌했다. 해당 탭·컴포넌트·API 클라이언트를 함께 제거했다.
    //     - 30일 Cloud Run 로그의 해당 경로 호출은 전부 선행 WO smoke 트래픽이다(유기 0).
    //
    //   ⚠ App Store canonical 축(`app_registry`, `/api/v1/admin/apps`, `/api/v1/appstore`,
    //   `/api/v1/apps/availability`, AppManager)과 ModuleLoader 의 부트 시 dynamic route ·
    //   entity 등록은 별개 ACTIVE 축이며 이 retire 와 무관하다. 상세는 CHECK 문서.

    // 8. Register Public routes (no auth required)
    app.use('/api/v1/public', publicRoutes);
    logger.info('✅ Public routes registered at /api/v1/public');

    // 8.1. Service Legal / Policy settings (WO-O4O-SERVICE-LEGAL-POLICY-SETTINGS-BACKEND-V1)
    //   public read (no auth) + admin write (serviceKey-scoped). frontend 미수정 — backend 기반만.
    const { createPublicServiceLegalController } = await import('../modules/service-legal/public-service-legal.controller.js');
    const { createAdminServiceLegalController } = await import('../modules/service-legal/admin-service-legal.controller.js');
    app.use('/api/v1/public/services', createPublicServiceLegalController(dataSource));
    app.use('/api/v1/admin/services', createAdminServiceLegalController(dataSource));
    logger.info('✅ Service Legal routes registered at /api/v1/public/services and /api/v1/admin/services');

    // 8.2. Public Contact Inquiry (WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1)
    //   GP/KCos 공개 문의 접수 + 운영자 in-app 알림. Neture/KPA 는 자체 경로 유지(미사용).
    const { createPublicContactInquiryController } = await import('../modules/contact-inquiry/public-contact-inquiry.controller.js');
    app.use('/api/v1/public/services', createPublicContactInquiryController(dataSource));
    logger.info('✅ Contact Inquiry public route registered at /api/v1/public/services/:serviceKey/contact-inquiries');

    // 8.3. Admin Contact Inquiry (WO-O4O-CONTACT-INQUIRY-ADMIN-MANAGEMENT-V1) — GP/KCos 문의 조회·처리
    const { createAdminContactInquiryController } = await import('../modules/contact-inquiry/admin-contact-inquiry.controller.js');
    app.use('/api/v1/admin/services', createAdminContactInquiryController(dataSource));
    logger.info('✅ Contact Inquiry admin route registered at /api/v1/admin/services/:serviceKey/contact-inquiries');

    // 8.4. Admin Service Contact Settings (WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1) — GP/KCos 문의 수신·알림 설정
    const { createAdminServiceContactSettingsController } = await import('../modules/contact-inquiry/admin-service-contact-settings.controller.js');
    app.use('/api/v1/admin/services', createAdminServiceContactSettingsController(dataSource));
    logger.info('✅ Contact Settings admin route registered at /api/v1/admin/services/:serviceKey/contact-settings');

    // 8.6. Register Platform Inquiry routes (contact forms for SaaS operator)
    app.use('/api/v1/platform', platformInquiryRoutes);
    app.use('/api/v1/admin/platform', platformInquiryAdminRoutes);
    logger.info('✅ Platform Inquiry routes registered at /api/v1/platform and /api/v1/admin/platform');

    // 8.7. Register Platform Service Catalog routes (WO-PLATFORM-SERVICE-CATALOG-AND-MY-V1)
    app.use('/api/v1/platform-services', createPlatformServicesRoutes(dataSource));
    app.use('/api/v1/admin/platform-services', createAdminPlatformServicesRoutes(dataSource));
    logger.info('✅ Platform Service Catalog routes registered at /api/v1/platform-services');

    // 8.8. Register Store Network Dashboard routes (WO-O4O-STORE-NETWORK-DASHBOARD-V1)
    app.use('/api/v1/admin/store-network', createStoreNetworkRoutes(dataSource));
    logger.info('✅ Store Network Dashboard routes registered at /api/v1/admin/store-network');

    // 8.9. Register Physical Store Linking routes (WO-O4O-CROSS-SERVICE-STORE-LINKING-V1)
    app.use('/api/v1/admin/physical-stores', createPhysicalStoreRoutes(dataSource));
    logger.info('✅ Physical Store routes registered at /api/v1/admin/physical-stores');

    // 8.10. Register Platform Slug Check routes (WO-CORE-STORE-REQUESTED-SLUG-V1)
    app.use('/api/v1/platform/slug', createSlugRoutes(dataSource));
    logger.info('✅ Platform Slug routes registered at /api/v1/platform/slug');

    // 8.11a. Register Unified Public Store routes (WO-STORE-SLUG-UNIFICATION-V1)
    app.use('/api/v1/stores', createUnifiedStorePublicRoutes(dataSource));
    logger.info('✅ Unified Public Store routes registered at /api/v1/stores/:slug');

    // 8.11b. Register Platform Store Policy routes (WO-CORE-STORE-POLICY-SYSTEM-V1)
    app.use('/api/v1/stores', createStorePolicyRoutes(dataSource));
    logger.info('✅ Platform Store Policy routes registered at /api/v1/stores/:slug/policies');

    // 8.12. Register Store Local Product & Tablet Display routes (WO-STORE-LOCAL-PRODUCT-DISPLAY-V1)
    app.use('/api/v1/store', createStoreLocalProductRoutes(dataSource));
    app.use('/api/v1/store', createStoreTabletRoutes(dataSource));
    app.use('/api/v1/store', createStoreHandledProductsRoutes(dataSource));
    logger.info('✅ Store Local Product & Tablet Display routes registered at /api/v1/store/*');

    // WO-O4O-STORE-CANONICAL-CART-CHECKOUT-FOUNDATION-V1: canonical store cart foundation
    app.use('/api/v1/store', createStoreCartRoutes(dataSource));
    logger.info('✅ Store Canonical Cart routes registered at /api/v1/store/cart/:serviceKey/*');

    // WO-O4O-STORE-TABLET-LEGACY-CLEANUP-V1: Removed tablet-operator.controller.ts (unused by any frontend)

    // 9. Register User Role routes
    app.use('/api/v1/userRole', userRoleRoutes);
    logger.info('✅ User Role routes registered at /api/v1/userRole');

    // 9.5. Register Organization routes (Phase R3.5: Organization Core Absorption)
    app.use('/api/v1/organizations', organizationRoutes);
    logger.info('✅ Organization routes registered at /api/v1/organizations');

    // 10. Register Auth routes
    app.use('/api/auth', authRoutes);
    logger.info('✅ Auth routes registered at /api/auth');

    // 11. Register Admin Apps routes (v1 prefix for auth-client compatibility)
    app.use('/api/v1/admin/apps', adminAppsRoutes);
    logger.info('✅ Admin Apps routes registered at /api/v1/admin/apps');

    // 12. Forum routes - REMOVED (Phase R1: Domain separation)
    // app.use('/api/v1/forum', forumRoutes);

    // 13. Linked Accounts routes - REMOVED
    //     (WO-O4O-REDIS-SESSIONSYNC-REMOVAL-AND-MEMORYSTORE-DECOMMISSION-V1)
    //     /api/accounts/* 는 Redis SessionSync 전용 dead route 였다 (6주 요청 0건).
    //     실사용 연결계정 UI 는 /auth/accounts/* 를 쓴다.

    // ========================================================================
    // DOMAIN ROUTES PARTIALLY RESTORED
    // ========================================================================
    // 14. Membership routes — WO-O4O-LEGACY-YAKSA-ADMIN-AND-DOMAIN-FEATURES-FULL-REMOVAL-V1
    //     에서 @o4o/membership-yaksa 와 함께 제거됨 (약사회 전용, 다른 소비처 0).

    // Still disabled (Phase R2):
    // 17. Cosmetics Seller routes (/api/v1/cosmetics-seller) - @o4o/cosmetics-seller-extension
    //     패키지는 존재하나 라우트는 아직 마운트하지 않는다.
    // WO-O4O-APPSTORE-RETIRED-COSMETICS-EXTENSIONS-CATALOG-CLOSURE-V1:
    //   18. Cosmetics Sample Display · 19. Cosmetics Supplier 항목을 제거했다.
    //   두 패키지는 commit 2d5be046b 에서 삭제되어 'disabled'(재활성 대기) 가 아니라
    //   존재하지 않는 라우트다. App Store 카탈로그 항목도 함께 제거했다.

    // 20. Register Partner routes (Phase K)
    app.use('/api/partner', partnerRoutes);
    logger.info('✅ Partner routes registered at /api/partner');

    // 21-a. Register Partner Dashboard API v1 (WO-PARTNER-DASHBOARD-API-BE-IMPLEMENTATION-V1)
    app.use('/api/v1/partner', partnerDashboardRoutes);
    logger.info('✅ Partner Dashboard API v1 registered at /api/v1/partner');

    // 21-b. (은퇴) Partner Application API — WO-PARTNER-APPLICATION-V1
    //   WO-O4O-PARTNER-APPLICATION-ENTITY-TABLE-CONTRACT-ROOT-CAUSE-AND-PRODUCTION-CLOSURE-V1:
    //   이 mount 는 **도달 불가**였다. 바로 위 21-a 가 `/api/v1/partner` 로 먼저 마운트되고
    //   partner-dashboard.routes 가 router 레벨에서 `authenticate + partnerContextGuard` 를 걸기 때문에
    //   `/api/v1/partner/applications` 는 항상 21-a 에 먼저 매칭돼 401/403('Partner role required')로 끝났다.
    //   즉 "파트너가 되려는 사람"이 "파트너 역할"을 요구받는 논리적 모순 상태였고,
    //   대상 테이블 `partner_applications` 는 migration 이 없어 프로덕션에 존재한 적도 없다.
    //   canonical 대체 경로 = POST /api/v1/cosmetics/stores/apply
    //   → cosmetics.cosmetics_store_applications → 운영자 검수 콘솔(/operator/applications).
    //   90일 프로덕션 호출 0건. entity/service/route 전부 제거했다.

    // 22. Register Market Trial routes (Phase L-1)
    MarketTrialController.setDataSource(dataSource);
    app.use('/api/market-trial', marketTrialRoutes);
    logger.info('✅ Market Trial routes registered at /api/market-trial');

    // 22-mt. Market Trial Operator Routes (WO-O4O-MARKET-TRIAL-PHASE1-V1)
    MarketTrialOperatorController.setDataSource(dataSource);
    app.use('/api/v1/neture/operator/market-trial', createNetureOperatorTrialRoutes());
    logger.info('✅ Market Trial Operator routes registered');

    // 22-ai. Register AI Query routes (Phase AI-1)
    app.use('/api/ai', aiQueryRoutes);
    app.use('/api/ai', aiProxyRoutes);
    logger.info('✅ AI Query + Proxy routes registered at /api/ai');

    // 22-ai-admin. Register AI Admin routes (WO-AI-ADMIN-CONTROL-PLANE-V1)
    app.use('/api/ai/admin', aiAdminRoutes);
    logger.info('✅ AI Admin routes registered at /api/ai/admin');

    // WO-O4O-MARKET-TRIAL-PRODUCT-ORDER-SHIPPING-SCHEMA-CLEANUP-V1 (P3-1):
    // 유통참여형 펀딩 = content-only. Trial Shipping / Trial Fulfillment 확장(주문/발송 축) 제거됨.

    // 23. Register Checkout routes (Phase N-1)
    app.use('/api/checkout', checkoutRoutes);
    app.use('/api/orders', checkoutRoutes); // Also mount orders endpoint
    logger.info('✅ Checkout routes registered at /api/checkout and /api/orders');

    // 24. Register Admin Order routes (Phase N-2)
    app.use('/api/admin/orders', adminOrderRoutes);
    logger.info('✅ Admin Order routes registered at /api/admin/orders');

    // 24-b. Register Admin Dashboard routes (WO-ADMIN-API-IMPLEMENT-P0)
    app.use('/api/v1/admin', adminDashboardRoutes);
    logger.info('✅ Admin Dashboard routes registered at /api/v1/admin');

    // 24-c. Register Operator Notification Settings routes (WO-O4O-OPERATOR-NOTIFICATION-EMAIL-MANAGEMENT-V1)
    app.use('/api/operator', operatorNotificationRoutes);
    logger.info('✅ Operator Notification routes registered at /api/operator');

    // 24-d. Register Operator Membership Console routes (WO-O4O-MEMBERSHIP-CONSOLE-V1)
    app.use('/api/v1/operator/members', operatorMembershipRoutes);
    logger.info('✅ Operator Membership Console routes registered at /api/v1/operator/members');

    // 24-e. Register Operator Product Console routes (WO-O4O-PRODUCT-MASTER-CONSOLE-V1)
    app.use('/api/v1/operator/products', operatorProductRoutes);
    logger.info('✅ Operator Product Console routes registered at /api/v1/operator/products');

    // 24-e2. Register Product Candidate Review Queue routes (WO-O4O-PRODUCT-CANDIDATE-REVIEW-QUEUE-V1, Phase 3)
    try {
      const { createProductCandidateController } = await import('../modules/neture/controllers/product-candidate.controller.js');
      app.use('/api/v1/operator/product-candidates', createProductCandidateController(dataSource));
      logger.info('✅ Product Candidate Review Queue routes registered at /api/v1/operator/product-candidates');
    } catch (productCandidateError) {
      logger.error('Failed to register Product Candidate Review Queue routes:', productCandidateError);
    }

    // 24-e2a. Register Store Product Request ADMIN routes (WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 Phase 2)
    //         store_web 요청 전용 관리자 검토·승인(기존 candidate 콘솔 코어 무변경, 별도 뷰/액션).
    try {
      const { createStoreProductRequestAdminController } = await import(
        '../routes/o4o-store/controllers/store-product-request-admin.controller.js'
      );
      app.use('/api/v1/operator/store-product-requests', createStoreProductRequestAdminController(dataSource));
      logger.info('✅ Store Product Request Admin routes registered at /api/v1/operator/store-product-requests');
    } catch (storeProductRequestAdminError) {
      logger.error('Failed to register Store Product Request Admin routes:', storeProductRequestAdminError);
    }

    // 24-e2b~e2d-3. 설명서 검토 워크플로우 라우트 제거
    //   (WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-REVIEW-REMOVE-V1)
    //   제거: shared-product-descriptions / product-candidate-description-drafts /
    //         description-status / description-dashboard / description-review-queue.
    //   유지: canonical 설명 조회(product-library), 설명/QR 요약 배지(masters/description-qr-summary),
    //         설명 데이터 파이프라인(seed/derive job)·shared_product_descriptions 테이블.

    // 24-e2d-4. Register Product Landing (제품 대표 QR 진입점) — public read + admin 단건 발급
    //           (WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1 / Phase 2)
    try {
      const { createPublicProductLandingController, createAdminProductLandingController } = await import('../modules/neture/controllers/product-landing.controller.js');
      app.use('/api/v1/public/product-landings', createPublicProductLandingController(dataSource));
      app.use('/api/v1/admin/o4o-product-db/product-landings', createAdminProductLandingController(dataSource));
      logger.info('✅ Product Landing routes registered at /api/v1/public/product-landings (public) + /api/v1/admin/o4o-product-db/product-landings (admin)');
    } catch (landingError) {
      logger.error('Failed to register Product Landing routes:', landingError);
    }

    // 24-e2d-5. Register Cafe24 OAuth (admin 전용) — mall 연결정보만 관리
    //           (WO-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1 §5)
    try {
      const { createCafe24OAuthController } = await import('../modules/cafe24/controllers/cafe24-oauth.controller.js');
      app.use('/api/v1/admin/cafe24', createCafe24OAuthController(dataSource));
      logger.info('✅ Cafe24 OAuth routes registered at /api/v1/admin/cafe24');
    } catch (cafe24Error) {
      logger.error('Failed to register Cafe24 OAuth routes:', cafe24Error);
    }

    // 24-e2e. Register Product Usage Links (read-only) — master 활용 연결 조회
    //         (WO-O4O-ADMIN-O4O-PRODUCT-USAGE-LINKS-READONLY-V1)
    try {
      const { createProductUsageLinksController } = await import('../modules/neture/controllers/product-usage-links.controller.js');
      app.use('/api/v1/admin/o4o-product-db/masters', createProductUsageLinksController(dataSource));
      logger.info('✅ Product Usage Links (read-only) routes registered at /api/v1/admin/o4o-product-db/masters/:id/usage-links');
    } catch (usageLinksError) {
      logger.error('Failed to register Product Usage Links routes:', usageLinksError);
    }

    // 24-e2f. Register Product Image Quality (read-only) — master 이미지 상태 조회
    //         (WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-QUALITY-SHELL-V1)
    try {
      const { createProductImageQualityController } = await import('../modules/neture/controllers/product-image-quality.controller.js');
      app.use('/api/v1/admin/o4o-product-db/image-quality', createProductImageQualityController(dataSource));
      logger.info('✅ Product Image Quality (read-only) routes registered at /api/v1/admin/o4o-product-db/image-quality');
    } catch (imageQualityError) {
      logger.error('Failed to register Product Image Quality routes:', imageQualityError);
    }

    // 24-e2g. Register Product Master Note routes (첫 write — 내부 운영 메모, ProductMaster 무변경)
    //         (WO-O4O-ADMIN-O4O-PRODUCT-MASTER-NOTE-V1)
    try {
      const { createProductMasterNoteController } = await import('../modules/neture/controllers/product-master-note.controller.js');
      app.use('/api/v1/admin/o4o-product-db/masters', createProductMasterNoteController(dataSource));
      logger.info('✅ Product Master Note routes registered at /api/v1/admin/o4o-product-db/masters/:id/notes');
    } catch (masterNoteError) {
      logger.error('Failed to register Product Master Note routes:', masterNoteError);
    }

    // 24-e2g-1b. Register Product Master STORE Description authoring (관리자 직접 등록 — 진입점 4)
    //           (IR-O4O-PRODUCT-REGISTRATION-MODULE-UNIFIED-V1 §5)
    try {
      const { createProductMasterDescriptionController } = await import('../modules/neture/controllers/product-master-description.controller.js');
      app.use('/api/v1/admin/o4o-product-db/masters', createProductMasterDescriptionController(dataSource));
      logger.info('✅ Product Master STORE Description routes registered at /api/v1/admin/o4o-product-db/masters/:id/store-descriptions');
    } catch (masterDescError) {
      logger.error('Failed to register Product Master STORE Description routes:', masterDescError);
    }

    // 24-e2g-1c. Register Operator Supplier STORE Description Review Queue (공급자 매장용 설명서 최소 검수 큐)
    //           (WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-AND-REVIEW-QUEUE-V1)
    try {
      const { createOperatorSupplierStoreDescriptionReviewController } = await import('../modules/neture/controllers/operator-supplier-store-description-review.controller.js');
      app.use('/api/v1/admin/o4o-product-db/supplier-store-descriptions', createOperatorSupplierStoreDescriptionReviewController(dataSource));
      logger.info('✅ Operator Supplier STORE Description Review routes registered at /api/v1/admin/o4o-product-db/supplier-store-descriptions');
    } catch (supplierStoreReviewError) {
      logger.error('Failed to register Operator Supplier STORE Description Review routes:', supplierStoreReviewError);
    }

    // 24-e2g-2. Register Product Master Create route (관리자 수동 상품 등록)
    //           (WO-O4O-ADMIN-PRODUCT-MASTER-MANUAL-REGISTRATION-UI-V1)
    try {
      const { createProductMasterCreateController } = await import('../modules/neture/controllers/product-master-create.controller.js');
      app.use('/api/v1/admin/o4o-product-db/masters', createProductMasterCreateController(dataSource));
      logger.info('✅ Product Master Create route registered at POST /api/v1/admin/o4o-product-db/masters');
    } catch (masterCreateError) {
      logger.error('Failed to register Product Master Create route:', masterCreateError);
    }

    // 24-e2g-3. Register Product DB Maintenance route (데이터 정비 — 고아 후보 정합화 dry-run)
    //           (WO-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-ORPHAN-CANDIDATE-ARCHIVE-DRYRUN-V1). DB write 0.
    try {
      const { createProductDbMaintenanceController } = await import('../modules/neture/controllers/product-db-maintenance.controller.js');
      app.use('/api/v1/admin/o4o-product-db/maintenance', createProductDbMaintenanceController(dataSource));
      logger.info('✅ Product DB Maintenance route registered at POST /api/v1/admin/o4o-product-db/maintenance/jobs/orphan-registered-candidates/dry-run');
    } catch (maintenanceError) {
      logger.error('Failed to register Product DB Maintenance route:', maintenanceError);
    }

    // 24-e2h. Register Product Master Audit Log (read-only) — master 작업 이력 조회
    //         (WO-O4O-ADMIN-O4O-PRODUCT-MASTER-AUDIT-LOG-VIEW-V1)
    try {
      const { createProductMasterAuditLogController } = await import('../modules/neture/controllers/product-master-audit-log.controller.js');
      app.use('/api/v1/admin/o4o-product-db/masters', createProductMasterAuditLogController(dataSource));
      logger.info('✅ Product Master Audit Log routes registered at /api/v1/admin/o4o-product-db/masters/:id/audit-logs');
    } catch (auditLogError) {
      logger.error('Failed to register Product Master Audit Log routes:', auditLogError);
    }

    // 24-e2i. Register Product Master Status route (단건 상태 변경 — ACTIVE/SUSPENDED/ARCHIVED)
    //         (WO-O4O-ADMIN-PRODUCT-MASTER-STATUS-ACTIONS-V1)
    try {
      const { createProductMasterStatusController } = await import('../modules/neture/controllers/product-master-status.controller.js');
      app.use('/api/v1/admin/o4o-product-db/masters', createProductMasterStatusController(dataSource));
      logger.info('✅ Product Master Status route registered at PATCH /api/v1/admin/o4o-product-db/masters/:id/status');
    } catch (masterStatusError) {
      logger.error('Failed to register Product Master Status route:', masterStatusError);
    }

    // 24-e2i-3. Register Product Content Browse (read-only) — 제품 콘텐츠 통합 browse(4 source)
    //         (WO-O4O-OPERATOR-PRODUCT-CONTENT-HUB-BROWSE-UNIFY-V1, A안). mutation 0.
    try {
      const { createProductContentBrowseController } = await import('../modules/neture/controllers/product-content-browse.controller.js');
      app.use('/api/v1/admin/o4o-product-db/product-contents', createProductContentBrowseController(dataSource));
      logger.info('✅ Product Content Browse (read-only) routes registered at /api/v1/admin/o4o-product-db/product-contents');
    } catch (productContentBrowseError) {
      logger.error('Failed to register Product Content Browse routes:', productContentBrowseError);
    }

    // 24-e2i-2. Register Product Description/QR Summary (read-only) — 제품 리스트 설명서(KO/ZH) 상태 배치 조회
    //         (WO-O4O-PRODUCT-LIST-DESCRIPTION-QR-ACTIONS-V1). QR 은 deferred(자리만).
    try {
      const { createProductDescriptionQrSummaryController } = await import('../modules/neture/controllers/product-description-qr-summary.controller.js');
      app.use('/api/v1/admin/o4o-product-db/masters', createProductDescriptionQrSummaryController(dataSource));
      logger.info('✅ Product Description/QR Summary (read-only) routes registered at /api/v1/admin/o4o-product-db/masters/description-qr-summary');
    } catch (descQrSummaryError) {
      logger.error('Failed to register Product Description/QR Summary routes:', descQrSummaryError);
    }

    // 24-e2i. Register Product Master Image action routes (admin write — 이미지 추가 / 대표 지정)
    //         (WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-ACTION-V1, Phase 1)
    try {
      const { createProductMasterImageController } = await import('../modules/neture/controllers/product-master-image.controller.js');
      app.use('/api/v1/admin/o4o-product-db/masters', createProductMasterImageController(dataSource));
      logger.info('✅ Product Master Image routes registered at /api/v1/admin/o4o-product-db/masters/:id/images');
    } catch (masterImageError) {
      logger.error('Failed to register Product Master Image routes:', masterImageError);
    }

    // 24-e3. Register Mobile Product Draft routes (WO-O4O-MOBILE-PRODUCT-DRAFT-TO-CANDIDATE-V1, Phase 4)
    try {
      const { createMobileProductDraftController } = await import('../modules/neture/controllers/mobile-product-draft.controller.js');
      app.use('/api/v1/mobile/product-drafts', createMobileProductDraftController(dataSource));
      logger.info('✅ Mobile Product Draft routes registered at /api/v1/mobile/product-drafts');
    } catch (mobileProductDraftError) {
      logger.error('Failed to register Mobile Product Draft routes:', mobileProductDraftError);
    }

    // 24-f. Register Operator Store Console routes (WO-O4O-STORE-CONSOLE-V1)
    app.use('/api/v1/operator/stores', operatorStoreRoutes);
    logger.info('✅ Operator Store Console routes registered at /api/v1/operator/stores');

    // 24-g. Register Operator Role Catalog routes (WO-O4O-ROLE-SYSTEM-DB-DESIGN-V1)
    app.use('/api/v1/operator/roles', operatorRoleRoutes);
    logger.info('✅ Operator Role Catalog routes registered at /api/v1/operator/roles');

    // 24-h. Register Operator Analytics routes (WO-O4O-AUDIT-ANALYTICS-LAYER-V1)
    app.use('/api/v1/operator/analytics', createOperatorAnalyticsRoutes(dataSource));
    logger.info('✅ Operator Analytics routes registered at /api/v1/operator/analytics');

    // 25. Register Cosmetics routes (Phase 7-A-1)
    try {
      const cosmeticsRoutes = createCosmeticsRoutes(dataSource);
      app.use('/api/v1/cosmetics', cosmeticsRoutes);
      logger.info('✅ Cosmetics routes registered at /api/v1/cosmetics');

      // WO-O4O-ECOMMERCE-CORE-AND-COMMERCE-RESIDUE-FINAL-CENSUS-AND-RETIREMENT-V1:
      //   KCosmeticsPaymentEventHandler 제거 — payment.completed(serviceKey='cosmetics') 를
      //   발행하던 유일한 producer 가 매장 소비자 결제 은퇴로 410 이 되어 소비처만 남았다.
    } catch (cosmeticsError) {
      logger.error('Failed to register Cosmetics routes:', cosmeticsError);
    }

    // WO-O4O-ECOMMERCE-CORE-AND-COMMERCE-RESIDUE-FINAL-CENSUS-AND-RETIREMENT-V1:
    //   LmsPaymentEventHandler 제거 — serviceKey='lms' payment.completed producer 가
    //   저장소 전체에 0건이었다(dormant · v1 Freeze). @o4o/ecommerce-core 의
    //   마지막 런타임 소비처이기도 했다.

    // 26. (제거됨) Yaksa routes — WO-O4O-LEGACY-YAKSA-API-ROUTE-AND-DEAD-UI-REMOVAL-V1
    //   legacy `/api/v1/yaksa/*` 12 endpoint 는 production 소비처·내부 호출·운영 데이터가 모두 0으로
    //   확정되어(WO-O4O-LEGACY-YAKSA-API-ROUTE-USAGE-AND-DISPOSITION-AUDIT-V1) mount 를 제거했다.
    //   DB 테이블(yaksa_posts / yaksa_categories / yaksa_post_logs)은 보존한다.

    // 27. Register Glycopharm routes (Phase B-1)
    try {
      const glycopharmRoutes = createGlycopharmRoutes(dataSource);
      app.use('/api/v1/glycopharm', glycopharmRoutes);
      logger.info('✅ Glycopharm routes registered at /api/v1/glycopharm');

      // WO-O4O-ECOMMERCE-CORE-AND-COMMERCE-RESIDUE-FINAL-CENSUS-AND-RETIREMENT-V1:
      //   GlycopharmPaymentEventHandler 제거 — serviceKey='glycopharm' producer 0건.
    } catch (glycopharmError) {
      logger.error('Failed to register Glycopharm routes:', glycopharmError);
    }

    // 27b. Register Pharmacy-Hub routes (WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1)
    //      Foundation 범위: service-info / me-access / 역할별 scope ping 만.
    try {
      app.use('/api/v1/pharmacy-hub', createPharmacyHubRoutes());
      logger.info('✅ Pharmacy-Hub routes registered at /api/v1/pharmacy-hub');

      // WO-PHARMACY-HUB-PAYMENT-AND-SUPPLIER-FULFILLMENT-V1:
      //   결제 완료 → 주문 paid 전이 → 공급자 fulfillment bridge.
      //   serviceKey='pharmacy-hub' 구독이라 Neture 핸들러와 서로 간섭하지 않는다.
      const { initializePharmacyHubPaymentHandler } = await import(
        '../services/pharmacy-hub/PharmacyHubPaymentEventHandler.js'
      );
      initializePharmacyHubPaymentHandler(dataSource);
      logger.info('✅ PharmacyHubPaymentEventHandler initialized');
    } catch (pharmacyHubError) {
      logger.error('Failed to register Pharmacy-Hub routes:', pharmacyHubError);
    }

    // 27c. Register KPA Branch routes
    //      WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
    //      분회 209개를 동급 tenant 로 두는 단일 라우터. 분회별 백엔드를 만들지 않는다.
    try {
      app.use('/api/v1/kpa-branch', createKpaBranchRoutes());
      logger.info('✅ KPA Branch routes registered at /api/v1/kpa-branch');
    } catch (kpaBranchError) {
      logger.error('Failed to register KPA Branch routes:', kpaBranchError);
    }

    // 28g. Register Store AI routes (WO-O4O-STORE-HUB-AI-SUMMARY-V1)
    try {
      const { createStoreAiRouter } = await import('../modules/store-ai/controllers/store-ai.controller.js');
      app.use('/api/v1/store-hub/ai', createStoreAiRouter(dataSource));
      logger.info('✅ Store AI routes registered at /api/v1/store-hub/ai');
    } catch (storeAiError) {
      logger.error('Failed to register Store AI routes:', storeAiError);
    }

    // 28f. Register Product AI Recommendation routes (WO-O4O-AI-PRODUCT-RECOMMENDATION-V1)
    try {
      const { createProductAiRecommendationRouter } = await import('../modules/store-ai/controllers/product-ai-recommendation.controller.js');
      app.use('/api/v1/products', createProductAiRecommendationRouter(dataSource));
      logger.info('✅ Product AI Recommendation routes registered at /api/v1/products/recommend');
    } catch (productAiRecommendError) {
      logger.error('Failed to register Product AI Recommendation routes:', productAiRecommendError);
    }

    // 28g. Register Product AI Search routes (WO-O4O-AI-TAG-SEARCH-V1) — MUST come before tag routes
    try {
      const { createProductAiSearchRouter } = await import('../modules/store-ai/controllers/product-ai-search.controller.js');
      app.use('/api/v1/products', createProductAiSearchRouter(dataSource));
      logger.info('✅ Product AI Search routes registered at /api/v1/products/search');
    } catch (productAiSearchError) {
      logger.error('Failed to register Product AI Search routes:', productAiSearchError);
    }

    // 28h. Register Product AI Tag routes (WO-O4O-PRODUCT-AI-TAGGING-V1)
    try {
      const { createProductAiTagRouter } = await import('../modules/store-ai/controllers/product-ai-tag.controller.js');
      app.use('/api/v1/products', createProductAiTagRouter(dataSource));
      logger.info('✅ Product AI Tag routes registered at /api/v1/products');
    } catch (productAiTagError) {
      logger.error('Failed to register Product AI Tag routes:', productAiTagError);
    }

    // 28i. Register Product AI Content routes (IR-O4O-AI-CONTENT-ENGINE-IMPLEMENTATION-V1)
    try {
      const { createProductAiContentRouter } = await import('../modules/store-ai/controllers/product-ai-content.controller.js');
      app.use('/api/v1/products', createProductAiContentRouter(dataSource));
      logger.info('✅ Product AI Content routes registered at /api/v1/products');
    } catch (productAiContentError) {
      logger.error('Failed to register Product AI Content routes:', productAiContentError);
    }

    // 28j. Register Product POP PDF routes (WO-O4O-POP-PDF-GENERATOR-V1)
    try {
      const { createProductPopPdfRouter } = await import('../modules/store-ai/controllers/product-pop-pdf.controller.js');
      app.use('/api/v1/products', createProductPopPdfRouter(dataSource));
      logger.info('✅ Product POP PDF routes registered at /api/v1/products/:productId/pop');
    } catch (productPopPdfError) {
      logger.error('Failed to register Product POP PDF routes:', productPopPdfError);
    }

    // 28-d. Home Preview (WO-HOME-LIVE-PREVIEW-V1: public aggregate API)
    try {
      const { createHomePreviewRouter } = await import('../modules/home/home-preview.controller.js');
      app.use('/api/v1/home', createHomePreviewRouter(dataSource));
      logger.info('✅ Home Preview routes registered at /api/v1/home/preview');
    } catch (homeError) {
      logger.error('Failed to register Home Preview routes:', homeError);
    }

    // 28b. Register Store Paid Feature Entitlement routes (WO-O4O-STORE-PAID-FEATURE-ENTITLEMENT-V1)
    try {
      const { createStoreEntitlementRoutes } = await import(
        '../modules/store-entitlement/store-entitlement.routes.js'
      );
      app.use('/api/v1/store-entitlements', createStoreEntitlementRoutes(dataSource));
      logger.info('✅ Store Entitlement routes registered at /api/v1/store-entitlements');
    } catch (entitlementError) {
      logger.error('Failed to register Store Entitlement routes:', entitlementError);
    }

    // 28c. Register Foreign Visitor Partner routes (WO-O4O-FOREIGN-VISITOR-PARTNER-MODEL-V1)
    try {
      const { createForeignVisitorPartnerRoutes } = await import(
        '../modules/foreign-visitor-partner/foreign-visitor-partner.routes.js'
      );
      app.use('/api/v1/foreign-visitor/partners', createForeignVisitorPartnerRoutes(dataSource));
      logger.info('✅ Foreign Visitor Partner routes registered at /api/v1/foreign-visitor/partners');
    } catch (fvpError) {
      logger.error('Failed to register Foreign Visitor Partner routes:', fvpError);
    }

    // 28d. Register Foreign Visitor Partner QR routes (WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-TEMPLATE-V1)
    // mount at /api/v1/foreign-visitor — /partners/:partnerId/qr-codes 는 위 /partners 라우터 비매칭 시 fall-through.
    try {
      const { createForeignVisitorPartnerQrCodeRoutes } = await import(
        '../modules/foreign-visitor-partner/foreign-visitor-partner-qr-code.routes.js'
      );
      app.use('/api/v1/foreign-visitor', createForeignVisitorPartnerQrCodeRoutes(dataSource));
      logger.info('✅ Foreign Visitor Partner QR routes registered at /api/v1/foreign-visitor');
    } catch (fvpQrError) {
      logger.error('Failed to register Foreign Visitor Partner QR routes:', fvpQrError);
    }

    // 29. Register Neture routes (Phase D-1)
    try {
      const netureRoutes = createNetureRoutes(dataSource);
      app.use('/api/v1/neture', netureRoutes);
      logger.info('✅ Neture routes registered at /api/v1/neture');

      // WO-O4O-NETURE-B2B-PAYMENT-FLOW-V1 (P2b): B2B checkout_order 결제 완료 → paid 전이 핸들러
      const { initializeNetureB2bCheckoutPaymentHandler } = await import(
        '../services/neture/NetureB2bCheckoutPaymentEventHandler.js'
      );
      initializeNetureB2bCheckoutPaymentHandler(dataSource);
      logger.info('✅ NetureB2bCheckoutPaymentEventHandler initialized');
    } catch (netureError) {
      logger.error('Failed to register Neture routes:', netureError);
    }

    // 29b. Register Neture Module routes (modules/neture - supplier/admin/partner/seller)
    try {
      const netureModuleRoutes = createNetureModuleRoutes(dataSource);
      app.use('/api/v1/neture', netureModuleRoutes);
      logger.info('✅ Neture Module routes registered at /api/v1/neture/*');
    } catch (netureModuleError) {
      logger.error('Failed to register Neture Module routes:', netureModuleError);
    }

    // 29c. Register Neture Library routes (WO-O4O-NETURE-LIBRARY-FOUNDATION-V1)
    try {
      app.use('/api/v1/neture', netureLibraryRoutes);
      logger.info('✅ Neture Library routes registered at /api/v1/neture/library/*');
    } catch (netureLibraryError) {
      logger.error('Failed to register Neture Library routes:', netureLibraryError);
    }

    // 29d. Register Supplier Copilot routes (WO-O4O-SUPPLIER-COPILOT-DASHBOARD-V1)
    try {
      const { createSupplierCopilotRouter } = await import('../modules/neture/controllers/supplier-copilot.controller.js');
      app.use('/api/v1/neture/supplier', createSupplierCopilotRouter(dataSource));
      logger.info('✅ Supplier Copilot routes registered at /api/v1/neture/supplier/copilot/*');
    } catch (supplierCopilotError) {
      logger.error('Failed to register Supplier Copilot routes:', supplierCopilotError);
    }

    // 29d-2. Register Product Library routes (WO-O4O-GLOBAL-PRODUCT-LIBRARY-SEARCH-V1)
    try {
      const { createProductLibraryController } = await import('../modules/neture/controllers/product-library.controller.js');
      app.use('/api/v1/neture', createProductLibraryController(dataSource));
      logger.info('✅ Product Library routes registered at /api/v1/neture/products/library/*');
    } catch (productLibraryError) {
      logger.error('Failed to register Product Library routes:', productLibraryError);
    }

    // 29d-3. Register Spot Price Policy routes (WO-NETURE-SPOT-PRICE-POLICY-FOUNDATION-V1)
    try {
      const { createSpotPricePolicyRouter } = await import('../modules/neture/controllers/spot-price-policy.controller.js');
      app.use('/api/v1/neture/supplier', createSpotPricePolicyRouter(dataSource));
      logger.info('✅ Spot Price Policy routes registered at /api/v1/neture/supplier/spot-policies/*');
    } catch (spotPolicyError) {
      logger.error('Failed to register Spot Price Policy routes:', spotPolicyError);
    }

    // 29d-5. Register Media Library routes (WO-O4O-COMMON-MEDIA-LIBRARY-FOUNDATION-V1)
    try {
      const { createMediaLibraryRouter } = await import('../modules/media/controllers/media-library.controller.js');
      app.use('/api/v1/platform', createMediaLibraryRouter(dataSource));
      logger.info('✅ Media Library routes registered at /api/v1/platform/media-library/*');
    } catch (mediaLibError) {
      logger.error('Failed to register Media Library routes:', mediaLibError);
    }

    // 29e. Register Copilot Engine routes (WO-O4O-COPILOT-ENGINE-INTEGRATION-V1)
    try {
      const { createCopilotEngineController } = await import('../copilot/copilot-engine.controller.js');
      app.use('/api/v1/platform/copilot', createCopilotEngineController());
      logger.info('✅ Copilot Engine routes registered at /api/v1/platform/copilot/*');
    } catch (copilotEngineError) {
      logger.error('Failed to register Copilot Engine routes:', copilotEngineError);
    }

    // 29f. Register Catalog Import routes (WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1)
    try {
      const catalogImportRoutes = createCatalogImportRoutes(dataSource);
      app.use('/api/v1/catalog-import', catalogImportRoutes);
      logger.info('✅ Catalog Import routes registered at /api/v1/catalog-import');
    } catch (catalogImportError) {
      logger.error('Failed to register Catalog Import routes:', catalogImportError);
    }

    // 30. (removed) Dropshipping Admin routes
    //     WO-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1: dropshipping 레거시 체인 제거.
    //     조회 대상 테이블(dropshipping_seller_offers / dropshipping_supplier_catalog_items /
    //     dropshipping_offer_logs)이 프로덕션에 존재하지 않았고 소비처도 0 이었다.

    // 31. Register KPA routes (Pharmacist Association SaaS)
    try {
      const kpaRoutes = createKpaRoutes(dataSource);
      app.use('/api/v1/kpa', kpaRoutes);
      logger.info('✅ KPA routes registered at /api/v1/kpa');

      // WO-O4O-ECOMMERCE-CORE-AND-COMMERCE-RESIDUE-FINAL-CENSUS-AND-RETIREMENT-V1:
      //   KpaPaymentEventHandler 제거 — serviceKey='kpa' producer 0건.
      //   (KPA B2B 발주는 O4O 결제 경로를 쓰지 않는다. 결제 축은 pharmacy-hub /
      //    neture-b2b / store-service-subscription 만 살아 있다.)

      // 31-b. Register KPA Join Inquiry public routes (WO-KPA-JOIN-CONVERSION-V1)
      const kpaJoinPublicRoutes = createKpaJoinPublicRoutes(dataSource);
      app.use('/api/v1/join', kpaJoinPublicRoutes);
      logger.info('✅ KPA Join public routes registered at /api/v1/join');

      // 31-c. Register Role Application v2 routes (WO-KPA-PHARMACY-APPLICATION-STABILIZATION-V1)
      const roleApplicationRoutes = createRoleApplicationController(dataSource);
      app.use('/api/v2/roles', roleApplicationRoutes);
      logger.info('✅ Role Application v2 routes registered at /api/v2/roles');
    } catch (kpaError) {
      logger.error('Failed to register KPA routes:', kpaError);
    }

    // 31-d. Register Store Library routes (WO-O4O-STORE-LIBRARY-FOUNDATION-V1)
    try {
      const { createStoreLibraryRoutes } = await import('../modules/store/store-library.routes.js');
      const { requireAuth: storeLibraryAuth } = await import('../middleware/auth.middleware.js');
      const storeLibraryRoutes = createStoreLibraryRoutes(dataSource, storeLibraryAuth as any);
      app.use('/api/v1/store', storeLibraryRoutes);
      logger.info('✅ Store Library routes registered at /api/v1/store');
    } catch (storeLibraryError) {
      logger.error('Failed to register Store Library routes:', storeLibraryError);
    }

    // 31-e. Register Store Product Library routes (WO-O4O-STORE-PRODUCT-LIBRARY-INTEGRATION-V1)
    try {
      const { createStoreProductLibraryController } = await import(
        '../routes/o4o-store/controllers/store-product-library.controller.js'
      );
      app.use('/api/v1/store/products', createStoreProductLibraryController(dataSource));
      logger.info('✅ Store Product Library routes registered at /api/v1/store/products');
    } catch (storeProductLibError) {
      logger.error('Failed to register Store Product Library routes:', storeProductLibError);
    }

    // 31-e2. Register Store Product Request routes (WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 Phase 1)
    //        매장 신규 상품 등록 요청(제출·목록·재제출). product_candidates(source_type='store_web') 재사용.
    try {
      const { createStoreProductRequestController } = await import(
        '../routes/o4o-store/controllers/store-product-request.controller.js'
      );
      app.use('/api/v1/store/product-requests', createStoreProductRequestController(dataSource));
      logger.info('✅ Store Product Request routes registered at /api/v1/store/product-requests');
    } catch (storeProductRequestError) {
      logger.error('Failed to register Store Product Request routes:', storeProductRequestError);
    }

    // 31-f. Register Store Channel Products routes (WO-O4O-STORE-PRODUCT-REGISTRATION-PHASE1-5-V1)
    try {
      const { createStoreChannelProductsController } = await import(
        '../routes/o4o-store/controllers/store-channel-products.controller.js'
      );
      const { requireAuth: channelProductsAuth } = await import('../middleware/auth.middleware.js');
      app.use('/api/v1/store/channel-products', createStoreChannelProductsController(dataSource, channelProductsAuth));
      logger.info('✅ Store Channel Products routes registered at /api/v1/store/channel-products');
    } catch (storeChannelProductsError) {
      logger.error('Failed to register Store Channel Products routes:', storeChannelProductsError);
    }

    // 31-g. Register Guide Contents routes (WO-O4O-GUIDE-INLINE-EDIT-V1)
    try {
      const guideContentsRoutes = createGuideContentsRouter(dataSource);
      app.use('/api/v1/guide', guideContentsRoutes);
      logger.info('✅ Guide Contents routes registered at /api/v1/guide');
    } catch (guideContentsError) {
      logger.error('Failed to register Guide Contents routes:', guideContentsError);
    }

    // 32. Register CMS Content routes (WO-P2-IMPLEMENT-CONTENT)
    try {
      const cmsContentRoutes = createCmsContentRoutes(dataSource);
      app.use('/api/v1/cms', cmsContentRoutes);
      logger.info('✅ CMS Content routes registered at /api/v1/cms');
    } catch (cmsContentError) {
      logger.error('Failed to register CMS Content routes:', cmsContentError);
    }

    // 32-b. Register Content Assets routes (WO-O4O-CONTENT-ASSETS-DB-READONLY-V1)
    try {
      const contentAssetsRoutes = createContentAssetsRoutes(dataSource);
      app.use('/api/v1/content/assets', contentAssetsRoutes);
      logger.info('✅ Content Assets routes registered at /api/v1/content/assets (READ-ONLY)');
    } catch (contentAssetsError) {
      logger.error('Failed to register Content Assets routes:', contentAssetsError);
    }

    // 32-c. Register Content Templates routes (WO-O4O-CONTENT-TEMPLATE-SYSTEM-V1)
    try {
      const { createContentTemplateRoutes } = await import('../routes/content/content-templates.routes.js');
      app.use('/api/v1/content/templates', createContentTemplateRoutes(dataSource));
      logger.info('✅ Content Templates routes registered at /api/v1/content/templates');
    } catch (contentTemplateError) {
      logger.error('Failed to register Content Templates routes:', contentTemplateError);
    }

    // 32-d. Register Dashboard Assets routes (WO-APP-DATA-HUB-COPY-PHASE2A-V1)
    try {
      const dashboardAssetsRoutes = createDashboardAssetsRoutes(dataSource);
      app.use('/api/v1/dashboard/assets', dashboardAssetsRoutes);
      logger.info('✅ Dashboard Assets routes registered at /api/v1/dashboard/assets');
    } catch (dashboardAssetsError) {
      logger.error('Failed to register Dashboard Assets routes:', dashboardAssetsError);
    }

    // 33. Register Channel routes (WO-P4-CHANNEL-IMPLEMENT-P0)
    try {
      const channelRoutes = createChannelRoutes(dataSource);
      app.use('/api/v1/channels', channelRoutes);
      logger.info('✅ Channel routes registered at /api/v1/channels');
    } catch (channelError) {
      logger.error('Failed to register Channel routes:', channelError);
    }

    // 33-b-1. Register Signage PUBLIC routes — MUST be BEFORE authenticated routes
    try {
      const signagePublicRoutes = createSignagePublicRoutes(dataSource);
      app.use('/api/signage/:serviceKey/public', signagePublicRoutes);
      logger.info('✅ Signage PUBLIC routes registered at /api/signage/:serviceKey/public');
    } catch (signagePublicError) {
      logger.error('Failed to register Signage PUBLIC routes:', signagePublicError);
    }

    // 33-b-2. Register Signage routes (Phase 2 Production Build - Sprint 2-2)
    try {
      const signageRoutes = createSignageRoutes(dataSource);
      app.use('/api/signage/:serviceKey', signageRoutes);
      logger.info('✅ Signage routes registered at /api/signage/:serviceKey');
    } catch (signageError) {
      logger.error('Failed to register Signage routes:', signageError);
    }

    // 34. Register Admin Channel Playback Logs routes (WO-P5-CHANNEL-PLAYBACK-LOG-P0)
    try {
      const adminPlaybackLogRoutes = createAdminPlaybackLogRoutes(dataSource);
      app.use('/api/v1/admin/channel-playback-logs', adminPlaybackLogRoutes);
      logger.info('✅ Admin Playback Log routes registered at /api/v1/admin/channel-playback-logs');
    } catch (playbackLogError) {
      logger.error('Failed to register Admin Playback Log routes:', playbackLogError);
    }

    // 35. Register Admin Channel Heartbeat routes (WO-P5-CHANNEL-HEARTBEAT-P1)
    try {
      const adminHeartbeatRoutes = createAdminHeartbeatRoutes(dataSource);
      app.use('/api/v1/admin/channels/heartbeat', adminHeartbeatRoutes);
      logger.info('✅ Admin Heartbeat routes registered at /api/v1/admin/channels/heartbeat');
    } catch (heartbeatError) {
      logger.error('Failed to register Admin Heartbeat routes:', heartbeatError);
    }

    // 36. Register Admin Channel Ops routes (WO-P6-CHANNEL-OPS-DASHBOARD-P0)
    try {
      const adminChannelOpsRoutes = createAdminChannelOpsRoutes(dataSource);
      app.use('/api/v1/admin/channels/ops', adminChannelOpsRoutes);
      logger.info('✅ Admin Channel Ops routes registered at /api/v1/admin/channels/ops');
    } catch (channelOpsError) {
      logger.error('Failed to register Admin Channel Ops routes:', channelOpsError);
    }

    // 37. Register Admin Ops Metrics routes (WO-NEXT-OPS-METRICS-P0)
    try {
      const adminOpsMetricsRoutes = createAdminOpsMetricsRoutes(dataSource);
      app.use('/api/v1/admin/ops', adminOpsMetricsRoutes);
      logger.info('✅ Admin Ops Metrics routes registered at /api/v1/admin/ops');
    } catch (opsMetricsError) {
      logger.error('Failed to register Admin Ops Metrics routes:', opsMetricsError);
    }

    // 37-b / 37-b2. (제거됨) /api/v1/ops/seed-store-hub · /api/v1/ops/seed-neture-offers
    // WO-O4O-API-DEBUG-SEED-ROUTE-OPERATIONAL-BOUNDARY-CLEANUP-V1
    // 일회성 검증 픽스처였고 목적 달성 후 휴면(각 2026-03-22 / 2026-04-10 이후 변경 없음),
    // 호출처 0. 프로덕션에 등록된 채 x-admin-secret(= JWT_SECRET 재사용)만으로
    // 테스트 계정 생성·UUID prefix 대량 DELETE 가 가능해 HTTP 노출을 종료한다.
    // 재실행이 필요하면 33bccc567 / 582dd5285 의 SQL 을 일회성 스크립트로 복구한다.

    // ── SECURITY: /__debug__/** 는 프로덕션에 등록하지 않는다 ──────────────
    // 원래 이 블록의 debug router 8개는 인증·환경 게이트가 없어 프로덕션에서
    // 인증 없이 승인(isPlatformAdmin 하드코딩)·RBAC 변경·매장 비활성화·
    // 게시글 하드 삭제·개인정보 조회가 가능했다(9bf1ed23f 긴급 차단).
    // 생명주기 판정 완료 — 32f97773f 로 6개, 이후 pharmacy 제거로 남은 것은 user 1개뿐이다.
    // 신규 debug router 는 반드시 이 게이트 안에 넣고 읽기 전용으로 만든다.
    // 정본: docs/platform/debug/DEBUG-SSR-TEST-PAGE-GUIDE-V1.md
    if (process.env.NODE_ENV !== 'production') {
    // User Debug Info endpoint (WO-O4O-DEBUG-USER-JSON-PAGE-V1) — 읽기 전용
    try {
      const { createUserDebugRouter } = await import('../routes/debug/user-debug.controller.js');
      app.use('/__debug__/user', createUserDebugRouter(dataSource));
      logger.info('✅ User Debug endpoint registered at /__debug__/user');
    } catch (userDebugError) {
      logger.error('Failed to register User Debug routes:', userDebugError);
    }

    // (제거됨) /__debug__/pharmacy — WO-O4O-PHARMACY-DEBUG-ROUTE-FINAL-LIFECYCLE-CLEANUP-V1
    // POST /deactivate 가 사유·감사·재활성화 없이 organizations.isActive 와 glycopharm
    // enrollment 를 함께 껐다. 읽기 3종(/ · /lookup · /appointment-trace)도 일회성 실측
    // 목적이 종료됐고 소비처 0 이라 router 째 제거했다. 비활성화 업무가 다시 필요하면
    // 정식 기능으로 별도 설계한다(임시 debug route 재도입 금지).

    } // ── end SECURITY gate: /__debug__/** (non-production only) ──

    // 38. Register Platform Hub routes (WO-PLATFORM-GLOBAL-HUB-V1)
    try {
      const { createPlatformHubController } = await import('../modules/platform/platform-hub.controller.js');
      const platformHubRoutes = createPlatformHubController(dataSource);
      app.use('/api/v1/platform/hub', platformHubRoutes);
      logger.info('✅ Platform Hub routes registered at /api/v1/platform/hub');
    } catch (platformHubError) {
      logger.error('Failed to register Platform Hub routes:', platformHubError);
    }

    // 39. Register Hub Content routes (WO-O4O-HUB-CONTENT-QUERY-SERVICE-PHASE1-V2)
    try {
      const { createHubContentRouter } = await import('../modules/hub-content/hub-content.controller.js');
      const hubContentRoutes = createHubContentRouter(dataSource);
      app.use('/api/v1/hub', hubContentRoutes);
      logger.info('✅ Hub Content routes registered at /api/v1/hub/contents');
    } catch (hubContentError) {
      logger.error('Failed to register Hub Content routes:', hubContentError);
    }

    // 40. (제거됨) /api/internal/v2/product-policy — ENABLE_INTERNAL_V2 게이트 포함
    // WO-O4O-PRODUCT-POLICY-V2-INTERNAL-SECRET-SEPARATION-V1
    // "Internal Test Endpoints" 로 만들어진 9개 endpoint 가 X-Admin-Secret(= JWT_SECRET
    // fallback)만으로 승인·Listing 생성·offer distributionType 변경을 수행했다.
    // 생명주기 판정 결과 휴면 — SERVICE 승인은 3서비스 정식 operator route 로 대체됐고
    // (WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1),
    // 프로덕션 product_approvals 는 0 row 로 승인할 대상 자체가 없었다.
    // ProductApprovalV2Service 는 정식 route 들이 계속 사용하므로 유지한다.

    logger.info('✅ Domain routes registered');
  } catch (domainRoutesError) {
    logger.error('Domain route registration failed:', domainRoutesError);
    // Continue server startup even if a domain route group fails to register
  }
}

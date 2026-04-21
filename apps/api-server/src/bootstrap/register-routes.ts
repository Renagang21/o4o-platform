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
// WO-O4O-CREDIT-SYSTEM-V1
import creditRoutes from '../modules/credit/routes/credit.routes.js';
import { kpaLmsScopeGuard } from '../middleware/kpa-lms-scope-guard.js';
import usersRoutes from '../routes/users.routes.js';
import cptRoutes from '../routes/cpt.js';
import healthRoutes from '../routes/health.js';
import forumRoutes from '../routes/forum/forum.routes.js';
import settingsRoutes from '../routes/settingsRoutes.js';
import adminAppsRoutes from '../routes/admin/apps.routes.js';
import adminUsersRoutes from '../routes/admin/users.routes.js';
import seedTestAccountsRoutes from '../routes/admin/seed-test-accounts.js';
import serviceMonitorRoutes from '../routes/service-monitor.routes.js';

// ============================================================================
// DOMAIN ROUTE IMPORTS (registered after DB init)
// ============================================================================
import { moduleLoader } from '../modules/module-loader.js';
import { templateRegistry } from '../service-templates/template-registry.js';
import { initPackRegistry } from '../service-templates/init-pack-registry.js';

import appstoreRoutes from '../routes/appstore.routes.js';
import navigationRoutes from '../routes/navigation.routes.js';
import routesRoutes from '../routes/routes.routes.js';
import serviceProvisioningRoutes from '../routes/service-provisioning.routes.js';
import serviceAdminRoutes from '../routes/service-admin.routes.js';
import publicRoutes from '../routes/public.routes.js';
import { createSiteGuideRoutes } from '../routes/siteguide/index.js';
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
import userRoleRoutes from '../routes/user-role.routes.js';
import { createRoleApplicationController } from '../routes/v2/role-application.controller.js';
import organizationRoutes from '../routes/organization.routes.js';
import linkedAccountsRoutes from '../routes/linked-accounts.js';
import { createMembershipRoutes } from '@o4o/membership-yaksa';
import marketTrialRoutes from '../routes/market-trial.routes.js';
import aiQueryRoutes from '../routes/ai-query.routes.js';
import aiProxyRoutes from '../routes/ai-proxy.routes.js';
import aiAdminRoutes from '../routes/ai-admin.routes.js';
import { MarketTrialController } from '../controllers/market-trial/marketTrialController.js';
import { MarketTrialOperatorController } from '../controllers/market-trial/marketTrialOperatorController.js';
import { createNetureOperatorTrialRoutes } from '../routes/market-trial-operator.routes.js';
import trialShippingRoutes from '../extensions/trial-shipping/index.js';
import trialFulfillmentRoutes from '../extensions/trial-fulfillment/index.js';
import { TrialFulfillmentController } from '../extensions/trial-fulfillment/trialFulfillment.controller.js';
import { TrialShippingController } from '../extensions/trial-shipping/trialShipping.controller.js';
import { setDataSource as setShippingStoreDataSource } from '../extensions/trial-shipping/trialShipping.store.js';
import { setDataSource as setFulfillmentStoreDataSource } from '../extensions/trial-fulfillment/trialFulfillment.store.js';
import partnerRoutes from '../routes/partner.routes.js';
import { partnerDashboardRoutes, partnerApplicationRoutes } from '../modules/partner/index.js';
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
import { createYaksaRoutes } from '../routes/yaksa/yaksa.routes.js';
import { createGlycopharmRoutes } from '../routes/glycopharm/glycopharm.routes.js';
import { createKpaRoutes, createKpaJoinPublicRoutes } from '../routes/kpa/kpa.routes.js';
import { createNetureRoutes } from '../routes/neture/neture.routes.js';
import createNetureModuleRoutes from '../modules/neture/neture.routes.js';
import netureLibraryRoutes from '../modules/neture/neture-library.routes.js';
import { createCatalogImportRoutes } from '../modules/catalog-import/catalog-import.routes.js';
import { createDropshippingAdminRoutes } from '../routes/dropshipping-admin/dropshipping-admin.routes.js';
import { createCmsContentRoutes } from '../routes/cms-content/cms-content.routes.js';
import { createContentAssetsRoutes } from '../routes/content/content-assets.routes.js';
import { createDashboardAssetsRoutes } from '../routes/dashboard/dashboard-assets.routes.js';
import { createSignageRoutes, createSignagePublicRoutes } from '../routes/signage/index.js';
import { createChannelRoutes } from '../routes/channels/channels.routes.js';
import { createAdminPlaybackLogRoutes } from '../routes/admin/channel-playback-logs.routes.js';
import { createAdminHeartbeatRoutes } from '../routes/admin/channel-heartbeat.routes.js';
import { createAdminChannelOpsRoutes } from '../routes/admin/channel-ops.routes.js';
import { createAdminOpsMetricsRoutes } from '../routes/admin/ops-metrics.routes.js';

// SiteGuide Entities (for DataSource registration)
import {
  SiteGuideBusiness,
  SiteGuideApiKey,
  SiteGuideUsageSummary,
  SiteGuideExecutionLog,
} from '../routes/siteguide/entities/index.js';

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
  // WO-O4O-CREDIT-SYSTEM-V1: Credit balance & transactions
  app.use('/api/v1/credits', creditRoutes);
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
  app.use('/api/v1/settings', settingsRoutes);
  app.use('/api/v1/admin/apps', adminAppsRoutes);
  app.use('/api/v1/admin/users', adminUsersRoutes);
  app.use('/api/v1/admin/seed-test-accounts', seedTestAccountsRoutes);
  app.use('/api/v1/service/monitor', serviceMonitorRoutes);

  logger.info('✅ Core API routes registered');
}

// ============================================================================
// PHASE 2: Domain routes — registered AFTER DB init (inside startServer)
// ============================================================================
export async function registerDomainRoutes(app: Application, dataSource: DataSource): Promise<void> {
  try {
    // ========================================================================
    // MODULE LOADER — Load and Activate Apps (Phase 5)
    // ========================================================================
    logger.info('📦 Loading app modules...');

    // 1. Scan workspace and load all app manifests
    await moduleLoader.loadAll();
    const loadedModules = Array.from(moduleLoader.getRegistry().keys());
    logger.info(`✅ Loaded ${loadedModules.length} app modules: ${loadedModules.join(', ')}`);

    // 2. Install all modules (멱등성 전제)
    let installedCount = 0;
    for (const moduleId of loadedModules) {
      try {
        await moduleLoader.installModule(moduleId, dataSource);
        installedCount++;
      } catch (installError) {
        logger.warn(`Install hook failed for ${moduleId}, continuing:`, installError);
      }
    }
    logger.info(`✅ Install hooks ran for ${installedCount}/${loadedModules.length} modules`);

    // 3. Activate all modules (with dependency resolution and dataSource)
    let activatedCount = 0;
    for (const moduleId of loadedModules) {
      try {
        await moduleLoader.activateModule(moduleId, dataSource);
        activatedCount++;
      } catch (activationError) {
        logger.error(`Failed to activate module ${moduleId}:`, activationError);
      }
    }
    logger.info(`✅ Activated ${activatedCount}/${loadedModules.length} modules`);

    // 4. Register dynamic routes from activated modules
    const routesRegistered: string[] = [];
    for (const moduleId of loadedModules) {
      const router = moduleLoader.getModuleRouter(moduleId, dataSource);
      if (router) {
        const basePath = `/api/v1/${moduleId}`;
        app.use(basePath, router);
        routesRegistered.push(`${basePath} → ${moduleId}`);
      }
    }
    logger.info(`✅ Registered ${routesRegistered.length} dynamic routes:`);
    routesRegistered.forEach(route => logger.info(`   - ${route}`));

    // 4. Register AppStore routes for app lifecycle management
    app.use('/api/v1/appstore', appstoreRoutes);
    logger.info('✅ AppStore routes registered at /api/v1/appstore');

    // 4.1 Register Navigation routes (Phase P0 Task A - Dynamic Navigation)
    app.use('/api/v1/navigation', navigationRoutes);
    logger.info('✅ Navigation routes registered at /api/v1/navigation');

    // 4.2 Register Routes API (Phase P0 Task B - Dynamic Routing)
    app.use('/api/v1/routes', routesRoutes);
    logger.info('✅ Routes API registered at /api/v1/routes');

    // 5. Load Service Templates and register provisioning routes (Phase 7)
    try {
      await templateRegistry.loadAll();
      app.use('/api/v1/service', serviceProvisioningRoutes);
      logger.info(`✅ Service Templates loaded: ${templateRegistry.getStats().total} templates`);
      logger.info('✅ Service Provisioning routes registered at /api/v1/service');
    } catch (templateError) {
      logger.error('Service Template loading failed:', templateError);
    }

    // 6. Load Init Packs (Phase 8 - Service Environment Initialization)
    try {
      await initPackRegistry.loadAll();
      logger.info(`✅ Init Packs loaded: ${initPackRegistry.getStats().total} packs`);
    } catch (initPackError) {
      logger.error('Init Pack loading failed:', initPackError);
    }

    // 7. Register Service Admin routes (Phase 8)
    app.use('/api/v1/service-admin', serviceAdminRoutes);
    logger.info('✅ Service Admin routes registered at /api/v1/service-admin');

    // 8. Register Public routes (no auth required)
    app.use('/api/v1/public', publicRoutes);
    logger.info('✅ Public routes registered at /api/v1/public');

    // 8.5. Register SiteGuide routes (independent service - siteguide.co.kr, no auth)
    const siteguideRoutes = createSiteGuideRoutes(dataSource);
    app.use('/api/siteguide', siteguideRoutes);
    logger.info('✅ SiteGuide routes registered at /api/siteguide (independent service)');

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
    logger.info('✅ Store Local Product & Tablet Display routes registered at /api/v1/store/*');

    // 8.13. Register Tablet Operator routes (WO-TABLET-OPERATOR-UI-V1)
    try {
      const { createTabletOperatorController } = await import('../routes/o4o-store/controllers/tablet-operator.controller.js');
      app.use('/api/v1/store', createTabletOperatorController(dataSource));
      logger.info('✅ Tablet Operator routes registered at /api/v1/store/tablet/operator/*');
    } catch (tabletOpError) {
      logger.error('Failed to register Tablet Operator routes:', tabletOpError);
    }

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

    // 13. Register Linked Accounts routes (SSO check, sessions)
    app.use('/api/accounts', linkedAccountsRoutes);
    logger.info('✅ Linked Accounts routes registered at /api/accounts');

    // ========================================================================
    // DOMAIN ROUTES PARTIALLY RESTORED
    // ========================================================================
    // 14. Membership routes (/api/v1/membership) - @o4o/membership-yaksa - RE-ENABLED
    app.use('/api/v1/membership', createMembershipRoutes(dataSource));
    logger.info('✅ Membership routes registered at /api/v1/membership');

    // Still disabled (Phase R2):
    // 15. Reporting routes (/api/reporting) - @o4o/reporting-yaksa
    // 16. AnnualFee routes (/api/annualfee) - @o4o/annualfee-yaksa
    // 17. Cosmetics Seller routes (/api/v1/cosmetics-seller) - @o4o/cosmetics-seller-extension
    // 18. Cosmetics Sample Display routes - @o4o/cosmetics-sample-display-extension
    // 19. Cosmetics Supplier routes - @o4o/cosmetics-supplier-extension
    // 20. Groupbuy-Yaksa routes - @o4o/groupbuy-yaksa

    // 21. Register Partner routes (Phase K)
    app.use('/api/partner', partnerRoutes);
    logger.info('✅ Partner routes registered at /api/partner');

    // 21-a. Register Partner Dashboard API v1 (WO-PARTNER-DASHBOARD-API-BE-IMPLEMENTATION-V1)
    app.use('/api/v1/partner', partnerDashboardRoutes);
    logger.info('✅ Partner Dashboard API v1 registered at /api/v1/partner');

    // 21-b. Register Partner Application API (WO-PARTNER-APPLICATION-V1) - PUBLIC ENDPOINT
    app.use('/api/v1/partner/applications', partnerApplicationRoutes);
    logger.info('✅ Partner Application API registered at /api/v1/partner/applications');

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

    // 22-a. Register Trial Shipping Extension (H8-2)
    setShippingStoreDataSource(dataSource);
    TrialShippingController.setDataSource(dataSource);
    app.use('/api/trial-shipping', trialShippingRoutes);
    logger.info('✅ Trial Shipping Extension registered at /api/trial-shipping');

    // 22-b. Register Trial Fulfillment Extension (H8-3)
    setFulfillmentStoreDataSource(dataSource);
    TrialFulfillmentController.setDataSource(dataSource);
    app.use('/api/trial-fulfillment', trialFulfillmentRoutes);
    logger.info('✅ Trial Fulfillment Extension registered at /api/trial-fulfillment');

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

      // WO-O4O-PAYMENT-EXTENSION-ROLL-OUT-V0.1: 결제 이벤트 핸들러 초기화
      const { initializeKCosmeticsPaymentHandler } = await import('../services/cosmetics/KCosmeticsPaymentEventHandler.js');
      initializeKCosmeticsPaymentHandler(dataSource);
      logger.info('✅ KCosmeticsPaymentEventHandler initialized');
    } catch (cosmeticsError) {
      logger.error('Failed to register Cosmetics routes:', cosmeticsError);
    }

    // LMS Payment Handler (Dormant — v1 Freeze)
    try {
      const { initializeLmsPaymentHandler } = await import('../modules/lms/services/LmsPaymentEventHandler.js');
      initializeLmsPaymentHandler(dataSource);
      logger.info('✅ LmsPaymentEventHandler initialized (dormant)');
    } catch (lmsPaymentError) {
      logger.error('Failed to initialize LmsPaymentEventHandler:', lmsPaymentError);
    }

    // 26. Register Yaksa routes (Phase A-1)
    try {
      const yaksaRoutes = createYaksaRoutes(dataSource);
      app.use('/api/v1/yaksa', yaksaRoutes);
      logger.info('✅ Yaksa routes registered at /api/v1/yaksa');
    } catch (yaksaError) {
      logger.error('Failed to register Yaksa routes:', yaksaError);
    }

    // 27. Register Glycopharm routes (Phase B-1)
    try {
      const glycopharmRoutes = createGlycopharmRoutes(dataSource);
      app.use('/api/v1/glycopharm', glycopharmRoutes);
      logger.info('✅ Glycopharm routes registered at /api/v1/glycopharm');

      // WO-O4O-PAYMENT-CORE-GLYCOPHARM-PILOT-V1: 결제 이벤트 핸들러 초기화
      const { initializeGlycopharmPaymentHandler } = await import('../services/glycopharm/GlycopharmPaymentEventHandler.js');
      initializeGlycopharmPaymentHandler(dataSource);
      logger.info('✅ GlycopharmPaymentEventHandler initialized');
    } catch (glycopharmError) {
      logger.error('Failed to register Glycopharm routes:', glycopharmError);
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

    // 29. Register Neture routes (Phase D-1)
    try {
      const netureRoutes = createNetureRoutes(dataSource);
      app.use('/api/v1/neture', netureRoutes);
      logger.info('✅ Neture routes registered at /api/v1/neture');
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

    // 30. Register Dropshipping Admin routes (DS-3)
    try {
      const dropshippingAdminRoutes = createDropshippingAdminRoutes(dataSource);
      app.use('/api/v1/dropshipping', dropshippingAdminRoutes);
      logger.info('✅ Dropshipping Admin routes registered at /api/v1/dropshipping/admin');
    } catch (dropshippingError) {
      logger.error('Failed to register Dropshipping Admin routes:', dropshippingError);
    }

    // 31. Register KPA routes (Pharmacist Association SaaS)
    try {
      const kpaRoutes = createKpaRoutes(dataSource);
      app.use('/api/v1/kpa', kpaRoutes);
      logger.info('✅ KPA routes registered at /api/v1/kpa');

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

    // 37-b. Store HUB Test Seed routes (VERIFICATION-STORE-HUB-STAGE-1)
    try {
      const { createSeedStoreHubRouter } = await import('../modules/admin/seed-store-hub.controller.js');
      app.use('/api/v1/ops/seed-store-hub', createSeedStoreHubRouter(dataSource));
      logger.info('✅ Store HUB Seed routes registered at /api/v1/ops/seed-store-hub');
    } catch (seedStoreHubError) {
      logger.error('Failed to register Store HUB Seed routes:', seedStoreHubError);
    }

    // 37-b2. Neture Supplier Offers Test Seed routes (WO-NETURE-TEST-PRODUCT-RESET-AND-RESEED-V1)
    try {
      const { createSeedNetureOffersRouter } = await import('../modules/admin/seed-neture-offers.controller.js');
      app.use('/api/v1/ops/seed-neture-offers', createSeedNetureOffersRouter(dataSource));
      logger.info('✅ Neture Offers Seed routes registered at /api/v1/ops/seed-neture-offers');
    } catch (seedNetureOffersError) {
      logger.error('Failed to register Neture Offers Seed routes:', seedNetureOffersError);
    }

    // 37-e. Register RBAC DB Audit debug endpoint (WO-RBAC-DB-AUDIT-JSON-ENDPOINT-V1)
    try {
      const { createRbacDbAuditRouter } = await import('../routes/debug/rbac-db-audit.controller.js');
      app.use('/__debug__/rbac-db-audit', createRbacDbAuditRouter(dataSource));
      logger.info('✅ RBAC DB Audit endpoint registered at /__debug__/rbac-db-audit');
    } catch (rbacAuditError) {
      logger.error('Failed to register RBAC DB Audit routes:', rbacAuditError);
    }

    // TEMP: GlycoPharm Test Account Audit (IR-GLYCOPHARM-TEST-ACCOUNT-EXTRACT-V2) — remove after use
    try {
      const { createGlycopharmTestAccountsRouter } = await import('../routes/debug/glycopharm-test-accounts.controller.js');
      app.use('/__debug__/glycopharm-test-accounts', createGlycopharmTestAccountsRouter(dataSource));
      logger.info('✅ GlycoPharm Test Accounts endpoint registered at /__debug__/glycopharm-test-accounts');
    } catch (glycoTestError) {
      logger.error('Failed to register GlycoPharm Test Accounts:', glycoTestError);
    }

    // 37-f. Service Users Audit endpoint
    try {
      const { createServiceUsersAuditRouter } = await import('../routes/debug/service-users-audit.controller.js');
      app.use('/__debug__/service-users', createServiceUsersAuditRouter(dataSource));
      logger.info('✅ Service Users Audit endpoint registered at /__debug__/service-users');
    } catch (serviceUsersError) {
      logger.error('Failed to register Service Users Audit:', serviceUsersError);
    }

    // 37-e. Register RBAC Backfill User Role endpoint (WO-RBAC-DATA-NORMALIZATION-EXECUTION-V1)
    try {
      const { createRbacBackfillUserRoleRouter } = await import('../routes/debug/rbac-backfill-user-role.controller.js');
      app.use('/__debug__/rbac-backfill-user-role', createRbacBackfillUserRoleRouter(dataSource));
      logger.info('✅ RBAC Backfill User Role endpoint registered at /__debug__/rbac-backfill-user-role');
    } catch (rbacBackfillError) {
      logger.error('Failed to register RBAC Backfill User Role routes:', rbacBackfillError);
    }

    // Approval Test debug endpoint
    try {
      const { createApprovalTestRouter } = await import('../routes/debug/approval-test.controller.js');
      app.use('/__debug__/approval-test', createApprovalTestRouter(dataSource));
      logger.info('✅ Approval Test endpoint registered at /__debug__/approval-test');
    } catch (approvalTestError) {
      logger.error('Failed to register Approval Test routes:', approvalTestError);
    }

    // User Debug Info endpoint (WO-O4O-DEBUG-USER-JSON-PAGE-V1)
    try {
      const { createUserDebugRouter } = await import('../routes/debug/user-debug.controller.js');
      app.use('/__debug__/user', createUserDebugRouter(dataSource));
      logger.info('✅ User Debug endpoint registered at /__debug__/user');
    } catch (userDebugError) {
      logger.error('Failed to register User Debug routes:', userDebugError);
    }

    // Pharmacy Debug endpoint (임시 운영 도구)
    try {
      const { createPharmacyDebugRouter } = await import('../routes/debug/pharmacy-debug.controller.js');
      app.use('/__debug__/pharmacy', createPharmacyDebugRouter(dataSource));
      logger.info('✅ Pharmacy Debug endpoint registered at /__debug__/pharmacy');
    } catch (pharmacyDebugError) {
      logger.error('Failed to register Pharmacy Debug routes:', pharmacyDebugError);
    }

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

    // 40. Register Product Policy v2 Internal routes (WO-PRODUCT-POLICY-V2-INTERNAL-TEST-ENDPOINT-V1)
    if (process.env.ENABLE_INTERNAL_V2 === 'true') {
      try {
        const { createProductPolicyV2InternalRouter } = await import('../modules/product-policy-v2/product-policy-v2.internal.routes.js');
        const v2InternalRoutes = createProductPolicyV2InternalRouter(dataSource);
        app.use('/api/internal/v2/product-policy', v2InternalRoutes);
        logger.info('✅ Product Policy v2 internal routes registered at /api/internal/v2/product-policy');
      } catch (v2InternalError) {
        logger.error('Failed to register Product Policy v2 internal routes:', v2InternalError);
      }
    }

    logger.info('✅ Routes registered via module loader');

    // Collect entities from modules (for future TypeORM integration)
    const moduleEntities = moduleLoader.getAllEntities();
    if (moduleEntities.length > 0) {
      logger.info(`📊 Collected ${moduleEntities.length} entities from modules`);
    }

  } catch (moduleLoaderError) {
    logger.error('Module Loader initialization failed:', moduleLoaderError);
    // Continue server startup even if module loading fails
  }
}

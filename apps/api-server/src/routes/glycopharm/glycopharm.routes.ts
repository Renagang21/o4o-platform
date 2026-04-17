/**
 * Glycopharm Routes
 *
 * Phase B-1: Glycopharm API Implementation
 * Route factory for Glycopharm API endpoints
 */

import { Router, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { createGlycopharmController } from './controllers/glycopharm.controller.js';
// display.controller removed — WO-O4O-GLYCOPHARM-SIGNAGE-MIGRATION-V1
import { createForumRequestController } from './controllers/forum-request.controller.js';
import { createApplicationController } from './controllers/application.controller.js';
import { createAdminController } from './controllers/admin.controller.js';
import { createStoreApplicationsController } from './controllers/store-applications.controller.js';
import { createCheckoutController } from './controllers/checkout.controller.js'; // Phase 4-B: E-commerce Core Integration
import { createGlycopharmPaymentController } from './controllers/glycopharm-payment.controller.js'; // WO-O4O-PAYMENT-CORE-GLYCOPHARM-PILOT-V1
import { createCockpitController } from './controllers/cockpit.controller.js';
// hub-trigger.controller removed — WO-O4O-GLYCOPHARM-CARE-REMOVAL-V1 (care-only endpoints)
// signage.controller removed — WO-O4O-GLYCOPHARM-SIGNAGE-MIGRATION-V1
import { createOperatorController } from './controllers/operator.controller.js';
import { createPublicController } from './controllers/public.controller.js';
import { createStoreController } from './controllers/store.controller.js'; // WO-O4O-STOREFRONT-ACTIVATION-V1
import { createTabletController } from '../o4o-store/controllers/tablet.controller.js'; // WO-STORE-TABLET-REQUEST-CHANNEL-V1
import { createBlogController } from '../o4o-store/controllers/blog.controller.js'; // WO-STORE-BLOG-CHANNEL-V1
import { createLayoutController } from '../o4o-store/controllers/layout.controller.js'; // WO-STORE-BLOCK-ENGINE-V1
import { createStoreSettingsController } from '../o4o-store/controllers/store-settings.controller.js'; // WO-STORE-COMMON-SETTINGS-FOUNDATION-V1
// WO-O4O-GLYCOPHARM-STORE-HUB-ADOPTION-V1
import { createStoreHubController } from '../o4o-store/controllers/store-hub.controller.js';
import { createPharmacyProductsController } from '../o4o-store/controllers/pharmacy-products.controller.js';
import { createStoreChannelProductsController } from '../o4o-store/controllers/store-channel-products.controller.js';
import { createStoreAnalyticsController } from '../o4o-store/controllers/store-analytics.controller.js';
import { createStoreContentController } from '../o4o-store/controllers/store-content.controller.js';
import { createStorePlaylistController } from '../o4o-store/controllers/store-playlist.controller.js';
import { createStoreLibraryController } from '../o4o-store/controllers/store-library.controller.js';
import { createStoreQrLandingController } from '../o4o-store/controllers/store-qr-landing.controller.js';
import { createStorePopController } from '../o4o-store/controllers/store-pop.controller.js';
import { createPharmacyStoreConfigController } from '../o4o-store/controllers/pharmacy-store-config.controller.js';
import { createProductMarketingController } from '../o4o-store/controllers/product-marketing.controller.js';
import { createAssetSnapshotController } from '../o4o-store/controllers/asset-snapshot.controller.js';
import { createStoreAssetControlController } from '../o4o-store/controllers/store-asset-control.controller.js';
import { createPublishedAssetsController } from '../o4o-store/controllers/published-assets.controller.js';
import { createPharmacyController, createB2BController } from './controllers/pharmacy.controller.js';
import { createCustomerRequestController } from './controllers/customer-request.controller.js'; // Phase 1: Common Request
import { createEventController } from './controllers/event.controller.js'; // Phase 2-A: Event → Request
import { createFunnelController } from './controllers/funnel.controller.js'; // Phase 3-A: Funnel Visualization
import { createReportController } from './controllers/report.controller.js'; // Phase 3-B: Billing Report
import { createBillingPreviewController } from './controllers/billing-preview.controller.js'; // Phase 3-C: Billing Preview
import { createInvoiceController } from './controllers/invoice.controller.js'; // Phase 3-D: Invoice Finalization
import { createInvoiceDispatchController } from './controllers/invoice-dispatch.controller.js'; // Phase 3-E: Invoice Dispatch
import { createGlycopharmCommunityHubController } from './controllers/glycopharm-community-hub.controller.js'; // WO-GLYCOPHARM-COMMUNITY-HUB-IMPLEMENTATION-V1
import { createGlycopharmMemberController } from './controllers/glycopharm-member.controller.js'; // WO-GLYCOPHARM-MEMBER-REGISTER-FLOW-V1
import { requireAuth as coreRequireAuth, authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { hasAnyServiceRole, logLegacyRoleUsage } from '../../utils/role.utils.js';
import { GLYCOPHARM_SCOPE_CONFIG } from '@o4o/security-core';
import { createMembershipScopeGuard } from '../../common/middleware/membership-guard.middleware.js';
import { ActionLogService } from '@o4o/action-log-core';
// WO-O4O-OPERATOR-ACTION-LAYER-V1
import { createActionQueueRouter } from '../../common/action-queue/index.js';
import { glycopharmActionConfig } from './action-definitions.js';
import { createPharmacyContextMiddleware } from './pharmacy-context.middleware.js';

// Domain controllers - Forum
import { ForumController } from '../../controllers/forum/ForumController.js';
import { forumContextMiddleware } from '../../middleware/forum-context.middleware.js';
import { FORUM_ORGS } from '../../controllers/forum/forum-organizations.js';

/**
 * GlycoPharm Scope Guard — powered by @o4o/security-core
 *
 * Replaces inline implementation with shared security-core guard factory.
 * Behavior is identical: glycopharm roles, platform bypass, legacy detect+deny.
 */
const requireGlycopharmScope = createMembershipScopeGuard(GLYCOPHARM_SCOPE_CONFIG);

/**
 * Create Glycopharm routes
 */
export function createGlycopharmRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Shared ActionLogService (used by cockpit + hub-trigger + admin + store-applications)
  const actionLogService = new ActionLogService(dataSource);

  // Core pharmacy/product routes
  const glycopharmController = createGlycopharmController(
    dataSource,
    coreRequireAuth as any,
    requireGlycopharmScope
  );
  router.use('/', glycopharmController);

  // Smart Display routes removed — WO-O4O-GLYCOPHARM-SIGNAGE-MIGRATION-V1

  // Member registration/approval routes — WO-GLYCOPHARM-MEMBER-REGISTER-FLOW-V1
  const glycopharmMemberController = createGlycopharmMemberController(
    dataSource,
    coreRequireAuth as any,
  );
  router.use('/', glycopharmMemberController);

  // Forum Category Request routes
  const forumRequestController = createForumRequestController(
    dataSource,
    coreRequireAuth as any,
    requireGlycopharmScope
  );
  router.use('/forum-requests', forumRequestController);

  // Application routes (pharmacy participation/service applications)
  const applicationController = createApplicationController(
    dataSource,
    coreRequireAuth as any,
    requireGlycopharmScope
  );
  router.use('/', applicationController);

  // Admin routes (operator/admin application review)
  const adminController = createAdminController(
    dataSource,
    coreRequireAuth as any,
    requireGlycopharmScope,
    actionLogService,
  );
  router.use('/', adminController);

  // Store Applications routes (WO-O4O-STORE-APPLICATIONS-API-IMPLEMENTATION-V1)
  const storeApplicationsController = createStoreApplicationsController(
    dataSource,
    coreRequireAuth as any,
    actionLogService,
  );
  router.use('/store-applications', storeApplicationsController);

  // ============================================================================
  // Checkout Routes - Phase 4-B: E-commerce Core Integration
  // GlycoPharm orders are now handled via E-commerce Core with OrderType.GLYCOPHARM
  // ============================================================================
  const checkoutController = createCheckoutController(
    dataSource,
    coreRequireAuth as any
  );
  router.use('/checkout', checkoutController);

  // ============================================================================
  // Payment Routes - WO-O4O-PAYMENT-CORE-GLYCOPHARM-PILOT-V1
  // PaymentCoreService를 통한 결제 흐름 (prepare → confirm → query)
  // ============================================================================
  const paymentController = createGlycopharmPaymentController(
    dataSource,
    coreRequireAuth as any
  );
  router.use('/payments', paymentController);

  // ============================================================================
  // Forum Routes - /api/v1/glycopharm/forum/*
  // ============================================================================
  const forumRouter = Router();
  const forumController = new ForumController();

  // Inject service context for all forum routes
  forumRouter.use(forumContextMiddleware({ serviceCode: 'glycopharm', organizationId: FORUM_ORGS.GLYCOPHARM }));

  // Health check
  forumRouter.get('/health', forumController.health.bind(forumController));

  // Statistics
  forumRouter.get('/stats', optionalAuth, forumController.getStats.bind(forumController));

  // Posts
  forumRouter.get('/posts', optionalAuth, forumController.listPosts.bind(forumController));
  forumRouter.get('/posts/:id', optionalAuth, forumController.getPost.bind(forumController));
  forumRouter.post('/posts', authenticate, forumController.createPost.bind(forumController));
  forumRouter.put('/posts/:id', authenticate, forumController.updatePost.bind(forumController));
  forumRouter.delete('/posts/:id', authenticate, forumController.deletePost.bind(forumController));
  forumRouter.post('/posts/:id/like', authenticate, forumController.toggleLike.bind(forumController));

  // Comments
  forumRouter.get('/posts/:postId/comments', forumController.listComments.bind(forumController));
  forumRouter.post('/comments', authenticate, forumController.createComment.bind(forumController));

  // Categories — Named routes BEFORE :id
  forumRouter.get('/categories', forumController.listCategories.bind(forumController));
  forumRouter.get('/categories/mine', authenticate, forumController.listMyCategories.bind(forumController));
  forumRouter.get('/categories/:id', forumController.getCategory.bind(forumController));
  forumRouter.patch('/categories/:id/owner', authenticate, forumController.updateMyCategory.bind(forumController));
  forumRouter.post('/categories/:id/delete-request', authenticate, forumController.requestDeleteCategory.bind(forumController));
  forumRouter.post('/categories', authenticate, forumController.createCategory.bind(forumController));
  forumRouter.put('/categories/:id', authenticate, forumController.updateCategory.bind(forumController));
  forumRouter.delete('/categories/:id', authenticate, forumController.deleteCategory.bind(forumController));

  // Moderation
  forumRouter.get('/moderation', authenticate, forumController.getModerationQueue.bind(forumController));
  forumRouter.post('/moderation/:type/:id', authenticate, forumController.moderateContent.bind(forumController));

  router.use('/forum', forumRouter);

  // Cockpit routes (Pharmacy Dashboard 2.0)
  const cockpitController = createCockpitController(
    dataSource,
    coreRequireAuth as any,
    requireGlycopharmScope,
    actionLogService,
  );
  router.use('/pharmacy/cockpit', cockpitController);

  // WO-GLYCOPHARM-SCOPE-SIMPLIFICATION-V1: shared pharmacy context middleware
  const requirePharmacyContext = createPharmacyContextMiddleware(dataSource);

  // Pharmacy-specific routes (products, orders, customers, categories)
  const pharmacyController = createPharmacyController(
    dataSource,
    coreRequireAuth as any,
    requirePharmacyContext as any,
  );
  router.use('/pharmacy', pharmacyController);

  // ============================================================================
  // Community Hub Routes - WO-GLYCOPHARM-COMMUNITY-HUB-IMPLEMENTATION-V1
  // /api/v1/glycopharm/community/*
  // ============================================================================
  const communityHubController = createGlycopharmCommunityHubController(
    dataSource,
    coreRequireAuth as any,
    requireGlycopharmScope as any,
  );
  router.use('/', communityHubController);

  // ============================================================================
  // Customer Request Routes - Phase 1: Common Request Implementation
  // /api/v1/glycopharm/requests/*
  // ============================================================================
  const customerRequestController = createCustomerRequestController(
    dataSource,
    coreRequireAuth as any
  );
  router.use('/', customerRequestController);

  // ============================================================================
  // Event Routes - Phase 2-A: Event → Request Connection
  // /api/v1/glycopharm/events/*
  // ============================================================================
  const eventController = createEventController(
    dataSource,
    coreRequireAuth as any
  );
  router.use('/', eventController);

  // ============================================================================
  // Funnel Routes - Phase 3-A: Funnel Visualization
  // /api/v1/glycopharm/funnel/*
  // ============================================================================
  const funnelController = createFunnelController(
    dataSource,
    coreRequireAuth as any
  );
  router.use('/', funnelController);

  // ============================================================================
  // Report Routes - Phase 3-B: Billing Basis Report
  // /api/v1/glycopharm/reports/*
  // ============================================================================
  const reportController = createReportController(
    dataSource,
    coreRequireAuth as any
  );
  router.use('/', reportController);

  // ============================================================================
  // Billing Preview Routes - Phase 3-C: Billing Automation (Preview Only)
  // /api/v1/glycopharm/billing/preview/*
  // ============================================================================
  const billingPreviewController = createBillingPreviewController(
    dataSource,
    coreRequireAuth as any
  );
  router.use('/', billingPreviewController);

  // ============================================================================
  // Invoice Routes - Phase 3-D: Invoice Finalization (Snapshot & Confirm)
  // /api/v1/glycopharm/invoices/*
  // ============================================================================
  const invoiceController = createInvoiceController(
    dataSource,
    coreRequireAuth as any
  );
  router.use('/', invoiceController);

  // ============================================================================
  // Invoice Dispatch Routes - Phase 3-E: Invoice Dispatch (Send/Receive)
  // /api/v1/glycopharm/invoices/:id/send, /received, /dispatch-log
  // ============================================================================
  const invoiceDispatchController = createInvoiceDispatchController(
    dataSource,
    coreRequireAuth as any
  );
  router.use('/', invoiceDispatchController);

  // B2B products routes
  const b2bController = createB2BController(
    dataSource,
    coreRequireAuth as any
  );
  router.use('/b2b', b2bController);

  // Market trials: WO-MARKET-TRIAL-B2B-API-UNIFICATION-V1
  // Removed glycopharm-specific stub. Use common API: GET /api/market-trial?serviceKey=glycopharm

  // Forums list endpoint (for pharmacy forum extension)
  router.get('/forums', coreRequireAuth as any, async (_req, res) => {
    try {
      // Return empty array for now - feature to be implemented
      res.json({
        success: true,
        data: [],
      });
    } catch (error: any) {
      console.error('Failed to get forums:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  // Signage routes (채널, 내 사이니지 편성)
  // signage controller removed — WO-O4O-GLYCOPHARM-SIGNAGE-MIGRATION-V1

  // Operator Dashboard routes (WO-GLYCOPHARM-DASHBOARD-P1-A)
  const operatorController = createOperatorController(
    dataSource,
    coreRequireAuth as any,
    actionLogService
  );
  router.use('/operator', operatorController);

  // WO-O4O-OPERATOR-ACTION-LAYER-V1: Action Queue endpoints
  // WO-O4O-ACTION-SCOPE-GUARD-V1: execute endpoint admin-only scope guard
  router.use('/operator', coreRequireAuth as any, createActionQueueRouter(dataSource, glycopharmActionConfig, requireGlycopharmScope('glycopharm:admin')));

  // ============================================================================
  // Store HUB Controllers (WO-O4O-GLYCOPHARM-STORE-HUB-ADOPTION-V1)
  // KPA 수준 Store HUB 기능 완전 적용
  // ============================================================================

  // Store Hub — Dashboard overview, channels, KPI, live signals
  router.use('/store-hub', createStoreHubController(dataSource, coreRequireAuth as any));

  // Channel Product Management — 채널별 상품 진열 관리
  router.use('/store-hub/channel-products', createStoreChannelProductsController(dataSource, coreRequireAuth as any));

  // Pharmacy Store Config — 스토어프론트 설정
  router.use('/pharmacy/store', createPharmacyStoreConfigController(dataSource, coreRequireAuth as any));

  // Pharmacy Products — 상품 채택/관리
  router.use('/pharmacy/products', createPharmacyProductsController(dataSource, coreRequireAuth as any));

  // Asset Snapshot
  router.use('/assets', createAssetSnapshotController(dataSource, coreRequireAuth as any));

  // Store Asset Control
  router.use('/store-assets', createStoreAssetControlController(dataSource, coreRequireAuth as any));

  // Store Content — 콘텐츠 오버라이드
  router.use('/store-contents', createStoreContentController(dataSource, coreRequireAuth as any));

  // Store Playlist — 사이니지 플레이리스트
  router.use('/store-playlists', createStorePlaylistController(dataSource, coreRequireAuth as any));

  // Store Library (internal: /pharmacy/library/*)
  router.use('/', createStoreLibraryController(dataSource, coreRequireAuth as any));

  // Store QR Landing (internal: /qr/public/*, /pharmacy/qr/*)
  router.use('/', createStoreQrLandingController(dataSource, coreRequireAuth as any));

  // Store POP (internal: /pharmacy/pop/*)
  router.use('/', createStorePopController(dataSource, coreRequireAuth as any));

  // Store Analytics (internal: /pharmacy/analytics/*)
  router.use('/', createStoreAnalyticsController(dataSource, coreRequireAuth as any));

  // Product Marketing Graph (internal: /pharmacy/products/*/marketing)
  router.use('/', createProductMarketingController(dataSource, coreRequireAuth as any));

  // Published Assets
  router.use('/published-assets', createPublishedAssetsController(dataSource));

  // ============================================================================
  // Tablet Request Channel Routes (WO-STORE-TABLET-REQUEST-CHANNEL-V1)
  // /api/v1/glycopharm/stores/:slug/tablet/*
  // Must be registered BEFORE storeController for path priority
  // ============================================================================
  const tabletController = createTabletController(dataSource, coreRequireAuth as any);
  router.use('/stores', tabletController);

  // ============================================================================
  // Store Blog Channel Routes (WO-STORE-BLOG-CHANNEL-V1)
  // /api/v1/glycopharm/stores/:slug/blog/*
  // Must be registered BEFORE storeController for path priority
  // ============================================================================
  const blogController = createBlogController(dataSource, coreRequireAuth as any);
  router.use('/stores', blogController);

  // ============================================================================
  // Store Layout Block Engine (WO-STORE-BLOCK-ENGINE-V1)
  // /api/v1/glycopharm/stores/:slug/layout
  // ============================================================================
  const layoutController = createLayoutController(dataSource, coreRequireAuth as any);
  router.use('/stores', layoutController);

  // WO-STORE-COMMON-SETTINGS-FOUNDATION-V1: unified settings + channel config
  const glycopharmStoreSettingsController = createStoreSettingsController(dataSource, coreRequireAuth as any);
  router.use('/stores', glycopharmStoreSettingsController);

  // ============================================================================
  // Store Routes (Public StoreFront API, slug 기반)
  // WO-O4O-STOREFRONT-ACTIVATION-V1 Phase 1
  // ============================================================================
  const storeController = createStoreController(dataSource);
  router.use('/stores', storeController);

  // ============================================================================
  // Public Routes (인증 불필요, 공개 페이지용)
  // WO-GP-HOME-RESTRUCTURE-V1 (Phase 6)
  // ============================================================================
  const publicController = createPublicController(dataSource);
  router.use('/public', publicController);

  return router;
}

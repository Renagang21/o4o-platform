/**
 * Glycopharm Routes
 *
 * Phase B-1: Glycopharm API Implementation
 * Route factory for Glycopharm API endpoints
 */

import { Router, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { createGlycopharmController } from './controllers/glycopharm.controller.js';
import { createDisplayController } from './controllers/display.controller.js';
import { createForumRequestController } from './controllers/forum-request.controller.js';
import { createApplicationController } from './controllers/application.controller.js';
import { createAdminController } from './controllers/admin.controller.js';
import { createCheckoutController } from './controllers/checkout.controller.js'; // Phase 4-B: E-commerce Core Integration
import { createGlycopharmPaymentController } from './controllers/glycopharm-payment.controller.js'; // WO-O4O-PAYMENT-CORE-GLYCOPHARM-PILOT-V1
import { createCockpitController } from './controllers/cockpit.controller.js';
import { createHubTriggerController } from './controllers/hub-trigger.controller.js'; // WO-GLYCOPHARM-HUB-AI-TRIGGER-INTEGRATION-V1
import { createSignageController } from './controllers/signage.controller.js';
import { createOperatorController } from './controllers/operator.controller.js';
import { createPublicController } from './controllers/public.controller.js';
import { createStoreController } from './controllers/store.controller.js'; // WO-O4O-STOREFRONT-ACTIVATION-V1
import { createPharmacyController, createB2BController, createMarketTrialsController } from './controllers/pharmacy.controller.js';
import { createCustomerRequestController } from './controllers/customer-request.controller.js'; // Phase 1: Common Request
import { createEventController } from './controllers/event.controller.js'; // Phase 2-A: Event → Request
import { createFunnelController } from './controllers/funnel.controller.js'; // Phase 3-A: Funnel Visualization
import { createReportController } from './controllers/report.controller.js'; // Phase 3-B: Billing Report
import { createBillingPreviewController } from './controllers/billing-preview.controller.js'; // Phase 3-C: Billing Preview
import { createInvoiceController } from './controllers/invoice.controller.js'; // Phase 3-D: Invoice Finalization
import { createInvoiceDispatchController } from './controllers/invoice-dispatch.controller.js'; // Phase 3-E: Invoice Dispatch
import { requireAuth as coreRequireAuth, authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { hasAnyServiceRole, logLegacyRoleUsage } from '../../utils/role.utils.js';
import { createServiceScopeGuard, GLYCOPHARM_SCOPE_CONFIG } from '@o4o/security-core';
import { ActionLogService } from '@o4o/action-log-core';

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
const requireGlycopharmScope = createServiceScopeGuard(GLYCOPHARM_SCOPE_CONFIG);

/**
 * Create Glycopharm routes
 */
export function createGlycopharmRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Core pharmacy/product routes
  const glycopharmController = createGlycopharmController(
    dataSource,
    coreRequireAuth as any,
    requireGlycopharmScope
  );
  router.use('/', glycopharmController);

  // Smart Display routes
  const displayController = createDisplayController(
    dataSource,
    coreRequireAuth as any,
    requireGlycopharmScope
  );
  router.use('/display', displayController);

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
    requireGlycopharmScope
  );
  router.use('/', adminController);

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

  // Categories
  forumRouter.get('/categories', forumController.listCategories.bind(forumController));
  forumRouter.get('/categories/:id', forumController.getCategory.bind(forumController));
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
    requireGlycopharmScope
  );
  router.use('/pharmacy/cockpit', cockpitController);

  // ============================================================================
  // Hub Trigger Routes — QuickAction execution endpoints
  // WO-GLYCOPHARM-HUB-AI-TRIGGER-INTEGRATION-V1
  // ============================================================================
  const actionLogService = new ActionLogService(dataSource);
  const hubTriggerController = createHubTriggerController(
    dataSource,
    coreRequireAuth as any,
    actionLogService,
  );
  router.use('/pharmacy/hub', hubTriggerController);

  // Pharmacy-specific routes (products, orders, customers, categories)
  const pharmacyController = createPharmacyController(
    dataSource,
    coreRequireAuth as any
  );
  router.use('/pharmacy', pharmacyController);

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

  // Market trials routes
  const marketTrialsController = createMarketTrialsController(
    dataSource,
    coreRequireAuth as any
  );
  router.use('/market-trials', marketTrialsController);

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
  const signageController = createSignageController(
    dataSource,
    coreRequireAuth as any
  );
  router.use('/signage', signageController);

  // Operator Dashboard routes (WO-GLYCOPHARM-DASHBOARD-P1-A)
  const operatorController = createOperatorController(
    dataSource,
    coreRequireAuth as any
  );
  router.use('/operator', operatorController);

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

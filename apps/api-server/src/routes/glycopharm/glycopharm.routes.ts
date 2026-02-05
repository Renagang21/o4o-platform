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
import { createCockpitController } from './controllers/cockpit.controller.js';
import { createSignageController } from './controllers/signage.controller.js';
import { createOperatorController } from './controllers/operator.controller.js';
import { createPublicController } from './controllers/public.controller.js';
import { createPharmacyController, createB2BController, createMarketTrialsController } from './controllers/pharmacy.controller.js';
import { requireAuth as coreRequireAuth, authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { hasAnyServiceRole, logLegacyRoleUsage } from '../../utils/role.utils.js';

// Domain controllers - Forum
import { ForumController } from '../../controllers/forum/ForumController.js';
import { forumContextMiddleware } from '../../middleware/forum-context.middleware.js';
import { FORUM_ORGS } from '../../controllers/forum/forum-organizations.js';

/**
 * Scope verification middleware factory for Glycopharm
 *
 * WO-P4′-MULTI-SERVICE-ROLE-PREFIX-IMPLEMENTATION-V1 (Phase 4.2: GlycoPharm)
 * - **GlycoPharm 서비스는 오직 glycopharm:* role만 신뢰**
 * - Priority 1: GlycoPharm prefixed roles ONLY (glycopharm:admin, glycopharm:operator)
 * - Priority 2: Legacy role detection → Log + DENY
 * - Scopes: glycopharm:* pattern (service-specific)
 * - platform:admin 허용 (플랫폼 감독)
 */
function requireGlycopharmScope(scope: string): RequestHandler {
  return (req, res, next) => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const userId = user.id || 'unknown';
    const userScopes: string[] = user.scopes || [];
    const userRoles: string[] = user.roles || [];

    // Check scopes (service-specific)
    const hasScope = userScopes.includes(scope) || userScopes.includes('glycopharm:admin');

    // Priority 1: Check GlycoPharm-specific prefixed roles
    const hasGlycopharmRole = hasAnyServiceRole(userRoles, [
      'glycopharm:admin',
      'glycopharm:operator',
      'platform:admin',
      'platform:super_admin'
    ]);

    if (hasScope || hasGlycopharmRole) {
      next();
      return;
    }

    // Priority 2: Detect legacy roles and DENY access
    const legacyRoles = ['admin', 'super_admin', 'operator'];
    const detectedLegacyRoles = userRoles.filter(r => legacyRoles.includes(r));

    if (detectedLegacyRoles.length > 0) {
      // Log legacy role usage and deny access
      detectedLegacyRoles.forEach(role => {
        logLegacyRoleUsage(userId, role, `glycopharm.routes:requireGlycopharmScope(${scope})`);
      });
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Required scope: ${scope}. Legacy roles are no longer supported. Please use glycopharm:* prefixed roles.`
        },
      });
      return;
    }

    // Detect other service roles
    const hasOtherServiceRole = userRoles.some(r =>
      r.startsWith('kpa:') ||
      r.startsWith('neture:') ||
      r.startsWith('cosmetics:') ||
      r.startsWith('glucoseview:')
    );

    if (hasOtherServiceRole) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Required scope: ${scope}. GlycoPharm requires glycopharm:* roles.`
        },
      });
      return;
    }

    // Access denied - No valid role
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: `Required scope: ${scope}` },
    });
  };
}

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

  // Pharmacy-specific routes (products, orders, customers, categories)
  const pharmacyController = createPharmacyController(
    dataSource,
    coreRequireAuth as any
  );
  router.use('/pharmacy', pharmacyController);

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
  // Public Routes (인증 불필요, 공개 페이지용)
  // WO-GP-HOME-RESTRUCTURE-V1 (Phase 6)
  // ============================================================================
  const publicController = createPublicController(dataSource);
  router.use('/public', publicController);

  return router;
}

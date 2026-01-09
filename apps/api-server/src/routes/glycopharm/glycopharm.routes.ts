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
import { createOrderController } from './controllers/order.controller.js';
import { createCockpitController } from './controllers/cockpit.controller.js';
import { createSignageController } from './controllers/signage.controller.js';
import { requireAuth as coreRequireAuth, authenticate, optionalAuth } from '../../middleware/auth.middleware.js';

// Domain controllers - Forum
import { ForumController } from '../../controllers/forum/ForumController.js';

/**
 * Scope verification middleware factory for Glycopharm
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

    // Check for glycopharm:admin scope or admin role
    const userScopes: string[] = user.scopes || [];
    const userRoles: string[] = user.roles || [];

    const hasScope = userScopes.includes(scope) || userScopes.includes('glycopharm:admin');
    const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');

    if (!hasScope && !isAdmin) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: `Required scope: ${scope}` },
      });
      return;
    }

    next();
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

  // Order routes (H8-2)
  const orderController = createOrderController(
    dataSource,
    coreRequireAuth as any
  );
  router.use('/orders', orderController);

  // ============================================================================
  // Forum Routes - /api/v1/glycopharm/forum/*
  // ============================================================================
  const forumRouter = Router();
  const forumController = new ForumController();

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

  // Signage routes (채널, 내 사이니지 편성)
  const signageController = createSignageController(
    dataSource,
    coreRequireAuth as any
  );
  router.use('/signage', signageController);

  return router;
}

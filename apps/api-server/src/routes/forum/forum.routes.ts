import { Router } from 'express';
import { ForumController } from '../../controllers/forum/ForumController.js';
import { createForumCategoryRequestRoutes } from '../../controllers/forum/ForumCategoryRequestController.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import notificationRoutes from './forum.notifications.routes.js';
import aiRoutes from './forum.ai.routes.js';
import recommendationRoutes from './forum.recommendation.routes.js';

const router: Router = Router();
const controller = new ForumController();

/**
 * Forum Routes - /api/v1/forum/*
 *
 * Generic forum API endpoints for admin-dashboard and public access
 *
 * Endpoints:
 * - Health check
 * - Posts CRUD
 * - Categories CRUD
 * - Comments
 * - Statistics
 * - Moderation
 */

// ============================================================================
// Health Check
// ============================================================================
router.get('/health', controller.health.bind(controller));

// ============================================================================
// Statistics (public, but authenticated for detailed stats)
// ============================================================================
router.get('/stats', optionalAuth, controller.getStats.bind(controller));

// ============================================================================
// Posts
// ============================================================================
// List posts (public with optional auth for personalized results)
router.get('/posts', optionalAuth, controller.listPosts.bind(controller));

// Get single post (public with optional auth for view tracking)
router.get('/posts/:id', optionalAuth, controller.getPost.bind(controller));

// Create post (optional auth - guests can post)
router.post('/posts', optionalAuth, controller.createPost.bind(controller));

// Update post (authenticated)
router.put('/posts/:id', authenticate, controller.updatePost.bind(controller));

// Delete post (authenticated)
router.delete('/posts/:id', authenticate, controller.deletePost.bind(controller));

// ============================================================================
// Post Comments
// ============================================================================
// Get comments for a post (public)
router.get('/posts/:postId/comments', controller.listComments.bind(controller));

// ============================================================================
// Comments
// ============================================================================
// Create comment (authenticated)
router.post('/comments', authenticate, controller.createComment.bind(controller));

// Update comment (authenticated - author or admin)
router.put('/comments/:id', authenticate, controller.updateComment.bind(controller));

// Delete comment (authenticated - author or admin)
router.delete('/comments/:id', authenticate, controller.deleteComment.bind(controller));

// ============================================================================
// Categories
// ============================================================================
// List categories (public)
router.get('/categories', controller.listCategories.bind(controller));

// Get single category (public)
router.get('/categories/:id', controller.getCategory.bind(controller));

// Create category (authenticated - admin only)
router.post('/categories', authenticate, controller.createCategory.bind(controller));

// Update category (authenticated - admin only)
router.put('/categories/:id', authenticate, controller.updateCategory.bind(controller));

// Delete category (authenticated - admin only)
router.delete('/categories/:id', authenticate, controller.deleteCategory.bind(controller));

// ============================================================================
// Moderation (authenticated - admin/manager only)
// ============================================================================
// Get moderation queue
router.get('/moderation', authenticate, controller.getModerationQueue.bind(controller));

// Moderate content (approve/reject)
router.post('/moderation/:type/:id', authenticate, controller.moderateContent.bind(controller));

// ============================================================================
// Notifications (Phase 13)
// ============================================================================
router.use('/notifications', notificationRoutes);

// ============================================================================
// AI Features (Phase 16)
// ============================================================================
router.use('/ai', aiRoutes);

// ============================================================================
// Recommendations (Phase 17)
// ============================================================================
router.use('/recommendations', recommendationRoutes);

// ============================================================================
// Category Requests (서비스 운영자 포럼 개설 요청)
// ============================================================================
router.use('/category-requests', createForumCategoryRequestRoutes());

export default router;

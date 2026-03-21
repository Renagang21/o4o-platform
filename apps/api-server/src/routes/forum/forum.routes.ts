import { Router } from 'express';
import { ForumPostController } from '../../controllers/forum/ForumPostController.js';
import { ForumCategoryController } from '../../controllers/forum/ForumCategoryController.js';
import { ForumCommentController } from '../../controllers/forum/ForumCommentController.js';
import { ForumModerationController } from '../../controllers/forum/ForumModerationController.js';
// @deprecated WO-PLATFORM-FORUM-APPROVAL-CORE-DECOUPLING-V1: Forum category request approval moved to KPA Extension (/api/v1/kpa/forum-requests/*)
// import { createForumCategoryRequestRoutes } from '../../controllers/forum/ForumCategoryRequestController.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import notificationRoutes from './forum.notifications.routes.js';
import aiRoutes from './forum.ai.routes.js';
import recommendationRoutes from './forum.recommendation.routes.js';
import categoryRequestRoutes from './forum-category-request.routes.js';

const router: Router = Router();
const postController = new ForumPostController();
const categoryController = new ForumCategoryController();
const commentController = new ForumCommentController();
const moderationController = new ForumModerationController();

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
router.get('/health', moderationController.health.bind(moderationController));

// ============================================================================
// Statistics (public, but authenticated for detailed stats)
// ============================================================================
router.get('/stats', optionalAuth, moderationController.getStats.bind(moderationController));

// Icon samples (public)
router.get('/icon-samples', moderationController.getIconSamples.bind(moderationController));

// ============================================================================
// Posts
// ============================================================================
// List posts (public with optional auth for personalized results)
router.get('/posts', optionalAuth, postController.listPosts.bind(postController));

// Get single post (public with optional auth for view tracking)
router.get('/posts/:id', optionalAuth, postController.getPost.bind(postController));

// Create post (authenticated - login required)
router.post('/posts', authenticate, postController.createPost.bind(postController));

// Update post (authenticated)
router.put('/posts/:id', authenticate, postController.updatePost.bind(postController));

// Delete post (authenticated)
router.delete('/posts/:id', authenticate, postController.deletePost.bind(postController));

// Like/unlike post (authenticated)
router.post('/posts/:id/like', authenticate, postController.toggleLike.bind(postController));

// ============================================================================
// Post Comments
// ============================================================================
// Get comments for a post (public)
router.get('/posts/:postId/comments', commentController.listComments.bind(commentController));

// ============================================================================
// Comments
// ============================================================================
// Create comment (authenticated)
router.post('/comments', authenticate, commentController.createComment.bind(commentController));

// Update comment (authenticated - author or admin)
router.put('/comments/:id', authenticate, commentController.updateComment.bind(commentController));

// Delete comment (authenticated - author or admin)
router.delete('/comments/:id', authenticate, commentController.deleteComment.bind(commentController));

// ============================================================================
// Categories
// ============================================================================
// List categories (public)
router.get('/categories', categoryController.listCategories.bind(categoryController));

// Popular categories by activity score (public) - must be before :id
router.get('/categories/popular', categoryController.getPopularForums.bind(categoryController));

// Get single category (public)
router.get('/categories/:id', categoryController.getCategory.bind(categoryController));

// Create category (authenticated - admin only)
router.post('/categories', authenticate, categoryController.createCategory.bind(categoryController));

// Update category (authenticated - admin only)
router.put('/categories/:id', authenticate, categoryController.updateCategory.bind(categoryController));

// Delete category (authenticated - admin only)
router.delete('/categories/:id', authenticate, categoryController.deleteCategory.bind(categoryController));

// ============================================================================
// Moderation (authenticated - admin/manager only)
// ============================================================================
// Get moderation queue
router.get('/moderation', authenticate, moderationController.getModerationQueue.bind(moderationController));

// Moderate content (approve/reject)
router.post('/moderation/:type/:id', authenticate, moderationController.moderateContent.bind(moderationController));

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
// Category Requests — WO-O4O-FORUM-REQUEST-UNIFICATION-PHASE1-V1
// Common forum category request API (serviceCode-scoped)
// ============================================================================
router.use('/category-requests', categoryRequestRoutes);

export default router;

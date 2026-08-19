import { Router } from 'express';
import { ForumPostController } from '../../controllers/forum/ForumPostController.js';
import { ForumDirectoryController } from '../../controllers/forum/ForumDirectoryController.js';
import { ForumCommentController } from '../../controllers/forum/ForumCommentController.js';
import { ForumModerationController } from '../../controllers/forum/ForumModerationController.js';
import { ForumMembershipController } from '../../controllers/forum/ForumMembershipController.js';
// @deprecated WO-PLATFORM-FORUM-APPROVAL-CORE-DECOUPLING-V1: Forum category request approval moved to KPA Extension (/api/v1/kpa/forum-requests/*)
// import { createForumCategoryRequestRoutes } from '../../controllers/forum/ForumCategoryRequestController.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import type { RequestHandler } from 'express';
import { isPlatformAdmin } from '../../utils/role.utils.js';
import notificationRoutes from './forum.notifications.routes.js';
import aiRoutes from './forum.ai.routes.js';
import recommendationRoutes from './forum.recommendation.routes.js';
import categoryRequestRoutes from './forum-category-request.routes.js';
import operatorForumRoutes from './operator-forum.routes.js';
import adminForumRoutes from './admin-forum.routes.js';

const router: Router = Router();

/**
 * WO-O4O-COMMUNITY-FORUM-INTERACTION-AND-WRITE-BOUNDARY-COMMONIZATION-V1 §8
 *
 * generic `/api/v1/forum/*` 에는 forumContextMiddleware 가 없다 → ForumControllerBase 의
 * service scope 판정이 전부 무경계로 통과한다. 읽기는 admin-dashboard 계약이라 그대로 두되,
 * **쓰기(작성/수정/삭제/댓글/좋아요/고정)** 는 서비스 경계를 우회하는 cross-service 통로가
 * 되므로 platform admin 으로 제한한다. 서비스 사용자 경로는 `/api/v1/{service}/forum/*` 이다.
 *
 * 판정 소스는 컨트롤러의 governance override 와 동일한 isPlatformAdmin(roles) 이며
 * 새 권한 개념을 만들지 않는다.
 */
const requireGenericForumWriteAdmin: RequestHandler = (req, res, next) => {
  const roles: string[] = (req as any).user?.roles || [];
  if (isPlatformAdmin(roles)) {
    next();
    return;
  }
  res.status(403).json({
    success: false,
    error: 'Generic forum write requires platform admin. Use the service-scoped forum API.',
    code: 'FORUM_GENERIC_WRITE_ADMIN_ONLY',
  });
};

const postController = new ForumPostController();
const forumDirectoryController = new ForumDirectoryController();
const commentController = new ForumCommentController();
const moderationController = new ForumModerationController();
const membershipController = new ForumMembershipController();

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
 * - Owner category management
 * - Delete requests
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

// Get popular tags — must be before /posts/:id to avoid param conflict
router.get('/posts/tags/popular', optionalAuth, postController.getPopularTags.bind(postController));

// Get single post (public with optional auth for view tracking)
router.get('/posts/:id', optionalAuth, postController.getPost.bind(postController));

// Create post (authenticated - login required)
router.post('/posts', authenticate, requireGenericForumWriteAdmin, postController.createPost.bind(postController));

// Update post (authenticated)
router.put('/posts/:id', authenticate, requireGenericForumWriteAdmin, postController.updatePost.bind(postController));

// Delete post (authenticated)
router.delete('/posts/:id', authenticate, requireGenericForumWriteAdmin, postController.deletePost.bind(postController));

// Like/unlike post (authenticated)
router.post('/posts/:id/like', authenticate, requireGenericForumWriteAdmin, postController.toggleLike.bind(postController));

// Pin/unpin post as forum notice (authenticated, forum owner only) — WO-KPA-A-FORUM-NOTICE-PIN-BY-OWNER-V1
router.patch('/posts/:id/pin', authenticate, requireGenericForumWriteAdmin, postController.pinPost.bind(postController));

// ============================================================================
// Post Comments
// ============================================================================
// Get comments for a post (public)
router.get('/posts/:postId/comments', commentController.listComments.bind(commentController));

// ============================================================================
// Comments
// ============================================================================
// Create comment (authenticated)
router.post('/comments', authenticate, requireGenericForumWriteAdmin, commentController.createComment.bind(commentController));

// Update comment (authenticated - author or admin)
router.put('/comments/:id', authenticate, requireGenericForumWriteAdmin, commentController.updateComment.bind(commentController));

// Delete comment (authenticated - author or admin)
router.delete('/comments/:id', authenticate, requireGenericForumWriteAdmin, commentController.deleteComment.bind(commentController));

// ============================================================================
// Forum Directory — Named routes BEFORE :id to avoid parameter matching
// (API path /categories kept for backwards compatibility)
// ============================================================================
// List forums (public)
router.get('/categories', forumDirectoryController.listForums.bind(forumDirectoryController));

// Popular forums by activity score (public) - must be before :id
router.get('/categories/popular', forumDirectoryController.getPopularForums.bind(forumDirectoryController));

// My forums (authenticated, owner) — WO-MY-CATEGORIES-API-V1
router.get('/categories/mine', authenticate, forumDirectoryController.listMyForums.bind(forumDirectoryController));

// Get single forum (public)
router.get('/categories/:id', forumDirectoryController.getForum.bind(forumDirectoryController));

// Owner edit (authenticated, owner only) — WO-FORUM-OWNER-BASIC-EDIT-V1
router.patch('/categories/:id/owner', authenticate, forumDirectoryController.updateMyForum.bind(forumDirectoryController));

// Delete request (authenticated, owner only) — WO-O4O-FORUM-DELETE-REQUEST-V1
router.post('/categories/:id/delete-request', authenticate, forumDirectoryController.requestDeleteForum.bind(forumDirectoryController));

// Create forum — direct creation no longer supported (410)
router.post('/categories', authenticate, forumDirectoryController.createForum.bind(forumDirectoryController));

// Update forum — direct update no longer supported (410)
router.put('/categories/:id', authenticate, forumDirectoryController.updateForum.bind(forumDirectoryController));

// Delete forum — direct delete no longer supported (410)
router.delete('/categories/:id', authenticate, forumDirectoryController.deleteForum.bind(forumDirectoryController));

// ============================================================================
// Forum Membership — WO-O4O-FORUM-MEMBER-MANAGEMENT-BACKEND-CANONICALIZATION-V1
// Closed forum join request + member management
// ============================================================================
// 가입 신청 (authenticated)
router.post('/categories/:id/join-requests', authenticate, membershipController.requestJoin.bind(membershipController));

// 대기 중 신청 목록 (owner only)
router.get('/categories/:id/join-requests', authenticate, membershipController.listJoinRequests.bind(membershipController));

// 승인 / 거절 (owner only)
router.post('/categories/:id/join-requests/:requestId/approve', authenticate, membershipController.approveJoin.bind(membershipController));
router.post('/categories/:id/join-requests/:requestId/reject', authenticate, membershipController.rejectJoin.bind(membershipController));

// 회원 목록 / 제거 (owner only)
router.get('/categories/:id/members', authenticate, membershipController.listMembers.bind(membershipController));
router.delete('/categories/:id/members/:userId', authenticate, membershipController.removeMember.bind(membershipController));

// 내 멤버십 상태 (optionalAuth — unauthenticated gets isMember:false)
router.get('/categories/:id/membership-status', optionalAuth, membershipController.getMembershipStatus.bind(membershipController));

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

// ============================================================================
// Operator Routes — WO-O4O-FORUM-OPERATOR-UNIFICATION-V1
// Common forum operator API (serviceCode-scoped, operator role required)
// ============================================================================
router.use('/operator', operatorForumRoutes);

// ============================================================================
// Admin Routes — WO-O4O-NETURE-FORUM-DELETE-OPERATOR-AND-ADMIN-SEPARATION-V1
// 삭제된 포럼 관리 (복구 / 완전 삭제 / 삭제 이력) — admin 권한 필수 (serviceCode-scoped)
// ============================================================================
router.use('/admin', adminForumRoutes);

export default router;

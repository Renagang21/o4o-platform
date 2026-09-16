import { Router, type RequestHandler } from 'express';
import { ForumPostController } from '../../controllers/forum/ForumPostController.js';
import { ForumDirectoryController } from '../../controllers/forum/ForumDirectoryController.js';
import { ForumCommentController } from '../../controllers/forum/ForumCommentController.js';
import { ForumModerationController } from '../../controllers/forum/ForumModerationController.js';
import { ForumMembershipController } from '../../controllers/forum/ForumMembershipController.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import {
  forumContextMiddleware,
  type ForumContext,
} from '../../middleware/forum-context.middleware.js';
import { resolveCanonicalServiceKey } from '@o4o/security-core';
import { resolveCommunityAccess } from '../../utils/community-access.resolver.js';
import { communityKeyForServiceEntry } from '../../config/community-catalog.js';

/**
 * Service-scoped Forum Routes
 *
 * WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1
 *
 * 서비스 route → forumContextMiddleware → ForumContext.serviceCode (RBAC prefix)
 *   → resolveCanonicalServiceKey() → forum_category_requests.service_code
 *
 * 공통 커뮤니티 endpoint 만 포함한다. `/operator/*` · `/admin/*` · `/category-requests/*`
 * 는 자체 serviceCode 권한 계약을 이미 갖고 있으므로 여기에 마운트하지 않는다
 * (이중 적용 금지 — 기존 공통 경로 `/api/v1/forum/...` 를 계속 사용한다).
 */

/**
 * 활성 서비스 멤버십 보유자만 통과시키는 write gate.
 * 판정 소스는 membership-guard.middleware 와 동일한 JWT `user.memberships` 이며,
 * role scope 를 요구하지 않는다 (일반 회원도 커뮤니티 글을 쓸 수 있어야 한다).
 */
export function requireActiveServiceMembership(rolePrefix: string): RequestHandler {
  const membershipKey = resolveCanonicalServiceKey(rolePrefix);

  return (req, res, next) => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (user.roles?.includes('platform:super_admin')) {
      next();
      return;
    }

    const memberships: { serviceKey: string; status: string }[] = user.memberships || [];
    const membership = memberships.find((m) => m.serviceKey === membershipKey);

    if (!membership) {
      res.status(403).json({
        success: false,
        error: `No membership found for service: ${membershipKey}`,
        code: 'MEMBERSHIP_NOT_FOUND',
      });
      return;
    }

    if (membership.status !== 'active') {
      res.status(403).json({
        success: false,
        error: `Service membership is ${membership.status}. Active membership required.`,
        code: 'MEMBERSHIP_NOT_ACTIVE',
      });
      return;
    }

    next();
  };
}

/**
 * WO-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1
 *
 * Community 참여 자격 write gate. 판정은 `resolveCommunityAccess`(community catalog 의 participation
 * policy) 한 곳이며 서비스별 분기가 없다:
 *   pharmacy     = kpa-society OR pharmacy-hub active membership
 *   cosmetics    = k-cosmetics active membership
 *   o4o-general  = authenticated O4O user (Neture membership 불요)
 * 참여 자격만 판정한다 — 운영자 권한 · closed forum 멤버십 · 공개 read 는 기존 계약 그대로.
 */
export function requireCommunityAccess(communityKey: string): RequestHandler {
  return (req, res, next) => {
    const user = (req as any).user;
    const access = resolveCommunityAccess(user, communityKey);
    if (access.allowed) {
      next();
      return;
    }
    if (access.reason === 'AUTH_REQUIRED') {
      res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      return;
    }
    res.status(403).json({
      success: false,
      error: `Participation in community '${communityKey}' requires eligible service membership.`,
      code: 'COMMUNITY_ACCESS_DENIED',
      reason: access.reason,
    });
  };
}

export interface ServiceForumRouterOptions {
  /**
   * forumContextMiddleware 에 주입할 컨텍스트 (serviceCode 는 RBAC prefix).
   * `communityKey` 가 있으면 읽기·쓰기 경계는 Community 원장 코드 집합(catalog)이며,
   * 없으면 serviceCode 에서 catalog `entries` 로 Community 를 찾아 자동 주입한다
   * (`communityKeyForServiceEntry`). Community 가 아닌 서비스 mount 는 종전 serviceCode 경계 그대로.
   */
  context: ForumContext;
  /**
   * 쓰기(작성/수정/삭제/댓글/좋아요) 경로에 추가로 적용할 guard.
   * Community 컨텍스트에서는 `requireCommunityAccess(communityKey)` 가 항상 먼저 적용되고, 여기 guard 는 그 뒤에 온다.
   */
  writeGuards?: RequestHandler[];
}

export function createServiceForumRouter(options: ServiceForumRouterOptions): Router {
  const { writeGuards = [] } = options;
  // WO-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1: Community 컨텍스트 해석 (catalog 한 곳)
  const communityKey =
    options.context.communityKey ?? communityKeyForServiceEntry(resolveCanonicalServiceKey(options.context.serviceCode ?? ''));
  const context: ForumContext = communityKey ? { ...options.context, communityKey } : options.context;
  const communityGuards: RequestHandler[] = communityKey ? [requireCommunityAccess(communityKey)] : [];

  const router: Router = Router();
  const postController = new ForumPostController();
  const forumDirectoryController = new ForumDirectoryController();
  const commentController = new ForumCommentController();
  const moderationController = new ForumModerationController();
  const membershipController = new ForumMembershipController();

  // optionalAuth 가 먼저 실행돼야 컨텍스트 해석 시점에 userId 를 쓸 수 있다.
  router.use(optionalAuth as any);
  router.use(forumContextMiddleware(context));

  const write: RequestHandler[] = [authenticate as any, ...communityGuards, ...writeGuards];

  // Health / Stats
  router.get('/health', moderationController.health.bind(moderationController));
  router.get('/stats', optionalAuth, moderationController.getStats.bind(moderationController));

  // Posts (tags/popular 는 /posts/:id 보다 먼저 등록)
  router.get('/posts', optionalAuth, postController.listPosts.bind(postController));
  router.get('/posts/tags/popular', optionalAuth, postController.getPopularTags.bind(postController));
  router.get('/posts/:id', optionalAuth, postController.getPost.bind(postController));
  router.post('/posts', ...write, postController.createPost.bind(postController));
  router.put('/posts/:id', ...write, postController.updatePost.bind(postController));
  router.delete('/posts/:id', ...write, postController.deletePost.bind(postController));
  router.post('/posts/:id/like', ...write, postController.toggleLike.bind(postController));
  router.patch('/posts/:id/pin', ...write, postController.pinPost.bind(postController));

  // Comments
  router.get('/posts/:postId/comments', commentController.listComments.bind(commentController));
  router.post('/posts/:postId/comments', ...write, commentController.createComment.bind(commentController));
  router.post('/comments', ...write, commentController.createComment.bind(commentController));
  router.put('/comments/:id', ...write, commentController.updateComment.bind(commentController));
  router.delete('/comments/:id', ...write, commentController.deleteComment.bind(commentController));

  // Forum Directory (named routes before :id)
  router.get('/categories', forumDirectoryController.listForums.bind(forumDirectoryController));
  router.get('/categories/popular', forumDirectoryController.getPopularForums.bind(forumDirectoryController));
  router.get('/categories/mine', authenticate, forumDirectoryController.listMyForums.bind(forumDirectoryController));
  router.get('/categories/:id', forumDirectoryController.getForum.bind(forumDirectoryController));
  router.patch('/categories/:id/owner', authenticate, forumDirectoryController.updateMyForum.bind(forumDirectoryController));
  router.post('/categories/:id/delete-request', authenticate, forumDirectoryController.requestDeleteForum.bind(forumDirectoryController));
  // 직접 생성/수정/삭제는 공통과 동일하게 410
  router.post('/categories', authenticate, forumDirectoryController.createForum.bind(forumDirectoryController));
  router.put('/categories/:id', authenticate, forumDirectoryController.updateForum.bind(forumDirectoryController));
  router.delete('/categories/:id', authenticate, forumDirectoryController.deleteForum.bind(forumDirectoryController));

  // Forum Membership (폐쇄형 포럼 가입/회원 관리)
  router.post('/categories/:id/join-requests', authenticate, membershipController.requestJoin.bind(membershipController));
  router.get('/categories/:id/join-requests', authenticate, membershipController.listJoinRequests.bind(membershipController));
  router.post('/categories/:id/join-requests/:requestId/approve', authenticate, membershipController.approveJoin.bind(membershipController));
  router.post('/categories/:id/join-requests/:requestId/reject', authenticate, membershipController.rejectJoin.bind(membershipController));
  router.get('/categories/:id/members', authenticate, membershipController.listMembers.bind(membershipController));
  router.delete('/categories/:id/members/:userId', authenticate, membershipController.removeMember.bind(membershipController));
  router.get('/categories/:id/membership-status', optionalAuth, membershipController.getMembershipStatus.bind(membershipController));

  return router;
}

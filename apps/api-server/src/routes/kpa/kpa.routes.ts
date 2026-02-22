/**
 * KPA Routes
 * 약사회 SaaS API 라우트 설정
 *
 * WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1 Phase 2: Route Manifest
 *
 * API Namespace: /api/v1/kpa
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ ROUTE MANIFEST — Admin / Operator / Public 분류                      │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ ADMIN (kpa:admin scope required)                                    │
 * │  /admin             - 관리자 대시보드                                   │
 * │  /organizations     - 조직 관리 (CRUD)                                │
 * │  /members           - 회원 관리 (승인/거절)                             │
 * │  /applications      - 신청서 처리                                     │
 * │  /join-inquiries    - 참여 문의 관리                                   │
 * │  /organization-join-requests - 조직 가입 요청 관리                      │
 * │  /stewards          - 간사 관리                                       │
 * │  /forum/categories  - 포럼 카테고리 생성/수정/삭제 (구조 변경)             │
 * │  /operator/audit-logs - 감사 로그 조회                                 │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ OPERATOR (kpa:operator scope required)                              │
 * │  /operator          - 운영자 요약 대시보드                              │
 * │  /groupbuy-admin    - 공동구매 운영                                    │
 * │  /news (POST/PUT/DELETE) - 콘텐츠 CRUD                               │
 * │  /news/admin/list   - 콘텐츠 전체 목록                                 │
 * │  /forum/moderation  - 포럼 중재                                       │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ BRANCH ADMIN (coreRequireAuth + branch-level guard)                │
 * │  /branch-admin      - 분회 관리자 대시보드                              │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ AUTHENTICATED (requireAuth only)                                    │
 * │  /mypage            - 마이페이지                                       │
 * │  /lms/enrollments   - 수강 관리                                       │
 * │  /lms/certificates  - 수료증 조회                                      │
 * │  /pharmacy/store    - 약국 스토어 설정                                  │
 * │  /pharmacy/products - 약국 상품 관리                                    │
 * │  /store-hub         - 스토어 허브                                      │
 * │  /assets            - 자산 스냅샷 (복사/조회)                           │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ PUBLIC (no auth / optionalAuth)                                     │
 * │  /branches          - 분회 공개 정보                                    │
 * │  /forum (GET)       - 포럼 조회                                        │
 * │  /demo-forum        - 데모 포럼                                        │
 * │  /lms/courses (GET) - 강좌 목록                                        │
 * │  /home              - 홈 페이지 데이터                                  │
 * │  /news (GET)        - 공지사항/뉴스 조회                                │
 * │  /resources         - 자료실 (placeholder)                             │
 * │  /groupbuy (GET)    - 공동구매 조회 (placeholder)                       │
 * │  /organization      - 조직 공개 정보                                    │
 * │  /health            - 헬스체크                                          │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import { Router, RequestHandler, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { ContentQueryService } from '../../modules/content/index.js';
import { SignageQueryService } from '../../modules/signage/index.js';
import { ForumQueryService } from '../../modules/forum/index.js';
import { createOrganizationController } from './controllers/organization.controller.js';
import { createMemberController } from './controllers/member.controller.js';
import { createApplicationController } from './controllers/application.controller.js';
import { createAdminDashboardController } from './controllers/admin-dashboard.controller.js';
import { createBranchAdminDashboardController } from './controllers/branch-admin-dashboard.controller.js';
import { createBranchPublicController } from './controllers/branch-public.controller.js';
import { createOperatorSummaryController } from './controllers/operator-summary.controller.js';
import { createGroupbuyOperatorController } from './controllers/groupbuy-operator.controller.js';
import { createJoinInquiryAdminRoutes, createJoinInquiryPublicRoutes } from './controllers/join-inquiry.controller.js';
import { createOrganizationJoinRequestRoutes } from './controllers/organization-join-request.controller.js';
import { createPharmacyRequestRoutes } from './controllers/pharmacy-request.controller.js';
import { createStewardController } from './controllers/steward.controller.js';
import { createStoreHubController } from './controllers/store-hub.controller.js';
import { createPharmacyStoreConfigController } from './controllers/pharmacy-store-config.controller.js';
import { createPharmacyProductsController } from './controllers/pharmacy-products.controller.js';
import { createOperatorProductApplicationsController } from './controllers/operator-product-applications.controller.js';
import { createAssetSnapshotController } from './controllers/asset-snapshot.controller.js';
import { createStoreAssetControlController } from './controllers/store-asset-control.controller.js';
import { createAdminForceAssetController } from './controllers/admin-force-asset.controller.js';
import { createPublishedAssetsController } from './controllers/published-assets.controller.js';
import { createStoreContentController } from './controllers/store-content.controller.js';
import { createKpaStoreTemplateController } from './controllers/kpa-store-template.controller.js';
import { createTabletController } from '../glycopharm/controllers/tablet.controller.js';
import { createBlogController } from '../glycopharm/controllers/blog.controller.js';
import { createLayoutController } from '../glycopharm/controllers/layout.controller.js'; // WO-STORE-BLOCK-ENGINE-V1
import { CmsContent } from '@o4o-apps/cms-core';
import { KpaAuditLog } from './entities/kpa-audit-log.entity.js';
import { KpaMember } from './entities/kpa-member.entity.js';
import { OrganizationStore } from './entities/organization-store.entity.js';
import { OrganizationProductListing } from './entities/organization-product-listing.entity.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import { requireAuth as coreRequireAuth, authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/error-handler.js';
// WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: legacy role utils removed
import { createServiceScopeGuard, KPA_SCOPE_CONFIG } from '@o4o/security-core';
// WO-KPA-GROUPBUY-ORDER-METADATA-SYNC-V1: E-commerce Core entities for order creation
import {
  EcommerceOrder,
  EcommerceOrderItem,
  OrderType,
  OrderStatus,
  PaymentStatus,
  BuyerType,
  SellerType,
} from '@o4o/ecommerce-core/entities';

// Domain controllers - Forum
import { ForumController } from '../../controllers/forum/ForumController.js';
import { forumContextMiddleware } from '../../middleware/forum-context.middleware.js';

// LMS Controllers
import { CourseController } from '../../modules/lms/controllers/CourseController.js';
import { LessonController } from '../../modules/lms/controllers/LessonController.js';
import { EnrollmentController } from '../../modules/lms/controllers/EnrollmentController.js';
import { CertificateController } from '../../modules/lms/controllers/CertificateController.js';
import { InstructorPublicController } from '../../modules/lms/controllers/InstructorPublicController.js';

/**
 * KPA Scope Guard — powered by @o4o/security-core
 *
 * WO-GLYCOPHARM-CARE-DATA-ISOLATION-PHASE1-V1: Platform Security Core migration
 * Replaces inline implementation with shared security-core guard factory.
 * Behavior is identical: KPA roles only, no platform bypass, legacy detect+deny.
 */
const requireKpaScope = createServiceScopeGuard(KPA_SCOPE_CONFIG);

/**
 * Create KPA routes
 */
export function createKpaRoutes(dataSource: DataSource): Router {
  const router = Router();

  // APP-CONTENT Phase 2: shared content query service
  const contentService = new ContentQueryService(dataSource, {
    serviceKeys: ['kpa', 'kpa-society'],
    defaultTypes: ['notice', 'news', 'hero', 'promo'],
  });

  // APP-SIGNAGE Phase 1: shared signage query service
  const signageService = new SignageQueryService(dataSource, {
    serviceKey: 'kpa-society',
    sources: ['hq', 'store'],
  });

  // APP-FORUM Phase 1: shared forum query service
  const forumService = new ForumQueryService(dataSource, {
    scope: 'community',
  });

  // ============================================================================
  // ADMIN ROUTES — requireKpaScope('kpa:admin') enforced in sub-controllers
  // WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: Structure/Role/Policy → Admin only
  // ============================================================================
  router.use('/organizations', createOrganizationController(dataSource, coreRequireAuth as any, requireKpaScope));
  router.use('/members', createMemberController(dataSource, coreRequireAuth as any, requireKpaScope));
  router.use('/applications', createApplicationController(dataSource, coreRequireAuth as any, requireKpaScope));

  // Admin Dashboard routes (WO-KPA-SOCIETY-DASHBOARD-P1-A)
  router.use('/admin', createAdminDashboardController(dataSource, coreRequireAuth as any, requireKpaScope));

  // Admin Force Asset routes (WO-KPA-A-ASSET-CONTROL-EXTENSION-V2)
  router.use('/admin/force-assets', createAdminForceAssetController(dataSource, coreRequireAuth as any, requireKpaScope));

  // Branch Admin Dashboard routes (WO-KPA-OPERATOR-DASHBOARD-IMPROVEMENT-V1)
  router.use('/branch-admin', createBranchAdminDashboardController(dataSource, coreRequireAuth as any));

  // Branch Public routes — read-only endpoints for /branch-services/:branchId pages
  router.use('/branches', createBranchPublicController(dataSource));

  // ============================================================================
  // OPERATOR ROUTES — requireKpaScope('kpa:operator') enforced
  // WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: Operations/Content → Operator
  // ============================================================================

  // Operator Summary routes (운영자 실사용 화면 1단계)
  router.use('/operator', createOperatorSummaryController(dataSource, {
    contentService,
    signageService,
    forumService,
  }));

  // Product Application Management (WO-O4O-PRODUCT-APPROVAL-WORKFLOW-V1)
  router.use('/operator/product-applications', createOperatorProductApplicationsController(dataSource, coreRequireAuth as any, requireKpaScope));

  // Groupbuy Operator routes (WO-KPA-GROUPBUY-OPERATOR-UI-V1)
  router.use('/groupbuy-admin', createGroupbuyOperatorController(dataSource, coreRequireAuth as any));

  // Join Inquiry Admin routes (WO-KPA-JOIN-CONVERSION-V1)
  router.use('/join-inquiries', createJoinInquiryAdminRoutes(dataSource, coreRequireAuth as any, requireKpaScope));

  // Organization Join Request routes (WO-CONTEXT-JOIN-REQUEST-MVP-V1)
  router.use('/organization-join-requests', createOrganizationJoinRequestRoutes(dataSource, coreRequireAuth as any, requireKpaScope));

  // Pharmacy Request routes (WO-KPA-A-PHARMACY-REQUEST-STRUCTURE-REALIGN-V1)
  // 약국 서비스 신청 — 개인 신원 확장 (OrganizationJoinRequest에서 분리)
  router.use('/pharmacy-requests', createPharmacyRequestRoutes(dataSource, coreRequireAuth as any, requireKpaScope));

  // Steward routes (WO-KPA-STEWARDSHIP-AND-ORGANIZATION-UI-IMPLEMENTATION-V1)
  router.use('/stewards', createStewardController(dataSource, coreRequireAuth as any, requireKpaScope));

  // ============================================================================
  // AUTHENTICATED USER ROUTES — requireAuth only (no admin/operator scope)
  // ============================================================================

  // Store Hub routes (WO-STORE-HUB-UNIFIED-RENDERING-PHASE1-V1)
  router.use('/store-hub', createStoreHubController(dataSource, coreRequireAuth as any));

  // Pharmacy Store Config routes (WO-PHARMACY-HUB-REALIGN-PHASEH2-V1)
  router.use('/pharmacy/store', createPharmacyStoreConfigController(dataSource, coreRequireAuth as any));

  // Pharmacy Products routes (WO-PHARMACY-PRODUCT-LISTING-APPROVAL-PHASE1-V1)
  router.use('/pharmacy/products', createPharmacyProductsController(dataSource, coreRequireAuth as any));

  // Asset Snapshot routes (WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1)
  router.use('/assets', createAssetSnapshotController(dataSource, coreRequireAuth as any));

  // Store Asset Control routes (WO-KPA-A-ASSET-CONTROL-EXTENSION-V1)
  router.use('/store-assets', createStoreAssetControlController(dataSource, coreRequireAuth as any));

  // Store Content routes (WO-KPA-A-CONTENT-OVERRIDE-EXTENSION-V1)
  router.use('/store-contents', createStoreContentController(dataSource, coreRequireAuth as any));

  // ============================================================================
  // Store Channel Routes — WO-KPA-STORE-CHANNEL-INTEGRATION-V1
  // organizations 테이블 단일 참조 (Phase C 전환 완료)
  // Tablet/Blog/Template 채널을 KPA 네임스페이스에서 제공
  // /api/v1/kpa/stores/:slug/tablet|blog|template
  // ============================================================================
  const kpaTabletController = createTabletController(dataSource, coreRequireAuth as any, 'kpa');
  router.use('/stores', kpaTabletController);

  const kpaBlogController = createBlogController(dataSource, coreRequireAuth as any, 'kpa');
  router.use('/stores', kpaBlogController);

  const kpaTemplateController = createKpaStoreTemplateController(dataSource, coreRequireAuth as any);
  router.use('/stores', kpaTemplateController);

  const kpaLayoutController = createLayoutController(dataSource, coreRequireAuth as any);
  router.use('/stores', kpaLayoutController);

  // ============================================================================
  // Membership Query — /api/v1/kpa/me/membership
  // WO-KPA-BRANCH-SCOPE-VALIDATION-V1: User's KPA membership info for branch scope validation
  // ============================================================================
  router.get('/me/membership', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    const memberRepo = dataSource.getRepository(KpaMember);
    const member = await memberRepo.findOne({ where: { user_id: userId } });

    if (!member) {
      res.json({ success: true, data: null });
      return;
    }

    const orgRepo = dataSource.getRepository(OrganizationStore);
    const org = await orgRepo.findOne({ where: { id: member.organization_id } });

    res.json({
      success: true,
      data: {
        userId,
        organizationId: member.organization_id,
        organizationType: org?.type || null,
        organizationName: org?.name || null,
        parentId: org?.parentId || null,
        role: member.role,
        status: member.status,
      },
    });
  }));

  // ============================================================================
  // PUBLIC / MIXED ROUTES — optionalAuth or mixed auth levels
  // ============================================================================

  // Published Assets routes — public storefront/signage/promotion rendering
  // WO-KPA-A-ASSET-RENDER-FILTER-INTEGRATION-V1
  router.use('/published-assets', createPublishedAssetsController(dataSource));

  // ============================================================================
  // Forum Routes - /api/v1/kpa/forum/*
  // Mixed: Public reads / Admin writes / Operator moderation
  // ============================================================================
  const forumRouter = Router();
  const forumController = new ForumController();

  // Optional auth must run before context resolution so userId is available
  forumRouter.use(optionalAuth as any);

  // WO-FORUM-SCOPE-SEPARATION-V1: community scope — organizationId 미설정
  // 커뮤니티 포럼은 organizationId IS NULL인 글만 조회/생성
  forumRouter.use(forumContextMiddleware({
    serviceCode: 'kpa',
    scope: 'community',
  }));

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

  // Categories (읽기: 공개, 쓰기: admin scope — WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1)
  forumRouter.get('/categories', forumController.listCategories.bind(forumController));
  forumRouter.get('/categories/:id', forumController.getCategory.bind(forumController));
  // Structure creation/modification/deletion → Admin only
  forumRouter.post('/categories', authenticate, requireKpaScope('kpa:admin'), forumController.createCategory.bind(forumController));
  forumRouter.put('/categories/:id', authenticate, requireKpaScope('kpa:admin'), forumController.updateCategory.bind(forumController));
  forumRouter.delete('/categories/:id', authenticate, requireKpaScope('kpa:admin'), forumController.deleteCategory.bind(forumController));

  // Moderation (operator scope — WO-KPA-A-OPERATOR-SECURITY-ALIGNMENT-PHASE1)
  forumRouter.get('/moderation', authenticate, requireKpaScope('kpa:operator'), forumController.getModerationQueue.bind(forumController));
  forumRouter.post('/moderation/:type/:id', authenticate, requireKpaScope('kpa:operator'), forumController.moderateContent.bind(forumController));

  router.use('/forum', forumRouter);

  // ============================================================================
  // Demo Forum Routes - /api/v1/kpa/demo-forum/*
  // WO-FORUM-DEMO-SCOPE-ISOLATION-V1: Separate demo forum with demo scope
  // /demo/forum 경로는 커뮤니티 콘텐츠를 보여주면 안 됨
  // ============================================================================
  const demoForumRouter = Router();
  const demoForumController = new ForumController();

  demoForumRouter.use(optionalAuth as any);

  // Demo scope — returns empty results (no community content)
  demoForumRouter.use(forumContextMiddleware({
    serviceCode: 'kpa-demo',
    scope: 'demo',
  }));

  // Same endpoints as forum, but with demo scope
  demoForumRouter.get('/health', demoForumController.health.bind(demoForumController));
  demoForumRouter.get('/stats', optionalAuth, demoForumController.getStats.bind(demoForumController));
  demoForumRouter.get('/posts', optionalAuth, demoForumController.listPosts.bind(demoForumController));
  demoForumRouter.get('/posts/:id', optionalAuth, demoForumController.getPost.bind(demoForumController));
  demoForumRouter.post('/posts', authenticate, demoForumController.createPost.bind(demoForumController));
  demoForumRouter.put('/posts/:id', authenticate, demoForumController.updatePost.bind(demoForumController));
  demoForumRouter.delete('/posts/:id', authenticate, demoForumController.deletePost.bind(demoForumController));
  demoForumRouter.post('/posts/:id/like', authenticate, demoForumController.toggleLike.bind(demoForumController));
  demoForumRouter.get('/posts/:postId/comments', demoForumController.listComments.bind(demoForumController));
  demoForumRouter.post('/comments', authenticate, demoForumController.createComment.bind(demoForumController));
  demoForumRouter.get('/categories', demoForumController.listCategories.bind(demoForumController));
  demoForumRouter.get('/categories/:id', demoForumController.getCategory.bind(demoForumController));
  demoForumRouter.post('/categories', authenticate, requireKpaScope('kpa:admin'), demoForumController.createCategory.bind(demoForumController));
  demoForumRouter.put('/categories/:id', authenticate, requireKpaScope('kpa:admin'), demoForumController.updateCategory.bind(demoForumController));
  demoForumRouter.delete('/categories/:id', authenticate, requireKpaScope('kpa:admin'), demoForumController.deleteCategory.bind(demoForumController));
  demoForumRouter.get('/moderation', authenticate, requireKpaScope('kpa:operator'), demoForumController.getModerationQueue.bind(demoForumController));
  demoForumRouter.post('/moderation/:type/:id', authenticate, requireKpaScope('kpa:operator'), demoForumController.moderateContent.bind(demoForumController));

  router.use('/demo-forum', demoForumRouter);

  // ============================================================================
  // LMS Routes - /api/v1/kpa/lms/*
  // ============================================================================
  const lmsRouter = Router();

  // Courses
  lmsRouter.get('/courses', optionalAuth, asyncHandler(CourseController.listCourses));
  lmsRouter.get('/courses/:id', optionalAuth, asyncHandler(CourseController.getCourse));
  lmsRouter.get('/courses/:courseId/lessons', optionalAuth, asyncHandler(LessonController.listLessonsByCourse));

  // Enrollments (authenticated)
  lmsRouter.get('/enrollments', authenticate, asyncHandler(EnrollmentController.getMyEnrollments));
  lmsRouter.get('/enrollments/:courseId', authenticate, asyncHandler(EnrollmentController.getEnrollment));
  lmsRouter.post('/courses/:courseId/enroll', authenticate, asyncHandler(EnrollmentController.enrollCourse));

  // Certificates
  lmsRouter.get('/certificates', authenticate, asyncHandler(CertificateController.getMyCertificates));
  lmsRouter.get('/certificates/:id', authenticate, asyncHandler(CertificateController.getCertificate));

  // Instructor Public Profile (no auth) - WO-CONTENT-INSTRUCTOR-PUBLIC-PROFILE-V1
  lmsRouter.get('/instructors/:userId/public-profile', asyncHandler(InstructorPublicController.getPublicProfile));

  router.use('/lms', lmsRouter);

  // ============================================================================
  // Home Routes - /api/v1/kpa/home/*
  // WO-KPA-HOME-PHASE1-V1: Home page summary endpoints
  // ============================================================================
  const homeRouter = Router();

  // GET /home/notices - 공지사항 (APP-CONTENT Phase 2: ContentQueryService)
  homeRouter.get('/notices', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 5;
    const data = await contentService.listForHome(['notice', 'hero'], limit);
    res.json({ success: true, data });
  }));

  // GET /home/community - 포럼 최근글 + featured 콘텐츠 (APP-FORUM Phase 1: ForumQueryService)
  homeRouter.get('/community', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const postLimit = parseInt(req.query.postLimit as string) || 5;
    const featuredLimit = parseInt(req.query.featuredLimit as string) || 3;

    const posts = await forumService.listRecentPosts(postLimit);
    const featured = await contentService.listFeatured(['featured', 'promo'], featuredLimit);

    res.json({
      success: true,
      data: { posts, featured },
    });
  }));

  // GET /home/signage - 디지털 사이니지 미리보기 (APP-SIGNAGE Phase 1: SignageQueryService)
  homeRouter.get('/signage', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const mediaLimit = parseInt(req.query.mediaLimit as string) || 6;
    const playlistLimit = parseInt(req.query.playlistLimit as string) || 4;
    const data = await signageService.listForHome(mediaLimit, playlistLimit);
    res.json({ success: true, data });
  }));

  // GET /home/forum-hub - 포럼 카테고리 허브 요약 (APP-FORUM Phase 2+4: ForumQueryService)
  // ?sort=default|recent|popular|joined  ?q=검색어
  homeRouter.get('/forum-hub', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const sort = (req.query.sort as string) || 'default';
    const keyword = (req.query.q as string) || '';
    const userId = sort === 'joined' ? (req as any).user?.id : undefined;
    const data = await forumService.listForumHub({ sort, keyword, userId });
    res.json({ success: true, data });
  }));

  // GET /home/forum-activity - 포럼 카테고리별 최근 활동 (APP-FORUM Phase 3: ForumQueryService)
  // ?sort=recent|popular|recommended  ?limit=5
  homeRouter.get('/forum-activity', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const sort = (req.query.sort as string) || 'recent';
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 10);
    const data = await forumService.listForumActivity({ sort, limit });
    res.json({ success: true, data });
  }));

  router.use('/home', homeRouter);

  // ============================================================================
  // News Routes - /api/v1/kpa/news/*
  // WO-KPA-HOME-PHASE1-V1: Connected to cms_contents (was placeholder)
  // Phase 3A: 추천/조회수/페이지네이션 추가
  // ============================================================================
  const newsRouter = Router();

  // APP-CONTENT Phase 3A: ContentQueryService + 추천 enrichment
  newsRouter.get('/', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const result = await contentService.listPublishedWithRecommendations({
      type: req.query.type as string,
      sort: (req.query.sort as string) as any || 'latest',
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 12,
      userId,
    });
    res.json({ success: true, ...result });
  }));

  // Static routes must be defined before dynamic :id route
  newsRouter.get('/gallery', optionalAuth, (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    res.json({
      success: true,
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
      message: 'Gallery API - Integration pending'
    });
  });

  // APP-CONTENT Phase 3A: 상세 조회 + 추천 정보
  newsRouter.get('/:id', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const content = await contentService.getByIdWithRecommendations(req.params.id, userId);
    if (!content) {
      res.status(404).json({ success: false, error: { message: 'News not found' } });
      return;
    }
    res.json({ success: true, data: content });
  }));

  // Phase 3A: 추천 토글 (POST = 추천/취소 토글)
  newsRouter.post('/:id/recommend', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }
    const result = await contentService.toggleRecommendation(req.params.id, userId);
    res.json({ success: true, data: result });
  }));

  // Phase 3A: 조회수 증가 (public)
  newsRouter.post('/:id/view', asyncHandler(async (req: Request, res: Response) => {
    await contentService.incrementViewCount(req.params.id);
    res.json({ success: true });
  }));

  // ─── WO-KPA-A-CONTENT-CMS-PHASE1-V1: Operator CRUD ──────────────────
  const contentRepo = dataSource.getRepository(CmsContent);
  const auditRepo = dataSource.getRepository(KpaAuditLog);
  const KPA_SERVICE_KEY = 'kpa';
  const ALLOWED_TYPES = ['notice', 'news'];

  // WO-KPA-A-OPERATOR-AUDIT-LOG-PHASE1-V1: helper
  async function writeAuditLog(
    user: any,
    actionType: string,
    targetType: 'member' | 'application' | 'content',
    targetId: string,
    metadata: Record<string, unknown> = {},
  ) {
    try {
      const log = auditRepo.create({
        operator_id: user?.id,
        operator_role: (user?.roles || []).find((r: string) => r.startsWith('kpa:')) || 'unknown',
        action_type: actionType as any,
        target_type: targetType,
        target_id: targetId,
        metadata,
      });
      await auditRepo.save(log);
    } catch (e) {
      console.error('[KPA AuditLog] Failed to write:', e);
    }
  }

  // GET /news/admin/list — operator용 전체 목록 (draft/published/archived 포함)
  newsRouter.get('/admin/list', authenticate, requireKpaScope('kpa:operator'), asyncHandler(async (req: Request, res: Response) => {
    const type = req.query.type as string;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const qb = contentRepo.createQueryBuilder('c')
      .where('c.serviceKey = :sk', { sk: KPA_SERVICE_KEY });

    if (type && ALLOWED_TYPES.includes(type)) {
      qb.andWhere('c.type = :type', { type });
    } else {
      qb.andWhere('c.type IN (:...types)', { types: ALLOWED_TYPES });
    }
    if (status && ['draft', 'published', 'archived'].includes(status)) {
      qb.andWhere('c.status = :status', { status });
    }

    qb.orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    res.json({ success: true, data, total, page, limit, totalPages: Math.ceil(total / limit) });
  }));

  // POST /news — 새 콘텐츠 생성
  newsRouter.post('/', authenticate, requireKpaScope('kpa:operator'), asyncHandler(async (req: Request, res: Response) => {
    const { title, content, type, status: reqStatus, summary } = req.body;
    if (!title || !type) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title and type are required' } });
      return;
    }
    if (!ALLOWED_TYPES.includes(type)) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `type must be one of: ${ALLOWED_TYPES.join(', ')}` } });
      return;
    }
    const validStatus = reqStatus === 'published' ? 'published' : 'draft';
    const userId = (req as any).user?.id;

    const entity = contentRepo.create({
      serviceKey: KPA_SERVICE_KEY,
      type,
      title,
      summary: summary || null,
      body: content || null,
      status: validStatus,
      publishedAt: validStatus === 'published' ? new Date() : null,
      createdBy: userId,
    });

    const saved = await contentRepo.save(entity);
    await writeAuditLog((req as any).user, 'CONTENT_CREATED', 'content', saved.id, { type, title, status: validStatus });
    res.status(201).json({ success: true, data: saved });
  }));

  // PUT /news/:id — 콘텐츠 수정
  newsRouter.put('/:id', authenticate, requireKpaScope('kpa:operator'), asyncHandler(async (req: Request, res: Response) => {
    const existing = await contentRepo.findOne({
      where: { id: req.params.id, serviceKey: KPA_SERVICE_KEY },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } });
      return;
    }

    const { title, content, type, status: reqStatus, summary } = req.body;
    if (title !== undefined) existing.title = title;
    if (summary !== undefined) existing.summary = summary;
    if (content !== undefined) existing.body = content;
    if (type !== undefined && ALLOWED_TYPES.includes(type)) existing.type = type;
    if (reqStatus !== undefined && ['draft', 'published', 'archived'].includes(reqStatus)) {
      if (reqStatus === 'published' && existing.status !== 'published') {
        existing.publishedAt = new Date();
      }
      existing.status = reqStatus;
    }

    const updated = await contentRepo.save(existing);
    await writeAuditLog((req as any).user, 'CONTENT_UPDATED', 'content', updated.id, { title: updated.title, status: updated.status });
    res.json({ success: true, data: updated });
  }));

  // DELETE /news/:id — Soft delete (status → archived)
  newsRouter.delete('/:id', authenticate, requireKpaScope('kpa:operator'), asyncHandler(async (req: Request, res: Response) => {
    const existing = await contentRepo.findOne({
      where: { id: req.params.id, serviceKey: KPA_SERVICE_KEY },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } });
      return;
    }

    existing.status = 'archived';
    const updated = await contentRepo.save(existing);
    await writeAuditLog((req as any).user, 'CONTENT_DELETED', 'content', updated.id, { title: updated.title });
    res.json({ success: true, data: updated });
  }));

  router.use('/news', newsRouter);

  // ============================================================================
  // Operator Audit Log Routes - /api/v1/kpa/operator/audit-logs
  // WO-KPA-A-OPERATOR-AUDIT-LOG-PHASE1-V1
  // ============================================================================
  router.get('/operator/audit-logs', authenticate, requireKpaScope('kpa:admin'), asyncHandler(async (req: Request, res: Response) => {
    const { action_type, target_type, operator_id, page = '1', limit = '20' } = req.query;

    const qb = auditRepo.createQueryBuilder('log')
      .orderBy('log.created_at', 'DESC');

    if (action_type) {
      qb.andWhere('log.action_type = :action_type', { action_type });
    }
    if (target_type) {
      qb.andWhere('log.target_type = :target_type', { target_type });
    }
    if (operator_id) {
      qb.andWhere('log.operator_id = :operator_id', { operator_id });
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);

    qb.skip((pageNum - 1) * limitNum).take(limitNum);

    const [logs, total] = await qb.getManyAndCount();

    res.json({
      success: true,
      data: logs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  }));

  // ============================================================================
  // Resources Routes - /api/v1/kpa/resources/*
  // Placeholder: Returns mock data until file management integration
  // ============================================================================
  const resourcesRouter = Router();

  resourcesRouter.get('/', optionalAuth, (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    res.json({
      success: true,
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
      message: 'Resources API - Integration pending'
    });
  });

  resourcesRouter.get('/:id', optionalAuth, (req: Request, res: Response) => {
    res.status(404).json({ success: false, error: { message: 'Resource not found' } });
  });

  resourcesRouter.post('/:id/download', authenticate, (req: Request, res: Response) => {
    res.status(404).json({ success: false, error: { message: 'Resource not found' } });
  });

  router.use('/resources', resourcesRouter);

  // ============================================================================
  // Groupbuy Routes - /api/v1/kpa/groupbuy/*
  // WO-KPA-GROUPBUY-PAGE-V1: product listing 기반 공동구매 카탈로그
  // WO-KPA-GROUPBUY-ORDER-METADATA-SYNC-V1: participate → ecommerce_orders
  // ============================================================================

  // WO-KPA-GROUPBUY-ORDER-METADATA-SYNC-V1: ORD-YYYYMMDD-XXXX (GlycoPharm 동일 포맷)
  function generateGroupbuyOrderNumber(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${dateStr}-${random}`;
  }

  const groupbuyRouter = Router();
  const groupbuyListingRepo = dataSource.getRepository(OrganizationProductListing);

  groupbuyRouter.get('/', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 12, 50);

    const [data, total] = await groupbuyListingRepo.findAndCount({
      where: { service_key: SERVICE_KEYS.KPA_GROUPBUY, is_active: true },
      order: { display_order: 'ASC', created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    res.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }));

  // WO-KPA-GROUPBUY-STATS-V1: 운영자 통계 엔드포인트
  groupbuyRouter.get('/stats', authenticate, requireKpaScope('kpa:operator'),
    asyncHandler(async (req: Request, res: Response) => {
      const [orderStats, quantityStats, storeStats, listingCount] = await Promise.all([
        dataSource.query(`
          SELECT
            COUNT(*)::int as "totalOrders",
            COALESCE(SUM(eo."totalAmount"), 0)::numeric as "totalRevenue"
          FROM ecommerce_orders eo
          WHERE eo.metadata->>'serviceKey' = 'kpa-groupbuy'
            AND eo.status = 'paid'
        `),
        dataSource.query(`
          SELECT COALESCE(SUM(oi.quantity), 0)::int as "totalQuantity"
          FROM ecommerce_order_items oi
          INNER JOIN ecommerce_orders eo ON eo.id = oi."orderId"
          WHERE eo.metadata->>'serviceKey' = 'kpa-groupbuy'
            AND eo.status = 'paid'
        `),
        dataSource.query(`
          SELECT COUNT(DISTINCT eo."buyerId")::int as "participatingStores"
          FROM ecommerce_orders eo
          WHERE eo.metadata->>'serviceKey' = 'kpa-groupbuy'
            AND eo.status = 'paid'
        `),
        groupbuyListingRepo.count({
          where: { service_key: SERVICE_KEYS.KPA_GROUPBUY, is_active: true },
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalOrders: orderStats[0]?.totalOrders ?? 0,
          totalQuantity: quantityStats[0]?.totalQuantity ?? 0,
          totalRevenue: parseFloat(orderStats[0]?.totalRevenue ?? '0'),
          participatingStores: storeStats[0]?.participatingStores ?? 0,
          registeredProducts: listingCount,
        },
      });
    })
  );

  // WO-KPA-GROUPBUY-ORDER-METADATA-SYNC-V1: 내 공동구매 주문 목록
  groupbuyRouter.get('/my-participations', authenticate,
    asyncHandler(async (req: Request, res: Response) => {
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      const orderRepo = dataSource.getRepository(EcommerceOrder);
      const [orders, total] = await orderRepo
        .createQueryBuilder('o')
        .leftJoinAndSelect('o.items', 'items')
        .where('o."buyerId" = :buyerId', { buyerId: user.id })
        .andWhere("o.metadata->>'serviceKey' = :sk", { sk: 'kpa-groupbuy' })
        .orderBy('o."createdAt"', 'DESC')
        .take(20)
        .getManyAndCount();

      res.json({
        success: true,
        data: orders.map(o => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          totalAmount: o.totalAmount,
          productName: (o.metadata as any)?.productName,
          createdAt: o.createdAt,
        })),
        pagination: { page: 1, limit: 20, total, totalPages: Math.ceil(total / 20) },
      });
    })
  );

  groupbuyRouter.get('/:id', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const listing = await groupbuyListingRepo.findOne({
      where: { id: req.params.id, service_key: SERVICE_KEYS.KPA_GROUPBUY, is_active: true },
    });
    if (!listing) {
      res.status(404).json({ success: false, error: { message: 'Groupbuy product not found' } });
      return;
    }
    res.json({ success: true, data: listing });
  }));

  // WO-KPA-GROUPBUY-ORDER-METADATA-SYNC-V1: 공동구매 주문 생성
  // listing.service_key → Order.metadata.serviceKey 전파 보장
  groupbuyRouter.post('/:id/participate', authenticate,
    asyncHandler(async (req: Request, res: Response) => {
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }

      // 1. listing 조회
      const listing = await groupbuyListingRepo.findOne({
        where: { id: req.params.id, service_key: SERVICE_KEYS.KPA_GROUPBUY, is_active: true },
      });
      if (!listing) {
        res.status(404).json({ success: false, error: { message: 'Product not found' } });
        return;
      }

      // 2. 수량 (기본 1)
      const quantity = Math.max(1, parseInt(req.body?.quantity) || 1);
      const unitPrice = Number(listing.retail_price ?? 0);
      const subtotal = quantity * unitPrice;

      // 3. metadata.serviceKey 전파 — listing.service_key → Order.metadata.serviceKey
      const metadata: Record<string, unknown> = {
        serviceKey: listing.service_key,
        productListingId: listing.id,
        productName: listing.product_name,
        externalProductId: listing.external_product_id,
      };

      // 4. ecommerce_orders에 주문 생성 (GlycoPharm createCoreOrder 패턴)
      const orderRepo = dataSource.getRepository(EcommerceOrder);
      const orderItemRepo = dataSource.getRepository(EcommerceOrderItem);

      const order = orderRepo.create({
        orderNumber: generateGroupbuyOrderNumber(),
        buyerId: user.id,
        buyerType: BuyerType.USER,
        sellerId: listing.organization_id,
        sellerType: SellerType.ORGANIZATION,
        orderType: OrderType.RETAIL,
        subtotal,
        shippingFee: 0,
        discount: 0,
        totalAmount: subtotal,
        currency: 'KRW',
        paymentStatus: PaymentStatus.PENDING,
        status: OrderStatus.CREATED,
        metadata,
        orderSource: 'kpa-society',
      });

      const savedOrder = await orderRepo.save(order);

      const orderItem = orderItemRepo.create({
        orderId: savedOrder.id,
        productId: listing.external_product_id || listing.id,
        productName: listing.product_name,
        quantity,
        unitPrice,
        discount: 0,
        subtotal,
        metadata: { productListingId: listing.id },
      });

      await orderItemRepo.save(orderItem);

      res.status(201).json({
        success: true,
        data: {
          orderId: savedOrder.id,
          orderNumber: savedOrder.orderNumber,
          status: savedOrder.status,
          totalAmount: savedOrder.totalAmount,
        },
      });
    })
  );

  router.use('/groupbuy', groupbuyRouter);

  // ============================================================================
  // MyPage Routes - /api/v1/kpa/mypage/*
  // User profile, settings, and activity summary
  // ============================================================================
  const mypageRouter = Router();

  mypageRouter.get('/profile', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.id) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    // Fetch full user data from database
    const userRepository = dataSource.getRepository('User');
    const fullUser = await userRepository.findOne({ where: { id: user.id } }) as any;

    // Fetch KpaMember data (pharmacist/pharmacy info)
    let kpaMember: any = null;
    try {
      const kpaMemberRepository = dataSource.getRepository('KpaMember');
      kpaMember = await kpaMemberRepository.findOne({
        where: { user_id: user.id },
        relations: ['organization']
      });
    } catch {
      // KpaMember may not exist for all users
    }

    // Fetch OrganizationMember data (officer info)
    let organizationMemberships: any[] = [];
    try {
      const orgMemberRepository = dataSource.getRepository('OrganizationMember');
      organizationMemberships = await orgMemberRepository.find({
        where: { userId: user.id },
        relations: ['organization']
      });
    } catch {
      // OrganizationMember may not exist
    }

    // Determine user type based on roles
    const roles: string[] = fullUser?.roles || [];
    // WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: KPA roles only
    const isSuperOperator = roles.some((r: string) =>
      ['kpa:admin', 'kpa:operator'].includes(r)
    );
    const isPharmacyOwner = kpaMember?.pharmacy_name ? true : false;
    const isOfficer = organizationMemberships.some((m: any) =>
      ['admin', 'manager', 'chair', 'officer'].includes(m.role)
    );

    res.json({
      success: true,
      data: {
        // Basic info (all users)
        id: fullUser?.id,
        name: fullUser?.name || '',
        lastName: fullUser?.lastName || '',
        firstName: fullUser?.firstName || '',
        email: fullUser?.email || '',
        phone: fullUser?.phone || '',
        roles: roles,

        // User type flags
        userType: {
          isSuperOperator,
          isPharmacyOwner,
          isOfficer,
        },

        // Pharmacist info (약사 정보) - Super Operator가 아닌 경우에만
        pharmacist: !isSuperOperator ? {
          licenseNumber: kpaMember?.license_number || null,
          university: fullUser?.university || null,
          workplace: fullUser?.workplace || null,
        } : null,

        // Pharmacy info (약국 정보) - 약국개설자인 경우에만
        pharmacy: isPharmacyOwner ? {
          name: kpaMember?.pharmacy_name || null,
          address: kpaMember?.pharmacy_address || null,
        } : null,

        // Organization/Officer info (조직/임원 정보)
        organizations: organizationMemberships.map((m: any) => ({
          id: m.organization?.id,
          name: m.organization?.name,
          type: m.organization?.type,
          role: m.role,
          position: m.metadata?.position || null,
        })),
      }
    });
  }));

  mypageRouter.put('/profile', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.id) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { name, lastName, firstName, phone } = req.body;
    const userRepository = dataSource.getRepository('User');

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (phone !== undefined) updateData.phone = phone ? phone.replace(/\D/g, '') : phone;

    // If lastName and firstName provided, auto-generate name
    if (lastName !== undefined || firstName !== undefined) {
      const newLastName = lastName ?? user.lastName ?? '';
      const newFirstName = firstName ?? user.firstName ?? '';
      updateData.name = `${newLastName}${newFirstName}`.trim() || updateData.name;
    }

    await userRepository.update(user.id, updateData);

    // Fetch updated user
    const updatedUser = await userRepository.findOne({ where: { id: user.id } });

    res.json({
      success: true,
      data: {
        id: updatedUser?.id,
        name: updatedUser?.name || '',
        lastName: updatedUser?.lastName || '',
        firstName: updatedUser?.firstName || '',
        email: updatedUser?.email || '',
        phone: updatedUser?.phone || '',
      }
    });
  }));

  mypageRouter.get('/settings', authenticate, (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        emailNotifications: true,
        smsNotifications: false,
        marketingConsent: false
      }
    });
  });

  mypageRouter.put('/settings', authenticate, (req: Request, res: Response) => {
    res.json({ success: true, message: 'Settings update - Integration pending' });
  });

  mypageRouter.get('/activities', authenticate, (req: Request, res: Response) => {
    res.json({
      success: true,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });
  });

  mypageRouter.get('/summary', authenticate, (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        enrolledCourses: 0,
        completedCourses: 0,
        certificates: 0,
        forumPosts: 0,
        groupbuyParticipations: 0
      }
    });
  });

  mypageRouter.get('/enrollments', authenticate, asyncHandler(EnrollmentController.getMyEnrollments));
  mypageRouter.get('/certificates', authenticate, asyncHandler(CertificateController.getMyCertificates));
  mypageRouter.get('/groupbuys', authenticate, (req: Request, res: Response) => {
    res.json({
      success: true,
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    });
  });

  router.use('/mypage', mypageRouter);

  // ============================================================================
  // Organization Info Routes - /api/v1/kpa/organization (public)
  // Public organization information (different from /organizations admin API)
  // ============================================================================
  const orgInfoRouter = Router();

  orgInfoRouter.get('/', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        name: '대한약사회',
        description: '대한민국 약사들의 권익 보호 및 국민 건강 증진을 위한 전문직 단체',
        established: '1953-04-25',
        memberCount: 0,
        branchCount: 0
      }
    });
  });

  orgInfoRouter.get('/branches', (req: Request, res: Response) => {
    res.json({ success: true, data: [] });
  });

  orgInfoRouter.get('/branches/:id', (req: Request, res: Response) => {
    res.status(404).json({ success: false, error: { message: 'Branch not found' } });
  });

  orgInfoRouter.get('/officers', (req: Request, res: Response) => {
    res.json({ success: true, data: [] });
  });

  orgInfoRouter.get('/contact', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        address: '',
        phone: '',
        fax: '',
        email: '',
        workingHours: '평일 09:00 - 18:00'
      }
    });
  });

  router.use('/organization', orgInfoRouter);

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'kpa', timestamp: new Date().toISOString() });
  });

  return router;
}

/**
 * Create public join inquiry routes
 * Mounted at /api/v1/join (no auth required)
 */
export function createKpaJoinPublicRoutes(dataSource: DataSource): Router {
  return createJoinInquiryPublicRoutes(dataSource);
}

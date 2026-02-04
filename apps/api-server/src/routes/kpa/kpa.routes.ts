/**
 * KPA Routes
 * 약사회 SaaS API 라우트 설정
 *
 * API Namespace: /api/v1/kpa
 *
 * Domain routes for KPA Society service:
 * - /api/v1/kpa/organizations - 조직 관리
 * - /api/v1/kpa/members - 회원 관리
 * - /api/v1/kpa/applications - 신청서 처리
 * - /api/v1/kpa/forum - 포럼/커뮤니티
 * - /api/v1/kpa/lms - 학습관리시스템
 * - /api/v1/kpa/news - 공지사항/뉴스
 * - /api/v1/kpa/resources - 자료실
 * - /api/v1/kpa/groupbuy - 공동구매
 * - /api/v1/kpa/mypage - 마이페이지
 * - /api/v1/kpa/organization - 조직정보 (공개)
 * - /api/v1/kpa/join-inquiries - 참여 문의 관리 (관리자)
 */

import { Router, RequestHandler, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { createOrganizationController } from './controllers/organization.controller.js';
import { createMemberController } from './controllers/member.controller.js';
import { createApplicationController } from './controllers/application.controller.js';
import { createAdminDashboardController } from './controllers/admin-dashboard.controller.js';
import { createBranchAdminDashboardController } from './controllers/branch-admin-dashboard.controller.js';
import { createGroupbuyOperatorController } from './controllers/groupbuy-operator.controller.js';
import { createJoinInquiryAdminRoutes, createJoinInquiryPublicRoutes } from './controllers/join-inquiry.controller.js';
import { createOrganizationJoinRequestRoutes } from './controllers/organization-join-request.controller.js';
import { createStewardController } from './controllers/steward.controller.js';
import { requireAuth as coreRequireAuth, authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/error-handler.js';

// Domain controllers - Forum
import { ForumController } from '../../controllers/forum/ForumController.js';
import { forumContextMiddleware } from '../../middleware/forum-context.middleware.js';

// LMS Controllers
import { CourseController } from '../../modules/lms/controllers/CourseController.js';
import { LessonController } from '../../modules/lms/controllers/LessonController.js';
import { EnrollmentController } from '../../modules/lms/controllers/EnrollmentController.js';
import { CertificateController } from '../../modules/lms/controllers/CertificateController.js';

/**
 * Scope verification middleware factory for KPA
 */
function requireKpaScope(scope: string): RequestHandler {
  return (req, res, next) => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    // Check for kpa:* scope or admin role
    const userScopes: string[] = user.scopes || [];
    const userRoles: string[] = user.roles || [];

    const hasScope = userScopes.includes(scope) || userScopes.includes('kpa:admin');
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
 * Create KPA routes
 */
export function createKpaRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Mount controllers with auth middleware
  router.use('/organizations', createOrganizationController(dataSource, coreRequireAuth as any, requireKpaScope));
  router.use('/members', createMemberController(dataSource, coreRequireAuth as any, requireKpaScope));
  router.use('/applications', createApplicationController(dataSource, coreRequireAuth as any, requireKpaScope));

  // Admin Dashboard routes (WO-KPA-SOCIETY-DASHBOARD-P1-A)
  router.use('/admin', createAdminDashboardController(dataSource, coreRequireAuth as any, requireKpaScope));

  // Branch Admin Dashboard routes (WO-KPA-OPERATOR-DASHBOARD-IMPROVEMENT-V1)
  router.use('/branch-admin', createBranchAdminDashboardController(dataSource, coreRequireAuth as any));

  // Groupbuy Operator routes (WO-KPA-GROUPBUY-OPERATOR-UI-V1)
  router.use('/groupbuy-admin', createGroupbuyOperatorController(dataSource, coreRequireAuth as any));

  // Join Inquiry Admin routes (WO-KPA-JOIN-CONVERSION-V1)
  router.use('/join-inquiries', createJoinInquiryAdminRoutes(dataSource, coreRequireAuth as any, requireKpaScope));

  // Organization Join Request routes (WO-CONTEXT-JOIN-REQUEST-MVP-V1)
  router.use('/organization-join-requests', createOrganizationJoinRequestRoutes(dataSource, coreRequireAuth as any, requireKpaScope));

  // Steward routes (WO-KPA-STEWARDSHIP-AND-ORGANIZATION-UI-IMPLEMENTATION-V1)
  router.use('/stewards', createStewardController(dataSource, coreRequireAuth as any, requireKpaScope));

  // ============================================================================
  // Forum Routes - /api/v1/kpa/forum/*
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
  demoForumRouter.post('/categories', authenticate, demoForumController.createCategory.bind(demoForumController));
  demoForumRouter.put('/categories/:id', authenticate, demoForumController.updateCategory.bind(demoForumController));
  demoForumRouter.delete('/categories/:id', authenticate, demoForumController.deleteCategory.bind(demoForumController));
  demoForumRouter.get('/moderation', authenticate, demoForumController.getModerationQueue.bind(demoForumController));
  demoForumRouter.post('/moderation/:type/:id', authenticate, demoForumController.moderateContent.bind(demoForumController));

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

  router.use('/lms', lmsRouter);

  // ============================================================================
  // News Routes - /api/v1/kpa/news/*
  // Placeholder: Returns mock data until CMS integration is complete
  // ============================================================================
  const newsRouter = Router();

  newsRouter.get('/', optionalAuth, (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    res.json({
      success: true,
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
      message: 'News API - Integration pending'
    });
  });

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

  newsRouter.get('/:id', optionalAuth, (req: Request, res: Response) => {
    res.status(404).json({ success: false, error: { message: 'News not found' } });
  });

  router.use('/news', newsRouter);

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
  // Placeholder: Returns mock data until groupbuy module integration
  // ============================================================================
  const groupbuyRouter = Router();

  groupbuyRouter.get('/', optionalAuth, (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    res.json({
      success: true,
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
      message: 'Groupbuy API - Integration pending'
    });
  });

  groupbuyRouter.get('/my-participations', authenticate, (req: Request, res: Response) => {
    res.json({
      success: true,
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    });
  });

  groupbuyRouter.get('/:id', optionalAuth, (req: Request, res: Response) => {
    res.status(404).json({ success: false, error: { message: 'Groupbuy not found' } });
  });

  groupbuyRouter.post('/:id/participate', authenticate, (req: Request, res: Response) => {
    res.status(404).json({ success: false, error: { message: 'Groupbuy not found' } });
  });

  router.use('/groupbuy', groupbuyRouter);

  // ============================================================================
  // MyPage Routes - /api/v1/kpa/mypage/*
  // User profile, settings, and activity summary
  // ============================================================================
  const mypageRouter = Router();

  mypageRouter.get('/profile', authenticate, (req: Request, res: Response) => {
    const user = (req as any).user;
    res.json({
      success: true,
      data: {
        id: user?.id,
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
      }
    });
  });

  mypageRouter.put('/profile', authenticate, (req: Request, res: Response) => {
    res.json({ success: true, message: 'Profile update - Integration pending' });
  });

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

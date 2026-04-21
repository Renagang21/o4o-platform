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
 * │  /forum (GET)       - 포럼 조회                                        │
 * │  (demo-forum removed — WO-O4O-KPA-CODE-CLEANUP-V1)                     │
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
import { createOperatorSummaryController } from './controllers/operator-summary.controller.js';
import { createGroupbuyOperatorController } from './controllers/groupbuy-operator.controller.js';
import { createSupplierOffersController } from './controllers/supplier-offers.controller.js';
import { createJoinInquiryAdminRoutes, createJoinInquiryPublicRoutes } from './controllers/join-inquiry.controller.js';
import { createOrganizationJoinRequestRoutes } from './controllers/organization-join-request.controller.js';
import { createPharmacyRequestRoutes } from './controllers/pharmacy-request.controller.js';
import { createStewardController } from './controllers/steward.controller.js';
import { createStoreHubController } from '../o4o-store/controllers/store-hub.controller.js';
import { createPharmacyStoreConfigController } from '../o4o-store/controllers/pharmacy-store-config.controller.js';
import { createPharmacyInfoController } from '../o4o-store/controllers/pharmacy-info.controller.js';
import { createPharmacyProductsController } from '../o4o-store/controllers/pharmacy-products.controller.js';
import { createOperatorProductApplicationsController } from './controllers/operator-product-applications.controller.js';
import { createAssetSnapshotController } from '../o4o-store/controllers/asset-snapshot.controller.js';
import { createStoreAssetControlController } from '../o4o-store/controllers/store-asset-control.controller.js';
import { createAdminForceAssetController } from './controllers/admin-force-asset.controller.js';
import { createPublishedAssetsController } from '../o4o-store/controllers/published-assets.controller.js';
import { createStoreContentController } from '../o4o-store/controllers/store-content.controller.js';
import { createStoreExecutionAssetsController } from '../o4o-store/controllers/store-execution-assets.controller.js';
import { createStoreQrLandingController } from '../o4o-store/controllers/store-qr-landing.controller.js';
import { createStorePopController } from '../o4o-store/controllers/store-pop.controller.js';
import { createStoreAnalyticsController } from '../o4o-store/controllers/store-analytics.controller.js';
import { createProductMarketingController } from '../o4o-store/controllers/product-marketing.controller.js';
import { createStorePlaylistController } from '../o4o-store/controllers/store-playlist.controller.js';
import { createStoreChannelProductsController } from '../o4o-store/controllers/store-channel-products.controller.js';
import { createKpaStoreTemplateController } from '../o4o-store/controllers/kpa-store-template.controller.js';
import { createKpaCheckoutController } from './controllers/kpa-checkout.controller.js'; // WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1
import { createKpaPaymentController } from './controllers/kpa-payment.controller.js'; // WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1
import { createTabletController } from '../o4o-store/controllers/tablet.controller.js';
import { createBlogController } from '../o4o-store/controllers/blog.controller.js';
import { createLayoutController } from '../o4o-store/controllers/layout.controller.js'; // WO-STORE-BLOCK-ENGINE-V1
import { createStoreSettingsController } from '../o4o-store/controllers/store-settings.controller.js'; // WO-STORE-COMMON-SETTINGS-FOUNDATION-V1
// WO-O4O-ROUTES-REFACTOR-V1: Extracted controllers
import { createInstructorController } from './controllers/instructor.controller.js';
import { createCourseRequestController } from './controllers/course-request.controller.js';
import { createForumRequestController } from './controllers/forum-request.controller.js';
import { createForumMembershipController } from './controllers/forum-membership.controller.js';
import { createCommunityHubController } from './controllers/community-hub.controller.js';
import { createLegalDocumentsController } from './controllers/legal-documents.controller.js';
import { createGroupbuyController } from './controllers/groupbuy.controller.js';
import { createMypageController } from './controllers/mypage.controller.js';
import { createQualificationController } from './controllers/qualification.controller.js'; // WO-O4O-QUALIFICATION-SYSTEM-V1
import { createInstructorDashboardController } from './controllers/instructor-dashboard.controller.js'; // WO-O4O-INSTRUCTOR-DASHBOARD-V1
import { createWorkingContentController } from './controllers/working-content.controller.js';
import { execute } from '@o4o/ai-core';
import { buildConfigResolver } from '../../utils/ai-config-resolver.js';
import {
  SUMMARIZE_SYSTEM_PROMPT, buildSummarizeUserPrompt,
  EXTRACT_SYSTEM_PROMPT, buildExtractUserPrompt,
  TAG_SYSTEM_PROMPT, buildTagUserPrompt,
} from './prompts/content-prompts.js';
import { CmsContent } from '@o4o-apps/cms-core';
import { KpaAuditLog } from './entities/kpa-audit-log.entity.js';
import { KpaMember } from './entities/kpa-member.entity.js';
import { OrganizationStore } from '../../modules/store-core/entities/organization-store.entity.js';
import { requireAuth as coreRequireAuth, authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { uploadSingleMiddleware } from '../../middleware/upload.middleware.js';
// WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: legacy role utils removed
import { KPA_SCOPE_CONFIG } from '@o4o/security-core';
import { createMembershipScopeGuard } from '../../common/middleware/membership-guard.middleware.js';
import { ActionLogService } from '@o4o/action-log-core';
// WO-O4O-OPERATOR-ACTION-LAYER-V1
import { createActionQueueRouter } from '../../common/action-queue/index.js';
import { kpaActionConfig } from './action-definitions.js';

// Domain controllers - Forum
import { ForumController } from '../../controllers/forum/ForumController.js';
import { forumContextMiddleware } from '../../middleware/forum-context.middleware.js';

// LMS Controllers
import { CourseController } from '../../modules/lms/controllers/CourseController.js';
import { LessonController } from '../../modules/lms/controllers/LessonController.js';
import { EnrollmentController } from '../../modules/lms/controllers/EnrollmentController.js';
import { CertificateController } from '../../modules/lms/controllers/CertificateController.js';
import { InstructorPublicController } from '../../modules/lms/controllers/InstructorPublicController.js';
// WO-O4O-CREDIT-SYSTEM-V1
import { CreditController } from '../../modules/credit/controllers/CreditController.js';
// WO-O4O-COMPLETION-V1
import { CompletionController } from '../../modules/lms/controllers/CompletionController.js';

/**
 * KPA Scope Guard — powered by @o4o/security-core
 *
 * WO-GLYCOPHARM-CARE-DATA-ISOLATION-PHASE1-V1: Platform Security Core migration
 * Replaces inline implementation with shared security-core guard factory.
 * Behavior is identical: KPA roles only, no platform bypass, legacy detect+deny.
 */
const requireKpaScope = createMembershipScopeGuard(KPA_SCOPE_CONFIG);

/**
 * Create KPA routes
 */
export function createKpaRoutes(dataSource: DataSource): Router {
  const router = Router();
  const kpaActionLogService = new ActionLogService(dataSource);

  // APP-CONTENT Phase 2: shared content query service
  // WO-O4O-KPA-CODE-CLEANUP-V1: unified to 'kpa-society' (backward compat includes legacy 'kpa')
  const contentService = new ContentQueryService(dataSource, {
    serviceKeys: ['kpa-society', 'kpa'],
    defaultTypes: ['notice', 'news'],
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

  // Qualification System (WO-O4O-QUALIFICATION-SYSTEM-V1)
  router.use('/qualifications', createQualificationController(dataSource, coreRequireAuth as any, requireKpaScope));

  // Instructor Dashboard (WO-O4O-INSTRUCTOR-DASHBOARD-V1)
  router.use('/instructor', createInstructorDashboardController(dataSource, coreRequireAuth as any));

  // Instructor Qualifications (WO-O4O-ROUTES-REFACTOR-V1)
  router.use('/', createInstructorController(dataSource, coreRequireAuth as any, requireKpaScope));

  // Course Requests (WO-O4O-ROUTES-REFACTOR-V1)
  router.use('/', createCourseRequestController(dataSource, coreRequireAuth as any, requireKpaScope));

  // Forum Requests (WO-O4O-ROUTES-REFACTOR-V1)
  router.use('/', createForumRequestController(dataSource, coreRequireAuth as any, requireKpaScope));

  // Community Hub — Ads/Sponsors (WO-KPA-A-COMMUNITY-HUB-IMPLEMENTATION-V1)
  router.use('/', createCommunityHubController(dataSource, coreRequireAuth as any, requireKpaScope));

  // ============================================================================
  // OPERATOR ROUTES — requireKpaScope('kpa:operator') enforced
  // WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: Operations/Content → Operator
  // ============================================================================

  // WorkingContent CRUD + Publish (WO-O4O-STORE-CONTENT-USAGE-RECOMPOSE-V1)
  // MUST be registered BEFORE operator summary controller (Express route ordering:
  // summary controller's requireKpaScope('kpa:operator') middleware intercepts all /operator/* requests)
  router.use('/operator/working-contents', createWorkingContentController(dataSource, coreRequireAuth as any));

  // Operator Summary routes (운영자 실사용 화면 1단계)
  router.use('/operator', createOperatorSummaryController(dataSource, {
    contentService,
    signageService,
    forumService,
  }));
  // WO-O4O-OPERATOR-ACTION-LAYER-V1: Action Queue endpoints
  // WO-O4O-ACTION-SCOPE-GUARD-V1: execute endpoint admin-only scope guard
  router.use('/operator', coreRequireAuth as any, createActionQueueRouter(dataSource, kpaActionConfig, requireKpaScope('kpa:admin')));

  // Product Application Management (WO-O4O-PRODUCT-APPROVAL-WORKFLOW-V1)
  router.use('/operator/product-applications', createOperatorProductApplicationsController(dataSource, coreRequireAuth as any, requireKpaScope, kpaActionLogService));

  // Groupbuy Operator routes (WO-KPA-GROUPBUY-OPERATOR-UI-V1)
  router.use('/groupbuy-admin', createGroupbuyOperatorController(dataSource, coreRequireAuth as any));

  // Supplier Event Offer proposal routes (WO-EVENT-OFFER-SUPPLIER-PROPOSAL-PATH-V1)
  router.use('/supplier', createSupplierOffersController(dataSource, coreRequireAuth as any));

  // Join Inquiry Admin routes (WO-KPA-JOIN-CONVERSION-V1)
  router.use('/join-inquiries', createJoinInquiryAdminRoutes(dataSource, coreRequireAuth as any, requireKpaScope));

  // Organization Join Request routes (WO-CONTEXT-JOIN-REQUEST-MVP-V1)
  router.use('/organization-join-requests', createOrganizationJoinRequestRoutes(dataSource, coreRequireAuth as any, requireKpaScope, kpaActionLogService));

  // ── AI Selection Summary (WO-O4O-TABLE-STANDARD-V3) ──
  router.post('/operator/ai/summarize-selection', coreRequireAuth as any, requireKpaScope('kpa:admin') as any, asyncHandler(async (req: Request, res: Response) => {
    const { items, context } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'items 배열이 필요합니다.', code: 'INVALID_INPUT' });
      return;
    }
    if (items.length > 20) {
      res.status(400).json({ success: false, error: '최대 20개 항목까지 요약 가능합니다.', code: 'TOO_MANY_ITEMS' });
      return;
    }

    // Truncate data to ~4000 chars
    const dataStr = JSON.stringify(items).slice(0, 4000);

    const systemPrompt = `당신은 운영자 대시보드 AI 어시스턴트입니다. 선택된 항목 데이터를 분석하여 패턴, 추천, 주의사항을 한국어로 요약합니다.

응답 형식 (JSON):
{
  "summary": "전체 요약 (1-3문장)",
  "patterns": ["발견된 패턴 1", "패턴 2"],
  "recommendations": ["추천 액션 1", "추천 액션 2"],
  "warnings": ["주의사항 (있을 경우)"]
}`;

    const userPrompt = `다음 ${items.length}개 항목을 분석해 주세요.${context ? `\n맥락: ${context}` : ''}\n\n데이터:\n${dataStr}`;

    try {
      const result = await execute({
        systemPrompt,
        userPrompt,
        config: buildConfigResolver(dataSource, 'store'),
        timeoutMs: 5000,
        meta: { service: 'kpa', callerName: 'KpaSelectionSummarize' },
      });
      const parsed = JSON.parse(result.content);
      res.json({ success: true, data: { ...parsed, source: 'ai' as const } });
    } catch (e: any) {
      console.error('[KPA AI Selection Summarize] Failed, using rule-based fallback:', e.message);

      // Rule-based fallback: count by type/organization/status
      const statusCounts: Record<string, number> = {};
      const orgCounts: Record<string, number> = {};
      const typeCounts: Record<string, number> = {};
      for (const item of items) {
        if (item.status) statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
        if (item.organization_id) orgCounts[item.organization_id] = (orgCounts[item.organization_id] || 0) + 1;
        if (item.request_type) typeCounts[item.request_type] = (typeCounts[item.request_type] || 0) + 1;
      }

      const patterns: string[] = [];
      if (Object.keys(typeCounts).length > 0) patterns.push(`유형별: ${Object.entries(typeCounts).map(([k, v]) => `${k} ${v}건`).join(', ')}`);
      if (Object.keys(orgCounts).length > 0) patterns.push(`${Object.keys(orgCounts).length}개 조직에서 요청`);

      res.json({
        success: true,
        data: {
          summary: `선택된 ${items.length}개 항목 분석 결과`,
          patterns,
          recommendations: items.length >= 5 ? ['일괄 처리를 권장합니다'] : [],
          warnings: [],
          source: 'rule-based' as const,
        },
      });
    }
  }));

  // Pharmacy Request routes (WO-KPA-A-PHARMACY-REQUEST-STRUCTURE-REALIGN-V1)
  // 약국 서비스 신청 — 개인 신원 확장 (OrganizationJoinRequest에서 분리)
  router.use('/pharmacy-requests', createPharmacyRequestRoutes(dataSource, coreRequireAuth as any, requireKpaScope, kpaActionLogService));

  // Steward routes (WO-KPA-STEWARDSHIP-AND-ORGANIZATION-UI-IMPLEMENTATION-V1)
  router.use('/stewards', createStewardController(dataSource, coreRequireAuth as any, requireKpaScope));

  // Legal Documents routes (WO-KPA-A-OPERATOR-DASHBOARD-ENHANCEMENT-V3)
  router.use('/', createLegalDocumentsController(dataSource, coreRequireAuth as any, requireKpaScope));

  // ============================================================================
  // AUTHENTICATED USER ROUTES — requireAuth only (no admin/operator scope)
  // ============================================================================

  // Store Hub routes (WO-STORE-HUB-UNIFIED-RENDERING-PHASE1-V1)
  router.use('/store-hub', createStoreHubController(dataSource, coreRequireAuth as any));

  // Channel Product Management (WO-CHANNEL-EXECUTION-CONSOLE-V1)
  router.use('/store-hub/channel-products', createStoreChannelProductsController(dataSource, coreRequireAuth as any));

  // Pharmacy Store Config routes (WO-PHARMACY-HUB-REALIGN-PHASEH2-V1)
  router.use('/pharmacy/store', createPharmacyStoreConfigController(dataSource, coreRequireAuth as any));

  // Pharmacy Info routes (WO-KPA-PHARMACY-INFO-EDIT-FLOW-V1)
  router.use('/pharmacy', createPharmacyInfoController(dataSource, coreRequireAuth as any));

  // Pharmacy Products routes (WO-PHARMACY-PRODUCT-LISTING-APPROVAL-PHASE1-V1)
  router.use('/pharmacy/products', createPharmacyProductsController(dataSource, coreRequireAuth as any));

  // Asset Snapshot routes (WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1)
  router.use('/assets', createAssetSnapshotController(dataSource, coreRequireAuth as any));

  // Store Asset Control routes (WO-KPA-A-ASSET-CONTROL-EXTENSION-V1)
  router.use('/store-assets', createStoreAssetControlController(dataSource, coreRequireAuth as any));

  // Store Content routes (WO-KPA-A-CONTENT-OVERRIDE-EXTENSION-V1)
  router.use('/store-contents', createStoreContentController(dataSource, coreRequireAuth as any));

  // Store Playlist routes (WO-O4O-SIGNAGE-STORE-PLAYLIST-ENGINE-V1)
  router.use('/store-playlists', createStorePlaylistController(dataSource, coreRequireAuth as any, 'kpa-society'));

  // O4O-STORE: root-mounted controllers (internal prefix /pharmacy/*)
  // 컨트롤러 내부에 full path 정의됨. prefix 분리는 별도 WO에서 수행.
  // WO-KPA-B-STORE-CONTAMINATION-CLEANUP-V1 Phase 2: 문서화 완료

  // Store Execution Assets routes (WO-KPA-STORE-ASSET-STRUCTURE-REFACTOR-V1) — internal: /store/assets/*
  router.use('/', createStoreExecutionAssetsController(dataSource, coreRequireAuth as any));

  // Store QR Landing routes (WO-O4O-QR-LANDING-PAGE-V1) — internal: /qr/public/*, /pharmacy/qr/*
  router.use('/', createStoreQrLandingController(dataSource, coreRequireAuth as any));

  // Store POP routes (WO-O4O-QR-POP-AUTO-GENERATOR-V1) — internal: /pharmacy/pop/*
  router.use('/', createStorePopController(dataSource, coreRequireAuth as any));

  // Store Analytics routes (WO-O4O-MARKETING-ANALYTICS-V1) — internal: /pharmacy/analytics/*
  router.use('/', createStoreAnalyticsController(dataSource, coreRequireAuth as any));

  // Product Marketing Graph (WO-O4O-PRODUCT-MARKETING-GRAPH-V1) — internal: /pharmacy/products/*/marketing
  router.use('/', createProductMarketingController(dataSource, coreRequireAuth as any));

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

  // WO-STORE-COMMON-SETTINGS-FOUNDATION-V1: unified settings + channel config
  const kpaStoreSettingsController = createStoreSettingsController(dataSource, coreRequireAuth as any);
  router.use('/stores', kpaStoreSettingsController);

  // ============================================================================
  // Membership Query — /api/v1/kpa/me/membership
  // WO-KPA-BRANCH-SCOPE-VALIDATION-V1: User's KPA membership info for branch scope validation
  // @deprecated WO-KPA-B-SERVICE-CONTEXT-UNIFICATION-V1: /auth/me의 kpaMembership 필드로 대체됨
  //   프론트 호출 제거 완료. API는 외부 호환성을 위해 유지.
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
  // Owner routes — WO-O4O-FORUM-MY-FORUM-EXPANSION-V1 (before :id to avoid param matching)
  forumRouter.get('/categories/mine', authenticate, forumController.listMyCategories.bind(forumController));
  forumRouter.patch('/categories/:id/owner', authenticate, forumController.updateMyCategory.bind(forumController));
  forumRouter.post('/categories/:id/delete-request', authenticate, forumController.requestDeleteCategory.bind(forumController));
  forumRouter.get('/categories/:id', forumController.getCategory.bind(forumController));
  // Structure creation/modification/deletion → Admin only
  forumRouter.post('/categories', authenticate, requireKpaScope('kpa:admin'), forumController.createCategory.bind(forumController));
  forumRouter.put('/categories/:id', authenticate, requireKpaScope('kpa:admin'), forumController.updateCategory.bind(forumController));
  forumRouter.delete('/categories/:id', authenticate, requireKpaScope('kpa:admin'), forumController.deleteCategory.bind(forumController));

  // Moderation (operator scope — WO-KPA-A-OPERATOR-SECURITY-ALIGNMENT-PHASE1)
  forumRouter.get('/moderation', authenticate, requireKpaScope('kpa:operator'), forumController.getModerationQueue.bind(forumController));
  forumRouter.post('/moderation/:type/:id', authenticate, requireKpaScope('kpa:operator'), forumController.moderateContent.bind(forumController));

  // WO-KPA-A-FORUM-MEMBERSHIP-TABLE-AND-JOIN-API-V1: 폐쇄형 포럼 멤버십 API
  forumRouter.use('/', createForumMembershipController(dataSource, authenticate as any));

  router.use('/forum', forumRouter);

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

  // WO-O4O-COMPLETION-V1: Completions
  lmsRouter.get('/completions/me', authenticate, asyncHandler(CompletionController.getMyCompletions));

  router.use('/lms', lmsRouter);

  // ============================================================================
  // Credit Routes - /api/v1/kpa/credits/* (WO-O4O-CREDIT-SYSTEM-V1)
  // ============================================================================
  const creditRouter = Router();
  creditRouter.get('/me', authenticate, asyncHandler(CreditController.getMyBalance));
  creditRouter.get('/me/transactions', authenticate, asyncHandler(CreditController.getMyTransactions));
  router.use('/credits', creditRouter);

  // ============================================================================
  // Home Routes - /api/v1/kpa/home/*
  // WO-KPA-HOME-PHASE1-V1: Home page summary endpoints
  // ============================================================================
  const homeRouter = Router();

  // GET /home/notices - 공지사항 (APP-CONTENT Phase 2: ContentQueryService)
  homeRouter.get('/notices', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 5;
    const data = await contentService.listForHome(['notice'], limit);
    res.json({ success: true, data });
  }));

  // GET /home/community - 포럼 최근글 + featured 콘텐츠 (APP-FORUM Phase 1: ForumQueryService)
  homeRouter.get('/community', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const postLimit = parseInt(req.query.postLimit as string) || 5;
    const featuredLimit = parseInt(req.query.featuredLimit as string) || 3;

    const posts = await forumService.listRecentPosts(postLimit);
    const featured = await contentService.listFeatured(['notice', 'news'], featuredLimit);

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
  // WO-O4O-KPA-CODE-CLEANUP-V1: unified to 'kpa-society'
  const KPA_SERVICE_KEY = 'kpa-society';
  const KPA_SERVICE_KEYS = ['kpa-society', 'kpa']; // backward compat for reads
  const ALLOWED_TYPES = ['notice', 'news', 'event'];

  // WO-KPA-A-OPERATOR-AUDIT-LOG-PHASE1-V1: helper
  async function writeAuditLog(
    user: any,
    actionType: string,
    targetType: 'member' | 'application' | 'content' | 'kpa_content',
    targetId: string,
    metadata: Record<string, unknown> = {},
  ) {
    try {
      const log = auditRepo.create({
        operator_id: user?.id,
        operator_role: (user?.roles || []).find((r: string) => r.startsWith('kpa:')) || 'unknown',
        action_type: actionType as any,
        target_type: targetType as any,
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
    const search = req.query.search as string | undefined;
    const picked = req.query.picked as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const qb = contentRepo.createQueryBuilder('c')
      .where('c.serviceKey IN (:...sks)', { sks: KPA_SERVICE_KEYS });

    if (type && ALLOWED_TYPES.includes(type)) {
      qb.andWhere('c.type = :type', { type });
    } else {
      qb.andWhere('c.type IN (:...types)', { types: ALLOWED_TYPES });
    }
    if (status && ['draft', 'published', 'archived'].includes(status)) {
      qb.andWhere('c.status = :status', { status });
    }
    if (search && search.trim()) {
      qb.andWhere('c.title ILIKE :search', { search: `%${search.trim()}%` });
    }
    if (picked === 'true') {
      qb.andWhere('c.isOperatorPicked = true');
    }

    qb.orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    res.json({ success: true, data, total, page, limit, totalPages: Math.ceil(total / limit) });
  }));

  // POST /news — 새 콘텐츠 생성
  newsRouter.post('/', authenticate, requireKpaScope('kpa:operator'), asyncHandler(async (req: Request, res: Response) => {
    const { title, content, type, status: reqStatus, summary, isOperatorPicked } = req.body;
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
      isOperatorPicked: isOperatorPicked === true,
    });

    const saved = await contentRepo.save(entity);
    await writeAuditLog((req as any).user, 'CONTENT_CREATED', 'content', saved.id, { type, title, status: validStatus });
    res.status(201).json({ success: true, data: saved });
  }));

  // PUT /news/:id — 콘텐츠 수정
  newsRouter.put('/:id', authenticate, requireKpaScope('kpa:operator'), asyncHandler(async (req: Request, res: Response) => {
    const existing = await contentRepo.createQueryBuilder('c')
      .where('c.id = :id', { id: req.params.id })
      .andWhere('c.serviceKey IN (:...sks)', { sks: KPA_SERVICE_KEYS })
      .getOne();
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } });
      return;
    }

    const { title, content, type, status: reqStatus, summary, isOperatorPicked } = req.body;
    if (title !== undefined) existing.title = title;
    if (summary !== undefined) existing.summary = summary;
    if (content !== undefined) existing.body = content;
    if (type !== undefined && ALLOWED_TYPES.includes(type)) existing.type = type;
    if (isOperatorPicked !== undefined) existing.isOperatorPicked = isOperatorPicked === true;
    if (req.body.isPinned !== undefined) existing.isPinned = req.body.isPinned === true;
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

  // DELETE /news/:id/hard — Hard delete (physical removal, archived items only, operator only)
  newsRouter.delete('/:id/hard', authenticate, requireKpaScope('kpa:operator'), asyncHandler(async (req: Request, res: Response) => {
    const existing = await contentRepo.createQueryBuilder('c')
      .where('c.id = :id', { id: req.params.id })
      .andWhere('c.serviceKey IN (:...sks)', { sks: KPA_SERVICE_KEYS })
      .getOne();
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } });
      return;
    }
    if (existing.status !== 'archived') {
      res.status(400).json({ success: false, error: { code: 'NOT_ARCHIVED', message: '보관 상태의 콘텐츠만 완전 삭제할 수 있습니다.' } });
      return;
    }
    const title = existing.title;
    await contentRepo.delete({ id: existing.id });
    await writeAuditLog((req as any).user, 'CONTENT_HARD_DELETED', 'content', existing.id, { title });
    res.json({ success: true, data: { deleted: true, id: existing.id } });
  }));

  // DELETE /news/:id — Soft delete (status → archived)
  newsRouter.delete('/:id', authenticate, requireKpaScope('kpa:operator'), asyncHandler(async (req: Request, res: Response) => {
    const existing = await contentRepo.createQueryBuilder('c')
      .where('c.id = :id', { id: req.params.id })
      .andWhere('c.serviceKey IN (:...sks)', { sks: KPA_SERVICE_KEYS })
      .getOne();
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } });
      return;
    }

    existing.status = 'archived';
    const updated = await contentRepo.save(existing);
    await writeAuditLog((req as any).user, 'CONTENT_DELETED', 'content', updated.id, { title: updated.title });
    res.json({ success: true, data: updated });
  }));

  // ─── V3 Batch Endpoints — WO-O4O-TABLE-STANDARD-V3-EXPANSION ───

  /** POST /news/batch-publish — 일괄 발행 (draft → published) */
  newsRouter.post('/batch-publish', authenticate, requireKpaScope('kpa:operator'), asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'ids array is required' });
      return;
    }
    if (ids.length > 50) {
      res.status(400).json({ success: false, error: 'Maximum 50 items per batch' });
      return;
    }

    const results: Array<{ id: string; status: 'success' | 'skipped' | 'failed'; error?: string }> = [];
    for (const id of ids) {
      try {
        const item = await contentRepo.createQueryBuilder('c')
          .where('c.id = :id', { id })
          .andWhere('c.serviceKey IN (:...sks)', { sks: KPA_SERVICE_KEYS })
          .getOne();
        if (!item) { results.push({ id, status: 'failed', error: 'Not found' }); continue; }
        if (item.status !== 'draft') { results.push({ id, status: 'skipped', error: 'Not in draft status' }); continue; }
        item.status = 'published';
        item.publishedAt = new Date();
        await contentRepo.save(item);
        await writeAuditLog((req as any).user, 'CONTENT_BATCH_PUBLISHED', 'content', id, { title: item.title });
        results.push({ id, status: 'success' });
      } catch (err: any) {
        results.push({ id, status: 'failed', error: err.message || 'Unknown error' });
      }
    }
    res.json({ success: true, data: { results } });
  }));

  /** POST /news/batch-archive — 일괄 보관 (any → archived) */
  newsRouter.post('/batch-archive', authenticate, requireKpaScope('kpa:operator'), asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'ids array is required' });
      return;
    }
    if (ids.length > 50) {
      res.status(400).json({ success: false, error: 'Maximum 50 items per batch' });
      return;
    }

    const results: Array<{ id: string; status: 'success' | 'skipped' | 'failed'; error?: string }> = [];
    for (const id of ids) {
      try {
        const item = await contentRepo.createQueryBuilder('c')
          .where('c.id = :id', { id })
          .andWhere('c.serviceKey IN (:...sks)', { sks: KPA_SERVICE_KEYS })
          .getOne();
        if (!item) { results.push({ id, status: 'failed', error: 'Not found' }); continue; }
        if (item.status === 'archived') { results.push({ id, status: 'skipped', error: 'Already archived' }); continue; }
        item.status = 'archived';
        await contentRepo.save(item);
        await writeAuditLog((req as any).user, 'CONTENT_BATCH_ARCHIVED', 'content', id, { title: item.title });
        results.push({ id, status: 'success' });
      } catch (err: any) {
        results.push({ id, status: 'failed', error: err.message || 'Unknown error' });
      }
    }
    res.json({ success: true, data: { results } });
  }));

  /** POST /news/batch-hard-delete — 일괄 완전 삭제 (archived only) */
  newsRouter.post('/batch-hard-delete', authenticate, requireKpaScope('kpa:operator'), asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'ids array is required' });
      return;
    }
    if (ids.length > 50) {
      res.status(400).json({ success: false, error: 'Maximum 50 items per batch' });
      return;
    }

    const results: Array<{ id: string; status: 'success' | 'skipped' | 'failed'; error?: string }> = [];
    for (const id of ids) {
      try {
        const item = await contentRepo.createQueryBuilder('c')
          .where('c.id = :id', { id })
          .andWhere('c.serviceKey IN (:...sks)', { sks: KPA_SERVICE_KEYS })
          .getOne();
        if (!item) { results.push({ id, status: 'failed', error: 'Not found' }); continue; }
        if (item.status !== 'archived') { results.push({ id, status: 'skipped', error: 'Only archived items can be hard deleted' }); continue; }
        const title = item.title;
        await contentRepo.delete({ id });
        await writeAuditLog((req as any).user, 'CONTENT_BATCH_HARD_DELETED', 'content', id, { title });
        results.push({ id, status: 'success' });
      } catch (err: any) {
        results.push({ id, status: 'failed', error: err.message || 'Unknown error' });
      }
    }
    res.json({ success: true, data: { results } });
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
  // CONTENT HUB ROUTES — WO-O4O-KPA-CONTENT-HUB-FOUNDATION-V1
  // Block 기반 콘텐츠 정리 허브 (기존 자료실 대체)
  // ============================================================================
  {
    // WO-O4O-KPA-CONTENT-HUB-FOUNDATION-V1: Raw SQL (no dynamic import needed)
    const contentRouter = Router();

    // GET /contents — 목록 (optionalAuth: 공개 접근)
    contentRouter.get('/', optionalAuth as any, asyncHandler(async (req: Request, res: Response) => {
      const { page = '1', limit = '20', category, search, status: statusFilter, tag } = req.query;
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const offset = (pageNum - 1) * limitNum;

      const conditions: string[] = [`c.is_deleted = false`];
      const params: any[] = [];
      let idx = 1;

      if (category) { conditions.push(`c.category = $${idx++}`); params.push(category); }
      if (statusFilter) { conditions.push(`c.status = $${idx++}`); params.push(statusFilter); }
      if (search) {
        conditions.push(`(c.title ILIKE $${idx} OR c.summary ILIKE $${idx})`);
        params.push(`%${search}%`); idx++;
      }
      if (tag) {
        conditions.push(`c.tags @> $${idx++}::jsonb`);
        params.push(JSON.stringify([tag]));
      }

      const where = `WHERE ${conditions.join(' AND ')}`;
      const [[{ total }], rows] = await Promise.all([
        dataSource.query(`SELECT COUNT(*)::int as total FROM kpa_contents c ${where}`, params),
        dataSource.query(
          `SELECT c.id, c.title, c.summary, c.category, c.tags, c.status,
                  c.source_type, c.thumbnail_url, c.created_by, c.created_at, c.updated_at
           FROM kpa_contents c ${where}
           ORDER BY c.created_at DESC
           LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, limitNum, offset]
        ),
      ]);

      res.json({
        success: true,
        data: {
          items: rows,
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    }));

    // POST /contents — 등록 (operator)
    contentRouter.post('/', authenticate, requireKpaScope('kpa:operator') as any, asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).user?.id;
      const { title, summary, blocks, tags, category, thumbnail_url, source_type, source_url, source_file_name, status: reqStatus } = req.body;

      if (!title?.trim()) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title은 필수입니다' } });
        return;
      }

      const [saved] = await dataSource.query(
        `INSERT INTO kpa_contents (title, summary, blocks, tags, category, thumbnail_url, source_type, source_url, source_file_name, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          title.trim(),
          summary || null,
          JSON.stringify(Array.isArray(blocks) ? blocks : []),
          JSON.stringify(Array.isArray(tags) ? tags : []),
          category || null,
          thumbnail_url || null,
          source_type || 'manual',
          source_url || null,
          source_file_name || null,
          reqStatus === 'ready' ? 'ready' : 'draft',
          userId,
        ]
      );
      await writeAuditLog((req as any).user, 'CONTENT_CREATED', 'kpa_content', saved.id, { title: saved.title });
      res.status(201).json({ success: true, data: saved });
    }));

    // GET /contents/:id — 상세
    contentRouter.get('/:id', optionalAuth as any, asyncHandler(async (req: Request, res: Response) => {
      const [content] = await dataSource.query(
        `SELECT * FROM kpa_contents WHERE id = $1 AND is_deleted = false LIMIT 1`,
        [req.params.id]
      );
      if (!content) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '콘텐츠를 찾을 수 없습니다' } });
        return;
      }
      res.json({ success: true, data: content });
    }));

    // PATCH /contents/:id — 수정 (operator)
    contentRouter.patch('/:id', authenticate, requireKpaScope('kpa:operator') as any, asyncHandler(async (req: Request, res: Response) => {
      const [existing] = await dataSource.query(
        `SELECT * FROM kpa_contents WHERE id = $1 AND is_deleted = false LIMIT 1`,
        [req.params.id]
      );
      if (!existing) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '콘텐츠를 찾을 수 없습니다' } });
        return;
      }

      const { title, summary, blocks, tags, category, thumbnail_url, source_type, source_url, source_file_name, status: reqStatus } = req.body;

      const sets: string[] = [`updated_at = NOW()`];
      const params: any[] = [];
      let idx = 1;

      if (title !== undefined) { sets.push(`title = $${idx++}`); params.push(title.trim()); }
      if (summary !== undefined) { sets.push(`summary = $${idx++}`); params.push(summary || null); }
      if (blocks !== undefined) { sets.push(`blocks = $${idx++}`); params.push(JSON.stringify(Array.isArray(blocks) ? blocks : existing.blocks)); }
      if (tags !== undefined) { sets.push(`tags = $${idx++}`); params.push(JSON.stringify(Array.isArray(tags) ? tags : existing.tags)); }
      if (category !== undefined) { sets.push(`category = $${idx++}`); params.push(category || null); }
      if (thumbnail_url !== undefined) { sets.push(`thumbnail_url = $${idx++}`); params.push(thumbnail_url || null); }
      if (source_type !== undefined) { sets.push(`source_type = $${idx++}`); params.push(source_type); }
      if (source_url !== undefined) { sets.push(`source_url = $${idx++}`); params.push(source_url || null); }
      if (source_file_name !== undefined) { sets.push(`source_file_name = $${idx++}`); params.push(source_file_name || null); }
      if (reqStatus !== undefined) { sets.push(`status = $${idx++}`); params.push(reqStatus === 'ready' ? 'ready' : 'draft'); }

      params.push(existing.id);
      const [updated] = await dataSource.query(
        `UPDATE kpa_contents SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );
      await writeAuditLog((req as any).user, 'CONTENT_UPDATED', 'kpa_content', updated.id, { title: updated.title });
      res.json({ success: true, data: updated });
    }));

    // DELETE /contents/:id — soft delete (operator)
    contentRouter.delete('/:id', authenticate, requireKpaScope('kpa:operator') as any, asyncHandler(async (req: Request, res: Response) => {
      const [existing] = await dataSource.query(
        `SELECT id, title FROM kpa_contents WHERE id = $1 AND is_deleted = false LIMIT 1`,
        [req.params.id]
      );
      if (!existing) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '콘텐츠를 찾을 수 없습니다' } });
        return;
      }
      await dataSource.query(`UPDATE kpa_contents SET is_deleted = true, updated_at = NOW() WHERE id = $1`, [existing.id]);
      await writeAuditLog((req as any).user, 'CONTENT_DELETED', 'kpa_content', existing.id, { title: existing.title });
      res.json({ success: true, data: { deleted: true, id: existing.id } });
    }));

    // ── AI endpoints (WO-O4O-STORE-CONTENT-USAGE-RECOMPOSE-V1: stubs → execute()) ──

    // POST /contents/:id/ai/summarize
    contentRouter.post('/:id/ai/summarize', authenticate, requireKpaScope('kpa:operator') as any, asyncHandler(async (req: Request, res: Response) => {
      const [content] = await dataSource.query(
        `SELECT * FROM kpa_contents WHERE id = $1 AND is_deleted = false LIMIT 1`,
        [req.params.id]
      );
      if (!content) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '콘텐츠를 찾을 수 없습니다' } });
        return;
      }
      try {
        const result = await execute({
          systemPrompt: SUMMARIZE_SYSTEM_PROMPT,
          userPrompt: buildSummarizeUserPrompt(content.title, content.blocks),
          config: buildConfigResolver(dataSource, 'store'),
          meta: { service: 'kpa', callerName: 'KpaContentSummarize' },
        });
        const parsed = JSON.parse(result.content);
        const summary = parsed.summary || content.title;
        await dataSource.query(`UPDATE kpa_contents SET summary = $1, updated_at = NOW() WHERE id = $2`, [summary, content.id]);
        res.json({ success: true, data: { summary } });
      } catch (e: any) {
        console.error('[KPA AI Summarize] Failed:', e.message);
        // Fallback to simple extraction
        const textContent = (content.blocks as any[])
          .filter((b: any) => b.type === 'text' && b.content)
          .map((b: any) => b.content)
          .join(' ')
          .slice(0, 200);
        const summary = textContent || content.title;
        await dataSource.query(`UPDATE kpa_contents SET summary = $1, updated_at = NOW() WHERE id = $2`, [summary, content.id]);
        res.json({ success: true, data: { summary } });
      }
    }));

    // POST /contents/:id/ai/extract
    contentRouter.post('/:id/ai/extract', authenticate, requireKpaScope('kpa:operator') as any, asyncHandler(async (req: Request, res: Response) => {
      const [content] = await dataSource.query(
        `SELECT * FROM kpa_contents WHERE id = $1 AND is_deleted = false LIMIT 1`,
        [req.params.id]
      );
      if (!content) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '콘텐츠를 찾을 수 없습니다' } });
        return;
      }
      try {
        const result = await execute({
          systemPrompt: EXTRACT_SYSTEM_PROMPT,
          userPrompt: buildExtractUserPrompt(content.title, content.blocks),
          config: buildConfigResolver(dataSource, 'store'),
          meta: { service: 'kpa', callerName: 'KpaContentExtract' },
        });
        const parsed = JSON.parse(result.content);
        const keyPoints = Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 5) : [];
        res.json({ success: true, data: { keyPoints } });
      } catch (e: any) {
        console.error('[KPA AI Extract] Failed:', e.message);
        // Fallback to list items
        const keyPoints = (content.blocks as any[])
          .filter((b: any) => b.type === 'list' && Array.isArray(b.items))
          .flatMap((b: any) => b.items)
          .slice(0, 5);
        res.json({ success: true, data: { keyPoints } });
      }
    }));

    // POST /contents/:id/ai/tag
    contentRouter.post('/:id/ai/tag', authenticate, requireKpaScope('kpa:operator') as any, asyncHandler(async (req: Request, res: Response) => {
      const [content] = await dataSource.query(
        `SELECT * FROM kpa_contents WHERE id = $1 AND is_deleted = false LIMIT 1`,
        [req.params.id]
      );
      if (!content) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '콘텐츠를 찾을 수 없습니다' } });
        return;
      }
      try {
        const result = await execute({
          systemPrompt: TAG_SYSTEM_PROMPT,
          userPrompt: buildTagUserPrompt(content.title, content.blocks, content.category),
          config: buildConfigResolver(dataSource, 'store'),
          meta: { service: 'kpa', callerName: 'KpaContentTag' },
        });
        const parsed = JSON.parse(result.content);
        const suggestedTags = Array.isArray(parsed.suggestedTags)
          ? [...new Set(parsed.suggestedTags)].slice(0, 8)
          : [];
        res.json({ success: true, data: { suggestedTags } });
      } catch (e: any) {
        console.error('[KPA AI Tag] Failed:', e.message);
        // Fallback to category + existing tags
        const existingTags: string[] = Array.isArray(content.tags) ? content.tags : [];
        const suggestedTags = content.category ? [content.category, ...existingTags] : existingTags;
        res.json({ success: true, data: { suggestedTags: [...new Set(suggestedTags)].slice(0, 8) } });
      }
    }));

    // ── Copy to Store ──────────────────────────────────────────────────────

    // POST /contents/:id/copy-to-store
    contentRouter.post('/:id/copy-to-store', authenticate, asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).user?.id;
      const [content] = await dataSource.query(
        `SELECT * FROM kpa_contents WHERE id = $1 AND is_deleted = false LIMIT 1`,
        [req.params.id]
      );
      if (!content) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '콘텐츠를 찾을 수 없습니다' } });
        return;
      }
      // 완전 독립 복사 — 원본과 분리, sync 없음
      const [saved] = await dataSource.query(
        `INSERT INTO kpa_working_contents (source_content_id, owner_id, title, edited_blocks, tags, category)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          content.id,
          userId,
          content.title,
          JSON.stringify(content.blocks),
          JSON.stringify(Array.isArray(content.tags) ? content.tags : []),
          content.category,
        ]
      );
      res.status(201).json({ success: true, data: saved });
    }));

    router.use('/contents', contentRouter);
  }

  // Groupbuy Routes (WO-O4O-ROUTES-REFACTOR-V1)
  router.use('/groupbuy', createGroupbuyController(dataSource, authenticate as any, optionalAuth as any, requireKpaScope));

  // MyPage Routes (WO-O4O-ROUTES-REFACTOR-V1)
  router.use('/mypage', createMypageController(dataSource, authenticate as any));

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

  // ============================================================================
  // Checkout Routes — WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1
  // POST /api/v1/kpa/checkout — 주문 생성
  // GET  /api/v1/kpa/checkout/orders — 내 주문 목록
  // GET  /api/v1/kpa/checkout/orders/:orderId — 주문 상세
  // ============================================================================
  const kpaCheckoutController = createKpaCheckoutController(dataSource, coreRequireAuth as any);
  router.use('/checkout', kpaCheckoutController);

  // ============================================================================
  // Payment Routes — WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1
  // POST /api/v1/kpa/payments/prepare — 결제 준비
  // POST /api/v1/kpa/payments/confirm — 결제 확인
  // GET  /api/v1/kpa/payments/order/:orderId — 결제 정보
  // ============================================================================
  const kpaPaymentController = createKpaPaymentController(dataSource, coreRequireAuth as any);
  router.use('/payments', kpaPaymentController);

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

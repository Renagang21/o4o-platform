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
import { createStorePlaylistController } from './controllers/store-playlist.controller.js';
import { createStoreChannelProductsController } from './controllers/store-channel-products.controller.js';
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
// WO-KPA-B-LMS-GUARD-BYPASS-AUDIT-AND-IMPLEMENTATION-V1
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import { CourseService } from '../../modules/lms/services/CourseService.js';

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

  // ──────────────────────────────────────────────────────────────────────
  // WO-KPA-B-BRANCH-ADMIN-MEMBER-WORKFLOW-V1
  // Branch member approval workflow — pending list / approve / reject
  // branch:admin 전용: 분회 소속 관리자 또는 kpa:admin bypass
  // ──────────────────────────────────────────────────────────────────────
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /** Branch admin 권한 검증 helper */
  async function verifyBranchAdmin(
    ds: DataSource,
    userId: string,
    branchId: string,
    userRoles: string[],
  ): Promise<boolean> {
    // kpa:admin / kpa:district_admin → bypass
    if (userRoles.some(r => r === 'kpa:admin' || r === 'kpa:district_admin')) return true;
    // 분회 소속 admin 확인
    const [member] = await ds.query(
      `SELECT id FROM kpa_members WHERE user_id = $1 AND organization_id = $2 AND status = 'active' AND role = 'admin' LIMIT 1`,
      [userId, branchId],
    );
    return !!member;
  }

  // 1) GET /branches/:branchId/pending-members [WO-PLATFORM-APPROVAL-ENGINE-UNIFICATION-V1: dual-query]
  router.get(
    '/branches/:branchId/pending-members',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId } = req.params;
      const user = (req as any).user;
      if (!UUID_RE.test(branchId)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid branch ID' } });
        return;
      }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } });
        return;
      }

      // Dual-query: unified + legacy — 동일 alias 형태로 반환 (frontend 호환)
      const [newRows, legacyRows] = await Promise.all([
        dataSource.query(`
          SELECT
            ar.id           AS "requestId",
            ar.requester_id AS "userId",
            u.name,
            u.email         AS "contactEmail",
            ar.payload->>'requested_role' AS "requestedRole",
            ar.payload->>'request_type'   AS "requestType",
            ar.created_at   AS "requestedAt",
            m.activity_type AS "activityType"
          FROM kpa_approval_requests ar
          JOIN users u ON u.id = ar.requester_id
          LEFT JOIN kpa_members m ON m.user_id = ar.requester_id AND m.organization_id = ar.organization_id
          WHERE ar.entity_type = 'membership' AND ar.organization_id = $1 AND ar.status = 'pending'
          ORDER BY ar.created_at ASC
        `, [branchId]),
        dataSource.query(`
          SELECT
            r.id            AS "requestId",
            r.user_id       AS "userId",
            u.name,
            u.email         AS "contactEmail",
            r.requested_role AS "requestedRole",
            r.request_type  AS "requestType",
            r.created_at    AS "requestedAt",
            m.activity_type AS "activityType"
          FROM kpa_organization_join_requests r
          JOIN users u ON u.id = r.user_id
          LEFT JOIN kpa_members m ON m.user_id = r.user_id AND m.organization_id = r.organization_id
          WHERE r.organization_id = $1
            AND r.status = 'pending'
          ORDER BY r.created_at ASC
        `, [branchId]),
      ]);

      res.json({ success: true, data: [...newRows, ...legacyRows] });
    }),
  );

  // 2) PATCH /branches/:branchId/pending-members/:requestId/approve [dual-table lookup]
  router.patch(
    '/branches/:branchId/pending-members/:requestId/approve',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId, requestId } = req.params;
      const user = (req as any).user;
      if (!UUID_RE.test(branchId) || !UUID_RE.test(requestId)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } });
        return;
      }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } });
        return;
      }

      // Helper: approve logic (shared between unified and legacy)
      async function approveMember(qr: any, userId: string, requestedRole: string) {
        const [existingMember] = await qr.query(
          `SELECT id FROM organization_members WHERE "organizationId" = $1 AND "userId" = $2 AND "leftAt" IS NULL`,
          [branchId, userId],
        );
        if (!existingMember) {
          await qr.query(
            `INSERT INTO organization_members (id, "organizationId", "userId", role, "isPrimary", "joinedAt", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, false, NOW(), NOW(), NOW())`,
            [branchId, userId, requestedRole || 'member'],
          );
        }
        await qr.query(
          `UPDATE users SET status = 'active', "isActive" = true, "approvedAt" = NOW(), "approvedBy" = $2
           WHERE id = $1 AND status != 'active'`,
          [userId, user.id],
        );
      }

      // Try unified table first
      const [arRow] = await dataSource.query(
        `SELECT id, requester_id, payload FROM kpa_approval_requests WHERE id = $1 AND organization_id = $2 AND entity_type = 'membership' AND status = 'pending' LIMIT 1`,
        [requestId, branchId],
      );
      if (arRow) {
        const payload = typeof arRow.payload === 'string' ? JSON.parse(arRow.payload) : arRow.payload;
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
          await queryRunner.query(
            `UPDATE kpa_approval_requests SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW() WHERE id = $2`,
            [user.id, requestId],
          );
          await approveMember(queryRunner, arRow.requester_id, payload?.requested_role);
          // Store result
          const [newMember] = await queryRunner.query(
            `SELECT id FROM organization_members WHERE "organizationId" = $1 AND "userId" = $2 AND "leftAt" IS NULL LIMIT 1`,
            [branchId, arRow.requester_id],
          );
          if (newMember) {
            await queryRunner.query(
              `UPDATE kpa_approval_requests SET result_entity_id = $1, updated_at = NOW() WHERE id = $2`,
              [newMember.id, requestId],
            );
          }
          await queryRunner.commitTransaction();
          res.json({ success: true, data: { requestId, status: 'approved' } });
        } catch (err) { await queryRunner.rollbackTransaction(); throw err; } finally { await queryRunner.release(); }
        return;
      }

      // Fallback: legacy table
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const [request] = await queryRunner.query(
          `SELECT id, user_id, organization_id, requested_role, request_type, status
           FROM kpa_organization_join_requests
           WHERE id = $1 AND organization_id = $2 AND status = 'pending'`,
          [requestId, branchId],
        );
        if (!request) {
          await queryRunner.rollbackTransaction();
          res.status(409).json({ success: false, error: { code: 'NOT_PENDING', message: 'Request not found or already processed' } });
          return;
        }
        await queryRunner.query(
          `UPDATE kpa_organization_join_requests SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW() WHERE id = $2`,
          [user.id, requestId],
        );
        await approveMember(queryRunner, request.user_id, request.requested_role);
        await queryRunner.commitTransaction();
        res.json({ success: true, data: { requestId, status: 'approved' } });
      } catch (err) { await queryRunner.rollbackTransaction(); throw err; } finally { await queryRunner.release(); }
    }),
  );

  // 3) PATCH /branches/:branchId/pending-members/:requestId/reject [dual-table lookup]
  router.patch(
    '/branches/:branchId/pending-members/:requestId/reject',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId, requestId } = req.params;
      const user = (req as any).user;
      if (!UUID_RE.test(branchId) || !UUID_RE.test(requestId)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } });
        return;
      }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } });
        return;
      }

      // Try unified table first
      const [arRow] = await dataSource.query(
        `SELECT id FROM kpa_approval_requests WHERE id = $1 AND organization_id = $2 AND entity_type = 'membership' AND status = 'pending' LIMIT 1`,
        [requestId, branchId],
      );
      if (arRow) {
        await dataSource.query(
          `UPDATE kpa_approval_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW() WHERE id = $2`,
          [user.id, requestId],
        );
        res.json({ success: true, data: { requestId, status: 'rejected' } });
        return;
      }

      // Fallback: legacy table
      const [request] = await dataSource.query(
        `SELECT id FROM kpa_organization_join_requests WHERE id = $1 AND organization_id = $2 AND status = 'pending'`,
        [requestId, branchId],
      );
      if (!request) {
        res.status(409).json({ success: false, error: { code: 'NOT_PENDING', message: 'Request not found or already processed' } });
        return;
      }
      await dataSource.query(
        `UPDATE kpa_organization_join_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW() WHERE id = $2`,
        [user.id, requestId],
      );
      res.json({ success: true, data: { requestId, status: 'rejected' } });
    }),
  );

  // Branch Public routes — read-only endpoints for /branch-services/:branchId pages
  router.use('/branches', createBranchPublicController(dataSource));

  // ──────────────────────────────────────────────────────────────────────
  // WO-KPA-B-ORG-HIERARCHY-VISUALIZATION-V1
  // District hierarchy — 산하 분회 요약 (district:admin 전용)
  // N+1 free: 단일 SQL로 분회 + 회원수 + 대기수 + 최근활동수 조회
  // ──────────────────────────────────────────────────────────────────────
  router.get(
    '/district/:districtId/branches-summary',
    coreRequireAuth as any,
    requireKpaScope('kpa:admin'),
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { districtId } = req.params;

      // UUID 검증
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_RE.test(districtId)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid district ID' } });
        return;
      }

      // 지부(district) 존재 확인
      const orgRepo = dataSource.getRepository(OrganizationStore);
      const district = await orgRepo.findOne({ where: { id: districtId, isActive: true } });
      if (!district) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'District not found' } });
        return;
      }

      // N+1 free 단일 쿼리: 산하 분회 + 회원/대기/최근활동 집계
      const branches: Array<{
        id: string;
        name: string;
        type: string;
        memberCount: string;
        pendingCount: string;
        recentActivityCount: string;
      }> = await dataSource.query(`
        SELECT
          o.id,
          o.name,
          o.type,
          COALESCE(ms.active_count, 0) AS "memberCount",
          COALESCE(ms.pending_count, 0) AS "pendingCount",
          COALESCE(ns.recent_count, 0) AS "recentActivityCount"
        FROM organizations o
        LEFT JOIN (
          SELECT organization_id,
            COUNT(*) FILTER (WHERE status = 'active') AS active_count,
            COUNT(*) FILTER (WHERE status = 'pending') AS pending_count
          FROM kpa_members
          GROUP BY organization_id
        ) ms ON ms.organization_id = o.id
        LEFT JOIN (
          SELECT organization_id,
            COUNT(*) AS recent_count
          FROM kpa_branch_news
          WHERE is_deleted = false AND created_at > NOW() - INTERVAL '30 days'
          GROUP BY organization_id
        ) ns ON ns.organization_id = o.id
        WHERE o."parentId" = $1
          AND o."isActive" = true
        ORDER BY o.name ASC
      `, [districtId]);

      res.json({
        success: true,
        data: {
          districtId: district.id,
          districtName: district.name,
          branches: branches.map(b => ({
            id: b.id,
            name: b.name,
            type: b.type,
            memberCount: Number(b.memberCount),
            pendingCount: Number(b.pendingCount),
            recentActivityCount: Number(b.recentActivityCount),
          })),
          totalBranches: branches.length,
        },
      });
    }),
  );

  // ──────────────────────────────────────────────────────────────────────
  // WO-KPA-B-DISTRICT-OVERVIEW-KPI-V1
  // District overview — 지부 통합 관제 KPI (district:admin 전용)
  // N+1 free: 단일 SQL로 산하 분회 집계 totals 조회
  // ──────────────────────────────────────────────────────────────────────
  router.get(
    '/district/:districtId/overview-summary',
    coreRequireAuth as any,
    requireKpaScope('kpa:admin'),
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { districtId } = req.params;

      // UUID 검증
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_RE.test(districtId)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid district ID' } });
        return;
      }

      // 지부(district) 존재 확인
      const orgRepo = dataSource.getRepository(OrganizationStore);
      const district = await orgRepo.findOne({ where: { id: districtId, isActive: true } });
      if (!district) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'District not found' } });
        return;
      }

      // N+1 free 단일 쿼리: 산하 분회 집계 totals
      const [totals] = await dataSource.query(`
        SELECT
          COUNT(DISTINCT o.id) AS "totalBranches",
          COALESCE(SUM(ms.active_count), 0) AS "totalMembers",
          COALESCE(SUM(ms.pending_count), 0) AS "totalPending",
          COALESCE(SUM(ns.recent_count), 0) AS "totalRecentActivity"
        FROM organizations o
        LEFT JOIN (
          SELECT organization_id,
            COUNT(*) FILTER (WHERE status = 'active') AS active_count,
            COUNT(*) FILTER (WHERE status = 'pending') AS pending_count
          FROM kpa_members
          GROUP BY organization_id
        ) ms ON ms.organization_id = o.id
        LEFT JOIN (
          SELECT organization_id,
            COUNT(*) AS recent_count
          FROM kpa_branch_news
          WHERE is_deleted = false AND created_at > NOW() - INTERVAL '30 days'
          GROUP BY organization_id
        ) ns ON ns.organization_id = o.id
        WHERE o."parentId" = $1
          AND o."isActive" = true
      `, [districtId]);

      res.json({
        success: true,
        data: {
          district: {
            id: district.id,
            name: district.name,
          },
          totals: {
            totalBranches: Number(totals?.totalBranches || 0),
            totalMembers: Number(totals?.totalMembers || 0),
            totalPending: Number(totals?.totalPending || 0),
            totalRecentActivity: Number(totals?.totalRecentActivity || 0),
          },
        },
      });
    }),
  );

  // ──────────────────────────────────────────────────────────────────────
  // WO-KPA-B-LMS-GUARD-BYPASS-AUDIT-AND-IMPLEMENTATION-V1
  // Stage 1: 강사 자격 (Instructor Qualification) API
  // Stage 2: 강좌 생성 요청 (Course Request) API
  // ──────────────────────────────────────────────────────────────────────

  /** 강사 자격 — active KPA 회원 확인 helper */
  async function verifyActiveMember(
    ds: DataSource,
    userId: string,
    organizationId: string,
  ): Promise<{ memberId: string } | null> {
    const [member] = await ds.query(
      `SELECT id FROM kpa_members WHERE user_id = $1 AND organization_id = $2 AND status = 'active' LIMIT 1`,
      [userId, organizationId],
    );
    return member ? { memberId: member.id } : null;
  }

  /** 강사 자격 — approved qualification 확인 helper (dual-query: legacy + unified) */
  async function verifyQualifiedInstructor(
    ds: DataSource,
    userId: string,
    organizationId: string,
    userRoles: string[],
  ): Promise<{ qualificationId: string } | null> {
    if (userRoles.some(r => r === 'kpa:admin')) return { qualificationId: 'admin-bypass' };
    // 1. Check unified table first
    const [qNew] = await ds.query(
      `SELECT id FROM kpa_approval_requests WHERE requester_id = $1 AND organization_id = $2 AND entity_type = 'instructor_qualification' AND status = 'approved' LIMIT 1`,
      [userId, organizationId],
    );
    if (qNew) return { qualificationId: qNew.id };
    // 2. Fallback to legacy table (transition period)
    const [qLegacy] = await ds.query(
      `SELECT id FROM kpa_instructor_qualifications WHERE user_id = $1 AND organization_id = $2 AND status = 'approved' LIMIT 1`,
      [userId, organizationId],
    );
    return qLegacy ? { qualificationId: qLegacy.id } : null;
  }

  // ── Stage 1: Instructor Qualification (WO-PLATFORM-APPROVAL-ENGINE-UNIFICATION-V1: → kpa_approval_requests) ──

  // Q1: POST /instructor-qualifications — 강사 자격 신청
  router.post(
    '/instructor-qualifications',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { organizationId, qualificationType, licenseNumber, specialtyArea, teachingExperienceYears, supportingDocuments, applicantNote } = req.body;

      if (!organizationId || !UUID_RE.test(organizationId)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ORG', message: 'Valid organizationId required' } });
        return;
      }
      if (!qualificationType || !['pharmacist_instructor', 'student_instructor'].includes(qualificationType)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: 'qualificationType must be pharmacist_instructor or student_instructor' } });
        return;
      }

      // 활성 회원 확인
      const memberCheck = await verifyActiveMember(dataSource, user.id, organizationId);
      if (!memberCheck) {
        res.status(403).json({ success: false, error: { code: 'NOT_ACTIVE_MEMBER', message: '해당 분회의 활성 회원만 강사 자격을 신청할 수 있습니다' } });
        return;
      }

      // 중복 확인 — dual-query (legacy + unified)
      const [existingNew] = await dataSource.query(
        `SELECT id, status FROM kpa_approval_requests WHERE requester_id = $1 AND organization_id = $2 AND entity_type = 'instructor_qualification' AND status IN ('pending', 'approved') LIMIT 1`,
        [user.id, organizationId],
      );
      if (existingNew) {
        const msg = existingNew.status === 'pending' ? '이미 대기 중인 신청이 있습니다' : '이미 승인된 자격이 있습니다';
        res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: msg } });
        return;
      }
      const [existingLegacy] = await dataSource.query(
        `SELECT id, status FROM kpa_instructor_qualifications WHERE user_id = $1 AND organization_id = $2 AND status IN ('pending', 'approved') LIMIT 1`,
        [user.id, organizationId],
      );
      if (existingLegacy) {
        const msg = existingLegacy.status === 'pending' ? '이미 대기 중인 신청이 있습니다' : '이미 승인된 자격이 있습니다';
        res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: msg } });
        return;
      }

      const [inserted] = await dataSource.query(
        `INSERT INTO kpa_approval_requests
          (id, entity_type, organization_id, payload, status, requester_id, requester_name, requester_email, submitted_at, created_at, updated_at)
         VALUES (gen_random_uuid(), 'instructor_qualification', $1, $2, 'pending', $3, $4, $5, NOW(), NOW(), NOW())
         RETURNING id, status, created_at`,
        [
          organizationId,
          JSON.stringify({
            qualification_type: qualificationType,
            license_number: licenseNumber || null,
            specialty_area: specialtyArea || null,
            teaching_experience_years: teachingExperienceYears || 0,
            supporting_documents: supportingDocuments || [],
            applicant_note: applicantNote || null,
            member_id: memberCheck.memberId,
          }),
          user.id,
          user.name || user.email || 'Unknown',
          user.email || null,
        ],
      );

      res.status(201).json({ success: true, data: { qualificationId: inserted.id, status: 'pending' } });
    }),
  );

  // Q2: GET /instructor-qualifications/me — 내 자격 현황
  router.get(
    '/instructor-qualifications/me',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      // Unified table
      const newRows = await dataSource.query(
        `SELECT id, organization_id,
                payload->>'qualification_type' AS qualification_type,
                status,
                payload->>'license_number' AS license_number,
                payload->>'specialty_area' AS specialty_area,
                (payload->>'teaching_experience_years')::int AS teaching_experience_years,
                reviewed_at,
                review_comment AS rejection_reason,
                payload->>'revoke_reason' AS revoke_reason,
                created_at
         FROM kpa_approval_requests
         WHERE requester_id = $1 AND entity_type = 'instructor_qualification'
         ORDER BY created_at DESC`,
        [user.id],
      );
      // Legacy table (transition period)
      const legacyRows = await dataSource.query(
        `SELECT id, organization_id, qualification_type, status, license_number, specialty_area, teaching_experience_years, reviewed_at, rejection_reason, revoke_reason, created_at
         FROM kpa_instructor_qualifications WHERE user_id = $1 ORDER BY created_at DESC`,
        [user.id],
      );
      res.json({ success: true, data: [...newRows, ...legacyRows] });
    }),
  );

  // Q3: GET /branches/:branchId/instructor-qualifications — 분회 내 자격 목록
  router.get(
    '/branches/:branchId/instructor-qualifications',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId } = req.params;
      const user = (req as any).user;
      if (!UUID_RE.test(branchId)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid branch ID' } }); return; }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } }); return;
      }

      const { status: statusFilter } = req.query;
      const validStatuses = ['pending', 'approved', 'rejected', 'revoked'];

      // Unified table
      let sqlNew = `SELECT ar.id, ar.requester_id AS user_id,
                           payload->>'qualification_type' AS qualification_type,
                           ar.status,
                           payload->>'license_number' AS license_number,
                           payload->>'specialty_area' AS specialty_area,
                           (payload->>'teaching_experience_years')::int AS teaching_experience_years,
                           payload->>'applicant_note' AS applicant_note,
                           ar.reviewed_at,
                           ar.review_comment AS rejection_reason,
                           ar.created_at,
                           u.name AS user_name, u.email AS user_email
                    FROM kpa_approval_requests ar
                    LEFT JOIN users u ON u.id = ar.requester_id
                    WHERE ar.entity_type = 'instructor_qualification' AND ar.organization_id = $1`;
      const paramsNew: any[] = [branchId];
      if (statusFilter && typeof statusFilter === 'string' && validStatuses.includes(statusFilter)) {
        sqlNew += ` AND ar.status = $2`;
        paramsNew.push(statusFilter);
      }
      sqlNew += ` ORDER BY ar.created_at DESC`;

      // Legacy table
      let sqlLegacy = `SELECT q.id, q.user_id, q.qualification_type, q.status, q.license_number, q.specialty_area,
                              q.teaching_experience_years, q.applicant_note, q.reviewed_at, q.rejection_reason, q.created_at,
                              u.name AS user_name, u.email AS user_email
                       FROM kpa_instructor_qualifications q
                       LEFT JOIN users u ON u.id = q.user_id
                       WHERE q.organization_id = $1`;
      const paramsLegacy: any[] = [branchId];
      if (statusFilter && typeof statusFilter === 'string' && validStatuses.includes(statusFilter)) {
        sqlLegacy += ` AND q.status = $2`;
        paramsLegacy.push(statusFilter);
      }
      sqlLegacy += ` ORDER BY q.created_at DESC`;

      const [newRows, legacyRows] = await Promise.all([
        dataSource.query(sqlNew, paramsNew),
        dataSource.query(sqlLegacy, paramsLegacy),
      ]);
      res.json({ success: true, data: [...newRows, ...legacyRows] });
    }),
  );

  // Q4: GET /branches/:branchId/instructor-qualifications/pending — 대기 중 자격만
  router.get(
    '/branches/:branchId/instructor-qualifications/pending',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId } = req.params;
      const user = (req as any).user;
      if (!UUID_RE.test(branchId)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid branch ID' } }); return; }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } }); return;
      }

      // Unified table
      const newRows = await dataSource.query(
        `SELECT ar.id, ar.requester_id AS user_id,
                ar.payload->>'qualification_type' AS qualification_type,
                ar.payload->>'license_number' AS license_number,
                ar.payload->>'specialty_area' AS specialty_area,
                (ar.payload->>'teaching_experience_years')::int AS teaching_experience_years,
                ar.payload->'supporting_documents' AS supporting_documents,
                ar.payload->>'applicant_note' AS applicant_note,
                ar.created_at,
                u.name AS user_name, u.email AS user_email
         FROM kpa_approval_requests ar
         LEFT JOIN users u ON u.id = ar.requester_id
         WHERE ar.entity_type = 'instructor_qualification' AND ar.organization_id = $1 AND ar.status = 'pending'
         ORDER BY ar.created_at ASC`,
        [branchId],
      );
      // Legacy table (transition period)
      const legacyRows = await dataSource.query(
        `SELECT q.id, q.user_id, q.qualification_type, q.license_number, q.specialty_area,
                q.teaching_experience_years, q.supporting_documents, q.applicant_note, q.created_at,
                u.name AS user_name, u.email AS user_email
         FROM kpa_instructor_qualifications q
         LEFT JOIN users u ON u.id = q.user_id
         WHERE q.organization_id = $1 AND q.status = 'pending'
         ORDER BY q.created_at ASC`,
        [branchId],
      );
      res.json({ success: true, data: [...newRows, ...legacyRows] });
    }),
  );

  // Q5: PATCH /branches/:branchId/instructor-qualifications/:id/approve — 승인
  router.patch(
    '/branches/:branchId/instructor-qualifications/:id/approve',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId, id } = req.params;
      const user = (req as any).user;
      if (!UUID_RE.test(branchId) || !UUID_RE.test(id)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } }); return; }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } }); return;
      }

      // Try unified table first
      const [arRow] = await dataSource.query(
        `SELECT id, requester_id, status FROM kpa_approval_requests WHERE id = $1 AND organization_id = $2 AND entity_type = 'instructor_qualification' LIMIT 1`,
        [id, branchId],
      );
      if (arRow) {
        if (arRow.status !== 'pending') { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${arRow.status})에서는 승인할 수 없습니다` } }); return; }
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
          await queryRunner.query(
            `UPDATE kpa_approval_requests SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_comment = $2, updated_at = NOW() WHERE id = $3`,
            [user.id, req.body.reviewComment || null, id],
          );
          await roleAssignmentService.assignRole({ userId: arRow.requester_id, role: 'lms:instructor', assignedBy: user.id });
          await queryRunner.commitTransaction();
          res.json({ success: true, data: { qualificationId: id, status: 'approved', roleAssigned: 'lms:instructor' } });
        } catch (err) { await queryRunner.rollbackTransaction(); throw err; } finally { await queryRunner.release(); }
        return;
      }

      // Fallback: legacy table
      const [qual] = await dataSource.query(
        `SELECT id, user_id, status FROM kpa_instructor_qualifications WHERE id = $1 AND organization_id = $2 LIMIT 1`,
        [id, branchId],
      );
      if (!qual) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Qualification not found' } }); return; }
      if (qual.status !== 'pending') { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${qual.status})에서는 승인할 수 없습니다` } }); return; }

      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query(
          `UPDATE kpa_instructor_qualifications SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_comment = $2, updated_at = NOW() WHERE id = $3`,
          [user.id, req.body.reviewComment || null, id],
        );
        await roleAssignmentService.assignRole({ userId: qual.user_id, role: 'lms:instructor', assignedBy: user.id });
        await queryRunner.commitTransaction();
        res.json({ success: true, data: { qualificationId: id, status: 'approved', roleAssigned: 'lms:instructor' } });
      } catch (err) { await queryRunner.rollbackTransaction(); throw err; } finally { await queryRunner.release(); }
    }),
  );

  // Q6: PATCH /branches/:branchId/instructor-qualifications/:id/reject — 거절
  router.patch(
    '/branches/:branchId/instructor-qualifications/:id/reject',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId, id } = req.params;
      const user = (req as any).user;
      const { rejectionReason } = req.body;
      if (!UUID_RE.test(branchId) || !UUID_RE.test(id)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } }); return; }
      if (!rejectionReason) { res.status(400).json({ success: false, error: { code: 'REASON_REQUIRED', message: 'rejectionReason is required' } }); return; }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } }); return;
      }

      // Try unified table first
      const [arRow] = await dataSource.query(
        `SELECT id, status FROM kpa_approval_requests WHERE id = $1 AND organization_id = $2 AND entity_type = 'instructor_qualification' LIMIT 1`,
        [id, branchId],
      );
      if (arRow) {
        if (arRow.status !== 'pending') { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${arRow.status})에서는 거절할 수 없습니다` } }); return; }
        await dataSource.query(
          `UPDATE kpa_approval_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_comment = $2, updated_at = NOW() WHERE id = $3`,
          [user.id, rejectionReason, id],
        );
        res.json({ success: true, data: { qualificationId: id, status: 'rejected' } });
        return;
      }

      // Fallback: legacy table
      const [qual] = await dataSource.query(
        `SELECT id, status FROM kpa_instructor_qualifications WHERE id = $1 AND organization_id = $2 LIMIT 1`,
        [id, branchId],
      );
      if (!qual) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Qualification not found' } }); return; }
      if (qual.status !== 'pending') { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${qual.status})에서는 거절할 수 없습니다` } }); return; }

      await dataSource.query(
        `UPDATE kpa_instructor_qualifications SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), rejection_reason = $2, updated_at = NOW() WHERE id = $3`,
        [user.id, rejectionReason, id],
      );
      res.json({ success: true, data: { qualificationId: id, status: 'rejected' } });
    }),
  );

  // Q7: PATCH /branches/:branchId/instructor-qualifications/:id/revoke — 해지
  router.patch(
    '/branches/:branchId/instructor-qualifications/:id/revoke',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId, id } = req.params;
      const user = (req as any).user;
      const { revokeReason } = req.body;
      if (!UUID_RE.test(branchId) || !UUID_RE.test(id)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } }); return; }
      if (!revokeReason) { res.status(400).json({ success: false, error: { code: 'REASON_REQUIRED', message: 'revokeReason is required' } }); return; }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } }); return;
      }

      // Try unified table first
      const [arRow] = await dataSource.query(
        `SELECT id, requester_id, status FROM kpa_approval_requests WHERE id = $1 AND organization_id = $2 AND entity_type = 'instructor_qualification' LIMIT 1`,
        [id, branchId],
      );
      if (arRow) {
        if (arRow.status !== 'approved') { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${arRow.status})에서는 해지할 수 없습니다` } }); return; }
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
          await queryRunner.query(
            `UPDATE kpa_approval_requests SET status = 'revoked', reviewed_by = $1, reviewed_at = NOW(),
                    payload = payload || $2::jsonb,
                    updated_at = NOW() WHERE id = $3`,
            [user.id, JSON.stringify({ revoke_reason: revokeReason, revoked_by: user.id, revoked_at: new Date().toISOString() }), id],
          );
          await roleAssignmentService.removeRole(arRow.requester_id, 'lms:instructor');
          await queryRunner.commitTransaction();
          res.json({ success: true, data: { qualificationId: id, status: 'revoked' } });
        } catch (err) { await queryRunner.rollbackTransaction(); throw err; } finally { await queryRunner.release(); }
        return;
      }

      // Fallback: legacy table
      const [qual] = await dataSource.query(
        `SELECT id, user_id, status FROM kpa_instructor_qualifications WHERE id = $1 AND organization_id = $2 LIMIT 1`,
        [id, branchId],
      );
      if (!qual) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Qualification not found' } }); return; }
      if (qual.status !== 'approved') { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${qual.status})에서는 해지할 수 없습니다` } }); return; }

      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query(
          `UPDATE kpa_instructor_qualifications SET status = 'revoked', revoked_by = $1, revoked_at = NOW(), revoke_reason = $2, updated_at = NOW() WHERE id = $3`,
          [user.id, revokeReason, id],
        );
        await roleAssignmentService.removeRole(qual.user_id, 'lms:instructor');
        await queryRunner.commitTransaction();
        res.json({ success: true, data: { qualificationId: id, status: 'revoked' } });
      } catch (err) { await queryRunner.rollbackTransaction(); throw err; } finally { await queryRunner.release(); }
    }),
  );

  // ── Stage 2: Course Request ──

  // C1: POST /course-requests — 강좌 기획안 생성 (draft) [WO-PLATFORM-APPROVAL-ENGINE-UNIFICATION-V1: → kpa_approval_requests]
  router.post(
    '/course-requests',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { organizationId, proposedTitle, proposedDescription, proposedLevel, proposedDuration, proposedCredits, proposedTags, proposedMetadata } = req.body;

      if (!organizationId || !UUID_RE.test(organizationId)) { res.status(400).json({ success: false, error: { code: 'INVALID_ORG', message: 'Valid organizationId required' } }); return; }
      if (!proposedTitle || !proposedDescription || !proposedDuration) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'proposedTitle, proposedDescription, proposedDuration are required' } }); return; }

      // qualification 확인 (dual-query: unified + legacy)
      const qualCheck = await verifyQualifiedInstructor(dataSource, user.id, organizationId, user.roles || []);
      if (!qualCheck) { res.status(403).json({ success: false, error: { code: 'NOT_QUALIFIED', message: '승인된 강사 자격이 필요합니다' } }); return; }

      const [inserted] = await dataSource.query(
        `INSERT INTO kpa_approval_requests
          (id, entity_type, organization_id, payload, status, requester_id, requester_name, requester_email, created_at, updated_at)
         VALUES (gen_random_uuid(), 'course', $1, $2, 'draft', $3, $4, $5, NOW(), NOW())
         RETURNING id, status, created_at`,
        [
          organizationId,
          JSON.stringify({
            proposed_title: proposedTitle,
            proposed_description: proposedDescription,
            proposed_level: proposedLevel || 'beginner',
            proposed_duration: proposedDuration,
            proposed_credits: proposedCredits || 0,
            proposed_tags: proposedTags || [],
            proposed_metadata: proposedMetadata || {},
            qualification_id: qualCheck.qualificationId,
            instructor_id: user.id,
          }),
          user.id,
          user.name || user.email || 'Unknown',
          user.email || null,
        ],
      );

      res.status(201).json({ success: true, data: { requestId: inserted.id, status: 'draft' } });
    }),
  );

  // C2: GET /course-requests/me — 내 기획안 목록
  router.get(
    '/course-requests/me',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      // Unified table
      const newRows = await dataSource.query(
        `SELECT id, organization_id,
                payload->>'proposed_title' AS proposed_title,
                payload->>'proposed_level' AS proposed_level,
                (payload->>'proposed_duration')::int AS proposed_duration,
                status,
                result_entity_id AS created_course_id,
                submitted_at, reviewed_at,
                review_comment AS rejection_reason,
                revision_note,
                created_at
         FROM kpa_approval_requests
         WHERE requester_id = $1 AND entity_type = 'course'
         ORDER BY created_at DESC`,
        [user.id],
      );
      // Legacy table (transition period)
      const legacyRows = await dataSource.query(
        `SELECT id, organization_id, proposed_title, proposed_level, proposed_duration, status, created_course_id, submitted_at, reviewed_at, rejection_reason, revision_note, created_at
         FROM kpa_course_requests WHERE instructor_id = $1 ORDER BY created_at DESC`,
        [user.id],
      );
      res.json({ success: true, data: [...newRows, ...legacyRows] });
    }),
  );

  // C3: GET /course-requests/:id — 기획안 상세
  router.get(
    '/course-requests/:id',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const user = (req as any).user;
      if (!UUID_RE.test(id)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } }); return; }

      // Try unified table first
      const [arRow] = await dataSource.query(
        `SELECT * FROM kpa_approval_requests WHERE id = $1 AND entity_type = 'course' LIMIT 1`,
        [id],
      );
      if (arRow) {
        const userRoles: string[] = user.roles || [];
        if (arRow.requester_id !== user.id) {
          if (!(await verifyBranchAdmin(dataSource, user.id, arRow.organization_id, userRoles))) {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }); return;
          }
        }
        res.json({ success: true, data: arRow });
        return;
      }

      // Fallback: legacy table
      const [row] = await dataSource.query(
        `SELECT * FROM kpa_course_requests WHERE id = $1 LIMIT 1`,
        [id],
      );
      if (!row) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Course request not found' } }); return; }
      const userRoles: string[] = user.roles || [];
      if (row.instructor_id !== user.id) {
        if (!(await verifyBranchAdmin(dataSource, user.id, row.organization_id, userRoles))) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }); return;
        }
      }
      res.json({ success: true, data: row });
    }),
  );

  // C4: PATCH /course-requests/:id — 기획안 수정 (draft/revision_requested에서만)
  router.patch(
    '/course-requests/:id',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const user = (req as any).user;
      if (!UUID_RE.test(id)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } }); return; }

      // Try unified table first
      const [arRow] = await dataSource.query(
        `SELECT id, requester_id, status FROM kpa_approval_requests WHERE id = $1 AND entity_type = 'course' LIMIT 1`,
        [id],
      );
      if (arRow) {
        if (arRow.requester_id !== user.id) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only owner can edit' } }); return; }
        if (!['draft', 'revision_requested'].includes(arRow.status)) { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${arRow.status})에서는 수정할 수 없습니다` } }); return; }

        const { proposedTitle, proposedDescription, proposedLevel, proposedDuration, proposedCredits, proposedTags, proposedMetadata } = req.body;
        const payloadPatch: Record<string, any> = {};
        if (proposedTitle) payloadPatch.proposed_title = proposedTitle;
        if (proposedDescription) payloadPatch.proposed_description = proposedDescription;
        if (proposedLevel) payloadPatch.proposed_level = proposedLevel;
        if (proposedDuration) payloadPatch.proposed_duration = proposedDuration;
        if (proposedCredits !== undefined) payloadPatch.proposed_credits = proposedCredits;
        if (proposedTags) payloadPatch.proposed_tags = proposedTags;
        if (proposedMetadata) payloadPatch.proposed_metadata = proposedMetadata;

        await dataSource.query(
          `UPDATE kpa_approval_requests SET payload = payload || $1::jsonb, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(payloadPatch), id],
        );
        res.json({ success: true, data: { requestId: id, message: 'Updated' } });
        return;
      }

      // Fallback: legacy table
      const [row] = await dataSource.query(
        `SELECT id, instructor_id, status FROM kpa_course_requests WHERE id = $1 LIMIT 1`,
        [id],
      );
      if (!row) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Course request not found' } }); return; }
      if (row.instructor_id !== user.id) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only owner can edit' } }); return; }
      if (!['draft', 'revision_requested'].includes(row.status)) { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${row.status})에서는 수정할 수 없습니다` } }); return; }

      const { proposedTitle, proposedDescription, proposedLevel, proposedDuration, proposedCredits, proposedTags, proposedMetadata } = req.body;
      const setClauses: string[] = ['updated_at = NOW()'];
      const params: any[] = [];
      let pi = 1;
      if (proposedTitle) { setClauses.push(`proposed_title = $${pi++}`); params.push(proposedTitle); }
      if (proposedDescription) { setClauses.push(`proposed_description = $${pi++}`); params.push(proposedDescription); }
      if (proposedLevel) { setClauses.push(`proposed_level = $${pi++}`); params.push(proposedLevel); }
      if (proposedDuration) { setClauses.push(`proposed_duration = $${pi++}`); params.push(proposedDuration); }
      if (proposedCredits !== undefined) { setClauses.push(`proposed_credits = $${pi++}`); params.push(proposedCredits); }
      if (proposedTags) { setClauses.push(`proposed_tags = $${pi++}`); params.push(`{${proposedTags.join(',')}}`); }
      if (proposedMetadata) { setClauses.push(`proposed_metadata = $${pi++}::jsonb`); params.push(JSON.stringify(proposedMetadata)); }
      params.push(id);
      await dataSource.query(`UPDATE kpa_course_requests SET ${setClauses.join(', ')} WHERE id = $${pi}`, params);
      res.json({ success: true, data: { requestId: id, message: 'Updated' } });
    }),
  );

  // C5: POST /course-requests/:id/submit — 제출
  router.post(
    '/course-requests/:id/submit',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const user = (req as any).user;
      if (!UUID_RE.test(id)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } }); return; }

      // Try unified table first
      const [arRow] = await dataSource.query(
        `SELECT id, requester_id, status FROM kpa_approval_requests WHERE id = $1 AND entity_type = 'course' LIMIT 1`,
        [id],
      );
      if (arRow) {
        if (arRow.requester_id !== user.id) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only owner can submit' } }); return; }
        if (!['draft', 'revision_requested'].includes(arRow.status)) { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${arRow.status})에서는 제출할 수 없습니다` } }); return; }
        await dataSource.query(
          `UPDATE kpa_approval_requests SET status = 'submitted', submitted_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [id],
        );
        res.json({ success: true, data: { requestId: id, status: 'submitted' } });
        return;
      }

      // Fallback: legacy table
      const [row] = await dataSource.query(
        `SELECT id, instructor_id, status FROM kpa_course_requests WHERE id = $1 LIMIT 1`,
        [id],
      );
      if (!row) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Course request not found' } }); return; }
      if (row.instructor_id !== user.id) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only owner can submit' } }); return; }
      if (!['draft', 'revision_requested'].includes(row.status)) { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${row.status})에서는 제출할 수 없습니다` } }); return; }
      await dataSource.query(
        `UPDATE kpa_course_requests SET status = 'submitted', submitted_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [id],
      );
      res.json({ success: true, data: { requestId: id, status: 'submitted' } });
    }),
  );

  // C6: POST /course-requests/:id/cancel — 취소
  router.post(
    '/course-requests/:id/cancel',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const user = (req as any).user;
      if (!UUID_RE.test(id)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } }); return; }

      // Try unified table first
      const [arRow] = await dataSource.query(
        `SELECT id, requester_id, status FROM kpa_approval_requests WHERE id = $1 AND entity_type = 'course' LIMIT 1`,
        [id],
      );
      if (arRow) {
        if (arRow.requester_id !== user.id) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only owner can cancel' } }); return; }
        if (['approved', 'cancelled'].includes(arRow.status)) { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${arRow.status})에서는 취소할 수 없습니다` } }); return; }
        await dataSource.query(
          `UPDATE kpa_approval_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
          [id],
        );
        res.json({ success: true, data: { requestId: id, status: 'cancelled' } });
        return;
      }

      // Fallback: legacy table
      const [row] = await dataSource.query(
        `SELECT id, instructor_id, status FROM kpa_course_requests WHERE id = $1 LIMIT 1`,
        [id],
      );
      if (!row) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Course request not found' } }); return; }
      if (row.instructor_id !== user.id) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only owner can cancel' } }); return; }
      if (['approved', 'cancelled'].includes(row.status)) { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${row.status})에서는 취소할 수 없습니다` } }); return; }
      await dataSource.query(
        `UPDATE kpa_course_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
        [id],
      );
      res.json({ success: true, data: { requestId: id, status: 'cancelled' } });
    }),
  );

  // C7: GET /branches/:branchId/course-requests — 분회 내 기획안 목록
  router.get(
    '/branches/:branchId/course-requests',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId } = req.params;
      const user = (req as any).user;
      if (!UUID_RE.test(branchId)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid branch ID' } }); return; }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } }); return;
      }

      const [newRows, legacyRows] = await Promise.all([
        dataSource.query(
          `SELECT ar.id, ar.requester_id AS instructor_id,
                  ar.payload->>'proposed_title' AS proposed_title,
                  ar.payload->>'proposed_level' AS proposed_level,
                  (ar.payload->>'proposed_duration')::int AS proposed_duration,
                  (ar.payload->>'proposed_credits')::numeric AS proposed_credits,
                  ar.status, ar.result_entity_id AS created_course_id,
                  ar.submitted_at, ar.reviewed_at,
                  ar.review_comment AS rejection_reason,
                  ar.revision_note, ar.created_at,
                  u.name AS instructor_name, u.email AS instructor_email
           FROM kpa_approval_requests ar
           LEFT JOIN users u ON u.id = ar.requester_id
           WHERE ar.entity_type = 'course' AND ar.organization_id = $1
           ORDER BY ar.created_at DESC`,
          [branchId],
        ),
        dataSource.query(
          `SELECT cr.id, cr.instructor_id, cr.proposed_title, cr.proposed_level, cr.proposed_duration, cr.proposed_credits,
                  cr.status, cr.created_course_id, cr.submitted_at, cr.reviewed_at, cr.rejection_reason, cr.revision_note, cr.created_at,
                  u.name AS instructor_name, u.email AS instructor_email
           FROM kpa_course_requests cr
           LEFT JOIN users u ON u.id = cr.instructor_id
           WHERE cr.organization_id = $1
           ORDER BY cr.created_at DESC`,
          [branchId],
        ),
      ]);
      res.json({ success: true, data: [...newRows, ...legacyRows] });
    }),
  );

  // C8: GET /branches/:branchId/course-requests/pending — 제출된 기획안만
  router.get(
    '/branches/:branchId/course-requests/pending',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId } = req.params;
      const user = (req as any).user;
      if (!UUID_RE.test(branchId)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid branch ID' } }); return; }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } }); return;
      }

      const [newRows, legacyRows] = await Promise.all([
        dataSource.query(
          `SELECT ar.id, ar.requester_id AS instructor_id,
                  ar.payload->>'proposed_title' AS proposed_title,
                  ar.payload->>'proposed_description' AS proposed_description,
                  ar.payload->>'proposed_level' AS proposed_level,
                  (ar.payload->>'proposed_duration')::int AS proposed_duration,
                  (ar.payload->>'proposed_credits')::numeric AS proposed_credits,
                  ar.submitted_at, ar.created_at,
                  u.name AS instructor_name, u.email AS instructor_email
           FROM kpa_approval_requests ar
           LEFT JOIN users u ON u.id = ar.requester_id
           WHERE ar.entity_type = 'course' AND ar.organization_id = $1 AND ar.status = 'submitted'
           ORDER BY ar.submitted_at ASC`,
          [branchId],
        ),
        dataSource.query(
          `SELECT cr.id, cr.instructor_id, cr.proposed_title, cr.proposed_description, cr.proposed_level, cr.proposed_duration,
                  cr.proposed_credits, cr.proposed_tags, cr.proposed_metadata, cr.submitted_at, cr.created_at,
                  u.name AS instructor_name, u.email AS instructor_email
           FROM kpa_course_requests cr
           LEFT JOIN users u ON u.id = cr.instructor_id
           WHERE cr.organization_id = $1 AND cr.status = 'submitted'
           ORDER BY cr.submitted_at ASC`,
          [branchId],
        ),
      ]);
      res.json({ success: true, data: [...newRows, ...legacyRows] });
    }),
  );

  // C9: PATCH /branches/:branchId/course-requests/:id/approve — 승인 → Course 생성
  router.patch(
    '/branches/:branchId/course-requests/:id/approve',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId, id } = req.params;
      const user = (req as any).user;
      if (!UUID_RE.test(branchId) || !UUID_RE.test(id)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } }); return; }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } }); return;
      }

      // Try unified table first
      const [arRow] = await dataSource.query(
        `SELECT * FROM kpa_approval_requests WHERE id = $1 AND organization_id = $2 AND entity_type = 'course' LIMIT 1`,
        [id, branchId],
      );
      if (arRow) {
        if (arRow.status !== 'submitted') { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${arRow.status})에서는 승인할 수 없습니다` } }); return; }
        const payload = typeof arRow.payload === 'string' ? JSON.parse(arRow.payload) : arRow.payload;

        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
          await queryRunner.query(
            `UPDATE kpa_approval_requests SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_comment = $2, updated_at = NOW() WHERE id = $3`,
            [user.id, req.body.reviewComment || null, id],
          );
          const courseService = CourseService.getInstance();
          const course = await courseService.createCourse({
            title: payload.proposed_title,
            description: payload.proposed_description,
            level: payload.proposed_level?.toUpperCase() as any || 'BEGINNER',
            duration: payload.proposed_duration,
            credits: Number(payload.proposed_credits) || 0,
            tags: payload.proposed_tags || [],
            instructorId: payload.instructor_id || arRow.requester_id,
            organizationId: branchId,
            isOrganizationExclusive: true,
            metadata: { kpaCourseRequestId: id, createdVia: 'kpa_extension' },
          });
          await queryRunner.query(
            `UPDATE kpa_approval_requests SET result_entity_id = $1, result_metadata = $2::jsonb, updated_at = NOW() WHERE id = $3`,
            [course.id, JSON.stringify({ courseId: course.id }), id],
          );
          await queryRunner.commitTransaction();
          res.json({ success: true, data: { requestId: id, status: 'approved', createdCourseId: course.id } });
        } catch (err) { await queryRunner.rollbackTransaction(); throw err; } finally { await queryRunner.release(); }
        return;
      }

      // Fallback: legacy table
      const [cr] = await dataSource.query(
        `SELECT * FROM kpa_course_requests WHERE id = $1 AND organization_id = $2 LIMIT 1`,
        [id, branchId],
      );
      if (!cr) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Course request not found' } }); return; }
      if (cr.status !== 'submitted') { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${cr.status})에서는 승인할 수 없습니다` } }); return; }

      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query(
          `UPDATE kpa_course_requests SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_comment = $2, updated_at = NOW() WHERE id = $3`,
          [user.id, req.body.reviewComment || null, id],
        );
        const courseService = CourseService.getInstance();
        const course = await courseService.createCourse({
          title: cr.proposed_title,
          description: cr.proposed_description,
          level: cr.proposed_level?.toUpperCase() as any || 'BEGINNER',
          duration: cr.proposed_duration,
          credits: Number(cr.proposed_credits) || 0,
          tags: cr.proposed_tags || [],
          instructorId: cr.instructor_id,
          organizationId: branchId,
          isOrganizationExclusive: true,
          metadata: { kpaCourseRequestId: id, createdVia: 'kpa_extension' },
        });
        await queryRunner.query(
          `UPDATE kpa_course_requests SET created_course_id = $1 WHERE id = $2`,
          [course.id, id],
        );
        await queryRunner.commitTransaction();
        res.json({ success: true, data: { requestId: id, status: 'approved', createdCourseId: course.id } });
      } catch (err) { await queryRunner.rollbackTransaction(); throw err; } finally { await queryRunner.release(); }
    }),
  );

  // C10: PATCH /branches/:branchId/course-requests/:id/reject — 거절
  router.patch(
    '/branches/:branchId/course-requests/:id/reject',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId, id } = req.params;
      const user = (req as any).user;
      const { rejectionReason } = req.body;
      if (!UUID_RE.test(branchId) || !UUID_RE.test(id)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } }); return; }
      if (!rejectionReason) { res.status(400).json({ success: false, error: { code: 'REASON_REQUIRED', message: 'rejectionReason is required' } }); return; }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } }); return;
      }

      // Try unified table first
      const [arRow] = await dataSource.query(
        `SELECT id, status FROM kpa_approval_requests WHERE id = $1 AND organization_id = $2 AND entity_type = 'course' LIMIT 1`,
        [id, branchId],
      );
      if (arRow) {
        if (arRow.status !== 'submitted') { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${arRow.status})에서는 거절할 수 없습니다` } }); return; }
        await dataSource.query(
          `UPDATE kpa_approval_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_comment = $2, updated_at = NOW() WHERE id = $3`,
          [user.id, rejectionReason, id],
        );
        res.json({ success: true, data: { requestId: id, status: 'rejected' } });
        return;
      }

      // Fallback: legacy table
      const [cr] = await dataSource.query(
        `SELECT id, status FROM kpa_course_requests WHERE id = $1 AND organization_id = $2 LIMIT 1`,
        [id, branchId],
      );
      if (!cr) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Course request not found' } }); return; }
      if (cr.status !== 'submitted') { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${cr.status})에서는 거절할 수 없습니다` } }); return; }
      await dataSource.query(
        `UPDATE kpa_course_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), rejection_reason = $2, updated_at = NOW() WHERE id = $3`,
        [user.id, rejectionReason, id],
      );
      res.json({ success: true, data: { requestId: id, status: 'rejected' } });
    }),
  );

  // C11: PATCH /branches/:branchId/course-requests/:id/request-revision — 보완 요청
  router.patch(
    '/branches/:branchId/course-requests/:id/request-revision',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId, id } = req.params;
      const user = (req as any).user;
      const { revisionNote } = req.body;
      if (!UUID_RE.test(branchId) || !UUID_RE.test(id)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } }); return; }
      if (!revisionNote) { res.status(400).json({ success: false, error: { code: 'NOTE_REQUIRED', message: 'revisionNote is required' } }); return; }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } }); return;
      }

      // Try unified table first
      const [arRow] = await dataSource.query(
        `SELECT id, status FROM kpa_approval_requests WHERE id = $1 AND organization_id = $2 AND entity_type = 'course' LIMIT 1`,
        [id, branchId],
      );
      if (arRow) {
        if (arRow.status !== 'submitted') { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${arRow.status})에서는 보완 요청할 수 없습니다` } }); return; }
        await dataSource.query(
          `UPDATE kpa_approval_requests SET status = 'revision_requested', reviewed_by = $1, reviewed_at = NOW(), revision_note = $2, updated_at = NOW() WHERE id = $3`,
          [user.id, revisionNote, id],
        );
        res.json({ success: true, data: { requestId: id, status: 'revision_requested' } });
        return;
      }

      // Fallback: legacy table
      const [cr] = await dataSource.query(
        `SELECT id, status FROM kpa_course_requests WHERE id = $1 AND organization_id = $2 LIMIT 1`,
        [id, branchId],
      );
      if (!cr) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Course request not found' } }); return; }
      if (cr.status !== 'submitted') { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${cr.status})에서는 보완 요청할 수 없습니다` } }); return; }
      await dataSource.query(
        `UPDATE kpa_course_requests SET status = 'revision_requested', reviewed_by = $1, reviewed_at = NOW(), revision_note = $2, updated_at = NOW() WHERE id = $3`,
        [user.id, revisionNote, id],
      );
      res.json({ success: true, data: { requestId: id, status: 'revision_requested' } });
    }),
  );

  // ──────────────────────────────────────────────────────────────────────
  // WO-PLATFORM-FORUM-APPROVAL-CORE-DECOUPLING-V1
  // Forum Category Request API (Extension 레이어)
  // Core 승인 제거 → Extension이 승인 후 Core createCategory 호출
  // ──────────────────────────────────────────────────────────────────────

  function generateForumSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 200);
    const suffix = Date.now().toString(36);
    return `${base}-${suffix}`;
  }

  // F1: POST /forum-requests — 포럼 카테고리 요청 생성
  router.post(
    '/forum-requests',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { organizationId, name, description, reason, iconEmoji } = req.body;

      if (!organizationId || !UUID_RE.test(organizationId)) {
        res.status(400).json({ success: false, error: { code: 'INVALID_ORG', message: 'Valid organizationId required' } }); return;
      }
      if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
        res.status(400).json({ success: false, error: { code: 'INVALID_NAME', message: 'name은 2~100자 필수' } }); return;
      }
      if (!description || typeof description !== 'string' || description.trim().length < 5) {
        res.status(400).json({ success: false, error: { code: 'INVALID_DESC', message: 'description은 5자 이상 필수' } }); return;
      }

      const member = await verifyActiveMember(dataSource, user.id, organizationId);
      if (!member) {
        res.status(403).json({ success: false, error: { code: 'NOT_MEMBER', message: '해당 조직의 활성 회원이 아닙니다' } }); return;
      }

      const [saved] = await dataSource.query(
        `INSERT INTO kpa_approval_requests
          (id, entity_type, organization_id, payload, status, requester_id, requester_name, requester_email, submitted_at, created_at, updated_at)
         VALUES (gen_random_uuid(), 'forum_category', $1, $2, 'pending', $3, $4, $5, NOW(), NOW(), NOW())
         RETURNING *`,
        [
          organizationId,
          JSON.stringify({ name: name.trim(), description: description.trim(), reason: reason || null, iconEmoji: iconEmoji || null }),
          user.id,
          user.name || user.email || 'Unknown',
          user.email || null,
        ],
      );
      res.status(201).json({ success: true, data: saved });
    }),
  );

  // F2: GET /forum-requests/my — 내 요청 목록
  router.get(
    '/forum-requests/my',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const organizationId = req.query.organizationId as string;

      let sql = `SELECT * FROM kpa_approval_requests WHERE entity_type = 'forum_category' AND requester_id = $1`;
      const params: any[] = [user.id];

      if (organizationId && UUID_RE.test(organizationId)) {
        sql += ` AND organization_id = $2`;
        params.push(organizationId);
      }
      sql += ` ORDER BY created_at DESC`;

      const rows = await dataSource.query(sql, params);
      res.json({ success: true, data: rows, total: rows.length });
    }),
  );

  // F3: GET /forum-requests/:id — 요청 상세
  router.get(
    '/forum-requests/:id',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { id } = req.params;
      if (!UUID_RE.test(id)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } }); return; }

      const [row] = await dataSource.query(
        `SELECT * FROM kpa_approval_requests WHERE id = $1 AND entity_type = 'forum_category' LIMIT 1`,
        [id],
      );
      if (!row) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } }); return; }

      // 소유자 또는 해당 조직 admin만 조회 가능
      const userRoles: string[] = user.roles || [];
      const isOwner = row.requester_id === user.id;
      const isKpaAdmin = userRoles.includes('kpa:admin');
      const isBranchAdmin = await verifyBranchAdmin(dataSource, user.id, row.organization_id, userRoles);

      if (!isOwner && !isKpaAdmin && !isBranchAdmin) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }); return;
      }

      res.json({ success: true, data: row });
    }),
  );

  // F4: GET /forum-requests — 전체 요청 목록 (operator/admin)
  router.get(
    '/forum-requests',
    coreRequireAuth as any,
    requireKpaScope('kpa:operator') as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const status = req.query.status as string;
      const organizationId = req.query.organizationId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      let sql = `SELECT * FROM kpa_approval_requests WHERE entity_type = 'forum_category'`;
      const params: any[] = [];
      let idx = 1;

      if (status && status !== 'all') {
        sql += ` AND status = $${idx++}`;
        params.push(status);
      }
      if (organizationId && UUID_RE.test(organizationId)) {
        sql += ` AND organization_id = $${idx++}`;
        params.push(organizationId);
      }

      // Count
      const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
      const [countRow] = await dataSource.query(countSql, params);
      const total = parseInt(countRow?.count || '0', 10);

      sql += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
      params.push(limit, (page - 1) * limit);

      const rows = await dataSource.query(sql, params);
      res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
    }),
  );

  // F5: GET /branches/:branchId/forum-requests/pending — 분회 대기 요청
  router.get(
    '/branches/:branchId/forum-requests/pending',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { branchId } = req.params;
      if (!UUID_RE.test(branchId)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid branch ID' } }); return; }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } }); return;
      }

      const rows = await dataSource.query(
        `SELECT ar.*, u.name as requester_display_name, u.email as requester_display_email
         FROM kpa_approval_requests ar
         LEFT JOIN users u ON u.id = ar.requester_id
         WHERE ar.entity_type = 'forum_category' AND ar.organization_id = $1 AND ar.status = 'pending'
         ORDER BY ar.created_at ASC`,
        [branchId],
      );
      res.json({ success: true, data: rows });
    }),
  );

  // F6: PATCH /branches/:branchId/forum-requests/:id/approve — 승인 (ForumCategory 생성)
  router.patch(
    '/branches/:branchId/forum-requests/:id/approve',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { branchId, id } = req.params;
      const { reviewComment } = req.body;
      if (!UUID_RE.test(branchId) || !UUID_RE.test(id)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } }); return; }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } }); return;
      }

      const [ar] = await dataSource.query(
        `SELECT id, status, payload, organization_id FROM kpa_approval_requests WHERE id = $1 AND organization_id = $2 AND entity_type = 'forum_category' LIMIT 1`,
        [id, branchId],
      );
      if (!ar) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } }); return; }
      if (ar.status !== 'pending') { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${ar.status})에서는 승인할 수 없습니다` } }); return; }

      const payload = typeof ar.payload === 'string' ? JSON.parse(ar.payload) : ar.payload;
      const slug = generateForumSlug(payload.name || 'forum');

      // 트랜잭션: approval + ForumCategory 생성
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // 1. 승인 상태 업데이트
        await queryRunner.query(
          `UPDATE kpa_approval_requests SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_comment = $2, updated_at = NOW() WHERE id = $3`,
          [user.id, reviewComment || null, id],
        );

        // 2. ForumCategory 생성 (Extension → Core)
        const [category] = await queryRunner.query(
          `INSERT INTO forum_category
            (id, name, description, slug, icon_emoji, is_active, require_approval, access_level, created_by, organization_id, is_organization_exclusive, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, true, false, 'all', $5, $6, true, NOW(), NOW())
           RETURNING id, slug`,
          [payload.name, payload.description, slug, payload.iconEmoji || null, user.id, branchId],
        );

        // 3. 결과 기록
        await queryRunner.query(
          `UPDATE kpa_approval_requests SET result_entity_id = $1, result_metadata = $2, updated_at = NOW() WHERE id = $3`,
          [category.id, JSON.stringify({ slug: category.slug }), id],
        );

        await queryRunner.commitTransaction();
        res.json({ success: true, data: { requestId: id, status: 'approved', categoryId: category.id, categorySlug: category.slug } });
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    }),
  );

  // F7: PATCH /branches/:branchId/forum-requests/:id/reject — 거절
  router.patch(
    '/branches/:branchId/forum-requests/:id/reject',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { branchId, id } = req.params;
      const { rejectionReason } = req.body;
      if (!UUID_RE.test(branchId) || !UUID_RE.test(id)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } }); return; }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } }); return;
      }

      const [ar] = await dataSource.query(
        `SELECT id, status FROM kpa_approval_requests WHERE id = $1 AND organization_id = $2 AND entity_type = 'forum_category' LIMIT 1`,
        [id, branchId],
      );
      if (!ar) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } }); return; }
      if (ar.status !== 'pending') { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${ar.status})에서는 거절할 수 없습니다` } }); return; }

      await dataSource.query(
        `UPDATE kpa_approval_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_comment = $2, updated_at = NOW() WHERE id = $3`,
        [user.id, rejectionReason || '검토 결과 보류', id],
      );
      res.json({ success: true, data: { requestId: id, status: 'rejected' } });
    }),
  );

  // F8: PATCH /branches/:branchId/forum-requests/:id/request-revision — 보완 요청
  router.patch(
    '/branches/:branchId/forum-requests/:id/request-revision',
    coreRequireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const { branchId, id } = req.params;
      const { revisionNote } = req.body;
      if (!UUID_RE.test(branchId) || !UUID_RE.test(id)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } }); return; }
      if (!revisionNote) { res.status(400).json({ success: false, error: { code: 'NOTE_REQUIRED', message: 'revisionNote is required' } }); return; }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } }); return;
      }

      const [ar] = await dataSource.query(
        `SELECT id, status FROM kpa_approval_requests WHERE id = $1 AND organization_id = $2 AND entity_type = 'forum_category' LIMIT 1`,
        [id, branchId],
      );
      if (!ar) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } }); return; }
      if (ar.status !== 'pending') { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${ar.status})에서는 보완 요청할 수 없습니다` } }); return; }

      await dataSource.query(
        `UPDATE kpa_approval_requests SET status = 'revision_requested', reviewed_by = $1, reviewed_at = NOW(), revision_note = $2, updated_at = NOW() WHERE id = $3`,
        [user.id, revisionNote, id],
      );
      res.json({ success: true, data: { requestId: id, status: 'revision_requested' } });
    }),
  );

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

  // Channel Product Management (WO-CHANNEL-EXECUTION-CONSOLE-V1)
  router.use('/store-hub/channel-products', createStoreChannelProductsController(dataSource, coreRequireAuth as any));

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

  // Store Playlist routes (WO-O4O-SIGNAGE-STORE-PLAYLIST-ENGINE-V1)
  router.use('/store-playlists', createStorePlaylistController(dataSource, coreRequireAuth as any));

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
      order: { created_at: 'ASC' },
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

      // 2. 수량 (기본 1) + 가격 조회
      // WO-KPA-CAMPAIGN-PARTICIPATE-ENFORCEMENT-V1: 서버 강제 가격 + 검증 게이트
      const quantity = Math.max(1, parseInt(req.body?.quantity) || 1);

      // Gate 1: Supplier product 활성/승인 검증
      const productRows = await dataSource.query(
        `SELECT spo.price_general, spo.is_active, spo.approval_status, s.status AS supplier_status,
                pm.marketing_name
         FROM supplier_product_offers spo
         JOIN neture_suppliers s ON s.id = spo.supplier_id
         JOIN product_masters pm ON pm.id = spo.master_id
         WHERE spo.id = $1`,
        [listing.offer_id],
      );
      if (!productRows.length) {
        res.status(404).json({ success: false, error: { message: 'Supplier product not found' } });
        return;
      }
      const product = productRows[0];
      if (!product.is_active) {
        res.status(400).json({ success: false, error: { message: 'Product is not active', code: 'PRODUCT_INACTIVE' } });
        return;
      }
      if (product.approval_status !== 'APPROVED') {
        res.status(400).json({ success: false, error: { message: 'Product is not approved', code: 'PRODUCT_NOT_APPROVED' } });
        return;
      }
      if (product.supplier_status !== 'ACTIVE') {
        res.status(400).json({ success: false, error: { message: 'Supplier is not active', code: 'SUPPLIER_INACTIVE' } });
        return;
      }
      const basePrice = Number(product.price_general ?? 0);

      // WO-O4O-PRODUCT-MASTER-CORE-RESET-V1: campaign tables dropped
      const campaignHit = null;
      const unitPrice = basePrice;

      // Gate 3: 가격 유효성
      if (unitPrice <= 0) {
        res.status(400).json({ success: false, error: { message: 'Invalid product price', code: 'INVALID_PRICE' } });
        return;
      }
      const subtotal = quantity * unitPrice;

      // 3. metadata.serviceKey 전파 — listing.service_key → Order.metadata.serviceKey
      const metadata: Record<string, unknown> = {
        serviceKey: listing.service_key,
        productListingId: listing.id,
        productName: product.marketing_name || '',
        productId: listing.offer_id,
        ...(campaignHit ? { campaignId: campaignHit.campaign_id } : {}),
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
        productId: listing.offer_id,
        productName: product.marketing_name || '',
        quantity,
        unitPrice,
        discount: 0,
        subtotal,
        metadata: { productListingId: listing.id },
      });

      await orderItemRepo.save(orderItem);

      // WO-NETURE-TIME-LIMITED-PRICE-CAMPAIGN-V1: 캠페인 집계 increment
      if (campaignHit) {
        try {
          await dataSource.query(
            `INSERT INTO neture_campaign_aggregations
               (campaign_id, target_id, product_id, organization_id, total_orders, total_quantity, total_amount, updated_at)
             VALUES ($1, $2, $3, $4, 1, $5, $6, NOW())
             ON CONFLICT (campaign_id, target_id) DO UPDATE SET
               total_orders = neture_campaign_aggregations.total_orders + 1,
               total_quantity = neture_campaign_aggregations.total_quantity + $5,
               total_amount = neture_campaign_aggregations.total_amount + $6,
               updated_at = NOW()`,
            [campaignHit.campaign_id, campaignHit.target_id, listing.offer_id, listing.organization_id, quantity, subtotal],
          );
        } catch (e) {
          console.error('[Campaign Aggregation] Failed to increment:', e);
        }
      }

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
  // Campaign-Groupbuys View API — WO-O4O-PRODUCT-MASTER-CORE-RESET-V1: campaign tables dropped
  // ============================================================================
  router.get('/campaign-groupbuys', optionalAuth, asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: [] });
  }));

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

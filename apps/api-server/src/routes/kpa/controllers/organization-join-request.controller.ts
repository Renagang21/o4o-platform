/**
 * Organization Join Request Controller
 *
 * WO-CONTEXT-JOIN-REQUEST-MVP-V1
 * WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: requireKpaScope 표준화
 * WO-PLATFORM-APPROVAL-ENGINE-UNIFICATION-V1: → kpa_approval_requests (entity_type='membership')
 *
 * 조직 가입 / 역할 승격 / 운영자 요청 API
 * 신규 요청은 kpa_approval_requests에 기록.
 * 기존 kpa_organization_join_requests 데이터는 읽기 전용으로 유지 (dual-query).
 *
 * Endpoints:
 * - POST   /                 요청 생성 (인증 필수) → kpa_approval_requests
 * - GET    /my               내 요청 목록 (dual-query)
 * - GET    /pending          운영자용 대기 목록 (kpa:admin, dual-query)
 * - PATCH  /:id/approve      승인 (kpa:admin, dual-table lookup)
 * - PATCH  /:id/reject       반려 (kpa:admin, dual-table lookup)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import {
  KpaOrganizationJoinRequest,
  JoinRequestType,
  JoinRequestStatus,
  RequestedRole,
} from '../entities/kpa-organization-join-request.entity.js';
import { OrganizationMemberService } from '@o4o/organization-core';
import { User } from '../../../modules/auth/entities/User.js';
import { emailService } from '../../../services/email.service.js';
import { OperatorNotificationController } from '../../../controllers/OperatorNotificationController.js';
import logger from '../../../utils/logger.js';

const VALID_REQUEST_TYPES: string[] = ['join', 'promotion', 'operator'];
const VALID_ROLES: RequestedRole[] = ['admin', 'manager', 'member', 'moderator'];

/**
 * Create Organization Join Request Routes
 */
export function createOrganizationJoinRequestRoutes(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  requireScope: (scope: string) => RequestHandler
): Router {
  const router = Router();
  const getRepo = () => dataSource.getRepository(KpaOrganizationJoinRequest);
  const getMemberService = () => new OrganizationMemberService(dataSource);

  // 모든 엔드포인트 인증 필수
  router.use(requireAuth);

  // =========================================================================
  // POST / — 요청 생성 → kpa_approval_requests (entity_type='membership')
  // =========================================================================
  router.post('/', async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const {
        organizationId,
        requestType,
        requestedRole,
        requestedSubRole,
        payload,
      } = req.body;

      // 유효성 검사
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: '조직 ID가 필요합니다.',
          code: 'MISSING_ORGANIZATION_ID',
        });
      }

      if (!requestType || !VALID_REQUEST_TYPES.includes(requestType)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 요청 유형입니다.',
          code: 'INVALID_REQUEST_TYPE',
        });
      }

      const role = requestedRole || 'member';
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 역할입니다.',
          code: 'INVALID_ROLE',
        });
      }

      // 중복 요청 확인 — dual-query (unified + legacy)
      const [existingNew] = await dataSource.query(
        `SELECT id FROM kpa_approval_requests
         WHERE requester_id = $1 AND organization_id = $2 AND entity_type = 'membership'
           AND status = 'pending' AND payload->>'request_type' = $3
         LIMIT 1`,
        [user.id, organizationId, requestType],
      );
      if (existingNew) {
        return res.status(409).json({
          success: false,
          error: '이미 처리 대기 중인 동일한 요청이 있습니다.',
          code: 'DUPLICATE_PENDING_REQUEST',
        });
      }

      const legacyRepo = getRepo();
      const existingLegacy = await legacyRepo.findOne({
        where: {
          user_id: user.id,
          organization_id: organizationId,
          request_type: requestType as JoinRequestType,
          status: 'pending' as JoinRequestStatus,
        },
      });
      if (existingLegacy) {
        return res.status(409).json({
          success: false,
          error: '이미 처리 대기 중인 동일한 요청이 있습니다.',
          code: 'DUPLICATE_PENDING_REQUEST',
        });
      }

      // join 요청 시: 이미 멤버인지 확인
      if (requestType === 'join') {
        try {
          const memberService = getMemberService();
          const isMember = await memberService.isMember(user.id, organizationId);
          if (isMember) {
            return res.status(409).json({
              success: false,
              error: '이미 해당 조직의 멤버입니다.',
              code: 'ALREADY_MEMBER',
            });
          }
        } catch {
          // organization-core isMember 실패 시 무시 (조직이 없을 수 있음)
        }
      }

      // 요청 생성 → kpa_approval_requests
      const userRepo = dataSource.getRepository(User);
      const appUser = await userRepo.findOne({ where: { id: user.id } });
      const requesterName = appUser?.name || appUser?.email || 'Unknown';
      const requesterEmail = appUser?.email || null;

      const [saved] = await dataSource.query(
        `INSERT INTO kpa_approval_requests
          (id, entity_type, organization_id, payload, status, requester_id, requester_name, requester_email, submitted_at, created_at, updated_at)
         VALUES (gen_random_uuid(), 'membership', $1, $2, 'pending', $3, $4, $5, NOW(), NOW(), NOW())
         RETURNING *`,
        [
          organizationId,
          JSON.stringify({
            request_type: requestType,
            requested_role: role,
            requested_sub_role: requestedSubRole?.trim() || null,
            user_email: requesterEmail,
            user_name: requesterName,
            ...(payload || {}),
          }),
          user.id,
          requesterName,
          requesterEmail,
        ],
      );

      logger.info(
        `Organization join request created (unified): ${saved.id} (${requestType}) by user ${user.id} for org ${organizationId}`
      );

      // WO-O4O-OPERATOR-NOTIFICATION-EMAIL-MANAGEMENT-V1: Send notification emails
      try {
        const applicantName = requesterName;
        const applicantEmail = requesterEmail || '';
        const appliedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

        const serviceNameMap: Record<string, string> = {
          join: 'KPA 지부/분회',
          promotion: 'KPA 역할 승격',
          operator: 'KPA 운영자',
        };
        const serviceName = serviceNameMap[requestType] || 'KPA Society';

        // 1. Send notification to operator
        const operatorEmail = await OperatorNotificationController.getOperatorEmail('kpa-society');
        if (operatorEmail && emailService.isServiceAvailable()) {
          const isEnabled = await OperatorNotificationController.isNotificationEnabled('kpa-society', 'serviceApplication');
          if (isEnabled) {
            await emailService.sendServiceApplicationOperatorNotificationEmail(
              operatorEmail.primary,
              {
                serviceName,
                applicantName,
                applicantEmail,
                applicantPhone: appUser?.phone,
                appliedAt,
                note: payload?.note || undefined,
                reviewUrl: `${process.env.OPERATOR_URL || 'https://kpa-society.co.kr'}/operator/kpa/organization-join-requests`,
              }
            );
            logger.info(`[KPA] Operator notification sent for join request to ${operatorEmail.primary}`);
            await OperatorNotificationController.updateLastNotificationTime('kpa-society');
          }
        }

        // 2. Send confirmation to applicant
        if (applicantEmail && emailService.isServiceAvailable()) {
          await emailService.sendServiceApplicationSubmittedEmail(
            applicantEmail,
            {
              serviceName,
              applicantName,
              applicantEmail,
              appliedAt,
              supportEmail: 'support@kpa-society.co.kr',
            }
          );
          logger.info(`[KPA] Join request confirmation sent to ${applicantEmail}`);
        }
      } catch (emailError) {
        logger.error('[KPA] Failed to send join request notification emails:', emailError);
      }

      return res.status(201).json({
        success: true,
        data: saved,
      });
    } catch (error) {
      logger.error('Failed to create organization join request:', error);
      return res.status(500).json({
        success: false,
        error: '요청 생성 중 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // =========================================================================
  // GET /my — 내 요청 목록 (dual-query)
  // =========================================================================
  router.get('/my', async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { status } = req.query;

      // Unified table
      let sqlNew = `SELECT id, organization_id, payload->>'request_type' AS request_type,
                           payload->>'requested_role' AS requested_role,
                           payload->>'requested_sub_role' AS requested_sub_role,
                           status, reviewed_by, reviewed_at, review_comment AS review_note,
                           created_at, updated_at
                    FROM kpa_approval_requests
                    WHERE requester_id = $1 AND entity_type = 'membership'`;
      const paramsNew: any[] = [user.id];
      if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
        sqlNew += ` AND status = $2`;
        paramsNew.push(status);
      }
      sqlNew += ` ORDER BY created_at DESC`;

      // Legacy table
      const repo = getRepo();
      const qb = repo
        .createQueryBuilder('r')
        .where('r.user_id = :userId', { userId: user.id });
      if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
        qb.andWhere('r.status = :status', { status });
      }
      qb.orderBy('r.created_at', 'DESC');

      const [newItems, legacyItems] = await Promise.all([
        dataSource.query(sqlNew, paramsNew),
        qb.getMany(),
      ]);

      return res.json({
        success: true,
        data: [...newItems, ...legacyItems],
      });
    } catch (error) {
      logger.error('Failed to list my join requests:', error);
      return res.status(500).json({
        success: false,
        error: '요청 목록 조회 중 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // =========================================================================
  // GET /pending — 관리자용 대기 목록 (kpa:admin scope, dual-query)
  // =========================================================================
  router.get('/pending', requireScope('kpa:admin'), async (req: Request, res: Response) => {
    try {
      const { organizationId, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limitNum = Math.min(parseInt(limit as string) || 20, 100);

      // Unified table
      let sqlNew = `SELECT id, organization_id, requester_id AS user_id,
                           payload->>'request_type' AS request_type,
                           payload->>'requested_role' AS requested_role,
                           payload->>'requested_sub_role' AS requested_sub_role,
                           status, reviewed_by, reviewed_at, review_comment AS review_note,
                           created_at, updated_at
                    FROM kpa_approval_requests
                    WHERE entity_type = 'membership' AND status = 'pending'`;
      const paramsNew: any[] = [];
      let idx = 1;
      if (organizationId) {
        sqlNew += ` AND organization_id = $${idx++}`;
        paramsNew.push(organizationId);
      }
      sqlNew += ` ORDER BY created_at ASC`;

      // Legacy table
      const repo = getRepo();
      const qb = repo
        .createQueryBuilder('r')
        .where('r.status = :status', { status: 'pending' });
      if (organizationId) {
        qb.andWhere('r.organization_id = :organizationId', { organizationId });
      }
      qb.orderBy('r.created_at', 'ASC');

      const [newItems, legacyItems] = await Promise.all([
        dataSource.query(sqlNew, paramsNew),
        qb.getMany(),
      ]);

      const allItems = [...newItems, ...legacyItems];
      const total = allItems.length;
      const paged = allItems.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      return res.json({
        success: true,
        data: {
          items: paged,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      logger.error('Failed to list pending join requests:', error);
      return res.status(500).json({
        success: false,
        error: '대기 요청 목록 조회 중 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // =========================================================================
  // PATCH /:id/approve — 승인 (dual-table lookup)
  // =========================================================================
  router.patch('/:id/approve', requireScope('kpa:admin'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const { reviewNote } = req.body;

      // Helper: apply member and send email
      async function applyApproval(userId: string, orgId: string, requestType: string, requestedRole: string, requestedSubRole: string | null) {
        const memberService = getMemberService();
        try {
          if (requestType === 'join') {
            await memberService.addMember(orgId, {
              userId,
              role: requestedRole as any,
              metadata: requestedSubRole ? { subRole: requestedSubRole } : undefined,
            });
          } else {
            await memberService.updateMemberRole(orgId, userId, {
              role: requestedRole as any,
              metadata: requestedSubRole ? { subRole: requestedSubRole } : undefined,
            });
          }
        } catch (memberError: any) {
          logger.warn(`Member service error during approval of request ${id}: ${memberError.message}`);
        }

        // User.status ACTIVE
        try {
          await dataSource.query(
            `UPDATE users SET status = 'active', "isActive" = true, "approvedAt" = NOW(), "approvedBy" = $2
             WHERE id = $1 AND status != 'active'`,
            [userId, user.id]
          );
        } catch (syncError) {
          logger.error('[WO-KPA-C-APPROVAL-USER-SYNC] User status sync failed:', syncError);
        }

        // Email notification
        try {
          const userRepo = dataSource.getRepository(User);
          const appUser = await userRepo.findOne({ where: { id: userId } });
          const applicantEmail = appUser?.email;
          const applicantName = appUser?.name || appUser?.email || 'Unknown';
          const decidedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

          const serviceNameMap: Record<string, string> = {
            join: 'KPA 지부/분회',
            promotion: 'KPA 역할 승격',
            operator: 'KPA 운영자',
          };
          const serviceName = serviceNameMap[requestType] || 'KPA Society';

          if (applicantEmail && emailService.isServiceAvailable()) {
            await emailService.sendServiceApplicationApprovedEmail(
              applicantEmail,
              {
                serviceName,
                applicantName,
                approvedAt: decidedAt,
                serviceUrl: process.env.KPA_URL || 'https://kpa-society.co.kr',
                supportEmail: 'support@kpa-society.co.kr',
              }
            );
            logger.info(`[KPA] Join request approval notification sent to ${applicantEmail}`);
          }
        } catch (emailError) {
          logger.error('[KPA] Failed to send join request approval email:', emailError);
        }
      }

      // Try unified table first
      const [arRow] = await dataSource.query(
        `SELECT id, requester_id, organization_id, payload, status FROM kpa_approval_requests WHERE id = $1 AND entity_type = 'membership' LIMIT 1`,
        [id],
      );
      if (arRow) {
        if (arRow.status !== 'pending') {
          return res.status(409).json({
            success: false,
            error: `이미 처리된 요청입니다. (현재 상태: ${arRow.status})`,
            code: 'ALREADY_PROCESSED',
          });
        }
        const payload = typeof arRow.payload === 'string' ? JSON.parse(arRow.payload) : arRow.payload;

        await dataSource.query(
          `UPDATE kpa_approval_requests SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_comment = $2, updated_at = NOW() WHERE id = $3`,
          [user.id, reviewNote?.trim() || null, id],
        );

        await applyApproval(arRow.requester_id, arRow.organization_id, payload?.request_type || 'join', payload?.requested_role || 'member', payload?.requested_sub_role || null);

        logger.info(`Organization join request approved (unified): ${id} by ${user.id}`);

        // Re-read for response
        const [updated] = await dataSource.query(`SELECT * FROM kpa_approval_requests WHERE id = $1`, [id]);
        return res.json({ success: true, data: updated });
      }

      // Fallback: legacy table
      const repo = getRepo();
      const request = await repo.findOne({ where: { id } });

      if (!request) {
        return res.status(404).json({
          success: false,
          error: '요청을 찾을 수 없습니다.',
          code: 'NOT_FOUND',
        });
      }

      if (request.status !== 'pending') {
        return res.status(409).json({
          success: false,
          error: `이미 처리된 요청입니다. (현재 상태: ${request.status})`,
          code: 'ALREADY_PROCESSED',
        });
      }

      request.status = 'approved';
      request.reviewed_by = user.id;
      request.reviewed_at = new Date();
      request.review_note = reviewNote?.trim() || null;
      await repo.save(request);

      await applyApproval(request.user_id, request.organization_id, request.request_type, request.requested_role, request.requested_sub_role);

      logger.info(`Organization join request approved (legacy): ${id} by ${user.id}`);

      return res.json({
        success: true,
        data: request,
      });
    } catch (error) {
      logger.error('Failed to approve join request:', error);
      return res.status(500).json({
        success: false,
        error: '승인 처리 중 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // =========================================================================
  // PATCH /:id/reject — 반려 (dual-table lookup)
  // =========================================================================
  router.patch('/:id/reject', requireScope('kpa:admin'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const { reviewNote } = req.body;

      // Helper: send rejection email
      async function sendRejectionEmail(userId: string, requestType: string) {
        try {
          const userRepo = dataSource.getRepository(User);
          const appUser = await userRepo.findOne({ where: { id: userId } });
          const applicantEmail = appUser?.email;
          const applicantName = appUser?.name || appUser?.email || 'Unknown';
          const decidedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

          const serviceNameMap: Record<string, string> = {
            join: 'KPA 지부/분회',
            promotion: 'KPA 역할 승격',
            operator: 'KPA 운영자',
          };
          const serviceName = serviceNameMap[requestType] || 'KPA Society';

          if (applicantEmail && emailService.isServiceAvailable()) {
            await emailService.sendServiceApplicationRejectedEmail(
              applicantEmail,
              {
                serviceName,
                applicantName,
                rejectedAt: decidedAt,
                rejectionReason: reviewNote?.trim() || undefined,
                supportEmail: 'support@kpa-society.co.kr',
              }
            );
            logger.info(`[KPA] Join request rejection notification sent to ${applicantEmail}`);
          }
        } catch (emailError) {
          logger.error('[KPA] Failed to send join request rejection email:', emailError);
        }
      }

      // Try unified table first
      const [arRow] = await dataSource.query(
        `SELECT id, requester_id, payload, status FROM kpa_approval_requests WHERE id = $1 AND entity_type = 'membership' LIMIT 1`,
        [id],
      );
      if (arRow) {
        if (arRow.status !== 'pending') {
          return res.status(409).json({
            success: false,
            error: `이미 처리된 요청입니다. (현재 상태: ${arRow.status})`,
            code: 'ALREADY_PROCESSED',
          });
        }
        const payload = typeof arRow.payload === 'string' ? JSON.parse(arRow.payload) : arRow.payload;

        await dataSource.query(
          `UPDATE kpa_approval_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_comment = $2, updated_at = NOW() WHERE id = $3`,
          [user.id, reviewNote?.trim() || null, id],
        );

        await sendRejectionEmail(arRow.requester_id, payload?.request_type || 'join');

        logger.info(`Organization join request rejected (unified): ${id} by ${user.id}`);

        const [updated] = await dataSource.query(`SELECT * FROM kpa_approval_requests WHERE id = $1`, [id]);
        return res.json({ success: true, data: updated });
      }

      // Fallback: legacy table
      const repo = getRepo();
      const request = await repo.findOne({ where: { id } });

      if (!request) {
        return res.status(404).json({
          success: false,
          error: '요청을 찾을 수 없습니다.',
          code: 'NOT_FOUND',
        });
      }

      if (request.status !== 'pending') {
        return res.status(409).json({
          success: false,
          error: `이미 처리된 요청입니다. (현재 상태: ${request.status})`,
          code: 'ALREADY_PROCESSED',
        });
      }

      request.status = 'rejected';
      request.reviewed_by = user.id;
      request.reviewed_at = new Date();
      request.review_note = reviewNote?.trim() || null;
      await repo.save(request);

      await sendRejectionEmail(request.user_id, request.request_type);

      logger.info(`Organization join request rejected (legacy): ${id} by ${user.id}`);

      return res.json({
        success: true,
        data: request,
      });
    } catch (error) {
      logger.error('Failed to reject join request:', error);
      return res.status(500).json({
        success: false,
        error: '반려 처리 중 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  return router;
}

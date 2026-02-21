/**
 * Organization Join Request Controller
 *
 * WO-CONTEXT-JOIN-REQUEST-MVP-V1
 * WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: requireKpaScope 표준화
 *
 * 조직 가입 / 역할 승격 / 운영자 요청 API
 *
 * Endpoints:
 * - POST   /                 요청 생성 (인증 필수)
 * - GET    /my               내 요청 목록
 * - GET    /pending          운영자용 대기 목록 (kpa:admin)
 * - PATCH  /:id/approve      승인 (kpa:admin)
 * - PATCH  /:id/reject       반려 (kpa:admin)
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

const VALID_REQUEST_TYPES: string[] = ['join', 'promotion', 'operator', 'pharmacy_join', 'pharmacy_operator'];
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
  // POST / — 요청 생성
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

      const repo = getRepo();

      // 중복 요청 확인: 동일 user + org + requestType의 pending 요청
      const existingPending = await repo.findOne({
        where: {
          user_id: user.id,
          organization_id: organizationId,
          request_type: requestType,
          status: 'pending' as JoinRequestStatus,
        },
      });

      if (existingPending) {
        return res.status(409).json({
          success: false,
          error: '이미 처리 대기 중인 동일한 요청이 있습니다.',
          code: 'DUPLICATE_PENDING_REQUEST',
        });
      }

      // join 요청 시: 이미 멤버인지 확인
      if (requestType === 'join' || requestType === 'pharmacy_join') {
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

      // 요청 생성
      const request = repo.create({
        user_id: user.id,
        organization_id: organizationId,
        request_type: requestType as JoinRequestType,
        requested_role: role as RequestedRole,
        requested_sub_role: requestedSubRole?.trim() || null,
        payload: payload || null,
        status: 'pending' as JoinRequestStatus,
      });

      await repo.save(request);

      logger.info(
        `Organization join request created: ${request.id} (${requestType}) by user ${user.id} for org ${organizationId}`
      );

      // WO-O4O-OPERATOR-NOTIFICATION-EMAIL-MANAGEMENT-V1: Send notification emails
      try {
        const userRepo = dataSource.getRepository(User);
        const appUser = await userRepo.findOne({ where: { id: user.id } });
        const applicantName = appUser?.name || appUser?.email || 'Unknown';
        const applicantEmail = appUser?.email || '';
        const appliedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

        // Determine service name based on request type
        const serviceNameMap: Record<string, string> = {
          join: 'KPA 지부/분회',
          promotion: 'KPA 역할 승격',
          operator: 'KPA 운영자',
          pharmacy_join: 'KPA 약국 서비스',
          pharmacy_operator: 'KPA 약국 운영자',
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
        data: request,
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
  // GET /my — 내 요청 목록
  // =========================================================================
  router.get('/my', async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { status } = req.query;

      const repo = getRepo();
      const qb = repo
        .createQueryBuilder('r')
        .where('r.user_id = :userId', { userId: user.id });

      if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
        qb.andWhere('r.status = :status', { status });
      }

      qb.orderBy('r.created_at', 'DESC');

      const items = await qb.getMany();

      return res.json({
        success: true,
        data: items,
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
  // GET /pending — 관리자용 대기 목록 (kpa:admin scope)
  // WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: inline guard → requireScope
  // =========================================================================
  router.get('/pending', requireScope('kpa:admin'), async (req: Request, res: Response) => {
    try {
      const { organizationId, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limitNum = Math.min(parseInt(limit as string) || 20, 100);

      const repo = getRepo();
      const qb = repo
        .createQueryBuilder('r')
        .where('r.status = :status', { status: 'pending' });

      if (organizationId) {
        qb.andWhere('r.organization_id = :organizationId', { organizationId });
      }

      qb.orderBy('r.created_at', 'ASC')
        .skip((pageNum - 1) * limitNum)
        .take(limitNum);

      const [items, total] = await qb.getManyAndCount();

      return res.json({
        success: true,
        data: {
          items,
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
  // PATCH /:id/approve — 승인
  // =========================================================================
  router.patch('/:id/approve', requireScope('kpa:admin'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const { reviewNote } = req.body;

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

      // OrganizationMember 반영
      const memberService = getMemberService();

      try {
        if (request.request_type === 'join' || request.request_type === 'pharmacy_join') {
          await memberService.addMember(request.organization_id, {
            userId: request.user_id,
            role: request.requested_role,
            metadata: request.requested_sub_role
              ? { subRole: request.requested_sub_role }
              : undefined,
          });
        } else {
          // promotion / operator → updateMemberRole
          await memberService.updateMemberRole(
            request.organization_id,
            request.user_id,
            {
              role: request.requested_role,
              metadata: request.requested_sub_role
                ? { subRole: request.requested_sub_role }
                : undefined,
            }
          );
        }
      } catch (memberError: any) {
        logger.warn(
          `Member service error during approval of request ${id}: ${memberError.message}`
        );
        // 멤버 서비스 오류 시에도 요청은 승인 처리 (best-effort)
        // 이미 멤버인 경우 등 non-critical 에러 허용
      }

      // 요청 상태 업데이트
      request.status = 'approved';
      request.reviewed_by = user.id;
      request.reviewed_at = new Date();
      request.review_note = reviewNote?.trim() || null;

      await repo.save(request);

      logger.info(
        `Organization join request approved: ${id} by ${user.id}`
      );

      // =====================================================================
      // WO-KPA-C-APPROVAL-USER-SYNC-ALIGNMENT-V1: User.roles 동기화
      // KPA-a 패턴과 동일 — 승인 시 User.roles에 kpa-c role 반영
      // =====================================================================
      try {
        // WO-KPA-PHARMACY-IDENTITY-REALIGN-V1: pharmacy_join은 KPA-a 도메인
        // → kpa-c role 매핑 대신 pharmacist_role(1차 정체성) 설정
        if (request.request_type === 'pharmacy_join') {
          await dataSource.query(
            `UPDATE users SET pharmacist_role = 'pharmacy_owner'
             WHERE id = $1`,
            [request.user_id]
          );
          logger.info(
            `[WO-KPA-PHARMACY-IDENTITY-REALIGN] User ${request.user_id} pharmacist_role set to pharmacy_owner`
          );
        } else {
          // request_type + requested_role → kpa-c role 매핑
          let kpaCRole: string | null = null;

          if (request.request_type === 'operator' || request.request_type === 'pharmacy_operator') {
            kpaCRole = 'kpa-c:operator';
          } else if (request.requested_role === 'admin') {
            kpaCRole = 'kpa-c:branch_admin';
          } else if (request.requested_role === 'manager' || request.requested_role === 'moderator') {
            kpaCRole = 'kpa-c:operator';
          }
          // requested_role === 'member' → 일반 조직 멤버, 별도 kpa-c role 불필요

          if (kpaCRole) {
            // 멱등성: 이미 있으면 추가하지 않음
            await dataSource.query(
              `UPDATE users SET roles = array_append(roles, $2)
               WHERE id = $1 AND NOT ($2 = ANY(roles))`,
              [request.user_id, kpaCRole]
            );

            logger.info(
              `[WO-KPA-C-APPROVAL-USER-SYNC] User ${request.user_id} role added: ${kpaCRole}`
            );
          }
        }

        // User.status ACTIVE 보장 (PENDING 상태에서 승인된 경우)
        await dataSource.query(
          `UPDATE users
           SET status = 'active', "isActive" = true, "approvedAt" = NOW(), "approvedBy" = $2
           WHERE id = $1 AND status != 'active'`,
          [request.user_id, user.id]
        );
      } catch (syncError) {
        logger.error('[WO-KPA-C-APPROVAL-USER-SYNC] User sync failed:', syncError);
        // best-effort: 동기화 실패해도 승인 자체는 유지
      }

      // WO-O4O-OPERATOR-NOTIFICATION-EMAIL-MANAGEMENT-V1: Send approval notification
      try {
        const userRepo = dataSource.getRepository(User);
        const appUser = await userRepo.findOne({ where: { id: request.user_id } });
        const applicantEmail = appUser?.email;
        const applicantName = appUser?.name || appUser?.email || 'Unknown';
        const decidedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

        const serviceNameMap: Record<string, string> = {
          join: 'KPA 지부/분회',
          promotion: 'KPA 역할 승격',
          operator: 'KPA 운영자',
          pharmacy_join: 'KPA 약국 서비스',
          pharmacy_operator: 'KPA 약국 운영자',
        };
        const serviceName = serviceNameMap[request.request_type] || 'KPA Society';

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
  // PATCH /:id/reject — 반려
  // =========================================================================
  router.patch('/:id/reject', requireScope('kpa:admin'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const { reviewNote } = req.body;

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

      logger.info(
        `Organization join request rejected: ${id} by ${user.id}`
      );

      // WO-O4O-OPERATOR-NOTIFICATION-EMAIL-MANAGEMENT-V1: Send rejection notification
      try {
        const userRepo = dataSource.getRepository(User);
        const appUser = await userRepo.findOne({ where: { id: request.user_id } });
        const applicantEmail = appUser?.email;
        const applicantName = appUser?.name || appUser?.email || 'Unknown';
        const decidedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

        const serviceNameMap: Record<string, string> = {
          join: 'KPA 지부/분회',
          promotion: 'KPA 역할 승격',
          operator: 'KPA 운영자',
          pharmacy_join: 'KPA 약국 서비스',
          pharmacy_operator: 'KPA 약국 운영자',
        };
        const serviceName = serviceNameMap[request.request_type] || 'KPA Society';

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

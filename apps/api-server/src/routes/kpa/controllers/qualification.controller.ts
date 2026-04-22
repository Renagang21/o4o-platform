/**
 * Qualification Controller
 * WO-O4O-QUALIFICATION-SYSTEM-V1
 *
 * 자격 신청 / 조회 / 승인 API
 *
 * POST   /qualifications/apply           — 자격 신청 (인증 필요)
 * GET    /qualifications/me              — 내 자격 목록 (인증 필요)
 * GET    /qualifications/requests/me     — 내 신청 내역 (인증 필요)
 * GET    /qualifications/requests        — 전체 신청 목록 (operator 전용)
 * PATCH  /qualifications/requests/:id   — 승인 / 거절 (operator 전용)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import type { AuthRequest } from '../../../types/auth.js';
import { MemberQualification, QUALIFICATION_TYPES } from '../entities/member-qualification.entity.js';
import { QualificationRequest } from '../entities/qualification-request.entity.js';
import { InstructorProfile } from '../entities/instructor-profile.entity.js'; // WO-O4O-INSTRUCTOR-APPLICATION-V1
import { roleAssignmentService } from '../../../modules/auth/services/role-assignment.service.js'; // WO-O4O-LMS-FOUNDATION-V1

type AuthMiddleware = RequestHandler;
type ScopeMiddleware = (scope: string) => RequestHandler;

const handleValidationErrors = (req: Request, res: Response, next: any): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    return;
  }
  next();
};

export function createQualificationController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requireScope: ScopeMiddleware,
): Router {
  const router = Router();
  const qualRepo = dataSource.getRepository(MemberQualification);
  const reqRepo = dataSource.getRepository(QualificationRequest);
  const profileRepo = dataSource.getRepository(InstructorProfile); // WO-O4O-INSTRUCTOR-APPLICATION-V1

  /**
   * POST /qualifications/apply
   * 자격 신청
   */
  router.post(
    '/apply',
    requireAuth,
    [
      body('qualificationType').isIn(['lms_creator']), // WO-LMS-CREATOR-QUALIFICATION-FLOW-REFORM-V1: 신규 신청은 lms_creator만 허용
      body('data').optional().isObject(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      const userId = req.user!.id;
      const qualType = req.body.qualificationType as string;
      const requestData = req.body.data || {};

      try {
        // 이미 approved 또는 pending 자격이 있으면 중복 방지
        const existing = await qualRepo.findOne({
          where: { user_id: userId, qualification_type: qualType as any },
        });

        if (existing) {
          if (existing.status === 'approved') {
            res.status(409).json({ success: false, error: '이미 보유한 자격입니다.', code: 'ALREADY_QUALIFIED' });
            return;
          }
          if (existing.status === 'pending') {
            res.status(409).json({ success: false, error: '이미 검토 중인 신청이 있습니다.', code: 'ALREADY_PENDING' });
            return;
          }
          // rejected → 재신청 허용: 기존 row 업데이트
          existing.status = 'pending';
          existing.requested_at = new Date();
          existing.approved_at = null;
          existing.rejected_at = null;
          existing.metadata = requestData;
          await qualRepo.save(existing);
        } else {
          // 신규 자격 row
          const qual = qualRepo.create({
            user_id: userId,
            qualification_type: qualType as any,
            status: 'pending',
            requested_at: new Date(),
            metadata: requestData,
          });
          await qualRepo.save(qual);
        }

        // 신청 이력 기록
        const qReq = reqRepo.create({
          user_id: userId,
          qualification_type: qualType,
          status: 'pending',
          request_data: requestData,
        });
        const savedReq = await reqRepo.save(qReq);

        res.status(201).json({ success: true, data: savedReq });
      } catch (error: any) {
        console.error('[Qualification] apply failed:', error);
        res.status(500).json({ success: false, error: 'Failed to submit qualification request' });
      }
    },
  );

  /**
   * GET /qualifications/me
   * 내 자격 목록
   */
  router.get(
    '/me',
    requireAuth,
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const quals = await qualRepo.find({
          where: { user_id: req.user!.id },
          order: { created_at: 'DESC' },
        });
        res.json({ success: true, data: quals });
      } catch (error: any) {
        console.error('[Qualification] get my qualifications failed:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch qualifications' });
      }
    },
  );

  /**
   * GET /qualifications/requests/me
   * 내 신청 내역
   */
  router.get(
    '/requests/me',
    requireAuth,
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const requests = await reqRepo.find({
          where: { user_id: req.user!.id },
          order: { created_at: 'DESC' },
        });
        res.json({ success: true, data: requests });
      } catch (error: any) {
        console.error('[Qualification] get my requests failed:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch requests' });
      }
    },
  );

  /**
   * GET /qualifications/requests
   * 전체 신청 목록 (operator 전용)
   */
  router.get(
    '/requests',
    requireAuth,
    requireScope('kpa:operator'),
    [
      query('status').optional().isIn(['pending', 'approved', 'rejected']),
      query('qualificationType').optional().isIn(QUALIFICATION_TYPES),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const { status, qualificationType, page = '1', limit = '20' } = req.query as Record<string, string>;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 20;

        const qb = reqRepo.createQueryBuilder('r')
          .leftJoin('users', 'u', 'u.id = r.user_id')
          .addSelect(['u.name', 'u.email']);

        if (status) qb.andWhere('r.status = :status', { status });
        if (qualificationType) qb.andWhere('r.qualification_type = :qt', { qt: qualificationType });

        qb.orderBy('r.created_at', 'DESC')
          .skip((pageNum - 1) * limitNum)
          .take(limitNum);

        const [requests, total] = await qb.getManyAndCount();

        res.json({
          success: true,
          data: requests,
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        });
      } catch (error: any) {
        console.error('[Qualification] list requests failed:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch requests' });
      }
    },
  );

  /**
   * PATCH /qualifications/requests/:id
   * 승인 / 거절 (operator 전용)
   */
  router.patch(
    '/requests/:id',
    requireAuth,
    requireScope('kpa:operator'),
    [
      param('id').isUUID(),
      body('status').isIn(['approved', 'rejected']),
      body('reviewNote').optional().isString().isLength({ max: 1000 }),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const qReq = await reqRepo.findOne({ where: { id: req.params.id } });
        if (!qReq) {
          res.status(404).json({ success: false, error: '신청을 찾을 수 없습니다.' });
          return;
        }
        if (qReq.status !== 'pending') {
          res.status(409).json({ success: false, error: '이미 처리된 신청입니다.' });
          return;
        }

        const newStatus = req.body.status as 'approved' | 'rejected';
        const reviewNote = req.body.reviewNote || null;
        const now = new Date();

        // 신청 이력 업데이트
        qReq.status = newStatus;
        qReq.review_note = reviewNote;
        qReq.reviewed_by = req.user!.id;
        qReq.reviewed_at = now;
        await reqRepo.save(qReq);

        // member_qualifications 상태 반영
        const qual = await qualRepo.findOne({
          where: { user_id: qReq.user_id, qualification_type: qReq.qualification_type as any },
        });

        if (qual) {
          qual.status = newStatus;
          if (newStatus === 'approved') {
            qual.approved_at = now;
            qual.rejected_at = null;
          } else {
            qual.rejected_at = now;
            qual.approved_at = null;
          }
          await qualRepo.save(qual);
        }

        // WO-O4O-INSTRUCTOR-APPLICATION-V1 + WO-LMS-CREATOR-QUALIFICATION-FLOW-REFORM-V1
        // instructor 또는 lms_creator 승인 시: instructor_profile 생성 + lms:instructor 역할 부여
        if (newStatus === 'approved' && (qReq.qualification_type === 'instructor' || qReq.qualification_type === 'lms_creator')) {
          try {
            const rd = qReq.request_data as Record<string, any>;
            const existingProfile = await profileRepo.findOne({ where: { user_id: qReq.user_id } });
            if (!existingProfile) {
              const profile = profileRepo.create({
                user_id: qReq.user_id,
                display_name: rd.displayName || rd.bio?.slice(0, 50) || '',
                organization: rd.organization || null,
                job_title: rd.jobTitle || null,
                expertise: Array.isArray(rd.expertise) ? rd.expertise : [],
                bio: rd.bio || null,
                experience: rd.experience || null,
                lecture_topics: Array.isArray(rd.lectureTopics) ? rd.lectureTopics : [],
                lecture_plan_summary: rd.lecturePlanSummary || null,
                portfolio_url: rd.portfolioUrl || null,
                is_active: true,
              });
              await profileRepo.save(profile);
            }
          } catch (profileErr) {
            console.error('[Qualification] instructor_profile creation failed:', profileErr);
            // 프로필 생성 실패는 승인 결과에 영향 없음 (로그만)
          }
          try {
            await roleAssignmentService.assignRole({
              userId: qReq.user_id,
              role: 'lms:instructor',
              assignedBy: req.user!.id,
            });
          } catch (roleErr) {
            console.error('[Qualification] lms:instructor role assignment failed:', roleErr);
            // 역할 부여 실패는 승인 결과에 영향 없음 (로그만)
          }
        }

        res.json({ success: true, data: qReq });
      } catch (error: any) {
        console.error('[Qualification] review request failed:', error);
        res.status(500).json({ success: false, error: 'Failed to process review' });
      }
    },
  );

  return router;
}

/**
 * Instructor Dashboard Controller
 * WO-O4O-INSTRUCTOR-DASHBOARD-V1
 * WO-LMS-INSTRUCTOR-DASHBOARD-QUALIFICATION-FIX-V1: lms_creator 승인 사용자 호환
 *
 * GET  /instructor/me       — 강사 자격 + 프로필 조회 (인증 필요)
 * PATCH /instructor/profile — 프로필 수정 (인증 필요, 본인만)
 */

import { Router, Response, RequestHandler } from 'express';
import { body, validationResult } from 'express-validator';
import { DataSource, In } from 'typeorm';
import type { AuthRequest } from '../../../types/auth.js';
import { MemberQualification } from '../entities/member-qualification.entity.js';
import { InstructorProfile } from '../entities/instructor-profile.entity.js';
import { QualificationRequest } from '../entities/qualification-request.entity.js';

type AuthMiddleware = RequestHandler;

// WO-LMS-INSTRUCTOR-DASHBOARD-QUALIFICATION-FIX-V1
// instructor(레거시) + lms_creator(신규) 모두 대시보드 접근 허용
const DASHBOARD_ALLOWED_QUALIFICATIONS = ['instructor', 'lms_creator'] as const;

export function createInstructorDashboardController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const qualRepo = dataSource.getRepository(MemberQualification);
  const profileRepo = dataSource.getRepository(InstructorProfile);
  const reqRepo = dataSource.getRepository(QualificationRequest);

  /**
   * GET /instructor/me
   * 강사 자격 + 프로필 조회
   * - instructor qualification status=approved 여부 포함
   * - instructor_profiles row (없을 수 있음 → null fallback)
   * - 최근 qualification_request (review_note 등 표시)
   */
  router.get(
    '/me',
    requireAuth,
    async (req: AuthRequest, res: Response): Promise<void> => {
      const userId = req.user!.id;
      try {
        const qual = await qualRepo.findOne({
          where: { user_id: userId, qualification_type: In(DASHBOARD_ALLOWED_QUALIFICATIONS) as any },
          order: { approved_at: 'DESC' },
        });

        if (!qual || qual.status !== 'approved') {
          res.status(403).json({
            success: false,
            error: '강사 자격이 없습니다.',
            code: 'NOT_QUALIFIED',
          });
          return;
        }

        const profile = await profileRepo.findOne({ where: { user_id: userId } });

        // 최근 승인된 신청 내역 (review_note 표시용)
        const latestRequest = await reqRepo.findOne({
          where: { user_id: userId, qualification_type: In(DASHBOARD_ALLOWED_QUALIFICATIONS) as any, status: 'approved' },
          order: { reviewed_at: 'DESC' },
        });

        res.json({
          success: true,
          data: {
            qualification: {
              status: qual.status,
              requestedAt: qual.requested_at,
              approvedAt: qual.approved_at,
            },
            profile: profile
              ? {
                  displayName: profile.display_name,
                  organization: profile.organization,
                  jobTitle: profile.job_title,
                  expertise: profile.expertise,
                  bio: profile.bio,
                  experience: profile.experience,
                  lecturePlanSummary: profile.lecture_plan_summary,
                  lectureTopics: profile.lecture_topics,
                  portfolioUrl: profile.portfolio_url,
                  isActive: profile.is_active,
                }
              : null,
            latestRequest: latestRequest
              ? {
                  reviewNote: latestRequest.review_note,
                  reviewedAt: latestRequest.reviewed_at,
                }
              : null,
          },
        });
      } catch (error: any) {
        console.error('[InstructorDashboard] GET /me failed:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch instructor data' });
      }
    },
  );

  /**
   * PATCH /instructor/profile
   * 강사 프로필 수정 (본인만)
   */
  router.patch(
    '/profile',
    requireAuth,
    [
      body('displayName').optional().isString().trim().isLength({ min: 1, max: 200 }),
      body('organization').optional({ nullable: true }).isString().isLength({ max: 200 }),
      body('jobTitle').optional({ nullable: true }).isString().isLength({ max: 100 }),
      body('expertise').optional().isArray(),
      body('expertise.*').optional().isString(),
      body('bio').optional({ nullable: true }).isString(),
      body('experience').optional({ nullable: true }).isString(),
      body('lectureTopics').optional().isArray(),
      body('lectureTopics.*').optional().isString(),
      body('lecturePlanSummary').optional({ nullable: true }).isString(),
      body('portfolioUrl').optional({ nullable: true }).isString().isLength({ max: 500 }),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
        return;
      }

      const userId = req.user!.id;
      try {
        // 자격 확인
        const qual = await qualRepo.findOne({
          where: { user_id: userId, qualification_type: In(DASHBOARD_ALLOWED_QUALIFICATIONS) as any },
          order: { approved_at: 'DESC' },
        });
        if (!qual || qual.status !== 'approved') {
          res.status(403).json({ success: false, error: '강사 자격이 없습니다.', code: 'NOT_QUALIFIED' });
          return;
        }

        const profile = await profileRepo.findOne({ where: { user_id: userId } });
        if (!profile) {
          res.status(404).json({ success: false, error: '강사 프로필이 존재하지 않습니다.', code: 'PROFILE_NOT_FOUND' });
          return;
        }

        const {
          displayName, organization, jobTitle, expertise,
          bio, experience, lectureTopics, lecturePlanSummary, portfolioUrl,
        } = req.body;

        if (displayName !== undefined) profile.display_name = displayName;
        if (organization !== undefined) profile.organization = organization;
        if (jobTitle !== undefined) profile.job_title = jobTitle;
        if (expertise !== undefined) profile.expertise = expertise;
        if (bio !== undefined) profile.bio = bio;
        if (experience !== undefined) profile.experience = experience;
        if (lectureTopics !== undefined) profile.lecture_topics = lectureTopics;
        if (lecturePlanSummary !== undefined) profile.lecture_plan_summary = lecturePlanSummary;
        if (portfolioUrl !== undefined) profile.portfolio_url = portfolioUrl;

        await profileRepo.save(profile);

        res.json({
          success: true,
          data: {
            displayName: profile.display_name,
            organization: profile.organization,
            jobTitle: profile.job_title,
            expertise: profile.expertise,
            bio: profile.bio,
            experience: profile.experience,
            lecturePlanSummary: profile.lecture_plan_summary,
            lectureTopics: profile.lecture_topics,
            portfolioUrl: profile.portfolio_url,
          },
        });
      } catch (error: any) {
        console.error('[InstructorDashboard] PATCH /profile failed:', error);
        res.status(500).json({ success: false, error: 'Failed to update profile' });
      }
    },
  );

  return router;
}

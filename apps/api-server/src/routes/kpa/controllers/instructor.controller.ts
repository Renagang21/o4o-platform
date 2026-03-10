/**
 * KPA Instructor Qualification Controller
 * 강사 자격 관리 API 엔드포인트 (Q1-Q7)
 *
 * WO-O4O-ROUTES-REFACTOR-V1: Extracted from kpa.routes.ts
 * WO-KPA-B-LMS-GUARD-BYPASS-AUDIT-AND-IMPLEMENTATION-V1 origin
 * WO-PLATFORM-APPROVAL-ENGINE-UNIFICATION-V1: → kpa_approval_requests
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { InstructorService } from '../services/instructor.service.js';

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

/** Helper: service result → HTTP response (error branch) */
function isServiceError(result: any): result is { error: { code: string; message: string; httpStatus: number } } {
  return result && typeof result === 'object' && 'error' in result;
}

export function createInstructorController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  requireKpaScope: (scope: string) => RequestHandler,
): Router {
  const router = Router();
  const service = new InstructorService(dataSource);

  // ── Q1: POST /instructor-qualifications — 강사 자격 신청 ──────────

  router.post(
    '/instructor-qualifications',
    requireAuth as any,
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

      const result = await service.applyQualification(user.id, organizationId, {
        qualificationType,
        licenseNumber,
        specialtyArea,
        teachingExperienceYears,
        supportingDocuments,
        applicantNote,
        userName: user.name || user.email || 'Unknown',
        userEmail: user.email || null,
      });

      if (isServiceError(result)) {
        res.status(result.error.httpStatus).json({ success: false, error: { code: result.error.code, message: result.error.message } });
        return;
      }

      res.status(201).json({ success: true, data: { qualificationId: result.qualificationId, status: 'pending' } });
    }),
  );

  // ── Q2: GET /instructor-qualifications/me — 내 자격 현황 ──────────

  router.get(
    '/instructor-qualifications/me',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user;
      const data = await service.getMyQualification(user.id);
      res.json({ success: true, data });
    }),
  );

  // ── Q3: GET /branches/:branchId/instructor-qualifications — 분회 내 자격 목록 ──

  router.get(
    '/branches/:branchId/instructor-qualifications',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId } = req.params;
      const user = (req as any).user;
      if (!UUID_RE.test(branchId)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid branch ID' } }); return; }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } }); return;
      }

      const { status: statusFilter } = req.query;
      const data = await service.listQualifications(branchId, { status: statusFilter as string | undefined });
      res.json({ success: true, data });
    }),
  );

  // ── Q4: GET /branches/:branchId/instructor-qualifications/pending — 대기 중 자격만 ──

  router.get(
    '/branches/:branchId/instructor-qualifications/pending',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId } = req.params;
      const user = (req as any).user;
      if (!UUID_RE.test(branchId)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid branch ID' } }); return; }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } }); return;
      }

      const data = await service.getPendingQualifications(branchId);
      res.json({ success: true, data });
    }),
  );

  // ── Q5: PATCH /branches/:branchId/instructor-qualifications/:id/approve — 승인 ──

  router.patch(
    '/branches/:branchId/instructor-qualifications/:id/approve',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId, id } = req.params;
      const user = (req as any).user;
      if (!UUID_RE.test(branchId) || !UUID_RE.test(id)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } }); return; }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } }); return;
      }

      const result = await service.approveQualification(branchId, id, user.id, req.body.reviewComment || null);

      if (isServiceError(result)) {
        res.status(result.error.httpStatus).json({ success: false, error: { code: result.error.code, message: result.error.message } });
        return;
      }

      res.json({ success: true, data: result });
    }),
  );

  // ── Q6: PATCH /branches/:branchId/instructor-qualifications/:id/reject — 거절 ──

  router.patch(
    '/branches/:branchId/instructor-qualifications/:id/reject',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId, id } = req.params;
      const user = (req as any).user;
      const { rejectionReason } = req.body;
      if (!UUID_RE.test(branchId) || !UUID_RE.test(id)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } }); return; }
      if (!rejectionReason) { res.status(400).json({ success: false, error: { code: 'REASON_REQUIRED', message: 'rejectionReason is required' } }); return; }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } }); return;
      }

      const result = await service.rejectQualification(branchId, id, user.id, rejectionReason);

      if (isServiceError(result)) {
        res.status(result.error.httpStatus).json({ success: false, error: { code: result.error.code, message: result.error.message } });
        return;
      }

      res.json({ success: true, data: result });
    }),
  );

  // ── Q7: PATCH /branches/:branchId/instructor-qualifications/:id/revoke — 해지 ──

  router.patch(
    '/branches/:branchId/instructor-qualifications/:id/revoke',
    requireAuth as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { branchId, id } = req.params;
      const user = (req as any).user;
      const { revokeReason } = req.body;
      if (!UUID_RE.test(branchId) || !UUID_RE.test(id)) { res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } }); return; }
      if (!revokeReason) { res.status(400).json({ success: false, error: { code: 'REASON_REQUIRED', message: 'revokeReason is required' } }); return; }
      if (!(await verifyBranchAdmin(dataSource, user.id, branchId, user.roles || []))) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' } }); return;
      }

      const result = await service.revokeQualification(branchId, id, user.id, revokeReason);

      if (isServiceError(result)) {
        res.status(result.error.httpStatus).json({ success: false, error: { code: result.error.code, message: result.error.message } });
        return;
      }

      res.json({ success: true, data: result });
    }),
  );

  return router;
}

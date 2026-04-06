/**
 * KPA Mypage Controller
 *
 * WO-O4O-ROUTES-REFACTOR-V1: Extracted from kpa.routes.ts (lines 2601-2781)
 *
 * Routes:
 * - GET /profile          (authenticate) — Full user profile
 * - PUT /profile          (authenticate) — Update profile
 * - GET /settings         (authenticate) — Settings (placeholder)
 * - PUT /settings         (authenticate) — Update settings (placeholder)
 * - GET /activities       (authenticate) — Activities (placeholder)
 * - GET /summary          (authenticate) — Summary stats (placeholder)
 * - GET /enrollments      (authenticate) — Delegates to EnrollmentController
 * - GET /certificates     (authenticate) — Delegates to CertificateController
 * - GET /groupbuys        (authenticate) — Groupbuys (placeholder)
 * - GET /my-requests      (authenticate) — Unified approval requests (WO-KPA-A-MYPAGE-UNIFIED-REQUEST-INBOX-V1)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { MypageService } from '../services/mypage.service.js';
import { EnrollmentController } from '../../../modules/lms/controllers/EnrollmentController.js';
import { CertificateController } from '../../../modules/lms/controllers/CertificateController.js';

export function createMypageController(
  dataSource: DataSource,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  const service = new MypageService(dataSource);

  /**
   * GET /profile — Full user profile with pharmacist/pharmacy/organization info
   */
  router.get('/profile', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.id) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const data = await service.getProfile(user.id);

    res.json({
      success: true,
      data,
    });
  }));

  /**
   * PUT /profile — Update user profile
   */
  router.put('/profile', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.id) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { name, lastName, firstName, phone, university, workplace } = req.body;
    const data = await service.updateProfile(user.id, { name, lastName, firstName, phone, university, workplace }, user);

    res.json({
      success: true,
      data,
    });
  }));

  /**
   * GET /settings — User settings (placeholder)
   */
  router.get('/settings', authenticate, (req: Request, res: Response) => {
    res.json({
      success: true,
      data: service.getSettings(),
    });
  });

  /**
   * PUT /settings — Update settings (placeholder)
   */
  router.put('/settings', authenticate, (req: Request, res: Response) => {
    const result = service.updateSettings();
    res.json({ success: true, message: result.message });
  });

  /**
   * GET /activities — User activities (placeholder)
   */
  router.get('/activities', authenticate, (req: Request, res: Response) => {
    const result = service.getActivities();
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * GET /summary — User summary stats (placeholder)
   */
  router.get('/summary', authenticate, (req: Request, res: Response) => {
    res.json({
      success: true,
      data: service.getSummary(),
    });
  });

  /**
   * GET /enrollments — Delegates to EnrollmentController.getMyEnrollments
   */
  router.get('/enrollments', authenticate, asyncHandler(EnrollmentController.getMyEnrollments));

  /**
   * GET /certificates — Delegates to CertificateController.getMyCertificates
   */
  router.get('/certificates', authenticate, asyncHandler(CertificateController.getMyCertificates));

  /**
   * GET /my-requests — Unified approval requests
   * WO-KPA-A-MYPAGE-UNIFIED-REQUEST-INBOX-V1
   */
  router.get('/my-requests', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.id) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { entityType, status } = req.query as { entityType?: string; status?: string };
    const data = await service.listMyRequests(user.id, { entityType, status });

    res.json({
      success: true,
      data,
    });
  }));

  return router;
}

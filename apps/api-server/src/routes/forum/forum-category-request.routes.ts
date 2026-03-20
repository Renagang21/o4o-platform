/**
 * Forum Category Request Routes
 *
 * WO-O4O-FORUM-REQUEST-UNIFICATION-PHASE1-V1
 * 포럼 카테고리 생성 요청 공통 API
 *
 * Mount: /api/v1/forum/category-requests
 *
 * 사용자 API:
 *   POST   /                     - 신청 생성
 *   GET    /my                   - 내 신청 목록
 *   GET    /:id                  - 신청 상세
 *   PATCH  /:id                  - 신청 수정 (pending/revision_requested만)
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { forumCategoryRequestService } from '../../services/forum/ForumCategoryRequestService.js';
import type { AuthRequest } from '../../types/auth.js';
import { isServiceAdmin } from '../../utils/role.utils.js';
import type { ServiceKey } from '../../types/roles.js';

const router: Router = Router();

// ============================================================================
// USER ROUTES (authenticated)
// ============================================================================

/** POST / — 신청 생성 */
router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as AuthRequest).user!;
    const { serviceCode, organizationId, name, description, reason, forumType, iconEmoji, iconUrl, tags, metadata } = req.body;

    if (!serviceCode) {
      res.status(400).json({ success: false, error: 'serviceCode is required' });
      return;
    }

    const result = await forumCategoryRequestService.create(
      { id: user.id, name: user.name, email: user.email },
      { serviceCode, organizationId, name, description, reason, forumType, iconEmoji, iconUrl, tags, metadata },
    );

    if ('error' in result) {
      res.status(result.error.status).json({ success: false, error: result.error.message, code: result.error.code });
      return;
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** GET /my — 내 신청 목록 */
router.get('/my', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as AuthRequest).user!;
    const serviceCode = req.query.serviceCode as string;
    const organizationId = req.query.organizationId as string | undefined;

    if (!serviceCode) {
      res.status(400).json({ success: false, error: 'serviceCode query param is required' });
      return;
    }

    const result = await forumCategoryRequestService.listMy(user.id, serviceCode, organizationId);

    if ('error' in result) {
      res.status(result.error.status).json({ success: false, error: result.error.message });
      return;
    }

    res.json({ success: true, data: result.data, total: result.data.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** GET /:id — 신청 상세 */
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as AuthRequest).user!;
    const serviceCode = req.query.serviceCode as string;

    if (!serviceCode) {
      res.status(400).json({ success: false, error: 'serviceCode query param is required' });
      return;
    }

    const result = await forumCategoryRequestService.getDetail(req.params.id, serviceCode);

    if ('error' in result) {
      res.status(result.error.status).json({ success: false, error: result.error.message, code: result.error.code });
      return;
    }

    // 소유자 또는 서비스 관리자만 조회 가능
    const isOwner = result.data.requesterId === user.id;
    const isAdmin = isServiceAdmin(user.roles || [], serviceCode as ServiceKey);
    if (!isOwner && !isAdmin) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    res.json({ success: true, data: result.data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** PATCH /:id — 신청 수정 (pending/revision_requested만) */
router.patch('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as AuthRequest).user!;
    const serviceCode = req.body.serviceCode as string;

    if (!serviceCode) {
      res.status(400).json({ success: false, error: 'serviceCode is required' });
      return;
    }

    const result = await forumCategoryRequestService.update(
      req.params.id,
      user.id,
      serviceCode,
      req.body,
    );

    if ('error' in result) {
      res.status(result.error.status).json({ success: false, error: result.error.message, code: result.error.code });
      return;
    }

    res.json({ success: true, data: result.data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

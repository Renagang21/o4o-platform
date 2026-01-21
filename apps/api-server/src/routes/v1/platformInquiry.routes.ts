/**
 * Platform Inquiry Routes
 *
 * 공개 API:
 * - POST /api/v1/platform/inquiries - 문의 제출
 *
 * 관리자 API:
 * - GET /api/v1/admin/platform/inquiries - 문의 목록
 * - GET /api/v1/admin/platform/inquiries/:id - 문의 상세
 * - PATCH /api/v1/admin/platform/inquiries/:id - 문의 업데이트
 */

import { Router } from 'express';
import {
  submitInquiry,
  listInquiries,
  getInquiry,
  updateInquiry,
} from '../../controllers/platformInquiryController.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';

const router = Router();

// 공개 API - 문의 제출 (인증 불필요)
router.post('/inquiries', submitInquiry);

export default router;

// 관리자 라우터 (별도 export)
export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireRole(['admin', 'super_admin']));

adminRouter.get('/inquiries', listInquiries);
adminRouter.get('/inquiries/:id', getInquiry);
adminRouter.patch('/inquiries/:id', updateInquiry);

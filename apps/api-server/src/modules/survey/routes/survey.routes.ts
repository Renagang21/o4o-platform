/**
 * Survey Routes — /api/v1/surveys
 * WO-O4O-SURVEY-CORE-PHASE1-V1
 */

import { Router } from 'express';
import { SurveyController } from '../controllers/SurveyController.js';
import { SurveyResponseController } from '../controllers/SurveyResponseController.js';
import { SurveyResultController } from '../controllers/SurveyResultController.js';
import { requireAuth, optionalAuth } from '../../../common/middleware/auth.middleware.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { requireSurveyOwner } from '../middleware/requireSurveyOwner.js';

const router: Router = Router();

// ─── CRUD ───────────────────────────────────────────────────────────────────

// GET /api/v1/surveys — 목록 (visibility 필터, audience=for-me/mine)
router.get('/', optionalAuth, asyncHandler(SurveyController.list));

// POST /api/v1/surveys — 생성 (로그인 필요)
router.post('/', requireAuth, asyncHandler(SurveyController.create));

// GET /api/v1/surveys/:id — 상세 (질문 포함). visibility 검증은 응답 단계에서 별도.
router.get('/:id', optionalAuth, asyncHandler(SurveyController.get));

// PATCH /api/v1/surveys/:id — 수정 (작성자 또는 admin)
router.patch('/:id', requireAuth, requireSurveyOwner, asyncHandler(SurveyController.update));

// DELETE /api/v1/surveys/:id — 삭제 (작성자 또는 admin)
router.delete('/:id', requireAuth, requireSurveyOwner, asyncHandler(SurveyController.remove));

// ─── Responses ──────────────────────────────────────────────────────────────

// POST /api/v1/surveys/:id/responses — 응답 제출 (익명/기명)
router.post('/:id/responses', optionalAuth, asyncHandler(SurveyResponseController.submit));

// GET /api/v1/surveys/:id/my-response — 내 응답 (기명: userId, 익명: ?anonymousToken=)
router.get('/:id/my-response', optionalAuth, asyncHandler(SurveyResponseController.getMine));

// ─── Results ────────────────────────────────────────────────────────────────

// GET /api/v1/surveys/:id/results — 집계 결과 (작성자/admin)
router.get('/:id/results', requireAuth, requireSurveyOwner, asyncHandler(SurveyResultController.getResults));

export default router;

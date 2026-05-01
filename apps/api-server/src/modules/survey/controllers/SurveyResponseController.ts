/**
 * SurveyResponseController — 응답 제출/조회
 * WO-O4O-SURVEY-CORE-PHASE1-V1
 */

import type { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { SurveyService } from '../services/SurveyService.js';
import { SurveyResponseService } from '../services/SurveyResponseService.js';
import logger from '../../../utils/logger.js';

export class SurveyResponseController extends BaseController {
  /** POST /api/v1/surveys/:id/responses */
  static async submit(req: Request, res: Response): Promise<any> {
    try {
      const surveyId = req.params.id;
      const userId = (req as any).user?.id;
      const organizationId = (req as any).organizationId ?? (req as any).user?.organizationId;
      const body = req.body ?? {};

      const result = await SurveyService.getInstance().getSurveyWithQuestions(surveyId);
      if (!result) return BaseController.notFound(res, 'Survey not found');
      const { survey } = result;

      // 응답 자격 검증
      const access = await SurveyService.getInstance().checkAccess(survey, userId, organizationId);
      if (!access.allowed) {
        return BaseController.forbidden(res, access.reason ?? 'access denied');
      }

      // 익명/기명 결정
      // - allowAnonymous=true이고 userId 없거나 anonymousToken 있는 경우 익명
      // - 그 외 기명
      const isAnonymous = !!survey.allowAnonymous && (!userId || !!body.anonymousToken);
      if (isAnonymous && !body.anonymousToken) {
        return BaseController.error(res, new Error('anonymousToken required for anonymous response'), 400);
      }
      if (!isAnonymous && !userId) {
        return BaseController.error(res, new Error('login required'), 401);
      }

      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const response = await SurveyResponseService.getInstance().submitResponse(
        surveyId,
        userId,
        organizationId,
        survey.serviceKey,
        body,
        isAnonymous,
        ipAddress,
        userAgent,
      );

      return BaseController.created(res, { response });
    } catch (e: any) {
      logger.error('[SurveyResponseController.submit]', { error: e.message });
      // 중복 응답 (UNIQUE violation 또는 명시적 throw)
      if (e.message?.includes('이미 응답한 설문') || e.message?.includes('duplicate key') || e.code === '23505') {
        return BaseController.error(res, new Error('이미 응답한 설문입니다'), 409);
      }
      return BaseController.error(res, e);
    }
  }

  /** GET /api/v1/surveys/:id/my-response */
  static async getMine(req: Request, res: Response): Promise<any> {
    try {
      const surveyId = req.params.id;
      const userId = (req as any).user?.id;
      const anonymousToken = (req.query.anonymousToken as string) || undefined;
      const response = await SurveyResponseService.getInstance().getMyResponse(surveyId, userId, anonymousToken);
      return BaseController.ok(res, { response });
    } catch (e: any) {
      logger.error('[SurveyResponseController.getMine]', { error: e.message });
      return BaseController.error(res, e);
    }
  }
}

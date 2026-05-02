import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import {
  LmsAIService,
  type LmsAiKind,
  type AIAnalyzeResult,
} from '../services/LmsAIService.js';
import logger from '../../../utils/logger.js';

/**
 * AIController
 *
 * WO-O4O-LMS-AI-MINIMAL-V1
 *
 * Single endpoint:
 *   POST /api/v1/ai/analyze
 *   Body: { type: 'quiz' | 'live' | 'assignment', payload: {...} }
 *   Response: { summary, insights[], recommendations[] }
 */
export class AIController extends BaseController {
  static async analyze(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return BaseController.unauthorized(res, 'User not authenticated');

      const { type, payload } = (req.body || {}) as { type?: LmsAiKind; payload?: any };
      if (!type || !payload) {
        return BaseController.error(res, 'type and payload are required', 400);
      }

      const service = LmsAIService.getInstance();
      let result: AIAnalyzeResult;

      switch (type) {
        case 'quiz':
          if (!Array.isArray(payload.questions) || !Array.isArray(payload.userAnswers)) {
            return BaseController.error(res, 'quiz payload requires questions[] and userAnswers[]', 400);
          }
          result = await service.analyzeQuiz(payload);
          break;

        case 'live':
          if (typeof payload.title !== 'string' || payload.title.trim().length === 0) {
            return BaseController.error(res, 'live payload requires non-empty title', 400);
          }
          result = await service.summarizeLive(payload);
          break;

        case 'assignment':
          if (typeof payload.submissionContent !== 'string' || payload.submissionContent.trim().length === 0) {
            return BaseController.error(res, 'assignment payload requires non-empty submissionContent', 400);
          }
          result = await service.feedbackAssignment(payload);
          break;

        default:
          return BaseController.error(res, `unsupported type: ${type}`, 400);
      }

      return BaseController.ok(res, result);
    } catch (error: any) {
      logger.error('[AIController.analyze] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}

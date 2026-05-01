/**
 * SurveyResultController — 집계/응답 목록
 * WO-O4O-SURVEY-CORE-PHASE1-V1
 */

import type { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { SurveyAggregationService } from '../services/SurveyAggregationService.js';
import logger from '../../../utils/logger.js';

export class SurveyResultController extends BaseController {
  /** GET /api/v1/surveys/:id/results */
  static async getResults(req: Request, res: Response): Promise<any> {
    try {
      const result = await SurveyAggregationService.getInstance().aggregate(req.params.id);
      return BaseController.ok(res, result);
    } catch (e: any) {
      logger.error('[SurveyResultController.getResults]', { error: e.message });
      return BaseController.error(res, e);
    }
  }
}

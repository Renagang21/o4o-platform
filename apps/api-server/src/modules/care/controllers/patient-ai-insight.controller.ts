/**
 * Patient AI Insight Controller
 * WO-GLUCOSEVIEW-AI-GLUCOSE-INSIGHT-V1
 *
 * 환자 전용 on-demand AI 인사이트.
 * authenticate만 사용 (pharmacyContext 불요).
 *
 * Routes:
 *   GET /patient/ai-insight — 환자 AI 인사이트 조회/생성
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../../middleware/auth.middleware.js';
import { PatientAiInsightService } from '../services/llm/patient-ai-insight.service.js';

export function createPatientAiInsightRouter(dataSource: DataSource): Router {
  const router = Router();
  const service = new PatientAiInsightService(dataSource);

  /**
   * GET /patient/ai-insight — 환자 AI 인사이트
   */
  router.get('/patient/ai-insight', authenticate, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;

      if (!user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const result = await service.getOrGenerate(user.id);

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[PatientAiInsight] controller error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get AI insight' },
      });
    }
  });

  return router;
}

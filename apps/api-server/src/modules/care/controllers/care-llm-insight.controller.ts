import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { CareLlmInsightService } from '../services/llm/care-llm-insight.service.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { createPharmacyContextMiddleware } from '../care-pharmacy-context.middleware.js';
import type { PharmacyContextRequest } from '../care-pharmacy-context.middleware.js';

/**
 * Care LLM Insight Controller — WO-O4O-CARE-LLM-INSIGHT-V1
 *
 * GET /llm-insight/:patientId — 캐시된 LLM 인사이트 조회
 */
export function createCareLlmInsightRouter(dataSource: DataSource): Router {
  const router = Router();
  const llmInsightService = new CareLlmInsightService(dataSource);
  const requirePharmacyContext = createPharmacyContextMiddleware(dataSource);

  // GET /llm-insight/:patientId — retrieve latest cached LLM insight
  router.get('/llm-insight/:patientId', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const { patientId } = req.params;
      const pharmacyId = pcReq.pharmacyId;

      const insight = await llmInsightService.getLatestInsight(patientId, pharmacyId);
      res.json(insight);
    } catch (error) {
      res.status(500).json({ message: 'LLM insight retrieval error' });
    }
  });

  return router;
}

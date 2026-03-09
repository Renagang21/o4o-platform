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

  // GET /llm-insight/health — AI 시스템 진단 (WO-O4O-CARE-AI-EXPLANATION-LAYER-V1)
  router.get('/llm-insight/health', async (_req, res) => {
    try {
      // 1. GEMINI_API_KEY 환경변수
      const envKeySet = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);

      // 2. ai_settings DB 레코드
      let dbKeyActive = false;
      try {
        const rows = await dataSource.query(
          `SELECT isactive FROM ai_settings WHERE provider = 'gemini' LIMIT 1`,
        );
        dbKeyActive = rows[0]?.isactive === true;
      } catch { /* table may not exist */ }

      // 3. ai_model_settings
      let model = 'gemini-2.0-flash';
      try {
        const rows = await dataSource.query(
          `SELECT model FROM ai_model_settings WHERE service = 'care' LIMIT 1`,
        );
        if (rows[0]?.model) model = rows[0].model;
      } catch { /* table may not exist */ }

      // 4. care_llm_insights 건수
      let totalInsights = 0;
      try {
        const rows = await dataSource.query(
          `SELECT COUNT(*)::int AS cnt FROM care_llm_insights`,
        );
        totalInsights = rows[0]?.cnt || 0;
      } catch { /* table may not exist */ }

      // 5. care_coaching_drafts 건수
      let totalDrafts = 0;
      try {
        const rows = await dataSource.query(
          `SELECT COUNT(*)::int AS cnt FROM care_coaching_drafts`,
        );
        totalDrafts = rows[0]?.cnt || 0;
      } catch { /* table may not exist */ }

      res.json({
        success: true,
        data: {
          geminiKeyConfigured: envKeySet || dbKeyActive,
          envKeySet,
          dbKeyActive,
          model,
          totalInsights,
          totalDrafts,
          status: (envKeySet || dbKeyActive) ? 'ready' : 'missing_api_key',
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'AI health check failed' });
    }
  });

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

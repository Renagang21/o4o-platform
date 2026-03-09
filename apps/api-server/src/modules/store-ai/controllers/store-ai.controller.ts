import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { StoreAiSnapshotService } from '../services/store-ai-snapshot.service.js';
import { StoreAiInsightService } from '../services/store-ai-insight.service.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';

/**
 * Store AI Controller — WO-O4O-STORE-HUB-AI-SUMMARY-V1
 *
 * GET  /health               — AI 시스템 진단 (public)
 * POST /snapshot              — 스냅샷 생성 + AI 인사이트 트리거 (authenticated + store owner)
 * GET  /summary               — 최신 AI 인사이트 조회 (authenticated + store owner)
 */
export function createStoreAiRouter(dataSource: DataSource): Router {
  const router = Router();
  const snapshotService = new StoreAiSnapshotService(dataSource);
  const insightService = new StoreAiInsightService(dataSource);
  const requireStoreOwner = createRequireStoreOwner(dataSource);

  // GET /health — AI 시스템 진단 (public)
  router.get('/health', async (_req, res) => {
    try {
      const envKeySet = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);

      let dbKeyActive = false;
      try {
        const rows = await dataSource.query(
          `SELECT isactive FROM ai_settings WHERE provider = 'gemini' AND isactive = true LIMIT 1`,
        );
        dbKeyActive = rows.length > 0;
      } catch { /* table may not exist */ }

      let model = 'gemini-2.0-flash';
      try {
        const rows = await dataSource.query(
          `SELECT model FROM ai_model_settings WHERE service = 'store' LIMIT 1`,
        );
        if (rows[0]?.model) model = rows[0].model;
      } catch { /* table may not exist */ }

      let totalInsights = 0;
      let lastInsightAt: string | null = null;
      try {
        const rows = await dataSource.query(
          `SELECT COUNT(*)::int AS cnt, MAX(created_at) AS last_at FROM store_ai_insights`,
        );
        totalInsights = rows[0]?.cnt || 0;
        lastInsightAt = rows[0]?.last_at ? new Date(rows[0].last_at).toISOString() : null;
      } catch { /* table may not exist */ }

      const keySource = dbKeyActive ? 'db' : envKeySet ? 'env' : 'none';

      res.json({
        success: true,
        data: {
          geminiKeyConfigured: envKeySet || dbKeyActive,
          keySource,
          model,
          totalInsights,
          lastInsightAt,
          status: (envKeySet || dbKeyActive) ? 'ready' : 'missing_api_key',
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Store AI health check failed' });
    }
  });

  // POST /snapshot — 스냅샷 생성 + AI 인사이트 (fire-and-forget)
  router.post('/snapshot', authenticate, requireStoreOwner, async (req, res) => {
    try {
      const organizationId = (req as any).organizationId as string;
      const periodDays = Number(req.body?.periodDays) || 7;

      const snapshot = await snapshotService.createOrRefreshSnapshot(organizationId, periodDays);

      // Fire-and-forget: AI 인사이트 생성
      insightService.generateAndCache(snapshot, organizationId).catch(() => {});

      res.json({ success: true, data: snapshot });
    } catch (error) {
      console.error('[StoreAI] snapshot creation error:', error);
      res.status(500).json({ success: false, error: 'Failed to create store snapshot' });
    }
  });

  // GET /summary — 최신 AI 인사이트 조회
  router.get('/summary', authenticate, requireStoreOwner, async (req, res) => {
    try {
      const organizationId = (req as any).organizationId as string;

      const insight = await insightService.getLatestInsight(organizationId);

      if (!insight) {
        res.json({
          success: true,
          data: null,
          message: 'No AI insight available yet. Create a snapshot first.',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          summary: insight.summary,
          issues: insight.issues,
          actions: insight.actions,
          model: insight.model,
          createdAt: insight.createdAt.toISOString(),
          snapshotId: insight.snapshotId,
        },
      });
    } catch (error) {
      console.error('[StoreAI] summary retrieval error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve store AI summary' });
    }
  });

  return router;
}

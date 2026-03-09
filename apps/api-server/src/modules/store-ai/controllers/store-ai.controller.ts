import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { StoreAiSnapshotService } from '../services/store-ai-snapshot.service.js';
import { StoreAiInsightService } from '../services/store-ai-insight.service.js';
import { StoreAiProductSnapshotService } from '../services/store-ai-product-snapshot.service.js';
import { StoreAiProductInsightService } from '../services/store-ai-product-insight.service.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';

/**
 * Store AI Controller
 *
 * WO-O4O-STORE-HUB-AI-SUMMARY-V1 (Store-level):
 *   GET  /health               — AI 시스템 진단 (public)
 *   POST /snapshot              — 스냅샷 생성 + AI 인사이트 트리거
 *   GET  /summary               — 최신 AI 인사이트 조회
 *
 * WO-O4O-PRODUCT-STORE-AI-INSIGHT-V1 (Product-level):
 *   POST /products/snapshot     — 상품별 스냅샷 생성 + AI 인사이트 트리거
 *   GET  /products/insight      — 최신 상품 AI 인사이트 조회
 *   GET  /products/snapshots    — 오늘 상품 스냅샷 조회
 */
export function createStoreAiRouter(dataSource: DataSource): Router {
  const router = Router();
  const snapshotService = new StoreAiSnapshotService(dataSource);
  const insightService = new StoreAiInsightService(dataSource);
  const productSnapshotService = new StoreAiProductSnapshotService(dataSource);
  const productInsightService = new StoreAiProductInsightService(dataSource);
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

      let totalProductInsights = 0;
      try {
        const rows = await dataSource.query(
          `SELECT COUNT(*)::int AS cnt FROM store_ai_product_insights`,
        );
        totalProductInsights = rows[0]?.cnt || 0;
      } catch { /* table may not exist */ }

      const keySource = dbKeyActive ? 'db' : envKeySet ? 'env' : 'none';

      res.json({
        success: true,
        data: {
          geminiKeyConfigured: envKeySet || dbKeyActive,
          keySource,
          model,
          totalInsights,
          totalProductInsights,
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

  // =========================================================================
  // WO-O4O-PRODUCT-STORE-AI-INSIGHT-V1: Product-level AI
  // =========================================================================

  // POST /products/snapshot — 상품별 스냅샷 생성 + AI 인사이트 (fire-and-forget)
  router.post('/products/snapshot', authenticate, requireStoreOwner, async (req, res) => {
    try {
      const organizationId = (req as any).organizationId as string;
      const periodDays = Number(req.body?.periodDays) || 7;

      const snapshots = await productSnapshotService.createOrRefreshSnapshots(organizationId, periodDays);

      // Fire-and-forget: AI 상품 인사이트 생성
      productInsightService.generateAndCache(snapshots, organizationId).catch(() => {});

      res.json({ success: true, data: { count: snapshots.length, snapshots } });
    } catch (error) {
      console.error('[StoreAI] product snapshot creation error:', error);
      res.status(500).json({ success: false, error: 'Failed to create product snapshots' });
    }
  });

  // GET /products/insight — 최신 상품 AI 인사이트 조회
  router.get('/products/insight', authenticate, requireStoreOwner, async (req, res) => {
    try {
      const organizationId = (req as any).organizationId as string;

      const insight = await productInsightService.getLatestInsight(organizationId);

      if (!insight) {
        res.json({
          success: true,
          data: null,
          message: 'No product AI insight available yet. Create product snapshots first.',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          summary: insight.summary,
          productHighlights: insight.productHighlights,
          issues: insight.issues,
          actions: insight.actions,
          model: insight.model,
          createdAt: insight.createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.error('[StoreAI] product insight retrieval error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve product AI insight' });
    }
  });

  // GET /products/snapshots — 오늘 상품 스냅샷 조회
  router.get('/products/snapshots', authenticate, requireStoreOwner, async (req, res) => {
    try {
      const organizationId = (req as any).organizationId as string;
      const today = new Date().toISOString().slice(0, 10);

      const snapshots = await dataSource.getRepository('StoreAiProductSnapshot').find({
        where: { organizationId, snapshotDate: today },
        order: { revenue: 'DESC' },
      });

      res.json({ success: true, data: snapshots });
    } catch (error) {
      console.error('[StoreAI] product snapshots retrieval error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve product snapshots' });
    }
  });

  return router;
}

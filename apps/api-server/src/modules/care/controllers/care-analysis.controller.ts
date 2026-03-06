import { Router } from 'express';
import type { DataSource } from 'typeorm';
import type { AnalysisProvider } from '../domain/analysis/analysis.provider.js';
import { DefaultAnalysisProvider } from '../domain/analysis/analysis.provider.js';
import { AiInsightProvider } from '../infrastructure/provider/ai-analysis.provider.js';
import { MockCgmProvider } from '../infrastructure/provider/mock-cgm.provider.js';
import { DatabaseHealthProvider } from '../infrastructure/provider/database-health.provider.js';
import type { CgmProvider } from '../domain/provider/cgm.provider.js';
import { CareKpiSnapshotService } from '../services/kpi/care-kpi-snapshot.service.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { createPharmacyContextMiddleware } from '../care-pharmacy-context.middleware.js';
import type { PharmacyContextRequest } from '../care-pharmacy-context.middleware.js';

export function createCareAnalysisRouter(dataSource: DataSource): Router {
  // CGM provider: database (real data) or mock (synthetic fallback)
  const cgmProvider: CgmProvider =
    process.env.CGM_PROVIDER === 'database'
      ? new DatabaseHealthProvider(dataSource)
      : new MockCgmProvider();

  // Analysis provider: default rule-based, env var opt-in for AI
  const provider: AnalysisProvider =
    process.env.CARE_ANALYSIS_PROVIDER === 'ai'
      ? new AiInsightProvider(cgmProvider)
      : new DefaultAnalysisProvider(cgmProvider);

  const router = Router();
  const kpiService = new CareKpiSnapshotService(dataSource);
  const requirePharmacyContext = createPharmacyContextMiddleware(dataSource);

  // GET /analysis/:patientId — run analysis + auto-record snapshot
  router.get('/analysis/:patientId', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const { patientId } = req.params;
      const pharmacyId = pcReq.pharmacyId;

      const result = await provider.analyzePatient(patientId);

      // Auto-record snapshot with pharmacy_id (fire-and-forget)
      if (pharmacyId) {
        kpiService.recordSnapshot(patientId, result, pharmacyId).catch(() => {});
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Analysis error' });
    }
  });

  // GET /kpi/:patientId — compare latest 2 snapshots (pharmacy-scoped)
  router.get('/kpi/:patientId', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const { patientId } = req.params;
      const pharmacyId = pcReq.pharmacyId;

      const kpi = await kpiService.getKpiComparison(patientId, pharmacyId);
      res.json(kpi);
    } catch (error) {
      res.status(500).json({ message: 'KPI retrieval error' });
    }
  });

  return router;
}

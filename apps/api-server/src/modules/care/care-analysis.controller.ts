import { Router } from 'express';
import type { DataSource } from 'typeorm';
import type { AnalysisProvider } from './analysis.provider.js';
import { MockAnalysisProvider } from './mock-analysis.provider.js';
import { AiInsightProvider } from './ai-analysis.provider.js';
import { CareKpiSnapshotService } from './care-kpi-snapshot.service.js';

// Provider selection: default Mock, env var opt-in for AI
const provider: AnalysisProvider =
  process.env.CARE_ANALYSIS_PROVIDER === 'ai'
    ? new AiInsightProvider()
    : new MockAnalysisProvider();

export function createCareAnalysisRouter(dataSource: DataSource): Router {
  const router = Router();
  const kpiService = new CareKpiSnapshotService(dataSource);

  // GET /analysis/:patientId — run analysis + auto-record snapshot
  router.get('/analysis/:patientId', async (req, res) => {
    try {
      const { patientId } = req.params;
      const result = await provider.analyzePatient(patientId);

      // Auto-record snapshot (fire-and-forget, don't block response)
      kpiService.recordSnapshot(patientId, result).catch(() => {});

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Analysis error' });
    }
  });

  // GET /kpi/:patientId — compare latest 2 snapshots
  router.get('/kpi/:patientId', async (req, res) => {
    try {
      const { patientId } = req.params;
      const kpi = await kpiService.getKpiComparison(patientId);
      res.json(kpi);
    } catch (error) {
      res.status(500).json({ message: 'KPI retrieval error' });
    }
  });

  return router;
}

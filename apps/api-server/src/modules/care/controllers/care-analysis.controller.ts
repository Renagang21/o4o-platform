import { Router } from 'express';
import type { DataSource } from 'typeorm';
import type { AnalysisProvider } from '../domain/analysis/analysis.provider.js';
import { DefaultAnalysisProvider } from '../domain/analysis/analysis.provider.js';
import { MultiMetricAnalysisProvider } from '../domain/analysis/multi-metric-analysis.provider.js';
import { AiInsightProvider } from '../infrastructure/provider/ai-analysis.provider.js';
import { MockCgmProvider } from '../infrastructure/provider/mock-cgm.provider.js';
import { DatabaseHealthProvider } from '../infrastructure/provider/database-health.provider.js';
import { DatabaseHealthMetricProvider } from '../infrastructure/provider/database-health-metric.provider.js';
import { FallbackCgmProvider } from '../infrastructure/provider/fallback-cgm.provider.js';
import type { CgmProvider } from '../domain/provider/cgm.provider.js';
import { CareKpiSnapshotService } from '../services/kpi/care-kpi-snapshot.service.js';
import { CareLlmInsightService } from '../services/llm/care-llm-insight.service.js';
import { CareCoachingDraftService } from '../services/llm/care-coaching-draft.service.js';
import { CareAlertService } from '../services/care-alert.service.js';
import { mapTimeAnalysisToActions } from '../domain/analysis/time-action.mapper.js';
import { CareActionService } from '../services/care-action.service.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { createPharmacyContextMiddleware } from '../care-pharmacy-context.middleware.js';
import type { PharmacyContextRequest } from '../care-pharmacy-context.middleware.js';

export function createCareAnalysisRouter(dataSource: DataSource): Router {
  // CGM provider: database (real data with mock fallback) or mock-only
  // WO-O4O-CARE-DATABASE-PROVIDER-ACTIVATION-V1
  const cgmProvider: CgmProvider =
    process.env.CGM_PROVIDER === 'database'
      ? new FallbackCgmProvider(
          new DatabaseHealthProvider(dataSource),
          new MockCgmProvider(),
        )
      : new MockCgmProvider();

  // Base analysis provider: default rule-based, env var opt-in for AI
  const baseProvider: AnalysisProvider =
    process.env.CARE_ANALYSIS_PROVIDER === 'ai'
      ? new AiInsightProvider(cgmProvider)
      : new DefaultAnalysisProvider(cgmProvider);

  // WO-O4O-CARE-MULTI-METRIC-ANALYSIS-V1
  // Multi-metric wrapper: enriches base analysis with BP + Weight + metabolic risk
  const provider: AnalysisProvider =
    process.env.CARE_MULTI_METRIC === 'true'
      ? new MultiMetricAnalysisProvider(
          baseProvider,
          new DatabaseHealthMetricProvider(dataSource),
        )
      : baseProvider;

  const router = Router();
  const kpiService = new CareKpiSnapshotService(dataSource);
  const llmInsightService = new CareLlmInsightService(dataSource);
  const coachingDraftService = new CareCoachingDraftService(dataSource);
  const alertService = new CareAlertService(dataSource);
  const actionService = new CareActionService(dataSource);
  const requirePharmacyContext = createPharmacyContextMiddleware(dataSource);

  // GET /analysis/:patientId — run analysis + auto-record snapshot
  router.get('/analysis/:patientId', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const { patientId } = req.params;
      const pharmacyId = pcReq.pharmacyId;

      // Patient ownership guard: verify patient belongs to this pharmacy
      if (pharmacyId) {
        const ownerCheck = await dataSource.query(
          `SELECT id, organization_id, pharmacist_id FROM glucoseview_customers WHERE (user_id = $1 OR id = $1) LIMIT 1`,
          [patientId],
        );
        if (ownerCheck.length === 0) {
          console.warn('[CareAnalysis] scope-guard: patient not found', { patientId, pharmacyId });
          return res.status(403).json({
            success: false,
            error: { code: 'PATIENT_NOT_IN_PHARMACY', message: 'Patient not found in your pharmacy' },
          });
        }
        const patient = ownerCheck[0];
        const orgMatch = patient.organization_id === pharmacyId;
        const pharmacistFallback = !orgMatch && patient.pharmacist_id === pcReq.user?.id;
        if (!orgMatch && !pharmacistFallback) {
          console.warn('[CareAnalysis] scope-guard: ownership mismatch', {
            patientId, pharmacyId, patientOrgId: patient.organization_id, userId: pcReq.user?.id,
          });
          return res.status(403).json({
            success: false,
            error: { code: 'PATIENT_NOT_IN_PHARMACY', message: 'Patient not found in your pharmacy' },
          });
        }
      }

      const result = await provider.analyzePatient(patientId);

      // Auto-record snapshot + chain LLM insight + coaching draft (fire-and-forget, parallel)
      // WO-O4O-CARE-LLM-INSIGHT-V1 + WO-O4O-CARE-AI-COACHING-DRAFT-V1
      if (pharmacyId) {
        kpiService
          .recordSnapshot(patientId, result, pharmacyId)
          .then((snapshot) => {
            llmInsightService.generateAndCache(snapshot, result, pharmacyId).catch(() => {});
            coachingDraftService.generateAndCache(snapshot, result, pharmacyId).catch(() => {});
            alertService.evaluateAndCreate(patientId, result, pharmacyId).catch(() => {});
          })
          .catch(() => {});
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Analysis error' });
    }
  });

  // GET /analysis/time-based/:patientId — time-bucket analysis (WO-O4O-CARE-TIME-BASED-ANALYSIS-V1)
  router.get('/analysis/time-based/:patientId', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const { patientId } = req.params;
      const pharmacyId = pcReq.pharmacyId;
      const days = Math.min(Number(req.query.days) || 14, 90);

      const pharmacyFilter = pharmacyId ? 'AND pharmacy_id = $2' : '';
      const params: unknown[] = pharmacyId ? [patientId, pharmacyId] : [patientId];

      // Q1: Time-of-day glucose buckets
      const timeBuckets = await dataSource.query(`
        SELECT
          CASE
            WHEN EXTRACT(HOUR FROM measured_at) >= 5  AND EXTRACT(HOUR FROM measured_at) < 10 THEN 'morning'
            WHEN EXTRACT(HOUR FROM measured_at) >= 10 AND EXTRACT(HOUR FROM measured_at) < 15 THEN 'afternoon'
            WHEN EXTRACT(HOUR FROM measured_at) >= 15 AND EXTRACT(HOUR FROM measured_at) < 21 THEN 'evening'
            ELSE 'night'
          END AS bucket,
          COUNT(*)::int AS count,
          ROUND(AVG(value_numeric::numeric), 0)::int AS avg,
          MIN(value_numeric::numeric)::int AS min,
          MAX(value_numeric::numeric)::int AS max,
          COUNT(*) FILTER (WHERE value_numeric::numeric > 180)::int AS high_count,
          COUNT(*) FILTER (WHERE value_numeric::numeric < 70)::int AS low_count
        FROM health_readings
        WHERE patient_id = $1 ${pharmacyFilter}
          AND metric_type = 'glucose'
          AND measured_at >= NOW() - make_interval(days => ${days})
        GROUP BY bucket
        ORDER BY CASE bucket WHEN 'morning' THEN 0 WHEN 'afternoon' THEN 1 WHEN 'evening' THEN 2 ELSE 3 END
      `, params);

      // Q2: Meal-timing glucose stats (from metadata)
      const mealTimingStats = await dataSource.query(`
        SELECT
          metadata->>'mealTiming' AS meal_timing,
          COUNT(*)::int AS count,
          ROUND(AVG(value_numeric::numeric), 0)::int AS avg,
          MAX(value_numeric::numeric)::int AS max
        FROM health_readings
        WHERE patient_id = $1 ${pharmacyFilter}
          AND metric_type = 'glucose'
          AND metadata->>'mealTiming' IS NOT NULL
          AND measured_at >= NOW() - make_interval(days => ${days})
        GROUP BY metadata->>'mealTiming'
        ORDER BY count DESC
      `, params);

      // Q3: Exercise impact — compare glucose before/after exercise (readings with exercise metadata)
      const exerciseImpact = await dataSource.query(`
        SELECT
          COUNT(*)::int AS count,
          ROUND(AVG(value_numeric::numeric), 0)::int AS avg_with_exercise
        FROM health_readings
        WHERE patient_id = $1 ${pharmacyFilter}
          AND metric_type = 'glucose'
          AND metadata->'exercise' IS NOT NULL
          AND metadata->>'exercise' != 'null'
          AND measured_at >= NOW() - make_interval(days => ${days})
      `, params);

      // Q4: Trend comparison (3d / 7d / 14d averages)
      const trends = await dataSource.query(`
        SELECT
          ROUND(AVG(value_numeric::numeric) FILTER (WHERE measured_at >= NOW() - INTERVAL '3 days'), 0)::int AS avg_3d,
          COUNT(*) FILTER (WHERE measured_at >= NOW() - INTERVAL '3 days')::int AS count_3d,
          ROUND(AVG(value_numeric::numeric) FILTER (WHERE measured_at >= NOW() - INTERVAL '7 days'), 0)::int AS avg_7d,
          COUNT(*) FILTER (WHERE measured_at >= NOW() - INTERVAL '7 days')::int AS count_7d,
          ROUND(AVG(value_numeric::numeric) FILTER (WHERE measured_at >= NOW() - make_interval(days => ${days})), 0)::int AS avg_full,
          COUNT(*) FILTER (WHERE measured_at >= NOW() - make_interval(days => ${days}))::int AS count_full
        FROM health_readings
        WHERE patient_id = $1 ${pharmacyFilter}
          AND metric_type = 'glucose'
      `, params);

      // Q5: Overall glucose average (for exercise comparison baseline)
      const overallAvg = await dataSource.query(`
        SELECT ROUND(AVG(value_numeric::numeric), 0)::int AS avg
        FROM health_readings
        WHERE patient_id = $1 ${pharmacyFilter}
          AND metric_type = 'glucose'
          AND measured_at >= NOW() - make_interval(days => ${days})
      `, params);

      const responseData = {
        days,
        timeBuckets: timeBuckets.map((b: any) => ({
          bucket: b.bucket,
          count: b.count,
          avg: b.avg,
          min: b.min,
          max: b.max,
          highCount: b.high_count,
          lowCount: b.low_count,
        })),
        mealTimingStats: mealTimingStats.map((m: any) => ({
          mealTiming: m.meal_timing,
          count: m.count,
          avg: m.avg,
          max: m.max,
        })),
        exerciseImpact: {
          count: exerciseImpact[0]?.count ?? 0,
          avgWithExercise: exerciseImpact[0]?.avg_with_exercise ?? null,
          overallAvg: overallAvg[0]?.avg ?? null,
        },
        trends: {
          avg3d: trends[0]?.avg_3d ?? null,
          count3d: trends[0]?.count_3d ?? 0,
          avg7d: trends[0]?.avg_7d ?? null,
          count7d: trends[0]?.count_7d ?? 0,
          avgFull: trends[0]?.avg_full ?? null,
          countFull: trends[0]?.count_full ?? 0,
        },
      };

      // WO-O4O-CARE-ACTION-ENGINE-V2.2: Rule 기반 Action 생성 → 영속화 → 저장 기반 응답
      const candidates = mapTimeAnalysisToActions(responseData);

      let actions;
      if (pharmacyId) {
        // 영속화: 중복 억제 + 신규 저장 + 기존 active 합산
        actions = await actionService.persistAndMerge(patientId, pharmacyId, candidates);
      } else {
        // pharmacy 없으면 fallback: 임시 객체 (비영속)
        actions = candidates;
      }

      res.json({
        success: true,
        data: { ...responseData, actions },
      });
    } catch (error) {
      console.error('[CareAnalysis] time-based analysis error:', error);
      res.status(500).json({ success: false, error: { code: 'ANALYSIS_ERROR', message: 'Time-based analysis failed' } });
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

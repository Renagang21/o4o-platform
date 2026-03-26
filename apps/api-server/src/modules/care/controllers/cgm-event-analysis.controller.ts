import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { createPharmacyContextMiddleware } from '../care-pharmacy-context.middleware.js';
import type { PharmacyContextRequest } from '../care-pharmacy-context.middleware.js';
import { DefaultCgmEventAnalysisProvider } from '../domain/analysis/cgm-event-analysis.provider.js';
import { DatabaseCgmEventProvider } from '../infrastructure/provider/database-cgm-event.provider.js';

/**
 * CGM-Event Analysis Controller
 *
 * GET /event-analysis/:patientId?days=14  — CGM-Event linked analysis
 *
 * WO-O4O-CARE-CGM-EVENT-INTEGRATION-V1
 */
export function createCgmEventAnalysisRouter(dataSource: DataSource): Router {
  const router = Router();
  const requirePharmacyContext = createPharmacyContextMiddleware(dataSource);
  const dataProvider = new DatabaseCgmEventProvider(dataSource);
  const provider = new DefaultCgmEventAnalysisProvider(dataProvider);

  router.get(
    '/event-analysis/:patientId',
    authenticate,
    requirePharmacyContext,
    async (req, res) => {
      try {
        const pcReq = req as PharmacyContextRequest;
        const { patientId } = req.params;
        const pharmacyId = pcReq.pharmacyId;
        const days = req.query.days ? Number(req.query.days) : 14;

        // Patient ownership guard (same pattern as care-analysis.controller.ts)
        if (pharmacyId) {
          const ownerCheck = await dataSource.query(
            `SELECT id, organization_id, pharmacist_id FROM glucoseview_customers WHERE (user_id = $1 OR id = $1) LIMIT 1`,
            [patientId],
          );
          if (ownerCheck.length === 0) {
            res.status(403).json({
              success: false,
              error: { code: 'PATIENT_NOT_IN_PHARMACY', message: 'Patient not found in your pharmacy' },
            });
            return;
          }
          const patient = ownerCheck[0];
          const orgMatch = patient.organization_id === pharmacyId;
          const pharmacistFallback = !orgMatch && patient.pharmacist_id === pcReq.user?.id;
          if (!orgMatch && !pharmacistFallback) {
            res.status(403).json({
              success: false,
              error: { code: 'PATIENT_NOT_IN_PHARMACY', message: 'Patient not found in your pharmacy' },
            });
            return;
          }
        }

        const result = await provider.analyzePatientEvents(patientId, days);

        // V2: Rule-based action mapping (WO-O4O-CARE-ACTION-ENGINE-V2)
        const { mapAnalysisToActions } = await import('../domain/analysis/cgm-action.mapper.js');
        const actions = mapAnalysisToActions(result);

        res.json({ success: true, data: { ...result, actions } });
      } catch (error) {
        console.error('[CgmEventAnalysis] error:', error);
        res.status(500).json({
          success: false,
          error: { code: 'EVENT_ANALYSIS_ERROR', message: 'Event analysis failed' },
        });
      }
    },
  );

  return router;
}

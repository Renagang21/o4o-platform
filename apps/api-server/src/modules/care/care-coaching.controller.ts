import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { CareCoachingSessionService } from './care-coaching-session.service.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { createPharmacyContextMiddleware } from './care-pharmacy-context.middleware.js';
import type { PharmacyContextRequest } from './care-pharmacy-context.middleware.js';

export function createCareCoachingRouter(dataSource: DataSource): Router {
  const router = Router();
  const service = new CareCoachingSessionService(dataSource);
  const requirePharmacyContext = createPharmacyContextMiddleware(dataSource);

  // POST /coaching — create coaching session (pharmacy-scoped)
  router.post('/coaching', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const { patientId, snapshotId, summary, actionPlan } = req.body;
      const pharmacyId = pcReq.pharmacyId;
      // pharmacistId forced from authenticated user — client input ignored
      const pharmacistId = pcReq.user?.id;

      if (!patientId || !pharmacistId || !summary || !actionPlan) {
        res.status(400).json({ message: 'patientId, summary, actionPlan are required' });
        return;
      }

      if (!pharmacyId) {
        res.status(403).json({ message: 'Pharmacy context required for coaching sessions' });
        return;
      }

      const session = await service.createSession({
        patientId,
        pharmacistId,
        pharmacyId,
        snapshotId,
        summary,
        actionPlan,
      });

      res.status(201).json(session);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create coaching session' });
    }
  });

  // GET /coaching/:patientId — list coaching sessions (pharmacy-scoped)
  router.get('/coaching/:patientId', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const { patientId } = req.params;
      const pharmacyId = pcReq.pharmacyId;

      const sessions = await service.listByPatient(patientId, pharmacyId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve coaching sessions' });
    }
  });

  return router;
}

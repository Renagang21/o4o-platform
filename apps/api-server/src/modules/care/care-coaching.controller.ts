import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { CareCoachingSessionService } from './care-coaching-session.service.js';

export function createCareCoachingRouter(dataSource: DataSource): Router {
  const router = Router();
  const service = new CareCoachingSessionService(dataSource);

  // POST /coaching — create coaching session
  router.post('/coaching', async (req, res) => {
    try {
      const { patientId, pharmacistId, snapshotId, summary, actionPlan } = req.body;

      if (!patientId || !pharmacistId || !summary || !actionPlan) {
        res.status(400).json({ message: 'patientId, pharmacistId, summary, actionPlan are required' });
        return;
      }

      const session = await service.createSession({
        patientId,
        pharmacistId,
        snapshotId,
        summary,
        actionPlan,
      });

      res.status(201).json(session);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create coaching session' });
    }
  });

  // GET /coaching/:patientId — list coaching sessions
  router.get('/coaching/:patientId', async (req, res) => {
    try {
      const { patientId } = req.params;
      const sessions = await service.listByPatient(patientId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve coaching sessions' });
    }
  });

  return router;
}

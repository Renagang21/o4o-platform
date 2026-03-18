import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { CareCoachingSessionService } from '../services/coaching/care-coaching-session.service.js';
import { CareCoachingDraftService } from '../services/llm/care-coaching-draft.service.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { createPharmacyContextMiddleware } from '../care-pharmacy-context.middleware.js';
import type { PharmacyContextRequest } from '../care-pharmacy-context.middleware.js';

export function createCareCoachingRouter(dataSource: DataSource): Router {
  const router = Router();
  const service = new CareCoachingSessionService(dataSource);
  const draftService = new CareCoachingDraftService(dataSource);
  const requirePharmacyContext = createPharmacyContextMiddleware(dataSource);

  // GET /coaching — list all coaching sessions for pharmacy (cross-patient)
  // WO-O4O-GLYCOPHARM-CARE-COACHING-PAGE-V1
  // Must be registered BEFORE /coaching/:patientId to avoid route conflict
  router.get('/coaching', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacyId = pcReq.pharmacyId;

      if (!pharmacyId) {
        res.status(403).json({ message: 'Pharmacy context required' });
        return;
      }

      const sessions = await service.listByPharmacy(pharmacyId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve coaching sessions' });
    }
  });

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

  // ── Coaching Drafts (WO-O4O-CARE-AI-COACHING-DRAFT-V1) ──

  // GET /coaching-drafts/:patientId — get latest draft for patient
  router.get('/coaching-drafts/:patientId', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const { patientId } = req.params;
      const pharmacyId = pcReq.pharmacyId;

      if (!pharmacyId) {
        res.status(403).json({ message: 'Pharmacy context required' });
        return;
      }

      const draft = await draftService.getLatestDraft(patientId, pharmacyId);
      res.json(draft || null);
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve coaching draft' });
    }
  });

  // POST /coaching-drafts/:id/approve — approve draft → create coaching session
  router.post('/coaching-drafts/:id/approve', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const { id } = req.params;
      const pharmacyId = pcReq.pharmacyId;
      const pharmacistId = pcReq.user?.id;
      const { summary, actionPlan } = req.body;

      if (!pharmacyId || !pharmacistId) {
        res.status(403).json({ message: 'Pharmacy context and authentication required' });
        return;
      }

      const draft = await draftService.approveDraft(id, pharmacyId);
      if (!draft) {
        res.status(404).json({ message: 'Draft not found or already processed' });
        return;
      }

      // Create coaching session from approved draft
      const session = await service.createSession({
        patientId: draft.patientId,
        pharmacistId,
        pharmacyId,
        snapshotId: draft.snapshotId,
        summary: summary || 'AI 코칭 초안',
        actionPlan: actionPlan || draft.draftMessage,
      });

      res.status(201).json(session);
    } catch (error) {
      res.status(500).json({ message: 'Failed to approve coaching draft' });
    }
  });

  // POST /coaching-drafts/:id/discard — discard draft
  router.post('/coaching-drafts/:id/discard', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const { id } = req.params;
      const pharmacyId = pcReq.pharmacyId;

      if (!pharmacyId) {
        res.status(403).json({ message: 'Pharmacy context required' });
        return;
      }

      const ok = await draftService.discardDraft(id, pharmacyId);
      if (!ok) {
        res.status(404).json({ message: 'Draft not found or already processed' });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Failed to discard coaching draft' });
    }
  });

  return router;
}

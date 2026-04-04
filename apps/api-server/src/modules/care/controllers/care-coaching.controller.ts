import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { CareCoachingSessionService } from '../services/coaching/care-coaching-session.service.js';
import { CareCoachingDraftService } from '../services/llm/care-coaching-draft.service.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { createPharmacyContextMiddleware } from '../care-pharmacy-context.middleware.js';
import type { PharmacyContextRequest } from '../care-pharmacy-context.middleware.js';
import { resolvePatientUserId, resolvePatientUserIdStrict } from '../utils/resolve-patient-id.js';

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
      const { patientId: rawPatientId, snapshotId, summary, actionPlan } = req.body;
      const pharmacyId = pcReq.pharmacyId;
      const pharmacistId = pcReq.user?.id;

      if (!rawPatientId || !pharmacistId || !summary || !actionPlan) {
        res.status(400).json({ message: 'patientId, summary, actionPlan are required' });
        return;
      }

      if (!pharmacyId) {
        res.status(403).json({ message: 'Pharmacy context required for coaching sessions' });
        return;
      }

      // WO-O4O-GLYCOPHARM-COACHING-PATIENT-ID-NORMALIZATION-FIX-V1
      // fail-fast: 반드시 users.id로 정규화 가능해야 저장 진행
      const resolved = await resolvePatientUserIdStrict(dataSource, rawPatientId);
      if (!resolved) {
        console.warn(`[care-coaching] Cannot resolve patientId "${rawPatientId}" to users.id — gc.user_id may be NULL`);
        res.status(400).json({
          message: 'Patient account is not linked. Cannot save coaching until patient identity is verified.',
          code: 'PATIENT_NOT_LINKED',
        });
        return;
      }

      const patientId = resolved.userId;
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
      const patientId = await resolvePatientUserId(dataSource, req.params.patientId);
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
      const patientId = await resolvePatientUserId(dataSource, req.params.patientId);
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

      // WO-O4O-GLYCOPHARM-COACHING-PATIENT-ID-NORMALIZATION-FIX-V1
      // draft.patientId도 users.id인지 재검증
      const draftResolved = await resolvePatientUserIdStrict(dataSource, draft.patientId);
      if (!draftResolved) {
        console.warn(`[care-coaching] Draft patientId "${draft.patientId}" cannot resolve to users.id`);
        res.status(400).json({ message: 'Patient account is not linked.', code: 'PATIENT_NOT_LINKED' });
        return;
      }

      const session = await service.createSession({
        patientId: draftResolved.userId,
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

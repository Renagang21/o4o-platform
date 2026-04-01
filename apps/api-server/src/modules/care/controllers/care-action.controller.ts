/**
 * CareAction Controller — WO-O4O-CARE-ACTION-ENGINE-V2.2
 *
 * Action CRUD + 상태 전이 API
 *
 * GET    /actions/:patientId        — 환자별 Action 목록
 * POST   /actions/:actionId/start   — 시작 (suggested → in_progress)
 * POST   /actions/:actionId/complete — 완료 (→ completed)
 * POST   /actions/:actionId/dismiss  — 보류 (→ dismissed)
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { CareActionService } from '../services/care-action.service.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { createPharmacyContextMiddleware } from '../care-pharmacy-context.middleware.js';
import type { PharmacyContextRequest } from '../care-pharmacy-context.middleware.js';
import { resolvePatientUserId } from '../utils/resolve-patient-id.js';

export function createCareActionRouter(dataSource: DataSource): Router {
  const router = Router();
  const actionService = new CareActionService(dataSource);
  const requirePharmacyContext = createPharmacyContextMiddleware(dataSource);

  // GET /actions/:patientId — 환자별 Action 목록
  router.get('/actions/:patientId', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const patientId = await resolvePatientUserId(dataSource, req.params.patientId);
      const pharmacyId = pcReq.pharmacyId;

      if (!pharmacyId) {
        return res.status(400).json({ success: false, error: { code: 'NO_PHARMACY', message: 'Pharmacy context required' } });
      }

      const statusParam = req.query.status as string | undefined;
      const statusFilter = statusParam
        ? statusParam.split(',').filter(Boolean) as any[]
        : undefined;

      const actions = await actionService.listActions(patientId, pharmacyId, statusFilter);
      res.json({ success: true, data: { actions } });
    } catch (error) {
      console.error('[CareAction] list error:', error);
      res.status(500).json({ success: false, error: { code: 'ACTION_LIST_ERROR', message: 'Failed to list actions' } });
    }
  });

  // POST /actions/:actionId/start
  router.post('/actions/:actionId/start', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const { actionId } = req.params;
      const pharmacyId = pcReq.pharmacyId;
      const userId = pcReq.user?.id;

      if (!pharmacyId || !userId) {
        return res.status(400).json({ success: false, error: { code: 'MISSING_CONTEXT', message: 'Pharmacy and user context required' } });
      }

      const action = await actionService.startAction(actionId, pharmacyId, userId);
      if (!action) {
        return res.status(404).json({ success: false, error: { code: 'ACTION_NOT_FOUND', message: 'Action not found or not in suggested state' } });
      }

      res.json({ success: true, data: action });
    } catch (error) {
      console.error('[CareAction] start error:', error);
      res.status(500).json({ success: false, error: { code: 'ACTION_START_ERROR', message: 'Failed to start action' } });
    }
  });

  // POST /actions/:actionId/complete
  router.post('/actions/:actionId/complete', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const { actionId } = req.params;
      const pharmacyId = pcReq.pharmacyId;
      const userId = pcReq.user?.id;

      if (!pharmacyId || !userId) {
        return res.status(400).json({ success: false, error: { code: 'MISSING_CONTEXT', message: 'Pharmacy and user context required' } });
      }

      const action = await actionService.completeAction(actionId, pharmacyId, userId);
      if (!action) {
        return res.status(404).json({ success: false, error: { code: 'ACTION_NOT_FOUND', message: 'Action not found or already completed' } });
      }

      res.json({ success: true, data: action });
    } catch (error) {
      console.error('[CareAction] complete error:', error);
      res.status(500).json({ success: false, error: { code: 'ACTION_COMPLETE_ERROR', message: 'Failed to complete action' } });
    }
  });

  // POST /actions/:actionId/dismiss
  router.post('/actions/:actionId/dismiss', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const { actionId } = req.params;
      const pharmacyId = pcReq.pharmacyId;
      const userId = pcReq.user?.id;

      if (!pharmacyId || !userId) {
        return res.status(400).json({ success: false, error: { code: 'MISSING_CONTEXT', message: 'Pharmacy and user context required' } });
      }

      const action = await actionService.dismissAction(actionId, pharmacyId, userId);
      if (!action) {
        return res.status(404).json({ success: false, error: { code: 'ACTION_NOT_FOUND', message: 'Action not found or not dismissable' } });
      }

      res.json({ success: true, data: action });
    } catch (error) {
      console.error('[CareAction] dismiss error:', error);
      res.status(500).json({ success: false, error: { code: 'ACTION_DISMISS_ERROR', message: 'Failed to dismiss action' } });
    }
  });

  return router;
}

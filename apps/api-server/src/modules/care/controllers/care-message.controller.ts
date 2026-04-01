/**
 * Care Message Controller — 환자 ↔ 약사 Q&A 메시징
 * WO-O4O-CARE-QNA-SYSTEM-V1
 *
 * Routes (patient — authenticate only):
 *   POST   /messages              — 메시지 전송
 *   GET    /messages/my           — 내 대화 조회
 *   PATCH  /messages/read         — 읽음 처리
 *   GET    /messages/unread-count — 안읽은 수
 *
 * Routes (pharmacist — authenticate + pharmacyContext):
 *   GET    /messages/pharmacist/unread-count      — 전체 안읽은 수
 *   GET    /messages/pharmacist/unread-by-patient  — 환자별 안읽은 수
 *   POST   /messages/pharmacist       — 메시지 전송
 *   GET    /messages/:patientId       — 환자별 대화 조회
 *   PATCH  /messages/:patientId/read  — 읽음 처리
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../../middleware/auth.middleware.js';
import { createPharmacyContextMiddleware } from '../care-pharmacy-context.middleware.js';
import type { PharmacyContextRequest } from '../care-pharmacy-context.middleware.js';
import { CareMessageService } from '../services/care-message.service.js';
import { resolvePatientUserId } from '../utils/resolve-patient-id.js';

export function createCareMessageRouter(dataSource: DataSource): Router {
  const router = Router();
  const service = new CareMessageService(dataSource);
  const requirePharmacyContext = createPharmacyContextMiddleware(dataSource);

  // ─── Patient APIs ───

  /**
   * GET /messages/unread-count
   * 환자의 안읽은 메시지 수
   */
  router.get('/messages/unread-count', authenticate, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;
      if (!user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const count = await service.getUnreadCount(user.id, 'patient');
      res.json({ success: true, data: { count } });
    } catch (error) {
      console.error('[messages] GET /unread-count failed:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get unread count' } });
    }
  });

  /**
   * GET /messages/my
   * 환자 대화 조회 — 연결된 약국의 thread
   */
  router.get('/messages/my', authenticate, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;
      if (!user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      // Find linked pharmacy
      const linked = await dataSource.query(
        `SELECT organization_id AS "pharmacyId"
         FROM glucoseview_customers
         WHERE user_id = $1
         LIMIT 1`,
        [user.id],
      );

      if (linked.length === 0) {
        res.json({ success: true, data: [] });
        return;
      }

      const pharmacyId = linked[0].pharmacyId;
      const messages = await service.getThread(user.id, pharmacyId);
      res.json({ success: true, data: messages });
    } catch (error) {
      console.error('[messages] GET /my failed:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load messages' } });
    }
  });

  /**
   * POST /messages
   * 환자 메시지 전송
   */
  router.post('/messages', authenticate, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;
      if (!user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const { content, coachingId } = req.body as { content?: string; coachingId?: string };
      if (!content || !content.trim()) {
        res.status(400).json({ success: false, error: { code: 'MISSING_CONTENT', message: 'content is required' } });
        return;
      }

      // Find linked pharmacy
      const linked = await dataSource.query(
        `SELECT organization_id AS "pharmacyId"
         FROM glucoseview_customers
         WHERE user_id = $1
         LIMIT 1`,
        [user.id],
      );

      if (linked.length === 0) {
        res.status(403).json({ success: false, error: { code: 'NOT_LINKED', message: 'No linked pharmacy' } });
        return;
      }

      const message = await service.createMessage({
        patientId: user.id,
        pharmacyId: linked[0].pharmacyId,
        senderType: 'patient',
        senderId: user.id,
        content: content.trim(),
        messageType: coachingId ? 'coaching_ref' : 'text',
        coachingId: coachingId || null,
      });

      res.status(201).json({ success: true, data: message });
    } catch (error) {
      console.error('[messages] POST failed:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to send message' } });
    }
  });

  /**
   * PATCH /messages/read
   * 환자가 약사 메시지 읽음 처리
   */
  router.patch('/messages/read', authenticate, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;
      if (!user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const linked = await dataSource.query(
        `SELECT organization_id AS "pharmacyId"
         FROM glucoseview_customers
         WHERE user_id = $1
         LIMIT 1`,
        [user.id],
      );

      if (linked.length === 0) {
        res.json({ success: true, data: { updated: 0 } });
        return;
      }

      const updated = await service.markAsRead(user.id, linked[0].pharmacyId, 'patient');
      res.json({ success: true, data: { updated } });
    } catch (error) {
      console.error('[messages] PATCH /read failed:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to mark as read' } });
    }
  });

  // ─── Pharmacist APIs ───

  /**
   * GET /messages/pharmacist/unread-count
   * 약국 전체 안읽은 메시지 수
   */
  router.get('/messages/pharmacist/unread-count', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacyId = pcReq.pharmacyId;
      if (!pharmacyId) {
        res.status(403).json({ success: false, error: { code: 'PHARMACY_REQUIRED', message: 'Pharmacy context required' } });
        return;
      }

      const count = await service.getPharmacyUnreadCount(pharmacyId);
      res.json({ success: true, data: { count } });
    } catch (error) {
      console.error('[messages] GET /pharmacist/unread-count failed:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get unread count' } });
    }
  });

  /**
   * GET /messages/pharmacist/unread-by-patient
   * 환자별 안읽은 메시지 수
   */
  router.get('/messages/pharmacist/unread-by-patient', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacyId = pcReq.pharmacyId;
      if (!pharmacyId) {
        res.status(403).json({ success: false, error: { code: 'PHARMACY_REQUIRED', message: 'Pharmacy context required' } });
        return;
      }

      const data = await service.getPharmacyUnreadByPatient(pharmacyId);
      res.json({ success: true, data });
    } catch (error) {
      console.error('[messages] GET /pharmacist/unread-by-patient failed:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get unread counts' } });
    }
  });

  /**
   * GET /messages/:patientId
   * 약사가 환자 대화 조회
   */
  router.get('/messages/:patientId', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacyId = pcReq.pharmacyId;
      const patientId = await resolvePatientUserId(dataSource, req.params.patientId);

      if (!pharmacyId) {
        res.status(403).json({ success: false, error: { code: 'PHARMACY_REQUIRED', message: 'Pharmacy context required' } });
        return;
      }

      const messages = await service.getThread(patientId, pharmacyId);
      res.json({ success: true, data: messages });
    } catch (error) {
      console.error('[messages] GET /:patientId failed:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load messages' } });
    }
  });

  /**
   * POST /messages/pharmacist
   * 약사 메시지 전송
   */
  router.post('/messages/pharmacist', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacyId = pcReq.pharmacyId;
      const pharmacistId = pcReq.user?.id;

      if (!pharmacyId || !pharmacistId) {
        res.status(403).json({ success: false, error: { code: 'PHARMACY_REQUIRED', message: 'Pharmacy context required' } });
        return;
      }

      const { patientId, content, coachingId } = req.body as { patientId?: string; content?: string; coachingId?: string };

      if (!patientId) {
        res.status(400).json({ success: false, error: { code: 'MISSING_PATIENT_ID', message: 'patientId is required' } });
        return;
      }
      if (!content || !content.trim()) {
        res.status(400).json({ success: false, error: { code: 'MISSING_CONTENT', message: 'content is required' } });
        return;
      }

      // Verify patient belongs to this pharmacy
      const linked = await dataSource.query(
        `SELECT 1 FROM glucoseview_customers
         WHERE user_id = $1 AND organization_id = $2
         LIMIT 1`,
        [patientId, pharmacyId],
      );

      if (linked.length === 0) {
        res.status(403).json({ success: false, error: { code: 'PATIENT_NOT_LINKED', message: 'Patient is not linked to this pharmacy' } });
        return;
      }

      const message = await service.createMessage({
        patientId,
        pharmacyId,
        senderType: 'pharmacist',
        senderId: pharmacistId,
        content: content.trim(),
        messageType: coachingId ? 'coaching_ref' : 'text',
        coachingId: coachingId || null,
      });

      res.status(201).json({ success: true, data: message });
    } catch (error) {
      console.error('[messages] POST /pharmacist failed:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to send message' } });
    }
  });

  /**
   * PATCH /messages/:patientId/read
   * 약사가 환자 메시지 읽음 처리
   */
  router.patch('/messages/:patientId/read', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacyId = pcReq.pharmacyId;
      const patientId = await resolvePatientUserId(dataSource, req.params.patientId);

      if (!pharmacyId) {
        res.status(403).json({ success: false, error: { code: 'PHARMACY_REQUIRED', message: 'Pharmacy context required' } });
        return;
      }

      const updated = await service.markAsRead(patientId, pharmacyId, 'pharmacist');
      res.json({ success: true, data: { updated } });
    } catch (error) {
      console.error('[messages] PATCH /:patientId/read failed:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to mark as read' } });
    }
  });

  return router;
}

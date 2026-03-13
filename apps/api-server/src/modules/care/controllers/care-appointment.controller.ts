/**
 * Care Appointment Controller
 * WO-GLYCOPHARM-APPOINTMENT-SYSTEM-V1
 *
 * 환자-약사 상담 예약 CRUD.
 * 연결된 환자만 예약 가능 (glucoseview_customers 기반).
 *
 * Routes (patient — authenticate only):
 *   GET    /appointments/my           — 내 예약 목록
 *   POST   /appointments              — 예약 생성
 *   DELETE /appointments/:id          — 예약 취소
 *
 * Routes (pharmacist — authenticate + pharmacyContext):
 *   GET    /appointments/pharmacy     — 약국 예약 목록
 *   PATCH  /appointments/:id/confirm  — 승인
 *   PATCH  /appointments/:id/reject   — 거절
 *   PATCH  /appointments/:id/complete — 방문 완료
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../../middleware/auth.middleware.js';
import { createPharmacyContextMiddleware } from '../care-pharmacy-context.middleware.js';
import type { PharmacyContextRequest } from '../care-pharmacy-context.middleware.js';

export function createCareAppointmentRouter(dataSource: DataSource): Router {
  const router = Router();
  const requirePharmacyContext = createPharmacyContextMiddleware(dataSource);

  // ─── Patient APIs ───

  /**
   * GET /appointments/my
   * 환자 예약 목록 조회
   */
  router.get('/appointments/my', authenticate, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;
      if (!user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const appointments = await dataSource.query(
        `SELECT id, patient_name AS "patientName", pharmacy_name AS "pharmacyName",
                scheduled_at AS "scheduledAt", status, notes,
                reject_reason AS "rejectReason", created_at AS "createdAt"
         FROM care_appointments
         WHERE patient_id = $1
         ORDER BY scheduled_at DESC`,
        [user.id],
      );

      res.json({ success: true, data: appointments });
    } catch (error) {
      console.error('[appointments] GET /my failed:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load appointments' },
      });
    }
  });

  /**
   * POST /appointments
   * 환자가 예약 생성 — 연결된 약국 자동 결정
   */
  router.post('/appointments', authenticate, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;
      if (!user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const { scheduledAt, notes } = req.body as { scheduledAt?: string; notes?: string };
      if (!scheduledAt) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_SCHEDULED_AT', message: 'scheduledAt is required' },
        });
        return;
      }

      // Find linked pharmacy via glucoseview_customers
      const linked = await dataSource.query(
        `SELECT gc.organization_id AS "pharmacyId", o.name AS "pharmacyName"
         FROM glucoseview_customers gc
         LEFT JOIN organizations o ON o.id = gc.organization_id
         WHERE gc.email = $1
         LIMIT 1`,
        [user.email],
      );

      if (linked.length === 0) {
        res.status(403).json({
          success: false,
          error: { code: 'NOT_LINKED', message: 'No linked pharmacy. Please connect to a pharmacy first.' },
        });
        return;
      }

      const pharmacyId = linked[0].pharmacyId;
      const pharmacyName = linked[0].pharmacyName || '약국';
      const patientName = user.name || user.email?.split('@')[0] || '환자';

      const result = await dataSource.query(
        `INSERT INTO care_appointments
           (patient_id, patient_email, patient_name, pharmacy_id, pharmacy_name, scheduled_at, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, 'requested', $7)
         RETURNING id, created_at AS "createdAt"`,
        [user.id, user.email, patientName, pharmacyId, pharmacyName, scheduledAt, notes || null],
      );

      res.status(201).json({ success: true, data: { id: result[0].id, createdAt: result[0].createdAt } });
    } catch (error) {
      console.error('[appointments] POST failed:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create appointment' },
      });
    }
  });

  /**
   * DELETE /appointments/:id
   * 환자가 예약 취소 (soft delete → status = cancelled)
   */
  router.delete('/appointments/:id', authenticate, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;
      if (!user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const { id } = req.params;

      const result = await dataSource.query(
        `UPDATE care_appointments
         SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1 AND patient_id = $2 AND status IN ('requested', 'confirmed')
         RETURNING id`,
        [id, user.id],
      );

      if (result.length === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Appointment not found or cannot be cancelled' },
        });
        return;
      }

      res.json({ success: true, data: { message: 'Appointment cancelled' } });
    } catch (error) {
      console.error('[appointments] DELETE failed:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel appointment' },
      });
    }
  });

  // ─── Pharmacist APIs ───

  /**
   * GET /appointments/pharmacy
   * 약국 예약 목록 조회 (pharmacy_id 스코핑)
   */
  router.get('/appointments/pharmacy', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacyId = pcReq.pharmacyId;
      const statusFilter = req.query.status as string | undefined;

      let query = `SELECT id, patient_id AS "patientId", patient_email AS "patientEmail",
                          patient_name AS "patientName", pharmacy_name AS "pharmacyName",
                          scheduled_at AS "scheduledAt", status, notes,
                          reject_reason AS "rejectReason", created_at AS "createdAt"
                   FROM care_appointments`;
      const params: unknown[] = [];
      const conditions: string[] = [];

      if (pharmacyId) {
        conditions.push(`pharmacy_id = $${params.length + 1}`);
        params.push(pharmacyId);
      }

      if (statusFilter) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(statusFilter);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ' ORDER BY scheduled_at ASC';

      const appointments = await dataSource.query(query, params);
      res.json({ success: true, data: appointments });
    } catch (error) {
      console.error('[appointments] GET /pharmacy failed:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load pharmacy appointments' },
      });
    }
  });

  /**
   * PATCH /appointments/:id/confirm
   * 약사가 예약 승인
   */
  router.patch('/appointments/:id/confirm', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacistId = pcReq.user?.id;
      const pharmacyId = pcReq.pharmacyId;
      const { id } = req.params;

      const whereClause = pharmacyId
        ? `WHERE id = $1 AND pharmacy_id = $2 AND status = 'requested'`
        : `WHERE id = $1 AND status = 'requested'`;
      const params = pharmacyId ? [id, pharmacyId] : [id];

      const result = await dataSource.query(
        `UPDATE care_appointments
         SET status = 'confirmed',
             pharmacist_id = $${params.length + 1},
             updated_at = NOW()
         ${whereClause}
         RETURNING id`,
        [...params, pharmacistId],
      );

      if (result.length === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Appointment not found or already handled' },
        });
        return;
      }

      res.json({ success: true, data: { message: 'Appointment confirmed' } });
    } catch (error) {
      console.error('[appointments] PATCH /confirm failed:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to confirm appointment' },
      });
    }
  });

  /**
   * PATCH /appointments/:id/reject
   * 약사가 예약 거절
   */
  router.patch('/appointments/:id/reject', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacistId = pcReq.user?.id;
      const pharmacyId = pcReq.pharmacyId;
      const { id } = req.params;
      const { reason } = req.body as { reason?: string };

      const whereClause = pharmacyId
        ? `WHERE id = $1 AND pharmacy_id = $2 AND status = 'requested'`
        : `WHERE id = $1 AND status = 'requested'`;
      const params = pharmacyId ? [id, pharmacyId] : [id];

      const result = await dataSource.query(
        `UPDATE care_appointments
         SET status = 'rejected',
             reject_reason = $${params.length + 1},
             pharmacist_id = $${params.length + 2},
             updated_at = NOW()
         ${whereClause}
         RETURNING id`,
        [...params, reason || null, pharmacistId],
      );

      if (result.length === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Appointment not found or already handled' },
        });
        return;
      }

      res.json({ success: true, data: { message: 'Appointment rejected' } });
    } catch (error) {
      console.error('[appointments] PATCH /reject failed:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to reject appointment' },
      });
    }
  });

  /**
   * PATCH /appointments/:id/complete
   * 약사가 방문 완료 처리
   */
  router.patch('/appointments/:id/complete', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacyId = pcReq.pharmacyId;
      const { id } = req.params;

      const whereClause = pharmacyId
        ? `WHERE id = $1 AND pharmacy_id = $2 AND status = 'confirmed'`
        : `WHERE id = $1 AND status = 'confirmed'`;
      const params = pharmacyId ? [id, pharmacyId] : [id];

      const result = await dataSource.query(
        `UPDATE care_appointments
         SET status = 'completed', updated_at = NOW()
         ${whereClause}
         RETURNING id`,
        params,
      );

      if (result.length === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Appointment not found or not in confirmed status' },
        });
        return;
      }

      res.json({ success: true, data: { message: 'Appointment completed' } });
    } catch (error) {
      console.error('[appointments] PATCH /complete failed:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to complete appointment' },
      });
    }
  });

  return router;
}

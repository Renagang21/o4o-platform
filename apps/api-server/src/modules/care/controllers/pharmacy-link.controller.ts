/**
 * Pharmacy Link Controller
 * WO-GLYCOPHARM-PATIENT-PHARMACY-LINK-FLOW-V1
 *
 * 환자 ↔ 약국 연결 요청/승인/거절 흐름.
 * 승인 시 glucoseview_customers 레코드 생성으로 기존 Care 시스템과 완전 통합.
 *
 * Routes (patient — authenticate only):
 *   GET  /pharmacy-link/pharmacies  — 약국 목록 조회
 *   GET  /pharmacy-link/my-status   — 내 연결 상태
 *   POST /pharmacy-link/request     — 연결 요청
 *
 * Routes (pharmacist — authenticate + pharmacyContext):
 *   GET  /pharmacy-link/requests    — 대기 요청 목록
 *   POST /pharmacy-link/approve     — 승인
 *   POST /pharmacy-link/reject      — 거절
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../../middleware/auth.middleware.js';
import { createPharmacyContextMiddleware } from '../care-pharmacy-context.middleware.js';
import type { PharmacyContextRequest } from '../care-pharmacy-context.middleware.js';

export function createPharmacyLinkRouter(dataSource: DataSource): Router {
  const router = Router();
  const requirePharmacyContext = createPharmacyContextMiddleware(dataSource);

  // ─── Patient APIs ───

  /**
   * GET /pharmacy-link/pharmacies
   * 환자가 연결할 수 있는 약국 목록 조회
   */
  router.get('/pharmacy-link/pharmacies', authenticate, async (req, res) => {
    try {
      const pharmacies = await dataSource.query(`
        SELECT
          o.id,
          o.name,
          COALESCE(pc.cnt, 0)::int AS "patientCount"
        FROM organizations o
        JOIN organization_service_enrollments e
          ON e.organization_id = o.id
          AND e.service_code = 'glycopharm'
          AND e.status = 'active'
        LEFT JOIN (
          SELECT organization_id, COUNT(*)::int AS cnt
          FROM glucoseview_customers
          GROUP BY organization_id
        ) pc ON pc.organization_id = o.id
        WHERE o."isActive" = true
        ORDER BY o.name
      `);

      res.json({ success: true, data: pharmacies });
    } catch (error) {
      console.error('[pharmacy-link] GET pharmacies failed:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load pharmacies' },
      });
    }
  });

  /**
   * GET /pharmacy-link/my-status
   * 환자의 현재 약국 연결 상태
   */
  router.get('/pharmacy-link/my-status', authenticate, async (req, res) => {
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

      // Check existing link via glucoseview_customers
      const existing = await dataSource.query(
        `SELECT gc.id, gc.organization_id AS "pharmacyId", o.name AS "pharmacyName"
         FROM glucoseview_customers gc
         LEFT JOIN organizations o ON o.id = gc.organization_id
         WHERE gc.email = $1
         LIMIT 1`,
        [user.email],
      );

      if (existing.length > 0) {
        res.json({
          success: true,
          data: {
            linked: true,
            pharmacyId: existing[0].pharmacyId,
            pharmacyName: existing[0].pharmacyName || '약국',
          },
        });
        return;
      }

      // Check pending request
      const pending = await dataSource.query(
        `SELECT id, pharmacy_name AS "pharmacyName", created_at AS "createdAt"
         FROM care_pharmacy_link_requests
         WHERE patient_id = $1 AND status = 'pending'
         ORDER BY created_at DESC
         LIMIT 1`,
        [user.id],
      );

      if (pending.length > 0) {
        res.json({
          success: true,
          data: {
            linked: false,
            pendingRequest: {
              id: pending[0].id,
              pharmacyName: pending[0].pharmacyName,
              createdAt: pending[0].createdAt,
            },
          },
        });
        return;
      }

      res.json({ success: true, data: { linked: false } });
    } catch (error) {
      console.error('[pharmacy-link] GET my-status failed:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to check link status' },
      });
    }
  });

  /**
   * POST /pharmacy-link/request
   * 환자가 약국 연결 요청
   */
  router.post('/pharmacy-link/request', authenticate, async (req, res) => {
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

      const { pharmacyId, message } = req.body as { pharmacyId?: string; message?: string };
      if (!pharmacyId) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_PHARMACY_ID', message: 'pharmacyId is required' },
        });
        return;
      }

      // Verify pharmacy exists and has glycopharm enrollment
      const pharmacy = await dataSource.query(
        `SELECT o.id, o.name
         FROM organizations o
         JOIN organization_service_enrollments e
           ON e.organization_id = o.id
           AND e.service_code = 'glycopharm'
           AND e.status = 'active'
         WHERE o.id = $1 AND o."isActive" = true
         LIMIT 1`,
        [pharmacyId],
      );

      if (pharmacy.length === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'PHARMACY_NOT_FOUND', message: 'Pharmacy not found or not active' },
        });
        return;
      }

      // Check already linked
      const alreadyLinked = await dataSource.query(
        `SELECT id FROM glucoseview_customers
         WHERE email = $1 AND organization_id = $2
         LIMIT 1`,
        [user.email, pharmacyId],
      );

      if (alreadyLinked.length > 0) {
        res.status(409).json({
          success: false,
          error: { code: 'ALREADY_LINKED', message: 'Already linked to this pharmacy' },
        });
        return;
      }

      // Check duplicate pending request
      const duplicatePending = await dataSource.query(
        `SELECT id FROM care_pharmacy_link_requests
         WHERE patient_id = $1 AND pharmacy_id = $2 AND status = 'pending'
         LIMIT 1`,
        [user.id, pharmacyId],
      );

      if (duplicatePending.length > 0) {
        res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE_REQUEST', message: 'Pending request already exists' },
        });
        return;
      }

      // Create request
      const patientName = user.name || user.email?.split('@')[0] || '환자';
      const result = await dataSource.query(
        `INSERT INTO care_pharmacy_link_requests
           (patient_id, patient_email, patient_name, pharmacy_id, pharmacy_name, status, message)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6)
         RETURNING id, created_at AS "createdAt"`,
        [user.id, user.email, patientName, pharmacyId, pharmacy[0].name, message || null],
      );

      res.status(201).json({ success: true, data: { id: result[0].id, createdAt: result[0].createdAt } });
    } catch (error) {
      console.error('[pharmacy-link] POST request failed:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create link request' },
      });
    }
  });

  // ─── Pharmacist APIs ───

  /**
   * GET /pharmacy-link/requests
   * 약사가 대기 중인 연결 요청 목록 조회
   */
  router.get('/pharmacy-link/requests', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacyId = pcReq.pharmacyId;

      if (!pharmacyId) {
        // Admin sees all pending requests
        const requests = await dataSource.query(
          `SELECT id, patient_id AS "patientId", patient_email AS "patientEmail",
                  patient_name AS "patientName", pharmacy_name AS "pharmacyName",
                  status, message, created_at AS "createdAt"
           FROM care_pharmacy_link_requests
           WHERE status = 'pending'
           ORDER BY created_at DESC`,
        );
        res.json({ success: true, data: requests });
        return;
      }

      const requests = await dataSource.query(
        `SELECT id, patient_id AS "patientId", patient_email AS "patientEmail",
                patient_name AS "patientName", pharmacy_name AS "pharmacyName",
                status, message, created_at AS "createdAt"
         FROM care_pharmacy_link_requests
         WHERE pharmacy_id = $1 AND status = 'pending'
         ORDER BY created_at DESC`,
        [pharmacyId],
      );

      res.json({ success: true, data: requests });
    } catch (error) {
      console.error('[pharmacy-link] GET requests failed:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load link requests' },
      });
    }
  });

  /**
   * POST /pharmacy-link/approve
   * 약사가 연결 요청 승인 → glucoseview_customers 생성
   */
  router.post('/pharmacy-link/approve', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacistId = pcReq.user?.id;
      const pharmacyId = pcReq.pharmacyId;
      const { requestId } = req.body as { requestId?: string };

      if (!requestId) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_REQUEST_ID', message: 'requestId is required' },
        });
        return;
      }

      // Fetch request and verify ownership
      const whereClause = pharmacyId
        ? `WHERE r.id = $1 AND r.pharmacy_id = $2 AND r.status = 'pending'`
        : `WHERE r.id = $1 AND r.status = 'pending'`;
      const params = pharmacyId ? [requestId, pharmacyId] : [requestId];

      const requests = await dataSource.query(
        `SELECT r.id, r.patient_id AS "patientId", r.patient_email AS "patientEmail",
                r.patient_name AS "patientName", r.pharmacy_id AS "pharmacyId"
         FROM care_pharmacy_link_requests r
         ${whereClause}
         LIMIT 1`,
        params,
      );

      if (requests.length === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'REQUEST_NOT_FOUND', message: 'Request not found or already handled' },
        });
        return;
      }

      const linkRequest = requests[0];
      const targetPharmacyId = linkRequest.pharmacyId;

      // Transaction: update request + create customer
      await dataSource.transaction(async (manager) => {
        // 1. Update request status
        await manager.query(
          `UPDATE care_pharmacy_link_requests
           SET status = 'approved', handled_by = $1, handled_at = NOW(), updated_at = NOW()
           WHERE id = $2`,
          [pharmacistId, requestId],
        );

        // 2. Create glucoseview_customers record (the canonical link)
        await manager.query(
          `INSERT INTO glucoseview_customers
             (organization_id, pharmacist_id, name, email, visit_count, sync_status, data_sharing_consent, consent_date)
           VALUES ($1, $2, $3, $4, 0, 'pending', true, NOW())`,
          [targetPharmacyId, pharmacistId, linkRequest.patientName, linkRequest.patientEmail],
        );
      });

      res.json({ success: true, data: { message: 'Request approved and patient linked' } });
    } catch (error) {
      console.error('[pharmacy-link] POST approve failed:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to approve link request' },
      });
    }
  });

  /**
   * POST /pharmacy-link/reject
   * 약사가 연결 요청 거절
   */
  router.post('/pharmacy-link/reject', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacistId = pcReq.user?.id;
      const pharmacyId = pcReq.pharmacyId;
      const { requestId, reason } = req.body as { requestId?: string; reason?: string };

      if (!requestId) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_REQUEST_ID', message: 'requestId is required' },
        });
        return;
      }

      // Verify request belongs to pharmacy and is pending
      const whereClause = pharmacyId
        ? `WHERE id = $1 AND pharmacy_id = $2 AND status = 'pending'`
        : `WHERE id = $1 AND status = 'pending'`;
      const params = pharmacyId ? [requestId, pharmacyId] : [requestId];

      const result = await dataSource.query(
        `UPDATE care_pharmacy_link_requests
         SET status = 'rejected',
             reject_reason = $${params.length + 1},
             handled_by = $${params.length + 2},
             handled_at = NOW(),
             updated_at = NOW()
         ${whereClause}
         RETURNING id`,
        [...params, reason || null, pharmacistId],
      );

      if (result.length === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'REQUEST_NOT_FOUND', message: 'Request not found or already handled' },
        });
        return;
      }

      res.json({ success: true, data: { message: 'Request rejected' } });
    } catch (error) {
      console.error('[pharmacy-link] POST reject failed:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to reject link request' },
      });
    }
  });

  return router;
}

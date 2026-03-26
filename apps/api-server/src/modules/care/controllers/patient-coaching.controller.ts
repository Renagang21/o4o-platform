/**
 * Patient Coaching Controller
 * WO-GLYCOPHARM-PATIENT-COACHING-VIEW-SCREEN-V1
 *
 * 환자 본인의 코칭 기록 조회 (READ-ONLY).
 * authenticate만 사용 (pharmacy context 불요).
 *
 * 매핑: users.email → glucoseview_customers.id → care_coaching_sessions.patient_id
 *
 * Routes:
 *   GET /patient/coaching — 본인 코칭 기록 조회
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../../middleware/auth.middleware.js';

export function createPatientCoachingRouter(dataSource: DataSource): Router {
  const router = Router();

  router.get('/patient/coaching', authenticate, async (req, res) => {
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

      // WO-O4O-CARE-IDENTITY-UNIFICATION-USERS-ID-V1: query directly by users.id
      const sessions = await dataSource.query(
        `SELECT
          cs.id,
          cs.patient_id AS "patientId",
          cs.pharmacist_id AS "pharmacistId",
          cs.summary,
          cs.action_plan AS "actionPlan",
          cs.created_at AS "createdAt",
          COALESCE(
            NULLIF(TRIM(CONCAT(u."firstName", ' ', u."lastName")), ''),
            u.name,
            u.email
          ) AS "pharmacistName"
        FROM care_coaching_sessions cs
        LEFT JOIN users u ON u.id = cs.pharmacist_id
        WHERE cs.patient_id = $1
        ORDER BY cs.created_at DESC
        LIMIT 50`,
        [user.id],
      );

      res.json({ success: true, data: sessions });
    } catch (error) {
      console.error('[patient-coaching] GET failed:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load coaching records' },
      });
    }
  });

  return router;
}

/**
 * Patient Health Readings Controller
 * WO-GLYCOPHARM-GLUCOSE-INPUT-PAGE-V1
 *
 * 환자 본인의 혈당 자가입력.
 * authenticate만 사용 (pharmacy context 불요).
 *
 * Routes:
 *   POST /patient/health-readings  — 환자 혈당 입력
 *   GET  /patient/health-readings   — 환자 본인 기록 조회
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { HealthReading } from '../entities/health-reading.entity.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../../middleware/auth.middleware.js';

export function createPatientHealthReadingsRouter(dataSource: DataSource): Router {
  const router = Router();
  const repo = dataSource.getRepository(HealthReading);

  /**
   * POST /patient/health-readings — 환자 혈당 입력
   */
  router.post('/patient/health-readings', authenticate, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;

      if (!user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const { metricType, valueNumeric, unit, measuredAt, metadata } = req.body;

      if (valueNumeric == null || !measuredAt) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'valueNumeric and measuredAt are required' } });
        return;
      }

      const numVal = Number(valueNumeric);
      if (isNaN(numVal) || numVal < 20 || numVal > 600) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Glucose value must be between 20-600 mg/dL' } });
        return;
      }

      // Resolve linked pharmacy from glucoseview_customers (source of truth)
      let linkedPharmacyId: string | null = null;
      try {
        const linked = await dataSource.query(
          `SELECT organization_id FROM glucoseview_customers WHERE email = $1 LIMIT 1`,
          [user.email],
        );
        if (linked.length > 0) {
          linkedPharmacyId = linked[0].organization_id;
        }
      } catch {
        // Non-blocking: if lookup fails, save with null (patient data is never lost)
      }

      const entity = repo.create({
        patientId: user.id,
        metricType: metricType || 'glucose',
        valueNumeric: String(numVal),
        unit: unit || 'mg/dL',
        measuredAt: new Date(measuredAt),
        sourceType: 'patient_self',
        createdBy: user.id,
        metadata: metadata || {},
        pharmacyId: linkedPharmacyId,
      });

      const saved = await repo.save(entity);
      res.status(201).json({ success: true, data: saved });
    } catch (error) {
      console.error('[patient-health-readings] POST failed:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to save health reading' } });
    }
  });

  /**
   * GET /patient/health-readings — 환자 본인 기록 조회
   */
  router.get('/patient/health-readings', authenticate, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;

      if (!user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const qb = repo
        .createQueryBuilder('r')
        .where('r.patient_id = :patientId', { patientId: user.id });

      const metricType = req.query.metricType as string | undefined;
      if (metricType) {
        qb.andWhere('r.metric_type = :metricType', { metricType });
      }

      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      if (from) {
        qb.andWhere('r.measured_at >= :from', { from: new Date(from) });
      }
      if (to) {
        qb.andWhere('r.measured_at <= :to', { to: new Date(to) });
      }

      qb.orderBy('r.measured_at', 'DESC').limit(100);

      const readings = await qb.getMany();
      res.json({ success: true, data: readings });
    } catch (error) {
      console.error('[patient-health-readings] GET failed:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve health readings' } });
    }
  });

  return router;
}

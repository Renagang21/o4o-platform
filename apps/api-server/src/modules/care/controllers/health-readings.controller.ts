import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { HealthReading } from '../entities/health-reading.entity.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { createPharmacyContextMiddleware } from '../care-pharmacy-context.middleware.js';
import type { PharmacyContextRequest } from '../care-pharmacy-context.middleware.js';
import { resolvePatientUserId } from '../utils/resolve-patient-id.js';

/**
 * Health Readings Controller
 *
 * POST /health-readings — manual entry (single or batch)
 * GET  /health-readings/:patientId — list readings by patient (pharmacy-scoped)
 *
 * WO-O4O-HEALTH-DATA-PIPELINE-V1 (Phase 1: manual entry only)
 */
export function createHealthReadingsRouter(dataSource: DataSource): Router {
  const router = Router();
  const repo = dataSource.getRepository(HealthReading);
  const requirePharmacyContext = createPharmacyContextMiddleware(dataSource);

  // POST /health-readings — manual entry
  router.post('/health-readings', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacyId = pcReq.pharmacyId;
      // created_by forced from authenticated user — client input ignored
      const createdBy = pcReq.user?.id;

      if (!pharmacyId) {
        res.status(403).json({ message: 'Pharmacy context required' });
        return;
      }

      if (!createdBy) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      // Support single or batch: { readings: [...] } or { patientId, ... }
      const isBatch = Array.isArray(req.body.readings);
      const items: Array<{
        patientId: string;
        metricType?: string;
        valueNumeric: number;
        valueText?: string;
        unit?: string;
        measuredAt: string;
        metadata?: Record<string, unknown>;
      }> = isBatch ? req.body.readings : [req.body];

      if (items.length === 0) {
        res.status(400).json({ message: 'At least one reading is required' });
        return;
      }

      // Validate all items
      for (const item of items) {
        if (!item.patientId || item.valueNumeric == null || !item.measuredAt) {
          res.status(400).json({ message: 'patientId, valueNumeric, measuredAt are required for each reading' });
          return;
        }
      }

      const entities = items.map((item) =>
        repo.create({
          patientId: item.patientId,
          metricType: item.metricType || 'glucose',
          valueNumeric: String(item.valueNumeric),
          valueText: item.valueText || null,
          unit: item.unit || 'mg/dL',
          measuredAt: new Date(item.measuredAt),
          sourceType: 'manual', // Phase 1: always manual
          createdBy,
          metadata: item.metadata || {},
          pharmacyId,
        }),
      );

      const saved = await repo.save(entities);
      res.status(201).json(isBatch ? saved : saved[0]);
    } catch (error) {
      res.status(500).json({ message: 'Failed to save health reading' });
    }
  });

  // GET /health-readings/:patientId — list readings (pharmacy-scoped)
  // WO-O4O-CARE-PATIENT-SELF-INPUT-PHARMACY-VISIBILITY-FIX-V1
  // 권한 검증은 연결 관계로, 데이터 조회는 patient 기준으로
  router.get('/health-readings/:patientId', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const { patientId } = req.params;
      const pharmacyId = pcReq.pharmacyId;

      // Step 1: patientId → user_id 변환 (glucoseview_customers.id가 올 수 있음)
      const resolvedUserId = await resolvePatientUserId(dataSource, patientId);

      // Step 2: 약국-환자 연결 검증 (admin은 pharmacyId=null → 스킵)
      if (pharmacyId) {
        const linked = await dataSource.query(
          `SELECT id FROM glucoseview_customers
           WHERE organization_id = $1 AND (user_id = $2 OR id = $2)
           LIMIT 1`,
          [pharmacyId, patientId],
        );
        if (linked.length === 0) {
          res.status(403).json({
            success: false,
            error: { code: 'PATIENT_NOT_LINKED', message: 'Patient is not linked to this pharmacy' },
          });
          return;
        }
      }

      // Step 3: 연결 확인됨 → 해당 환자의 모든 데이터 조회
      const qb = repo
        .createQueryBuilder('r')
        .where('r.patient_id = :patientId', { patientId: resolvedUserId });

      // optional metric_type filter
      const metricType = req.query.metricType as string | undefined;
      if (metricType) {
        qb.andWhere('r.metric_type = :metricType', { metricType });
      }

      // optional date range
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      if (from) {
        qb.andWhere('r.measured_at >= :from', { from: new Date(from) });
      }
      if (to) {
        qb.andWhere('r.measured_at <= :to', { to: new Date(to) });
      }

      qb.orderBy('r.measured_at', 'DESC');

      const readings = await qb.getMany();
      res.json(readings);
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve health readings' });
    }
  });

  return router;
}

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { createPharmacyContextMiddleware } from '../care-pharmacy-context.middleware.js';
import type { PharmacyContextRequest } from '../care-pharmacy-context.middleware.js';
import { CareRiskService } from '../services/care-risk.service.js';
import { CarePriorityService } from '../services/care-priority.service.js';
import { CarePopulationService } from '../services/care-population.service.js';
import { CareAlertService } from '../services/care-alert.service.js';

export interface CareDashboardDto {
  totalPatients: number;
  highRiskCount: number;
  moderateRiskCount: number;
  lowRiskCount: number;
  recentCoachingCount: number;
  improvingCount: number;
  recentSnapshots: Array<{ patientId: string; riskLevel: string; createdAt: string }>;
  recentSessions: Array<{ patientId: string; summary: string; createdAt: string }>;
}

export function createCareDashboardRouter(dataSource: DataSource): Router {
  const router = Router();
  const requirePharmacyContext = createPharmacyContextMiddleware(dataSource);
  const riskService = new CareRiskService(dataSource);
  const priorityService = new CarePriorityService(dataSource);
  const populationService = new CarePopulationService(dataSource);
  const alertService = new CareAlertService(dataSource);

  router.get('/dashboard', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacyId = pcReq.pharmacyId;
      const userId = pcReq.user?.id;

      const result = await buildDashboard(dataSource, pharmacyId, userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Dashboard aggregation error' });
    }
  });

  // WO-O4O-CARE-RISK-PATIENT-DETECTION-V1
  // GET /risk-patients — composite risk score based patient detection
  router.get('/risk-patients', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacyId = pcReq.pharmacyId;

      const result = await riskService.getRiskPatients(pharmacyId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Risk patients retrieval error' });
    }
  });

  // WO-O4O-CARE-PRIORITY-PATIENT-ENGINE-V1
  // GET /priority-patients — top N patients by priority score
  router.get('/priority-patients', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacyId = pcReq.pharmacyId;

      const priorityPatients = await priorityService.getTopPriorityPatients(pharmacyId);
      res.json({ priorityPatients });
    } catch (error) {
      res.status(500).json({ message: 'Priority patients retrieval error' });
    }
  });

  // WO-O4O-CARE-POPULATION-DASHBOARD-V1
  // GET /population-dashboard — population-level statistics
  router.get('/population-dashboard', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacyId = pcReq.pharmacyId;

      const result = await populationService.getPopulationDashboard(pharmacyId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Population dashboard retrieval error' });
    }
  });

  // WO-O4O-CARE-TODAY-PRIORITY-PATIENTS-V1
  // GET /today-priority — today's priority patients for pharmacy home
  router.get('/today-priority', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacyId = pcReq.pharmacyId;
      if (!pharmacyId) {
        res.json([]);
        return;
      }

      const patients = await priorityService.getTodayPriorityPatients(pharmacyId);
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: 'Today priority patients retrieval error' });
    }
  });

  // WO-O4O-CARE-ALERT-ENGINE-V1
  // GET /alerts — active alerts for pharmacy
  router.get('/alerts', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacyId = pcReq.pharmacyId;
      if (!pharmacyId) {
        res.json([]);
        return;
      }

      const alerts = await alertService.getActiveAlerts(pharmacyId);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: 'Alert retrieval error' });
    }
  });

  // PATCH /alerts/:id/ack — acknowledge alert
  router.patch('/alerts/:id/ack', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacyId = pcReq.pharmacyId;
      if (!pharmacyId) {
        res.status(400).json({ message: 'Pharmacy context required' });
        return;
      }

      await alertService.acknowledgeAlert(req.params.id, pharmacyId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Alert acknowledge error' });
    }
  });

  // PATCH /alerts/:id/resolve — resolve alert
  router.patch('/alerts/:id/resolve', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const pharmacyId = pcReq.pharmacyId;
      if (!pharmacyId) {
        res.status(400).json({ message: 'Pharmacy context required' });
        return;
      }

      await alertService.resolveAlert(req.params.id, pharmacyId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Alert resolve error' });
    }
  });

  return router;
}

/**
 * Build dashboard with pharmacy-level data isolation.
 * pharmacyId = null means admin (global view).
 */
async function buildDashboard(
  ds: DataSource,
  pharmacyId: string | null | undefined,
  userId: string | undefined
): Promise<CareDashboardDto> {
  const isAdmin = pharmacyId === null;

  // A. Total patients from glucoseview_customers
  // WO-ORG-RESOLUTION-UNIFICATION-V1: organization_id 기준 (pharmacist_id → organization_id)
  const totalResult = isAdmin
    ? await ds.query(`SELECT COUNT(*)::int AS count FROM glucoseview_customers`)
    : await ds.query(
        `SELECT COUNT(*)::int AS count FROM glucoseview_customers WHERE organization_id = $1`,
        [pharmacyId]
      );
  const totalPatients = totalResult[0]?.count ?? 0;

  // B. Risk distribution — latest snapshot per patient (pharmacy-scoped)
  const riskQuery = isAdmin
    ? `
      SELECT s.risk_level, COUNT(*)::int AS count
      FROM care_kpi_snapshots s
      INNER JOIN (
        SELECT patient_id, MAX(created_at) AS max_at
        FROM care_kpi_snapshots
        GROUP BY patient_id
      ) latest ON s.patient_id = latest.patient_id AND s.created_at = latest.max_at
      GROUP BY s.risk_level
    `
    : `
      SELECT s.risk_level, COUNT(*)::int AS count
      FROM care_kpi_snapshots s
      INNER JOIN (
        SELECT patient_id, MAX(created_at) AS max_at
        FROM care_kpi_snapshots
        WHERE pharmacy_id = $1
        GROUP BY patient_id
      ) latest ON s.patient_id = latest.patient_id AND s.created_at = latest.max_at
      WHERE s.pharmacy_id = $1
      GROUP BY s.risk_level
    `;
  const riskRows: Array<{ risk_level: string; count: number }> = isAdmin
    ? await ds.query(riskQuery)
    : await ds.query(riskQuery, [pharmacyId]);

  let highRiskCount = 0;
  let moderateRiskCount = 0;
  let lowRiskCount = 0;
  for (const row of riskRows) {
    if (row.risk_level === 'high') highRiskCount = row.count;
    else if (row.risk_level === 'moderate') moderateRiskCount = row.count;
    else if (row.risk_level === 'low') lowRiskCount = row.count;
  }

  // C. Recent coaching count (last 7 days, pharmacy-scoped)
  const coachingResult = isAdmin
    ? await ds.query(`
        SELECT COUNT(*)::int AS count
        FROM care_coaching_sessions
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `)
    : await ds.query(`
        SELECT COUNT(*)::int AS count
        FROM care_coaching_sessions
        WHERE created_at >= NOW() - INTERVAL '7 days' AND pharmacy_id = $1
      `, [pharmacyId]);
  const recentCoachingCount = coachingResult[0]?.count ?? 0;

  // D. Improving count — patients where latest TIR > previous TIR (pharmacy-scoped)
  const improvingQuery = isAdmin
    ? `
      WITH ranked AS (
        SELECT patient_id, tir,
               ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY created_at DESC) AS rn
        FROM care_kpi_snapshots
      )
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT r1.patient_id
        FROM ranked r1
        JOIN ranked r2 ON r1.patient_id = r2.patient_id AND r2.rn = 2
        WHERE r1.rn = 1 AND r1.tir > r2.tir
      ) improving
    `
    : `
      WITH ranked AS (
        SELECT patient_id, tir,
               ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY created_at DESC) AS rn
        FROM care_kpi_snapshots
        WHERE pharmacy_id = $1
      )
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT r1.patient_id
        FROM ranked r1
        JOIN ranked r2 ON r1.patient_id = r2.patient_id AND r2.rn = 2
        WHERE r1.rn = 1 AND r1.tir > r2.tir
      ) improving
    `;
  const improvingResult = isAdmin
    ? await ds.query(improvingQuery)
    : await ds.query(improvingQuery, [pharmacyId]);
  const improvingCount = improvingResult[0]?.count ?? 0;

  // E. Latest snapshot per patient (pharmacy-scoped)
  const recentSnapshots = isAdmin
    ? await ds.query(`
        SELECT s.patient_id AS "patientId", s.risk_level AS "riskLevel", s.created_at AS "createdAt"
        FROM care_kpi_snapshots s
        INNER JOIN (
          SELECT patient_id, MAX(created_at) AS max_at
          FROM care_kpi_snapshots
          GROUP BY patient_id
        ) latest ON s.patient_id = latest.patient_id AND s.created_at = latest.max_at
        ORDER BY s.created_at DESC
      `)
    : await ds.query(`
        SELECT s.patient_id AS "patientId", s.risk_level AS "riskLevel", s.created_at AS "createdAt"
        FROM care_kpi_snapshots s
        INNER JOIN (
          SELECT patient_id, MAX(created_at) AS max_at
          FROM care_kpi_snapshots
          WHERE pharmacy_id = $1
          GROUP BY patient_id
        ) latest ON s.patient_id = latest.patient_id AND s.created_at = latest.max_at
        WHERE s.pharmacy_id = $1
        ORDER BY s.created_at DESC
      `, [pharmacyId]);

  // F. Recent 5 coaching sessions (pharmacy-scoped)
  const recentSessions = isAdmin
    ? await ds.query(`
        SELECT patient_id AS "patientId", summary, created_at AS "createdAt"
        FROM care_coaching_sessions
        ORDER BY created_at DESC
        LIMIT 5
      `)
    : await ds.query(`
        SELECT patient_id AS "patientId", summary, created_at AS "createdAt"
        FROM care_coaching_sessions
        WHERE pharmacy_id = $1
        ORDER BY created_at DESC
        LIMIT 5
      `, [pharmacyId]);

  return {
    totalPatients,
    highRiskCount,
    moderateRiskCount,
    lowRiskCount,
    recentCoachingCount,
    improvingCount,
    recentSnapshots,
    recentSessions,
  };
}

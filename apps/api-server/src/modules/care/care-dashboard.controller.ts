import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../middleware/auth.middleware.js';
import { createPharmacyContextMiddleware } from './care-pharmacy-context.middleware.js';
import type { PharmacyContextRequest } from './care-pharmacy-context.middleware.js';

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

  // A. Total patients from glucoseview_customers (scoped by pharmacist_id)
  const totalResult = isAdmin
    ? await ds.query(`SELECT COUNT(*)::int AS count FROM glucoseview_customers`)
    : await ds.query(
        `SELECT COUNT(*)::int AS count FROM glucoseview_customers WHERE pharmacist_id = $1`,
        [userId]
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

  // E. Recent 5 snapshots (pharmacy-scoped)
  const recentSnapshots = isAdmin
    ? await ds.query(`
        SELECT patient_id AS "patientId", risk_level AS "riskLevel", created_at AS "createdAt"
        FROM care_kpi_snapshots
        ORDER BY created_at DESC
        LIMIT 5
      `)
    : await ds.query(`
        SELECT patient_id AS "patientId", risk_level AS "riskLevel", created_at AS "createdAt"
        FROM care_kpi_snapshots
        WHERE pharmacy_id = $1
        ORDER BY created_at DESC
        LIMIT 5
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

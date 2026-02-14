import { Router } from 'express';
import type { DataSource } from 'typeorm';

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

  router.get('/dashboard', async (_req, res) => {
    try {
      const result = await buildDashboard(dataSource);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Dashboard aggregation error' });
    }
  });

  return router;
}

async function buildDashboard(ds: DataSource): Promise<CareDashboardDto> {
  // A. Total patients from glucoseview_customers
  const totalResult = await ds.query(
    `SELECT COUNT(*)::int AS count FROM glucoseview_customers`
  );
  const totalPatients = totalResult[0]?.count ?? 0;

  // B. Risk distribution — latest snapshot per patient
  const riskRows: Array<{ risk_level: string; count: number }> = await ds.query(`
    SELECT s.risk_level, COUNT(*)::int AS count
    FROM care_kpi_snapshots s
    INNER JOIN (
      SELECT patient_id, MAX(created_at) AS max_at
      FROM care_kpi_snapshots
      GROUP BY patient_id
    ) latest ON s.patient_id = latest.patient_id AND s.created_at = latest.max_at
    GROUP BY s.risk_level
  `);

  let highRiskCount = 0;
  let moderateRiskCount = 0;
  let lowRiskCount = 0;
  for (const row of riskRows) {
    if (row.risk_level === 'high') highRiskCount = row.count;
    else if (row.risk_level === 'moderate') moderateRiskCount = row.count;
    else if (row.risk_level === 'low') lowRiskCount = row.count;
  }

  // C. Recent coaching count (last 7 days)
  const coachingResult = await ds.query(`
    SELECT COUNT(*)::int AS count
    FROM care_coaching_sessions
    WHERE created_at >= NOW() - INTERVAL '7 days'
  `);
  const recentCoachingCount = coachingResult[0]?.count ?? 0;

  // D. Improving count — patients where latest TIR > previous TIR
  const improvingResult = await ds.query(`
    WITH ranked AS (
      SELECT patient_id, tir, risk_level,
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
  `);
  const improvingCount = improvingResult[0]?.count ?? 0;

  // E. Recent 5 snapshots
  const recentSnapshots = await ds.query(`
    SELECT patient_id AS "patientId", risk_level AS "riskLevel", created_at AS "createdAt"
    FROM care_kpi_snapshots
    ORDER BY created_at DESC
    LIMIT 5
  `);

  // F. Recent 5 coaching sessions
  const recentSessions = await ds.query(`
    SELECT patient_id AS "patientId", summary, created_at AS "createdAt"
    FROM care_coaching_sessions
    ORDER BY created_at DESC
    LIMIT 5
  `);

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

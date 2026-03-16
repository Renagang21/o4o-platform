/**
 * GlycoPharm Test Account Audit (TEMPORARY)
 * IR-GLYCOPHARM-TEST-ACCOUNT-EXTRACT-V2
 * WO-O4O-USER-DOMAIN-ALIGNMENT-V1: Platform admin auth required
 *
 * READ-ONLY: SELECT queries only.
 * Remove after test account extraction is complete.
 *
 * GET /__debug__/glycopharm-test-accounts
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware.js';

export function createGlycopharmTestAccountsRouter(dataSource: DataSource): Router {
  const router = Router();

  router.get('/', authenticate as any, requireAdmin as any, async (_req: Request, res: Response): Promise<void> => {
    if (!dataSource.isInitialized) {
      res.status(503).json({ error: 'Database not initialized' });
      return;
    }

    try {
      // 1. Patients with health data + linked pharmacist
      const accounts = await dataSource.query(`
        SELECT
          gc.id              AS patient_id,
          gc.name            AS patient_name,
          gc.email           AS patient_email,
          u_patient.id       AS patient_user_id,
          u_patient.status   AS patient_user_status,
          o.id               AS pharmacy_id,
          o.name             AS pharmacy_name,
          u_pharmacist.id    AS pharmacist_user_id,
          u_pharmacist.email AS pharmacist_email,
          COUNT(hr.id)::int  AS glucose_records
        FROM glucoseview_customers gc
        JOIN users u_patient ON u_patient.email = gc.email
        LEFT JOIN organizations o ON o.id = gc.organization_id
        LEFT JOIN users u_pharmacist ON u_pharmacist.id = o.created_by_user_id
        LEFT JOIN health_readings hr ON hr.patient_id = gc.id
        GROUP BY
          gc.id, gc.name, gc.email, u_patient.id, u_patient.status,
          o.id, o.name, u_pharmacist.id, u_pharmacist.email
        ORDER BY glucose_records DESC
        LIMIT 10
      `);

      // 2. Summary counts
      const summary = await dataSource.query(`
        SELECT 'glucoseview_customers' AS t, COUNT(*)::int AS c FROM glucoseview_customers
        UNION ALL SELECT 'health_readings', COUNT(*)::int FROM health_readings
        UNION ALL SELECT 'care_kpi_snapshots', COUNT(*)::int FROM care_kpi_snapshots
      `);

      // 3. All glycopharm-related users (pharmacists/operators)
      const glycopharmUsers = await dataSource.query(`
        SELECT
          u.id, u.email, u.name, u.status,
          ra.role, ra.is_active AS role_active
        FROM role_assignments ra
        JOIN users u ON u.id = ra.user_id
        WHERE ra.role LIKE 'glycopharm:%' OR ra.role LIKE 'glucoseview:%'
        ORDER BY ra.role, u.email
      `);

      res.json({
        timestamp: new Date().toISOString(),
        warning: 'READ-ONLY. Remove this endpoint after use.',
        summary: Object.fromEntries(summary.map((r: { t: string; c: number }) => [r.t, r.c])),
        glycopharmUsers,
        accounts,
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  return router;
}

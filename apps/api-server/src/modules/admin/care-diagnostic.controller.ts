/**
 * Care Data Diagnostic Controller
 *
 * WO-HOME-CGM-CARD-V1 — 데이터 스코프 진단 + 수정
 *
 * GET  /api/v1/ops/care-diagnostic          — 진단 (데이터 분포 확인)
 * POST /api/v1/ops/care-diagnostic/repair   — 수정 (organization_id 연결)
 *
 * 보안: X-Admin-Secret 헤더 필수
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import logger from '../../utils/logger.js';

function verifyAdminSecret(req: Request, res: Response): boolean {
  const secret = req.headers['x-admin-secret'] as string;
  const jwtSecret = process.env.JWT_SECRET;

  if (secret && jwtSecret && secret === jwtSecret) {
    return true;
  }

  res.status(401).json({ success: false, error: 'Invalid admin secret', code: 'ADMIN_SECRET_REQUIRED' });
  return false;
}

export function createCareDiagnosticRouter(dataSource: DataSource): Router {
  const router = Router();

  // GET /api/v1/ops/care-diagnostic — 진단
  router.get('/', async (req: Request, res: Response) => {
    if (!verifyAdminSecret(req, res)) return;

    try {
      const userId = (req.query.userId as string) || '2c8c2838-8e67-459e-a8c1-1b05fdc92f99';

      // 1. User's org
      const orgResult = await dataSource.query(
        `SELECT o.id, o.name, o."isActive"
         FROM organizations o
         WHERE o.created_by_user_id = $1`,
        [userId],
      );

      // 2. glucoseview_customers distribution by organization_id
      let customerDist: any[] = [];
      let customerNullCount = 0;
      let customerTotal = 0;
      try {
        customerDist = await dataSource.query(
          `SELECT organization_id, COUNT(*)::int AS count
           FROM glucoseview_customers
           GROUP BY organization_id
           ORDER BY count DESC`,
        );
        const nullRow = await dataSource.query(
          `SELECT COUNT(*)::int AS count FROM glucoseview_customers WHERE organization_id IS NULL`,
        );
        customerNullCount = nullRow[0]?.count ?? 0;
        const totalRow = await dataSource.query(
          `SELECT COUNT(*)::int AS count FROM glucoseview_customers`,
        );
        customerTotal = totalRow[0]?.count ?? 0;
      } catch {
        customerDist = [{ error: 'glucoseview_customers table not found' }];
      }

      // 3. care_kpi_snapshots distribution by pharmacy_id
      let snapshotDist: any[] = [];
      let snapshotTotal = 0;
      try {
        snapshotDist = await dataSource.query(
          `SELECT pharmacy_id, COUNT(*)::int AS count
           FROM care_kpi_snapshots
           GROUP BY pharmacy_id
           ORDER BY count DESC`,
        );
        const totalRow = await dataSource.query(
          `SELECT COUNT(*)::int AS count FROM care_kpi_snapshots`,
        );
        snapshotTotal = totalRow[0]?.count ?? 0;
      } catch {
        snapshotDist = [{ error: 'care_kpi_snapshots table not found' }];
      }

      // 4. care_coaching_sessions distribution
      let coachingDist: any[] = [];
      try {
        coachingDist = await dataSource.query(
          `SELECT pharmacy_id, COUNT(*)::int AS count
           FROM care_coaching_sessions
           GROUP BY pharmacy_id
           ORDER BY count DESC`,
        );
      } catch {
        coachingDist = [{ error: 'care_coaching_sessions table not found' }];
      }

      // 5. Enrollment check
      let enrollments: any[] = [];
      if (orgResult.length > 0) {
        enrollments = await dataSource.query(
          `SELECT id, organization_id, service_code, status
           FROM organization_service_enrollments
           WHERE organization_id = $1`,
          [orgResult[0].id],
        );
      }

      res.json({
        success: true,
        data: {
          userId,
          organization: orgResult[0] || null,
          enrollments,
          glucoseviewCustomers: {
            total: customerTotal,
            nullOrganizationId: customerNullCount,
            distribution: customerDist,
          },
          careKpiSnapshots: {
            total: snapshotTotal,
            distribution: snapshotDist,
          },
          careCoachingSessions: {
            distribution: coachingDist,
          },
        },
      });
    } catch (error: any) {
      logger.error('[CareDiagnostic] Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/v1/ops/care-diagnostic/repair — 수정
  router.post('/repair', async (req: Request, res: Response) => {
    if (!verifyAdminSecret(req, res)) return;

    try {
      const userId = (req.body.userId as string) || '2c8c2838-8e67-459e-a8c1-1b05fdc92f99';
      const dryRun = req.body.dryRun !== false; // default: dry run

      // Find user's org
      const orgResult = await dataSource.query(
        `SELECT o.id, o.name FROM organizations o WHERE o.created_by_user_id = $1`,
        [userId],
      );

      if (orgResult.length === 0) {
        res.status(404).json({ success: false, error: 'No organization found for user' });
        return;
      }

      const orgId = orgResult[0].id;
      const orgName = orgResult[0].name;
      const repairs: string[] = [];

      // Repair 1: glucoseview_customers with NULL organization_id
      try {
        const nullCustomers = await dataSource.query(
          `SELECT COUNT(*)::int AS count FROM glucoseview_customers WHERE organization_id IS NULL`,
        );
        const nullCount = nullCustomers[0]?.count ?? 0;

        if (nullCount > 0) {
          if (dryRun) {
            repairs.push(`[DRY RUN] Would link ${nullCount} customers (NULL org) → ${orgId} (${orgName})`);
          } else {
            await dataSource.query(
              `UPDATE glucoseview_customers SET organization_id = $1 WHERE organization_id IS NULL`,
              [orgId],
            );
            repairs.push(`Linked ${nullCount} customers (NULL org) → ${orgId} (${orgName})`);
          }
        } else {
          repairs.push('No NULL organization_id customers found');
        }
      } catch {
        repairs.push('glucoseview_customers table not found — skipped');
      }

      // Repair 2: care_kpi_snapshots with NULL pharmacy_id
      try {
        const nullSnapshots = await dataSource.query(
          `SELECT COUNT(*)::int AS count FROM care_kpi_snapshots WHERE pharmacy_id IS NULL`,
        );
        const nullCount = nullSnapshots[0]?.count ?? 0;

        if (nullCount > 0) {
          if (dryRun) {
            repairs.push(`[DRY RUN] Would link ${nullCount} snapshots (NULL pharmacy) → ${orgId}`);
          } else {
            await dataSource.query(
              `UPDATE care_kpi_snapshots SET pharmacy_id = $1 WHERE pharmacy_id IS NULL`,
              [orgId],
            );
            repairs.push(`Linked ${nullCount} snapshots (NULL pharmacy) → ${orgId}`);
          }
        } else {
          repairs.push('No NULL pharmacy_id snapshots found');
        }
      } catch {
        repairs.push('care_kpi_snapshots table not found — skipped');
      }

      // Repair 3: care_coaching_sessions with NULL pharmacy_id
      try {
        const nullSessions = await dataSource.query(
          `SELECT COUNT(*)::int AS count FROM care_coaching_sessions WHERE pharmacy_id IS NULL`,
        );
        const nullCount = nullSessions[0]?.count ?? 0;

        if (nullCount > 0) {
          if (dryRun) {
            repairs.push(`[DRY RUN] Would link ${nullCount} coaching sessions (NULL pharmacy) → ${orgId}`);
          } else {
            await dataSource.query(
              `UPDATE care_coaching_sessions SET pharmacy_id = $1 WHERE pharmacy_id IS NULL`,
              [orgId],
            );
            repairs.push(`Linked ${nullCount} coaching sessions (NULL pharmacy) → ${orgId}`);
          }
        } else {
          repairs.push('No NULL pharmacy_id coaching sessions found');
        }
      } catch {
        repairs.push('care_coaching_sessions table not found — skipped');
      }

      res.json({
        success: true,
        data: {
          userId,
          organizationId: orgId,
          organizationName: orgName,
          dryRun,
          repairs,
        },
      });
    } catch (error: any) {
      logger.error('[CareDiagnostic] Repair error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

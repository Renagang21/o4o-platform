/**
 * Demo Seed Admin Controller
 *
 * WO-DEMO-SEED-SCRIPT-V1
 *
 * POST /api/v1/admin/seed-demo   — 데모 조직 3개 + 관련 데이터 생성
 * DELETE /api/v1/admin/seed-demo — 데모 데이터 전체 삭제
 *
 * 규칙:
 * - Admin 인증 필수 (authenticate + requireAdmin)
 * - 모든 데모 데이터 이름에 [DEMO] 접두사
 * - Idempotent: 이미 존재하면 skip
 * - 개인정보 없음 (가상 데이터만)
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import logger from '../../utils/logger.js';

// ============================================================================
// Demo UUIDs (hex-safe, deterministic for idempotency)
// ============================================================================

const DEMO_IDS = {
  // Organizations
  orgCare:   'd0000000-de01-4000-a000-000000000001',
  orgStore:  'd0000000-de01-4000-a000-000000000002',
  orgHybrid: 'd0000000-de01-4000-a000-000000000003',

  // Pharmacies (same as org IDs — PK-shared FK pattern)
  pharmCare:   'd0000000-de01-4000-a000-000000000001',
  pharmStore:  'd0000000-de01-4000-a000-000000000002',
  pharmHybrid: 'd0000000-de01-4000-a000-000000000003',

  // Demo user (pharmacist) — used as seller/pharmacist/created_by
  userCare:   'd0000000-de02-4000-a000-000000000001',
  userStore:  'd0000000-de02-4000-a000-000000000002',
  userHybrid:'d0000000-de02-4000-a000-000000000003',

  // Patients (Care org: 12, Hybrid: 7 = 19 total)
  // Pattern: d0000000-de03-4000-a0XX-00000000000N
  patientPrefix: 'd0000000-de03-4000',

  // Products
  productPrefix: 'd0000000-de04-4000',

  // Orders
  orderPrefix: 'd0000000-de05-4000',

  // Coaching sessions
  coachingPrefix: 'd0000000-de06-4000',

  // KPI snapshots
  snapshotPrefix: 'd0000000-de07-4000',

};

// UUID format: 8-4-4-4-12
// prefix provides 8-4-4, we need 4-12
// 4th segment: a + orgIndex (1 hex) + itemIndex (2 hex) = 4 chars total (pad to 4)
// 5th segment: 12 hex chars

function demoUuid(prefix: string, orgIdx: number, itemIdx: number): string {
  const seg4 = `a${orgIdx.toString(16)}${itemIdx.toString(16).padStart(2, '0')}`;
  return `${prefix}-${seg4}-000000000001`;
}

function demoUuidLong(prefix: string, orgIdx: number, itemIdx: number): string {
  // For tables with many items, use 5th segment for item index
  const seg4 = `a00${orgIdx.toString(16)}`;
  const seg5 = itemIdx.toString(16).padStart(12, '0');
  return `${prefix}-${seg4}-${seg5}`;
}

// ============================================================================
// Seed Data
// ============================================================================

async function seedDemoData(ds: DataSource): Promise<{ created: string[]; skipped: string[] }> {
  const created: string[] = [];
  const skipped: string[] = [];

  const missingTables = new Set<string>();

  // Helper: check if table exists
  async function tableExists(table: string): Promise<boolean> {
    if (missingTables.has(table)) return false;
    try {
      const result = await ds.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) AS exists`,
        [table],
      );
      if (!result[0]?.exists) {
        missingTables.add(table);
        skipped.push(`[TABLE MISSING] ${table}`);
        return false;
      }
      return true;
    } catch {
      missingTables.add(table);
      return false;
    }
  }

  // Helper: insert if not exists (with table check)
  async function insertIfNotExists(table: string, id: string, sql: string, params: any[], label: string) {
    if (!(await tableExists(table))) return;
    try {
      const existing = await ds.query(`SELECT id FROM ${table} WHERE id = $1`, [id]);
      if (existing.length > 0) {
        skipped.push(label);
        return;
      }
      await ds.query(sql, params);
      created.push(label);
    } catch (error: any) {
      skipped.push(`[ERROR] ${label}: ${error.message}`);
    }
  }

  // ------------------------------------------------------------------
  // 1. Organizations (kpa_organizations)
  // ------------------------------------------------------------------
  const orgs = [
    { id: DEMO_IDS.orgCare, name: '[DEMO] Care 활성 약국', type: 'district_association' },
    { id: DEMO_IDS.orgStore, name: '[DEMO] Store 활성 약국', type: 'district_association' },
    { id: DEMO_IDS.orgHybrid, name: '[DEMO] Care+Store 복합 약국', type: 'district_association' },
  ];

  for (const org of orgs) {
    await insertIfNotExists(
      'kpa_organizations', org.id,
      `INSERT INTO kpa_organizations (id, name, type, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, true, NOW(), NOW())`,
      [org.id, org.name, org.type],
      `org:${org.name}`,
    );
  }

  // ------------------------------------------------------------------
  // 2. Pharmacies (organizations + enrollment) — unified model
  // ------------------------------------------------------------------
  const pharmacies = [
    { id: DEMO_IDS.pharmCare, name: '[DEMO] Care 약국', code: 'DEMO-CARE-001', bizNum: '000-00-00001', userId: DEMO_IDS.userCare },
    { id: DEMO_IDS.pharmStore, name: '[DEMO] Store 약국', code: 'DEMO-STORE-001', bizNum: '000-00-00002', userId: DEMO_IDS.userStore },
    { id: DEMO_IDS.pharmHybrid, name: '[DEMO] 복합 약국', code: 'DEMO-HYBRID-001', bizNum: '000-00-00003', userId: DEMO_IDS.userHybrid },
  ];

  for (const ph of pharmacies) {
    await insertIfNotExists(
      'organizations', ph.id,
      `INSERT INTO organizations (id, name, code, type, "isActive", level, path, business_number, created_by_user_id, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'pharmacy', true, 0, $3, $4, $5, NOW(), NOW())`,
      [ph.id, ph.name, ph.code, ph.bizNum, ph.userId],
      `pharmacy:${ph.name}`,
    );
    // Enrollment for glycopharm service
    await insertIfNotExists(
      'organization_service_enrollments', ph.id,
      `INSERT INTO organization_service_enrollments (organization_id, service_code, status, enrolled_at)
       VALUES ($1, 'glycopharm', 'active', NOW())
       ON CONFLICT (organization_id, service_code) DO NOTHING`,
      [ph.id],
      `enrollment:${ph.name}`,
    );
  }

  // ------------------------------------------------------------------
  // 3. Patients (glucoseview_customers)
  //    Care: 12, Hybrid: 7
  // ------------------------------------------------------------------
  const patientConfigs = [
    { orgIdx: 1, userId: DEMO_IDS.userCare, pharmacyId: DEMO_IDS.pharmCare, count: 12, label: 'Care' },
    { orgIdx: 3, userId: DEMO_IDS.userHybrid, pharmacyId: DEMO_IDS.pharmHybrid, count: 7, label: 'Hybrid' },
  ];

  for (const pc of patientConfigs) {
    for (let i = 1; i <= pc.count; i++) {
      const pid = demoUuid(DEMO_IDS.patientPrefix,pc.orgIdx, i);
      await insertIfNotExists(
        'glucoseview_customers', pid,
        `INSERT INTO glucoseview_customers (id, pharmacist_id, organization_id, name, phone, visit_count, sync_status, created_at, updated_at)
         VALUES ($1, $2, $5, $3, '010-0000-0000', $4, 'synced', NOW(), NOW())`,
        [pid, pc.userId, `[DEMO] ${pc.label} 환자 ${i}`, i, pc.pharmacyId],
        `patient:${pc.label}-${i}`,
      );
    }
  }

  // ------------------------------------------------------------------
  // 4. KPI Snapshots (care_kpi_snapshots)
  //    2 snapshots per patient (for recentChanges calculation)
  //    Care: 12×2=24, Hybrid: 7×2=14
  // ------------------------------------------------------------------
  const riskLevels = ['low', 'medium', 'high'];
  let snapIdx = 0;

  for (const pc of patientConfigs) {
    const pharmId = pc.orgIdx === 1 ? DEMO_IDS.pharmCare : DEMO_IDS.pharmHybrid;
    for (let i = 1; i <= pc.count; i++) {
      const pid = demoUuid(DEMO_IDS.patientPrefix,pc.orgIdx, i);

      // Older snapshot (14 days ago)
      const tirOld = 50 + Math.floor(i * 3);
      const cvOld = 40 - Math.floor(i * 1.5);
      const risk = riskLevels[i % 3];
      snapIdx++;
      const sid1 = demoUuidLong(DEMO_IDS.snapshotPrefix,pc.orgIdx, snapIdx);
      await insertIfNotExists(
        'care_kpi_snapshots', sid1,
        `INSERT INTO care_kpi_snapshots (id, pharmacy_id, patient_id, tir, cv, risk_level, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '14 days')`,
        [sid1, pharmId, pid, tirOld, cvOld, risk],
        `snapshot:${pc.label}-${i}-old`,
      );

      // Newer snapshot (2 days ago)
      const tirNew = tirOld + (i % 3 === 0 ? -5 : i % 3 === 1 ? 8 : 0);
      const cvNew = cvOld + (i % 3 === 0 ? 3 : i % 3 === 1 ? -4 : 0);
      const riskNew = i % 3 === 0 ? 'high' : i % 3 === 1 ? 'low' : 'medium';
      snapIdx++;
      const sid2 = demoUuidLong(DEMO_IDS.snapshotPrefix,pc.orgIdx, snapIdx);
      await insertIfNotExists(
        'care_kpi_snapshots', sid2,
        `INSERT INTO care_kpi_snapshots (id, pharmacy_id, patient_id, tir, cv, risk_level, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '2 days')`,
        [sid2, pharmId, pid, tirNew, cvNew, riskNew],
        `snapshot:${pc.label}-${i}-new`,
      );
    }
  }

  // ------------------------------------------------------------------
  // 5. Coaching Sessions (care_coaching_sessions)
  //    Care: 8 sessions (last 7 days), Hybrid: 4
  // ------------------------------------------------------------------
  const coachingConfigs = [
    { orgIdx: 1, pharmId: DEMO_IDS.pharmCare, userId: DEMO_IDS.userCare, count: 8, patientCount: 12, label: 'Care' },
    { orgIdx: 3, pharmId: DEMO_IDS.pharmHybrid, userId: DEMO_IDS.userHybrid, count: 4, patientCount: 7, label: 'Hybrid' },
  ];

  for (const cc of coachingConfigs) {
    for (let i = 1; i <= cc.count; i++) {
      const pid = demoUuid(DEMO_IDS.patientPrefix,cc.orgIdx, ((i - 1) % cc.patientCount) + 1);
      const cid = demoUuid(DEMO_IDS.coachingPrefix,cc.orgIdx, i);
      const daysAgo = Math.floor((i - 1) * 6 / cc.count); // spread across 6 days
      await insertIfNotExists(
        'care_coaching_sessions', cid,
        `INSERT INTO care_coaching_sessions (id, pharmacy_id, patient_id, pharmacist_id, summary, action_plan, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${daysAgo} days')`,
        [cid, cc.pharmId, pid, cc.userId, `[DEMO] ${cc.label} 상담 ${i}: 혈당 관리 가이드`, `[DEMO] 식이요법 조정, 운동 권장`],
        `coaching:${cc.label}-${i}`,
      );
    }
  }

  // ------------------------------------------------------------------
  // 6. Products (glycopharm_products)
  //    Store: 18, Hybrid: 12
  // ------------------------------------------------------------------
  const productConfigs = [
    { orgIdx: 2, pharmId: DEMO_IDS.pharmStore, count: 18, label: 'Store' },
    { orgIdx: 3, pharmId: DEMO_IDS.pharmHybrid, count: 12, label: 'Hybrid' },
  ];

  for (const pc of productConfigs) {
    for (let i = 1; i <= pc.count; i++) {
      const pid = demoUuid(DEMO_IDS.productPrefix,pc.orgIdx, i);
      const price = 10000 + i * 5000;
      await insertIfNotExists(
        'glycopharm_products', pid,
        `INSERT INTO glycopharm_products (id, pharmacy_id, name, sku, price, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())`,
        [pid, pc.pharmId, `[DEMO] ${pc.label} 상품 ${i}`, `DEMO-${pc.label.toUpperCase()}-${String(i).padStart(3, '0')}`, price],
        `product:${pc.label}-${i}`,
      );
    }
  }

  // ------------------------------------------------------------------
  // 7. Orders (checkout_orders) — camelCase columns!
  //    Store: 9 orders, Hybrid: 4 orders
  // ------------------------------------------------------------------
  const orderConfigs = [
    { orgIdx: 2, sellerId: DEMO_IDS.userStore, count: 9, label: 'Store' },
    { orgIdx: 3, sellerId: DEMO_IDS.userHybrid, count: 4, label: 'Hybrid' },
  ];

  for (const oc of orderConfigs) {
    for (let i = 1; i <= oc.count; i++) {
      const oid = demoUuid(DEMO_IDS.orderPrefix,oc.orgIdx, i);
      const amount = 50000 + i * 15000;
      const status = i <= Math.ceil(oc.count * 0.7) ? 'paid' : 'pending';
      const orderNum = `DEMO-${oc.label.toUpperCase()}-${String(i).padStart(4, '0')}`;
      const daysAgo = Math.floor((i - 1) * 28 / oc.count); // spread this month
      await insertIfNotExists(
        'checkout_orders', oid,
        `INSERT INTO checkout_orders (
           id, "orderNumber", "buyerId", "sellerId", "totalAmount", status, "paymentStatus",
           items, "orderType", "createdAt", "updatedAt"
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7,
           '[]'::jsonb, 'GLYCOPHARM', NOW() - INTERVAL '${daysAgo} days', NOW()
         )`,
        [oid, orderNum, oc.sellerId, oc.sellerId, amount, status, status === 'paid' ? 'PAID' : 'PENDING'],
        `order:${oc.label}-${i}`,
      );
    }
  }

  return { created, skipped };
}

// ============================================================================
// Cleanup
// ============================================================================

async function cleanupDemoData(ds: DataSource): Promise<{ deleted: string[] }> {
  const deleted: string[] = [];

  // Delete in reverse dependency order
  const tables = [
    { table: 'checkout_orders', pattern: DEMO_IDS.orderPrefix },
    { table: 'glycopharm_products', pattern: DEMO_IDS.productPrefix },
    { table: 'care_coaching_sessions', pattern: DEMO_IDS.coachingPrefix },
    { table: 'care_kpi_snapshots', pattern: DEMO_IDS.snapshotPrefix },
    { table: 'glucoseview_customers', pattern: DEMO_IDS.patientPrefix },
    { table: 'organization_service_enrollments', pattern: 'd0000000-de01-4000', column: 'organization_id' },
    { table: 'organizations', pattern: 'd0000000-de01-4000' },
  ];

  for (const { table, pattern, column } of tables as Array<{ table: string; pattern: string; column?: string }>) {
    try {
      const col = column || 'id';
      const result = await ds.query(
        `DELETE FROM ${table} WHERE ${col}::text LIKE $1`,
        [`${pattern}%`],
      );
      const count = result?.[1] ?? 0;
      if (count > 0) {
        deleted.push(`${table}: ${count} rows`);
      }
    } catch (error: any) {
      logger.warn(`[SeedDemo] Failed to clean ${table}:`, error.message);
    }
  }

  return { deleted };
}

// ============================================================================
// Router Factory
// ============================================================================

/**
 * Verify admin access: X-Admin-Secret header must match JWT_SECRET.
 * Returns true if authorized, sends 401 and returns false if not.
 */
function verifyAdminSecret(req: Request, res: Response): boolean {
  const secret = req.headers['x-admin-secret'] as string;
  const jwtSecret = process.env.JWT_SECRET;

  if (secret && jwtSecret && secret === jwtSecret) {
    return true;
  }

  res.status(401).json({ success: false, error: 'Invalid admin secret', code: 'ADMIN_SECRET_REQUIRED' });
  return false;
}

export function createSeedDemoRouter(dataSource: DataSource): Router {
  const router = Router();

  // POST /api/v1/admin/seed-demo — 데모 데이터 생성
  router.post('/', async (req: Request, res: Response) => {
    if (!verifyAdminSecret(req, res)) return;

    try {
      logger.info('[SeedDemo] Starting demo data seed...');
      const result = await seedDemoData(dataSource);
      logger.info(`[SeedDemo] Done. Created: ${result.created.length}, Skipped: ${result.skipped.length}`);
      res.json({
        success: true,
        message: `Demo seed complete. Created ${result.created.length}, skipped ${result.skipped.length}.`,
        data: result,
      });
    } catch (error: any) {
      logger.error('[SeedDemo] Seed failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'SEED_DEMO_FAILED',
      });
    }
  });

  // DELETE /api/v1/admin/seed-demo — 데모 데이터 삭제
  router.delete('/', async (req: Request, res: Response) => {
    if (!verifyAdminSecret(req, res)) return;

    try {
      logger.info('[SeedDemo] Starting demo data cleanup...');
      const result = await cleanupDemoData(dataSource);
      logger.info(`[SeedDemo] Cleanup done. ${result.deleted.length} tables affected.`);
      res.json({
        success: true,
        message: `Demo cleanup complete.`,
        data: result,
      });
    } catch (error: any) {
      logger.error('[SeedDemo] Cleanup failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'SEED_DEMO_CLEANUP_FAILED',
      });
    }
  });

  return router;
}

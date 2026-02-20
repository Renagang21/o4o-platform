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
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/permission.middleware.js';
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

  // Product applications
  appPrefix: 'd0000000-de08-4000',
};

function patientId(orgIndex: number, patientIndex: number): string {
  const hex = patientIndex.toString(16).padStart(2, '0');
  return `${DEMO_IDS.patientPrefix}-a0${orgIndex.toString(16).padStart(2, '0')}${hex}-000000000001`;
}

function productId(orgIndex: number, productIndex: number): string {
  const hex = productIndex.toString(16).padStart(2, '0');
  return `${DEMO_IDS.productPrefix}-a0${orgIndex.toString(16).padStart(2, '0')}${hex}-000000000001`;
}

function orderId(orgIndex: number, orderIndex: number): string {
  const hex = orderIndex.toString(16).padStart(2, '0');
  return `${DEMO_IDS.orderPrefix}-a0${orgIndex.toString(16).padStart(2, '0')}${hex}-000000000001`;
}

function coachingId(orgIndex: number, sessionIndex: number): string {
  const hex = sessionIndex.toString(16).padStart(2, '0');
  return `${DEMO_IDS.coachingPrefix}-a0${orgIndex.toString(16).padStart(2, '0')}${hex}-000000000001`;
}

function snapshotId(orgIndex: number, snapshotIndex: number): string {
  const hex = snapshotIndex.toString(16).padStart(4, '0');
  return `${DEMO_IDS.snapshotPrefix}-a0${orgIndex.toString(16).padStart(2, '0')}0-00000000${hex}`;
}

function appId(orgIndex: number, appIndex: number): string {
  const hex = appIndex.toString(16).padStart(2, '0');
  return `${DEMO_IDS.appPrefix}-a0${orgIndex.toString(16).padStart(2, '0')}${hex}-000000000001`;
}

// ============================================================================
// Seed Data
// ============================================================================

async function seedDemoData(ds: DataSource): Promise<{ created: string[]; skipped: string[] }> {
  const created: string[] = [];
  const skipped: string[] = [];

  // Helper: insert if not exists
  async function insertIfNotExists(table: string, id: string, sql: string, params: any[], label: string) {
    const existing = await ds.query(`SELECT id FROM ${table} WHERE id = $1`, [id]);
    if (existing.length > 0) {
      skipped.push(label);
      return;
    }
    await ds.query(sql, params);
    created.push(label);
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
  // 2. Pharmacies (glycopharm_pharmacies) — PK shared with org
  // ------------------------------------------------------------------
  const pharmacies = [
    { id: DEMO_IDS.pharmCare, name: '[DEMO] Care 약국', code: 'DEMO-CARE-001', bizNum: '000-00-00001', userId: DEMO_IDS.userCare },
    { id: DEMO_IDS.pharmStore, name: '[DEMO] Store 약국', code: 'DEMO-STORE-001', bizNum: '000-00-00002', userId: DEMO_IDS.userStore },
    { id: DEMO_IDS.pharmHybrid, name: '[DEMO] 복합 약국', code: 'DEMO-HYBRID-001', bizNum: '000-00-00003', userId: DEMO_IDS.userHybrid },
  ];

  for (const ph of pharmacies) {
    await insertIfNotExists(
      'glycopharm_pharmacies', ph.id,
      `INSERT INTO glycopharm_pharmacies (id, name, code, business_number, status, created_by_user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', $5, NOW(), NOW())`,
      [ph.id, ph.name, ph.code, ph.bizNum, ph.userId],
      `pharmacy:${ph.name}`,
    );
  }

  // ------------------------------------------------------------------
  // 3. Patients (glucoseview_customers)
  //    Care: 12, Hybrid: 7
  // ------------------------------------------------------------------
  const patientConfigs = [
    { orgIdx: 1, userId: DEMO_IDS.userCare, count: 12, label: 'Care' },
    { orgIdx: 3, userId: DEMO_IDS.userHybrid, count: 7, label: 'Hybrid' },
  ];

  for (const pc of patientConfigs) {
    for (let i = 1; i <= pc.count; i++) {
      const pid = patientId(pc.orgIdx, i);
      await insertIfNotExists(
        'glucoseview_customers', pid,
        `INSERT INTO glucoseview_customers (id, pharmacist_id, name, phone, visit_count, sync_status, created_at, updated_at)
         VALUES ($1, $2, $3, '010-0000-0000', $4, 'synced', NOW(), NOW())`,
        [pid, pc.userId, `[DEMO] ${pc.label} 환자 ${i}`, i],
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
      const pid = patientId(pc.orgIdx, i);

      // Older snapshot (14 days ago)
      const tirOld = 50 + Math.floor(i * 3);
      const cvOld = 40 - Math.floor(i * 1.5);
      const risk = riskLevels[i % 3];
      snapIdx++;
      const sid1 = snapshotId(pc.orgIdx, snapIdx);
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
      const sid2 = snapshotId(pc.orgIdx, snapIdx);
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
      const pid = patientId(cc.orgIdx, ((i - 1) % cc.patientCount) + 1);
      const cid = coachingId(cc.orgIdx, i);
      const daysAgo = Math.floor((i - 1) * 6 / cc.count); // spread across 6 days
      await insertIfNotExists(
        'care_coaching_sessions', cid,
        `INSERT INTO care_coaching_sessions (id, pharmacy_id, patient_id, pharmacist_id, summary, action_plan, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${daysAgo} days', NOW())`,
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
      const pid = productId(pc.orgIdx, i);
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
      const oid = orderId(oc.orgIdx, i);
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

  // ------------------------------------------------------------------
  // 8. Product Applications (organization_product_applications)
  //    Store: 5, Hybrid: 3
  // ------------------------------------------------------------------
  const appConfigs = [
    { orgIdx: 2, orgId: DEMO_IDS.orgStore, userId: DEMO_IDS.userStore, count: 5, label: 'Store' },
    { orgIdx: 3, orgId: DEMO_IDS.orgHybrid, userId: DEMO_IDS.userHybrid, count: 3, label: 'Hybrid' },
  ];

  for (const ac of appConfigs) {
    for (let i = 1; i <= ac.count; i++) {
      const aid = appId(ac.orgIdx, i);
      const status = i <= Math.ceil(ac.count * 0.4) ? 'approved' : 'pending';
      await insertIfNotExists(
        'organization_product_applications', aid,
        `INSERT INTO organization_product_applications (
           id, organization_id, service_key, external_product_id, product_name, status, requested_by, created_at, updated_at
         ) VALUES ($1, $2, 'glycopharm', $3, $4, $5, $6, NOW(), NOW())`,
        [aid, ac.orgId, `DEMO-EXT-${i}`, `[DEMO] ${ac.label} 신청 상품 ${i}`, status, ac.userId],
        `app:${ac.label}-${i}`,
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
    { table: 'organization_product_applications', pattern: DEMO_IDS.appPrefix },
    { table: 'checkout_orders', pattern: DEMO_IDS.orderPrefix },
    { table: 'glycopharm_products', pattern: DEMO_IDS.productPrefix },
    { table: 'care_coaching_sessions', pattern: DEMO_IDS.coachingPrefix },
    { table: 'care_kpi_snapshots', pattern: DEMO_IDS.snapshotPrefix },
    { table: 'glucoseview_customers', pattern: DEMO_IDS.patientPrefix },
    { table: 'glycopharm_pharmacies', pattern: 'd0000000-de01-4000' },
    { table: 'kpa_organizations', pattern: 'd0000000-de01-4000' },
  ];

  for (const { table, pattern } of tables) {
    try {
      const result = await ds.query(
        `DELETE FROM ${table} WHERE id::text LIKE $1`,
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

export function createSeedDemoRouter(dataSource: DataSource): Router {
  const router = Router();

  router.use(authenticate);
  router.use(requireAdmin);

  // POST /api/v1/admin/seed-demo — 데모 데이터 생성
  router.post('/', async (_req: Request, res: Response) => {
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
  router.delete('/', async (_req: Request, res: Response) => {
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

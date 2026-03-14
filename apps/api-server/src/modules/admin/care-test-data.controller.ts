/**
 * Care Test Environment Seed — WO-GLYCOPHARM-CARE-TEST-ENV-FIX-V1
 *
 * Complete Care test environment in one call:
 *   Users (3) + Role Assignments (3) + Organizations (2) +
 *   Enrollments (2) + Members (2) + Patients (5) + Health Readings (~430)
 *
 * POST   /api/v1/ops/care-test-data   — Create full test env (no body needed)
 * DELETE /api/v1/ops/care-test-data   — Full cleanup
 *
 * Auth: X-Admin-Secret header (= JWT_SECRET)
 *
 * Test accounts (password: Test1234!):
 *   care.admin@test.glycopharm.com      — platform:admin (전체 조회)
 *   pharmacist.a@test.glycopharm.com    — 약사A (약국A 환자 3명)
 *   pharmacist.b@test.glycopharm.com    — 약사B (약국B 환자 2명)
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import bcrypt from 'bcrypt';
import logger from '../../utils/logger.js';

/* ═══════════════════════════════════════════
 * Deterministic Test UUIDs
 * ═══════════════════════════════════════════ */

// Users (ee20)
const TU = {
  admin:  'e0000000-ee20-4000-a000-000000000001',
  pharmA: 'e0000000-ee20-4000-a000-000000000002',
  pharmB: 'e0000000-ee20-4000-a000-000000000003',
} as const;

// Organizations / Pharmacies (ee21)
const TO = {
  pharmA: 'e0000000-ee21-4000-a000-000000000001',
  pharmB: 'e0000000-ee21-4000-a000-000000000002',
} as const;

// Role Assignments (ee22)
const TR = {
  admin:  'e0000000-ee22-4000-a000-000000000001',
  pharmA: 'e0000000-ee22-4000-a000-000000000002',
  pharmB: 'e0000000-ee22-4000-a000-000000000003',
} as const;

// Enrollments (ee23)
const TE = {
  pharmA: 'e0000000-ee23-4000-a000-000000000001',
  pharmB: 'e0000000-ee23-4000-a000-000000000002',
} as const;

// Patients (ee10) — kept from V1
const TP = {
  p1: 'e0000000-ee10-4000-a000-000000000001',
  p2: 'e0000000-ee10-4000-a000-000000000002',
  p3: 'e0000000-ee10-4000-a000-000000000003',
  p4: 'e0000000-ee10-4000-a000-000000000004',
  p5: 'e0000000-ee10-4000-a000-000000000005',
} as const;

const ALL_USER_IDS = Object.values(TU);
const ALL_ORG_IDS = Object.values(TO);
const ALL_RA_IDS = Object.values(TR);
const ALL_ENR_IDS = Object.values(TE);
const ALL_PATIENT_IDS = Object.values(TP);

const TEST_PASSWORD = 'Test1234!';

/* ═══════════════════════════════════════════
 * Test Data Definitions
 * ═══════════════════════════════════════════ */

const TEST_USERS = [
  { id: TU.admin,  email: 'care.admin@test.glycopharm.com',   name: '[TEST] Care 운영자', roles: ['platform:admin'] },
  { id: TU.pharmA, email: 'pharmacist.a@test.glycopharm.com', name: '[TEST] 약사 김',     roles: ['glycopharm:pharmacist'] },
  { id: TU.pharmB, email: 'pharmacist.b@test.glycopharm.com', name: '[TEST] 약사 이',     roles: ['glycopharm:pharmacist'] },
];

const TEST_ROLE_ASSIGNMENTS = [
  { id: TR.admin,  userId: TU.admin,  role: 'platform:admin',        scopeType: 'global',       scopeId: null },
  { id: TR.pharmA, userId: TU.pharmA, role: 'glycopharm:pharmacist', scopeType: 'organization', scopeId: TO.pharmA },
  { id: TR.pharmB, userId: TU.pharmB, role: 'glycopharm:pharmacist', scopeType: 'organization', scopeId: TO.pharmB },
];

const TEST_ORGS = [
  { id: TO.pharmA, name: '[TEST] Care 약국 A', code: 'TEST-CARE-PHARM-A', createdBy: TU.pharmA },
  { id: TO.pharmB, name: '[TEST] Care 약국 B', code: 'TEST-CARE-PHARM-B', createdBy: TU.pharmB },
];

const TEST_MEMBERS = [
  { orgId: TO.pharmA, userId: TU.pharmA, role: 'owner' },
  { orgId: TO.pharmB, userId: TU.pharmB, role: 'owner' },
];

const TEST_ENROLLMENTS = [
  { id: TE.pharmA, orgId: TO.pharmA },
  { id: TE.pharmB, orgId: TO.pharmB },
];

interface TestPatient {
  id: string;
  name: string;
  birthYear: number;
  gender: string;
  type: 'normal' | 'high_risk' | 'hypoglycemic' | 'postprandial' | 'data_missing';
  description: string;
  pharmacyId: string;
  pharmacistId: string;
}

const TEST_PATIENTS: TestPatient[] = [
  // Pharmacy A — 3 patients
  { id: TP.p1, name: '김정상', birthYear: 1975, gender: 'male',   type: 'normal',       description: '정상 혈당 (TIR≈85%)',           pharmacyId: TO.pharmA, pharmacistId: TU.pharmA },
  { id: TP.p2, name: '박위험', birthYear: 1960, gender: 'female', type: 'high_risk',    description: '고위험 (TIR<50%, 심한 변동)',     pharmacyId: TO.pharmA, pharmacistId: TU.pharmA },
  { id: TP.p3, name: '이저혈', birthYear: 1968, gender: 'male',   type: 'hypoglycemic', description: '야간 저혈당 (새벽 50대)',         pharmacyId: TO.pharmA, pharmacistId: TU.pharmA },
  // Pharmacy B — 2 patients
  { id: TP.p4, name: '최식후', birthYear: 1972, gender: 'female', type: 'postprandial', description: '식후 고혈당 (공복 정상, 식후 200+)', pharmacyId: TO.pharmB, pharmacistId: TU.pharmB },
  { id: TP.p5, name: '정미입', birthYear: 1980, gender: 'male',   type: 'data_missing', description: '데이터 미입력 (3일 이상 공백)',      pharmacyId: TO.pharmB, pharmacistId: TU.pharmB },
];

/* ═══════════════════════════════════════════
 * Deterministic random + helpers
 * ═══════════════════════════════════════════ */

function srand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function clamp(val: number, min: number, max: number): number {
  return Math.round(Math.max(min, Math.min(max, val)));
}

/* ═══════════════════════════════════════════
 * Health reading generators
 * ═══════════════════════════════════════════ */

interface ReadingRow {
  valueNumeric: number | null;
  valueText: string | null;
  measuredAt: Date;
  metricType: string;
  unit: string;
  sourceType: string;
}

const DAILY_SLOTS = [7, 9, 12, 14, 18, 20, 22];

function generateGlucose(type: TestPatient['type'], patientSeed: number): ReadingRow[] {
  const rows: ReadingRow[] = [];
  const now = new Date();

  if (type === 'data_missing') {
    for (let i = 0; i < 3; i++) {
      const dt = new Date(now);
      dt.setDate(dt.getDate() - (10 + i));
      dt.setHours(9, 0, 0, 0);
      rows.push({
        valueNumeric: clamp(110 + srand(patientSeed + i * 17) * 30, 90, 140),
        valueText: null, measuredAt: dt, metricType: 'glucose', unit: 'mg/dL', sourceType: 'manual',
      });
    }
    return rows;
  }

  for (let day = 0; day < 14; day++) {
    for (let s = 0; s < DAILY_SLOTS.length; s++) {
      const dt = new Date(now);
      dt.setDate(dt.getDate() - (13 - day));
      dt.setHours(DAILY_SLOTS[s], Math.floor(srand(day * 100 + s) * 30), 0, 0);

      const r = srand(patientSeed + day * 7 + s);
      let value = 100;

      switch (type) {
        case 'normal': {
          const pm = s % 2 === 1;
          value = pm ? clamp(135 + r * 40 - 20, 105, 170) : clamp(92 + r * 25 - 12, 78, 112);
          break;
        }
        case 'high_risk': {
          if (r < 0.3) value = clamp(45 + r * 50, 35, 65);
          else if (r < 0.65) value = clamp(210 + r * 110, 195, 320);
          else value = clamp(110 + r * 70, 90, 175);
          break;
        }
        case 'hypoglycemic': {
          const night = s <= 1 || s >= 6;
          value = night ? clamp(52 + r * 20 - 10, 38, 68) : clamp(105 + r * 50 - 25, 75, 155);
          break;
        }
        case 'postprandial': {
          const pm = s % 2 === 1;
          value = pm ? clamp(235 + r * 60 - 30, 200, 285) : clamp(95 + r * 20 - 10, 82, 112);
          break;
        }
      }

      rows.push({
        valueNumeric: value, valueText: null, measuredAt: dt,
        metricType: 'glucose', unit: 'mg/dL', sourceType: day < 7 ? 'cgm' : 'manual',
      });
    }
  }
  return rows;
}

function generateBP(patientSeed: number): ReadingRow[] {
  const rows: ReadingRow[] = [];
  const now = new Date();
  for (let day = 0; day < 14; day++) {
    for (const hour of [8, 20]) {
      const dt = new Date(now);
      dt.setDate(dt.getDate() - (13 - day));
      dt.setHours(hour, 0, 0, 0);
      const r = srand(patientSeed + day * 2 + (hour === 20 ? 1 : 0) + 500);
      const sys = clamp(150 + r * 30 - 15, 138, 175);
      const dia = clamp(95 + r * 15 - 7, 88, 108);
      rows.push({
        valueNumeric: null, valueText: `${sys}/${dia}`, measuredAt: dt,
        metricType: 'blood_pressure', unit: 'mmHg', sourceType: 'manual',
      });
    }
  }
  return rows;
}

function generateWeight(patientSeed: number): ReadingRow[] {
  const rows: ReadingRow[] = [];
  const now = new Date();
  for (let week = 0; week < 2; week++) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - (13 - week * 7));
    dt.setHours(7, 30, 0, 0);
    rows.push({
      valueNumeric: 78.5 + week * 0.3 + srand(patientSeed + week + 700) * 0.4,
      valueText: null, measuredAt: dt, metricType: 'weight', unit: 'kg', sourceType: 'manual',
    });
  }
  return rows;
}

/* ═══════════════════════════════════════════
 * Auth helper
 * ═══════════════════════════════════════════ */

function verifyAdminSecret(req: Request, res: Response): boolean {
  const secret = req.headers['x-admin-secret'] as string;
  const jwtSecret = process.env.JWT_SECRET;
  if (secret && jwtSecret && secret === jwtSecret) return true;
  res.status(401).json({ success: false, error: 'Invalid admin secret', code: 'ADMIN_SECRET_REQUIRED' });
  return false;
}

/* ═══════════════════════════════════════════
 * Cleanup tables (reverse dependency order)
 * ═══════════════════════════════════════════ */

const PATIENT_DATA_TABLES = [
  'care_coaching_drafts',
  'care_llm_insights',
  'patient_ai_insights',
  'care_alerts',
  'care_coaching_sessions',
  'care_kpi_snapshots',
  'health_readings',
  'glucoseview_customers',
];

/* ═══════════════════════════════════════════
 * Router
 * ═══════════════════════════════════════════ */

export function createCareTestDataRouter(dataSource: DataSource): Router {
  const router = Router();

  /* ─── POST: Create complete test environment ─── */
  router.post('/', async (req: Request, res: Response) => {
    if (!verifyAdminSecret(req, res)) return;

    try {
      const log: string[] = [];
      const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

      // ──────────────────────────────────────
      // Phase 0: Cleanup all existing test data
      // ──────────────────────────────────────
      for (const table of PATIENT_DATA_TABLES) {
        try {
          const col = table === 'glucoseview_customers' ? 'id' : 'patient_id';
          await dataSource.query(`DELETE FROM ${table} WHERE ${col} = ANY($1)`, [ALL_PATIENT_IDS]);
        } catch { /* table may not exist */ }
      }
      try { await dataSource.query(`DELETE FROM organization_service_enrollments WHERE id = ANY($1)`, [ALL_ENR_IDS]); } catch { /* skip */ }
      try { await dataSource.query(`DELETE FROM organization_members WHERE organization_id = ANY($1)`, [ALL_ORG_IDS]); } catch { /* skip */ }
      try { await dataSource.query(`DELETE FROM role_assignments WHERE id = ANY($1)`, [ALL_RA_IDS]); } catch { /* skip */ }
      try { await dataSource.query(`DELETE FROM organizations WHERE id = ANY($1)`, [ALL_ORG_IDS]); } catch { /* skip */ }
      try { await dataSource.query(`DELETE FROM users WHERE id = ANY($1)`, [ALL_USER_IDS]); } catch { /* skip */ }
      log.push('cleanup: done');

      // ──────────────────────────────────────
      // Phase 1: Users
      // ──────────────────────────────────────
      for (const u of TEST_USERS) {
        await dataSource.query(
          `INSERT INTO users (id, email, password, name, "isActive", "isEmailVerified", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, true, true, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, "updatedAt" = NOW()`,
          [u.id, u.email, passwordHash, u.name],
        );
      }
      log.push(`users: ${TEST_USERS.length} created`);

      // ──────────────────────────────────────
      // Phase 2: Role Assignments (RBAC SSOT)
      // ──────────────────────────────────────
      for (const ra of TEST_ROLE_ASSIGNMENTS) {
        await dataSource.query(
          `INSERT INTO role_assignments (id, user_id, role, is_active, scope_type, scope_id, assigned_at)
           VALUES ($1, $2, $3, true, $4, $5, NOW())
           ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, is_active = true`,
          [ra.id, ra.userId, ra.role, ra.scopeType, ra.scopeId],
        );
      }
      log.push(`role_assignments: ${TEST_ROLE_ASSIGNMENTS.length} created`);

      // ──────────────────────────────────────
      // Phase 3: Organizations (Pharmacies)
      // ──────────────────────────────────────
      for (const o of TEST_ORGS) {
        await dataSource.query(
          `INSERT INTO organizations (id, name, code, type, level, path, "isActive", metadata, created_by_user_id, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, 'pharmacy', 0, $4, true, $5::jsonb, $6, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name, created_by_user_id = EXCLUDED.created_by_user_id, "updatedAt" = NOW()`,
          [o.id, o.name, o.code, '/' + o.code, JSON.stringify({ serviceKey: 'glycopharm' }), o.createdBy],
        );
      }
      log.push(`organizations: ${TEST_ORGS.length} created`);

      // ──────────────────────────────────────
      // Phase 4: Organization Members
      // ──────────────────────────────────────
      for (const m of TEST_MEMBERS) {
        const exists = await dataSource.query(
          `SELECT id FROM organization_members WHERE organization_id = $1 AND user_id = $2`,
          [m.orgId, m.userId],
        );
        if (exists.length === 0) {
          await dataSource.query(
            `INSERT INTO organization_members (id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, true, NOW(), NOW(), NOW())`,
            [m.orgId, m.userId, m.role],
          );
        }
      }
      log.push(`organization_members: ${TEST_MEMBERS.length} linked`);

      // ──────────────────────────────────────
      // Phase 5: Service Enrollments (glycopharm)
      // ──────────────────────────────────────
      for (const e of TEST_ENROLLMENTS) {
        await dataSource.query(
          `INSERT INTO organization_service_enrollments (id, organization_id, service_code, status, enrolled_at, config, created_at, updated_at)
           VALUES ($1, $2, 'glycopharm', 'active', NOW(), '{}'::jsonb, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET status = 'active', updated_at = NOW()`,
          [e.id, e.orgId],
        );
      }
      log.push(`enrollments: ${TEST_ENROLLMENTS.length} glycopharm enrollments`);

      // ──────────────────────────────────────
      // Phase 6: Patients (glucoseview_customers)
      // ──────────────────────────────────────
      for (const p of TEST_PATIENTS) {
        await dataSource.query(
          `INSERT INTO glucoseview_customers
             (id, organization_id, pharmacist_id, name, birth_year, gender, notes,
              visit_count, sync_status, data_sharing_consent, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 'synced', true, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name, organization_id = EXCLUDED.organization_id, updated_at = NOW()`,
          [p.id, p.pharmacyId, p.pharmacistId, p.name, p.birthYear, p.gender, `[TEST] ${p.description}`],
        );
      }
      log.push(`patients: ${TEST_PATIENTS.length} created`);

      // ──────────────────────────────────────
      // Phase 7: Health Readings
      // ──────────────────────────────────────
      let totalReadings = 0;
      const readingSummary: Record<string, number> = {};

      for (let idx = 0; idx < TEST_PATIENTS.length; idx++) {
        const p = TEST_PATIENTS[idx];
        const seed = (idx + 1) * 1000;

        const glucose = generateGlucose(p.type, seed);
        const bp = p.type === 'high_risk' ? generateBP(seed) : [];
        const weight = p.type === 'high_risk' ? generateWeight(seed) : [];
        const all = [...glucose, ...bp, ...weight];
        readingSummary[p.name] = all.length;

        for (const r of all) {
          await dataSource.query(
            `INSERT INTO health_readings
               (patient_id, metric_type, value_numeric, value_text, unit, measured_at, source_type, pharmacy_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [p.id, r.metricType, r.valueNumeric, r.valueText, r.unit, r.measuredAt, r.sourceType, p.pharmacyId],
          );
        }
        totalReadings += all.length;
      }
      log.push(`health_readings: ${totalReadings} total`);

      logger.info(`[CareTestData] Environment created: ${log.join(', ')}`);

      // ──────────────────────────────────────
      // Response
      // ──────────────────────────────────────
      res.json({
        success: true,
        data: {
          summary: log,
          accounts: TEST_USERS.map((u) => ({
            email: u.email,
            password: TEST_PASSWORD,
            role: u.roles[0],
            ...(u.id === TU.admin ? { note: 'Admin — 전체 환자 조회 (pharmacyId=null)' } : {}),
          })),
          pharmacies: TEST_ORGS.map((o) => ({
            id: o.id,
            name: o.name,
            owner: TEST_USERS.find((u) => u.id === o.createdBy)?.email,
          })),
          patients: TEST_PATIENTS.map((p) => ({
            id: p.id,
            name: p.name,
            type: p.type,
            pharmacy: TEST_ORGS.find((o) => o.id === p.pharmacyId)?.name,
            readings: readingSummary[p.name],
          })),
          totalReadings,
          nextSteps: [
            '1. 약사A 로그인: POST /api/v1/auth/login { email: "pharmacist.a@test.glycopharm.com", password: "Test1234!" }',
            '2. 각 환자 분석 실행: GET /api/v1/care/analysis/{patientId} (Bearer token)',
            '3. Dashboard: /care/dashboard',
            '4. 데이터 격리 확인: 약사A → 환자 3명만 / 약사B → 환자 2명만',
            '5. AI Chat + Action Engine 테스트',
          ],
          analysisUrls: TEST_PATIENTS.filter((p) => p.type !== 'data_missing').map((p) => ({
            patient: p.name,
            url: `/api/v1/care/analysis/${p.id}`,
          })),
        },
      });
    } catch (error: any) {
      logger.error('[CareTestData] Seed error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /* ─── DELETE: Full cleanup ─── */
  router.delete('/', async (req: Request, res: Response) => {
    if (!verifyAdminSecret(req, res)) return;

    try {
      const deleted: Record<string, number> = {};

      // 1. Patient-related data
      for (const table of PATIENT_DATA_TABLES) {
        try {
          const col = table === 'glucoseview_customers' ? 'id' : 'patient_id';
          const result = await dataSource.query(`DELETE FROM ${table} WHERE ${col} = ANY($1)`, [ALL_PATIENT_IDS]);
          deleted[table] = result?.[1] ?? 0;
        } catch {
          deleted[table] = -1;
        }
      }

      // 2. Infrastructure (reverse dependency)
      const infraCleanups: Array<{ table: string; col: string; ids: readonly string[] }> = [
        { table: 'organization_service_enrollments', col: 'id', ids: ALL_ENR_IDS },
        { table: 'organization_members', col: 'organization_id', ids: ALL_ORG_IDS },
        { table: 'role_assignments', col: 'id', ids: ALL_RA_IDS },
        { table: 'organizations', col: 'id', ids: ALL_ORG_IDS },
        { table: 'users', col: 'id', ids: ALL_USER_IDS },
      ];

      for (const c of infraCleanups) {
        try {
          const result = await dataSource.query(`DELETE FROM ${c.table} WHERE ${c.col} = ANY($1)`, [c.ids]);
          deleted[c.table] = result?.[1] ?? 0;
        } catch {
          deleted[c.table] = -1;
        }
      }

      logger.info(`[CareTestData] Full cleanup: ${JSON.stringify(deleted)}`);

      res.json({
        success: true,
        data: {
          deleted,
          removedIds: {
            users: ALL_USER_IDS,
            organizations: ALL_ORG_IDS,
            patients: ALL_PATIENT_IDS,
          },
        },
      });
    } catch (error: any) {
      logger.error('[CareTestData] Cleanup error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

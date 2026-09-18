/**
 * Lecture Service reference seed — platform_services 1건 + roles 3건 (idempotent upsert)
 *
 * WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 1 Foundation
 *
 * 왜 migration 이 아니라 CLI 인가:
 *   - 이 seed 는 스키마를 바꾸지 않는 reference data 다. incremental migration 계약은 schema
 *     fingerprint(pg_catalog 전용) 기준이라 data-only migration 은 직전 상태와 fingerprint 가 같아
 *     `check-migration-contract.mjs` C22(duplicate fingerprint) 를 통과할 수 없다.
 *   - PRODUCTION-MIGRATION-STANDARD 규칙 8: reference seed(roles · catalogs) 는 bootstrap 범위 밖,
 *     별도의 명시적 단계. CLAUDE.md §8-1: 진단 · seed · repair 는 CLI 우선, HTTP route 금지.
 *
 * 대상 (SSOT = config/service-catalog.ts · types/roles.ts 에서 읽는다):
 *   - platform_services.code = 'lecture'
 *   - roles: lecture:admin · lecture:operator · lecture:instructor
 *   - lecture:member 는 만들지 않는다. 일반 학습자는 service_memberships(service_key='lecture') 로 판정.
 *   - service_memberships · role_assignments · lms_* 는 절대 건드리지 않는다.
 *
 * 실행 (운영 DB 는 Cloud SQL Auth Proxy 경유 · SETUP.md):
 *   dry-run(기본):  npx tsx src/scripts/seed-lecture-service-and-roles.ts
 *   apply(이중 게이트): LECTURE_REFERENCE_SEED_CONFIRM=YES npx tsx src/scripts/seed-lecture-service-and-roles.ts --apply
 *
 * 반복 실행해도 결과는 동일하다(ON CONFLICT DO UPDATE). 접속값은 로그에 남기지 않는다.
 */

import 'dotenv/config';
import pg from 'pg';
import { getService } from '../config/service-catalog.js';
import { ROLE_REGISTRY, type PrefixedRole } from '../types/roles.js';

const { Client } = pg;

const SERVICE_KEY = 'lecture';
const LECTURE_ROLES: readonly PrefixedRole[] = ['lecture:admin', 'lecture:operator', 'lecture:instructor'];
const CONFIRM_ENV = 'LECTURE_REFERENCE_SEED_CONFIRM';

interface PlatformServiceRow {
  code: string;
  name: string;
  short_description: string | null;
  entry_url: string | null;
  service_type: string;
  approval_required: boolean;
  is_featured: boolean;
  featured_order: number | null;
  icon_emoji: string | null;
  status: string;
}

interface RoleRow {
  name: string;
  display_name: string | null;
  description: string | null;
  service_key: string | null;
  role_key: string | null;
  is_system: boolean | null;
  is_admin_role: boolean | null;
  is_assignable: boolean | null;
  is_active: boolean | null;
}

function desiredService() {
  const svc = getService(SERVICE_KEY);
  if (!svc) throw new Error(`service-catalog has no '${SERVICE_KEY}' entry`);
  return {
    code: svc.key,
    name: svc.nameKo,
    short_description: svc.description,
    entry_url: `https://${svc.domain}`,
    service_type: 'tool',
    approval_required: false,
    is_featured: false,
    featured_order: 14,
    icon_emoji: '🎓',
    status: 'active',
  };
}

function desiredRoles() {
  return LECTURE_ROLES.map((role) => {
    const meta = ROLE_REGISTRY[role];
    if (!meta || meta.service !== SERVICE_KEY) throw new Error(`ROLE_REGISTRY has no '${role}' for service '${SERVICE_KEY}'`);
    const roleKey = role.slice(SERVICE_KEY.length + 1);
    return {
      name: role,
      display_name: meta.label,
      description: meta.description,
      service_key: SERVICE_KEY,
      role_key: roleKey,
      is_system: true,
      is_admin_role: roleKey === 'admin',
      is_assignable: true,
      is_active: true,
    };
  });
}

function diffKeys(current: object | undefined, desired: object): string[] {
  if (!current) return ['<missing>'];
  const cur = current as Record<string, unknown>;
  const want = desired as Record<string, unknown>;
  return Object.keys(want).filter((k) => cur[k] !== want[k]);
}

async function readState(client: pg.Client) {
  const svc = await client.query<PlatformServiceRow>(
    `SELECT code, name, short_description, entry_url, service_type::text AS service_type, approval_required,
            is_featured, featured_order, icon_emoji, status::text AS status
       FROM platform_services WHERE code = $1`,
    [SERVICE_KEY],
  );
  const roles = await client.query<RoleRow>(
    `SELECT name, display_name, description, service_key, role_key, is_system, is_admin_role, is_assignable, is_active
       FROM roles WHERE name = ANY($1::text[]) ORDER BY name`,
    [LECTURE_ROLES],
  );
  const member = await client.query<{ n: string }>(`SELECT count(*)::text AS n FROM roles WHERE name = $1`, ['lecture:member']);
  return { service: svc.rows[0], roles: new Map(roles.rows.map((r) => [r.name, r])), memberRoleCount: Number(member.rows[0].n) };
}

async function upsert(client: pg.Client) {
  const s = desiredService();
  await client.query(
    `INSERT INTO platform_services
       (code, name, short_description, entry_url, service_type, approval_required, is_featured, featured_order, icon_emoji, status)
     VALUES ($1, $2, $3, $4, $5::platform_service_type_enum, $6, $7, $8, $9, $10::platform_service_status_enum)
     ON CONFLICT (code) DO UPDATE SET
       name = EXCLUDED.name,
       short_description = EXCLUDED.short_description,
       entry_url = EXCLUDED.entry_url,
       service_type = EXCLUDED.service_type,
       approval_required = EXCLUDED.approval_required,
       icon_emoji = EXCLUDED.icon_emoji,
       status = EXCLUDED.status,
       updated_at = now()`,
    [s.code, s.name, s.short_description, s.entry_url, s.service_type, s.approval_required, s.is_featured, s.featured_order, s.icon_emoji, s.status],
  );
  for (const r of desiredRoles()) {
    await client.query(
      `INSERT INTO roles
         (name, display_name, description, service_key, role_key, is_system, is_admin_role, is_assignable, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (name) DO UPDATE SET
         service_key = EXCLUDED.service_key,
         role_key = EXCLUDED.role_key,
         display_name = EXCLUDED.display_name,
         description = EXCLUDED.description,
         is_admin_role = EXCLUDED.is_admin_role,
         is_assignable = EXCLUDED.is_assignable,
         is_active = EXCLUDED.is_active,
         updated_at = now()`,
      [r.name, r.display_name, r.description, r.service_key, r.role_key, r.is_system, r.is_admin_role, r.is_assignable, r.is_active],
    );
  }
}

async function main(): Promise<void> {
  const wantsApply = process.argv.slice(2).includes('--apply');
  const confirmed = process.env[CONFIRM_ENV] === 'YES';
  const apply = wantsApply && confirmed;
  const mode = apply ? 'APPLY' : 'dry-run';
  if (wantsApply && !confirmed) {
    console.log(`--apply 는 ${CONFIRM_ENV}=YES 가 함께 있어야 실행된다. dry-run 으로 진행한다.`);
  }

  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    ssl: false,
    connectionTimeoutMillis: 10_000,
  });
  await client.connect();
  console.log(`LECTURE_REFERENCE_SEED mode=${mode}`);

  try {
    const before = await readState(client);
    const svcDiff = diffKeys(before.service, desiredService());
    console.log(`platform_services[${SERVICE_KEY}]: ${before.service ? 'present' : 'MISSING'} · drift=${svcDiff.length ? svcDiff.join(',') : 'none'}`);
    for (const r of desiredRoles()) {
      const cur = before.roles.get(r.name);
      const d = diffKeys(cur, r);
      console.log(`roles[${r.name}]: ${cur ? 'present' : 'MISSING'} · drift=${d.length ? d.join(',') : 'none'}`);
    }
    console.log(`roles[lecture:member]: ${before.memberRoleCount} (must stay 0 — this script never creates it)`);

    if (!apply) {
      console.log('DB_WRITES = 0 (dry-run)');
      return;
    }

    await client.query('BEGIN');
    await upsert(client);
    await client.query('COMMIT');

    const after = await readState(client);
    const svcOk = diffKeys(after.service, desiredService()).length === 0;
    const rolesOk = desiredRoles().every((r) => diffKeys(after.roles.get(r.name), r).length === 0);
    console.log(`POST_SEED_ASSERTION = ${svcOk && rolesOk && after.memberRoleCount === 0 ? 'PASS' : 'FAILED'}`);
    console.log(`platform_services upserted 1 · roles upserted ${LECTURE_ROLES.length} · lecture:member ${after.memberRoleCount}`);
    if (!(svcOk && rolesOk)) process.exitCode = 1;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`LECTURE_REFERENCE_SEED failed: ${message}`);
  process.exit(1);
});

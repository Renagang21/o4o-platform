/**
 * Canonical Demo 계정의 회원 목록 표시 정보(닉네임 · 가입 유형 · 경영자 약사 면허) 보정 — 2026-11-12 사용자 지시.
 *
 * Demo 세 계정은 가입 신청 절차가 아니라 보정 스크립트로 만들어져 Admin 회원 목록에 「미등록」이 보였다.
 * 이 작업은 표시에 필요한 값만 채운다:
 *   - 닉네임: 정본값으로 맞춘다(DEMO_PROFILES).
 *   - 가입 유형: 원장에서 추정되는 유형이 없을 때만(현재 매장 직원) 승인 상태의 가입 신청 기록을 쓴다.
 *     약국 · 공급자 원장에서 유형이 이미 나오는 경영자 · 공급자는 건드리지 않는다.
 *   - 매장 경영자 약사 면허: 승인된 면허가 없을 때만 가상 번호(99991)를 승인 상태로 쓴다. 약국경영자는 약사여야 한다.
 * 하지 않는 것: 가입 승인 흐름(약국 · 공급자 조직 생성 · 서비스 가입) 재실행, 자격증명 · 세션 · 역할 · 소속 변경,
 * Demo 가 아닌 계정(운영자 · 관리자 · 일반 회원) 변경. 매장 직원은 「기타」 — 약사 자격 없이 직원 체험 범위만 유지한다
 * (O4O-CANONICAL-DEMO-ACCOUNTS-V1 「별도 자격 없이 가입한 것으로 가장하지 않는다」).
 *
 * 실행 계약은 기존 Demo 보정과 같다: 기본 plan(읽기 전용) → 같은 before-image digest 로 apply → 사후 재검사 → 복구 스냅숏.
 * apply 는 실행 승인자(활성 platform:super_admin)의 사용자 ID 를 요구하고, 면허 확인자 · 가입 검토자로 기록한다.
 */
import { createHash, randomUUID } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { MEMBER_REGISTRATION_KEY } from '@o4o/types';
import type { MemberRegistration } from '@o4o/types';
import { MEMBER_REGISTRATION_TYPE_SQL, writeRegistration } from '../services/admin/member-registration-data.js';

type Row = Record<string, unknown>;
export interface DemoProfileQueryClient { query(sql: string, params?: unknown[]): Promise<Row[]>; }
type Options = { apply?: boolean; expectedDigest?: string; approvedBy?: string };

/** Demo 정본 표시값. 면허번호는 실제 면허와 겹치지 않는 가상 대역(99991~99995) — 경영자만 쓴다. */
export const DEMO_PROFILES = {
  STORE_OWNER: { nickname: '테스트-약국경영자', license: '99991' },
  SUPPLIER: { nickname: '테스트-공급자' },
  STORE_STAFF: { nickname: '테스트-직원', registrationType: 'other' },
} as const;
type DemoType = keyof typeof DEMO_PROFILES;
const DEMO_TYPES = Object.keys(DEMO_PROFILES) as DemoType[];
const LICENSE_REASON = 'Canonical Demo 계정 — 가상 면허번호(실제 면허 아님)';
const REGISTRATION_REASON = 'Canonical Demo 계정 — 직원 체험용 가입 정보';

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = (code: string): never => { throw new Error(code); };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function inventory(client: DemoProfileQueryClient, lock: boolean) {
  const registry = await client.query(`SELECT user_id,demo_type FROM demo_accounts WHERE is_active
    ORDER BY demo_type ${lock ? 'FOR UPDATE' : ''}`);
  const source = new Map<DemoType, string>();
  for (const type of DEMO_TYPES) {
    const rows = registry.filter(row => row.demo_type === type);
    if (rows.length > 1) fail('AMBIGUOUS_DEMO_REGISTRY');
    if (rows.length === 1) {
      if (!UUID.test(String(rows[0].user_id))) fail('INVALID_DEMO_IDENTITY');
      source.set(type, String(rows[0].user_id));
    }
  }
  if (!source.has('STORE_OWNER') || !source.has('SUPPLIER')) fail('BASE_DEMO_REGISTRY_MISSING');
  const ids = [...source.values()];
  const users = await client.query(`SELECT u.id,u.nickname,${MEMBER_REGISTRATION_TYPE_SQL} AS registration_type,
    u."businessInfo"::jsonb->'${MEMBER_REGISTRATION_KEY}' AS registration
    FROM users u WHERE u.id=ANY($1::uuid[]) ORDER BY u.id ${lock ? 'FOR UPDATE OF u' : ''}`, [ids]);
  if (users.length !== ids.length) fail('REGISTRY_USER_MISSING');
  const ownerId = source.get('STORE_OWNER')!;
  const profiles = await client.query(`SELECT user_id,license_number,license_verified,qualification_status
    FROM kpa_pharmacist_profiles WHERE user_id=$1 ${lock ? 'FOR UPDATE' : ''}`, [ownerId]);
  const ownerLicensed = profiles.some(row => row.qualification_status === 'approved' && row.license_verified === true &&
    typeof row.license_number === 'string' && row.license_number.trim() !== '');
  const license = DEMO_PROFILES.STORE_OWNER.license;
  const licenseHolders = ownerLicensed ? [] : await client.query(`SELECT user_id FROM kpa_pharmacist_profiles
    WHERE BTRIM(license_number)=$1 AND qualification_status='approved' AND license_verified=true AND user_id<>$2`, [license, ownerId]);
  if (licenseHolders.length) fail('DEMO_LICENSE_IN_USE');

  const changes: { type: DemoType; userId: string; nickname: boolean; registration: boolean; license: boolean }[] = [];
  for (const type of DEMO_TYPES) {
    const userId = source.get(type);
    if (!userId) continue;
    const user = users.find(row => row.id === userId)!;
    const profile = DEMO_PROFILES[type];
    const nickname = user.nickname !== profile.nickname;
    const registration = 'registrationType' in profile && !user.registration_type;
    const license = type === 'STORE_OWNER' && !ownerLicensed;
    if (nickname || registration || license) changes.push({ type, userId, nickname, registration, license });
  }
  const before = { registry, users, profiles };
  return { before, source, changes, digest: digest({ before, intent: DEMO_PROFILES }) };
}

/** 행 내용 · 식별자 · 해시는 반환하지 않는다(CI 로그 · artifact 노출 방지). */
export async function runDemoProfileReconcile(client: DemoProfileQueryClient, options: Options = {}) {
  const apply = options.apply === true;
  if (apply && !/^[a-f0-9]{64}$/.test(options.expectedDigest ?? '')) fail('EXACT_PLAN_DIGEST_REQUIRED');
  if (apply && !UUID.test(options.approvedBy ?? '')) fail('APPROVER_REQUIRED');
  await client.query(apply ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  let committed = false;
  try {
    await client.query("SET LOCAL statement_timeout='20s'");
    await client.query("SET LOCAL lock_timeout='5s'");
    if (apply) await client.query("SELECT pg_advisory_xact_lock(hashtext('canonical-demo-account-reconcile'))");
    const plan = await inventory(client, apply);
    const summary = {
      mode: apply ? 'apply' : 'plan',
      digest: plan.digest,
      accounts: DEMO_TYPES.map(type => {
        const change = plan.changes.find(item => item.type === type);
        return { type, present: plan.source.has(type), nickname: !!change?.nickname, registration: !!change?.registration, license: !!change?.license };
      }),
      changes: plan.changes.length,
    };
    if (!apply) return summary;
    if (plan.digest !== options.expectedDigest) fail('BEFORE_IMAGE_CHANGED_REPLAN');
    const approver = await client.query(`SELECT 1 FROM role_assignments WHERE user_id=$1 AND role='platform:super_admin' AND is_active
      AND (valid_from IS NULL OR valid_from<=now()) AND (valid_until IS NULL OR valid_until>=now()) LIMIT 1`, [options.approvedBy]);
    if (!approver.length) fail('APPROVER_NOT_PLATFORM_ADMIN');
    if (!plan.changes.length) {
      await client.query('COMMIT'); committed = true;
      return { ...summary, verified: true, writes: 0 };
    }
    const recovery = await client.query("SELECT to_regclass('public.canonical_demo_repair_snapshots') IS NOT NULL AS ready");
    if (recovery[0]?.ready !== true) fail('RECOVERY_TABLE_REQUIRED');
    const audit = await client.query(`INSERT INTO canonical_demo_repair_snapshots (migration,snapshot)
      VALUES ($1,$2::jsonb) RETURNING id`, ['demo-profile-' + randomUUID(), JSON.stringify({ before: plan.before, digest: plan.digest })]);
    let writes = 1;
    const now = new Date().toISOString();
    for (const change of plan.changes) {
      const profile = DEMO_PROFILES[change.type];
      if (change.nickname) {
        await client.query('UPDATE users SET nickname=$2,"updatedAt"=clock_timestamp() WHERE id=$1', [change.userId, profile.nickname]); writes++;
      }
      if (change.registration && 'registrationType' in profile) {
        // 일반 가입 신청과 같은 저장 경로(businessInfo 의 서버 전용 키 · json 형식 유지)를 쓴다.
        const value: MemberRegistration = { type: profile.registrationType, state: 'approved', fields: {}, reason: REGISTRATION_REASON, reviewedAt: now, reviewedBy: options.approvedBy };
        await writeRegistration({ query: client.query.bind(client) } as Pick<EntityManager, 'query'>, change.userId, value); writes++;
      }
      if (change.license && 'license' in profile) {
        await client.query(`INSERT INTO kpa_pharmacist_profiles(user_id,license_number,license_verified,qualification_status,verified_at,verified_by,qualification_reason)
          VALUES($1,$2,true,'approved',now(),$3,$4) ON CONFLICT(user_id) DO UPDATE SET license_number=$2,license_verified=true,
          qualification_status='approved',qualification_reason=$4,verified_at=now(),verified_by=$3,updated_at=clock_timestamp()`,
        [change.userId, profile.license, options.approvedBy, LICENSE_REASON]); writes++;
      }
    }
    const after = await inventory(client, true);
    if (after.changes.length) fail('POST_APPLY_PROFILE_VERIFICATION_FAILED');
    await client.query('UPDATE canonical_demo_repair_snapshots SET snapshot=snapshot || $2::jsonb WHERE id=$1',
      [audit[0].id, JSON.stringify({ after: after.before, afterDigest: after.digest, verified: true })]); writes++;
    await client.query('COMMIT'); committed = true;
    return { ...summary, afterDigest: after.digest, verified: true, writes };
  } finally {
    if (!committed) await client.query('ROLLBACK');
  }
}

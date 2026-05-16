/**
 * WO-O4O-SEED-BOOTSTRAP-MIGRATION-V1
 *
 * Canonical Bootstrap Seed — platform reset 이후 최소 운영 가능 상태 복구
 *
 * 생성 데이터:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ 계정                     │ service_key  │ role_assignment    │
 * ├─────────────────────────────────────────────────────────────┤
 * │ super-admin@o4o.com      │ (없음)       │ super_admin        │
 * │ kpa-admin@o4o.com        │ kpa-society  │ kpa:admin          │
 * │ kpa-operator@o4o.com     │ kpa-society  │ kpa:operator       │
 * │ phamacy1@o4o.com         │ kpa-society  │ kpa:pharmacist     │
 * │ neture-operator@o4o.com  │ neture       │ neture:operator    │
 * │ kcos-admin@o4o.com       │ k-cosmetics  │ cosmetics:admin    │
 * │ kcos-operator@o4o.com    │ k-cosmetics  │ cosmetics:operator │
 * │ glyco-operator@o4o.com   │ glycopharm   │ glycopharm:operator│
 * └─────────────────────────────────────────────────────────────┘
 *
 * 비밀번호: 환경변수 SEED_BOOTSTRAP_PASSWORD (기본: O4oBootstrap1!)
 *   - 프로덕션 배포 전 반드시 환경변수 설정
 *   - Git에 실제 비밀번호 저장 금지
 *
 * 생성 규칙:
 *   users → service_memberships → role_assignments → domain profile
 *   (F11 User/Operator Freeze 준수)
 *
 * Idempotent: 재실행 안전 (ON CONFLICT DO NOTHING / DO UPDATE)
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';
import bcrypt from 'bcryptjs';

// ──────────────────────────────────────────────
// 비밀번호: 환경변수 우선, 없으면 placeholder
// ──────────────────────────────────────────────
const BOOTSTRAP_PASSWORD = process.env.SEED_BOOTSTRAP_PASSWORD || 'O4oBootstrap1!';

// ──────────────────────────────────────────────
// Deterministic UUID — 참조 일관성 보장
// prefix b0000000-b000-4000-b000-xxxxxxxxxxxx
// ──────────────────────────────────────────────
const BOOTSTRAP_IDS = {
  // 계정 UUIDs
  SUPER_ADMIN:        'b0000000-b000-4000-b000-000000000001',
  KPA_ADMIN:          'b0000000-b000-4000-b000-000000000002',
  KPA_OPERATOR:       'b0000000-b000-4000-b000-000000000003',
  KPA_PHARMACY1:      'b0000000-b000-4000-b000-000000000004',
  NETURE_OPERATOR:    'b0000000-b000-4000-b000-000000000005',
  KCOS_ADMIN:         'b0000000-b000-4000-b000-000000000006',
  KCOS_OPERATOR:      'b0000000-b000-4000-b000-000000000007',
  GLYCO_OPERATOR:     'b0000000-b000-4000-b000-000000000008',

  // KPA 최소 조직 UUID (SeedKpaTestAccounts와 동일 UUID 공유 — 멱등 안전)
  KPA_ORG_ASSOCIATION: 'a0000000-0a00-4000-a000-000000000001', // 대한약사회
} as const;

// ──────────────────────────────────────────────
// Bootstrap 계정 정의
// ──────────────────────────────────────────────
interface BootstrapAccount {
  id: string;
  email: string;
  name: string;
  serviceKey: string | null;          // null = 플랫폼 레벨 (SM 없음)
  smRole: string | null;              // service_memberships.role
  raRole: string;                     // role_assignments.role
  kpaProfile?: {                      // KPA 도메인 프로필
    membershipType: 'pharmacist' | 'student' | 'pharmacist_member' | 'pharmacy_student_member';
    licenseNumber?: string;
    pharmacyName?: string;
    activityType?: string;
    organizationId?: string;
  };
}

const BOOTSTRAP_ACCOUNTS: BootstrapAccount[] = [
  // ── 플랫폼 ────────────────────────────────────
  {
    id: BOOTSTRAP_IDS.SUPER_ADMIN,
    email: 'super-admin@o4o.com',
    name: '플랫폼 슈퍼관리자',
    serviceKey: null,
    smRole: null,
    raRole: 'super_admin',
  },

  // ── KPA-Society ───────────────────────────────
  {
    id: BOOTSTRAP_IDS.KPA_ADMIN,
    email: 'kpa-admin@o4o.com',
    name: 'KPA 관리자',
    serviceKey: 'kpa-society',
    smRole: 'admin',
    raRole: 'kpa:admin',
  },
  {
    id: BOOTSTRAP_IDS.KPA_OPERATOR,
    email: 'kpa-operator@o4o.com',
    name: 'KPA 운영자',
    serviceKey: 'kpa-society',
    smRole: 'operator',
    raRole: 'kpa:operator',
  },
  {
    id: BOOTSTRAP_IDS.KPA_PHARMACY1,
    email: 'phamacy1@o4o.com',
    name: '테스트 약국1',
    serviceKey: 'kpa-society',
    smRole: 'pharmacy',
    raRole: 'kpa:pharmacist',
    kpaProfile: {
      membershipType: 'pharmacist',
      licenseNumber: 'BOOTSTRAP-LIC-001',
      pharmacyName: '테스트약국1',
      activityType: 'pharmacy_employee',
      organizationId: BOOTSTRAP_IDS.KPA_ORG_ASSOCIATION,
    },
  },

  // ── Neture ────────────────────────────────────
  {
    id: BOOTSTRAP_IDS.NETURE_OPERATOR,
    email: 'neture-operator@o4o.com',
    name: 'Neture 운영자',
    serviceKey: 'neture',
    smRole: 'operator',
    raRole: 'neture:operator',
  },

  // ── K-Cosmetics ───────────────────────────────
  {
    id: BOOTSTRAP_IDS.KCOS_ADMIN,
    email: 'kcos-admin@o4o.com',
    name: 'K-Cosmetics 관리자',
    serviceKey: 'k-cosmetics',
    smRole: 'admin',
    raRole: 'cosmetics:admin',
  },
  {
    id: BOOTSTRAP_IDS.KCOS_OPERATOR,
    email: 'kcos-operator@o4o.com',
    name: 'K-Cosmetics 운영자',
    serviceKey: 'k-cosmetics',
    smRole: 'operator',
    raRole: 'cosmetics:operator',
  },

  // ── GlycoPharm ────────────────────────────────
  {
    id: BOOTSTRAP_IDS.GLYCO_OPERATOR,
    email: 'glyco-operator@o4o.com',
    name: 'GlycoPharm 운영자',
    serviceKey: 'glycopharm',
    smRole: 'operator',
    raRole: 'glycopharm:operator',
  },
];

// ──────────────────────────────────────────────────────────────────────
export class BootstrapCanonicalSeedAccounts20260927100000 implements MigrationInterface {
  name = 'BootstrapCanonicalSeedAccounts20260927100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[Bootstrap] WO-O4O-SEED-BOOTSTRAP-MIGRATION-V1 시작');

    const hashedPassword = await bcrypt.hash(BOOTSTRAP_PASSWORD, 10);

    // ── Step 1: KPA 최소 조직 (idempotent) ──────────────────────────
    // SeedKpaOrganizationsFullHierarchy가 이미 실행됐다면 conflict → skip
    await this._ensureKpaOrganization(queryRunner);

    // ── Step 2: 계정별 생성 ──────────────────────────────────────────
    for (const account of BOOTSTRAP_ACCOUNTS) {
      const userId = await this._upsertUser(queryRunner, account, hashedPassword);

      if (account.serviceKey && account.smRole) {
        await this._upsertServiceMembership(queryRunner, userId, account.serviceKey, account.smRole);
      }

      await this._upsertRoleAssignment(queryRunner, userId, account.raRole);

      if (account.kpaProfile) {
        await this._ensureKpaMember(queryRunner, userId, account.kpaProfile);
        await this._ensureKpaPharmacistProfile(queryRunner, userId, account.kpaProfile);
      }

      console.log(`[Bootstrap]   ✓ ${account.email} → ${account.raRole}`);
    }

    this._printSummary();
  }

  // ────────────────────────────────────────────────────────────────────
  // Step 1: KPA 최소 조직
  // ────────────────────────────────────────────────────────────────────
  private async _ensureKpaOrganization(queryRunner: QueryRunner): Promise<void> {
    // kpa_organizations 테이블 존재 여부 확인 (마이그레이션 순서 보호)
    const tableExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'kpa_organizations'
      LIMIT 1
    `);
    if (tableExists.length === 0) {
      console.log('[Bootstrap] kpa_organizations 테이블 없음 — KPA org 생성 건너뜀');
      return;
    }

    await queryRunner.query(
      `INSERT INTO kpa_organizations (id, name, type, parent_id, description, is_active, created_at, updated_at)
       VALUES ($1, '대한약사회', 'association', NULL, '대한약사회 본회 (Bootstrap)', true, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [BOOTSTRAP_IDS.KPA_ORG_ASSOCIATION],
    );
    console.log('[Bootstrap] KPA 조직(대한약사회) 확보 완료');
  }

  // ────────────────────────────────────────────────────────────────────
  // Step 2a: users upsert
  // ────────────────────────────────────────────────────────────────────
  private async _upsertUser(
    queryRunner: QueryRunner,
    account: BootstrapAccount,
    hashedPassword: string,
  ): Promise<string> {
    // 이미 존재하는 경우 — deterministic UUID가 있으므로 id로 확인
    const existing = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [account.email],
    );
    if (existing.length > 0) {
      return existing[0].id as string;
    }

    const result = await queryRunner.query(
      `INSERT INTO users (id, email, password, name, status, "isActive", "isEmailVerified", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'active', true, true, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET "updatedAt" = NOW()
       RETURNING id`,
      [account.id, account.email, hashedPassword, account.name],
    );
    return result[0].id as string;
  }

  // ────────────────────────────────────────────────────────────────────
  // Step 2b: service_memberships upsert
  // 순서: users → service_memberships (F11 준수)
  // ────────────────────────────────────────────────────────────────────
  private async _upsertServiceMembership(
    queryRunner: QueryRunner,
    userId: string,
    serviceKey: string,
    role: string,
  ): Promise<void> {
    await queryRunner.query(
      `INSERT INTO service_memberships
         (id, user_id, service_key, status, role, approved_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'active', $3, NOW(), NOW(), NOW())
       ON CONFLICT (user_id, service_key)
         DO UPDATE SET status = 'active', role = $3, updated_at = NOW()`,
      [userId, serviceKey, role],
    );
  }

  // ────────────────────────────────────────────────────────────────────
  // Step 2c: role_assignments upsert
  // 순서: service_memberships → role_assignments (F9/F11 준수)
  // ────────────────────────────────────────────────────────────────────
  private async _upsertRoleAssignment(
    queryRunner: QueryRunner,
    userId: string,
    role: string,
  ): Promise<void> {
    await queryRunner.query(
      `INSERT INTO role_assignments
         (id, user_id, role, is_active, valid_from, assigned_at, scope_type, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, true, NOW(), NOW(), 'global', NOW(), NOW())
       ON CONFLICT ON CONSTRAINT "unique_active_role_per_user" DO NOTHING`,
      [userId, role],
    );
  }

  // ────────────────────────────────────────────────────────────────────
  // Step 2d: kpa_members (KPA 도메인 프로필)
  // ────────────────────────────────────────────────────────────────────
  private async _ensureKpaMember(
    queryRunner: QueryRunner,
    userId: string,
    profile: NonNullable<BootstrapAccount['kpaProfile']>,
  ): Promise<void> {
    await queryRunner.query(
      `INSERT INTO kpa_members
         (id, user_id, organization_id, role, status, identity_status,
          membership_type, license_number, pharmacy_name, activity_type,
          joined_at, created_at, updated_at)
       VALUES
         (gen_random_uuid(), $1, $2, 'member', 'active', 'active',
          $3, $4, $5, $6,
          CURRENT_DATE, NOW(), NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [
        userId,
        profile.organizationId ?? null,
        profile.membershipType,
        profile.licenseNumber ?? null,
        profile.pharmacyName ?? null,
        profile.activityType ?? null,
      ],
    );
  }

  // ────────────────────────────────────────────────────────────────────
  // Step 2e: kpa_pharmacist_profiles (KPA 약사 자격 프로필)
  // ────────────────────────────────────────────────────────────────────
  private async _ensureKpaPharmacistProfile(
    queryRunner: QueryRunner,
    userId: string,
    profile: NonNullable<BootstrapAccount['kpaProfile']>,
  ): Promise<void> {
    if (profile.membershipType !== 'pharmacist') return;

    // kpa_pharmacist_profiles 테이블 존재 여부 확인
    const tableExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'kpa_pharmacist_profiles'
      LIMIT 1
    `);
    if (tableExists.length === 0) return;

    await queryRunner.query(
      `INSERT INTO kpa_pharmacist_profiles (id, user_id, license_number, activity_type, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, profile.licenseNumber ?? null, profile.activityType ?? 'pharmacy_employee'],
    );
  }

  // ────────────────────────────────────────────────────────────────────
  private _printSummary(): void {
    console.log('');
    console.log('=== Bootstrap Canonical Seed 완료 ===');
    console.log('');
    console.log('Platform:');
    console.log('  - super-admin@o4o.com → super_admin');
    console.log('');
    console.log('KPA-Society:');
    console.log('  - kpa-admin@o4o.com    → kpa:admin');
    console.log('  - kpa-operator@o4o.com → kpa:operator');
    console.log('  - phamacy1@o4o.com     → kpa:pharmacist + kpa_members + pharmacist_profiles');
    console.log('');
    console.log('Neture:');
    console.log('  - neture-operator@o4o.com → neture:operator');
    console.log('');
    console.log('K-Cosmetics:');
    console.log('  - kcos-admin@o4o.com    → cosmetics:admin');
    console.log('  - kcos-operator@o4o.com → cosmetics:operator');
    console.log('');
    console.log('GlycoPharm:');
    console.log('  - glyco-operator@o4o.com → glycopharm:operator');
    console.log('');
    console.log(`비밀번호: ${process.env.SEED_BOOTSTRAP_PASSWORD ? '[환경변수]' : 'O4oBootstrap1! (기본값 — 변경 필요)'}`);
    console.log('');
    console.log('smoke test 체크리스트:');
    console.log('  □ super-admin 로그인 → /admin 접근');
    console.log('  □ kpa-admin 로그인 → /admin/members 접근');
    console.log('  □ kpa-operator 로그인 → /operator/members 접근');
    console.log('  □ phamacy1 로그인 → /pharmacy 접근, KPA 회원 표시');
    console.log('  □ neture-operator 로그인 → /operator 접근');
    console.log('  □ kcos-operator 로그인 → /operator 접근');
    console.log('  □ glyco-operator 로그인 → /operator 접근');
  }

  // ────────────────────────────────────────────────────────────────────
  // down(): 테스트 환경에서 bootstrap 계정 제거
  // 프로덕션 reset 시에는 별도 WO-O4O-PLATFORM-RESET-EXECUTION-V1 사용
  // ────────────────────────────────────────────────────────────────────
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[Bootstrap] down() — bootstrap 계정 제거');

    const emails = BOOTSTRAP_ACCOUNTS.map(a => a.email);

    for (const email of emails) {
      const users = await queryRunner.query(
        `SELECT id FROM users WHERE email = $1 LIMIT 1`,
        [email],
      );
      if (users.length === 0) continue;

      const userId = users[0].id as string;

      // KPA 도메인 프로필 (존재 시)
      await queryRunner.query(`DELETE FROM kpa_pharmacist_profiles WHERE user_id = $1`, [userId]).catch(() => null);
      await queryRunner.query(`DELETE FROM kpa_members WHERE user_id = $1`, [userId]).catch(() => null);

      // 핵심 RBAC/Membership
      await queryRunner.query(`DELETE FROM role_assignments WHERE user_id = $1`, [userId]);
      await queryRunner.query(`DELETE FROM service_memberships WHERE user_id = $1`, [userId]);
      await queryRunner.query(`DELETE FROM users WHERE id = $1`, [userId]);

      console.log(`[Bootstrap]   ✓ 제거: ${email}`);
    }

    // KPA bootstrap 조직은 SeedKpaTestAccounts에서도 사용하므로 제거하지 않음
    console.log('[Bootstrap] down() 완료');
  }
}

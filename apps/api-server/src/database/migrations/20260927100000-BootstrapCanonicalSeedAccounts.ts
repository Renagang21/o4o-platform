/**
 * WO-O4O-SEED-BOOTSTRAP-MIGRATION-V1
 * Updated by: WO-O4O-KPA-TEMP-SEED-BOOTSTRAP-DEPRECATION-V1 (2026-05-24)
 *
 * Canonical Bootstrap Seed — platform reset 이후 최소 운영 가능 상태 복구.
 *
 * 정책 (project_test_account_cleanup_policy + CLAUDE.md §15):
 *   - `xxxx@o4o.com` 형식의 임시/테스트 계정은 production 에서 삭제 상태가 정상이며,
 *     bootstrap/migration 은 이를 재생성하지 않는다.
 *   - 과거 본 migration 이 생성하던 7 임시 계정 (kpa-admin, kpa-operator, phamacy1,
 *     neture-operator, kcos-admin, kcos-operator, glyco-operator) 은
 *     CHECK-O4O-KPA-SEED-ACCOUNT-STATUS-SQL-V1 로 production 부재 확정됨.
 *   - 향후 검증 계정은 `docs/local/TEST-ACCOUNTS.local.md` 등 로컬 비공개 SSOT 로 관리.
 *
 * 생성 데이터 (super-admin 만 — 운영 필수):
 * ┌─────────────────────────────────────────────────────────────┐
 * │ 계정                     │ service_key  │ role_assignment    │
 * ├─────────────────────────────────────────────────────────────┤
 * │ super-admin@o4o.com      │ (없음)       │ super_admin        │
 * └─────────────────────────────────────────────────────────────┘
 *
 * 비밀번호: 환경변수 SEED_BOOTSTRAP_PASSWORD (기본 placeholder, 운영 배포 전 환경변수 설정 필수)
 *   - Git 에 실제 비밀번호 저장 금지
 *
 * 생성 규칙:
 *   users → role_assignments (F11 User/Operator Freeze 준수, SM 없음 — platform 레벨)
 *
 * Idempotent: 재실행 안전 (ON CONFLICT DO NOTHING / DO UPDATE).
 * 이미 production migrations 테이블에 적용 기록 있음 — 본 변경은 fresh DB / CI 환경의
 * 재생성 경로 차단을 위한 것. production 상태는 영향 없음.
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
//
// 임시 계정 UUID (000002~000008) 는 WO-O4O-KPA-TEMP-SEED-BOOTSTRAP-DEPRECATION-V1 에서
// bootstrap 정의에서 제거됨. production 부재 정상 상태 유지.
// ──────────────────────────────────────────────
const BOOTSTRAP_IDS = {
  SUPER_ADMIN: 'b0000000-b000-4000-b000-000000000001',
} as const;

// ──────────────────────────────────────────────
// Bootstrap 계정 정의
// ──────────────────────────────────────────────
interface BootstrapAccount {
  id: string;
  email: string;
  name: string;
  serviceKey: string | null; // null = 플랫폼 레벨 (SM 없음)
  smRole: string | null;
  raRole: string;
}

const BOOTSTRAP_ACCOUNTS: BootstrapAccount[] = [
  // 운영 필수: platform super admin (cleanup 정책 예외)
  {
    id: BOOTSTRAP_IDS.SUPER_ADMIN,
    email: 'super-admin@o4o.com',
    name: '플랫폼 슈퍼관리자',
    serviceKey: null,
    smRole: null,
    raRole: 'super_admin',
  },
];

// ──────────────────────────────────────────────────────────────────────
export class BootstrapCanonicalSeedAccounts20260927100000 implements MigrationInterface {
  name = 'BootstrapCanonicalSeedAccounts20260927100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[Bootstrap] WO-O4O-SEED-BOOTSTRAP-MIGRATION-V1 시작');

    const hashedPassword = await bcrypt.hash(BOOTSTRAP_PASSWORD, 10);

    for (const account of BOOTSTRAP_ACCOUNTS) {
      const userId = await this._upsertUser(queryRunner, account, hashedPassword);

      if (account.serviceKey && account.smRole) {
        await this._upsertServiceMembership(queryRunner, userId, account.serviceKey, account.smRole);
      }

      await this._upsertRoleAssignment(queryRunner, userId, account.raRole);

      console.log(`[Bootstrap]   ✓ ${account.email} → ${account.raRole}`);
    }

    console.log('');
    console.log('=== Bootstrap Canonical Seed 완료 ===');
    console.log('  - super-admin@o4o.com → super_admin');
    console.log(`비밀번호: ${process.env.SEED_BOOTSTRAP_PASSWORD ? '[환경변수]' : '[기본 placeholder — 운영 배포 전 SEED_BOOTSTRAP_PASSWORD 설정 필수]'}`);
  }

  private async _upsertUser(
    queryRunner: QueryRunner,
    account: BootstrapAccount,
    hashedPassword: string,
  ): Promise<string> {
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

  // down(): 임시계정 정책상 down 은 사용 안 함. super-admin 만 보유.
  public async down(_queryRunner: QueryRunner): Promise<void> {
    console.log('[Bootstrap] down() — no-op (super-admin 은 수동으로만 제거)');
  }
}

/**
 * Migration: CreateO4OAdminVaultAccount
 *
 * Creates the o4o Admin Vault access account.
 * This account is used to access the Admin Vault (technical documentation area)
 * on neture.co.kr main site.
 *
 * Email: o4o-admin-id@admin.co.kr
 * Password: ADMIN_VAULT_PASSWORD 환경변수로 주입 (평문 리터럴 금지 — CLAUDE.md §15)
 */

import { MigrationInterface, QueryRunner } from 'typeorm';
import bcrypt from 'bcryptjs';

const ADMIN_VAULT_ACCOUNT = {
  email: 'o4o-admin-id@admin.co.kr',
  name: 'O4O Admin',
  role: 'admin',
  domain: 'neture.co.kr',
  description: 'O4O Admin Vault 접근 계정',
};

export class CreateO4OAdminVaultAccount2026012100001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 이미 적용된 환경에서는 재실행되지 않는다. 신규 DB 에서 환경변수가 없으면
    // 배포 파이프라인을 깨지 않도록 계정 생성을 건너뛴다.
    const plainPassword = process.env.ADMIN_VAULT_PASSWORD;
    if (!plainPassword) {
      console.warn(
        'ADMIN_VAULT_PASSWORD 미설정 — Admin Vault 계정 생성을 건너뜁니다. ' +
          '필요 시 환경변수를 설정한 뒤 계정을 별도 생성하십시오.'
      );
      return;
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Check if account already exists (idempotent)
    const existing = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`,
      [ADMIN_VAULT_ACCOUNT.email]
    );

    if (existing.length > 0) {
      // Update password and activate if exists
      await queryRunner.query(
        `UPDATE users SET password = $1, "isActive" = true, status = 'active' WHERE email = $2`,
        [hashedPassword, ADMIN_VAULT_ACCOUNT.email]
      );
      console.log(`Updated existing account: ${ADMIN_VAULT_ACCOUNT.email}`);
      return;
    }

    // Create account
    await queryRunner.query(
      `INSERT INTO users (
        id, email, password, name, role, roles, status,
        "isActive", "isEmailVerified", domain, permissions,
        "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, 'active',
        true, true, $6, '[]',
        NOW(), NOW()
      )`,
      [
        ADMIN_VAULT_ACCOUNT.email,
        hashedPassword,
        ADMIN_VAULT_ACCOUNT.name,
        ADMIN_VAULT_ACCOUNT.role,
        ADMIN_VAULT_ACCOUNT.role,
        ADMIN_VAULT_ACCOUNT.domain,
      ]
    );

    console.log('');
    console.log('=== O4O Admin Vault Account Created ===');
    console.log(`Email: ${ADMIN_VAULT_ACCOUNT.email}`);
    console.log('');
    console.log('This account provides access to Admin Vault on neture.co.kr');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE users SET "isActive" = false, status = 'inactive' WHERE email = $1`,
      [ADMIN_VAULT_ACCOUNT.email]
    );
    console.log(`Deactivated account: ${ADMIN_VAULT_ACCOUNT.email}`);
  }
}

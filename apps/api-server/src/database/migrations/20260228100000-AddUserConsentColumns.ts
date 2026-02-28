import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-REGISTER-IDENTITY-STABILIZATION-V1
 *
 * users 테이블에 동의 추적 컬럼 추가:
 * - tos_accepted_at: 약관 동의 시각
 * - privacy_accepted_at: 개인정보 동의 시각
 * - marketing_accepted: 마케팅 동의 여부
 *
 * Backfill: 기존 가입 사용자는 가입 시점에 TOS 동의한 것으로 간주.
 */
export class AddUserConsentColumns20260228100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add consent columns
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS tos_accepted_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS marketing_accepted BOOLEAN DEFAULT false
    `);

    // 2. Backfill: 기존 사용자는 가입 시점에 TOS 동의한 것으로 설정
    await queryRunner.query(`
      UPDATE users
      SET tos_accepted_at = "createdAt"
      WHERE status IN ('active', 'approved', 'pending')
        AND tos_accepted_at IS NULL
    `);

    console.log('[Migration] AddUserConsentColumns: completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN IF EXISTS tos_accepted_at,
        DROP COLUMN IF EXISTS privacy_accepted_at,
        DROP COLUMN IF EXISTS marketing_accepted
    `);

    console.log('[Migration] AddUserConsentColumns: reverted');
  }
}

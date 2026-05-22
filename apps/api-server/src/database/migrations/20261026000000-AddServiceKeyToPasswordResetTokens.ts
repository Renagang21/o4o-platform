import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PASSWORD-RESET-SERVICE-ISOLATION-V1
 *
 * password_reset_tokens 테이블에 service_key 컬럼 추가.
 * 비밀번호 재설정 요청이 어느 서비스에서 발생했는지 기록하고,
 * 재설정 실행 시 서비스 범위를 검증하기 위한 기반 작업.
 *
 * NULL = serviceKey 없이 발급된 기존 토큰 (fallback 허용).
 */
export class AddServiceKeyToPasswordResetTokens20261026000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE password_reset_tokens
      ADD COLUMN IF NOT EXISTS service_key VARCHAR(100) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE password_reset_tokens
      DROP COLUMN IF EXISTS service_key
    `);
  }
}

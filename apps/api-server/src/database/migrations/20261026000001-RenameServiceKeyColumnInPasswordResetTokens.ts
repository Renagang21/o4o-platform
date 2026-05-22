import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PASSWORD-RESET-SERVICE-ISOLATION-V1 hotfix
 *
 * password_reset_tokens 테이블의 컬럼명 정규화.
 * 기존 migration(20261026000000)이 snake_case `service_key`로 추가했으나,
 * 이 프로젝트는 camelCase quoted 컬럼명("userId", "usedAt" 등) 관례를 사용하므로
 * `"serviceKey"`로 rename한다.
 */
export class RenameServiceKeyColumnInPasswordResetTokens20261026000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "password_reset_tokens"
      RENAME COLUMN service_key TO "serviceKey"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "password_reset_tokens"
      RENAME COLUMN "serviceKey" TO service_key
    `);
  }
}

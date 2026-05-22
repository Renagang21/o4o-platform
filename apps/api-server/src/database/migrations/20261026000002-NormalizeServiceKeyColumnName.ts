import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PASSWORD-RESET-SERVICE-ISOLATION-V1 column name normalization
 *
 * password_reset_tokens의 serviceKey 컬럼명을 service_key로 정규화한다.
 * 이전 migration(20261026000001)이 "serviceKey"(camelCase)로 rename 했으나,
 * entity에서 name: 'service_key'를 사용하므로 DB 컬럼명을 service_key로 맞춘다.
 *
 * 안전 처리:
 * - "serviceKey" 컬럼이 존재하면 service_key로 rename
 * - 이미 service_key인 경우(20261026000001 미실행) 아무것도 하지 않음
 */
export class NormalizeServiceKeyColumnName20261026000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'password_reset_tokens'
            AND column_name = 'serviceKey'
        ) THEN
          ALTER TABLE "password_reset_tokens" RENAME COLUMN "serviceKey" TO service_key;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'password_reset_tokens'
            AND column_name = 'service_key'
        ) THEN
          ALTER TABLE "password_reset_tokens" RENAME COLUMN service_key TO "serviceKey";
        END IF;
      END $$
    `);
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-OPERATOR-ACTION-LAYER-V1
 * Operator Action Queue dismiss 추적 테이블
 */
export class CreateOperatorActionDismissals1771200000020 implements MigrationInterface {
  name = 'CreateOperatorActionDismissals1771200000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS operator_action_dismissals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        service_key VARCHAR(50) NOT NULL,
        action_id VARCHAR(100) NOT NULL,
        dismissed_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (user_id, service_key, action_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_action_dismissals_user_service
      ON operator_action_dismissals (user_id, service_key)
    `);
    console.warn('[Migration] CreateOperatorActionDismissals — created table + index');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS operator_action_dismissals`);
    console.warn('[Migration] CreateOperatorActionDismissals — dropped table');
  }
}

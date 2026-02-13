import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-A-OPERATOR-AUDIT-LOG-PHASE1-V1
 * Create kpa_operator_audit_logs table for operator action tracking
 */
export class CreateKpaOperatorAuditLogs20260214000004 implements MigrationInterface {
  name = 'CreateKpaOperatorAuditLogs20260214000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'kpa_operator_audit_logs'
      ) AS "exists";
    `);

    if (tableExists[0]?.exists) {
      console.log('[CreateKpaOperatorAuditLogs] Table already exists, skipping.');
      return;
    }

    await queryRunner.query(`
      CREATE TABLE "kpa_operator_audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "operator_id" uuid NOT NULL,
        "operator_role" varchar(50) NOT NULL,
        "action_type" varchar(50) NOT NULL,
        "target_type" varchar(50) NOT NULL,
        "target_id" uuid NOT NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_kpa_operator_audit_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_kpa_audit_operator_id" ON "kpa_operator_audit_logs" ("operator_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_kpa_audit_target_type" ON "kpa_operator_audit_logs" ("target_type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_kpa_audit_created_at" ON "kpa_operator_audit_logs" ("created_at" DESC)
    `);

    console.log('[CreateKpaOperatorAuditLogs] Table and indexes created successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "kpa_operator_audit_logs"`);
  }
}

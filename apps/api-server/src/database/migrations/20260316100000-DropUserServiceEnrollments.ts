/**
 * WO-O4O-USER-DOMAIN-CLEANUP-V1: Drop user_service_enrollments table
 *
 * user_service_enrollments was a parallel enrollment workflow table that
 * duplicated service_memberships functionality. All enrollment logic has been
 * migrated to use service_memberships (SSOT). This migration drops the
 * orphaned table.
 *
 * Reversible: down() recreates the table structure for rollback safety.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUserServiceEnrollments20260316100000 implements MigrationInterface {
  name = 'DropUserServiceEnrollments20260316100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_enrollment_user_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_enrollment_service_status"`);

    // Drop the table
    await queryRunner.query(`DROP TABLE IF EXISTS "user_service_enrollments"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate table for rollback
    const hasTable = await queryRunner.hasTable('user_service_enrollments');
    if (!hasTable) {
      await queryRunner.query(`
        CREATE TABLE "user_service_enrollments" (
          "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "service_code" varchar(50) NOT NULL,
          "status" varchar(20) NOT NULL DEFAULT 'not_applied',
          "applied_at" timestamptz,
          "decided_at" timestamptz,
          "decided_by" uuid,
          "note" text,
          "metadata" jsonb DEFAULT '{}',
          "created_at" timestamptz DEFAULT now(),
          "updated_at" timestamptz DEFAULT now(),
          UNIQUE ("user_id", "service_code")
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_enrollment_user_status" ON "user_service_enrollments" ("user_id", "status")
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_enrollment_service_status" ON "user_service_enrollments" ("service_code", "status")
      `);
    }
  }
}

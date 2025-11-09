import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P1 Phase B-2: Add reason and reapply cooldown to RoleEnrollment
 *
 * Adds:
 * - reason (TEXT NULL): Reason for HOLD or REJECTED status
 * - reapply_after_at (TIMESTAMP NULL): When user can reapply after rejection
 *
 * These fields support:
 * - Admin providing detailed feedback on holds/rejections
 * - Enforcing cooldown periods for rejected applications
 * - Email notifications with specific reasons
 */
export class AddReasonAndReapplyCooldownToEnrollments1731129600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add reason column
    await queryRunner.query(`
      ALTER TABLE "role_enrollments"
      ADD COLUMN "reason" TEXT NULL
    `);

    // Add reapply_after_at column
    await queryRunner.query(`
      ALTER TABLE "role_enrollments"
      ADD COLUMN "reapply_after_at" TIMESTAMP NULL
    `);

    // Add index on reapply_after_at for efficient cooldown queries
    await queryRunner.query(`
      CREATE INDEX "IDX_role_enrollments_reapply_after_at"
      ON "role_enrollments" ("reapply_after_at")
      WHERE "reapply_after_at" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_role_enrollments_reapply_after_at"
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "role_enrollments"
      DROP COLUMN "reapply_after_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "role_enrollments"
      DROP COLUMN "reason"
    `);
  }
}

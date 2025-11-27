import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Phase 4: Drop V1 Role Enrollment System
 *
 * Removes the deprecated RoleEnrollment system (V1) completely:
 * - Drops role_enrollments table
 * - Removes enrollment_id foreign keys from role_assignments and kyc_documents
 *
 * The new V2 system (RoleApplication) is already in place and operational.
 */
export class DropRoleEnrollmentsTable7500000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints first
        await queryRunner.query(`
            ALTER TABLE "role_assignments"
            DROP CONSTRAINT IF EXISTS "FK_role_assignments_enrollment_id"
        `);

        await queryRunner.query(`
            ALTER TABLE "kyc_documents"
            DROP CONSTRAINT IF EXISTS "FK_kyc_documents_enrollment_id"
        `);

        // Drop indexes
        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_kyc_documents_enrollment_id"
        `);

        // Drop enrollment_id columns
        await queryRunner.query(`
            ALTER TABLE "role_assignments"
            DROP COLUMN IF EXISTS "enrollment_id"
        `);

        await queryRunner.query(`
            ALTER TABLE "kyc_documents"
            DROP COLUMN IF EXISTS "enrollment_id"
        `);

        // Drop role_enrollments table
        await queryRunner.query(`
            DROP TABLE IF EXISTS "role_enrollments"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Recreate role_enrollments table
        await queryRunner.query(`
            CREATE TABLE "role_enrollments" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "role" varchar(50) NOT NULL,
                "status" varchar(50) NOT NULL DEFAULT 'PENDING',
                "application_data" jsonb,
                "reviewed_at" timestamp,
                "reviewed_by" uuid,
                "review_note" text,
                "reason" text,
                "reapply_after_at" timestamp,
                "created_at" timestamp NOT NULL DEFAULT NOW(),
                "updated_at" timestamp NOT NULL DEFAULT NOW()
            )
        `);

        // Recreate enrollment_id columns
        await queryRunner.query(`
            ALTER TABLE "role_assignments"
            ADD COLUMN "enrollment_id" uuid
        `);

        await queryRunner.query(`
            ALTER TABLE "kyc_documents"
            ADD COLUMN "enrollment_id" uuid
        `);

        // Recreate indexes
        await queryRunner.query(`
            CREATE INDEX "IDX_kyc_documents_enrollment_id"
            ON "kyc_documents" ("enrollment_id")
        `);

        // Recreate foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "role_assignments"
            ADD CONSTRAINT "FK_role_assignments_enrollment_id"
            FOREIGN KEY ("enrollment_id")
            REFERENCES "role_enrollments"("id")
            ON DELETE SET NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "kyc_documents"
            ADD CONSTRAINT "FK_kyc_documents_enrollment_id"
            FOREIGN KEY ("enrollment_id")
            REFERENCES "role_enrollments"("id")
            ON DELETE CASCADE
        `);
    }
}

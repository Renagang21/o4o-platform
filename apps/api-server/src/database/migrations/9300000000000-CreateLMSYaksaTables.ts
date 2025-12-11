import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * LMS-Yaksa Phase 7.1 Migration
 * Creates Yaksa LMS specific tables:
 * - lms_yaksa_license_profiles
 * - lms_yaksa_required_course_policies
 * - lms_yaksa_credit_records
 * - lms_yaksa_course_assignments
 */
export class CreateLMSYaksaTables9300000000000 implements MigrationInterface {
  name = 'CreateLMSYaksaTables9300000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ENUM types first
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_type_enum') THEN
          CREATE TYPE credit_type_enum AS ENUM ('required', 'elective', 'special', 'ethics');
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_status_enum') THEN
          CREATE TYPE assignment_status_enum AS ENUM ('assigned', 'in_progress', 'completed', 'overdue', 'cancelled');
        END IF;
      END$$;
    `);

    // 1. Create lms_yaksa_license_profiles table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lms_yaksa_license_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "organizationId" uuid,
        "licenseNumber" character varying(100),
        "licenseIssuedAt" TIMESTAMP,
        "licenseExpiresAt" TIMESTAMP,
        "totalCredits" numeric(10,2) NOT NULL DEFAULT 0,
        "currentYearCredits" numeric(10,2) NOT NULL DEFAULT 0,
        "isRenewalRequired" boolean NOT NULL DEFAULT false,
        "lastVerifiedAt" TIMESTAMP,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lms_yaksa_license_profiles" PRIMARY KEY ("id")
      )
    `);

    // 2. Create lms_yaksa_required_course_policies table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lms_yaksa_required_course_policies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid,
        "name" character varying(200) NOT NULL,
        "description" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "requiredCourseIds" jsonb NOT NULL DEFAULT '[]',
        "requiredCredits" numeric(10,2) NOT NULL DEFAULT 0,
        "targetMemberTypes" jsonb,
        "targetPharmacistTypes" jsonb,
        "validityPeriod" integer,
        "validFrom" TIMESTAMP,
        "validUntil" TIMESTAMP,
        "priority" integer NOT NULL DEFAULT 0,
        "note" text,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lms_yaksa_required_course_policies" PRIMARY KEY ("id")
      )
    `);

    // 3. Create lms_yaksa_credit_records table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lms_yaksa_credit_records" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "courseId" uuid NOT NULL,
        "creditType" credit_type_enum NOT NULL DEFAULT 'elective',
        "creditsEarned" numeric(10,2) NOT NULL DEFAULT 0,
        "earnedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "creditYear" integer NOT NULL,
        "certificateId" uuid,
        "enrollmentId" uuid,
        "courseTitle" character varying(300),
        "isVerified" boolean NOT NULL DEFAULT false,
        "verifiedBy" uuid,
        "note" text,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lms_yaksa_credit_records" PRIMARY KEY ("id")
      )
    `);

    // 4. Create lms_yaksa_course_assignments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lms_yaksa_course_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "organizationId" uuid,
        "courseId" uuid NOT NULL,
        "policyId" uuid,
        "status" assignment_status_enum NOT NULL DEFAULT 'assigned',
        "isCompleted" boolean NOT NULL DEFAULT false,
        "completedAt" TIMESTAMP,
        "dueDate" TIMESTAMP,
        "assignedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "assignedBy" uuid,
        "enrollmentId" uuid,
        "progressPercent" integer NOT NULL DEFAULT 0,
        "priority" integer NOT NULL DEFAULT 0,
        "isMandatory" boolean NOT NULL DEFAULT true,
        "note" text,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lms_yaksa_course_assignments" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for lms_yaksa_license_profiles
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_license_profiles_userId"
      ON "lms_yaksa_license_profiles" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_license_profiles_organizationId"
      ON "lms_yaksa_license_profiles" ("organizationId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_license_profiles_licenseNumber"
      ON "lms_yaksa_license_profiles" ("licenseNumber")
    `);

    // Create indexes for lms_yaksa_required_course_policies
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_required_course_policies_organizationId"
      ON "lms_yaksa_required_course_policies" ("organizationId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_required_course_policies_isActive"
      ON "lms_yaksa_required_course_policies" ("isActive")
    `);

    // Create indexes for lms_yaksa_credit_records
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_credit_records_userId"
      ON "lms_yaksa_credit_records" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_credit_records_courseId"
      ON "lms_yaksa_credit_records" ("courseId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_credit_records_creditYear"
      ON "lms_yaksa_credit_records" ("creditYear")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_credit_records_user_year"
      ON "lms_yaksa_credit_records" ("userId", "creditYear")
    `);

    // Create indexes for lms_yaksa_course_assignments
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_course_assignments_userId"
      ON "lms_yaksa_course_assignments" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_course_assignments_courseId"
      ON "lms_yaksa_course_assignments" ("courseId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_course_assignments_policyId"
      ON "lms_yaksa_course_assignments" ("policyId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_course_assignments_status"
      ON "lms_yaksa_course_assignments" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_course_assignments_user_course"
      ON "lms_yaksa_course_assignments" ("userId", "courseId")
    `);

    // Create unique constraint for user-course assignment
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_course_assignments_user_course_policy"
      ON "lms_yaksa_course_assignments" ("userId", "courseId", "policyId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_course_assignments_user_course_policy"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_course_assignments_user_course"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_course_assignments_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_course_assignments_policyId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_course_assignments_courseId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_course_assignments_userId"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_credit_records_user_year"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_credit_records_creditYear"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_credit_records_courseId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_credit_records_userId"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_required_course_policies_isActive"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_required_course_policies_organizationId"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_license_profiles_licenseNumber"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_license_profiles_organizationId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_license_profiles_userId"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "lms_yaksa_course_assignments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lms_yaksa_credit_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lms_yaksa_required_course_policies"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lms_yaksa_license_profiles"`);

    // Drop ENUM types
    await queryRunner.query(`DROP TYPE IF EXISTS assignment_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS credit_type_enum`);
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1
 *
 * Create lms_assignments + lms_submissions tables.
 *
 * - lms_assignments: 1:1 with lesson (lessonId UNIQUE).
 * - lms_submissions: (assignmentId, userId) UNIQUE — re-submission overwrites.
 * - submission == lesson completed (no grading in this phase).
 */
export class CreateLmsAssignmentTables20260502120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lms_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "lessonId" UUID NOT NULL UNIQUE REFERENCES lms_lessons(id) ON DELETE CASCADE,
        instructions TEXT,
        "submissionType" VARCHAR(20) NOT NULL DEFAULT 'text',
        "dueDate" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lms_submissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "assignmentId" UUID NOT NULL REFERENCES lms_assignments(id) ON DELETE CASCADE,
        "userId" UUID NOT NULL,
        "lessonId" UUID NOT NULL,
        content TEXT,
        "submittedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'submitted',
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UQ_lms_submissions_assignment_user" UNIQUE ("assignmentId", "userId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lms_submissions_user"
        ON lms_submissions ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lms_submissions_lesson"
        ON lms_submissions ("lessonId")
    `);

    console.log('[Migration] Created lms_assignments + lms_submissions');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS lms_submissions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS lms_assignments CASCADE`);
  }
}

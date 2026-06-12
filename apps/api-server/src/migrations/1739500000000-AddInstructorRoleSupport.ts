import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-LMS-INSTRUCTOR-ROLE-V1
 *
 * 1. EnrollmentStatus enum에 'approved', 'rejected' 추가
 * 2. InstructorApplication 테이블 생성
 */
export class AddInstructorRoleSupport1739500000000 implements MigrationInterface {
  name = 'AddInstructorRoleSupport1739500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enrollment status enum 확장
    await queryRunner.query(`
      ALTER TYPE lms_enrollments_status_enum ADD VALUE IF NOT EXISTS 'approved'
    `);
    await queryRunner.query(`
      ALTER TYPE lms_enrollments_status_enum ADD VALUE IF NOT EXISTS 'rejected'
    `);

    // 2. InstructorApplication 테이블 생성
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lms_instructor_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        "reviewedBy" UUID,
        "reviewedAt" TIMESTAMP,
        "rejectionReason" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // 3. 인덱스 생성
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lms_instructor_applications_userId"
        ON lms_instructor_applications ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lms_instructor_applications_status"
        ON lms_instructor_applications (status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL enum에서 값을 제거하는 것은 복잡하므로 down에서는 테이블만 삭제
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lms_instructor_applications_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lms_instructor_applications_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS lms_instructor_applications`);
  }
}

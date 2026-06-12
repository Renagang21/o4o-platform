import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-LMS-INSTRUCTOR-ROLE-V1
 *
 * InstructorApplication 테이블 생성 (lms_instructor_applications)
 *
 * NOTE(WO-O4O-LMS-INSTRUCTOR-APPLICATION-MIGRATION-RELOCATE-V1, 2026-06-12):
 *   - 미스캔 src/migrations → 스캔 src/database/migrations 로 이전(orphaned → 정상 적용).
 *   - 원본의 `ALTER TYPE lms_enrollments_status_enum ADD VALUE ...` step 제거:
 *     live lms_enrollments.status 는 VARCHAR 이며 lms_enrollments_status_enum 타입이
 *     존재하지 않아 ALTER TYPE 가 hard error(테이블 생성 도달 불가)를 유발. enum 값은
 *     VARCHAR 컬럼에 이미 저장 가능하므로 해당 step 은 불필요(moot).
 *   - 목적: /api/v1/kpa/lms/instructors/:userId/public-profile 의 42P01(relation 부재) 해소.
 */
export class AddInstructorRoleSupport1739500000000 implements MigrationInterface {
  name = 'AddInstructorRoleSupport1739500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // InstructorApplication 테이블 생성
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

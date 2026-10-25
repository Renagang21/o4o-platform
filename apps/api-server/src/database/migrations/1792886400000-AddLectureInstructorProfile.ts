import type { MigrationInterface, QueryRunner } from 'typeorm';
/** Additive, nullable applicant fields. Existing applications remain unchanged; no backfill. */
export class AddLectureInstructorProfile1792886400000 implements MigrationInterface {
  name = 'AddLectureInstructorProfile1792886400000';
  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE lms_instructor_applications ADD COLUMN bio varchar(3000), ADD COLUMN expertise varchar(1000)');
  }
  async down(q: QueryRunner): Promise<void> {
    // Refuse to destroy applicant text during a rollback. Resolve data retention separately.
    await q.query(`DO $$ BEGIN IF EXISTS(SELECT 1 FROM lms_instructor_applications WHERE bio IS NOT NULL OR expertise IS NOT NULL) THEN RAISE EXCEPTION 'INSTRUCTOR_PROFILE_DATA_EXISTS'; END IF; END $$`);
    await q.query('ALTER TABLE lms_instructor_applications DROP COLUMN bio, DROP COLUMN expertise');
  }
}

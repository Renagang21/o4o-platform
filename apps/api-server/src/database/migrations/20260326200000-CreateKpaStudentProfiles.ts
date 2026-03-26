/**
 * WO-KPA-A-RBAC-PROFILE-NORMALIZATION-V1
 *
 * Create kpa_student_profiles table for student qualification data.
 * Separates student university/year from membership (kpa_members).
 *
 * user_id is UNIQUE: one student profile per user.
 * Backfills existing data from kpa_members WHERE membership_type = 'student'.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKpaStudentProfiles20260326200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kpa_student_profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id),
        university_name VARCHAR(200),
        student_year INT,
        enrollment_status VARCHAR(50) DEFAULT 'enrolled',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ksp_user_id
      ON kpa_student_profiles(user_id)
    `);

    // Backfill from kpa_members: copy university_name and student_year
    // for existing student members.
    // DISTINCT ON (user_id) handles users with multiple memberships.
    await queryRunner.query(`
      INSERT INTO kpa_student_profiles (user_id, university_name, student_year)
      SELECT DISTINCT ON (km.user_id)
        km.user_id,
        km.university_name,
        km.student_year
      FROM kpa_members km
      WHERE km.membership_type = 'student'
        AND (km.university_name IS NOT NULL OR km.student_year IS NOT NULL)
      ORDER BY km.user_id, km.created_at ASC
      ON CONFLICT (user_id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS kpa_student_profiles`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-INSTRUCTOR-APPLICATION-V1
 * Creates instructor_profiles table
 * Populated on qualification approval (qualification_type = 'instructor')
 */
export class CreateInstructorProfiles1771200000028 implements MigrationInterface {
  name = 'CreateInstructorProfiles1771200000028';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS instructor_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE,
        display_name VARCHAR(200) NOT NULL,
        organization VARCHAR(200),
        job_title VARCHAR(100),
        expertise JSONB NOT NULL DEFAULT '[]',
        bio TEXT,
        experience TEXT,
        lecture_topics JSONB NOT NULL DEFAULT '[]',
        lecture_plan_summary TEXT,
        portfolio_url VARCHAR(500),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_instructor_profile_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_instructor_profile_user
        ON instructor_profiles (user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_instructor_profile_active
        ON instructor_profiles (is_active)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS instructor_profiles`);
  }
}

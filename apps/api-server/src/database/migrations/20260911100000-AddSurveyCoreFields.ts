import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SURVEY-CORE-PHASE1-V1
 *
 * O4O 공통 Participation Engine 분류 컬럼을 lms_surveys / lms_survey_responses에 추가.
 *
 * lms_surveys:
 *   - service_key       varchar(50) NOT NULL DEFAULT 'global'
 *   - owner_type        varchar(30) NOT NULL DEFAULT 'community_member'
 *   - owner_id          uuid NULL
 *   - organization_id   uuid NULL
 *   - visibility        varchar(30) NOT NULL DEFAULT 'members_only'
 *   - target_filter     jsonb NOT NULL DEFAULT '{}'
 *
 * lms_survey_responses:
 *   - service_key       varchar(50) NOT NULL DEFAULT 'global'
 *   - organization_id   uuid NULL
 *   - anonymous_token   varchar(64) NULL
 *
 * 인덱스:
 *   - idx_lms_surveys_service_key, owner, visibility
 *   - idx_lms_survey_responses_service_key
 *   - uq_lms_survey_responses_anon (UNIQUE partial: surveyId, anonymous_token WHERE NOT NULL)
 */
export class AddSurveyCoreFields20260911100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── lms_surveys ─────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_surveys
        ADD COLUMN IF NOT EXISTS service_key     varchar(50) NOT NULL DEFAULT 'global',
        ADD COLUMN IF NOT EXISTS owner_type      varchar(30) NOT NULL DEFAULT 'community_member',
        ADD COLUMN IF NOT EXISTS owner_id        uuid NULL,
        ADD COLUMN IF NOT EXISTS organization_id uuid NULL,
        ADD COLUMN IF NOT EXISTS visibility      varchar(30) NOT NULL DEFAULT 'members_only',
        ADD COLUMN IF NOT EXISTS target_filter   jsonb NOT NULL DEFAULT '{}'::jsonb
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_lms_surveys_service_key ON lms_surveys(service_key)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_lms_surveys_owner ON lms_surveys(owner_type, owner_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_lms_surveys_visibility ON lms_surveys(visibility)`);

    // ─── lms_survey_responses ────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_survey_responses
        ADD COLUMN IF NOT EXISTS service_key     varchar(50) NOT NULL DEFAULT 'global',
        ADD COLUMN IF NOT EXISTS organization_id uuid NULL,
        ADD COLUMN IF NOT EXISTS anonymous_token varchar(64) NULL
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_lms_survey_responses_service_key ON lms_survey_responses(service_key)`);

    // 익명 응답 중복 방지: (surveyId, anonymous_token) UNIQUE — token NOT NULL일 때만
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_lms_survey_responses_anon
        ON lms_survey_responses ("surveyId", anonymous_token)
        WHERE anonymous_token IS NOT NULL
    `);

    console.log('[Migration] Added Survey core fields (service_key/owner/visibility/target_filter/anonymous_token) + indexes');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_lms_survey_responses_anon`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lms_survey_responses_service_key`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lms_surveys_visibility`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lms_surveys_owner`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lms_surveys_service_key`);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_survey_responses
        DROP COLUMN IF EXISTS anonymous_token,
        DROP COLUMN IF EXISTS organization_id,
        DROP COLUMN IF EXISTS service_key
    `);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS lms_surveys
        DROP COLUMN IF EXISTS target_filter,
        DROP COLUMN IF EXISTS visibility,
        DROP COLUMN IF EXISTS organization_id,
        DROP COLUMN IF EXISTS owner_id,
        DROP COLUMN IF EXISTS owner_type,
        DROP COLUMN IF EXISTS service_key
    `);
  }
}

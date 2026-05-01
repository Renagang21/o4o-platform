import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SURVEY-CORE-PHASE1-V1
 *
 * O4O Common Survey (Participation Engine) Phase 1 — 3 tables.
 *
 * interactive-content-core/Survey, SurveyQuestion, SurveyResponse entity는
 * 이미 정의되어 있으나 prod에 테이블이 없는 상태(lms_courses와 동일 패턴).
 * 이번 마이그레이션이 entity 정의에 일치하는 CREATE TABLE을 수행한다.
 *
 * 후속 마이그레이션(AddSurveyCoreFields)에서 service_key/owner/visibility/
 * organization_id/target_filter/anonymous_token 등 O4O 공통 분류 컬럼을 ALTER로 추가한다.
 *
 * 모든 DDL은 IF NOT EXISTS — 기존 환경에서 중복 실행 안전.
 */
export class CreateLmsSurveyTables20260911000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ─── lms_surveys ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lms_surveys (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        title varchar(255) NOT NULL,
        description text,
        status varchar(20) NOT NULL DEFAULT 'draft',
        "isPublished" boolean NOT NULL DEFAULT false,
        "publishedAt" timestamp NULL,
        "bundleId" uuid NULL,
        "startAt" timestamp NULL,
        "endAt" timestamp NULL,
        "allowAnonymous" boolean NOT NULL DEFAULT false,
        "allowMultipleResponses" boolean NOT NULL DEFAULT false,
        "maxResponses" integer NULL,
        "responseCount" integer NOT NULL DEFAULT 0,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdBy" uuid NULL,
        "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_lms_surveys_status_created_at ON lms_surveys(status, "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_lms_surveys_bundle ON lms_surveys("bundleId")`);

    // ─── lms_survey_questions ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lms_survey_questions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "surveyId" uuid NOT NULL,
        type varchar(20) NOT NULL DEFAULT 'single',
        question text NOT NULL,
        description text NULL,
        options jsonb NOT NULL DEFAULT '[]'::jsonb,
        "order" integer NOT NULL DEFAULT 0,
        "isRequired" boolean NOT NULL DEFAULT false,
        "scaleMin" integer NULL,
        "scaleMax" integer NULL,
        "scaleMinLabel" varchar(100) NULL,
        "scaleMaxLabel" varchar(100) NULL,
        "maxLength" integer NULL,
        "conditionalDisplay" jsonb NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_lms_survey_questions_survey_order ON lms_survey_questions("surveyId", "order")`);

    // ─── lms_survey_responses ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lms_survey_responses (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "surveyId" uuid NOT NULL,
        "userId" uuid NULL,
        answers jsonb NOT NULL DEFAULT '[]'::jsonb,
        status varchar(20) NOT NULL DEFAULT 'in_progress',
        "completedAt" timestamp NULL,
        "timeSpent" integer NULL,
        "isAnonymous" boolean NOT NULL DEFAULT false,
        "ipAddress" varchar(45) NULL,
        "userAgent" text NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_lms_survey_responses_survey_created ON lms_survey_responses("surveyId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_lms_survey_responses_user_survey ON lms_survey_responses("userId", "surveyId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_lms_survey_responses_status ON lms_survey_responses(status)`);

    console.log('[Migration] Created lms_surveys + lms_survey_questions + lms_survey_responses');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS lms_survey_responses`);
    await queryRunner.query(`DROP TABLE IF EXISTS lms_survey_questions`);
    await queryRunner.query(`DROP TABLE IF EXISTS lms_surveys`);
  }
}

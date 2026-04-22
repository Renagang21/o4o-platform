import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-LMS-CREATOR-QUALIFICATION-DATA-MIGRATION-V1
 *
 * 기존 instructor / content_provider / survey_operator 자격을
 * lms_creator 단일 자격으로 통합한다.
 *
 * 처리 순서:
 * 1. 이미 lms_creator row가 있는 사용자는 SKIP
 * 2. 없는 사용자는 레거시 자격 중 최우선 상태(approved > pending > rejected)로 INSERT
 * 3. lms_creator=approved 이면서 instructor_profiles가 없는 사용자 → 프로필 생성
 * 4. lms_creator=approved 이면서 lms:instructor 역할 없는 사용자 → 역할 부여
 */
export class MigrateLmsCreatorQualification20260700200000 implements MigrationInterface {
  name = 'MigrateLmsCreatorQualification20260700200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Step 1: lms_creator row 생성 (레거시 자격 기반) ───────────────────

    await queryRunner.query(`
      INSERT INTO member_qualifications (user_id, qualification_type, status, requested_at, approved_at, rejected_at, metadata)
      SELECT
        ranked.user_id,
        'lms_creator',
        ranked.status,
        ranked.requested_at,
        ranked.approved_at,
        ranked.rejected_at,
        ranked.metadata
      FROM (
        SELECT
          user_id,
          status,
          requested_at,
          approved_at,
          rejected_at,
          metadata,
          ROW_NUMBER() OVER (
            PARTITION BY user_id
            ORDER BY
              CASE status
                WHEN 'approved' THEN 1
                WHEN 'pending'  THEN 2
                WHEN 'rejected' THEN 3
                ELSE 4
              END
          ) AS rn
        FROM member_qualifications
        WHERE qualification_type IN ('instructor', 'content_provider', 'survey_operator')
      ) ranked
      WHERE rn = 1
        AND NOT EXISTS (
          SELECT 1 FROM member_qualifications lc
          WHERE lc.user_id = ranked.user_id
            AND lc.qualification_type = 'lms_creator'
        )
    `);

    // ─── Step 2: instructor_profiles 생성 (approved lms_creator 중 프로필 없는 경우) ──

    // instructor 자격이 approved였던 사용자는 이미 프로필이 있을 것이므로
    // content_provider / survey_operator 에서 promoted된 사용자만 실질적으로 해당됨
    await queryRunner.query(`
      INSERT INTO instructor_profiles (user_id, display_name, organization, bio, experience, expertise, lecture_topics, is_active)
      SELECT
        mq.user_id,
        COALESCE(
          NULLIF(TRIM((mq.metadata->>'displayName')::text), ''),
          LEFT(NULLIF(TRIM((mq.metadata->>'bio')::text), ''), 50),
          'LMS 제작자'
        ) AS display_name,
        NULLIF(TRIM((mq.metadata->>'organization')::text), '') AS organization,
        NULLIF(TRIM((mq.metadata->>'bio')::text), '') AS bio,
        NULLIF(TRIM((mq.metadata->>'experience')::text), '') AS experience,
        COALESCE(mq.metadata->'expertise', '[]'::jsonb) AS expertise,
        '[]'::jsonb AS lecture_topics,
        true AS is_active
      FROM member_qualifications mq
      WHERE mq.qualification_type = 'lms_creator'
        AND mq.status = 'approved'
        AND NOT EXISTS (
          SELECT 1 FROM instructor_profiles ip WHERE ip.user_id = mq.user_id
        )
    `);

    // ─── Step 3: lms:instructor 역할 부여 (approved lms_creator 중 역할 없는 경우) ──

    await queryRunner.query(`
      INSERT INTO role_assignments (user_id, role, is_active, assigned_at, valid_from)
      SELECT
        mq.user_id,
        'lms:instructor',
        true,
        NOW(),
        NOW()
      FROM member_qualifications mq
      WHERE mq.qualification_type = 'lms_creator'
        AND mq.status = 'approved'
        AND NOT EXISTS (
          SELECT 1 FROM role_assignments ra
          WHERE ra.user_id = mq.user_id
            AND ra.role = 'lms:instructor'
            AND ra.is_active = true
        )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // lms_creator row 중 마이그레이션으로 생성된 것만 제거
    // (생성 후 수동으로 변경된 row는 건드리지 않기 위해 가장 안전한 조건 사용)
    await queryRunner.query(`
      DELETE FROM member_qualifications
      WHERE qualification_type = 'lms_creator'
        AND EXISTS (
          SELECT 1 FROM member_qualifications legacy
          WHERE legacy.user_id = member_qualifications.user_id
            AND legacy.qualification_type IN ('instructor', 'content_provider', 'survey_operator')
        )
        AND NOT EXISTS (
          SELECT 1 FROM qualification_requests qr
          WHERE qr.user_id = member_qualifications.user_id
            AND qr.qualification_type = 'lms_creator'
        )
    `);
  }
}

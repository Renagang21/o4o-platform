/**
 * WO-KPA-LMS-QUALIFICATION-REQUEST-BACKFILL-AND-SAFETY-V1
 *
 * member_qualifications에 row가 있으나 qualification_requests에 대응 row가 없는
 * 데이터 불일치를 복구한다.
 *
 * 원인: apply 흐름에서 member_qualifications INSERT 후 qualification_requests INSERT가
 * 트랜잭션으로 묶이지 않아, 중간 실패 시 부분 커밋 발생 가능.
 *
 * 이 마이그레이션은 누락된 qualification_requests row를 member_qualifications 기준으로 생성한다.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillQualificationRequests20260501000000 implements MigrationInterface {
  name = 'BackfillQualificationRequests20260501000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // member_qualifications에는 있으나 qualification_requests에 대응 row가 없는 건을 backfill
    const result = await queryRunner.query(`
      INSERT INTO qualification_requests (id, user_id, qualification_type, status, request_data, created_at, updated_at)
      SELECT
        gen_random_uuid(),
        mq.user_id,
        mq.qualification_type,
        mq.status,
        COALESCE(mq.metadata, '{}'::jsonb),
        COALESCE(mq.requested_at, mq.created_at),
        mq.updated_at
      FROM member_qualifications mq
      WHERE NOT EXISTS (
        SELECT 1 FROM qualification_requests qr
        WHERE qr.user_id = mq.user_id
          AND qr.qualification_type = mq.qualification_type
      )
    `);

    const count = Array.isArray(result) ? result.length : (result?.rowCount ?? 0);
    console.log(`[BackfillQualificationRequests] Backfilled ${count} missing qualification_requests rows`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Backfill된 row를 특정할 수 없으므로 down은 no-op
    // 운영상 문제 없음 (qualification_requests는 이력 테이블)
    console.log('[BackfillQualificationRequests] down: no-op (backfilled rows cannot be distinguished)');
  }
}

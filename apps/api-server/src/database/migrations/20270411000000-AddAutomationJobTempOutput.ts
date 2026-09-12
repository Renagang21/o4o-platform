import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-AUTOMATION-VIDEO-JOB-TEMP-OUTPUT-DOWNLOAD-AND-AUTO-CLEANUP-V1
 *
 * VIDEO Job 완성본은 Media Library 장기 자산이 아니라 "다운로드용 임시 output" 이다.
 * automation_jobs 에 object storage 참조 + 만료 시각 + 정리 상태만 최소 추가한다.
 *  - temp_output_object_key : 비공개 bucket 안의 object key (로컬 절대경로·URL 저장 금지)
 *  - temp_output_expires_at : TTL 만료 시각. 지나면 다운로드 차단 + expiry job 이 object 삭제
 *  - temp_output_cleanup_status : AVAILABLE(보관 중) / EXPIRED(만료·삭제 완료) / DELETE_FAILED(삭제 실패, 재시도)
 * cleanup_decision 은 그대로 둔다 — 의미는 Media Library 제작 자료 정리 방침으로만 쓴다(완성본 보관 정책 아님).
 * media_entity_links 의 기존 OUTPUT 행은 건드리지 않는다(backfill 없음).
 */
export class AddAutomationJobTempOutput20270411000000 implements MigrationInterface {
  name = 'AddAutomationJobTempOutput20270411000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE automation_jobs
      ADD COLUMN temp_output_object_key varchar(500),
      ADD COLUMN temp_output_file_name varchar(255),
      ADD COLUMN temp_output_mime_type varchar(100),
      ADD COLUMN temp_output_size bigint,
      ADD COLUMN temp_output_uploaded_at timestamptz,
      ADD COLUMN temp_output_expires_at timestamptz,
      ADD COLUMN temp_output_cleanup_status varchar(20)
        CHECK (temp_output_cleanup_status IN ('AVAILABLE','EXPIRED','DELETE_FAILED')),
      ADD CONSTRAINT automation_jobs_temp_output_check CHECK (
        (temp_output_object_key IS NULL) = (temp_output_cleanup_status IS NULL)
        AND (temp_output_object_key IS NULL) = (temp_output_expires_at IS NULL)
      )`);
    // expiry job 이 읽는 부분 index — 보관 중이거나 삭제 재시도 대상만.
    await q.query(`CREATE INDEX automation_jobs_temp_output_due_idx ON automation_jobs(temp_output_expires_at)
      WHERE temp_output_cleanup_status IN ('AVAILABLE','DELETE_FAILED')`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP INDEX IF EXISTS automation_jobs_temp_output_due_idx');
    await q.query(`ALTER TABLE automation_jobs
      DROP CONSTRAINT IF EXISTS automation_jobs_temp_output_check,
      DROP COLUMN IF EXISTS temp_output_cleanup_status,
      DROP COLUMN IF EXISTS temp_output_expires_at,
      DROP COLUMN IF EXISTS temp_output_uploaded_at,
      DROP COLUMN IF EXISTS temp_output_size,
      DROP COLUMN IF EXISTS temp_output_mime_type,
      DROP COLUMN IF EXISTS temp_output_file_name,
      DROP COLUMN IF EXISTS temp_output_object_key`);
  }
}

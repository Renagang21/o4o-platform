import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-AUTOMATION-VIDEO-JOB-P0-ADMIN-WORKSPACE-V1
 *
 * 얇은 자동화 작업 레코드 1개 테이블. asset 연결은 기존 media_entity_links
 * (entity_type='video-production-job', entity_id=automation_jobs.id) 를 재사용하므로
 * 이 migration 은 media schema 를 건드리지 않는다. 세부 제작 단계는 status_note 텍스트다.
 */
export class CreateAutomationJobs20270410000000 implements MigrationInterface {
  name = 'CreateAutomationJobs20270410000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE automation_jobs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      type varchar(20) NOT NULL CHECK (type IN ('VIDEO')),
      title varchar(200) NOT NULL,
      created_by uuid NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','IN_PROGRESS','WAITING','COMPLETED','CANCELLED')),
      instructions text,
      status_note varchar(500),
      cleanup_decision varchar(20) CHECK (cleanup_decision IN ('KEEP_ALL','KEEP_OUTPUTS','KEEP_SELECTED','DECIDE_LATER')),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz,
      CONSTRAINT automation_jobs_completed_check CHECK ((status = 'COMPLETED') = (completed_at IS NOT NULL))
    )`);
    await q.query(
      'CREATE INDEX automation_jobs_type_status_idx ON automation_jobs(type, status, updated_at DESC)',
    );
  }
  async down(q: QueryRunner): Promise<void> {
    // media_entity_links 의 video-production-job 행은 opaque entity_id 라 FK 가 없다. 테이블만 제거한다.
    await q.query('DROP TABLE IF EXISTS automation_jobs');
  }
}

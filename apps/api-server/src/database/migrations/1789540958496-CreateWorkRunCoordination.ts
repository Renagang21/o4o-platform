import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1 (PHASE 1)
 * 근거 IR: IR-O4O-WEB-AUTOMATION-RESUME-AND-WORKFLOW-STORE-PREFLIGHT-V1 (옵션 B)
 *
 * work_run_coordination — same-run resume 를 위한 **최소 조정 원장(coordination ledger)**.
 *
 * 이 테이블은 "작업 내용 저장소"가 아니다. 재개에 필요한 조정 상태만 담는다:
 *   run_id     — logical Work Run 식별자(runtime 이 발급, PC 에 도달하는 유일한 앵커).
 *   user_id    — 소유자(auth scope). 재개 요청자 검증.
 *   device_id  — local_agent_devices.id (user 별 영속). 어느 PC 의 run 인지.
 *   status     — active | waiting_for_user | completed | taken_over | expired.
 *   version    — optimistic concurrency(다중 Cloud Run 인스턴스 안전). 전이마다 +1.
 *   *_at       — 생성/수정/만료 시각(TTL cleanup).
 *
 * 저장 금지(불변식): goal 원문 · 질문 원문 · 사용자 답변 원문 · DOM · screenshot ·
 *   trajectory 전문 · workflow step 전문 · 환자/처방/약품 데이터 · local file path ·
 *   credential/token. Cloud 는 Local raw run state 를 read-back 하지 않는다.
 *
 * raw 마이그레이션 + raw SQL 서비스로 접근한다(TypeORM entity 아님) — local_agent_* 와 동일 패턴,
 * ESM entity boot-failure 위험 회피.
 */
export class CreateWorkRunCoordination1789540958496 implements MigrationInterface {
  name = 'CreateWorkRunCoordination1789540958496';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS work_run_coordination (
        run_id VARCHAR(64) PRIMARY KEY,
        user_id UUID NOT NULL,
        device_id UUID NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        CONSTRAINT "CHK_wrc_status" CHECK (status IN ('active','waiting_for_user','completed','taken_over','expired'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_wrc_user_status
        ON work_run_coordination (user_id, status)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_wrc_expires_at
        ON work_run_coordination (expires_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS work_run_coordination`);
  }
}

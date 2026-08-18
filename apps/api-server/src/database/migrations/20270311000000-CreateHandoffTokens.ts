/**
 * CreateHandoffTokens
 * WO-O4O-REDIS-SESSIONSYNC-REMOVAL-AND-MEMORYSTORE-DECOMMISSION-V1 §1
 *
 * Cross-Service SSO Handoff 토큰 저장소를 Redis 에서 PostgreSQL 로 이관한다.
 *
 * 기존 계약(WO-O4O-SERVICE-HANDOFF-ARCHITECTURE-V1)을 그대로 보존한다:
 *   - 60초 TTL (expires_at)
 *   - 단일 사용 (consumed_at 을 조건부 UPDATE 로 원자적 선점)
 *
 * 단일 사용 보장은 애플리케이션 레벨 체크가 아니라
 *   UPDATE ... WHERE consumed_at IS NULL AND expires_at > now() RETURNING *
 * 의 원자성으로 확보한다. Redis GET+DEL 2-step 보다 오히려 경쟁 조건에 강하다.
 *
 * 만료 레코드는 별도 스케줄러 없이 토큰 생성 시 확률적으로 정리한다
 * (60초 TTL · 저빈도 기능이라 테이블이 커질 여지가 없다).
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHandoffTokens20270311000000 implements MigrationInterface {
  name = 'CreateHandoffTokens20270311000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "handoff_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "source_service_key" varchar(64) NOT NULL,
        "target_service_key" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "consumed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_handoff_tokens" PRIMARY KEY ("id")
      )
    `);

    // 만료 정리용 (consumed 여부와 무관하게 expires_at 기준으로 지운다)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_handoff_tokens_expires_at"
        ON "handoff_tokens" ("expires_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_handoff_tokens_expires_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "handoff_tokens"`);
  }
}

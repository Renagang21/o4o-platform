import type { MigrationInterface, QueryRunner } from "typeorm";
import { randomUUID } from "node:crypto";

/** Review-only schema change. Apply only through the authorized incremental migration job. */
export class CreateAiUsageReservations1791870434349
  implements MigrationInterface
{
  name = "CreateAiUsageReservations1791870434349";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE ai_usage_reservations (
      id uuid PRIMARY KEY, scope varchar(50) NOT NULL, service_key varchar(100) NOT NULL,
      user_id varchar(100), daily_key varchar(10) NOT NULL, monthly_key varchar(7) NOT NULL,
      status varchar(10) NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','pending','settled','released')),
      reserved_requests bigint NOT NULL CHECK (reserved_requests >= 0),
      reserved_tokens bigint NOT NULL CHECK (reserved_tokens >= 0),
      reserved_cost numeric(20,8) NOT NULL CHECK (reserved_cost >= 0),
      pricing jsonb NOT NULL, receipt jsonb, outcome varchar(10) CHECK (outcome IN ('success','error')),
      actual_requests bigint, actual_tokens bigint, actual_cost numeric(20,8), provider_request_id uuid,
      reconciliation_id varchar(100) UNIQUE, reconciliation_usage jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW(), settled_at timestamptz
    )`);
    await queryRunner.query(
      `CREATE INDEX idx_ai_usage_reservations_pending ON ai_usage_reservations (daily_key, monthly_key) WHERE status IN ('reserved','pending')`,
    );
    // Sub-cent model prices must accumulate instead of rounding each call to zero.
    await queryRunner.query(
      "ALTER TABLE ai_usage_aggregate ALTER COLUMN current_value TYPE numeric(20,8)",
    );
    await queryRunner.query(
      'ALTER TABLE ai_usage_logs ALTER COLUMN "costEstimated" TYPE numeric(20,8)',
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    if (!queryRunner.isTransactionActive) {
      throw new Error("AI usage rollback requires a migration transaction");
    }
    // Each rollback keeps a distinct private recovery copy. No receipt is dropped or overwritten.
    // The canonical schemas return to the previous registered state; archives are for explicit repair.
    const archive = `ai_usage_rollback_${randomUUID().replace(/-/g, "")}`;
    await queryRunner.query(
      "LOCK TABLE public.ai_usage_aggregate, public.ai_usage_logs, public.ai_usage_reservations IN ACCESS EXCLUSIVE MODE",
    );
    await queryRunner.query(`CREATE SCHEMA "${archive}"`);
    await queryRunner.query(
      `CREATE TABLE "${archive}".ai_usage_aggregate AS TABLE public.ai_usage_aggregate`,
    );
    await queryRunner.query(
      `CREATE TABLE "${archive}".ai_usage_logs AS TABLE public.ai_usage_logs`,
    );
    await queryRunner.query(
      `ALTER TABLE public.ai_usage_reservations SET SCHEMA "${archive}"`,
    );
    // PostgreSQL rejects values outside the old precision: the transaction then preserves the new state.
    // Full-precision values remain in the recovery schema when the old runtime precision is restored.
    await queryRunner.query(
      "ALTER TABLE public.ai_usage_aggregate ALTER COLUMN current_value TYPE numeric(15,4) USING current_value::numeric(15,4)",
    );
    await queryRunner.query(
      'ALTER TABLE public.ai_usage_logs ALTER COLUMN "costEstimated" TYPE numeric(10,6) USING "costEstimated"::numeric(10,6)',
    );
  }
}

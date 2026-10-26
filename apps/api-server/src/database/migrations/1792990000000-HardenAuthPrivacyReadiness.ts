import type { MigrationInterface, QueryRunner } from 'typeorm';

const TABLES = ['cooperatives','member_paid_service_entitlements','store_consultation_stations','auth_rate_limit_counters'] as const;

/** Forward-only schema repair; no account rows, AI tables or production settings are changed. */
export class HardenAuthPrivacyReadiness1792990000000 implements MigrationInterface {
  name = 'HardenAuthPrivacyReadiness1792990000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE auth_rate_limit_counters (
      scope varchar(64) NOT NULL,
      key_digest char(64) NOT NULL CHECK(key_digest ~ '^[a-f0-9]{64}$'),
      hits integer NOT NULL CHECK(hits>=0),
      reset_at timestamptz NOT NULL,
      PRIMARY KEY(scope,key_digest)
    )`);
    await q.query('CREATE INDEX auth_rate_limit_counters_expiry ON auth_rate_limit_counters(reset_at)');
    for (const table of TABLES) {
      await q.query(`CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON public.${table}
        FOR EACH ROW EXECUTE FUNCTION public.account_erasure_write_fence()`);
    }
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('LOCK TABLE auth_rate_limit_counters IN ACCESS EXCLUSIVE MODE');
    const [row] = await q.query('SELECT EXISTS(SELECT 1 FROM auth_rate_limit_counters WHERE reset_at>statement_timestamp()) AS active');
    if (row.active) throw new Error('ACTIVE_AUTH_RATE_LIMIT_COUNTERS');
    for (const table of TABLES) await q.query(`DROP TRIGGER account_erasure_write_fence ON public.${table}`);
    await q.query('DROP TABLE auth_rate_limit_counters');
  }
}

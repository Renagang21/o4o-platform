import type { MigrationInterface, QueryRunner } from 'typeorm';

const TABLES = ['cooperatives','member_paid_service_entitlements','store_consultation_stations','auth_rate_limit_counters'] as const;

/** Forward-only schema repair; no account rows, AI tables or production settings are changed. */
export class HardenAuthPrivacyReadiness1792990000000 implements MigrationInterface {
  name = 'HardenAuthPrivacyReadiness1792990000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE public.auth_rate_limit_counters (
      scope varchar(64) NOT NULL,
      key_digest char(64) NOT NULL CHECK(key_digest ~ '^[a-f0-9]{64}$'),
      hits integer NOT NULL CHECK(hits>=0),
      reset_at timestamptz NOT NULL,
      PRIMARY KEY(scope,key_digest)
    )`);
    await q.query('CREATE INDEX auth_rate_limit_counters_expiry ON public.auth_rate_limit_counters(reset_at)');
    await q.query(TABLES.map(table => `CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON public.${table}
      FOR EACH ROW EXECUTE FUNCTION public.account_erasure_write_fence()`).join(';\n'));
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('LOCK TABLE public.auth_rate_limit_counters IN ACCESS EXCLUSIVE MODE');
    const [row] = await q.query('SELECT EXISTS(SELECT 1 FROM public.auth_rate_limit_counters WHERE reset_at>statement_timestamp()) AS active');
    if (row.active) throw new Error('ACTIVE_AUTH_RATE_LIMIT_COUNTERS');
    await q.query(TABLES.map(table => `DROP TRIGGER account_erasure_write_fence ON public.${table}`).join(';\n'));
    await q.query('DROP TABLE public.auth_rate_limit_counters');
  }
}

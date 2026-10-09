import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Auth refactor phase 2: browser logout plus security binding for pending handoffs. */
export class CreateBrowserSessionRevocations1791509600000 implements MigrationInterface {
  name = 'CreateBrowserSessionRevocations1791509600000';

  async up(q: QueryRunner): Promise<void> {
    // Registered incremental states include pgcrypto, while fresh bootstrap only
    // creates uuid-ossp. Converge fresh and established databases before recording
    // this state; preserve the frozen baseline and already-applied migrations.
    const extensions: Array<{ schema: string }> = await q.query(`SELECT n.nspname AS schema
      FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='pgcrypto'`);
    if (extensions.length && extensions[0].schema !== 'public') {
      throw new Error('pgcrypto must be installed in public; manual schema investigation required');
    }
    if (!extensions.length) await q.query('CREATE EXTENSION pgcrypto WITH SCHEMA public');
    await q.query(`CREATE TABLE browser_session_revocations (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      service_key varchar(100) NOT NULL,
      session_id uuid NOT NULL,
      revoked_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL,
      PRIMARY KEY (user_id, service_key, session_id)
    )`);
    await q.query('CREATE INDEX idx_browser_session_revocations_expiry ON browser_session_revocations (expires_at)');
    await q.query('ALTER TABLE handoff_tokens ADD COLUMN source_session_id uuid, ADD COLUMN source_token_family varchar(100)');
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE handoff_tokens DROP COLUMN source_session_id, DROP COLUMN source_token_family');
    await q.query('DROP TABLE browser_session_revocations');
  }
}

import type { MigrationInterface, QueryRunner } from "typeorm";

/** Personal mailbox metadata only. No message bodies, login credentials or outbound SMTP changes. */
export class CreatePersonalMail1792998000000 implements MigrationInterface {
  name = "CreatePersonalMail1792998000000";
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE personal_mail_accounts (
      id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider varchar(12) NOT NULL CHECK(provider IN ('gmail','naver')), address varchar(320) NOT NULL,
      credential_cipher text NOT NULL, state varchar(16) NOT NULL DEFAULT 'active' CHECK(state IN ('active','reconnect')),
      generation integer NOT NULL DEFAULT 1, sync_cursor text, sync_started_at timestamptz NOT NULL DEFAULT now(), sync_completed_at timestamptz,
      next_sync_at timestamptz NOT NULL DEFAULT now(), last_error varchar(80),
      created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,provider,address), UNIQUE(id,user_id)
    )`);
    await q.query(
      `CREATE INDEX personal_mail_accounts_sync ON personal_mail_accounts(next_sync_at) WHERE state='active'`,
    );
    await q.query(`CREATE TABLE personal_mail_oauth_flows (
      id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      state_hash varchar(64) NOT NULL UNIQUE, verifier_cipher text NOT NULL,
      expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE TABLE personal_mail_messages (
      account_id uuid NOT NULL REFERENCES personal_mail_accounts(id) ON DELETE CASCADE,
      provider_id varchar(500) NOT NULL, sender varchar(320) NOT NULL, received_at timestamptz NOT NULL,
      important boolean NOT NULL DEFAULT false, inbox boolean NOT NULL DEFAULT true,
      indexed_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(), rule_revision integer NOT NULL DEFAULT 0,
      PRIMARY KEY(account_id,provider_id)
    )`);
    await q.query(
      `CREATE INDEX personal_mail_messages_sender ON personal_mail_messages(account_id,sender,received_at)`,
    );
    await q.query(`CREATE TABLE personal_mail_rules (
      id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES personal_mail_accounts(id) ON DELETE CASCADE,
      sender varchar(320) NOT NULL, action varchar(16) NOT NULL CHECK(action IN ('keep','archive','trash','important')),
      category varchar(24) NOT NULL DEFAULT 'general', revision integer NOT NULL DEFAULT 1,
      source_connection_id uuid, effective_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(account_id,sender)
    )`);
    await q.query(`CREATE TABLE personal_mail_jobs (
      id uuid PRIMARY KEY, account_id uuid NOT NULL, user_id uuid NOT NULL,
      FOREIGN KEY(account_id,user_id) REFERENCES personal_mail_accounts(id,user_id) ON DELETE CASCADE,
      request_id uuid NOT NULL, fingerprint varchar(64) NOT NULL, kind varchar(12) NOT NULL CHECK(kind IN ('cleanup','rule','automatic')),
      action varchar(16) NOT NULL CHECK(action IN ('keep','archive','trash','important')),
      status varchar(16) NOT NULL CHECK(status IN ('preview','pending','running','paused','failed','completed','cancelled')),
      proposal jsonb NOT NULL DEFAULT '{}', include_important boolean NOT NULL DEFAULT false,
      generation integer NOT NULL, total integer NOT NULL CHECK(total>=0), source_connection_id uuid,
      confirmed_at timestamptz, confirmation_expires_at timestamptz NOT NULL,
      lease_token uuid, lease_until timestamptz, last_error varchar(80),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(user_id,request_id)
    )`);
    await q.query(
      `CREATE INDEX personal_mail_jobs_pending ON personal_mail_jobs(status,lease_until,created_at)`,
    );
    await q.query(`CREATE TABLE personal_mail_job_items (
      job_id uuid NOT NULL REFERENCES personal_mail_jobs(id) ON DELETE CASCADE,
      provider_id varchar(500) NOT NULL,
      status varchar(12) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','done','skipped','failed')),
      attempts integer NOT NULL DEFAULT 0, result varchar(40), error_code varchar(80),
      PRIMARY KEY(job_id,provider_id)
    )`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DO $$ BEGIN IF EXISTS(SELECT 1 FROM personal_mail_accounts) OR EXISTS(SELECT 1 FROM personal_mail_oauth_flows)
      THEN RAISE EXCEPTION 'PERSONAL_MAIL_DATA_EXISTS'; END IF; END $$`);
    for (const table of [
      "personal_mail_job_items",
      "personal_mail_jobs",
      "personal_mail_rules",
      "personal_mail_messages",
      "personal_mail_oauth_flows",
      "personal_mail_accounts",
    ])
      await q.query(`DROP TABLE ${table}`);
  }
}

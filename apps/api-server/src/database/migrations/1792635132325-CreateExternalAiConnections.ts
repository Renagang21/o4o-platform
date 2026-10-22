import type { MigrationInterface, QueryRunner } from "typeorm";

/** External delegation only. No login token, content, product, role or provider-billing migration. */
export class CreateExternalAiConnections1792635132325
  implements MigrationInterface
{
  name = "CreateExternalAiConnections1792635132325";
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE external_ai_settings (
      id integer PRIMARY KEY CHECK(id=1), revision integer NOT NULL DEFAULT 0,
      settings jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE TABLE external_ai_clients (
      id text PRIMARY KEY, metadata jsonb NOT NULL, secret_cipher text,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE TABLE external_ai_connections (
      id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_id text NOT NULL REFERENCES external_ai_clients(id), workspaces jsonb NOT NULL,
      scopes jsonb NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(
      "CREATE INDEX external_ai_connections_user ON external_ai_connections(user_id)",
    );
    await q.query(`CREATE TABLE external_ai_credentials (
      hash text PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('pending','code','access','refresh')),
      client_id text NOT NULL REFERENCES external_ai_clients(id),
      connection_id uuid REFERENCES external_ai_connections(id) ON DELETE CASCADE,
      data jsonb NOT NULL DEFAULT '{}', expires_at timestamptz NOT NULL, consumed_at timestamptz
    )`);
    await q.query(
      "CREATE INDEX external_ai_credentials_expiry ON external_ai_credentials(expires_at)",
    );
    await q.query(
      "CREATE INDEX external_ai_credentials_connection ON external_ai_credentials(connection_id)",
    );
    await q.query(
      "CREATE INDEX external_ai_credentials_client ON external_ai_credentials(client_id)",
    );
    await q.query(`CREATE TABLE external_ai_requests (
      connection_id uuid NOT NULL REFERENCES external_ai_connections(id) ON DELETE CASCADE,
      request_id uuid NOT NULL, fingerprint text NOT NULL, result jsonb NOT NULL,
      expires_at timestamptz NOT NULL, PRIMARY KEY(connection_id,request_id)
    )`);
    await q.query(`CREATE TABLE external_ai_errors (
      id uuid PRIMARY KEY, tool text NOT NULL, code text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(
      "CREATE INDEX external_ai_errors_created ON external_ai_errors(created_at)",
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DO $$ BEGIN IF EXISTS(SELECT 1 FROM external_ai_connections)
      OR EXISTS(SELECT 1 FROM external_ai_clients) OR EXISTS(SELECT 1 FROM external_ai_settings)
      OR EXISTS(SELECT 1 FROM external_ai_errors)
      THEN RAISE EXCEPTION 'EXTERNAL_AI_DATA_EXISTS'; END IF; END $$`);
    for (const table of [
      "external_ai_errors",
      "external_ai_requests",
      "external_ai_credentials",
      "external_ai_connections",
      "external_ai_clients",
      "external_ai_settings",
    ]) {
      await q.query(`DROP TABLE ${table}`);
    }
  }
}

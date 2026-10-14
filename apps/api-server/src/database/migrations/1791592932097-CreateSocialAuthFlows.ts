import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Auth phase 4-B/C: one-use browser-bound OAuth/link proofs; identity uniqueness remains DB-owned. */
export class CreateSocialAuthFlows1791592932097 implements MigrationInterface {
  name = 'CreateSocialAuthFlows1791592932097';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE public.auth_social_flows (
      token_hash varchar(64) PRIMARY KEY, binding_hash varchar(64) NOT NULL,
      kind varchar(32) NOT NULL CHECK (kind IN ('kakao-login','kakao-signup','link-reauth','link-permit','link-proof','link-confirm')),
      provider varchar(16) NOT NULL CHECK (provider IN ('google','kakao')),
      origin varchar(255) NOT NULL, service_key varchar(64) NOT NULL,
      user_id uuid REFERENCES public.users(id) ON DELETE CASCADE, session_id uuid, token_family varchar(255),
      payload jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL, used_at timestamptz,
      CONSTRAINT chk_social_flow_owner CHECK (
        (kind IN ('kakao-login','kakao-signup') AND user_id IS NULL AND session_id IS NULL AND token_family IS NULL) OR
        (kind IN ('link-reauth','link-permit','link-proof','link-confirm') AND user_id IS NOT NULL AND session_id IS NOT NULL AND token_family IS NOT NULL))
    )`);
    await q.query('CREATE INDEX idx_auth_social_flows_expiry ON public.auth_social_flows(expires_at)');
    await q.query(`CREATE UNIQUE INDEX "UQ_linked_accounts_kakao_user" ON public.linked_accounts("userId") WHERE provider='kakao'`);
    await q.query(`ALTER TABLE public.linked_accounts ADD CONSTRAINT chk_kakao_provider_id
      CHECK (provider <> 'kakao' OR ("providerId" IS NOT NULL AND length("providerId") > 0))`);
  }
  async down(q: QueryRunner): Promise<void> {
    const rows: Array<{ exists: boolean }> = await q.query(`SELECT EXISTS
      (SELECT 1 FROM public.linked_accounts WHERE provider='kakao') OR EXISTS
      (SELECT 1 FROM public.auth_social_flows WHERE expires_at>now() AND used_at IS NULL) AS exists`);
    if (rows[0]?.exists) throw new Error('Social identities or active proofs remain; rollback requires explicit data disposition');
    await q.query('DROP TABLE public.auth_social_flows');
    await q.query('DROP INDEX public."UQ_linked_accounts_kakao_user"');
    await q.query('ALTER TABLE public.linked_accounts DROP CONSTRAINT chk_kakao_provider_id');
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Auth phase 4-A: preserve the verified Kakao method without promoting it to Google. */
export class AllowKakaoHandoffAuthMethod1791527589096 implements MigrationInterface {
  name = 'AllowKakaoHandoffAuthMethod1791527589096';

  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE public.handoff_tokens DROP CONSTRAINT chk_handoff_source_auth_method');
    await q.query(`ALTER TABLE public.handoff_tokens ADD CONSTRAINT chk_handoff_source_auth_method
      CHECK (source_auth_method IS NULL OR source_auth_method IN ('google', 'password', 'kakao'))`);
  }

  async down(q: QueryRunner): Promise<void> {
    const rows: Array<{ exists: boolean }> = await q.query(
      "SELECT EXISTS (SELECT 1 FROM public.handoff_tokens WHERE source_auth_method = 'kakao')",
    );
    if (rows[0]?.exists) {
      throw new Error('Kakao handoff rows remain; rollback requires an explicit data disposition');
    }
    await q.query('ALTER TABLE public.handoff_tokens DROP CONSTRAINT chk_handoff_source_auth_method');
    await q.query(`ALTER TABLE public.handoff_tokens ADD CONSTRAINT chk_handoff_source_auth_method
      CHECK (source_auth_method IS NULL OR source_auth_method IN ('google', 'password'))`);
  }
}

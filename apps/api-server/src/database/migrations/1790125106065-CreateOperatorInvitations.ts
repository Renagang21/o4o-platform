import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §8 · §23
 *
 * 운영자 초대 1개 테이블. 재사용 가능한 invitation domain 이 저장소 전수 검색에서 0건이라 신설한다.
 *   - raw token 은 저장하지 않는다 (sha256 hex 만, UNIQUE)
 *   - 동일 (email, service, role) 의 pending 중복은 부분 UNIQUE 로 물리 차단
 *   - actor FK 는 ON DELETE SET NULL — 계정이 사라져도 초대 이력은 남는다
 * down 가능: 이 테이블만 DROP 한다(다른 스키마 무접촉).
 */
export class CreateOperatorInvitations1790125106065 implements MigrationInterface {
  name = 'CreateOperatorInvitations1790125106065';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE operator_invitations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      invited_email varchar(255) NOT NULL,
      service_key varchar(64) NOT NULL,
      role varchar(64) NOT NULL,
      token_hash varchar(64) NOT NULL,
      status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','cancelled')),
      expires_at timestamptz NOT NULL,
      invited_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      accepted_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      accepted_at timestamptz,
      cancelled_at timestamptz,
      CONSTRAINT operator_invitations_accepted_check CHECK ((status = 'accepted') = (accepted_user_id IS NOT NULL AND accepted_at IS NOT NULL)),
      CONSTRAINT operator_invitations_cancelled_check CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL))
    )`);
    await q.query('CREATE UNIQUE INDEX UX_operator_invitations_token_hash ON operator_invitations(token_hash)');
    await q.query(
      `CREATE UNIQUE INDEX UX_operator_invitations_pending ON operator_invitations(lower(invited_email), service_key, role) WHERE status = 'pending'`,
    );
    await q.query('CREATE INDEX IDX_operator_invitations_status ON operator_invitations(status, expires_at)');
    await q.query('CREATE INDEX IDX_operator_invitations_email ON operator_invitations(lower(invited_email))');
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE IF EXISTS operator_invitations');
  }
}

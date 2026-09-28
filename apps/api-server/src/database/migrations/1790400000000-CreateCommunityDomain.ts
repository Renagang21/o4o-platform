import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §3 (S2)
 *
 * 커뮤니티를 **개체**로 만든다. 분회가 쓴 2층 패턴(서비스 키 1개 + 개체별 소속 + scope guard)을
 * 그대로 적용해 **새 서비스 키를 늘리지 않고** 개설·승인·운영자 한정을 만든다.
 *
 *   communities                  개체. slug 는 전역 UNIQUE (주소가 된다)
 *   community_creation_requests  개설 신청. slug 는 신청 시 · 승인 직전 2회 검사한다
 *   community_memberships        개체 단위 가입·역할. (community_id, user_id) UNIQUE
 *
 * 권한 경계(§3-3-1) — 이 스키마가 그것을 가능하게 하는 지점:
 *   운영자 판정은 `community_id` 일치가 아니라 **role='operator' AND status='active'** 다.
 *   승인된 일반 회원도 같은 community_id 를 갖기 때문이다.
 *
 * 개설 승인으로 주는 것은 **개체 운영자 + 서비스 가입**뿐이고,
 * 서비스 전체 역할(`community:admin`)은 주지 않는다(§3-3-2).
 *
 * down 가능: 이 3개 테이블만 DROP 한다(다른 스키마 무접촉).
 */
export class CreateCommunityDomain1790400000000 implements MigrationInterface {
  name = 'CreateCommunityDomain1790400000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE communities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      slug varchar(64) NOT NULL,
      name varchar(160) NOT NULL,
      description text,
      status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
      created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      approved_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      approved_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT chk_communities_slug_lower CHECK (slug = lower(slug))
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_communities_slug ON communities (slug)`);

    await q.query(`CREATE TABLE community_creation_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      requester_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      desired_slug varchar(64) NOT NULL,
      name varchar(160) NOT NULL,
      description text,
      status varchar(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected','slug_conflict')),
      reviewed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at timestamptz,
      reason text,
      created_community_id uuid REFERENCES communities(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT chk_ccr_slug_lower CHECK (desired_slug = lower(desired_slug)),
      CONSTRAINT chk_ccr_approved_has_community
        CHECK ((status = 'approved') = (created_community_id IS NOT NULL))
    )`);
    // 같은 사용자가 같은 slug 로 pending 을 중복 신청하지 못하게 한다.
    await q.query(`CREATE UNIQUE INDEX uq_ccr_pending_slug
      ON community_creation_requests (desired_slug)
      WHERE status = 'pending'`);
    await q.query(`CREATE INDEX idx_ccr_requester ON community_creation_requests (requester_user_id)`);

    await q.query(`CREATE TABLE community_memberships (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role varchar(16) NOT NULL DEFAULT 'member' CHECK (role IN ('operator','member')),
      status varchar(16) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','active','rejected','withdrawn')),
      approved_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      approved_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_community_memberships_member
      ON community_memberships (community_id, user_id)`);
    // 운영자 조회를 자주 한다(가입 승인·중재 판정).
    await q.query(`CREATE INDEX idx_community_memberships_operator
      ON community_memberships (community_id, role, status)`);
    await q.query(`CREATE INDEX idx_community_memberships_user
      ON community_memberships (user_id, status)`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS community_memberships`);
    await q.query(`DROP TABLE IF EXISTS community_creation_requests`);
    await q.query(`DROP TABLE IF EXISTS communities`);
  }
}

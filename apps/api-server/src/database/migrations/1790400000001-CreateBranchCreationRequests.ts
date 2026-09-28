import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 분회 개설 신청 원장
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §5 (S3)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 종전에는 분회를 만드는 경로가 `platform:super_admin` 전용 직접 생성 하나였다
 * (BranchAdminController — WO-O4O-KPA-BRANCH-CANONICAL-BRANCH-CREATION-API-V1).
 * 신청·승인 축이 없어서 "누가 개설을 요청했고 누가 승인했는가" 가 기록되지 않았고,
 * 개설과 첫 운영자 지정이 별개 수작업이었다.
 *
 * 이 원장이 그 신청 축이다. 승인 주체는 `kpa-branch:admin`(분회 서비스 전체 운영자)이다 —
 * `kpa-branch:operator` 는 **서비스 전역 역할**이어서 개별 분회 운영자도 갖는다. 그 역할로
 * 승인을 열면 A 분회 운영자가 B 분회 개설을 승인한다 (WO §5).
 *
 * 주소(slug)는 커뮤니티와 같은 이유로 **2회** 검사한다: 신청 시 · 승인 직전.
 * `kpa_organizations.slug` 는 부분 UNIQUE(`WHERE slug IS NOT NULL`) 이므로 물리 충돌은
 * 거기서 최종 차단되고, 이 표의 부분 UNIQUE 는 **pending 끼리의 선점**을 막는다.
 *
 * 분회 자체는 `kpa_organizations(type='group')` 이며 새 개체 표를 만들지 않는다.
 * 첫 운영자도 새 컬럼 없이 기존 4축으로 만든다 — `branch_memberships` active 행(어느 분회)
 * + `role_assignments('kpa-branch:operator')`(운영자인가). `branch_memberships` 에
 * role 컬럼을 두지 않는 기존 설계를 그대로 따른다.
 */
export class CreateBranchCreationRequests1790400000001 implements MigrationInterface {
  name = 'CreateBranchCreationRequests1790400000001';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE branch_creation_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      requester_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      desired_slug varchar(80) NOT NULL,
      name varchar(200) NOT NULL,
      parent_id uuid REFERENCES kpa_organizations(id) ON DELETE SET NULL,
      description varchar(500),
      address varchar(200),
      phone varchar(50),
      status varchar(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected','slug_conflict')),
      reviewed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at timestamptz,
      reason text,
      created_branch_id uuid REFERENCES kpa_organizations(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT chk_bcr_slug_lower CHECK (desired_slug = lower(desired_slug)),
      CONSTRAINT chk_bcr_approved_has_branch
        CHECK ((status = 'approved') = (created_branch_id IS NOT NULL))
    )`);

    // 같은 주소를 두 신청이 동시에 붙잡지 못하게 물리로 막는다 (검사 2회는 그 위의 안내 계층이다).
    await q.query(`CREATE UNIQUE INDEX uq_bcr_pending_slug
      ON branch_creation_requests (desired_slug) WHERE status = 'pending'`);
    await q.query(`CREATE INDEX idx_bcr_requester ON branch_creation_requests (requester_user_id)`);
    await q.query(`CREATE INDEX idx_bcr_status ON branch_creation_requests (status)`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS branch_creation_requests`);
  }
}

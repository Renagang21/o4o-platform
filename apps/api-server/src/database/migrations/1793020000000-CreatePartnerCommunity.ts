import type { MigrationInterface, QueryRunner } from "typeorm";

/** A new support community, never the retired Neture Partner identity. */
export class CreatePartnerCommunity1793020000000 implements MigrationInterface {
  name = "CreatePartnerCommunity1793020000000";
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE partner_community_boards (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(80) NOT NULL,
      description varchar(500) NOT NULL DEFAULT '', operator_only boolean NOT NULL DEFAULT false,
      active boolean NOT NULL DEFAULT true, revision integer NOT NULL DEFAULT 0 CHECK(revision>=0),
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE TABLE partner_community_posts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), board_id uuid NOT NULL REFERENCES partner_community_boards(id),
      author_id uuid REFERENCES users(id) ON DELETE SET NULL, title varchar(200) NOT NULL,
      body text NOT NULL CHECK(length(body)<=20000), state varchar(12) NOT NULL DEFAULT 'published' CHECK(state IN ('published','hidden','deleted')),
      pinned boolean NOT NULL DEFAULT false, revision integer NOT NULL DEFAULT 0 CHECK(revision>=0),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(
      "CREATE INDEX partner_community_posts_board ON partner_community_posts(board_id,created_at DESC,id)",
    );
    await q.query(`CREATE TABLE partner_community_comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid NOT NULL REFERENCES partner_community_posts(id),
      author_id uuid REFERENCES users(id) ON DELETE SET NULL, body text NOT NULL CHECK(length(body)<=4000),
      state varchar(12) NOT NULL DEFAULT 'published' CHECK(state IN ('published','hidden','deleted')),
      revision integer NOT NULL DEFAULT 0 CHECK(revision>=0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(
      "CREATE INDEX partner_community_comments_post ON partner_community_comments(post_id,created_at,id)",
    );
    await q.query(`CREATE TABLE partner_community_reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reporter_id uuid REFERENCES users(id) ON DELETE SET NULL,
      post_id uuid NOT NULL REFERENCES partner_community_posts(id), comment_id uuid REFERENCES partner_community_comments(id),
      reason varchar(1000) NOT NULL, status varchar(10) NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
      resolution varchar(1000), revision integer NOT NULL DEFAULT 0 CHECK(revision>=0), created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(
      "CREATE UNIQUE INDEX partner_community_report_target ON partner_community_reports(reporter_id,post_id,COALESCE(comment_id,'00000000-0000-0000-0000-000000000000'::uuid))",
    );
    await q.query(`CREATE TABLE partner_community_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
      kind varchar(60) NOT NULL, target_id uuid, reason varchar(1000), created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(
      "CREATE INDEX partner_community_events_created ON partner_community_events(created_at DESC,id)",
    );
    for (const table of [
      "partner_community_boards",
      "partner_community_posts",
      "partner_community_comments",
      "partner_community_reports",
      "partner_community_events",
    ]) {
      await q.query(
        `CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION account_erasure_write_fence()`,
      );
    }
    await q.query(`INSERT INTO partner_community_boards(name,description,operator_only) VALUES
      ('공지사항','Partner 서비스와 커뮤니티 이용 소식을 안내합니다.',true),
      ('자유 소통','채널 활동 경험과 일상의 이야기를 나눕니다.',false),
      ('콘텐츠 팁·질문','콘텐츠 제작과 홍보 도구의 활용법을 함께 나눕니다.',false)`);
    await q.query(`INSERT INTO platform_services(code,name,entry_url,service_type,approval_required,status)
      VALUES('partner-support','O4O Partner','https://partner.neture.co.kr','community',false,'active') ON CONFLICT(code) DO NOTHING`);
    for (const key of ["admin", "operator"]) {
      await q.query(
        `INSERT INTO roles(name,display_name,service_key,role_key,is_admin_role,is_system,is_active,is_assignable)
        VALUES($1,$2,'partner-support',$3,true,true,true,true) ON CONFLICT(name) DO NOTHING`,
        [`partner-support:${key}`, `Partner ${key}`, key],
      );
    }
  }
  async down(q: QueryRunner): Promise<void> {
    if (!q.isTransactionActive) throw new Error('Partner community rollback requires a transaction');
    await q.query('LOCK TABLE partner_community_boards,partner_community_posts,partner_community_comments,partner_community_reports,partner_community_events IN ACCESS EXCLUSIVE MODE');
    await q.query('LOCK TABLE service_memberships,role_assignments IN SHARE MODE');
    await q.query(`DO $$ BEGIN IF EXISTS(SELECT 1 FROM partner_community_posts) OR EXISTS(SELECT 1 FROM partner_community_events)
      OR EXISTS(SELECT 1 FROM service_memberships WHERE service_key='partner-support')
      OR EXISTS(SELECT 1 FROM role_assignments WHERE role IN ('partner-support:admin','partner-support:operator'))
      THEN RAISE EXCEPTION 'PARTNER_COMMUNITY_IN_USE'; END IF; END $$`);
    for (const table of [
      "partner_community_reports",
      "partner_community_comments",
      "partner_community_posts",
      "partner_community_events",
      "partner_community_boards",
    ])
      await q.query(`DROP TABLE ${table}`);
    await q.query(
      "DELETE FROM roles WHERE name IN ('partner-support:admin','partner-support:operator')",
    );
    await q.query("DELETE FROM platform_services WHERE code='partner-support'");
  }
}

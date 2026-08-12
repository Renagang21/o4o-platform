/**
 * CreateBranchFoundationTables
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §3
 *
 * 약사회 분회 서비스 1차 기반 테이블 3종.
 *
 *   branch_memberships — 회원의 현재 분회 + 전입/전출 이력 (append-only)
 *   branch_sites       — 분회 홈페이지 (고정 템플릿 기반, 페이지 빌더 아님)
 *   branch_domains     — 분회 자체 도메인 연결
 *   branch_posts       — 분회 공지 / 자료실 글 (운영자 글쓰기)
 *
 * 왜 organization_members 를 쓰지 않는가 (IR §7-2):
 *   organization_members 는 UNIQUE(organization_id, user_id) 이고 left_at 이 1칸뿐이라
 *   전출 → 재전입 이력이 누적되지 않는다. 실데이터도 전량 role='owner'(매장 소유권)로
 *   의미 축이 다르다. 따라서 분회 소속은 별도 원장을 둔다.
 *
 * 왜 kpa_members 를 쓰지 않는가:
 *   실측 결과 kpa_members.organization_id 는 kpa_organizations 가 아니라
 *   organizations(type='pharmacy') 를 가리킨다 — 즉 "소속 분회"가 아니라 "근무 약국"이다.
 *   두 축은 충돌하지 않으므로 분회 소속을 새 원장으로 분리한다.
 *
 * 4축 분리 (WO §4) — 합치거나 중복 저장하지 않는다:
 *   Identity = users / 서비스 접근 = service_memberships / 서비스 역할 = role_assignments
 *   / 분회 소속 = branch_memberships
 *   따라서 branch_memberships 에 role 컬럼을 두지 않는다. 분회 운영자는
 *   role_assignments('kpa-branch:operator') + 본인의 active 분회 소속의 교집합으로 정의된다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBranchFoundationTables20270304000000 implements MigrationInterface {
  name = 'CreateBranchFoundationTables20270304000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ── 1. branch_memberships ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "branch_memberships" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "joined_at" timestamptz NOT NULL DEFAULT now(),
        "left_at" timestamptz,
        "transfer_reason" varchar(200),
        "note" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_branch_memberships" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_branch_memberships_status"
          CHECK ("status" IN ('active', 'left')),
        CONSTRAINT "CHK_branch_memberships_left_at"
          CHECK (
            ("status" = 'active' AND "left_at" IS NULL)
            OR ("status" = 'left' AND "left_at" IS NOT NULL)
          ),
        CONSTRAINT "FK_branch_memberships_organization"
          FOREIGN KEY ("organization_id") REFERENCES "kpa_organizations"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    /**
     * 한 회원의 active 분회는 1개만 허용한다.
     * 부분 UNIQUE 이므로 status='left' 인 과거 이력은 몇 건이든 누적된다
     * → 전출 후 동일 분회 재전입도 새 행으로 기록된다 (덮어쓰기 없음).
     */
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_branch_memberships_active_user"
        ON "branch_memberships" ("user_id") WHERE "status" = 'active'
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_branch_memberships_org_status"
        ON "branch_memberships" ("organization_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_branch_memberships_user_joined"
        ON "branch_memberships" ("user_id", "joined_at" DESC)
    `);

    // ── 2. branch_sites ──────────────────────────────────────────────────────
    /**
     * 1차 범위는 고정 템플릿 홈페이지다. 블록/페이지 빌더 스키마를 만들지 않는다.
     * 공지·자료실은 별도 컬럼이 아니라 forum_core(공지) / 자료 게시물로 연결된다.
     */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "branch_sites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "title" varchar(200) NOT NULL,
        "tagline" varchar(300),
        "logo_url" varchar(500),
        "intro" text,
        "contact" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "template" varchar(30) NOT NULL DEFAULT 'classic',
        "is_published" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_branch_sites" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_branch_sites_organization" UNIQUE ("organization_id"),
        CONSTRAINT "CHK_branch_sites_template"
          CHECK ("template" IN ('classic')),
        CONSTRAINT "FK_branch_sites_organization"
          FOREIGN KEY ("organization_id") REFERENCES "kpa_organizations"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    // ── 3. branch_domains ────────────────────────────────────────────────────
    /**
     * 자체 도메인 연결. 분회별 배포·백엔드를 만들지 않고 단일 서비스가
     * Host 헤더로 분회를 해석하기 위한 매핑이다.
     * hostname 은 소문자 정규화된 값만 저장한다(애플리케이션 계층에서 강제).
     */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "branch_domains" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "hostname" varchar(253) NOT NULL,
        "is_primary" boolean NOT NULL DEFAULT false,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "verification_token" varchar(64) NOT NULL,
        "verified_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_branch_domains" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_branch_domains_hostname" UNIQUE ("hostname"),
        CONSTRAINT "CHK_branch_domains_status"
          CHECK ("status" IN ('pending', 'verifying', 'active', 'failed', 'disabled')),
        CONSTRAINT "CHK_branch_domains_hostname_lower"
          CHECK ("hostname" = lower("hostname")),
        CONSTRAINT "FK_branch_domains_organization"
          FOREIGN KEY ("organization_id") REFERENCES "kpa_organizations"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    /** 분회당 대표 도메인 1개 */
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_branch_domains_primary"
        ON "branch_domains" ("organization_id") WHERE "is_primary" = true
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_branch_domains_org"
        ON "branch_domains" ("organization_id")
    `);

    // ── 4. branch_posts ──────────────────────────────────────────────────────
    /**
     * 분회 홈페이지의 공지 / 자료실 글.
     *
     * 왜 forum 공통 구조를 쓰지 않는가 (CLAUDE.md §13 검토 결과):
     *   forum 은 Community 도메인이며 Primary Boundary 가 organizationId(= organizations,
     *   약국/사업자 축)다. 분회는 kpa_organizations 축이라 경계 키가 다르고, 댓글·스레드·
     *   권한 모델도 필요 없다. 여기서 필요한 것은 "운영자가 쓰고 방문자가 읽는 고정 템플릿
     *   홈페이지의 글 목록"뿐이므로 forum 을 분회 축으로 재해석하지 않고 별도 원장을 둔다.
     *   분회 커뮤니티 게시판이 요구되면 그때 forum 공통 구조로 별도 WO 에서 연결한다.
     */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "branch_posts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "category" varchar(20) NOT NULL DEFAULT 'notice',
        "title" varchar(300) NOT NULL,
        "content" text NOT NULL DEFAULT '',
        "attachments" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "is_pinned" boolean NOT NULL DEFAULT false,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "published_at" timestamptz,
        "author_user_id" uuid NOT NULL,
        "view_count" integer NOT NULL DEFAULT 0,
        "deleted_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_branch_posts" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_branch_posts_category"
          CHECK ("category" IN ('notice', 'resource')),
        CONSTRAINT "CHK_branch_posts_status"
          CHECK ("status" IN ('draft', 'published')),
        CONSTRAINT "FK_branch_posts_organization"
          FOREIGN KEY ("organization_id") REFERENCES "kpa_organizations"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_branch_posts_org_category"
        ON "branch_posts" ("organization_id", "category", "status", "published_at" DESC)
    `);

    console.log('[CreateBranchFoundationTables] branch_memberships / branch_sites / branch_domains / branch_posts ready');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "branch_posts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "branch_domains"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "branch_sites"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "branch_memberships"`);
  }
}

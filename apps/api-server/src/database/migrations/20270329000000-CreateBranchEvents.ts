/**
 * CreateBranchEvents
 * WO-O4O-KPA-BRANCH-EVENTS-AND-RSVP-V1
 *
 * 분회 행사 2테이블.
 *
 *   branch_events       분회 × 행사 (총회 · 세미나 · 교육 · 친목 전부 하나로)
 *   branch_event_rsvps  회원별 참가 응답
 *
 * 만들지 않는 것 (WO §10): 행사별 결제 · 좌석배정 · QR 출결 · LMS 강좌 ·
 * 화상회의 생성 · SMS 발송 · 복잡한 신청서 · 행사 종류별 서브시스템 ·
 * 총회/학술대회 전용 모델 · 별도 calendar 시스템.
 *
 * 행사 종류(type) 컬럼도 두지 않았다 — 분류가 필요하다는 근거가 아직 없고,
 * 지금 넣으면 화면마다 종류 분기가 생긴다.
 *
 * 재사용 조사 (WO §1, 프로덕션 실측):
 *   lms_events(0행)  = courseId 필수라 강좌 없는 총회를 담을 수 없다. RSVP 는 카운터뿐.
 *   partner_events   = 파트너 커미션 조건. **테이블이 프로덕션에 없다**(엔티티만 존재).
 *   o4o_event_logs · *_qr_scan_events = 텔레메트리.
 *   회원별 RSVP 개념은 저장소 전체에 없다.
 *   → 재사용 가능한 구조 없음. branch_events 도 존재하지 않는다.
 *
 * 공개 범위 (WO §5): 기존 공지(branch_posts)에는 공개범위 개념이 없고 published 면
 * 비로그인도 본다. 행사는 총회 안건·참석 명단이 섞이므로 **기본을 members_only** 로 두고
 * 대외 안내가 필요할 때만 운영자가 public 을 고른다.
 *
 * 착수 시점 프로덕션에 `branch_events` 부재 · `branch_posts` 0행이다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBranchEvents20270329000000 implements MigrationInterface {
  name = 'CreateBranchEvents20270329000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 행사 ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "branch_events" (
        "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid         NOT NULL,
        "title"           varchar(300) NOT NULL,
        "description"     text,
        "starts_at"       timestamptz  NOT NULL,
        "ends_at"         timestamptz,
        "location"        varchar(300),
        "external_url"    varchar(500),
        "rsvp_enabled"    boolean      NOT NULL DEFAULT false,
        "rsvp_deadline"   timestamptz,
        "visibility"      varchar(20)  NOT NULL DEFAULT 'members_only',
        "status"          varchar(20)  NOT NULL DEFAULT 'draft',
        "created_by"      uuid         NOT NULL,
        "created_at"      timestamptz  NOT NULL DEFAULT now(),
        "updated_at"      timestamptz  NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_events" DROP CONSTRAINT IF EXISTS "CHK_branch_events_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_events"
        ADD CONSTRAINT "CHK_branch_events_status"
        CHECK ("status" IN ('draft', 'published', 'cancelled'))
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_events" DROP CONSTRAINT IF EXISTS "CHK_branch_events_visibility"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_events"
        ADD CONSTRAINT "CHK_branch_events_visibility"
        CHECK ("visibility" IN ('public', 'members_only'))
    `);

    // 제목이 공백만인 행사를 만들 수 없다 — 목록에서 식별 불가능해진다
    await queryRunner.query(`
      ALTER TABLE "branch_events" DROP CONSTRAINT IF EXISTS "CHK_branch_events_title"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_events"
        ADD CONSTRAINT "CHK_branch_events_title" CHECK (btrim("title") <> '')
    `);

    // 끝나는 시각이 시작보다 앞설 수 없다
    await queryRunner.query(`
      ALTER TABLE "branch_events" DROP CONSTRAINT IF EXISTS "CHK_branch_events_period"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_events"
        ADD CONSTRAINT "CHK_branch_events_period"
        CHECK ("ends_at" IS NULL OR "ends_at" >= "starts_at")
    `);

    /**
     * 참가신청을 받지 않는 행사에 마감일만 남아 있으면 화면이 "마감 지남"을 잘못 말한다.
     * 마감일은 rsvp_enabled 일 때만 존재할 수 있다.
     */
    await queryRunner.query(`
      ALTER TABLE "branch_events" DROP CONSTRAINT IF EXISTS "CHK_branch_events_rsvp_deadline"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_events"
        ADD CONSTRAINT "CHK_branch_events_rsvp_deadline"
        CHECK ("rsvp_deadline" IS NULL OR "rsvp_enabled" = true)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_branch_events_org_starts"
        ON "branch_events" ("organization_id", "starts_at")
    `);
    // 회원·공개 목록 — 게시된 행사만
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_branch_events_published"
        ON "branch_events" ("organization_id", "starts_at")
        WHERE "status" = 'published'
    `);

    // ── 참가 응답 ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "branch_event_rsvps" (
        "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "event_id"     uuid        NOT NULL,
        "user_id"      uuid        NOT NULL,
        "status"       varchar(20) NOT NULL,
        "memo"         text,
        "responded_at" timestamptz NOT NULL DEFAULT now(),
        "created_at"   timestamptz NOT NULL DEFAULT now(),
        "updated_at"   timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_event_rsvps" DROP CONSTRAINT IF EXISTS "CHK_branch_event_rsvps_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_event_rsvps"
        ADD CONSTRAINT "CHK_branch_event_rsvps_status"
        CHECK ("status" IN ('attending', 'not_attending'))
    `);

    /**
     * 회원 1명 = 행사 1개 = 응답 1개. 응답 변경은 UPDATE 이며 새 행을 만들지 않는다.
     * 중복 신청 방지가 애플리케이션이 아니라 DB 계약이다 (WO §9-5).
     */
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_branch_event_rsvps_event_user"
        ON "branch_event_rsvps" ("event_id", "user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_branch_event_rsvps_event"
        ON "branch_event_rsvps" ("event_id")
    `);

    /**
     * 행사가 지워지면 응답도 함께 지운다. 응답은 행사 없이는 의미가 없고,
     * 고아 행이 남으면 참가 명단 집계가 조용히 틀어진다.
     */
    await queryRunner.query(`
      ALTER TABLE "branch_event_rsvps" DROP CONSTRAINT IF EXISTS "FK_branch_event_rsvps_event"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_event_rsvps"
        ADD CONSTRAINT "FK_branch_event_rsvps_event"
        FOREIGN KEY ("event_id") REFERENCES "branch_events" ("id") ON DELETE CASCADE
    `);

    console.log('[CreateBranchEvents] branch_events / branch_event_rsvps ready');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "branch_event_rsvps"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "branch_events"`);
  }
}

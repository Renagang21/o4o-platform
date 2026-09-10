/**
 * ExtendBranchPostsCategoryMeeting
 * WO-O4O-KPA-BRANCH-MEETING-POSTS-ADOPTION-V1
 * 설계 근거: IR-O4O-KPA-BRANCH-ORGANIZATION-AND-MEETING-MINIMAL-MODEL-V1
 *
 * 분회 회의를 **별도 meeting 시스템으로 만들지 않는다.**
 *
 *   회의 일정 · 장소   → branch_events        (20270329000000)
 *   회의 참석          → branch_event_rsvps   (20270329000000)
 *   회의록 · 회의자료  → branch_posts(category='meeting')  ← 이 migration
 *
 * 그래서 이 migration 이 하는 일은 CHECK 제약 한 줄을 넓히는 것뿐이다.
 * 신규 테이블 · 신규 컬럼 · FK 를 만들지 않는다 (WO §2·§3·§10).
 *
 * 회의와 행사를 FK 로 잇지 않는 이유: 회의록이 반드시 행사 한 건에 대응하지 않고
 * (합동회의 · 서면회의 · 소집 없는 보고), 이으면 행사 삭제가 회의록 보존을 흔든다.
 * 참조가 필요하면 본문에 링크를 쓴다 (WO §3).
 *
 * 기존 notice/resource 데이터는 건드리지 않는다 — 값을 넓히기만 한다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendBranchPostsCategoryMeeting20270401000000 implements MigrationInterface {
  name = 'ExtendBranchPostsCategoryMeeting20270401000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "branch_posts" DROP CONSTRAINT IF EXISTS "CHK_branch_posts_category"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_posts" ADD CONSTRAINT "CHK_branch_posts_category"
        CHECK ("category" IN ('notice','resource','meeting'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 되돌리기 전에 meeting 글이 남아 있으면 제약 추가가 실패한다.
    // 데이터를 조용히 지우지 않는다 — 실패가 올바른 신호다.
    await queryRunner.query(`
      ALTER TABLE "branch_posts" DROP CONSTRAINT IF EXISTS "CHK_branch_posts_category"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_posts" ADD CONSTRAINT "CHK_branch_posts_category"
        CHECK ("category" IN ('notice','resource'))
    `);
  }
}

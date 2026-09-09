/**
 * CreateBranchOfficers
 * WO-O4O-KPA-BRANCH-OFFICER-ROSTER-V1
 * 설계 근거: IR-O4O-KPA-BRANCH-ORGANIZATION-AND-MEETING-MINIMAL-MODEL-V1
 *
 * 분회 임원·위원회·TF 명부 1테이블. **임기와 표시순서만 구조화한다.**
 *
 * 만들지 않는 것 (WO 범위 밖): 결재 · 직책별 권한 · 조직도 편집기 ·
 * 연락처 관리 · 위원회별 별도 테이블 · 회의 기능.
 *
 * **연락처(전화·주소·이메일) 컬럼이 없다.** 이것이 기본 공개범위를 `public` 으로
 * 둘 수 있는 전제다 — 공개되는 정보가 성명·직책·임기에 그친다 (IR §4-1).
 *
 * 재사용 조사 (IR §2-1, 프로덕션 실측):
 *   organization_members.metadata.position  22행 중 채워진 행 0 · kpa_organizations 참조 0
 *   organization_members.role               접근권한(admin/manager/member/moderator)이지 직책 아님
 *   organization-core                       Frozen Core — 구조 변경 금지
 *   kpa_organizations · branch_sites        임원 필드 없음
 *   officer/committee/board 테이블          프로덕션 없음
 *   → 재사용 가능한 원장이 없다.
 *
 * 직책은 RBAC 이 아니다 — 20270305000000 이 이미 정한 판단을 그대로 따른다.
 * 이 migration 은 `role_assignments` 를 건드리지 않는다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBranchOfficers20270331000000 implements MigrationInterface {
  name = 'CreateBranchOfficers20270331000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "branch_officers" (
        "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid         NOT NULL,
        "user_id"         uuid,
        "name"            varchar(100) NOT NULL,
        "position"        varchar(100) NOT NULL,
        "group_name"      varchar(100),
        "term_start"      date         NOT NULL,
        "term_end"        date,
        "display_order"   int          NOT NULL DEFAULT 0,
        "status"          varchar(20)  NOT NULL DEFAULT 'active',
        "visibility"      varchar(20)  NOT NULL DEFAULT 'public',
        "created_at"      timestamptz  NOT NULL DEFAULT now(),
        "updated_at"      timestamptz  NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_officers" DROP CONSTRAINT IF EXISTS "CHK_branch_officers_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_officers"
        ADD CONSTRAINT "CHK_branch_officers_status" CHECK ("status" IN ('active', 'ended'))
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_officers" DROP CONSTRAINT IF EXISTS "CHK_branch_officers_visibility"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_officers"
        ADD CONSTRAINT "CHK_branch_officers_visibility"
        CHECK ("visibility" IN ('public', 'members_only'))
    `);

    /**
     * 성명과 직책은 명부의 최소 단위다. 공백만인 값은 목록에서 식별 불가능해진다.
     * `name` 은 `user_id` 연결 여부와 무관하게 항상 있어야 한다 — 임기 당시의 이름을
     * 그때 값으로 보존하기 위해서다.
     */
    await queryRunner.query(`
      ALTER TABLE "branch_officers" DROP CONSTRAINT IF EXISTS "CHK_branch_officers_identity"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_officers"
        ADD CONSTRAINT "CHK_branch_officers_identity"
        CHECK (btrim("name") <> '' AND btrim("position") <> '')
    `);

    // 임기가 거꾸로 갈 수 없다
    await queryRunner.query(`
      ALTER TABLE "branch_officers" DROP CONSTRAINT IF EXISTS "CHK_branch_officers_term"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_officers"
        ADD CONSTRAINT "CHK_branch_officers_term"
        CHECK ("term_end" IS NULL OR "term_end" >= "term_start")
    `);

    /**
     * 임기 종료 상태는 종료일을 갖는다.
     *
     * 반대 방향(active 는 term_end 가 없어야 한다)은 **강제하지 않는다** — 미래 날짜로
     * 임기 만료를 예약하는 것이 정상 운영이기 때문이다. "저장은 active 인데 임기는 지난"
     * 행은 조회에서 날짜 조건으로 걸러낸다 (`now()` 는 IMMUTABLE 이 아니라 CHECK 에 쓸 수 없다).
     */
    await queryRunner.query(`
      ALTER TABLE "branch_officers" DROP CONSTRAINT IF EXISTS "CHK_branch_officers_ended"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_officers"
        ADD CONSTRAINT "CHK_branch_officers_ended"
        CHECK ("status" <> 'ended' OR "term_end" IS NOT NULL)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_branch_officers_org_order"
        ON "branch_officers" ("organization_id", "display_order")
    `);
    // 공개 명부 · 회원 명부 — 현직만
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_branch_officers_active"
        ON "branch_officers" ("organization_id", "display_order")
        WHERE "status" = 'active'
    `);
    /**
     * W7 회원 콘솔 연동 — 회원 상세에서 "이 회원의 현재 직책"을 찾는 경로.
     * (user_id, organization_id) 복합이다. user_id 단독 인덱스를 만들지 않는다.
     */
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_branch_officers_user_org"
        ON "branch_officers" ("user_id", "organization_id")
        WHERE "user_id" IS NOT NULL AND "status" = 'active'
    `);

    console.log('[CreateBranchOfficers] branch_officers ready');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "branch_officers"`);
  }
}

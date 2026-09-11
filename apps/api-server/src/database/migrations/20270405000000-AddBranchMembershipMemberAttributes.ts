import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-BRANCH-PHARMACIST-PROFILE-CANONICALIZATION-V1 §8
 *
 * 분회별 회원 속성을 `branch_memberships` 에 둔다 (별도 profile 테이블을 만들지 않는다 —
 * IR-O4O-KPA-BRANCH-PHARMACIST-MASTER-AND-REPORT-YEAR-SEMANTICS-V1 결정 ①).
 *
 *   - fee_category      회비구분 (branch_fee_policies.fee_category 와 같은 코드계, A1_pharmacy_owner …)
 *   - workplace_name    근무처명   (신상신고 employment.workplaceName 의 sync 대상)
 *   - workplace_address 근무처 주소 (신상신고 employment.workplaceRoadAddress 의 sync 대상)
 *
 * 면허번호·직역은 여기 두지 않는다 — 개인 고유 자격이므로 `kpa_pharmacist_profiles` 가 canonical 이다.
 * `kpa_members` 는 이 WO 이후 read fallback 전용이며 분회 축에서 쓰지 않는다.
 *
 * 세 컬럼 모두 nullable · default 없음 · backfill 없음 (additive). 기존 행은 NULL 로 남고
 * 읽기 경로가 `kpa_members` 를 fallback 으로 본다.
 */
export class AddBranchMembershipMemberAttributes20270405000000 implements MigrationInterface {
  name = 'AddBranchMembershipMemberAttributes20270405000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "branch_memberships"
        ADD COLUMN IF NOT EXISTS "fee_category" varchar(50) NULL,
        ADD COLUMN IF NOT EXISTS "workplace_name" varchar(200) NULL,
        ADD COLUMN IF NOT EXISTS "workplace_address" varchar(300) NULL
    `);
    await queryRunner.query(
      `COMMENT ON COLUMN "branch_memberships"."fee_category" IS '분회 회비구분 (branch_fee_policies.fee_category 코드계)'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "branch_memberships"."workplace_name" IS '근무처명 — 신상신고 sync 대상'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "branch_memberships"."workplace_address" IS '근무처 주소 — 신상신고 sync 대상'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "branch_memberships"
        DROP COLUMN IF EXISTS "workplace_address",
        DROP COLUMN IF EXISTS "workplace_name",
        DROP COLUMN IF EXISTS "fee_category"
    `);
  }
}

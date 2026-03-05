import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-A-STUDENT-SIGNUP-FLOW-TEST-V1
 *
 * kpa_members.organization_id를 nullable로 변경.
 * 약대생(student)은 조직 없이 가입하므로 organization_id가 NULL일 수 있다.
 */
export class AllowNullableKpaMembersOrganizationId20260305100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "kpa_members"
      ALTER COLUMN "organization_id" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "kpa_members"
      ALTER COLUMN "organization_id" SET NOT NULL
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-C-BRANCH-CMS-HARDENING-V1
 * Add is_deleted column to branch CMS tables for soft delete support.
 */
export class AddBranchSoftDelete20260214000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // kpa_branch_news
    const newsHasCol = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'kpa_branch_news' AND column_name = 'is_deleted'`
    );
    if (newsHasCol.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "kpa_branch_news" ADD COLUMN "is_deleted" boolean NOT NULL DEFAULT false`
      );
    }

    // kpa_branch_officers
    const officerHasCol = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'kpa_branch_officers' AND column_name = 'is_deleted'`
    );
    if (officerHasCol.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "kpa_branch_officers" ADD COLUMN "is_deleted" boolean NOT NULL DEFAULT false`
      );
    }

    // kpa_branch_docs
    const docHasCol = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'kpa_branch_docs' AND column_name = 'is_deleted'`
    );
    if (docHasCol.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "kpa_branch_docs" ADD COLUMN "is_deleted" boolean NOT NULL DEFAULT false`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "kpa_branch_news" DROP COLUMN IF EXISTS "is_deleted"`);
    await queryRunner.query(`ALTER TABLE "kpa_branch_officers" DROP COLUMN IF EXISTS "is_deleted"`);
    await queryRunner.query(`ALTER TABLE "kpa_branch_docs" DROP COLUMN IF EXISTS "is_deleted"`);
  }
}

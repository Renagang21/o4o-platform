import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add Partner Recruiting Field to Glycopharm Products
 *
 * WO-PARTNER-RECRUIT-PHASE1-V1
 * Adds is_partner_recruiting boolean field to glycopharm_products.
 * Allows sellers/operators to mark products for partner recruiting,
 * which are then displayed in the Neture partner space.
 */
export class AddPartnerRecruitingToGlycopharmProducts1738300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.glycopharm_products
      ADD COLUMN IF NOT EXISTS is_partner_recruiting BOOLEAN DEFAULT FALSE NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_products_partner_recruiting"
      ON public.glycopharm_products (is_partner_recruiting)
      WHERE is_partner_recruiting = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS public."IDX_glycopharm_products_partner_recruiting"
    `);

    await queryRunner.query(`
      ALTER TABLE public.glycopharm_products
      DROP COLUMN IF EXISTS is_partner_recruiting
    `);
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Keep the existing organization UNIQUE; restrict user uniqueness to organization-less rows. */
export class AlignSellerRecruitmentApplicationIdentity1791477914134 implements MigrationInterface {
  name = 'AlignSellerRecruitmentApplicationIdentity1791477914134';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE UNIQUE INDEX uq_seller_recruitment_applications_legacy_applicant
      ON seller_recruitment_applications (recruitment_id, applicant_id)
      WHERE applicant_organization_id IS NULL`);
    await q.query(`ALTER TABLE seller_recruitment_applications
      DROP CONSTRAINT "UQ_seller_recruitment_applications_recruitment_applicant"`);
  }

  async down(q: QueryRunner): Promise<void> {
    const duplicates = await q.query(`SELECT 1 FROM seller_recruitment_applications
      GROUP BY recruitment_id, applicant_id HAVING COUNT(*) > 1 LIMIT 1`);
    if (duplicates.length) throw new Error('Rollback blocked: independent organization applications share a user. Preserve data and use the reviewed API rollback floor.');
    await q.query(`ALTER TABLE seller_recruitment_applications
      ADD CONSTRAINT "UQ_seller_recruitment_applications_recruitment_applicant" UNIQUE (recruitment_id, applicant_id)`);
    await q.query(`DROP INDEX uq_seller_recruitment_applications_legacy_applicant`);
  }
}

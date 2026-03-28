import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add operator_notes column to service_memberships.
 * Allows operators to leave internal notes on registration requests.
 */
export class AddOperatorNotesToServiceMemberships20260328200000 implements MigrationInterface {
  name = 'AddOperatorNotesToServiceMemberships20260328200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE service_memberships ADD COLUMN IF NOT EXISTS operator_notes TEXT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE service_memberships DROP COLUMN IF EXISTS operator_notes`,
    );
  }
}

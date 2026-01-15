import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix partner test account role
 *
 * The partner@neture.test account was created with role 'user' instead of 'partner'.
 * This migration fixes the role so the account can access the partner dashboard.
 */
export class FixPartnerTestAccountRole1737100300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update the partner test account role from 'user' to 'partner'
    const result = await queryRunner.query(
      `UPDATE users SET role = 'partner', roles = 'partner' WHERE email = 'partner@neture.test'`
    );

    console.log('Updated partner@neture.test role to "partner"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert the role back to 'user'
    await queryRunner.query(
      `UPDATE users SET role = 'user', roles = 'user' WHERE email = 'partner@neture.test'`
    );

    console.log('Reverted partner@neture.test role to "user"');
  }
}

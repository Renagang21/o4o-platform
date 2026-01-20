import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Remove K-Cosmetics consumer test account
 *
 * The consumer@k-cosmetics.test account was created with role 'user'
 * but displayed as '판매자' in the UI, causing confusion.
 * Removing this account to avoid role mismatch issues.
 */
export class RemoveKCosmeticsConsumerAccount1737450000000 implements MigrationInterface {
  name = 'RemoveKCosmeticsConsumerAccount1737450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM users WHERE email = $1`,
      ['consumer@k-cosmetics.test']
    );

    console.log('Removed consumer@k-cosmetics.test account');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot restore deleted account
    console.log('Cannot restore deleted account');
  }
}

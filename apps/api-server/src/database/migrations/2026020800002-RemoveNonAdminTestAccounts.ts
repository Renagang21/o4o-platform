/**
 * RemoveNonAdminTestAccounts
 *
 * 테스트 계정 정리: 운영자 및 Neture 계정 제외하고 삭제
 *
 * 삭제 대상:
 * - GlucoseView: pharmacist@o4o.com
 * - K-Cosmetics: consumer, seller, supplier
 * - GlycoPharm: pharmacy
 * - KPA Society: district-officer, branch-officer, pharmacist
 *
 * 유지:
 * - 모든 Neture 계정 (supplier-neture, partner-neture, admin-neture)
 * - 모든 운영자 계정 (admin-*)
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

const ACCOUNTS_TO_DELETE = [
  // GlucoseView (운영자 제외)
  'pharmacist@o4o.com',
  // K-Cosmetics (운영자 제외)
  'consumer-k-cosmetics@o4o.com',
  'seller-k-cosmetics@o4o.com',
  'supplier-k-cosmetics@o4o.com',
  // GlycoPharm (운영자 제외)
  'pharmacy-glycopharm@o4o.com',
  // KPA Society (운영자 제외)
  'district-officer-kpa@o4o.com',
  'branch-officer-kpa@o4o.com',
  'pharmacist-kpa@o4o.com',
];

export class RemoveNonAdminTestAccounts2026020800002 implements MigrationInterface {
  name = 'RemoveNonAdminTestAccounts2026020800002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const email of ACCOUNTS_TO_DELETE) {
      // First, get the user id
      const users = await queryRunner.query(
        `SELECT id FROM users WHERE email = $1`,
        [email]
      );

      if (users.length > 0) {
        const userId = users[0].id;

        // Delete related forum posts authored by this user
        const deletedPosts = await queryRunner.query(
          `DELETE FROM forum_post WHERE author_id = $1`,
          [userId]
        );
        if (deletedPosts.length > 0) {
          console.log(`  - Deleted ${deletedPosts.length} forum posts by ${email}`);
        }

        // Delete related forum comments by this user
        await queryRunner.query(
          `DELETE FROM forum_comment WHERE author_id = $1`,
          [userId]
        );

        // Delete the user
        await queryRunner.query(
          `DELETE FROM users WHERE id = $1`,
          [userId]
        );
        console.log(`Deleted test account: ${email}`);
      } else {
        console.log(`Account not found (already deleted?): ${email}`);
      }
    }

    console.log('');
    console.log('=== Test Account Cleanup Complete ===');
    console.log('Deleted accounts:', ACCOUNTS_TO_DELETE.length);
    console.log('');
    console.log('Preserved accounts:');
    console.log('  - All Neture accounts (*-neture@o4o.com)');
    console.log('  - All admin accounts (admin-*)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: down migration is not implemented
    // Re-run the original seed migrations if accounts need to be restored
    console.log('To restore deleted accounts, re-run:');
    console.log('  - SeedProductionTestAccounts1737000000000');
    console.log('  - SeedAdditionalTestAccounts1737100200000');
  }
}

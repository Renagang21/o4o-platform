import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration: Add requireApproval column to yaksa_forum_community table
 *
 * This enables communities to require admin approval for posts before publishing
 */
export class AddRequireApprovalToCommunity1732876800000 implements MigrationInterface {
  name = 'AddRequireApprovalToCommunity1732876800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add requireApproval column to yaksa_forum_community table
    await queryRunner.addColumn(
      'yaksa_forum_community',
      new TableColumn({
        name: 'require_approval',
        type: 'boolean',
        default: false,
        isNullable: false,
      })
    );

    console.log('✅ Added require_approval column to yaksa_forum_community table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove requireApproval column
    await queryRunner.dropColumn('yaksa_forum_community', 'require_approval');

    console.log('✅ Removed require_approval column from yaksa_forum_community table');
  }
}

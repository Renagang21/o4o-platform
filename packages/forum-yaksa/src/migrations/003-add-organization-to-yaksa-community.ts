import { MigrationInterface, QueryRunner, TableColumn, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Add Organization Support to Yaksa Community
 *
 * Adds organizationId column to YaksaCommunity entity
 * to integrate with organization-core structure.
 *
 * @version 1.0.0
 * @date 2025-11-30
 */
export class AddOrganizationToYaksaCommunity1701344100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Add organizationId to yaksa_forum_community
    // ============================================
    await queryRunner.addColumn(
      'yaksa_forum_community',
      new TableColumn({
        name: 'organizationId',
        type: 'uuid',
        isNullable: true,
      })
    );

    // ============================================
    // 2. Make ownerUserId nullable (for organization communities)
    // ============================================
    await queryRunner.changeColumn(
      'yaksa_forum_community',
      'ownerUserId',
      new TableColumn({
        name: 'ownerUserId',
        type: 'uuid',
        isNullable: true,
      })
    );

    // ============================================
    // 3. Add index for organizationId
    // ============================================
    await queryRunner.createIndex(
      'yaksa_forum_community',
      new TableIndex({
        name: 'IDX_yaksa_community_organization',
        columnNames: ['organizationId'],
      })
    );

    // ============================================
    // 4. Add foreign key to organization table
    // ============================================
    await queryRunner.createForeignKey(
      'yaksa_forum_community',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organization',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Drop foreign key
    // ============================================
    const table = await queryRunner.getTable('yaksa_forum_community');
    const orgFk = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('organizationId') !== -1
    );
    if (orgFk) {
      await queryRunner.dropForeignKey('yaksa_forum_community', orgFk);
    }

    // ============================================
    // 2. Drop index
    // ============================================
    await queryRunner.dropIndex('yaksa_forum_community', 'IDX_yaksa_community_organization');

    // ============================================
    // 3. Drop organizationId column
    // ============================================
    await queryRunner.dropColumn('yaksa_forum_community', 'organizationId');

    // ============================================
    // 4. Restore ownerUserId to NOT NULL
    // ============================================
    await queryRunner.changeColumn(
      'yaksa_forum_community',
      'ownerUserId',
      new TableColumn({
        name: 'ownerUserId',
        type: 'uuid',
        isNullable: false,
      })
    );
  }
}

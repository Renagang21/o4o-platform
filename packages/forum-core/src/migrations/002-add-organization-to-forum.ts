import { MigrationInterface, QueryRunner, TableColumn, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Add Organization Support to Forum
 *
 * Adds organizationId columns to ForumPost and ForumCategory entities
 * to enable organization-scoped forums.
 *
 * @version 1.0.0
 * @date 2025-11-30
 */
export class AddOrganizationToForum1701344000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Add organizationId to forum_post
    // ============================================
    await queryRunner.addColumn(
      'forum_post',
      new TableColumn({
        name: 'organizationId',
        type: 'uuid',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'forum_post',
      new TableColumn({
        name: 'isOrganizationExclusive',
        type: 'boolean',
        default: false,
      })
    );

    // Add index for organization-based filtering
    await queryRunner.createIndex(
      'forum_post',
      new TableIndex({
        name: 'IDX_forum_post_organization',
        columnNames: ['organizationId', 'status', 'createdAt'],
      })
    );

    // Add foreign key to organization table
    await queryRunner.createForeignKey(
      'forum_post',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organization',
        onDelete: 'SET NULL',
      })
    );

    // ============================================
    // 2. Add organizationId to forum_category
    // ============================================
    await queryRunner.addColumn(
      'forum_category',
      new TableColumn({
        name: 'organizationId',
        type: 'uuid',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'forum_category',
      new TableColumn({
        name: 'isOrganizationExclusive',
        type: 'boolean',
        default: false,
      })
    );

    // Add index for organization-based filtering
    await queryRunner.createIndex(
      'forum_category',
      new TableIndex({
        name: 'IDX_forum_category_organization',
        columnNames: ['organizationId', 'isActive'],
      })
    );

    // Add foreign key to organization table
    await queryRunner.createForeignKey(
      'forum_category',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organization',
        onDelete: 'SET NULL',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Rollback forum_category changes
    // ============================================
    // Drop foreign key
    const categoryTable = await queryRunner.getTable('forum_category');
    const categoryOrgFk = categoryTable?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('organizationId') !== -1
    );
    if (categoryOrgFk) {
      await queryRunner.dropForeignKey('forum_category', categoryOrgFk);
    }

    // Drop index
    await queryRunner.dropIndex('forum_category', 'IDX_forum_category_organization');

    // Drop columns
    await queryRunner.dropColumn('forum_category', 'isOrganizationExclusive');
    await queryRunner.dropColumn('forum_category', 'organizationId');

    // ============================================
    // 2. Rollback forum_post changes
    // ============================================
    // Drop foreign key
    const postTable = await queryRunner.getTable('forum_post');
    const postOrgFk = postTable?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('organizationId') !== -1
    );
    if (postOrgFk) {
      await queryRunner.dropForeignKey('forum_post', postOrgFk);
    }

    // Drop index
    await queryRunner.dropIndex('forum_post', 'IDX_forum_post_organization');

    // Drop columns
    await queryRunner.dropColumn('forum_post', 'isOrganizationExclusive');
    await queryRunner.dropColumn('forum_post', 'organizationId');
  }
}

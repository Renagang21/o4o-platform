import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create Views Table for NextGen CMS
 * Stores JSON-based page definitions for the ViewRenderer system
 */
export class CreateViewsTable1820000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create views table
    await queryRunner.createTable(
      new Table({
        name: 'views',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'viewId',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'url',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'json',
            type: 'jsonb',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'published', 'archived'],
            default: "'draft'",
          },
          {
            name: 'category',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'authorId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'lastModifiedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'version',
            type: 'integer',
            default: 1,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'views',
      new TableIndex({
        name: 'IDX_views_viewId',
        columnNames: ['viewId'],
      }),
    );

    await queryRunner.createIndex(
      'views',
      new TableIndex({
        name: 'IDX_views_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'views',
      new TableIndex({
        name: 'IDX_views_category',
        columnNames: ['category'],
      }),
    );

    await queryRunner.createIndex(
      'views',
      new TableIndex({
        name: 'IDX_views_url',
        columnNames: ['url'],
      }),
    );

    await queryRunner.createIndex(
      'views',
      new TableIndex({
        name: 'IDX_views_createdAt',
        columnNames: ['createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'views',
      new TableIndex({
        name: 'IDX_views_updatedAt',
        columnNames: ['updatedAt'],
      }),
    );

    // Create foreign key for authorId
    await queryRunner.createForeignKey(
      'views',
      new TableForeignKey({
        columnNames: ['authorId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign key for lastModifiedBy
    await queryRunner.createForeignKey(
      'views',
      new TableForeignKey({
        columnNames: ['lastModifiedBy'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const table = await queryRunner.getTable('views');
    if (table) {
      const authorForeignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('authorId') !== -1);
      if (authorForeignKey) {
        await queryRunner.dropForeignKey('views', authorForeignKey);
      }

      const modifierForeignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('lastModifiedBy') !== -1);
      if (modifierForeignKey) {
        await queryRunner.dropForeignKey('views', modifierForeignKey);
      }
    }

    // Drop table (indexes are dropped automatically)
    await queryRunner.dropTable('views');
  }
}

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCMSTablesV2_1733302800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if tables already exist
    const customPostTypesExists = await queryRunner.hasTable('custom_post_types');
    const customFieldsExists = await queryRunner.hasTable('custom_fields');
    const viewsExists = await queryRunner.hasTable('views');
    const pagesExists = await queryRunner.hasTable('pages');

    // If all tables exist, skip migration
    if (customPostTypesExists && customFieldsExists && viewsExists && pagesExists) {
      console.log('⏭️  Skipping migration: CMS tables already exist');
      return;
    }

    // ========================================
    // 1. CREATE custom_post_types TABLE
    // ========================================
    if (!customPostTypesExists) {
      await queryRunner.createTable(
      new Table({
        name: 'custom_post_types',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'schema',
            type: 'jsonb',
            isNullable: false
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'draft'",
            isNullable: false
          },
          {
            name: 'siteId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'createdBy',
            type: 'varchar',
            length: '255',
            isNullable: false
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false
          }
        ]
      }),
      true
    );

      await queryRunner.createIndex(
        'custom_post_types',
        new TableIndex({
          name: 'IDX_custom_post_types_slug',
          columnNames: ['slug'],
          isUnique: true
        })
      );

      await queryRunner.createIndex(
        'custom_post_types',
        new TableIndex({
          name: 'IDX_custom_post_types_status',
          columnNames: ['status']
        })
      );
    }

    // ========================================
    // 2. CREATE custom_fields TABLE
    // ========================================
    if (!customFieldsExists) {
      await queryRunner.createTable(
      new Table({
        name: 'custom_fields',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'postTypeId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false
          },
          {
            name: 'label',
            type: 'varchar',
            length: '200',
            isNullable: false
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            isNullable: false
          },
          {
            name: 'groupName',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'order',
            type: 'integer',
            default: 0,
            isNullable: false
          },
          {
            name: 'required',
            type: 'boolean',
            default: false,
            isNullable: false
          },
          {
            name: 'config',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'conditional',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false
          }
        ],
        foreignKeys: [
          {
            columnNames: ['postTypeId'],
            referencedTableName: 'custom_post_types',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

      await queryRunner.createIndex(
        'custom_fields',
        new TableIndex({
          name: 'IDX_custom_fields_post_type',
          columnNames: ['postTypeId']
        })
      );

      await queryRunner.createIndex(
        'custom_fields',
        new TableIndex({
          name: 'IDX_custom_fields_type',
          columnNames: ['type']
        })
      );

      await queryRunner.createIndex(
        'custom_fields',
        new TableIndex({
          name: 'IDX_custom_fields_group',
          columnNames: ['groupName']
        })
      );
    }

    // ========================================
    // 3. CREATE views TABLE
    // ========================================
    if (!viewsExists) {
      await queryRunner.createTable(
      new Table({
        name: 'views',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'schema',
            type: 'jsonb',
            isNullable: false
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'draft'",
            isNullable: false
          },
          {
            name: 'siteId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'createdBy',
            type: 'varchar',
            length: '255',
            isNullable: false
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false
          }
        ]
      }),
      true
    );

      await queryRunner.createIndex(
        'views',
        new TableIndex({
          name: 'IDX_views_slug',
          columnNames: ['slug'],
          isUnique: true
        })
      );

      await queryRunner.createIndex(
        'views',
        new TableIndex({
          name: 'IDX_views_status',
          columnNames: ['status']
        })
      );
    }

    // ========================================
    // 4. CREATE pages TABLE
    // ========================================
    if (!pagesExists) {
      await queryRunner.createTable(
      new Table({
        name: 'pages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false
          },
          {
            name: 'title',
            type: 'varchar',
            length: '200',
            isNullable: false
          },
          {
            name: 'content',
            type: 'jsonb',
            isNullable: false
          },
          {
            name: 'viewId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'seoTitle',
            type: 'varchar',
            length: '200',
            isNullable: true
          },
          {
            name: 'seoDescription',
            type: 'text',
            isNullable: true
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'draft'",
            isNullable: false
          },
          {
            name: 'publishedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'scheduledAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'versions',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'currentVersion',
            type: 'integer',
            default: 1,
            isNullable: false
          },
          {
            name: 'siteId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'createdBy',
            type: 'varchar',
            length: '255',
            isNullable: false
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false
          }
        ],
        foreignKeys: [
          {
            columnNames: ['viewId'],
            referencedTableName: 'views',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL'
          }
        ]
      }),
      true
    );

      await queryRunner.createIndex(
        'pages',
        new TableIndex({
          name: 'IDX_pages_slug',
          columnNames: ['slug'],
          isUnique: true
        })
      );

      await queryRunner.createIndex(
        'pages',
        new TableIndex({
          name: 'IDX_pages_status',
          columnNames: ['status']
        })
      );

      await queryRunner.createIndex(
        'pages',
        new TableIndex({
          name: 'IDX_pages_view',
          columnNames: ['viewId']
        })
      );

      await queryRunner.createIndex(
        'pages',
        new TableIndex({
          name: 'IDX_pages_published',
          columnNames: ['publishedAt']
        })
      );

      await queryRunner.createIndex(
        'pages',
        new TableIndex({
          name: 'IDX_pages_scheduled',
          columnNames: ['scheduledAt']
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order to handle foreign keys
    await queryRunner.dropTable('pages', true);
    await queryRunner.dropTable('views', true);
    await queryRunner.dropTable('custom_fields', true);
    await queryRunner.dropTable('custom_post_types', true);
  }
}

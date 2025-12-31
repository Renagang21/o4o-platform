import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreatePresetTables1762000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create form_presets table
    await queryRunner.createTable(
      new Table({
        name: 'form_presets',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()'
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'cpt_slug',
            type: 'varchar',
            length: '100',
            isNullable: false
          },
          {
            name: 'config',
            type: 'jsonb',
            isNullable: false
          },
          {
            name: 'version',
            type: 'int',
            default: 1
          },
          {
            name: 'roles',
            type: 'text',
            isNullable: true
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: true
          }
        ]
      }),
      true
    );

    // Create view_presets table
    await queryRunner.createTable(
      new Table({
        name: 'view_presets',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()'
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'cpt_slug',
            type: 'varchar',
            length: '100',
            isNullable: false
          },
          {
            name: 'config',
            type: 'jsonb',
            isNullable: false
          },
          {
            name: 'version',
            type: 'int',
            default: 1
          },
          {
            name: 'roles',
            type: 'text',
            isNullable: true
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: true
          }
        ]
      }),
      true
    );

    // Create template_presets table
    await queryRunner.createTable(
      new Table({
        name: 'template_presets',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()'
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'cpt_slug',
            type: 'varchar',
            length: '100',
            isNullable: false
          },
          {
            name: 'config',
            type: 'jsonb',
            isNullable: false
          },
          {
            name: 'version',
            type: 'int',
            default: 1
          },
          {
            name: 'roles',
            type: 'text',
            isNullable: true
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: true
          }
        ]
      }),
      true
    );

    // Create indexes for form_presets
    await queryRunner.createIndex(
      'form_presets',
      new TableIndex({
        name: 'IDX_FORM_PRESETS_CPT_SLUG',
        columnNames: ['cpt_slug']
      })
    );

    await queryRunner.createIndex(
      'form_presets',
      new TableIndex({
        name: 'IDX_FORM_PRESETS_IS_ACTIVE',
        columnNames: ['is_active']
      })
    );

    await queryRunner.createIndex(
      'form_presets',
      new TableIndex({
        name: 'IDX_FORM_PRESETS_VERSION',
        columnNames: ['version']
      })
    );

    // Create indexes for view_presets
    await queryRunner.createIndex(
      'view_presets',
      new TableIndex({
        name: 'IDX_VIEW_PRESETS_CPT_SLUG',
        columnNames: ['cpt_slug']
      })
    );

    await queryRunner.createIndex(
      'view_presets',
      new TableIndex({
        name: 'IDX_VIEW_PRESETS_IS_ACTIVE',
        columnNames: ['is_active']
      })
    );

    await queryRunner.createIndex(
      'view_presets',
      new TableIndex({
        name: 'IDX_VIEW_PRESETS_VERSION',
        columnNames: ['version']
      })
    );

    // Create indexes for template_presets
    await queryRunner.createIndex(
      'template_presets',
      new TableIndex({
        name: 'IDX_TEMPLATE_PRESETS_CPT_SLUG',
        columnNames: ['cpt_slug']
      })
    );

    await queryRunner.createIndex(
      'template_presets',
      new TableIndex({
        name: 'IDX_TEMPLATE_PRESETS_IS_ACTIVE',
        columnNames: ['is_active']
      })
    );

    await queryRunner.createIndex(
      'template_presets',
      new TableIndex({
        name: 'IDX_TEMPLATE_PRESETS_VERSION',
        columnNames: ['version']
      })
    );

    // Create foreign keys (CASCADE DELETE)
    await queryRunner.createForeignKey(
      'form_presets',
      new TableForeignKey({
        name: 'FK_FORM_PRESETS_CPT',
        columnNames: ['cpt_slug'],
        referencedTableName: 'custom_post_types',
        referencedColumnNames: ['slug'],
        onDelete: 'CASCADE'
      })
    );

    await queryRunner.createForeignKey(
      'view_presets',
      new TableForeignKey({
        name: 'FK_VIEW_PRESETS_CPT',
        columnNames: ['cpt_slug'],
        referencedTableName: 'custom_post_types',
        referencedColumnNames: ['slug'],
        onDelete: 'CASCADE'
      })
    );

    await queryRunner.createForeignKey(
      'template_presets',
      new TableForeignKey({
        name: 'FK_TEMPLATE_PRESETS_CPT',
        columnNames: ['cpt_slug'],
        referencedTableName: 'custom_post_types',
        referencedColumnNames: ['slug'],
        onDelete: 'CASCADE'
      })
    );

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    await queryRunner.dropForeignKey('form_presets', 'FK_FORM_PRESETS_CPT');
    await queryRunner.dropForeignKey('view_presets', 'FK_VIEW_PRESETS_CPT');
    await queryRunner.dropForeignKey('template_presets', 'FK_TEMPLATE_PRESETS_CPT');

    // Drop indexes
    await queryRunner.dropIndex('form_presets', 'IDX_FORM_PRESETS_CPT_SLUG');
    await queryRunner.dropIndex('form_presets', 'IDX_FORM_PRESETS_IS_ACTIVE');
    await queryRunner.dropIndex('form_presets', 'IDX_FORM_PRESETS_VERSION');

    await queryRunner.dropIndex('view_presets', 'IDX_VIEW_PRESETS_CPT_SLUG');
    await queryRunner.dropIndex('view_presets', 'IDX_VIEW_PRESETS_IS_ACTIVE');
    await queryRunner.dropIndex('view_presets', 'IDX_VIEW_PRESETS_VERSION');

    await queryRunner.dropIndex('template_presets', 'IDX_TEMPLATE_PRESETS_CPT_SLUG');
    await queryRunner.dropIndex('template_presets', 'IDX_TEMPLATE_PRESETS_IS_ACTIVE');
    await queryRunner.dropIndex('template_presets', 'IDX_TEMPLATE_PRESETS_VERSION');

    // Drop tables
    await queryRunner.dropTable('form_presets');
    await queryRunner.dropTable('view_presets');
    await queryRunner.dropTable('template_presets');

  }
}

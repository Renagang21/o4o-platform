import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateACFAndShortcodeTables1745000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create custom_field_groups table
    await queryRunner.createTable(
      new Table({
        name: 'custom_field_groups',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255'
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'location',
            type: 'json',
            default: "'[]'"
          },
          {
            name: 'rules',
            type: 'json',
            isNullable: true
          },
          {
            name: 'options',
            type: 'json',
            isNullable: true
          },
          {
            name: 'active',
            type: 'boolean',
            default: true
          },
          {
            name: 'order',
            type: 'int',
            default: 0
          },
          {
            name: 'placement',
            type: 'enum',
            enum: ['normal', 'high', 'side'],
            default: "'normal'"
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create custom_fields table
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
            name: 'name',
            type: 'varchar',
            length: '255'
          },
          {
            name: 'label',
            type: 'varchar',
            length: '255'
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'text', 'textarea', 'number', 'email', 'url', 'password',
              'select', 'checkbox', 'radio', 'toggle',
              'date', 'datetime_local', 'time',
              'image', 'file', 'gallery',
              'wysiwyg', 'code',
              'color', 'range',
              'repeater', 'group',
              'taxonomy', 'post_object', 'page_link', 'user'
            ]
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'required',
            type: 'boolean',
            default: false
          },
          {
            name: 'defaultValue',
            type: 'text',
            isNullable: true
          },
          {
            name: 'placeholder',
            type: 'text',
            isNullable: true
          },
          {
            name: 'validation',
            type: 'json',
            isNullable: true
          },
          {
            name: 'conditionalLogic',
            type: 'json',
            isNullable: true
          },
          {
            name: 'options',
            type: 'json',
            isNullable: true
          },
          {
            name: 'min',
            type: 'int',
            isNullable: true
          },
          {
            name: 'max',
            type: 'int',
            isNullable: true
          },
          {
            name: 'step',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'maxLength',
            type: 'int',
            isNullable: true
          },
          {
            name: 'minLength',
            type: 'int',
            isNullable: true
          },
          {
            name: 'pattern',
            type: 'text',
            isNullable: true
          },
          {
            name: 'multiple',
            type: 'boolean',
            default: false
          },
          {
            name: 'order',
            type: 'int',
            default: 0
          },
          {
            name: 'groupId',
            type: 'uuid'
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          }
        ],
        foreignKeys: [
          {
            name: 'FK_custom_fields_group',
            columnNames: ['groupId'],
            referencedTableName: 'custom_field_groups',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

    // Create custom_field_values table
    await queryRunner.createTable(
      new Table({
        name: 'custom_field_values',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'fieldId',
            type: 'uuid'
          },
          {
            name: 'entityId',
            type: 'uuid'
          },
          {
            name: 'entityType',
            type: 'varchar',
            length: '50'
          },
          {
            name: 'value',
            type: 'json'
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          }
        ],
        foreignKeys: [
          {
            name: 'FK_custom_field_values_field',
            columnNames: ['fieldId'],
            referencedTableName: 'custom_fields',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

    // Create shortcodes table
    await queryRunner.createTable(
      new Table({
        name: 'shortcodes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'appId',
            type: 'varchar',
            length: '100'
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isUnique: true
          },
          {
            name: 'displayName',
            type: 'varchar',
            length: '255'
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'category',
            type: 'enum',
            enum: ['content', 'media', 'social', 'ecommerce', 'form', 'layout', 'widget', 'utility'],
            default: "'utility'"
          },
          {
            name: 'icon',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'attributes',
            type: 'json',
            isNullable: true
          },
          {
            name: 'examples',
            type: 'json',
            isNullable: true
          },
          {
            name: 'defaultContent',
            type: 'text',
            isNullable: true
          },
          {
            name: 'selfClosing',
            type: 'boolean',
            default: false
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'deprecated'],
            default: "'active'"
          },
          {
            name: 'version',
            type: 'varchar',
            length: '20',
            isNullable: true
          },
          {
            name: 'documentation',
            type: 'text',
            isNullable: true
          },
          {
            name: 'tags',
            type: 'json',
            isNullable: true
          },
          {
            name: 'usageCount',
            type: 'int',
            default: 0
          },
          {
            name: 'isVisible',
            type: 'boolean',
            default: true
          },
          {
            name: 'renderFunction',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'permissions',
            type: 'json',
            isNullable: true
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create custom_post_types table (for CPT)
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
            name: 'name',
            type: 'varchar',
            length: '255'
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '100',
            isUnique: true
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'icon',
            type: 'varchar',
            length: '50',
            default: "'file'"
          },
          {
            name: 'public',
            type: 'boolean',
            default: true
          },
          {
            name: 'has_archive',
            type: 'boolean',
            default: true
          },
          {
            name: 'show_in_menu',
            type: 'boolean',
            default: true
          },
          {
            name: 'supports',
            type: 'json',
            default: "'[\"title\", \"editor\"]'"
          },
          {
            name: 'taxonomies',
            type: 'json',
            default: "'[]'"
          },
          {
            name: 'labels',
            type: 'json',
            isNullable: true
          },
          {
            name: 'menu_position',
            type: 'int',
            isNullable: true
          },
          {
            name: 'capability_type',
            type: 'varchar',
            length: '50',
            default: "'post'"
          },
          {
            name: 'rewrite',
            type: 'json',
            isNullable: true
          },
          {
            name: 'active',
            type: 'boolean',
            default: true
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex('shortcodes', new TableIndex({
      name: 'IDX_shortcodes_appId_status',
      columnNames: ['appId', 'status']
    });

    await queryRunner.createIndex('shortcodes', new TableIndex({
      name: 'IDX_shortcodes_category_status',
      columnNames: ['category', 'status']
    });

    await queryRunner.createIndex('shortcodes', new TableIndex({
      name: 'IDX_shortcodes_name',
      columnNames: ['name']
    });

    await queryRunner.createIndex('custom_field_values', new TableIndex({
      name: 'IDX_custom_field_values_entity',
      columnNames: ['entityType', 'entityId']
    });

    await queryRunner.createIndex('custom_post_types', new TableIndex({
      name: 'IDX_custom_post_types_slug',
      columnNames: ['slug']
    });

    await queryRunner.createIndex('custom_post_types', new TableIndex({
      name: 'IDX_custom_post_types_active',
      columnNames: ['active']
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('custom_post_types', 'IDX_custom_post_types_active');
    await queryRunner.dropIndex('custom_post_types', 'IDX_custom_post_types_slug');
    await queryRunner.dropIndex('custom_field_values', 'IDX_custom_field_values_entity');
    await queryRunner.dropIndex('shortcodes', 'IDX_shortcodes_name');
    await queryRunner.dropIndex('shortcodes', 'IDX_shortcodes_category_status');
    await queryRunner.dropIndex('shortcodes', 'IDX_shortcodes_appId_status');

    // Drop tables
    await queryRunner.dropTable('custom_post_types');
    await queryRunner.dropTable('shortcodes');
    await queryRunner.dropTable('custom_field_values');
    await queryRunner.dropTable('custom_fields');
    await queryRunner.dropTable('custom_field_groups');
  }
}
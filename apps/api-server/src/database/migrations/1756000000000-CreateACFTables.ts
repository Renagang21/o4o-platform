import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateACFTables1756000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ACF Field Groups table
    await queryRunner.createTable(
      new Table({
        name: 'acf_field_groups',
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
            name: 'key',
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
            name: 'location',
            type: 'json'
          },
          {
            name: 'position',
            type: 'enum',
            enum: ['normal', 'side', 'acf_after_title'],
            default: "'normal'"
          },
          {
            name: 'style',
            type: 'enum',
            enum: ['default', 'seamless'],
            default: "'default'"
          },
          {
            name: 'labelPlacement',
            type: 'enum',
            enum: ['top', 'left'],
            default: "'top'"
          },
          {
            name: 'hideOnScreen',
            type: 'text',
            isNullable: true
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true
          },
          {
            name: 'menuOrder',
            type: 'int',
            default: 0
          },
          {
            name: 'instructionPlacement',
            type: 'boolean',
            default: false
          },
          {
            name: 'wpPostType',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'wpMeta',
            type: 'json',
            isNullable: true
          },
          {
            name: 'version',
            type: 'int',
            default: 1
          },
          {
            name: 'changelog',
            type: 'json',
            isNullable: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'createdBy',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'updatedBy',
            type: 'uuid',
            isNullable: true
          }
        ]
      }),
      true
    );

    // Create indexes for field groups
    await queryRunner.createIndex('acf_field_groups', new TableIndex({
      name: 'IDX_acf_field_groups_key',
      columnNames: ['key'],
      isUnique: true
    }));

    await queryRunner.createIndex('acf_field_groups', new TableIndex({
      name: 'IDX_acf_field_groups_is_active',
      columnNames: ['isActive']
    }));

    await queryRunner.createIndex('acf_field_groups', new TableIndex({
      name: 'IDX_acf_field_groups_menu_order',
      columnNames: ['menuOrder']
    }));

    // Create ACF Fields table
    await queryRunner.createTable(
      new Table({
        name: 'acf_fields',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'fieldGroupId',
            type: 'uuid'
          },
          {
            name: 'label',
            type: 'varchar',
            length: '255'
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100'
          },
          {
            name: 'key',
            type: 'varchar',
            length: '100',
            isUnique: true
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'text', 'textarea', 'number', 'email', 'url', 'password',
              'wysiwyg', 'oembed', 'image', 'file', 'gallery',
              'select', 'checkbox', 'radio', 'true_false', 'button_group',
              'post_object', 'page_link', 'relationship', 'taxonomy', 'user',
              'color_picker', 'date_picker', 'date_time_picker', 'time_picker', 'google_map',
              'tab', 'group', 'repeater', 'flexible_content', 'clone', 'message', 'accordion'
            ]
          },
          {
            name: 'instructions',
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
            name: 'prependText',
            type: 'text',
            isNullable: true
          },
          {
            name: 'appendText',
            type: 'text',
            isNullable: true
          },
          {
            name: 'choices',
            type: 'json',
            isNullable: true
          },
          {
            name: 'allowNull',
            type: 'boolean',
            default: false,
            isNullable: true
          },
          {
            name: 'multiple',
            type: 'boolean',
            default: false,
            isNullable: true
          },
          {
            name: 'allowCustom',
            type: 'boolean',
            default: false,
            isNullable: true
          },
          {
            name: 'layout',
            type: 'varchar',
            length: '50',
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
            type: 'float',
            isNullable: true
          },
          {
            name: 'minLength',
            type: 'int',
            isNullable: true
          },
          {
            name: 'maxLength',
            type: 'int',
            isNullable: true
          },
          {
            name: 'rows',
            type: 'int',
            isNullable: true
          },
          {
            name: 'newLines',
            type: 'boolean',
            default: false,
            isNullable: true
          },
          {
            name: 'returnFormat',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'previewSize',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'library',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'minWidth',
            type: 'int',
            isNullable: true
          },
          {
            name: 'minHeight',
            type: 'int',
            isNullable: true
          },
          {
            name: 'maxWidth',
            type: 'int',
            isNullable: true
          },
          {
            name: 'maxHeight',
            type: 'int',
            isNullable: true
          },
          {
            name: 'minSize',
            type: 'int',
            isNullable: true
          },
          {
            name: 'maxSize',
            type: 'int',
            isNullable: true
          },
          {
            name: 'mimeTypes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'tabs',
            type: 'boolean',
            default: true,
            isNullable: true
          },
          {
            name: 'toolbar',
            type: 'varchar',
            length: '50',
            default: "'all'",
            isNullable: true
          },
          {
            name: 'mediaUpload',
            type: 'boolean',
            default: false,
            isNullable: true
          },
          {
            name: 'displayFormat',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'returnDateFormat',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'firstDay',
            type: 'int',
            isNullable: true
          },
          {
            name: 'postTypes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'taxonomies',
            type: 'text',
            isNullable: true
          },
          {
            name: 'filters',
            type: 'json',
            isNullable: true
          },
          {
            name: 'minPosts',
            type: 'int',
            isNullable: true
          },
          {
            name: 'maxPosts',
            type: 'int',
            isNullable: true
          },
          {
            name: 'subFields',
            type: 'json',
            isNullable: true
          },
          {
            name: 'buttonLabel',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'minRows',
            type: 'int',
            isNullable: true
          },
          {
            name: 'maxRows',
            type: 'int',
            isNullable: true
          },
          {
            name: 'repeaterLayout',
            type: 'varchar',
            length: '50',
            default: "'table'",
            isNullable: true
          },
          {
            name: 'layouts',
            type: 'json',
            isNullable: true
          },
          {
            name: 'cloneFields',
            type: 'text',
            isNullable: true
          },
          {
            name: 'cloneDisplay',
            type: 'varchar',
            length: '50',
            default: "'seamless'",
            isNullable: true
          },
          {
            name: 'prefixLabel',
            type: 'boolean',
            default: false,
            isNullable: true
          },
          {
            name: 'prefixName',
            type: 'boolean',
            default: false,
            isNullable: true
          },
          {
            name: 'conditionalLogic',
            type: 'json',
            isNullable: true
          },
          {
            name: 'validation',
            type: 'json',
            isNullable: true
          },
          {
            name: 'appearance',
            type: 'json',
            isNullable: true
          },
          {
            name: 'order',
            type: 'int',
            default: 0
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          }
        ],
        foreignKeys: [
          {
            columnNames: ['fieldGroupId'],
            referencedTableName: 'acf_field_groups',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

    // Create indexes for fields
    await queryRunner.createIndex('acf_fields', new TableIndex({
      name: 'IDX_acf_fields_field_group_id_order',
      columnNames: ['fieldGroupId', 'order']
    }));

    await queryRunner.createIndex('acf_fields', new TableIndex({
      name: 'IDX_acf_fields_key',
      columnNames: ['key'],
      isUnique: true
    }));

    await queryRunner.createIndex('acf_fields', new TableIndex({
      name: 'IDX_acf_fields_name',
      columnNames: ['name']
    }));

    await queryRunner.createIndex('acf_fields', new TableIndex({
      name: 'IDX_acf_fields_type',
      columnNames: ['type']
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('acf_fields', 'IDX_acf_fields_type');
    await queryRunner.dropIndex('acf_fields', 'IDX_acf_fields_name');
    await queryRunner.dropIndex('acf_fields', 'IDX_acf_fields_key');
    await queryRunner.dropIndex('acf_fields', 'IDX_acf_fields_field_group_id_order');

    await queryRunner.dropIndex('acf_field_groups', 'IDX_acf_field_groups_menu_order');
    await queryRunner.dropIndex('acf_field_groups', 'IDX_acf_field_groups_is_active');
    await queryRunner.dropIndex('acf_field_groups', 'IDX_acf_field_groups_key');

    // Drop tables
    await queryRunner.dropTable('acf_fields');
    await queryRunner.dropTable('acf_field_groups');
  }
}
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateTemplateParts1738000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create template_parts table
    await queryRunner.createTable(
      new Table({
        name: 'template_parts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()'
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255'
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '255',
            isUnique: true
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'area',
            type: 'enum',
            enum: ['header', 'footer', 'sidebar', 'general'],
            default: "'general'"
          },
          {
            name: 'content',
            type: 'json'
          },
          {
            name: 'settings',
            type: 'json',
            isNullable: true
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true
          },
          {
            name: 'isDefault',
            type: 'boolean',
            default: false
          },
          {
            name: 'authorId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'priority',
            type: 'integer',
            default: 0
          },
          {
            name: 'tags',
            type: 'text',
            isNullable: true
          },
          {
            name: 'conditions',
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
        ],
        foreignKeys: [
          {
            columnNames: ['authorId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL'
          }
        ]
      }),
      true
    )

    // Create indexes
    await queryRunner.createIndex(
      'template_parts',
      new TableIndex({
        name: 'IDX_template_parts_area_isActive',
        columnNames: ['area', 'isActive']
      })
    )

    await queryRunner.createIndex(
      'template_parts',
      new TableIndex({
        name: 'IDX_template_parts_slug',
        columnNames: ['slug']
      })
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('template_parts')
  }
}
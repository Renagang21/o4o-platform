import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateCategoriesTable1760000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'categories',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'slug',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'image',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'sortOrder',
            type: 'int',
            default: 0,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'metaTitle',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'metaDescription',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'count',
            type: 'int',
            default: 0,
          },
          // Nested set columns for tree structure
          {
            name: 'nsleft',
            type: 'int',
            default: 1,
          },
          {
            name: 'nsright',
            type: 'int',
            default: 2,
          },
          {
            name: 'parentId',
            type: 'uuid',
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
      true
    );

    // Create indexes
    await queryRunner.createIndex('categories', {
      name: 'IDX_CATEGORY_SLUG',
      columnNames: ['slug'],
    } as any);

    await queryRunner.createIndex('categories', {
      name: 'IDX_CATEGORY_PARENT',
      columnNames: ['parentId'],
    } as any);

    await queryRunner.createIndex('categories', {
      name: 'IDX_CATEGORY_NESTED_SET',
      columnNames: ['nsleft', 'nsright'],
    } as any);

    // Add foreign key for parent
    await queryRunner.query(`
      ALTER TABLE categories 
      ADD CONSTRAINT FK_CATEGORY_PARENT 
      FOREIGN KEY (parentId) 
      REFERENCES categories(id) 
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('categories');
  }
}
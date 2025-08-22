import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePostCategoriesTable1741000000000 implements MigrationInterface {
  name = 'CreatePostCategoriesTable1741000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create categories table
    await queryRunner.createTable(
      new Table({
        name: 'categories',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'parentId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'count',
            type: 'int',
            default: 0,
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
        foreignKeys: [
          {
            columnNames: ['parentId'],
            referencedTableName: 'categories',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true
    );

    // Create post_categories junction table
    await queryRunner.createTable(
      new Table({
        name: 'post_categories',
        columns: [
          {
            name: 'postId',
            type: 'uuid',
          },
          {
            name: 'categoryId',
            type: 'uuid',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['postId'],
            referencedTableName: 'posts',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['categoryId'],
            referencedTableName: 'categories',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );

    // Create indexes using SQL
    await queryRunner.query(`CREATE INDEX "IDX_CATEGORY_SLUG" ON "categories" ("slug")`);
    await queryRunner.query(`CREATE INDEX "IDX_CATEGORY_PARENT" ON "categories" ("parentId")`);
    await queryRunner.query(`CREATE INDEX "IDX_POST_CATEGORIES_POST" ON "post_categories" ("postId")`);
    await queryRunner.query(`CREATE INDEX "IDX_POST_CATEGORIES_CATEGORY" ON "post_categories" ("categoryId")`);

    // Create composite primary key for post_categories
    await queryRunner.query(
      `ALTER TABLE "post_categories" ADD CONSTRAINT "PK_POST_CATEGORIES" PRIMARY KEY ("postId", "categoryId")`
    );

    // Insert default categories
    await queryRunner.query(`
      INSERT INTO categories (name, slug, description) VALUES
      ('Uncategorized', 'uncategorized', 'Default category for posts'),
      ('News', 'news', 'News and announcements'),
      ('Tutorials', 'tutorials', 'How-to guides and tutorials'),
      ('Updates', 'updates', 'Product and service updates')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_POST_CATEGORIES_CATEGORY"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_POST_CATEGORIES_POST"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_CATEGORY_PARENT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_CATEGORY_SLUG"`);

    // Drop tables
    await queryRunner.dropTable('post_categories');
    await queryRunner.dropTable('categories');
  }
}
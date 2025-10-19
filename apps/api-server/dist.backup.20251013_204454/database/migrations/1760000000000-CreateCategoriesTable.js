"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCategoriesTable1760000000000 = void 0;
const typeorm_1 = require("typeorm");
class CreateCategoriesTable1760000000000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
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
        }), true);
        // Create indexes
        await queryRunner.createIndex('categories', {
            name: 'IDX_CATEGORY_SLUG',
            columnNames: ['slug'],
        });
        await queryRunner.createIndex('categories', {
            name: 'IDX_CATEGORY_PARENT',
            columnNames: ['parentId'],
        });
        await queryRunner.createIndex('categories', {
            name: 'IDX_CATEGORY_NESTED_SET',
            columnNames: ['nsleft', 'nsright'],
        });
        // Add foreign key for parent
        await queryRunner.query(`
      ALTER TABLE categories 
      ADD CONSTRAINT FK_CATEGORY_PARENT 
      FOREIGN KEY (parentId) 
      REFERENCES categories(id) 
      ON DELETE CASCADE
    `);
    }
    async down(queryRunner) {
        await queryRunner.dropTable('categories');
    }
}
exports.CreateCategoriesTable1760000000000 = CreateCategoriesTable1760000000000;
//# sourceMappingURL=1760000000000-CreateCategoriesTable.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCustomPostTypeTables1759103000000 = void 0;
const typeorm_1 = require("typeorm");
class CreateCustomPostTypeTables1759103000000 {
    async up(queryRunner) {
        // Create custom_post_types table
        await queryRunner.createTable(new typeorm_1.Table({
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
                    isUnique: true
                },
                {
                    name: 'name',
                    type: 'varchar',
                    length: '255'
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
                    isNullable: true
                },
                {
                    name: 'active',
                    type: 'boolean',
                    default: true
                },
                {
                    name: 'public',
                    type: 'boolean',
                    default: true
                },
                {
                    name: 'has_archive',
                    type: 'boolean',
                    default: false
                },
                {
                    name: 'show_in_menu',
                    type: 'boolean',
                    default: true
                },
                {
                    name: 'supports',
                    type: 'jsonb',
                    isNullable: true,
                    default: "'[\"title\", \"editor\", \"thumbnail\"]'"
                },
                {
                    name: 'taxonomies',
                    type: 'jsonb',
                    isNullable: true,
                    default: "'[]'"
                },
                {
                    name: 'labels',
                    type: 'jsonb',
                    isNullable: true
                },
                {
                    name: 'menu_position',
                    type: 'int',
                    isNullable: true,
                    default: 20
                },
                {
                    name: 'capability_type',
                    type: 'varchar',
                    length: '50',
                    default: "'post'"
                },
                {
                    name: 'rewrite',
                    type: 'jsonb',
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
        }), true);
        // Create indexes
        await queryRunner.query(`CREATE INDEX "IDX_CPT_SLUG" ON "custom_post_types" ("slug")`);
        await queryRunner.query(`CREATE INDEX "IDX_CPT_ACTIVE" ON "custom_post_types" ("active")`);
        // Create custom_posts table if not exists
        const hasCustomPostsTable = await queryRunner.hasTable('custom_posts');
        if (!hasCustomPostsTable) {
            await queryRunner.createTable(new typeorm_1.Table({
                name: 'custom_posts',
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
                        type: 'uuid'
                    },
                    {
                        name: 'slug',
                        type: 'varchar',
                        length: '255',
                        isUnique: true
                    },
                    {
                        name: 'title',
                        type: 'varchar',
                        length: '500'
                    },
                    {
                        name: 'content',
                        type: 'text',
                        isNullable: true
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['draft', 'published', 'archived'],
                        default: "'draft'"
                    },
                    {
                        name: 'authorId',
                        type: 'uuid',
                        isNullable: true
                    },
                    {
                        name: 'featuredImage',
                        type: 'varchar',
                        length: '500',
                        isNullable: true
                    },
                    {
                        name: 'customFields',
                        type: 'jsonb',
                        isNullable: true,
                        default: "'{}'"
                    },
                    {
                        name: 'metaTitle',
                        type: 'varchar',
                        length: '255',
                        isNullable: true
                    },
                    {
                        name: 'metaDescription',
                        type: 'text',
                        isNullable: true
                    },
                    {
                        name: 'metaKeywords',
                        type: 'text',
                        isNullable: true
                    },
                    {
                        name: 'publishedAt',
                        type: 'timestamp',
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
                        columnNames: ['postTypeId'],
                        referencedTableName: 'custom_post_types',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE'
                    }
                ]
            }), true);
            // Create indexes for custom_posts
            await queryRunner.query(`CREATE INDEX "IDX_CUSTOM_POST_SLUG" ON "custom_posts" ("slug")`);
            await queryRunner.query(`CREATE INDEX "IDX_CUSTOM_POST_TYPE" ON "custom_posts" ("postTypeId")`);
            await queryRunner.query(`CREATE INDEX "IDX_CUSTOM_POST_STATUS" ON "custom_posts" ("status")`);
        }
        // Note: Dropshipping CPTs are handled by 1758897000000-InitializeDropshippingCPTs migration
        // This section is left empty to avoid duplication
    }
    async down(queryRunner) {
        // Drop custom_posts table and its indexes
        const hasCustomPostsTable = await queryRunner.hasTable('custom_posts');
        if (hasCustomPostsTable) {
            await queryRunner.dropTable('custom_posts');
        }
        // Drop custom_post_types table and its indexes
        await queryRunner.dropTable('custom_post_types');
    }
}
exports.CreateCustomPostTypeTables1759103000000 = CreateCustomPostTypeTables1759103000000;
//# sourceMappingURL=1759103000000-CreateCustomPostTypeTables.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCMSEntities1740000000000 = void 0;
const typeorm_1 = require("typeorm");
class CreateCMSEntities1740000000000 {
    constructor() {
        this.name = 'CreateCMSEntities1740000000000';
    }
    async up(queryRunner) {
        // Create post_tags table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'post_tags',
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
                    length: '100',
                    isUnique: true
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
                    name: 'color',
                    type: 'varchar',
                    length: '7',
                    isNullable: true,
                    comment: 'Hex color for tag display'
                },
                {
                    name: 'usageCount',
                    type: 'int',
                    default: 0,
                    comment: 'Number of posts using this tag'
                },
                {
                    name: 'isActive',
                    type: 'boolean',
                    default: true
                },
                {
                    name: 'metaTitle',
                    type: 'varchar',
                    length: '255',
                    isNullable: true,
                    comment: 'SEO title for tag pages'
                },
                {
                    name: 'metaDescription',
                    type: 'text',
                    isNullable: true,
                    comment: 'SEO description for tag pages'
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
                }
            ]
        }), true);
        // Create post_revisions table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'post_revisions',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'gen_random_uuid()'
                },
                {
                    name: 'postId',
                    type: 'uuid'
                },
                {
                    name: 'revisionNumber',
                    type: 'int'
                },
                {
                    name: 'author_id',
                    type: 'uuid'
                },
                {
                    name: 'revisionType',
                    type: 'varchar',
                    length: '50',
                    enum: ['manual', 'autosave', 'publish', 'restore']
                },
                {
                    name: 'title',
                    type: 'varchar',
                    length: '255'
                },
                {
                    name: 'content',
                    type: 'jsonb'
                },
                {
                    name: 'excerpt',
                    type: 'text',
                    isNullable: true
                },
                {
                    name: 'status',
                    type: 'varchar',
                    length: '50'
                },
                {
                    name: 'seo',
                    type: 'jsonb',
                    isNullable: true
                },
                {
                    name: 'customFields',
                    type: 'jsonb',
                    isNullable: true
                },
                {
                    name: 'tags',
                    type: 'simple-array',
                    isNullable: true
                },
                {
                    name: 'postMeta',
                    type: 'jsonb',
                    isNullable: true
                },
                {
                    name: 'changes',
                    type: 'jsonb',
                    isNullable: true,
                    comment: 'Change tracking between revisions'
                },
                {
                    name: 'changeDescription',
                    type: 'text',
                    isNullable: true,
                    comment: 'User-provided description of changes'
                },
                {
                    name: 'isRestorePoint',
                    type: 'boolean',
                    default: false,
                    comment: 'Mark important revisions'
                },
                {
                    name: 'wordCount',
                    type: 'int',
                    isNullable: true
                },
                {
                    name: 'ipAddress',
                    type: 'varchar',
                    length: '45',
                    isNullable: true
                },
                {
                    name: 'userAgent',
                    type: 'text',
                    isNullable: true
                },
                {
                    name: 'created_at',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP'
                }
            ]
        }), true);
        // Create page_revisions table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'page_revisions',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'gen_random_uuid()'
                },
                {
                    name: 'pageId',
                    type: 'uuid'
                },
                {
                    name: 'revisionNumber',
                    type: 'int'
                },
                {
                    name: 'author_id',
                    type: 'uuid'
                },
                {
                    name: 'revisionType',
                    type: 'varchar',
                    length: '50',
                    enum: ['manual', 'autosave', 'publish', 'restore']
                },
                {
                    name: 'title',
                    type: 'varchar',
                    length: '255'
                },
                {
                    name: 'content',
                    type: 'jsonb'
                },
                {
                    name: 'excerpt',
                    type: 'text',
                    isNullable: true
                },
                {
                    name: 'status',
                    type: 'varchar',
                    length: '50'
                },
                {
                    name: 'parentId',
                    type: 'uuid',
                    isNullable: true
                },
                {
                    name: 'menuOrder',
                    type: 'int',
                    default: 0
                },
                {
                    name: 'showInMenu',
                    type: 'boolean',
                    default: true
                },
                {
                    name: 'template',
                    type: 'varchar',
                    length: '100',
                    isNullable: true
                },
                {
                    name: 'seo',
                    type: 'jsonb',
                    isNullable: true
                },
                {
                    name: 'customFields',
                    type: 'jsonb',
                    isNullable: true
                },
                {
                    name: 'changes',
                    type: 'jsonb',
                    isNullable: true,
                    comment: 'Change tracking between revisions'
                },
                {
                    name: 'changeDescription',
                    type: 'text',
                    isNullable: true,
                    comment: 'User-provided description of changes'
                },
                {
                    name: 'isRestorePoint',
                    type: 'boolean',
                    default: false,
                    comment: 'Mark important revisions'
                },
                {
                    name: 'ipAddress',
                    type: 'varchar',
                    length: '45',
                    isNullable: true
                },
                {
                    name: 'userAgent',
                    type: 'text',
                    isNullable: true
                },
                {
                    name: 'created_at',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP'
                }
            ]
        }), true);
        // Create post_tag_relationships table (Many-to-Many)
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'post_tag_relationships',
            columns: [
                {
                    name: 'postId',
                    type: 'uuid',
                    isPrimary: true
                },
                {
                    name: 'tagId',
                    type: 'uuid',
                    isPrimary: true
                }
            ]
        }), true);
        // Update existing posts table to support new tag relationships
        // Check if posts table exists and add/modify columns if needed
        const postsTable = await queryRunner.getTable('posts');
        if (postsTable) {
            // Remove the old simple-array tags column if it exists
            const tagsColumn = postsTable.columns.find(column => column.name === 'tags');
            if (tagsColumn && tagsColumn.type === 'simple-array') {
                await queryRunner.dropColumn('posts', 'tags');
            }
            // Add missing columns if they don't exist
            const columnsToAdd = [
                {
                    name: 'type',
                    type: 'varchar',
                    length: '50',
                    default: "'post'",
                    comment: 'Post type field for supporting custom post types'
                },
                {
                    name: 'format',
                    type: 'varchar',
                    length: '50',
                    default: "'standard'",
                    comment: 'Post format (WordPress-style)'
                },
                {
                    name: 'readingTime',
                    type: 'int',
                    isNullable: true,
                    comment: 'Estimated reading time in minutes'
                }
            ];
            for (const columnDef of columnsToAdd) {
                const existingColumn = postsTable.columns.find(col => col.name === columnDef.name);
                if (!existingColumn) {
                    await queryRunner.addColumn('posts', new typeorm_1.TableColumn({
                        name: columnDef.name,
                        type: columnDef.type,
                        length: columnDef.length,
                        default: columnDef.default,
                        isNullable: columnDef.isNullable || false,
                        comment: columnDef.comment
                    }));
                }
            }
        }
        // Create indexes for better performance
        await queryRunner.createIndex('post_tags', {
            name: 'IDX_post_tags_name',
            columnNames: ['name']
        });
        await queryRunner.createIndex('post_tags', {
            name: 'IDX_post_tags_slug',
            columnNames: ['slug']
        });
        await queryRunner.createIndex('post_revisions', {
            name: 'IDX_post_revisions_post_created',
            columnNames: ['postId', 'created_at']
        });
        await queryRunner.createIndex('post_revisions', {
            name: 'IDX_post_revisions_post_revision',
            columnNames: ['postId', 'revisionNumber']
        });
        await queryRunner.createIndex('post_revisions', {
            name: 'IDX_post_revisions_author',
            columnNames: ['author_id']
        });
        await queryRunner.createIndex('page_revisions', {
            name: 'IDX_page_revisions_page_created',
            columnNames: ['pageId', 'created_at']
        });
        await queryRunner.createIndex('page_revisions', {
            name: 'IDX_page_revisions_page_revision',
            columnNames: ['pageId', 'revisionNumber']
        });
        await queryRunner.createIndex('page_revisions', {
            name: 'IDX_page_revisions_author',
            columnNames: ['author_id']
        });
        await queryRunner.createIndex('media', {
            name: 'IDX_media_user',
            columnNames: ['userId']
        });
        await queryRunner.createIndex('media', {
            name: 'IDX_media_folder',
            columnNames: ['folderPath']
        });
        await queryRunner.createIndex('media', {
            name: 'IDX_media_created',
            columnNames: ['created_at']
        });
        // Create foreign keys
        await queryRunner.createForeignKey('post_revisions', {
            columnNames: ['postId'],
            referencedTableName: 'posts',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
        });
        await queryRunner.createForeignKey('post_revisions', {
            columnNames: ['author_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT'
        });
        await queryRunner.createForeignKey('page_revisions', {
            columnNames: ['pageId'],
            referencedTableName: 'pages',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
        });
        await queryRunner.createForeignKey('page_revisions', {
            columnNames: ['author_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT'
        });
        await queryRunner.createForeignKey('post_tag_relationships', {
            columnNames: ['postId'],
            referencedTableName: 'posts',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
        });
        await queryRunner.createForeignKey('post_tag_relationships', {
            columnNames: ['tagId'],
            referencedTableName: 'post_tags',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
        });
        // Create triggers for automatic updated_at timestamp updates
        await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
        await queryRunner.query(`
      CREATE TRIGGER update_post_tags_updated_at
          BEFORE UPDATE ON post_tags
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);
        // ✅ CMS entities migration completed successfully
        // 📊 Created tables: post_tags, post_revisions, page_revisions, post_tag_relationships
        // 📈 Created indexes for optimal performance
        // 🔗 Created foreign key constraints
        // ⚡ Created database triggers for automatic timestamps
    }
    async down(queryRunner) {
        // Drop triggers
        await queryRunner.query('DROP TRIGGER IF EXISTS update_post_tags_updated_at ON post_tags;');
        await queryRunner.query('DROP FUNCTION IF EXISTS update_updated_at_column();');
        // Drop foreign keys
        const postRevisions = await queryRunner.getTable('post_revisions');
        if (postRevisions) {
            const postRevisionsFks = postRevisions.foreignKeys;
            for (const fk of postRevisionsFks) {
                await queryRunner.dropForeignKey('post_revisions', fk);
            }
        }
        const pageRevisions = await queryRunner.getTable('page_revisions');
        if (pageRevisions) {
            const pageRevisionsFks = pageRevisions.foreignKeys;
            for (const fk of pageRevisionsFks) {
                await queryRunner.dropForeignKey('page_revisions', fk);
            }
        }
        const postTagRelationships = await queryRunner.getTable('post_tag_relationships');
        if (postTagRelationships) {
            const postTagRelationshipsFks = postTagRelationships.foreignKeys;
            for (const fk of postTagRelationshipsFks) {
                await queryRunner.dropForeignKey('post_tag_relationships', fk);
            }
        }
        // Drop indexes
        await queryRunner.dropIndex('post_tags', 'IDX_post_tags_name');
        await queryRunner.dropIndex('post_tags', 'IDX_post_tags_slug');
        await queryRunner.dropIndex('post_revisions', 'IDX_post_revisions_post_created');
        await queryRunner.dropIndex('post_revisions', 'IDX_post_revisions_post_revision');
        await queryRunner.dropIndex('post_revisions', 'IDX_post_revisions_author');
        await queryRunner.dropIndex('page_revisions', 'IDX_page_revisions_page_created');
        await queryRunner.dropIndex('page_revisions', 'IDX_page_revisions_page_revision');
        await queryRunner.dropIndex('page_revisions', 'IDX_page_revisions_author');
        await queryRunner.dropIndex('media', 'IDX_media_user');
        await queryRunner.dropIndex('media', 'IDX_media_folder');
        await queryRunner.dropIndex('media', 'IDX_media_created');
        // Drop tables
        await queryRunner.dropTable('post_tag_relationships');
        await queryRunner.dropTable('page_revisions');
        await queryRunner.dropTable('post_revisions');
        await queryRunner.dropTable('post_tags');
        // Restore old tags column in posts table if needed
        const postsTable = await queryRunner.getTable('posts');
        if (postsTable) {
            await queryRunner.addColumn('posts', new typeorm_1.TableColumn({
                name: 'tags',
                type: 'simple-array',
                isNullable: true
            }));
            // Remove columns that were added in this migration
            const columnsToRemove = ['type', 'format', 'readingTime'];
            for (const columnName of columnsToRemove) {
                const existingColumn = postsTable.columns.find(col => col.name === columnName);
                if (existingColumn) {
                    await queryRunner.dropColumn('posts', columnName);
                }
            }
        }
        // ✅ CMS entities migration rollback completed
    }
}
exports.CreateCMSEntities1740000000000 = CreateCMSEntities1740000000000;
//# sourceMappingURL=1740000000000-CreateCMSEntities.js.map
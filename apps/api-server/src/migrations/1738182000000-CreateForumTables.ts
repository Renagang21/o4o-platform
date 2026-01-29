import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Create Forum Tables
 *
 * Creates all forum-core database tables:
 * - forum_category
 * - forum_post
 * - forum_comment
 * - forum_tag
 * - forum_like
 * - forum_bookmark
 *
 * Note: Migration copied from @o4o/forum-core package
 */
export class CreateForumTables1738182000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create forum_category table
    await queryRunner.createTable(new Table({
      name: 'forum_category',
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
          length: '100',
        },
        {
          name: 'description',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'slug',
          type: 'varchar',
          length: '200',
          isUnique: true,
        },
        {
          name: 'color',
          type: 'varchar',
          length: '50',
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
          name: 'requireApproval',
          type: 'boolean',
          default: false,
        },
        {
          name: 'accessLevel',
          type: 'enum',
          enum: ['all', 'member', 'business', 'admin'],
          default: "'all'",
        },
        {
          name: 'postCount',
          type: 'int',
          default: 0,
        },
        {
          name: 'createdBy',
          type: 'uuid',
          isNullable: true,
        },
        {
          name: 'created_at',
          type: 'timestamp',
          default: 'now()',
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          default: 'now()',
        },
      ],
      foreignKeys: [
        {
          columnNames: ['createdBy'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        },
      ],
    }), true);

    // Create indexes for forum_category
    await queryRunner.query(
      `CREATE INDEX "IDX_FORUM_CATEGORY_ACTIVE_SORT" ON "forum_category" ("isActive", "sortOrder")`
    );

    // Create forum_post table
    await queryRunner.createTable(new Table({
      name: 'forum_post',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          isPrimary: true,
          generationStrategy: 'uuid',
          default: 'uuid_generate_v4()',
        },
        {
          name: 'title',
          type: 'varchar',
          length: '200',
        },
        {
          name: 'slug',
          type: 'varchar',
          length: '250',
          isUnique: true,
        },
        {
          name: 'content',
          type: 'jsonb',
          default: "'[]'",
        },
        {
          name: 'excerpt',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'type',
          type: 'enum',
          enum: ['discussion', 'question', 'announcement', 'poll', 'guide'],
          default: "'discussion'",
        },
        {
          name: 'status',
          type: 'enum',
          enum: ['draft', 'publish', 'pending', 'rejected', 'archived'],
          default: "'publish'",
        },
        {
          name: 'categoryId',
          type: 'uuid',
        },
        {
          name: 'author_id',
          type: 'uuid',
        },
        {
          name: 'isPinned',
          type: 'boolean',
          default: false,
        },
        {
          name: 'isLocked',
          type: 'boolean',
          default: false,
        },
        {
          name: 'allowComments',
          type: 'boolean',
          default: true,
        },
        {
          name: 'viewCount',
          type: 'int',
          default: 0,
        },
        {
          name: 'commentCount',
          type: 'int',
          default: 0,
        },
        {
          name: 'likeCount',
          type: 'int',
          default: 0,
        },
        {
          name: 'tags',
          type: 'simple-array',
          isNullable: true,
        },
        {
          name: 'metadata',
          type: 'jsonb',
          isNullable: true,
        },
        {
          name: 'published_at',
          type: 'timestamp',
          isNullable: true,
        },
        {
          name: 'last_comment_at',
          type: 'timestamp',
          isNullable: true,
        },
        {
          name: 'last_comment_by',
          type: 'uuid',
          isNullable: true,
        },
        {
          name: 'organization_id',
          type: 'uuid',
          isNullable: true,
        },
        {
          name: 'is_organization_exclusive',
          type: 'boolean',
          default: false,
        },
        {
          name: 'show_contact_on_post',
          type: 'boolean',
          default: false,
        },
        {
          name: 'archivedAt',
          type: 'timestamp',
          isNullable: true,
        },
        {
          name: 'lockedAt',
          type: 'timestamp',
          isNullable: true,
        },
        {
          name: 'rejectionReason',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'metaTitle',
          type: 'varchar',
          length: '200',
          isNullable: true,
        },
        {
          name: 'metaDescription',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'created_at',
          type: 'timestamp',
          default: 'now()',
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          default: 'now()',
        },
      ],
      foreignKeys: [
        {
          columnNames: ['categoryId'],
          referencedTableName: 'forum_category',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        },
        {
          columnNames: ['author_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
        },
      ],
    }), true);

    // Create indexes for forum_post
    await queryRunner.query(
      `CREATE INDEX "IDX_FORUM_POST_CATEGORY_STATUS" ON "forum_post" ("categoryId", "status", "isPinned", "created_at")`
    );

    // Create forum_comment table
    await queryRunner.createTable(new Table({
      name: 'forum_comment',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          isPrimary: true,
          generationStrategy: 'uuid',
          default: 'uuid_generate_v4()',
        },
        {
          name: 'postId',
          type: 'uuid',
        },
        {
          name: 'author_id',
          type: 'uuid',
        },
        {
          name: 'content',
          type: 'text',
        },
        {
          name: 'status',
          type: 'enum',
          enum: ['publish', 'pending', 'deleted'],
          default: "'publish'",
        },
        {
          name: 'parentId',
          type: 'uuid',
          isNullable: true,
        },
        {
          name: 'depth',
          type: 'int',
          default: 0,
        },
        {
          name: 'likeCount',
          type: 'int',
          default: 0,
        },
        {
          name: 'replyCount',
          type: 'int',
          default: 0,
        },
        {
          name: 'isEdited',
          type: 'boolean',
          default: false,
        },
        {
          name: 'editedAt',
          type: 'timestamp',
          isNullable: true,
        },
        {
          name: 'deletedAt',
          type: 'timestamp',
          isNullable: true,
        },
        {
          name: 'deletedBy',
          type: 'uuid',
          isNullable: true,
        },
        {
          name: 'deletionReason',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'created_at',
          type: 'timestamp',
          default: 'now()',
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          default: 'now()',
        },
      ],
      foreignKeys: [
        {
          columnNames: ['postId'],
          referencedTableName: 'forum_post',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        },
        {
          columnNames: ['author_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
        },
        {
          columnNames: ['parentId'],
          referencedTableName: 'forum_comment',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        },
        {
          columnNames: ['deletedBy'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        },
      ],
    }), true);

    // Create indexes for forum_comment
    await queryRunner.query(
      `CREATE INDEX "IDX_FORUM_COMMENT_POST_STATUS" ON "forum_comment" ("postId", "status")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_FORUM_COMMENT_PARENT" ON "forum_comment" ("parentId")`
    );

    // Create forum_tag table
    await queryRunner.createTable(new Table({
      name: 'forum_tag',
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
          length: '50',
          isUnique: true,
        },
        {
          name: 'slug',
          type: 'varchar',
          length: '100',
          isUnique: true,
        },
        {
          name: 'description',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'color',
          type: 'varchar',
          length: '50',
          isNullable: true,
        },
        {
          name: 'usageCount',
          type: 'int',
          default: 0,
        },
        {
          name: 'isActive',
          type: 'boolean',
          default: true,
        },
        {
          name: 'created_at',
          type: 'timestamp',
          default: 'now()',
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          default: 'now()',
        },
      ],
    }), true);

    // Create forum_like table
    await queryRunner.createTable(new Table({
      name: 'forum_like',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          isPrimary: true,
          generationStrategy: 'uuid',
          default: 'uuid_generate_v4()',
        },
        {
          name: 'userId',
          type: 'uuid',
        },
        {
          name: 'targetType',
          type: 'enum',
          enum: ['post', 'comment'],
        },
        {
          name: 'targetId',
          type: 'uuid',
        },
        {
          name: 'created_at',
          type: 'timestamp',
          default: 'now()',
        },
      ],
      foreignKeys: [
        {
          columnNames: ['userId'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        },
      ],
    }), true);

    // Create unique index for likes
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_FORUM_LIKE_USER_TARGET" ON "forum_like" ("userId", "targetType", "targetId")`
    );

    // Create forum_bookmark table
    await queryRunner.createTable(new Table({
      name: 'forum_bookmark',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          isPrimary: true,
          generationStrategy: 'uuid',
          default: 'uuid_generate_v4()',
        },
        {
          name: 'userId',
          type: 'uuid',
        },
        {
          name: 'postId',
          type: 'uuid',
        },
        {
          name: 'notes',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'tags',
          type: 'simple-array',
          isNullable: true,
        },
        {
          name: 'created_at',
          type: 'timestamp',
          default: 'now()',
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          default: 'now()',
        },
      ],
      foreignKeys: [
        {
          columnNames: ['userId'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        },
        {
          columnNames: ['postId'],
          referencedTableName: 'forum_post',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        },
      ],
    }), true);

    // Create unique index for bookmarks
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_FORUM_BOOKMARK_USER_POST" ON "forum_bookmark" ("userId", "postId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.dropTable('forum_bookmark');
    await queryRunner.dropTable('forum_like');
    await queryRunner.dropTable('forum_tag');
    await queryRunner.dropTable('forum_comment');
    await queryRunner.dropTable('forum_post');
    await queryRunner.dropTable('forum_category');
  }
}

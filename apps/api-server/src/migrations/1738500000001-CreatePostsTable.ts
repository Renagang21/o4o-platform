import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm"

export class CreatePostsTable1738500000001 implements MigrationInterface {
    name = 'CreatePostsTable1738500000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create posts table
        await queryRunner.createTable(new Table({
            name: "posts",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "gen_random_uuid()"
                },
                {
                    name: "title",
                    type: "varchar",
                    length: "255"
                },
                {
                    name: "slug",
                    type: "varchar",
                    length: "255",
                    isUnique: true
                },
                {
                    name: "content",
                    type: "json",
                    isNullable: true
                },
                {
                    name: "excerpt",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "status",
                    type: "enum",
                    enum: ["draft", "published", "private", "archived", "scheduled"],
                    default: "'draft'"
                },
                {
                    name: "format",
                    type: "enum",
                    enum: ["standard", "aside", "gallery", "link", "image", "quote", "status", "video", "audio", "chat"],
                    default: "'standard'"
                },
                {
                    name: "template",
                    type: "varchar",
                    length: "255",
                    isNullable: true
                },
                {
                    name: "tags",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "seo",
                    type: "json",
                    isNullable: true
                },
                {
                    name: "customFields",
                    type: "json",
                    isNullable: true
                },
                {
                    name: "postMeta",
                    type: "json",
                    isNullable: true
                },
                {
                    name: "publishedAt",
                    type: "timestamp",
                    isNullable: true
                },
                {
                    name: "scheduledAt",
                    type: "timestamp",
                    isNullable: true
                },
                {
                    name: "authorId",
                    type: "uuid"
                },
                {
                    name: "lastModifiedBy",
                    type: "uuid",
                    isNullable: true
                },
                {
                    name: "views",
                    type: "integer",
                    default: 0
                },
                {
                    name: "password",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "passwordProtected",
                    type: "boolean",
                    default: false
                },
                {
                    name: "allowComments",
                    type: "boolean",
                    default: true
                },
                {
                    name: "commentStatus",
                    type: "varchar",
                    length: "50",
                    default: "'open'"
                },
                {
                    name: "featured",
                    type: "boolean",
                    default: false
                },
                {
                    name: "sticky",
                    type: "boolean",
                    default: false
                },
                {
                    name: "featuredImage",
                    type: "varchar",
                    length: "500",
                    isNullable: true
                },
                {
                    name: "readingTime",
                    type: "integer",
                    isNullable: true
                },
                {
                    name: "layoutSettings",
                    type: "json",
                    isNullable: true
                },
                {
                    name: "revisions",
                    type: "json",
                    isNullable: true
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                },
                {
                    name: "updatedAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                    onUpdate: "CURRENT_TIMESTAMP"
                }
            ]
        }), true)

        // Create post_categories junction table
        await queryRunner.createTable(new Table({
            name: "post_categories",
            columns: [
                {
                    name: "postId",
                    type: "uuid"
                },
                {
                    name: "categoryId",
                    type: "uuid"
                }
            ]
        }), true)

        // Create foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "posts" 
            ADD CONSTRAINT "FK_posts_authorId" 
            FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE
        `)

        await queryRunner.query(`
            ALTER TABLE "posts" 
            ADD CONSTRAINT "FK_posts_lastModifiedBy" 
            FOREIGN KEY ("lastModifiedBy") REFERENCES "users"("id") ON DELETE SET NULL
        `)

        await queryRunner.query(`
            ALTER TABLE "post_categories" 
            ADD CONSTRAINT "FK_post_categories_postId" 
            FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE
        `)

        await queryRunner.query(`
            ALTER TABLE "post_categories" 
            ADD CONSTRAINT "FK_post_categories_categoryId" 
            FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE
        `)

        // Create indexes for better performance
        await queryRunner.createIndex("posts", new TableIndex({ name: "IDX_posts_slug", columnNames: ["slug"] }))
        await queryRunner.createIndex("posts", new TableIndex({ name: "IDX_posts_status", columnNames: ["status"] }))
        await queryRunner.createIndex("posts", new TableIndex({ name: "IDX_posts_publishedAt", columnNames: ["publishedAt"] }))
        await queryRunner.createIndex("posts", new TableIndex({ name: "IDX_posts_authorId", columnNames: ["authorId"] }))
        await queryRunner.createIndex("posts", new TableIndex({ name: "IDX_posts_featured", columnNames: ["featured"] }))
        await queryRunner.createIndex("posts", new TableIndex({ name: "IDX_posts_sticky", columnNames: ["sticky"] }))
        
        await queryRunner.createIndex("post_categories", new TableIndex({ name: "IDX_post_categories_postId", columnNames: ["postId"] }))
        await queryRunner.createIndex("post_categories", new TableIndex({ name: "IDX_post_categories_categoryId", columnNames: ["categoryId"] }))

        // Posts table and relationships created successfully
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "FK_posts_authorId"`)
        await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "FK_posts_lastModifiedBy"`)
        await queryRunner.query(`ALTER TABLE "post_categories" DROP CONSTRAINT "FK_post_categories_postId"`)
        await queryRunner.query(`ALTER TABLE "post_categories" DROP CONSTRAINT "FK_post_categories_categoryId"`)

        // Drop indexes
        await queryRunner.dropIndex("posts", "IDX_posts_slug")
        await queryRunner.dropIndex("posts", "IDX_posts_status")
        await queryRunner.dropIndex("posts", "IDX_posts_publishedAt")
        await queryRunner.dropIndex("posts", "IDX_posts_authorId")
        await queryRunner.dropIndex("posts", "IDX_posts_featured")
        await queryRunner.dropIndex("posts", "IDX_posts_sticky")
        await queryRunner.dropIndex("post_categories", "IDX_post_categories_postId")
        await queryRunner.dropIndex("post_categories", "IDX_post_categories_categoryId")

        // Drop tables
        await queryRunner.dropTable("post_categories")
        await queryRunner.dropTable("posts")

        // Posts table and relationships dropped successfully
    }
}
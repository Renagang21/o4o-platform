import { MigrationInterface, QueryRunner, Table, Index } from "typeorm";

export class CreatePostTagTable1725170000000 implements MigrationInterface {
    name = 'CreatePostTagTable1725170000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create post_tags table
        await queryRunner.createTable(new Table({
            name: "post_tags",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()"
                },
                {
                    name: "name",
                    type: "varchar",
                    length: "100",
                    isUnique: true,
                    isNullable: false
                },
                {
                    name: "slug",
                    type: "varchar",
                    length: "100",
                    isUnique: true,
                    isNullable: false
                },
                {
                    name: "description",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "color",
                    type: "varchar",
                    length: "7",
                    isNullable: true,
                    comment: "Hex color code"
                },
                {
                    name: "usageCount",
                    type: "int",
                    default: 0,
                    isNullable: false
                },
                {
                    name: "isActive",
                    type: "boolean",
                    default: true,
                    isNullable: false
                },
                {
                    name: "metaTitle",
                    type: "varchar",
                    length: "255",
                    isNullable: true
                },
                {
                    name: "metaDescription",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                    isNullable: false
                },
                {
                    name: "updatedAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                    onUpdate: "CURRENT_TIMESTAMP",
                    isNullable: false
                }
            ]
        }), true);

        // Create indexes for better performance
        await queryRunner.createIndex("post_tags", new Index("IDX_POST_TAG_NAME", ["name"]));
        await queryRunner.createIndex("post_tags", new Index("IDX_POST_TAG_SLUG", ["slug"]));
        await queryRunner.createIndex("post_tags", new Index("IDX_POST_TAG_ACTIVE", ["isActive"]));
        await queryRunner.createIndex("post_tags", new Index("IDX_POST_TAG_USAGE_COUNT", ["usageCount"]));

        // Create many-to-many junction table for posts and tags
        await queryRunner.createTable(new Table({
            name: "post_post_tags",
            columns: [
                {
                    name: "postId",
                    type: "uuid",
                    isNullable: false
                },
                {
                    name: "postTagId",
                    type: "uuid",
                    isNullable: false
                }
            ],
            indices: [
                {
                    name: "IDX_POST_POST_TAGS_POST_ID",
                    columnNames: ["postId"]
                },
                {
                    name: "IDX_POST_POST_TAGS_TAG_ID",
                    columnNames: ["postTagId"]
                }
            ],
            uniques: [
                {
                    name: "UQ_POST_TAG_RELATION",
                    columnNames: ["postId", "postTagId"]
                }
            ],
            foreignKeys: [
                {
                    columnNames: ["postId"],
                    referencedColumnNames: ["id"],
                    referencedTableName: "posts",
                    onDelete: "CASCADE"
                },
                {
                    columnNames: ["postTagId"],
                    referencedColumnNames: ["id"],
                    referencedTableName: "post_tags",
                    onDelete: "CASCADE"
                }
            ]
        }), true);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop junction table first (due to foreign keys)
        await queryRunner.dropTable("post_post_tags");
        
        // Drop indexes
        await queryRunner.dropIndex("post_tags", "IDX_POST_TAG_USAGE_COUNT");
        await queryRunner.dropIndex("post_tags", "IDX_POST_TAG_ACTIVE");
        await queryRunner.dropIndex("post_tags", "IDX_POST_TAG_SLUG");
        await queryRunner.dropIndex("post_tags", "IDX_POST_TAG_NAME");
        
        // Drop main table
        await queryRunner.dropTable("post_tags");
    }
}
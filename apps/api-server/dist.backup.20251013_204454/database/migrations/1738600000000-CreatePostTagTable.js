"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePostTagTable1738600000000 = void 0;
const typeorm_1 = require("typeorm");
class CreatePostTagTable1738600000000 {
    constructor() {
        this.name = 'CreatePostTagTable1738600000000';
    }
    async up(queryRunner) {
        // Create post_tags table
        await queryRunner.createTable(new typeorm_1.Table({
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
                    name: "created_at",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                    isNullable: false
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                    onUpdate: "CURRENT_TIMESTAMP",
                    isNullable: false
                }
            ]
        }), true);
        // Create indexes for better performance
        try {
            await queryRunner.createIndex("post_tags", new typeorm_1.TableIndex({
                name: "IDX_POST_TAG_NAME",
                columnNames: ["name"]
            }));
        }
        catch (error) {
            // Index may already exist, continue
        }
        try {
            await queryRunner.createIndex("post_tags", new typeorm_1.TableIndex({
                name: "IDX_POST_TAG_SLUG",
                columnNames: ["slug"]
            }));
        }
        catch (error) {
            // Index may already exist, continue
        }
        try {
            await queryRunner.createIndex("post_tags", new typeorm_1.TableIndex({
                name: "IDX_POST_TAG_ACTIVE",
                columnNames: ["isActive"]
            }));
        }
        catch (error) {
            // Index may already exist, continue
        }
        try {
            await queryRunner.createIndex("post_tags", new typeorm_1.TableIndex({
                name: "IDX_POST_TAG_USAGE_COUNT",
                columnNames: ["usageCount"]
            }));
        }
        catch (error) {
            // Index may already exist, continue
        }
        // Create many-to-many junction table for posts and tags
        await queryRunner.createTable(new typeorm_1.Table({
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
    async down(queryRunner) {
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
exports.CreatePostTagTable1738600000000 = CreatePostTagTable1738600000000;
//# sourceMappingURL=1738600000000-CreatePostTagTable.js.map
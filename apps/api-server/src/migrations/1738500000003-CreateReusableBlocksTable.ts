import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm"

export class CreateReusableBlocksTable1738500000003 implements MigrationInterface {
    name = 'CreateReusableBlocksTable1738500000003'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create reusable_blocks table
        await queryRunner.createTable(new Table({
            name: "reusable_blocks",
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
                    name: "description",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "content",
                    type: "json"
                },
                {
                    name: "status",
                    type: "enum",
                    enum: ["active", "archived", "draft"],
                    default: "'active'"
                },
                {
                    name: "category",
                    type: "varchar",
                    length: "100",
                    isNullable: true
                },
                {
                    name: "tags",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "usageCount",
                    type: "integer",
                    default: 0
                },
                {
                    name: "lastUsedAt",
                    type: "timestamp",
                    isNullable: true
                },
                {
                    name: "isGlobal",
                    type: "boolean",
                    default: false
                },
                {
                    name: "isEditable",
                    type: "boolean",
                    default: true
                },
                {
                    name: "preview",
                    type: "json",
                    isNullable: true
                },
                {
                    name: "author_id",
                    type: "uuid"
                },
                {
                    name: "lastModifiedBy",
                    type: "uuid",
                    isNullable: true
                },
                {
                    name: "revisions",
                    type: "json",
                    isNullable: true
                },
                {
                    name: "visibility",
                    type: "enum",
                    enum: ["private", "public", "organization"],
                    default: "'private'"
                },
                {
                    name: "metadata",
                    type: "json",
                    isNullable: true
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                    onUpdate: "CURRENT_TIMESTAMP"
                }
            ]
        }), true)

        // Create foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "reusable_blocks" 
            ADD CONSTRAINT "FK_reusable_blocks_authorId" 
            FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE
        `)

        await queryRunner.query(`
            ALTER TABLE "reusable_blocks" 
            ADD CONSTRAINT "FK_reusable_blocks_lastModifiedBy" 
            FOREIGN KEY ("lastModifiedBy") REFERENCES "users"("id") ON DELETE SET NULL
        `)

        // Create indexes for better performance
        await queryRunner.createIndex("reusable_blocks", new TableIndex({ 
            name: "IDX_reusable_blocks_title", 
            columnNames: ["title"] 
        }))
        
        await queryRunner.createIndex("reusable_blocks", new TableIndex({ 
            name: "IDX_reusable_blocks_slug", 
            columnNames: ["slug"] 
        }))
        
        await queryRunner.createIndex("reusable_blocks", new TableIndex({ 
            name: "IDX_reusable_blocks_status", 
            columnNames: ["status"] 
        }))
        
        await queryRunner.createIndex("reusable_blocks", new TableIndex({ 
            name: "IDX_reusable_blocks_category", 
            columnNames: ["category"] 
        }))
        
        await queryRunner.createIndex("reusable_blocks", new TableIndex({ 
            name: "IDX_reusable_blocks_authorId", 
            columnNames: ["author_id"] 
        }))
        
        await queryRunner.createIndex("reusable_blocks", new TableIndex({ 
            name: "IDX_reusable_blocks_visibility", 
            columnNames: ["visibility"] 
        }))

        await queryRunner.createIndex("reusable_blocks", new TableIndex({ 
            name: "IDX_reusable_blocks_usageCount", 
            columnNames: ["usageCount"] 
        }))

        // Reusable blocks table created successfully
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "reusable_blocks" DROP CONSTRAINT "FK_reusable_blocks_authorId"`)
        await queryRunner.query(`ALTER TABLE "reusable_blocks" DROP CONSTRAINT "FK_reusable_blocks_lastModifiedBy"`)

        // Drop indexes
        await queryRunner.dropIndex("reusable_blocks", "IDX_reusable_blocks_title")
        await queryRunner.dropIndex("reusable_blocks", "IDX_reusable_blocks_slug")
        await queryRunner.dropIndex("reusable_blocks", "IDX_reusable_blocks_status")
        await queryRunner.dropIndex("reusable_blocks", "IDX_reusable_blocks_category")
        await queryRunner.dropIndex("reusable_blocks", "IDX_reusable_blocks_authorId")
        await queryRunner.dropIndex("reusable_blocks", "IDX_reusable_blocks_visibility")
        await queryRunner.dropIndex("reusable_blocks", "IDX_reusable_blocks_usageCount")

        // Drop table
        await queryRunner.dropTable("reusable_blocks")

        // Reusable blocks table dropped successfully
    }
}
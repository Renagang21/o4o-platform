import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm"

export class CreateBlockPatternsTable1738500000004 implements MigrationInterface {
    name = 'CreateBlockPatternsTable1738500000004'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create block_patterns table
        await queryRunner.createTable(new Table({
            name: "block_patterns",
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
                    name: "category",
                    type: "enum",
                    enum: ['header', 'footer', 'hero', 'cta', 'features', 'testimonials', 'pricing', 'contact', 'about', 'gallery', 'posts', 'general'],
                    default: "'general'"
                },
                {
                    name: "subcategories",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "tags",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "preview",
                    type: "json",
                    isNullable: true
                },
                {
                    name: "source",
                    type: "enum",
                    enum: ['core', 'theme', 'plugin', 'user'],
                    default: "'user'"
                },
                {
                    name: "featured",
                    type: "boolean",
                    default: false
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
                    name: "visibility",
                    type: "enum",
                    enum: ['public', 'private', 'pro'],
                    default: "'public'"
                },
                {
                    name: "isPremium",
                    type: "boolean",
                    default: false
                },
                {
                    name: "metadata",
                    type: "json",
                    isNullable: true
                },
                {
                    name: "author_id",
                    type: "uuid"
                },
                {
                    name: "version",
                    type: "varchar",
                    default: "'1.0.0'"
                },
                {
                    name: "dependencies",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "colorScheme",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "typography",
                    type: "json",
                    isNullable: true
                },
                {
                    name: "status",
                    type: "enum",
                    enum: ['active', 'draft', 'archived'],
                    default: "'active'"
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
            ALTER TABLE "block_patterns" 
            ADD CONSTRAINT "FK_block_patterns_authorId" 
            FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE
        `)

        // Create indexes for better performance
        await queryRunner.createIndex("block_patterns", new TableIndex({ 
            name: "IDX_block_patterns_title", 
            columnNames: ["title"] 
        }))
        
        await queryRunner.createIndex("block_patterns", new TableIndex({ 
            name: "IDX_block_patterns_slug", 
            columnNames: ["slug"] 
        }))
        
        await queryRunner.createIndex("block_patterns", new TableIndex({ 
            name: "IDX_block_patterns_category", 
            columnNames: ["category"] 
        }))
        
        await queryRunner.createIndex("block_patterns", new TableIndex({ 
            name: "IDX_block_patterns_source", 
            columnNames: ["source"] 
        }))
        
        await queryRunner.createIndex("block_patterns", new TableIndex({ 
            name: "IDX_block_patterns_featured", 
            columnNames: ["featured"] 
        }))
        
        await queryRunner.createIndex("block_patterns", new TableIndex({ 
            name: "IDX_block_patterns_usageCount", 
            columnNames: ["usageCount"] 
        }))
        
        await queryRunner.createIndex("block_patterns", new TableIndex({ 
            name: "IDX_block_patterns_visibility", 
            columnNames: ["visibility"] 
        }))
        
        await queryRunner.createIndex("block_patterns", new TableIndex({ 
            name: "IDX_block_patterns_status", 
            columnNames: ["status"] 
        }))
        
        await queryRunner.createIndex("block_patterns", new TableIndex({ 
            name: "IDX_block_patterns_authorId", 
            columnNames: ["author_id"] 
        }))

        // Block patterns table created successfully
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraint
        await queryRunner.query(`ALTER TABLE "block_patterns" DROP CONSTRAINT "FK_block_patterns_authorId"`)

        // Drop indexes
        await queryRunner.dropIndex("block_patterns", "IDX_block_patterns_title")
        await queryRunner.dropIndex("block_patterns", "IDX_block_patterns_slug")
        await queryRunner.dropIndex("block_patterns", "IDX_block_patterns_category")
        await queryRunner.dropIndex("block_patterns", "IDX_block_patterns_source")
        await queryRunner.dropIndex("block_patterns", "IDX_block_patterns_featured")
        await queryRunner.dropIndex("block_patterns", "IDX_block_patterns_usageCount")
        await queryRunner.dropIndex("block_patterns", "IDX_block_patterns_visibility")
        await queryRunner.dropIndex("block_patterns", "IDX_block_patterns_status")
        await queryRunner.dropIndex("block_patterns", "IDX_block_patterns_authorId")

        // Drop table
        await queryRunner.dropTable("block_patterns")

        // Block patterns table dropped successfully
    }
}
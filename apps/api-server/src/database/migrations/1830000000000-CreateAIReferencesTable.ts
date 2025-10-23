import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Migration: Create AI References Table
 *
 * Purpose: Store reference data for AI systems (blocks, shortcodes, prompts, etc.)
 * This enables dynamic updates through AI Services UI without requiring code changes.
 *
 * Extensible design supports future AI reference types:
 * - Current: blocks, shortcodes
 * - Future: image-prompts, video-prompts, audio-prompts, style-guides, etc.
 */
export class CreateAIReferencesTable1830000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ai_references',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            comment: 'Reference type: blocks, shortcodes, image-prompts, etc.'
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            comment: 'Reference name (unique within type)'
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
            comment: 'Human-readable description'
          },
          {
            name: 'content',
            type: 'text',
            comment: 'Reference content (markdown or JSON)'
          },
          {
            name: 'format',
            type: 'enum',
            enum: ['markdown', 'json'],
            default: "'markdown'",
            comment: 'Content format'
          },
          {
            name: 'version',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: 'Version of the reference data'
          },
          {
            name: 'schemaVersion',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: 'Schema version for validation'
          },
          {
            name: 'appSlug',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'Optional: Link to specific app (NULL = available to all apps)'
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'draft', 'archived'],
            default: "'active'",
            comment: 'Reference status'
          },
          {
            name: 'createdBy',
            type: 'uuid',
            isNullable: true,
            comment: 'User who created this reference'
          },
          {
            name: 'updatedBy',
            type: 'uuid',
            isNullable: true,
            comment: 'User who last updated this reference'
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_ai_references_type" ON "ai_references" ("type");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ai_references_app_slug" ON "ai_references" ("appSlug");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ai_references_status" ON "ai_references" ("status");
    `);

    // Unique constraint on type + name
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_ai_references_type_name_unique" ON "ai_references" ("type", "name");
    `);

    // Foreign key to users table (optional, if createdBy/updatedBy should be enforced)
    // Commented out to avoid strict dependency - can be enabled if needed
    /*
    await queryRunner.query(`
      ALTER TABLE ai_references
      ADD CONSTRAINT FK_ai_references_created_by
      FOREIGN KEY ("createdBy") REFERENCES users(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE ai_references
      ADD CONSTRAINT FK_ai_references_updated_by
      FOREIGN KEY ("updatedBy") REFERENCES users(id) ON DELETE SET NULL;
    `);
    */
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop table (indexes will be dropped automatically)
    await queryRunner.dropTable('ai_references');
  }
}

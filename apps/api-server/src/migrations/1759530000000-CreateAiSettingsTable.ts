import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateAiSettingsTable1759530000000 implements MigrationInterface {
  name = 'CreateAiSettingsTable1759530000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ai_settings table
    await queryRunner.createTable(
      new Table({
        name: 'ai_settings',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment'
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '255',
            isUnique: true
          },
          {
            name: 'apiKey',
            type: 'text',
            isNullable: true
          },
          {
            name: 'defaultModel',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'settings',
            type: 'json',
            isNullable: true
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true
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
      }),
      true
    );

    // Create index on provider column
    await queryRunner.createIndex(
      'ai_settings',
      new Index({
        name: 'IDX_ai_settings_provider',
        columnNames: ['provider']
      })
    );

    // Insert default providers
    await queryRunner.query(`
      INSERT INTO ai_settings (provider, apiKey, defaultModel, isActive)
      VALUES 
        ('openai', NULL, NULL, false),
        ('claude', NULL, NULL, false),
        ('gemini', NULL, NULL, false)
      ON DUPLICATE KEY UPDATE provider=provider
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('ai_settings', 'IDX_ai_settings_provider');
    await queryRunner.dropTable('ai_settings');
  }
}
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCustomizerPresetsTable2000000000005 implements MigrationInterface {
  name = 'CreateCustomizerPresetsTable2000000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists
    const tableExists = await queryRunner.hasTable('customizer_presets');
    if (tableExists) {
      console.log('Table customizer_presets already exists, skipping creation');
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'customizer_presets',
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
            name: 'settings',
            type: 'json',
          },
          {
            name: 'meta',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'isDefault',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    console.log('✅ Created customizer_presets table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('customizer_presets', true);
    console.log('✅ Dropped customizer_presets table');
  }
}

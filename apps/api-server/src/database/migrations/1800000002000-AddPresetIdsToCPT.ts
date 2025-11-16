import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPresetIdsToCPT1800000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add default_view_preset_id column
    await queryRunner.addColumn(
      'custom_post_types',
      new TableColumn({
        name: 'default_view_preset_id',
        type: 'varchar',
        length: '255',
        isNullable: true,
      })
    );

    // Add default_template_preset_id column
    await queryRunner.addColumn(
      'custom_post_types',
      new TableColumn({
        name: 'default_template_preset_id',
        type: 'varchar',
        length: '255',
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns in reverse order
    await queryRunner.dropColumn('custom_post_types', 'default_template_preset_id');
    await queryRunner.dropColumn('custom_post_types', 'default_view_preset_id');
  }
}

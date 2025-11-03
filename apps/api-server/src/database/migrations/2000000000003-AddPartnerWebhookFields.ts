import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddPartnerWebhookFields2000000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add webhook fields to partners table
    await queryRunner.addColumn(
      'partners',
      new TableColumn({
        name: 'webhook_url',
        type: 'varchar',
        length: '500',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'partners',
      new TableColumn({
        name: 'webhook_secret',
        type: 'varchar',
        length: '255',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'partners',
      new TableColumn({
        name: 'webhook_enabled',
        type: 'boolean',
        default: true,
      })
    );

    await queryRunner.addColumn(
      'partners',
      new TableColumn({
        name: 'webhook_events',
        type: 'json',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'partners',
      new TableColumn({
        name: 'webhook_last_delivered_at',
        type: 'timestamp',
        isNullable: true,
      })
    );

    // Set default webhook events for existing partners
    await queryRunner.query(`
      UPDATE partners
      SET webhook_events = '["commission.adjusted","commission.paid","commission.cancelled","commission.refunded","commission.auto_confirmed"]'
      WHERE webhook_events IS NULL
    `);

    // Create index on webhook_enabled for efficient filtering
    await queryRunner.createIndex(
      'partners',
      new TableIndex({
        name: 'IDX_partners_webhook_enabled',
        columnNames: ['webhook_enabled'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex('partners', 'IDX_partners_webhook_enabled');

    // Drop columns
    await queryRunner.dropColumn('partners', 'webhook_last_delivered_at');
    await queryRunner.dropColumn('partners', 'webhook_events');
    await queryRunner.dropColumn('partners', 'webhook_enabled');
    await queryRunner.dropColumn('partners', 'webhook_secret');
    await queryRunner.dropColumn('partners', 'webhook_url');
  }
}

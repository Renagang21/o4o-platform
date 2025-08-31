import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateWebhookLogTable1775000000000 implements MigrationInterface {
    name = 'CreateWebhookLogTable1775000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create webhook logs table
        await queryRunner.createTable(
            new Table({
                name: 'webhook_logs',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'event',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'payment_id',
                        type: 'varchar',
                        length: '255',
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['success', 'error'],
                        isNullable: false,
                    },
                    {
                        name: 'amount',
                        type: 'decimal',
                        precision: 12,
                        scale: 2,
                        isNullable: true,
                    },
                    {
                        name: 'currency',
                        type: 'varchar',
                        length: '3',
                        default: "'USD'",
                        isNullable: true,
                    },
                    {
                        name: 'error_message',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'ip_address',
                        type: 'varchar',
                        length: '45',
                        isNullable: true,
                    },
                    {
                        name: 'payload',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'processed_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                ],
            }),
            true
        );

        // Create indexes for webhook logs
        await queryRunner.createIndex('webhook_logs', new TableIndex({
            name: 'IDX_webhook_logs_event',
            columnNames: ['event']
        }));

        await queryRunner.createIndex('webhook_logs', new TableIndex({
            name: 'IDX_webhook_logs_payment_id',
            columnNames: ['payment_id']
        }));

        await queryRunner.createIndex('webhook_logs', new TableIndex({
            name: 'IDX_webhook_logs_status',
            columnNames: ['status']
        }));

        await queryRunner.createIndex('webhook_logs', new TableIndex({
            name: 'IDX_webhook_logs_created_at',
            columnNames: ['created_at']
        }));

        await queryRunner.createIndex('webhook_logs', new TableIndex({
            name: 'IDX_webhook_logs_event_status',
            columnNames: ['event', 'status']
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.dropIndex('webhook_logs', 'IDX_webhook_logs_event_status');
        await queryRunner.dropIndex('webhook_logs', 'IDX_webhook_logs_created_at');
        await queryRunner.dropIndex('webhook_logs', 'IDX_webhook_logs_status');
        await queryRunner.dropIndex('webhook_logs', 'IDX_webhook_logs_payment_id');
        await queryRunner.dropIndex('webhook_logs', 'IDX_webhook_logs_event');

        // Drop table
        await queryRunner.dropTable('webhook_logs');
    }
}
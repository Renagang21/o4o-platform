import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePaymentTables1830000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create payments table
    await queryRunner.createTable(
      new Table({
        name: 'payments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'orderId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'paymentKey',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: true
          },
          {
            name: 'transactionId',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false
          },
          {
            name: 'balanceAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false
          },
          {
            name: 'suppliedAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false
          },
          {
            name: 'vat',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
            default: "'KRW'",
            isNullable: false
          },
          {
            name: 'method',
            type: 'enum',
            enum: ['card', 'virtual_account', 'transfer', 'mobile_phone', 'kakao_pay', 'naver_pay', 'toss_pay', 'payco', 'easy_pay'],
            isNullable: true
          },
          {
            name: 'methodDetails',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'in_progress', 'waiting_for_deposit', 'done', 'canceled', 'partial_canceled', 'aborted', 'expired'],
            default: "'pending'",
            isNullable: false
          },
          {
            name: 'requestedAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false
          },
          {
            name: 'approvedAt',
            type: 'timestamp with time zone',
            isNullable: true
          },
          {
            name: 'canceledAt',
            type: 'timestamp with time zone',
            isNullable: true
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false
          },
          {
            name: 'customerEmail',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'customerName',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'customerMobilePhone',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'orderName',
            type: 'varchar',
            length: '255',
            isNullable: false
          },
          {
            name: 'gatewayResponse',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'webhookReceived',
            type: 'boolean',
            default: false,
            isNullable: false
          },
          {
            name: 'cancelAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false
          },
          {
            name: 'cancelReason',
            type: 'text',
            isNullable: true
          },
          {
            name: 'cancels',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'failureCode',
            type: 'text',
            isNullable: true
          },
          {
            name: 'failureMessage',
            type: 'text',
            isNullable: true
          },
          {
            name: 'customerIp',
            type: 'varchar',
            length: '45',
            isNullable: true
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true
          },
          {
            name: 'successUrl',
            type: 'text',
            isNullable: true
          },
          {
            name: 'failUrl',
            type: 'text',
            isNullable: true
          }
        ]
      }),
      true
    );

    // Create indexes for payments table
    await queryRunner.createIndex('payments', {
      name: 'IDX_payments_orderId',
      columnNames: ['orderId']
    } as any);
    await queryRunner.createIndex('payments', {
      name: 'IDX_payments_paymentKey',
      columnNames: ['paymentKey'],
      isUnique: true
    } as any);
    await queryRunner.createIndex('payments', {
      name: 'IDX_payments_status',
      columnNames: ['status']
    } as any);
    await queryRunner.createIndex('payments', {
      name: 'IDX_payments_requestedAt',
      columnNames: ['requestedAt']
    } as any);

    // Create foreign key to orders table
    await queryRunner.createForeignKey('payments', {
      columnNames: ['orderId'],
      referencedTableName: 'orders',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    } as any);

    // 2. Create payment_settlements table
    await queryRunner.createTable(
      new Table({
        name: 'payment_settlements',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'paymentId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'recipientType',
            type: 'enum',
            enum: ['supplier', 'partner', 'platform'],
            isNullable: false
          },
          {
            name: 'recipientId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'recipientName',
            type: 'varchar',
            length: '255',
            isNullable: false
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
            default: "'KRW'",
            isNullable: false
          },
          {
            name: 'fee',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false
          },
          {
            name: 'tax',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false
          },
          {
            name: 'netAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'scheduled', 'processing', 'completed', 'failed', 'cancelled'],
            default: "'pending'",
            isNullable: false
          },
          {
            name: 'scheduledAt',
            type: 'timestamp with time zone',
            isNullable: false
          },
          {
            name: 'processedAt',
            type: 'timestamp with time zone',
            isNullable: true
          },
          {
            name: 'completedAt',
            type: 'timestamp with time zone',
            isNullable: true
          },
          {
            name: 'bankAccount',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'transactionId',
            type: 'text',
            isNullable: true
          },
          {
            name: 'transactionProof',
            type: 'text',
            isNullable: true
          },
          {
            name: 'receiptUrl',
            type: 'text',
            isNullable: true
          },
          {
            name: 'failureReason',
            type: 'text',
            isNullable: true
          },
          {
            name: 'retryCount',
            type: 'int',
            default: 0,
            isNullable: false
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false
          }
        ]
      }),
      true
    );

    // Create indexes for payment_settlements table
    await queryRunner.createIndex('payment_settlements', {
      name: 'IDX_payment_settlements_paymentId',
      columnNames: ['paymentId']
    } as any);
    await queryRunner.createIndex('payment_settlements', {
      name: 'IDX_payment_settlements_recipientType_recipientId',
      columnNames: ['recipientType', 'recipientId']
    } as any);
    await queryRunner.createIndex('payment_settlements', {
      name: 'IDX_payment_settlements_status',
      columnNames: ['status']
    } as any);
    await queryRunner.createIndex('payment_settlements', {
      name: 'IDX_payment_settlements_scheduledAt',
      columnNames: ['scheduledAt']
    } as any);

    // Create foreign key to payments table
    await queryRunner.createForeignKey('payment_settlements', {
      columnNames: ['paymentId'],
      referencedTableName: 'payments',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    } as any);

    // 3. Create payment_webhooks table
    await queryRunner.createTable(
      new Table({
        name: 'payment_webhooks',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'eventType',
            type: 'enum',
            enum: ['PAYMENT_CONFIRMED', 'PAYMENT_CANCELLED', 'PAYMENT_FAILED', 'VIRTUAL_ACCOUNT_ISSUED', 'VIRTUAL_ACCOUNT_DEPOSIT', 'REFUND_COMPLETED', 'UNKNOWN'],
            isNullable: false
          },
          {
            name: 'paymentKey',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'orderId',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'transactionKey',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'payload',
            type: 'jsonb',
            isNullable: false
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['received', 'processing', 'processed', 'failed', 'skipped'],
            default: "'received'",
            isNullable: false
          },
          {
            name: 'processed',
            type: 'boolean',
            default: false,
            isNullable: false
          },
          {
            name: 'processedAt',
            type: 'timestamp with time zone',
            isNullable: true
          },
          {
            name: 'retryCount',
            type: 'int',
            default: 0,
            isNullable: false
          },
          {
            name: 'maxRetries',
            type: 'int',
            default: 3,
            isNullable: false
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true
          },
          {
            name: 'errorStack',
            type: 'text',
            isNullable: true
          },
          {
            name: 'processingResult',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'signature',
            type: 'text',
            isNullable: true
          },
          {
            name: 'sourceIp',
            type: 'varchar',
            length: '45',
            isNullable: true
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true
          },
          {
            name: 'headers',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'signatureVerified',
            type: 'boolean',
            default: false,
            isNullable: false
          },
          {
            name: 'idempotencyKey',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false
          }
        ]
      }),
      true
    );

    // Create indexes for payment_webhooks table
    await queryRunner.createIndex('payment_webhooks', {
      name: 'IDX_payment_webhooks_paymentKey',
      columnNames: ['paymentKey']
    } as any);
    await queryRunner.createIndex('payment_webhooks', {
      name: 'IDX_payment_webhooks_orderId',
      columnNames: ['orderId']
    } as any);
    await queryRunner.createIndex('payment_webhooks', {
      name: 'IDX_payment_webhooks_eventType',
      columnNames: ['eventType']
    } as any);
    await queryRunner.createIndex('payment_webhooks', {
      name: 'IDX_payment_webhooks_status',
      columnNames: ['status']
    } as any);
    await queryRunner.createIndex('payment_webhooks', {
      name: 'IDX_payment_webhooks_processed',
      columnNames: ['processed']
    } as any);
    await queryRunner.createIndex('payment_webhooks', {
      name: 'IDX_payment_webhooks_createdAt',
      columnNames: ['createdAt']
    } as any);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop payment_webhooks table
    await queryRunner.dropIndex('payment_webhooks', 'IDX_payment_webhooks_paymentKey');
    await queryRunner.dropIndex('payment_webhooks', 'IDX_payment_webhooks_orderId');
    await queryRunner.dropIndex('payment_webhooks', 'IDX_payment_webhooks_eventType');
    await queryRunner.dropIndex('payment_webhooks', 'IDX_payment_webhooks_status');
    await queryRunner.dropIndex('payment_webhooks', 'IDX_payment_webhooks_processed');
    await queryRunner.dropIndex('payment_webhooks', 'IDX_payment_webhooks_createdAt');
    await queryRunner.dropTable('payment_webhooks');

    // Drop payment_settlements table
    const settlementsTable = await queryRunner.getTable('payment_settlements');
    if (settlementsTable) {
      const foreignKey = settlementsTable.foreignKeys.find(fk => fk.columnNames.indexOf('paymentId') !== -1);
      if (foreignKey) {
        await queryRunner.dropForeignKey('payment_settlements', foreignKey);
      }
    }
    await queryRunner.dropIndex('payment_settlements', 'IDX_payment_settlements_paymentId');
    await queryRunner.dropIndex('payment_settlements', 'IDX_payment_settlements_recipientType_recipientId');
    await queryRunner.dropIndex('payment_settlements', 'IDX_payment_settlements_status');
    await queryRunner.dropIndex('payment_settlements', 'IDX_payment_settlements_scheduledAt');
    await queryRunner.dropTable('payment_settlements');

    // Drop payments table
    const paymentsTable = await queryRunner.getTable('payments');
    if (paymentsTable) {
      const foreignKey = paymentsTable.foreignKeys.find(fk => fk.columnNames.indexOf('orderId') !== -1);
      if (foreignKey) {
        await queryRunner.dropForeignKey('payments', foreignKey);
      }
    }
    await queryRunner.dropIndex('payments', 'IDX_payments_orderId');
    await queryRunner.dropIndex('payments', 'IDX_payments_paymentKey');
    await queryRunner.dropIndex('payments', 'IDX_payments_status');
    await queryRunner.dropIndex('payments', 'IDX_payments_requestedAt');
    await queryRunner.dropTable('payments');
  }
}

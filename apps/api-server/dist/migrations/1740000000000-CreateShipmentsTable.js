"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateShipmentsTable1740000000000 = void 0;
const typeorm_1 = require("typeorm");
class CreateShipmentsTable1740000000000 {
    constructor() {
        this.name = 'CreateShipmentsTable1740000000000';
    }
    async up(queryRunner) {
        // Create shipments table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'shipments',
            columns: [
                {
                    name: 'id',
                    type: 'int',
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: 'increment',
                },
                {
                    name: 'order_id',
                    type: 'int',
                    isNullable: false,
                },
                {
                    name: 'tracking_number',
                    type: 'varchar',
                    length: '100',
                    isNullable: true,
                    isUnique: true,
                },
                {
                    name: 'carrier',
                    type: 'varchar',
                    length: '50',
                    isNullable: false,
                    comment: 'Shipping carrier name (e.g., CJ대한통운, 한진택배, 롯데택배)',
                },
                {
                    name: 'carrier_code',
                    type: 'varchar',
                    length: '20',
                    isNullable: true,
                    comment: 'Carrier API code',
                },
                {
                    name: 'status',
                    type: 'enum',
                    enum: ['pending', 'preparing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'],
                    default: "'pending'",
                },
                {
                    name: 'shipped_at',
                    type: 'timestamp',
                    isNullable: true,
                },
                {
                    name: 'delivered_at',
                    type: 'timestamp',
                    isNullable: true,
                },
                {
                    name: 'expected_delivery_date',
                    type: 'date',
                    isNullable: true,
                },
                {
                    name: 'sender_name',
                    type: 'varchar',
                    length: '100',
                    isNullable: false,
                },
                {
                    name: 'sender_phone',
                    type: 'varchar',
                    length: '20',
                    isNullable: false,
                },
                {
                    name: 'sender_address',
                    type: 'text',
                    isNullable: false,
                },
                {
                    name: 'sender_postal_code',
                    type: 'varchar',
                    length: '10',
                    isNullable: true,
                },
                {
                    name: 'recipient_name',
                    type: 'varchar',
                    length: '100',
                    isNullable: false,
                },
                {
                    name: 'recipient_phone',
                    type: 'varchar',
                    length: '20',
                    isNullable: false,
                },
                {
                    name: 'recipient_address',
                    type: 'text',
                    isNullable: false,
                },
                {
                    name: 'recipient_postal_code',
                    type: 'varchar',
                    length: '10',
                    isNullable: true,
                },
                {
                    name: 'shipping_cost',
                    type: 'decimal',
                    precision: 10,
                    scale: 2,
                    default: 0,
                },
                {
                    name: 'insurance_amount',
                    type: 'decimal',
                    precision: 10,
                    scale: 2,
                    default: 0,
                    isNullable: true,
                },
                {
                    name: 'weight',
                    type: 'decimal',
                    precision: 8,
                    scale: 2,
                    isNullable: true,
                    comment: 'Weight in kg',
                },
                {
                    name: 'dimensions',
                    type: 'json',
                    isNullable: true,
                    comment: 'Package dimensions {length, width, height} in cm',
                },
                {
                    name: 'notes',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'delivery_message',
                    type: 'varchar',
                    length: '255',
                    isNullable: true,
                    comment: 'Message for delivery person',
                },
                {
                    name: 'signature_required',
                    type: 'boolean',
                    default: false,
                },
                {
                    name: 'signature_image',
                    type: 'text',
                    isNullable: true,
                    comment: 'Base64 encoded signature image',
                },
                {
                    name: 'failed_reason',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'return_reason',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'metadata',
                    type: 'json',
                    isNullable: true,
                    comment: 'Additional shipment metadata',
                },
                {
                    name: 'created_at',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'updated_at',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                    onUpdate: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);
        // Create indexes
        await queryRunner.createIndex('shipments', new typeorm_1.TableIndex({
            name: 'IDX_SHIPMENT_ORDER',
            columnNames: ['order_id']
        }));
        await queryRunner.createIndex('shipments', new typeorm_1.TableIndex({
            name: 'IDX_SHIPMENT_STATUS',
            columnNames: ['status']
        }));
        await queryRunner.createIndex('shipments', new typeorm_1.TableIndex({
            name: 'IDX_SHIPMENT_TRACKING',
            columnNames: ['tracking_number']
        }));
        await queryRunner.createIndex('shipments', new typeorm_1.TableIndex({
            name: 'IDX_SHIPMENT_CARRIER',
            columnNames: ['carrier']
        }));
        await queryRunner.createIndex('shipments', new typeorm_1.TableIndex({
            name: 'IDX_SHIPMENT_CREATED',
            columnNames: ['created_at']
        }));
        // Create shipment_tracking_history table for tracking updates
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'shipment_tracking_history',
            columns: [
                {
                    name: 'id',
                    type: 'int',
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: 'increment',
                },
                {
                    name: 'shipment_id',
                    type: 'int',
                    isNullable: false,
                },
                {
                    name: 'status',
                    type: 'varchar',
                    length: '50',
                    isNullable: false,
                },
                {
                    name: 'location',
                    type: 'varchar',
                    length: '255',
                    isNullable: true,
                },
                {
                    name: 'description',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'tracking_time',
                    type: 'timestamp',
                    isNullable: false,
                },
                {
                    name: 'created_at',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);
        await queryRunner.createIndex('shipment_tracking_history', new typeorm_1.TableIndex({
            name: 'IDX_TRACKING_HISTORY_SHIPMENT',
            columnNames: ['shipment_id']
        }));
        await queryRunner.createIndex('shipment_tracking_history', new typeorm_1.TableIndex({
            name: 'IDX_TRACKING_HISTORY_TIME',
            columnNames: ['tracking_time']
        }));
        // Add foreign key constraint
        await queryRunner.query(`
      ALTER TABLE shipments
      ADD CONSTRAINT FK_SHIPMENT_ORDER
      FOREIGN KEY (order_id) REFERENCES orders(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE
    `);
        await queryRunner.query(`
      ALTER TABLE shipment_tracking_history
      ADD CONSTRAINT FK_TRACKING_SHIPMENT
      FOREIGN KEY (shipment_id) REFERENCES shipments(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE
    `);
    }
    async down(queryRunner) {
        // Drop foreign keys
        await queryRunner.query(`ALTER TABLE shipment_tracking_history DROP FOREIGN KEY FK_TRACKING_SHIPMENT`);
        await queryRunner.query(`ALTER TABLE shipments DROP FOREIGN KEY FK_SHIPMENT_ORDER`);
        // Drop tables
        await queryRunner.dropTable('shipment_tracking_history');
        await queryRunner.dropTable('shipments');
    }
}
exports.CreateShipmentsTable1740000000000 = CreateShipmentsTable1740000000000;
//# sourceMappingURL=1740000000000-CreateShipmentsTable.js.map
import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateCartTables1789000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create carts table
    await queryRunner.createTable(
      new Table({
        name: 'carts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'summary',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'coupons',
            type: 'text',
            isArray: true,
            isNullable: true
          },
          {
            name: 'discountCodes',
            type: 'text',
            isArray: true,
            isNullable: true
          },
          {
            name: 'sessionId',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'expiresAt',
            type: 'timestamp with time zone',
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

    // Create cart_items table
    await queryRunner.createTable(
      new Table({
        name: 'cart_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'cartId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'productId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'productName',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'productSku',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'productImage',
            type: 'text',
            isNullable: true
          },
          {
            name: 'productBrand',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'variationId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'variationName',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'unitPrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'quantity',
            type: 'int',
            isNullable: false
          },
          {
            name: 'product',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'maxOrderQuantity',
            type: 'int',
            isNullable: true
          },
          {
            name: 'stockQuantity',
            type: 'int',
            isNullable: true
          },
          {
            name: 'supplierId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'supplierName',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'attributes',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'addedAt',
            type: 'timestamp with time zone',
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

    // Create indexes for carts table
    await queryRunner.createIndex('carts', {
      name: 'IDX_carts_userId',
      columnNames: ['userId'],
      isUnique: true
    } as any);
    await queryRunner.createIndex('carts', {
      name: 'IDX_carts_sessionId',
      columnNames: ['sessionId']
    } as any);
    await queryRunner.createIndex('carts', {
      name: 'IDX_carts_expiresAt',
      columnNames: ['expiresAt']
    } as any);

    // Create indexes for cart_items table
    await queryRunner.createIndex('cart_items', {
      name: 'IDX_cart_items_cartId',
      columnNames: ['cartId']
    } as any);
    await queryRunner.createIndex('cart_items', {
      name: 'IDX_cart_items_productId',
      columnNames: ['productId']
    } as any);
    await queryRunner.createIndex('cart_items', {
      name: 'IDX_cart_items_cart_product',
      columnNames: ['cartId', 'productId']
    } as any);
    await queryRunner.createIndex('cart_items', {
      name: 'IDX_cart_items_supplierId',
      columnNames: ['supplierId']
    } as any);

    // Create foreign key constraints
    await queryRunner.createForeignKey('carts', {
      columnNames: ['userId'],
      referencedTableName: 'users',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    } as any);

    await queryRunner.createForeignKey('cart_items', {
      columnNames: ['cartId'],
      referencedTableName: 'carts',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    } as any);

    // Create GIN indexes for JSONB columns
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS IDX_carts_summary_gin 
      ON carts USING GIN (summary);
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS IDX_cart_items_product_gin 
      ON cart_items USING GIN (product);
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS IDX_cart_items_attributes_gin 
      ON cart_items USING GIN (attributes);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop GIN indexes
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_carts_summary_gin;`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_cart_items_product_gin;`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_cart_items_attributes_gin;`);

    // Drop foreign keys
    const cartItemsTable = await queryRunner.getTable('cart_items');
    if (cartItemsTable) {
      const cartItemsForeignKey = cartItemsTable.foreignKeys.find(fk => fk.columnNames.indexOf('cartId') !== -1);
      if (cartItemsForeignKey) {
        await queryRunner.dropForeignKey('cart_items', cartItemsForeignKey);
      }
    }

    const cartsTable = await queryRunner.getTable('carts');
    if (cartsTable) {
      const cartsForeignKey = cartsTable.foreignKeys.find(fk => fk.columnNames.indexOf('userId') !== -1);
      if (cartsForeignKey) {
        await queryRunner.dropForeignKey('carts', cartsForeignKey);
      }
    }

    // Drop indexes
    await queryRunner.dropIndex('cart_items', 'IDX_cart_items_cartId');
    await queryRunner.dropIndex('cart_items', 'IDX_cart_items_productId');
    await queryRunner.dropIndex('cart_items', 'IDX_cart_items_cart_product');
    await queryRunner.dropIndex('cart_items', 'IDX_cart_items_supplierId');

    await queryRunner.dropIndex('carts', 'IDX_carts_userId');
    await queryRunner.dropIndex('carts', 'IDX_carts_sessionId');
    await queryRunner.dropIndex('carts', 'IDX_carts_expiresAt');

    // Drop tables
    await queryRunner.dropTable('cart_items');
    await queryRunner.dropTable('carts');
  }
}
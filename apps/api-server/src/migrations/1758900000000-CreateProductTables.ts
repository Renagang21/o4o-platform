import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateProductTables1758900000000 implements MigrationInterface {
  name = 'CreateProductTables1758900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create products table
    await queryRunner.createTable(
      new Table({
        name: 'products',
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
            length: '255',
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'shortDescription',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'sku',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'retailPrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'wholesalePrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'affiliatePrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'salePrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'onSale',
            type: 'boolean',
            default: false,
          },
          {
            name: 'stock',
            type: 'integer',
            default: 0,
          },
          {
            name: 'lowStockThreshold',
            type: 'integer',
            default: 5,
          },
          {
            name: 'weight',
            type: 'decimal',
            precision: 10,
            scale: 3,
            isNullable: true,
          },
          {
            name: 'dimensions',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'images',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'gallery',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'draft'",
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            default: "'physical'",
          },
          {
            name: 'categories',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'attributes',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'featured',
            type: 'boolean',
            default: false,
          },
          {
            name: 'virtual',
            type: 'boolean',
            default: false,
          },
          {
            name: 'downloadable',
            type: 'boolean',
            default: false,
          },
          {
            name: 'downloads',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metaTitle',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'metaDescription',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metaKeywords',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'vendorId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'orderId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'shippingClassId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'tax_status',
            type: 'varchar',
            length: '50',
            default: "'taxable'",
          },
          {
            name: 'tax_class',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'products',
      new TableIndex({ name: 'IDX_PRODUCT_SLUG', columnNames: ['slug'] })
    );

    await queryRunner.createIndex(
      'products',
      new TableIndex({ name: 'IDX_PRODUCT_SKU', columnNames: ['sku'] })
    );

    await queryRunner.createIndex(
      'products',
      new TableIndex({ name: 'IDX_PRODUCT_STATUS', columnNames: ['status'] })
    );

    await queryRunner.createIndex(
      'products',
      new TableIndex({ name: 'IDX_PRODUCT_VENDOR', columnNames: ['vendorId'] })
    );

    await queryRunner.createIndex(
      'products',
      new TableIndex({ name: 'IDX_PRODUCT_CREATED', columnNames: ['createdAt'] })
    );

    // Create product_attributes table
    await queryRunner.createTable(
      new Table({
        name: 'product_attributes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'productId',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'value',
            type: 'text',
          },
          {
            name: 'position',
            type: 'integer',
            default: 0,
          },
          {
            name: 'visible',
            type: 'boolean',
            default: true,
          },
          {
            name: 'variation',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['productId'],
            referencedTableName: 'products',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );

    // Create product_variations table
    await queryRunner.createTable(
      new Table({
        name: 'product_variations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'productId',
            type: 'uuid',
          },
          {
            name: 'sku',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'salePrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'stock',
            type: 'integer',
            default: 0,
          },
          {
            name: 'weight',
            type: 'decimal',
            precision: 10,
            scale: 3,
            isNullable: true,
          },
          {
            name: 'dimensions',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'image',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'attributes',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'active'",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['productId'],
            referencedTableName: 'products',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('product_variations');
    await queryRunner.dropTable('product_attributes');
    await queryRunner.dropTable('products');
  }
}
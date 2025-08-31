import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateSupplierTables1755000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create suppliers table
    await queryRunner.createTable(
      new Table({
        name: 'suppliers',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          // Company information
          {
            name: 'companyName',
            type: 'varchar'
          },
          {
            name: 'supplierType',
            type: 'enum',
            enum: ['manufacturer', 'distributor', 'wholesaler', 'dropshipper'],
            default: "'wholesaler'"
          },
          {
            name: 'businessRegistrationNumber',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'taxNumber',
            type: 'varchar',
            isNullable: true
          },
          // Contact information
          {
            name: 'contactName',
            type: 'varchar'
          },
          {
            name: 'contactEmail',
            type: 'varchar'
          },
          {
            name: 'contactPhone',
            type: 'varchar'
          },
          {
            name: 'contactPosition',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'alternativeContact',
            type: 'varchar',
            isNullable: true
          },
          // Address
          {
            name: 'address',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'city',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'state',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'postalCode',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'country',
            type: 'varchar',
            isNullable: true
          },
          // Business terms
          {
            name: 'defaultMarginRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 15
          },
          {
            name: 'minimumMarginRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true
          },
          {
            name: 'maximumMarginRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true
          },
          {
            name: 'paymentTermDays',
            type: 'int',
            default: 30
          },
          {
            name: 'paymentTerms',
            type: 'enum',
            enum: ['net30', 'net60', 'net90', 'cod', 'prepaid'],
            default: "'net30'"
          },
          {
            name: 'minimumOrderAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'currency',
            type: 'varchar',
            isNullable: true
          },
          // Integration settings
          {
            name: 'integrationMethod',
            type: 'enum',
            enum: ['manual', 'api', 'csv', 'email'],
            default: "'manual'"
          },
          {
            name: 'apiEndpoint',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'apiKey',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'apiSecret',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'csvUploadUrl',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'syncFrequency',
            type: 'enum',
            enum: ['daily', 'weekly', 'monthly', 'realtime', 'manual'],
            default: "'manual'"
          },
          {
            name: 'lastSyncAt',
            type: 'timestamp',
            isNullable: true
          },
          // Auto-approval settings
          {
            name: 'autoApproval',
            type: 'boolean',
            default: false
          },
          {
            name: 'autoApprovalThreshold',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'autoApprovalCategories',
            type: 'text',
            isNullable: true
          },
          // Status and ratings
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'active', 'suspended', 'inactive'],
            default: "'pending'"
          },
          {
            name: 'rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: true
          },
          {
            name: 'totalOrders',
            type: 'int',
            default: 0
          },
          {
            name: 'totalOrderValue',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'totalProducts',
            type: 'int',
            default: 0
          },
          {
            name: 'activeProducts',
            type: 'int',
            default: 0
          },
          // Performance metrics
          {
            name: 'averageDeliveryDays',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true
          },
          {
            name: 'onTimeDeliveryRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true
          },
          {
            name: 'defectRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true
          },
          {
            name: 'returnRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true
          },
          // Settlement information
          {
            name: 'settlementCycle',
            type: 'enum',
            enum: ['monthly', 'biweekly', 'weekly'],
            default: "'monthly'"
          },
          {
            name: 'settlementDay',
            type: 'int',
            isNullable: true
          },
          {
            name: 'bankName',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'bankAccountNumber',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'bankAccountHolder',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'bankSwiftCode',
            type: 'varchar',
            isNullable: true
          },
          // Notes and metadata
          {
            name: 'notes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'internalNotes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'tags',
            type: 'text',
            isNullable: true
          },
          {
            name: 'preferredCategories',
            type: 'text',
            isNullable: true
          },
          {
            name: 'brands',
            type: 'text',
            isNullable: true
          },
          // Compliance
          {
            name: 'certificateNumber',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'certificateExpiryDate',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'certifications',
            type: 'text',
            isNullable: true
          },
          {
            name: 'isVerified',
            type: 'boolean',
            default: false
          },
          {
            name: 'verifiedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'verifiedBy',
            type: 'varchar',
            isNullable: true
          },
          // Additional settings
          {
            name: 'acceptReturns',
            type: 'boolean',
            default: true
          },
          {
            name: 'returnPeriodDays',
            type: 'int',
            default: 30
          },
          {
            name: 'dropshippingAvailable',
            type: 'boolean',
            default: false
          },
          {
            name: 'provideTrackingInfo',
            type: 'boolean',
            default: false
          },
          {
            name: 'warehouseLocation',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'shippingMethods',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'customFields',
            type: 'jsonb',
            isNullable: true
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

    // Create supplier_products table
    await queryRunner.createTable(
      new Table({
        name: 'supplier_products',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'supplierId',
            type: 'uuid'
          },
          // Product identification
          {
            name: 'sku',
            type: 'varchar'
          },
          {
            name: 'supplierSku',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'barcode',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'upc',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'ean',
            type: 'varchar',
            isNullable: true
          },
          // Product information
          {
            name: 'name',
            type: 'varchar'
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'brand',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'manufacturer',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'category',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'subcategory',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'tags',
            type: 'text',
            isNullable: true
          },
          // Pricing
          {
            name: 'supplierPrice',
            type: 'decimal',
            precision: 10,
            scale: 2
          },
          {
            name: 'msrp',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'mapPrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'marginRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true
          },
          {
            name: 'calculatedSellingPrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'currency',
            type: 'varchar',
            isNullable: true
          },
          // Inventory
          {
            name: 'availableQuantity',
            type: 'int',
            default: 0
          },
          {
            name: 'warehouseQuantity',
            type: 'int',
            isNullable: true
          },
          {
            name: 'inTransitQuantity',
            type: 'int',
            isNullable: true
          },
          {
            name: 'allocatedQuantity',
            type: 'int',
            isNullable: true
          },
          {
            name: 'moq',
            type: 'int',
            isNullable: true
          },
          {
            name: 'orderMultiple',
            type: 'int',
            isNullable: true
          },
          {
            name: 'maxOrderQuantity',
            type: 'int',
            isNullable: true
          },
          {
            name: 'leadTimeDays',
            type: 'int',
            isNullable: true
          },
          {
            name: 'restockDate',
            type: 'timestamp',
            isNullable: true
          },
          // Physical attributes
          {
            name: 'weight',
            type: 'decimal',
            precision: 10,
            scale: 3,
            isNullable: true
          },
          {
            name: 'weightUnit',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'length',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'width',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'height',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'dimensionUnit',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'packageType',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'unitsPerCase',
            type: 'int',
            isNullable: true
          },
          // Images and media
          {
            name: 'primaryImageUrl',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'additionalImageUrls',
            type: 'text',
            isNullable: true
          },
          {
            name: 'videoUrl',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'documentUrl',
            type: 'varchar',
            isNullable: true
          },
          // Status and availability
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'pending', 'discontinued', 'out_of_stock'],
            default: "'pending'"
          },
          {
            name: 'isAvailable',
            type: 'boolean',
            default: true
          },
          {
            name: 'isNew',
            type: 'boolean',
            default: false
          },
          {
            name: 'isFeatured',
            type: 'boolean',
            default: false
          },
          {
            name: 'isOnSale',
            type: 'boolean',
            default: false
          },
          {
            name: 'salePrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'saleStartDate',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'saleEndDate',
            type: 'timestamp',
            isNullable: true
          },
          // Shipping
          {
            name: 'shippable',
            type: 'boolean',
            default: true
          },
          {
            name: 'freeShipping',
            type: 'boolean',
            default: false
          },
          {
            name: 'shippingCost',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'shippingClass',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'hsCode',
            type: 'varchar',
            isNullable: true
          },
          // Specifications
          {
            name: 'specifications',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'attributes',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'materials',
            type: 'text',
            isNullable: true
          },
          {
            name: 'color',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'size',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'variants',
            type: 'text',
            isNullable: true
          },
          // Compliance
          {
            name: 'countryOfOrigin',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'certifications',
            type: 'text',
            isNullable: true
          },
          {
            name: 'warrantyPeriod',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'warrantyTerms',
            type: 'text',
            isNullable: true
          },
          {
            name: 'returnPolicy',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'hazardous',
            type: 'boolean',
            default: false
          },
          {
            name: 'fragile',
            type: 'boolean',
            default: false
          },
          {
            name: 'perishable',
            type: 'boolean',
            default: false
          },
          {
            name: 'expiryDate',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'shelfLife',
            type: 'varchar',
            isNullable: true
          },
          // SEO and marketing
          {
            name: 'metaTitle',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'metaDescription',
            type: 'text',
            isNullable: true
          },
          {
            name: 'keywords',
            type: 'text',
            isNullable: true
          },
          {
            name: 'slug',
            type: 'varchar',
            isNullable: true
          },
          // Performance metrics
          {
            name: 'viewCount',
            type: 'int',
            default: 0
          },
          {
            name: 'orderCount',
            type: 'int',
            default: 0
          },
          {
            name: 'totalRevenue',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: true
          },
          {
            name: 'reviewCount',
            type: 'int',
            default: 0
          },
          // Sync information
          {
            name: 'lastSyncAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'syncStatus',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'syncError',
            type: 'text',
            isNullable: true
          },
          {
            name: 'syncAttempts',
            type: 'int',
            default: 0
          },
          // Mapping
          {
            name: 'mappedProductId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'mappedInventoryId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'autoUpdate',
            type: 'boolean',
            default: false
          },
          {
            name: 'priceOverride',
            type: 'boolean',
            default: false
          },
          {
            name: 'quantityOverride',
            type: 'boolean',
            default: false
          },
          // Additional metadata
          {
            name: 'customFields',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'supplierData',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'lastUpdatedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'lastUpdatedBy',
            type: 'varchar',
            isNullable: true
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

    // Create supplier_vendors junction table
    await queryRunner.createTable(
      new Table({
        name: 'supplier_vendors',
        columns: [
          {
            name: 'supplierId',
            type: 'uuid'
          },
          {
            name: 'vendorId',
            type: 'uuid'
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex('suppliers', new TableIndex({
      name: 'IDX_suppliers_status',
      columnNames: ['status']
    }));

    await queryRunner.createIndex('suppliers', new TableIndex({
      name: 'IDX_suppliers_companyName',
      columnNames: ['companyName']
    }));

    await queryRunner.createIndex('suppliers', new TableIndex({
      name: 'IDX_suppliers_contactEmail',
      columnNames: ['contactEmail']
    }));

    await queryRunner.createIndex('supplier_products', new TableIndex({
      name: 'IDX_supplier_products_supplier_sku',
      columnNames: ['supplierId', 'sku'],
      isUnique: true
    }));

    await queryRunner.createIndex('supplier_products', new TableIndex({
      name: 'IDX_supplier_products_status',
      columnNames: ['status']
    }));

    await queryRunner.createIndex('supplier_products', new TableIndex({
      name: 'IDX_supplier_products_category',
      columnNames: ['category']
    }));

    await queryRunner.createIndex('supplier_products', new TableIndex({
      name: 'IDX_supplier_products_lastUpdatedAt',
      columnNames: ['lastUpdatedAt']
    }));

    await queryRunner.createIndex('supplier_vendors', new TableIndex({
      name: 'IDX_supplier_vendors_primary',
      columnNames: ['supplierId', 'vendorId'],
      isUnique: true
    }));

    // Create foreign keys
    await queryRunner.createForeignKey('supplier_products', new TableForeignKey({
      columnNames: ['supplierId'],
      referencedColumnNames: ['id'],
      referencedTableName: 'suppliers',
      onDelete: 'CASCADE'
    }));

    await queryRunner.createForeignKey('supplier_vendors', new TableForeignKey({
      columnNames: ['supplierId'],
      referencedColumnNames: ['id'],
      referencedTableName: 'suppliers',
      onDelete: 'CASCADE'
    }));

    await queryRunner.createForeignKey('supplier_vendors', new TableForeignKey({
      columnNames: ['vendorId'],
      referencedColumnNames: ['id'],
      referencedTableName: 'vendor_info',
      onDelete: 'CASCADE'
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const supplierVendorsTable = await queryRunner.getTable('supplier_vendors');
    const supplierVendorsForeignKeys = supplierVendorsTable?.foreignKeys || [];
    for (const fk of supplierVendorsForeignKeys) {
      await queryRunner.dropForeignKey('supplier_vendors', fk);
    }

    const supplierProductsTable = await queryRunner.getTable('supplier_products');
    const supplierProductsForeignKey = supplierProductsTable?.foreignKeys.find(
      fk => fk.columnNames.indexOf('supplierId') !== -1
    );
    if (supplierProductsForeignKey) {
      await queryRunner.dropForeignKey('supplier_products', supplierProductsForeignKey);
    }

    // Drop tables
    await queryRunner.dropTable('supplier_vendors');
    await queryRunner.dropTable('supplier_products');
    await queryRunner.dropTable('suppliers');
  }
}
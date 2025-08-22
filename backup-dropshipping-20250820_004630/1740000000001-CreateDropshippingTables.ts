import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateDropshippingTables1740000000001 implements MigrationInterface {
  name = 'CreateDropshippingTables1740000000001';

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
          {
            name: 'userId',
            type: 'uuid',
            isUnique: true
          },
          {
            name: 'companyName',
            type: 'varchar',
            length: '255'
          },
          {
            name: 'businessNumber',
            type: 'varchar',
            length: '100'
          },
          {
            name: 'businessLicense',
            type: 'text',
            isNullable: true
          },
          {
            name: 'onlineSellingLicense',
            type: 'text',
            isNullable: true
          },
          {
            name: 'contactPerson',
            type: 'varchar',
            length: '100'
          },
          {
            name: 'contactEmail',
            type: 'varchar',
            length: '255'
          },
          {
            name: 'contactPhone',
            type: 'varchar',
            length: '50'
          },
          {
            name: 'address',
            type: 'json'
          },
          {
            name: 'bankAccount',
            type: 'json',
            isNullable: true
          },
          {
            name: 'commissionRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 10.00
          },
          {
            name: 'verificationStatus',
            type: 'enum',
            enum: ['pending', 'verified', 'suspended', 'rejected'],
            default: "'pending'"
          },
          {
            name: 'verifiedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'verifiedBy',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'verificationNotes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'totalProducts',
            type: 'integer',
            default: 0
          },
          {
            name: 'activeProducts',
            type: 'integer',
            default: 0
          },
          {
            name: 'totalOrders',
            type: 'integer',
            default: 0
          },
          {
            name: 'totalRevenue',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0
          },
          {
            name: 'averageRating',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0
          },
          {
            name: 'totalReviews',
            type: 'integer',
            default: 0
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true
          },
          {
            name: 'settings',
            type: 'json',
            isNullable: true
          },
          {
            name: 'metadata',
            type: 'json',
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
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          }
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

    // Create sellers table
    await queryRunner.createTable(
      new Table({
        name: 'sellers',
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
            isUnique: true
          },
          {
            name: 'storeName',
            type: 'varchar',
            length: '255'
          },
          {
            name: 'storeUrl',
            type: 'varchar',
            length: '500',
            isNullable: true
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'logo',
            type: 'varchar',
            length: '500',
            isNullable: true
          },
          {
            name: 'banner',
            type: 'varchar',
            length: '500',
            isNullable: true
          },
          {
            name: 'sellerLevel',
            type: 'enum',
            enum: ['bronze', 'silver', 'gold', 'platinum'],
            default: "'bronze'"
          },
          {
            name: 'totalSales',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0
          },
          {
            name: 'monthlyAverage',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0
          },
          {
            name: 'returnRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0
          },
          {
            name: 'customerSatisfaction',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0
          },
          {
            name: 'totalOrders',
            type: 'integer',
            default: 0
          },
          {
            name: 'completedOrders',
            type: 'integer',
            default: 0
          },
          {
            name: 'cancelledOrders',
            type: 'integer',
            default: 0
          },
          {
            name: 'marketplaces',
            type: 'text',
            isNullable: true
          },
          {
            name: 'marketplaceCredentials',
            type: 'json',
            isNullable: true
          },
          {
            name: 'customCommissionRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true
          },
          {
            name: 'defaultMarkup',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 20.00
          },
          {
            name: 'balance',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0
          },
          {
            name: 'pendingPayout',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0
          },
          {
            name: 'totalPayout',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0
          },
          {
            name: 'paymentInfo',
            type: 'json',
            isNullable: true
          },
          {
            name: 'storeSettings',
            type: 'json',
            isNullable: true
          },
          {
            name: 'seoSettings',
            type: 'json',
            isNullable: true
          },
          {
            name: 'contactEmail',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'contactPhone',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'businessHours',
            type: 'json',
            isNullable: true
          },
          {
            name: 'socialMedia',
            type: 'json',
            isNullable: true
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true
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
            name: 'vacationMode',
            type: 'boolean',
            default: false
          },
          {
            name: 'vacationStartDate',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'vacationEndDate',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'vacationMessage',
            type: 'text',
            isNullable: true
          },
          {
            name: 'metadata',
            type: 'json',
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
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          }
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

    // Create affiliates table
    await queryRunner.createTable(
      new Table({
        name: 'affiliates',
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
            isUnique: true
          },
          {
            name: 'referralCode',
            type: 'varchar',
            length: '50',
            isUnique: true
          },
          {
            name: 'websiteUrl',
            type: 'varchar',
            length: '500',
            isNullable: true
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'socialMedia',
            type: 'json',
            isNullable: true
          },
          {
            name: 'audienceInfo',
            type: 'json',
            isNullable: true
          },
          {
            name: 'baseCommissionRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 5.00
          },
          {
            name: 'tieredRates',
            type: 'json',
            isNullable: true
          },
          {
            name: 'specialRates',
            type: 'json',
            isNullable: true
          },
          {
            name: 'totalClicks',
            type: 'integer',
            default: 0
          },
          {
            name: 'uniqueClicks',
            type: 'integer',
            default: 0
          },
          {
            name: 'totalConversions',
            type: 'integer',
            default: 0
          },
          {
            name: 'conversionRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0
          },
          {
            name: 'totalEarnings',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0
          },
          {
            name: 'pendingEarnings',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0
          },
          {
            name: 'paidEarnings',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0
          },
          {
            name: 'currentMonthEarnings',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0
          },
          {
            name: 'lastMonthEarnings',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0
          },
          {
            name: 'totalOrders',
            type: 'integer',
            default: 0
          },
          {
            name: 'totalOrderValue',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0
          },
          {
            name: 'averageOrderValue',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0
          },
          {
            name: 'repeatCustomers',
            type: 'integer',
            default: 0
          },
          {
            name: 'paymentMethod',
            type: 'json',
            isNullable: true
          },
          {
            name: 'minimumPayoutAmount',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 100.00
          },
          {
            name: 'payoutFrequency',
            type: 'varchar',
            length: '20',
            default: "'monthly'"
          },
          {
            name: 'lastPayoutDate',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'nextPayoutDate',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'parentAffiliateId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'networkLevel',
            type: 'integer',
            default: 0
          },
          {
            name: 'totalReferrals',
            type: 'integer',
            default: 0
          },
          {
            name: 'networkCommissionRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0
          },
          {
            name: 'allowedCategories',
            type: 'text',
            isNullable: true
          },
          {
            name: 'blockedProducts',
            type: 'text',
            isNullable: true
          },
          {
            name: 'customLinks',
            type: 'json',
            isNullable: true
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'suspended'],
            default: "'active'"
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
            name: 'taxId',
            type: 'text',
            isNullable: true
          },
          {
            name: 'agreementSigned',
            type: 'boolean',
            default: false
          },
          {
            name: 'agreementSignedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'metadata',
            type: 'json',
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
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          }
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          },
          {
            columnNames: ['parentAffiliateId'],
            referencedTableName: 'affiliates',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL'
          }
        ]
      }),
      true
    );

    // Create dropshipping_products table
    await queryRunner.createTable(
      new Table({
        name: 'dropshipping_products',
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
          {
            name: 'sku',
            type: 'varchar',
            length: '100',
            isUnique: true
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255'
          },
          {
            name: 'description',
            type: 'text'
          },
          {
            name: 'shortDescription',
            type: 'text',
            isNullable: true
          },
          {
            name: 'category',
            type: 'varchar',
            length: '100'
          },
          {
            name: 'subcategory',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'images',
            type: 'text'
          },
          {
            name: 'thumbnail',
            type: 'varchar',
            length: '500',
            isNullable: true
          },
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
            scale: 2
          },
          {
            name: 'minSellingPrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'compareAtPrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'quantity',
            type: 'integer',
            default: 0
          },
          {
            name: 'reserved',
            type: 'integer',
            default: 0
          },
          {
            name: 'lowStockThreshold',
            type: 'integer',
            default: 10
          },
          {
            name: 'trackInventory',
            type: 'boolean',
            default: true
          },
          {
            name: 'allowBackorder',
            type: 'boolean',
            default: false
          },
          {
            name: 'weight',
            type: 'decimal',
            precision: 8,
            scale: 3,
            isNullable: true
          },
          {
            name: 'dimensions',
            type: 'json',
            isNullable: true
          },
          {
            name: 'shippingClass',
            type: 'varchar',
            length: '50',
            default: "'standard'"
          },
          {
            name: 'estimatedShippingDays',
            type: 'integer',
            default: 3
          },
          {
            name: 'shippingCost',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0
          },
          {
            name: 'freeShipping',
            type: 'boolean',
            default: false
          },
          {
            name: 'attributes',
            type: 'json',
            isNullable: true
          },
          {
            name: 'specifications',
            type: 'json',
            isNullable: true
          },
          {
            name: 'tags',
            type: 'text',
            isNullable: true
          },
          {
            name: 'brand',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'manufacturer',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'model',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'barcode',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'isbn',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'mpn',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'variations',
            type: 'json',
            isNullable: true
          },
          {
            name: 'variationOptions',
            type: 'json',
            isNullable: true
          },
          {
            name: 'seoTitle',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'seoDescription',
            type: 'text',
            isNullable: true
          },
          {
            name: 'seoKeywords',
            type: 'text',
            isNullable: true
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'views',
            type: 'integer',
            default: 0
          },
          {
            name: 'totalSold',
            type: 'integer',
            default: 0
          },
          {
            name: 'averageRating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0
          },
          {
            name: 'totalReviews',
            type: 'integer',
            default: 0
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true
          },
          {
            name: 'isFeatured',
            type: 'boolean',
            default: false
          },
          {
            name: 'isNewArrival',
            type: 'boolean',
            default: false
          },
          {
            name: 'isBestSeller',
            type: 'boolean',
            default: false
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'draft'"
          },
          {
            name: 'publishedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'importData',
            type: 'json',
            isNullable: true
          },
          {
            name: 'externalId',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'externalSource',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'lastSyncAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'metadata',
            type: 'json',
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
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          }
        ],
        foreignKeys: [
          {
            columnNames: ['supplierId'],
            referencedTableName: 'suppliers',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

    // Create indexes using query
    await queryRunner.query(`CREATE INDEX "IDX_SUPPLIER_USER" ON "suppliers" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_SUPPLIER_STATUS" ON "suppliers" ("verificationStatus")`);
    
    await queryRunner.query(`CREATE INDEX "IDX_SELLER_USER" ON "sellers" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_SELLER_LEVEL" ON "sellers" ("sellerLevel")`);
    await queryRunner.query(`CREATE INDEX "IDX_SELLER_ACTIVE" ON "sellers" ("isActive")`);
    
    await queryRunner.query(`CREATE INDEX "IDX_AFFILIATE_USER" ON "affiliates" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_AFFILIATE_CODE" ON "affiliates" ("referralCode")`);
    await queryRunner.query(`CREATE INDEX "IDX_AFFILIATE_STATUS" ON "affiliates" ("status")`);
    
    await queryRunner.query(`CREATE INDEX "IDX_PRODUCT_SUPPLIER" ON "dropshipping_products" ("supplierId")`);
    await queryRunner.query(`CREATE INDEX "IDX_PRODUCT_SKU" ON "dropshipping_products" ("sku")`);
    await queryRunner.query(`CREATE INDEX "IDX_PRODUCT_CATEGORY" ON "dropshipping_products" ("category")`);
    await queryRunner.query(`CREATE INDEX "IDX_PRODUCT_ACTIVE" ON "dropshipping_products" ("isActive")`);
    await queryRunner.query(`CREATE INDEX "IDX_PRODUCT_NAME" ON "dropshipping_products" ("name")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes using query
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PRODUCT_NAME"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PRODUCT_ACTIVE"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PRODUCT_CATEGORY"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PRODUCT_SKU"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PRODUCT_SUPPLIER"`);
    
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_AFFILIATE_STATUS"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_AFFILIATE_CODE"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_AFFILIATE_USER"`);
    
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_SELLER_ACTIVE"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_SELLER_LEVEL"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_SELLER_USER"`);
    
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_SUPPLIER_STATUS"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_SUPPLIER_USER"`);

    // Drop tables
    await queryRunner.dropTable('dropshipping_products');
    await queryRunner.dropTable('affiliates');
    await queryRunner.dropTable('sellers');
    await queryRunner.dropTable('suppliers');
  }
}
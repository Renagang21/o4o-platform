import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class OptimizeSystemPerformance1770000000000 implements MigrationInterface {
    name = 'OptimizeSystemPerformance1770000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Vendor performance indexes
        if (await queryRunner.hasTable('vendor_info')) {
            await queryRunner.createIndex('vendor_info', new TableIndex({
                name: 'IDX_vendor_info_status_created',
                columnNames: ['status', 'created_at']
            }));

            await queryRunner.createIndex('vendor_info', new TableIndex({
                name: 'IDX_vendor_info_type_status',
                columnNames: ['vendorType', 'status']
            }));

            await queryRunner.createIndex('vendor_info', new TableIndex({
                name: 'IDX_vendor_info_revenue',
                columnNames: ['totalRevenue']
            }));

            await queryRunner.createIndex('vendor_info', new TableIndex({
                name: 'IDX_vendor_info_sales',
                columnNames: ['totalSales']
            }));
        }

        // Supplier performance indexes
        if (await queryRunner.hasTable('suppliers')) {
            await queryRunner.createIndex('suppliers', new TableIndex({
                name: 'IDX_suppliers_status_type',
                columnNames: ['status', 'supplierType']
            }));

            await queryRunner.createIndex('suppliers', new TableIndex({
                name: 'IDX_suppliers_contact_email',
                columnNames: ['contactEmail']
            }));

            await queryRunner.createIndex('suppliers', new TableIndex({
                name: 'IDX_suppliers_company_name',
                columnNames: ['companyName']
            }));

            await queryRunner.createIndex('suppliers', new TableIndex({
                name: 'IDX_suppliers_margin_rate',
                columnNames: ['defaultMarginRate']
            }));

            await queryRunner.createIndex('suppliers', new TableIndex({
                name: 'IDX_suppliers_order_stats',
                columnNames: ['totalOrders', 'totalOrderValue']
            }));
        }

        // Commission performance indexes
        if (await queryRunner.hasTable('vendor_commissions')) {
            await queryRunner.createIndex('vendor_commissions', new TableIndex({
                name: 'IDX_vendor_commissions_vendor_period',
                columnNames: ['vendorId', 'period']
            }));

            await queryRunner.createIndex('vendor_commissions', new TableIndex({
                name: 'IDX_vendor_commissions_status_period',
                columnNames: ['status', 'period']
            }));

            await queryRunner.createIndex('vendor_commissions', new TableIndex({
                name: 'IDX_vendor_commissions_payable',
                columnNames: ['totalPayable']
            }));

            await queryRunner.createIndex('vendor_commissions', new TableIndex({
                name: 'IDX_vendor_commissions_created',
                columnNames: ['created_at']
            }));

            await queryRunner.createIndex('vendor_commissions', new TableIndex({
                name: 'IDX_vendor_commissions_approved',
                columnNames: ['approvedAt']
            }));
        }

        // Settlement performance indexes  
        if (await queryRunner.hasTable('commission_settlements')) {
            await queryRunner.createIndex('commission_settlements', new TableIndex({
                name: 'IDX_commission_settlements_supplier_period',
                columnNames: ['supplierId', 'period']
            }));

            await queryRunner.createIndex('commission_settlements', new TableIndex({
                name: 'IDX_commission_settlements_status_period',
                columnNames: ['status', 'period']
            }));

            await queryRunner.createIndex('commission_settlements', new TableIndex({
                name: 'IDX_commission_settlements_payable',
                columnNames: ['totalPayable']
            }));

            await queryRunner.createIndex('commission_settlements', new TableIndex({
                name: 'IDX_commission_settlements_settlement_date',
                columnNames: ['settlementDate']
            }));

            await queryRunner.createIndex('commission_settlements', new TableIndex({
                name: 'IDX_commission_settlements_payment_date',
                columnNames: ['paymentDate']
            }));
        }

        // Product performance indexes
        if (await queryRunner.hasTable('supplier_products')) {
            await queryRunner.createIndex('supplier_products', new TableIndex({
                name: 'IDX_supplier_products_supplier_status',
                columnNames: ['supplierId', 'status']
            }));

            await queryRunner.createIndex('supplier_products', new TableIndex({
                name: 'IDX_supplier_products_category_status',
                columnNames: ['category', 'status']
            }));

            await queryRunner.createIndex('supplier_products', new TableIndex({
                name: 'IDX_supplier_products_price_range',
                columnNames: ['supplierPrice', 'calculatedSellingPrice']
            }));

            await queryRunner.createIndex('supplier_products', new TableIndex({
                name: 'IDX_supplier_products_quantity',
                columnNames: ['availableQuantity']
            }));

            await queryRunner.createIndex('supplier_products', new TableIndex({
                name: 'IDX_supplier_products_performance',
                columnNames: ['orderCount', 'totalRevenue']
            }));

            await queryRunner.createIndex('supplier_products', new TableIndex({
                name: 'IDX_supplier_products_sync_status',
                columnNames: ['lastSyncAt', 'syncStatus']
            }));
        }

        // Inventory performance indexes
        if (await queryRunner.hasTable('inventories')) {
            await queryRunner.createIndex('inventories', new TableIndex({
                name: 'IDX_inventories_sku_status',
                columnNames: ['sku', 'status']
            }));

            await queryRunner.createIndex('inventories', new TableIndex({
                name: 'IDX_inventories_quantity_reorder',
                columnNames: ['quantity', 'reorderPoint']
            }));

            await queryRunner.createIndex('inventories', new TableIndex({
                name: 'IDX_inventories_supplier_status',
                columnNames: ['supplierId', 'status']
            }));

            await queryRunner.createIndex('inventories', new TableIndex({
                name: 'IDX_inventories_last_updated',
                columnNames: ['lastUpdated']
            }));

            await queryRunner.createIndex('inventories', new TableIndex({
                name: 'IDX_inventories_turnover',
                columnNames: ['turnoverRate', 'averageLeadTime']
            }));
        }

        // Order performance indexes
        if (await queryRunner.hasTable('orders')) {
            await queryRunner.createIndex('orders', new TableIndex({
                name: 'IDX_orders_vendor_status',
                columnNames: ['vendorId', 'status']
            }));

            await queryRunner.createIndex('orders', new TableIndex({
                name: 'IDX_orders_created_status',
                columnNames: ['created_at', 'status']
            }));

            await queryRunner.createIndex('orders', new TableIndex({
                name: 'IDX_orders_total_amount',
                columnNames: ['totalAmount']
            }));

            await queryRunner.createIndex('orders', new TableIndex({
                name: 'IDX_orders_affiliate_vendor',
                columnNames: ['affiliateId', 'vendorId']
            }));
        }

        // User activity indexes for performance monitoring
        if (await queryRunner.hasTable('user_activity_logs')) {
            await queryRunner.createIndex('user_activity_logs', new TableIndex({
                name: 'IDX_user_activity_logs_activity_date',
                columnNames: ['activityType', 'created_at']
            }));

            await queryRunner.createIndex('user_activity_logs', new TableIndex({
                name: 'IDX_user_activity_logs_user_date',
                columnNames: ['userId', 'created_at']
            }));
        }

        // Analytics optimization indexes
        if (await queryRunner.hasTable('stock_movements')) {
            await queryRunner.createIndex('stock_movements', new TableIndex({
                name: 'IDX_stock_movements_type_date',
                columnNames: ['movementType', 'created_at']
            }));

            await queryRunner.createIndex('stock_movements', new TableIndex({
                name: 'IDX_stock_movements_inventory_date',
                columnNames: ['inventoryId', 'created_at']
            }));

            await queryRunner.createIndex('stock_movements', new TableIndex({
                name: 'IDX_stock_movements_reference',
                columnNames: ['referenceType', 'referenceNumber']
            }));
        }

        // Performance monitoring table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "system_performance_logs" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "endpoint" varchar(255) NOT NULL,
                "method" varchar(10) NOT NULL,
                "responseTime" integer NOT NULL,
                "statusCode" integer NOT NULL,
                "userId" uuid,
                "userRole" varchar(50),
                "queryCount" integer DEFAULT 0,
                "cacheHit" boolean DEFAULT false,
                "errorMessage" text,
                "requestSize" integer,
                "responseSize" integer,
                "created_at" timestamp DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await queryRunner.createIndex('system_performance_logs', new TableIndex({
            name: 'IDX_performance_logs_endpoint_date',
            columnNames: ['endpoint', 'created_at']
        }));

        await queryRunner.createIndex('system_performance_logs', new TableIndex({
            name: 'IDX_performance_logs_response_time',
            columnNames: ['responseTime']
        }));

        await queryRunner.createIndex('system_performance_logs', new TableIndex({
            name: 'IDX_performance_logs_status_code',
            columnNames: ['statusCode']
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop performance monitoring table
        await queryRunner.query(`DROP TABLE IF EXISTS "system_performance_logs"`);

        // Drop all created indexes
        const indexesToDrop = [
            // Vendor indexes
            'IDX_vendor_info_status_created',
            'IDX_vendor_info_type_status', 
            'IDX_vendor_info_revenue',
            'IDX_vendor_info_sales',
            
            // Supplier indexes
            'IDX_suppliers_status_type',
            'IDX_suppliers_contact_email',
            'IDX_suppliers_company_name',
            'IDX_suppliers_margin_rate',
            'IDX_suppliers_order_stats',
            
            // Commission indexes
            'IDX_vendor_commissions_vendor_period',
            'IDX_vendor_commissions_status_period',
            'IDX_vendor_commissions_payable',
            'IDX_vendor_commissions_created',
            'IDX_vendor_commissions_approved',
            
            // Settlement indexes
            'IDX_commission_settlements_supplier_period',
            'IDX_commission_settlements_status_period',
            'IDX_commission_settlements_payable',
            'IDX_commission_settlements_settlement_date',
            'IDX_commission_settlements_payment_date',
            
            // Product indexes
            'IDX_supplier_products_supplier_status',
            'IDX_supplier_products_category_status',
            'IDX_supplier_products_price_range',
            'IDX_supplier_products_quantity',
            'IDX_supplier_products_performance',
            'IDX_supplier_products_sync_status',
            
            // Inventory indexes
            'IDX_inventories_sku_status',
            'IDX_inventories_quantity_reorder',
            'IDX_inventories_supplier_status',
            'IDX_inventories_last_updated',
            'IDX_inventories_turnover',
            
            // Order indexes
            'IDX_orders_vendor_status',
            'IDX_orders_created_status',
            'IDX_orders_total_amount',
            'IDX_orders_affiliate_vendor',
            
            // Activity indexes
            'IDX_user_activity_logs_activity_date',
            'IDX_user_activity_logs_user_date',
            
            // Stock movement indexes
            'IDX_stock_movements_type_date',
            'IDX_stock_movements_inventory_date',
            'IDX_stock_movements_reference'
        ];

        for (const indexName of indexesToDrop) {
            try {
                await queryRunner.query(`DROP INDEX IF EXISTS "${indexName}"`);
            } catch (error) {
                // Index might not exist, continue
                // Index not found, skipping...
            }
        }
    }
}
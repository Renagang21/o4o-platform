/**
 * SupplierOps Install Hook
 *
 * Called when the app is first installed
 */

import type { DataSource } from 'typeorm';

/**
 * Install hook - creates necessary database tables
 *
 * @param dataSource - TypeORM DataSource (optional, for table creation)
 */
export async function onInstall(dataSource?: DataSource): Promise<void> {
  console.log('[SupplierOps] Running install hook...');

  if (dataSource) {
    // Create SupplierOps-specific tables
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS supplierops_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id UUID NOT NULL,
        setting_key VARCHAR(255) NOT NULL,
        setting_value TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(supplier_id, setting_key)
      )
    `);

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS supplierops_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id UUID NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('[SupplierOps] Tables created successfully');
  }

  console.log('[SupplierOps] Install completed');
}

export default onInstall;

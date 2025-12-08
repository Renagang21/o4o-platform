/**
 * SellerOps Install Hook
 *
 * Called when the SellerOps app is first installed
 */

import { DataSource } from 'typeorm';

export async function onInstall(dataSource: DataSource): Promise<void> {
  console.log('[sellerops] Installing SellerOps App...');

  // Create SellerOps specific tables if needed
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // Create sellerops_settings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sellerops_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL,
        key VARCHAR(255) NOT NULL,
        value JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(seller_id, key)
      )
    `);

    // Create sellerops_notifications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sellerops_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        read BOOLEAN DEFAULT FALSE,
        data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sellerops_documents table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sellerops_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        content TEXT,
        is_published BOOLEAN DEFAULT TRUE,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('[sellerops] Tables created successfully');
  } catch (error) {
    console.error('[sellerops] Error creating tables:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }

  console.log('[sellerops] SellerOps App installed successfully');
}

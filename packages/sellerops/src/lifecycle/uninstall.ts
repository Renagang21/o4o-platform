/**
 * SellerOps Uninstall Hook
 *
 * Called when the SellerOps app is uninstalled
 */

import { DataSource } from 'typeorm';

export async function onUninstall(dataSource: DataSource): Promise<void> {
  console.log('[sellerops] Uninstalling SellerOps App...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // Drop SellerOps specific tables
    console.log('[sellerops] Dropping SellerOps tables...');

    await queryRunner.query(`DROP TABLE IF EXISTS sellerops_settings`);
    await queryRunner.query(`DROP TABLE IF EXISTS sellerops_notifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS sellerops_documents`);

    console.log('[sellerops] Tables dropped successfully');
  } catch (error) {
    console.error('[sellerops] Error dropping tables:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }

  console.log('[sellerops] SellerOps App uninstalled successfully');
}

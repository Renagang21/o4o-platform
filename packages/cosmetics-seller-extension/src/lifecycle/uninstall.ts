/**
 * Cosmetics Seller Extension - Uninstall Hook
 *
 * 앱 제거 시 실행되는 훅
 */

import type { DataSource } from 'typeorm';

export interface UninstallContext {
  dataSource: DataSource;
  appId: string;
  keepData?: boolean;
}

export async function uninstall(context: UninstallContext): Promise<void> {
  const { dataSource, appId, keepData = true } = context;

  console.log(`[${appId}] Uninstalling cosmetics-seller-extension...`);

  if (keepData) {
    console.log(`[${appId}] Data preservation enabled. Tables will not be dropped.`);
    console.log(`[${appId}] Uninstallation completed (data preserved).`);
    return;
  }

  // If keepData is false, drop tables (use with caution!)
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();

    console.warn(`[${appId}] WARNING: Dropping all extension tables...`);

    const tables = [
      'seller_kpis',
      'seller_consultation_logs',
      'seller_inventory',
      'seller_samples',
      'seller_displays',
    ];

    for (const table of tables) {
      const hasTable = await queryRunner.hasTable(table);
      if (hasTable) {
        await queryRunner.dropTable(table);
        console.log(`[${appId}] Dropped table '${table}'.`);
      }
    }

    console.log(`[${appId}] Uninstallation completed (data removed).`);
  } finally {
    await queryRunner.release();
  }
}

export default uninstall;

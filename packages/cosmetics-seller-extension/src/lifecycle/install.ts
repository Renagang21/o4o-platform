/**
 * Cosmetics Seller Extension - Install Hook
 *
 * 앱 설치 시 실행되는 훅
 */

import type { DataSource } from 'typeorm';

export interface InstallContext {
  dataSource: DataSource;
  appId: string;
}

export async function install(context: InstallContext): Promise<void> {
  const { dataSource, appId } = context;

  console.log(`[${appId}] Installing cosmetics-seller-extension...`);

  // Check if required tables exist (they should be created by migrations)
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();

    const tables = [
      'seller_displays',
      'seller_samples',
      'seller_inventory',
      'seller_consultation_logs',
      'seller_kpis',
    ];

    for (const table of tables) {
      const hasTable = await queryRunner.hasTable(table);
      if (!hasTable) {
        console.warn(`[${appId}] Warning: Table '${table}' not found. Please run migrations.`);
      } else {
        console.log(`[${appId}] Table '${table}' verified.`);
      }
    }

    console.log(`[${appId}] Installation completed successfully.`);
  } finally {
    await queryRunner.release();
  }
}

export default install;

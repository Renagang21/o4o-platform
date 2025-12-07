/**
 * Dropshipping-Core Install Hook
 *
 * Called when the Dropshipping-Core app is installed
 */

import { DataSource } from 'typeorm';

export async function onInstall(dataSource: DataSource): Promise<void> {
  console.log('[dropshipping-core] Installing Dropshipping Core...');

  try {
    // DB migration will be handled by TypeORM
    // Tables will be created automatically based on entities

    console.log('[dropshipping-core] Creating default commission rule...');

    // 기본 수수료 규칙 생성 (10% 퍼센트 기반)
    await dataSource.query(`
      INSERT INTO dropshipping_commission_rules
      (id, name, description, type, rate, priority, status, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(),
        'Default Commission Rule',
        'Default 10% commission rate for all products',
        'percentage',
        10.00,
        0,
        'active',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);

    console.log('[dropshipping-core] Dropshipping Core installed successfully');
  } catch (error) {
    console.error('[dropshipping-core] Error during installation:', error);
    throw error;
  }
}

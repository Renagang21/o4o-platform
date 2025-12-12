/**
 * Pharmaceutical Core Uninstall Hook
 *
 * Called when the app is uninstalled.
 * Cleans up data (with user confirmation for destructive operations).
 *
 * @package @o4o/pharmaceutical-core
 */

import type { DataSource } from 'typeorm';

/**
 * Uninstall hook - cleans up data
 */
export async function onUninstall(
  dataSource: DataSource,
  options: { removeData?: boolean } = {}
): Promise<void> {
  console.log('[pharmaceutical-core] Running uninstall hook...');

  if (options.removeData) {
    console.warn('[pharmaceutical-core] WARNING: Removing all pharmaceutical data!');

    // 주의: 실제 운영에서는 데이터 삭제 전 백업 권장
    // 여기서는 테이블 drop 대신 데이터만 삭제
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      // 의존성 순서대로 삭제 (역순)
      await queryRunner.query('DELETE FROM pharma_dispatches');
      await queryRunner.query('DELETE FROM pharma_orders');
      await queryRunner.query('DELETE FROM pharma_settlement_batches');
      await queryRunner.query('DELETE FROM pharma_offers');
      await queryRunner.query('DELETE FROM pharma_product_masters');

      await queryRunner.commitTransaction();
      console.log('[pharmaceutical-core] All data removed');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('[pharmaceutical-core] Failed to remove data:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  } else {
    console.log('[pharmaceutical-core] Data preserved (removeData=false)');
  }

  console.log('[pharmaceutical-core] Uninstallation completed');
}

export default onUninstall;

/**
 * yaksa-accounting Install Lifecycle
 *
 * Phase 1: Create database tables for Expense & MonthlyClose
 */

import type { DataSource } from 'typeorm';
import { ExpenseRecord, MonthlyClose } from '../backend/entities';

/**
 * Get entities for registration
 */
export function getEntities() {
  return [ExpenseRecord, MonthlyClose];
}

export async function install(dataSource: DataSource): Promise<void> {
  console.log('[yaksa-accounting] Installing...');
  console.log('[yaksa-accounting] Phase 1: Expense Entry & Cashbook Core');

  try {
    // Synchronize entities (development only)
    // In production, use migrations
    if (process.env.NODE_ENV !== 'production') {
      console.log('[yaksa-accounting] Synchronizing entities...');
      await dataSource.synchronize();
      console.log('[yaksa-accounting] Entities synchronized');
    } else {
      console.log('[yaksa-accounting] Production mode: Use migrations');
    }

    console.log('[yaksa-accounting] Install completed');
  } catch (error) {
    console.error('[yaksa-accounting] Install failed:', error);
    throw error;
  }
}

export default install;

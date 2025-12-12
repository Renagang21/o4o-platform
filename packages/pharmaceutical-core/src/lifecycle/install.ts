/**
 * Pharmaceutical Core Install Hook
 *
 * Called when the app is first installed.
 * Creates database tables and initializes default data.
 *
 * @package @o4o/pharmaceutical-core
 */

import type { DataSource } from 'typeorm';
import { pharmaEntities } from '../entities/index.js';

/**
 * Install hook - creates tables
 */
export async function onInstall(dataSource: DataSource): Promise<void> {
  console.log('[pharmaceutical-core] Running install hook...');

  // 1. Entity 동기화 (테이블 생성)
  console.log('[pharmaceutical-core] Synchronizing entities...');
  await dataSource.synchronize();
  console.log('[pharmaceutical-core] Entities synchronized');

  // 2. 기본 설정 초기화
  console.log('[pharmaceutical-core] Initializing default settings...');
  // (향후 설정 테이블이 필요하면 여기서 초기화)

  console.log('[pharmaceutical-core] Installation completed');
}

export default onInstall;

/**
 * Forum Pharmacy Extension - Activate Lifecycle
 */

import type { DataSource } from 'typeorm';
import { pharmacyForumService, pharmacyNotificationService } from '../backend/services/index.js';

export async function activate(dataSource: DataSource): Promise<void> {
  console.log('[forum-pharmacy] Activating extension...');

  // 서비스 초기화
  pharmacyForumService.init(dataSource);
  pharmacyNotificationService.init(dataSource);

  console.log('[forum-pharmacy] Activation complete');
}

export default activate;

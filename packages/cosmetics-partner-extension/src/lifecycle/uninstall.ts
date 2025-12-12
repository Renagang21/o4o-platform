/**
 * Cosmetics Partner Extension Uninstall Hook
 *
 * 제거 시 실행되는 정리 작업
 */

import type { DataSource } from 'typeorm';

export interface UninstallContext {
  dataSource: DataSource;
  appId: string;
  keepData?: boolean;
}

export async function uninstall(context: UninstallContext): Promise<void> {
  const { appId, keepData } = context;
  console.log(`[${appId}] Uninstalling cosmetics-partner-extension...`);

  if (!keepData) {
    console.log(`[${appId}] Data will be preserved (keepData: true by default)`);
  }

  // 제거 시 수행할 작업
  // - 설정 정리 (optional)
  // - 캐시 정리 (optional)
  // - 데이터 백업 (optional, if configured)

  console.log(`[${appId}] cosmetics-partner-extension uninstalled successfully.`);
}

export default uninstall;

/**
 * Cosmetics Partner Extension Install Hook
 *
 * 설치 시 실행되는 초기화 작업
 */

import type { DataSource } from 'typeorm';

export interface InstallContext {
  dataSource: DataSource;
  appId: string;
}

export async function install(context: InstallContext): Promise<void> {
  const { appId } = context;
  console.log(`[${appId}] Installing cosmetics-partner-extension...`);

  // 기본 설정 초기화 (필요한 경우)
  // - Partner 역할 기본 설정
  // - 기본 커미션 설정
  // - 초기 데이터

  console.log(`[${appId}] cosmetics-partner-extension installed successfully.`);
}

export default install;

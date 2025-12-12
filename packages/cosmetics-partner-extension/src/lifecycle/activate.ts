/**
 * Cosmetics Partner Extension Activate Hook
 *
 * 활성화 시 실행되는 작업
 */

import type { DataSource } from 'typeorm';
import type { Router } from 'express';

export interface ActivateContext {
  dataSource: DataSource;
  appId: string;
  router?: Router;
}

export interface ActivateResult {
  routes?: Router;
  services?: Record<string, unknown>;
}

export async function activate(context: ActivateContext): Promise<ActivateResult> {
  const { appId } = context;
  console.log(`[${appId}] Activating cosmetics-partner-extension...`);

  // 활성화 시 수행할 작업
  // - Admin 메뉴 등록
  // - API 라우트 활성화
  // - 이벤트 리스너 등록

  console.log(`[${appId}] cosmetics-partner-extension activated successfully.`);

  return {
    services: {},
  };
}

export default activate;

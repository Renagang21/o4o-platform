/**
 * AnnualFee-Yaksa Extension - Lifecycle Hooks
 *
 * AppStore 표준 준수를 위한 Lifecycle 구현
 * - install: 초기 설정
 * - activate: 서비스 활성화
 * - deactivate: 서비스 비활성화
 * - uninstall: 정리
 */

import { DataSource } from 'typeorm';

export interface LifecycleContext {
  dataSource: DataSource;
  options?: {
    preserveData?: boolean;
  };
}

/**
 * Install hook - Extension 최초 설치 시 실행
 */
export async function install(context: LifecycleContext): Promise<void> {
  console.log('[annualfee-yaksa] Installing...');
  // 초기 설정 로직
  console.log('[annualfee-yaksa] Installation complete');
}

/**
 * Activate hook - Extension 활성화 시 실행
 */
export async function activate(context: LifecycleContext): Promise<void> {
  console.log('[annualfee-yaksa] Activating...');
  // 활성화 로직
  console.log('[annualfee-yaksa] Activation complete');
}

/**
 * Deactivate hook - Extension 비활성화 시 실행
 */
export async function deactivate(context: LifecycleContext): Promise<void> {
  console.log('[annualfee-yaksa] Deactivating...');
  // 비활성화 로직
  console.log('[annualfee-yaksa] Deactivation complete');
}

/**
 * Uninstall hook - Extension 제거 시 실행
 */
export async function uninstall(context: LifecycleContext): Promise<void> {
  console.log('[annualfee-yaksa] Uninstalling...');

  if (context.options?.preserveData) {
    console.log('[annualfee-yaksa] Data preservation enabled, skipping cleanup');
  } else {
    // 데이터 정리 로직
    console.log('[annualfee-yaksa] Cleanup complete');
  }

  console.log('[annualfee-yaksa] Uninstallation complete');
}

export const lifecycle = {
  install,
  activate,
  deactivate,
  uninstall,
};

export default lifecycle;

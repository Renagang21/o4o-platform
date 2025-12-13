/**
 * diabetes-pharmacy Uninstall Lifecycle
 *
 * 앱 삭제 시 호출
 *
 * @package @o4o/diabetes-pharmacy
 */

import type { AppLifecycleContext } from '@o4o/types';

export interface UninstallResult {
  success: boolean;
  message: string;
  warnings?: string[];
  errors?: string[];
}

/**
 * Uninstall Handler
 *
 * 1. 비활성화 상태 확인
 * 2. 앱 관련 데이터 정리
 * 3. 설정 삭제
 */
export async function uninstall(context: AppLifecycleContext): Promise<UninstallResult> {
  console.log('[diabetes-pharmacy] Uninstalling...');

  const warnings: string[] = [];

  try {
    // 1. 비활성화 상태 확인
    const isDeactivated = await checkDeactivationStatus(context);
    if (!isDeactivated) {
      return {
        success: false,
        message: '앱이 먼저 비활성화되어야 합니다.',
        errors: ['먼저 비활성화 후 삭제해주세요.'],
      };
    }

    // 2. 앱 관련 데이터 확인
    const hasData = await checkAppData(context);
    if (hasData) {
      warnings.push('앱 관련 데이터가 존재합니다. 데이터는 보존됩니다.');
    }

    // 3. 설정 삭제
    await removeSettings(context);

    // 4. 캐시 정리
    await clearCaches(context);

    console.log('[diabetes-pharmacy] Uninstallation completed');
    return {
      success: true,
      message: 'diabetes-pharmacy 삭제 완료',
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    console.error('[diabetes-pharmacy] Uninstallation failed:', error);
    return {
      success: false,
      message: '삭제 중 오류 발생',
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * 비활성화 상태 확인
 */
async function checkDeactivationStatus(context: AppLifecycleContext): Promise<boolean> {
  console.log('[diabetes-pharmacy] Checking deactivation status...');
  // Phase 2: AppStore 상태 확인
  return true;
}

/**
 * 앱 데이터 확인
 */
async function checkAppData(context: AppLifecycleContext): Promise<boolean> {
  console.log('[diabetes-pharmacy] Checking app data...');
  // Phase 2: Action 로그 등 데이터 확인
  return false;
}

/**
 * 설정 삭제
 */
async function removeSettings(context: AppLifecycleContext): Promise<void> {
  console.log('[diabetes-pharmacy] Removing settings...');
  // Phase 2: 설정 저장소에서 삭제
}

/**
 * 캐시 정리
 */
async function clearCaches(context: AppLifecycleContext): Promise<void> {
  console.log('[diabetes-pharmacy] Clearing caches...');
  // Phase 2: 캐시 정리
}

export default uninstall;

/**
 * diabetes-pharmacy Install Lifecycle
 *
 * AppStore를 통해 앱 설치 시 호출
 *
 * @package @o4o/diabetes-pharmacy
 */

import type { AppLifecycleContext } from '@o4o/types';

export interface InstallResult {
  success: boolean;
  message: string;
  errors?: string[];
}

/**
 * Install Handler
 *
 * 1. diabetes-core 의존성 확인
 * 2. 필요한 테이블 존재 확인
 * 3. 초기 설정 생성
 */
export async function install(context: AppLifecycleContext): Promise<InstallResult> {
  console.log('[diabetes-pharmacy] Installing...');

  try {
    // 1. diabetes-core 의존성 확인
    const coreAvailable = await checkCoreDependency(context);
    if (!coreAvailable) {
      return {
        success: false,
        message: 'diabetes-core가 설치되어 있지 않습니다.',
        errors: ['diabetes-core 먼저 설치 필요'],
      };
    }

    // 2. 테이블 존재 확인 (Phase 2에서는 스킵)
    // diabetes-pharmacy는 자체 Entity가 없음

    // 3. 초기 설정 생성
    await createDefaultSettings(context);

    console.log('[diabetes-pharmacy] Installation completed successfully');
    return {
      success: true,
      message: 'diabetes-pharmacy 설치 완료',
    };
  } catch (error) {
    console.error('[diabetes-pharmacy] Installation failed:', error);
    return {
      success: false,
      message: '설치 중 오류 발생',
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * diabetes-core 의존성 확인
 */
async function checkCoreDependency(context: AppLifecycleContext): Promise<boolean> {
  // Phase 2: 기본적으로 true 반환
  // 실제 구현 시 AppStore에서 diabetes-core 설치 상태 확인
  console.log('[diabetes-pharmacy] Checking diabetes-core dependency...');
  return true;
}

/**
 * 기본 설정 생성
 */
async function createDefaultSettings(context: AppLifecycleContext): Promise<void> {
  console.log('[diabetes-pharmacy] Creating default settings...');
  // Phase 2: 설정 저장소 사용 시 구현
}

export default install;

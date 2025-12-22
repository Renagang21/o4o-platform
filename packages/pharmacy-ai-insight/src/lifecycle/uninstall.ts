/**
 * pharmacy-ai-insight Uninstall Lifecycle
 *
 * @package @o4o/pharmacy-ai-insight
 */

import type { AppLifecycleContext } from '@o4o/types';

export interface UninstallResult {
  success: boolean;
  message: string;
  warnings?: string[];
  errors?: string[];
}

export async function uninstall(context: AppLifecycleContext): Promise<UninstallResult> {
  console.log('[pharmacy-ai-insight] Uninstalling...');

  const warnings: string[] = [];

  try {
    // 1. 비활성화 상태 확인
    const isDeactivated = await checkDeactivationStatus(context);
    if (!isDeactivated) {
      return {
        success: false,
        message: '먼저 비활성화가 필요합니다.',
        errors: ['앱 비활성화 후 삭제해주세요.'],
      };
    }

    // 2. 설정 삭제
    await removeSettings(context);

    console.log('[pharmacy-ai-insight] Uninstallation completed');
    return {
      success: true,
      message: 'pharmacy-ai-insight 삭제 완료',
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    console.error('[pharmacy-ai-insight] Uninstallation failed:', error);
    return {
      success: false,
      message: '삭제 중 오류 발생',
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

async function checkDeactivationStatus(context: AppLifecycleContext): Promise<boolean> {
  console.log('[pharmacy-ai-insight] Checking deactivation status...');
  return true;
}

async function removeSettings(context: AppLifecycleContext): Promise<void> {
  console.log('[pharmacy-ai-insight] Removing settings...');
}

export default uninstall;

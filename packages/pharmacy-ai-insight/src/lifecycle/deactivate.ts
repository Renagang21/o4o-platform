/**
 * pharmacy-ai-insight Deactivate Lifecycle
 *
 * @package @o4o/pharmacy-ai-insight
 */

import type { AppLifecycleContext } from '@o4o/types';

export interface DeactivateResult {
  success: boolean;
  message: string;
  warnings?: string[];
  errors?: string[];
}

export async function deactivate(context: AppLifecycleContext): Promise<DeactivateResult> {
  console.log('[pharmacy-ai-insight] Deactivating...');

  try {
    // 1. AI 서비스 정리
    await disposeAiService(context);

    // 2. 캐시 정리
    await clearCaches(context);

    console.log('[pharmacy-ai-insight] Deactivation completed');
    return {
      success: true,
      message: 'pharmacy-ai-insight 비활성화 완료',
    };
  } catch (error) {
    console.error('[pharmacy-ai-insight] Deactivation failed:', error);
    return {
      success: false,
      message: '비활성화 중 오류 발생',
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

async function disposeAiService(context: AppLifecycleContext): Promise<void> {
  console.log('[pharmacy-ai-insight] Disposing AI service...');
}

async function clearCaches(context: AppLifecycleContext): Promise<void> {
  console.log('[pharmacy-ai-insight] Clearing caches...');
}

export default deactivate;

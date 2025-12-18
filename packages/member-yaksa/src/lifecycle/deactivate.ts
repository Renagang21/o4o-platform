/**
 * member-yaksa Deactivate Lifecycle
 *
 * Phase 0: 구조 고정 단계
 * - 라우트 비활성화
 * - 리소스 정리
 */

export interface DeactivateContext {
  appId: string;
  version: string;
}

export interface DeactivateResult {
  success: boolean;
  message: string;
}

/**
 * Deactivate handler
 *
 * 앱 비활성화 시 실행
 * - 라우트 제거
 * - 리소스 해제
 */
export async function deactivate(context: DeactivateContext): Promise<DeactivateResult> {
  console.log('[member-yaksa] Deactivate started');
  console.log(`[member-yaksa] App ID: ${context.appId}`);
  console.log(`[member-yaksa] Version: ${context.version}`);

  // 라우트 비활성화
  const routes = [
    '/member/home',
    '/member/profile',
    '/member/pharmacy',
  ];

  console.log('[member-yaksa] Deregistering routes:', routes);

  // 리소스 정리
  console.log('[member-yaksa] Cleaning up resources...');

  console.log('[member-yaksa] Deactivate completed');

  return {
    success: true,
    message: 'member-yaksa deactivated successfully',
  };
}

export default deactivate;

/**
 * member-yaksa Activate Lifecycle
 *
 * Phase 0: 구조 고정 단계
 * - AppRegistry 등록
 * - 기본 라우트 활성화
 * - 권한 스코프 선언 (member 전용)
 */

export interface ActivateContext {
  appId: string;
  version: string;
  router?: unknown;
  dataSource?: unknown;
}

export interface ActivateResult {
  success: boolean;
  message: string;
  registeredRoutes?: string[];
}

/**
 * Activate handler
 *
 * 앱 활성화 시 실행
 * - 라우트 등록
 * - 권한 스코프 활성화
 */
export async function activate(context: ActivateContext): Promise<ActivateResult> {
  console.log('[member-yaksa] Activate started');
  console.log(`[member-yaksa] App ID: ${context.appId}`);
  console.log(`[member-yaksa] Version: ${context.version}`);

  // Phase 0: 라우트 스켈레톤만 등록
  const routes = [
    '/member/home',
    '/member/profile',
    '/member/pharmacy',
  ];

  console.log('[member-yaksa] Registering routes:', routes);

  // 권한 스코프 선언
  const permissionScopes = {
    read: ['member:profile', 'member:pharmacy', 'member:home'],
    write: ['member:profile:self', 'member:pharmacy:self'],
    targetRoles: ['pharmacist', 'member'],
  };

  console.log('[member-yaksa] Permission scopes:', permissionScopes);

  console.log('[member-yaksa] Activate completed');

  return {
    success: true,
    message: 'member-yaksa activated successfully',
    registeredRoutes: routes,
  };
}

export default activate;

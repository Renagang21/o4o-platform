/**
 * member-yaksa Activate Lifecycle
 *
 * Phase 1: MemberProfile API 활성화
 * - AppRegistry 등록
 * - 라우트 활성화
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
  apiEndpoints?: string[];
}

/**
 * Activate handler
 *
 * Phase 1: MemberProfile API 라우트 등록
 */
export async function activate(context: ActivateContext): Promise<ActivateResult> {
  console.log('[member-yaksa] Activate started');
  console.log(`[member-yaksa] App ID: ${context.appId}`);
  console.log(`[member-yaksa] Version: ${context.version}`);

  // Phase 1: 라우트 등록
  const routes = [
    '/member/health',
    '/member/home',
    '/member/profile/me',
    '/member/profile/:userId',
    '/member/profile/sync-from-reporting',
    '/member/pharmacy',
  ];

  // API 엔드포인트
  const apiEndpoints = [
    'GET /api/v1/yaksa/member/health',
    'GET /api/v1/yaksa/member/profile/me',
    'PATCH /api/v1/yaksa/member/profile/me',
    'GET /api/v1/yaksa/member/profile/:userId',
    'POST /api/v1/yaksa/member/profile/sync-from-reporting',
  ];

  console.log('[member-yaksa] Registering routes:', routes);
  console.log('[member-yaksa] API endpoints:', apiEndpoints);

  // 권한 스코프 선언
  const permissionScopes = {
    read: ['member:profile:read', 'member:pharmacy:read', 'member:home:read'],
    write: ['member:profile:write:self', 'member:pharmacy:write:self'],
    admin: ['member:profile:admin'],
    targetRoles: ['pharmacist', 'member'],
  };

  console.log('[member-yaksa] Permission scopes:', permissionScopes);

  console.log('[member-yaksa] Activate completed (Phase 1 - MemberProfile)');

  return {
    success: true,
    message: 'member-yaksa activated successfully (Phase 1)',
    registeredRoutes: routes,
    apiEndpoints,
  };
}

export default activate;

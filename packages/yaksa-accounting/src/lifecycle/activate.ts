/**
 * yaksa-accounting Activate Lifecycle
 *
 * Phase 0: Register app and menu skeleton
 * - AppRegistry 등록
 * - Admin 메뉴 스켈레톤 활성화
 * - 조직 스코프 선언 (division / branch)
 */

export interface ActivateContext {
  appRegistry?: {
    register: (appId: string, config: unknown) => void;
  };
  menuRegistry?: {
    register: (menu: unknown) => void;
  };
}

export async function activate(context?: ActivateContext): Promise<void> {
  console.log('[yaksa-accounting] Activating...');

  // AppRegistry 등록
  if (context?.appRegistry) {
    context.appRegistry.register('yaksa-accounting', {
      type: 'extension',
      organizationScope: ['division', 'branch'],
      targetUsers: ['division-admin', 'branch-admin'],
    });
    console.log('[yaksa-accounting] Registered to AppRegistry');
  }

  // Admin 메뉴 스켈레톤 등록
  if (context?.menuRegistry) {
    context.menuRegistry.register({
      path: '/admin/yaksa/accounting',
      label: '회계 (출납)',
      icon: 'Calculator',
      children: [
        { path: '/admin/yaksa/accounting/expenses', label: '지출 기록' },
        { path: '/admin/yaksa/accounting/summary', label: '월/연간 요약' },
        { path: '/admin/yaksa/accounting/export', label: '엑셀/PDF 내보내기' },
      ],
    });
    console.log('[yaksa-accounting] Admin menu skeleton registered');
  }

  console.log('[yaksa-accounting] Activation completed');
  console.log('[yaksa-accounting] Organization Scope: division, branch');
}

export default activate;

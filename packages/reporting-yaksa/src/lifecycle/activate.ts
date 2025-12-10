import { ActivateContext } from '../types/context.js';

/**
 * Activate Hook
 *
 * reporting-yaksa 앱 활성화 시 실행되는 훅
 *
 * 1. 메뉴 등록 확인
 * 2. 권한 등록 확인
 * 3. 라우트 활성화
 */
export async function activate(context: ActivateContext): Promise<void> {
  const { previousVersion } = context;

  console.log('[reporting-yaksa] Activating...');

  if (previousVersion) {
    console.log(`[reporting-yaksa] Upgrading from version ${previousVersion}`);
  }

  // 메뉴 자동 등록은 AppStore에서 manifest 기반으로 처리
  // 여기서는 추가적인 활성화 로직만 처리

  console.log('[reporting-yaksa] Activation completed');
  console.log('[reporting-yaksa] Admin menu: /admin/reporting');
  console.log('[reporting-yaksa] Member menu: /member/reporting');
}

export default activate;

/**
 * yaksa-admin Activate Hook
 *
 * 앱 활성화 시 실행
 *
 * Phase 0 정책:
 * - AppRegistry 등록
 * - Admin 메뉴 스켈레톤 활성화
 * - 관리자 권한 스코프 선언 (division / branch)
 */

import type { DataSource } from 'typeorm';

/**
 * Admin 메뉴 구조 (Phase 0: 스켈레톤)
 *
 * /admin/yaksa
 * ├─ /members        (회원 승인/현황)
 * ├─ /reports        (신상신고 승인)
 * ├─ /officers       (임원 관리)
 * ├─ /education      (교육 이수 현황)
 * ├─ /fees           (회비 납부 현황)
 * └─ /forum          (forum-yaksa로 이동 링크)
 */
const ADMIN_MENU_SKELETON = {
  id: 'yaksa-admin',
  label: '지부/분회 관리',
  routes: [
    '/admin/yaksa',
    '/admin/yaksa/members',
    '/admin/yaksa/reports',
    '/admin/yaksa/officers',
    '/admin/yaksa/education',
    '/admin/yaksa/fees',
    '/admin/yaksa/forum',
  ],
};

/**
 * 권한 스코프 (Phase 0: 선언만)
 */
const PERMISSION_SCOPES = ['division', 'branch'];

export async function activate(_dataSource: DataSource): Promise<void> {
  console.log('[yaksa-admin] Activating...');

  // Phase 0: 메뉴 스켈레톤 로깅
  console.log('[yaksa-admin] Admin menu skeleton:', ADMIN_MENU_SKELETON.label);
  console.log('[yaksa-admin] Routes registered:', ADMIN_MENU_SKELETON.routes.length);

  // Phase 0: 권한 스코프 로깅
  console.log('[yaksa-admin] Permission scopes:', PERMISSION_SCOPES.join(', '));

  console.log('[yaksa-admin] Activated');
}

export default activate;

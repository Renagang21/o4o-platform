import { adminMenuStatic, MenuItem } from '@/admin/menu/admin-menu.static';
import { useDynamicCPTMenu, injectCPTMenuItems } from './useDynamicCPTMenu';

/**
 * 동적 메뉴 생성 - 모든 앱이 항상 활성화되어 있음
 * 앱 활성화/비활성화 시스템 제거됨
 */
export const useDynamicMenu = () => {
  const cptMenu = useDynamicCPTMenu();

  // CPT 메뉴 항목 주입
  const menuItemsWithCPT = injectCPTMenuItems(adminMenuStatic, cptMenu.cptMenuItems);

  return {
    menuItems: menuItemsWithCPT,
    isLoading: cptMenu.isLoading
  };
};
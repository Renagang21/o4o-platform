import { adminMenuStatic } from '@/admin/menu/admin-menu.static';
import { useDynamicCPTMenu, injectCPTMenuItems } from './useDynamicCPTMenu';

/**
 * 단순화된 메뉴 훅
 * - 모든 메뉴를 정적으로 표시
 * - 활성화/비활성화 로직 제거
 * - CPT 메뉴만 동적으로 추가
 */
export const useSimpleMenu = () => {
  // CPT 메뉴 아이템 가져오기
  const { cptMenuItems, isLoading: cptLoading } = useDynamicCPTMenu();
  
  // CPT 메뉴를 정적 메뉴에 삽입
  const menuItems = injectCPTMenuItems([...adminMenuStatic], cptMenuItems);

  return {
    menuItems,
    isLoading: cptLoading
  };
};
/**
 * Dynamic CPT Menu Hook
 * Fetches active CPTs and generates menu items
 */

import { useQuery } from '@tanstack/react-query';
import { MenuItem } from '@/admin/menu/admin-menu.static';
import { FileText, Package, FileCode, Database, Layout } from 'lucide-react';
import { authClient } from '@o4o/auth-client';

/**
 * CPT를 메뉴 아이템으로 변환
 */
export const useDynamicCPTMenu = () => {
  // 활성화된 CPT 목록 가져오기
  const { data: cptTypesResponse, isLoading } = useQuery({
    queryKey: ['cpt-menu-items'],
    queryFn: async () => {
      // Use public endpoint for menu items (doesn't require auth)
      const response = await authClient.api.get('/public/cpt/types');
      // API returns { success: true, data: [...] }
      const result = response.data?.data || response.data || [];
      // Ensure we always return an array
      return Array.isArray(result) ? result : [];
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const cptTypes = Array.isArray(cptTypesResponse) ? cptTypesResponse : [];

  // CPT를 메뉴 아이템으로 변환
  const generateCPTMenuItems = (): MenuItem[] => {
    const menuItems: MenuItem[] = [];

    // showInMenu가 true인 CPT만 필터링 (active 필드 사용)
    const menuCPTs = (cptTypes || [])
      .filter(cpt => cpt?.showInMenu && cpt?.active)
      .sort((a, b) => (a.menuPosition || 50) - (b.menuPosition || 50));

    if (menuCPTs.length > 0) {
      // 드롭쉬핑 CPT와 일반 CPT 분리
      const dropshippingCPTs = menuCPTs.filter(cpt => cpt.slug.startsWith('ds_'));
      const regularCPTs = menuCPTs.filter(cpt => !cpt.slug.startsWith('ds_'));

      // 드롭쉬핑 CPT 메뉴 생성
      if (dropshippingCPTs.length > 0) {
        const dropshippingChildren: MenuItem[] = dropshippingCPTs.map(cpt => {
          const IconComponent = getIconForCPT(cpt.icon);
          const cptName = cpt.name || cpt.labels?.singular || cpt.slug;
          const singularName = cpt.labels?.singular || cpt.name || cpt.slug;

          const children: MenuItem[] = [
            {
              id: `cpt-${cpt.slug}-all`,
              label: `모든 ${cptName}`,
              icon: <FileText className="w-4 h-4" />,
              path: `/cpt-engine/content/${cpt.slug}`
            },
            {
              id: `cpt-${cpt.slug}-new`,
              label: `새 ${singularName} 추가`,
              icon: <FileText className="w-4 h-4" />,
              path: `/cpt-engine/content/${cpt.slug}/new`
            },
            {
              id: `cpt-${cpt.slug}-categories`,
              label: '카테고리',
              icon: <FileText className="w-4 h-4" />,
              path: `/cpt-engine/taxonomies?cpt=${cpt.slug}`
            }
          ];

          return {
            id: `cpt-${cpt.slug}`,
            label: cptName,
            icon: <IconComponent className="w-5 h-5" />,
            children
          };
        });

        menuItems.push({
          id: 'dropshipping-cpt-content',
          label: 'CPT 콘텐츠 관리',
          icon: <Database className="w-5 h-5" />,
          children: dropshippingChildren
        });
      }

      // 일반 CPT 메뉴 생성 (드롭쉬핑이 아닌 것들)
      if (regularCPTs.length > 0) {
        const regularChildren: MenuItem[] = regularCPTs.map(cpt => {
          const IconComponent = getIconForCPT(cpt.icon);
          const cptName = cpt.name || cpt.labels?.singular || cpt.slug;
          const singularName = cpt.labels?.singular || cpt.name || cpt.slug;

          const children: MenuItem[] = [
            {
              id: `cpt-${cpt.slug}-all`,
              label: `모든 ${cptName}`,
              icon: <FileText className="w-4 h-4" />,
              path: `/cpt-engine/content/${cpt.slug}`
            },
            {
              id: `cpt-${cpt.slug}-new`,
              label: `새 ${singularName} 추가`,
              icon: <FileText className="w-4 h-4" />,
              path: `/cpt-engine/content/${cpt.slug}/new`
            },
            {
              id: `cpt-${cpt.slug}-categories`,
              label: '카테고리',
              icon: <FileText className="w-4 h-4" />,
              path: `/cpt-engine/taxonomies?cpt=${cpt.slug}`
            }
          ];

          return {
            id: `cpt-${cpt.slug}`,
            label: cptName,
            icon: <IconComponent className="w-5 h-5" />,
            children
          };
        });

        menuItems.push({
          id: 'custom-posts',
          label: '커스텀 콘텐츠',
          icon: <Package className="w-5 h-5" />,
          children: regularChildren
        });
      }
    }

    return menuItems;
  };

  // 아이콘 매핑 함수
  const getIconForCPT = (iconName?: string) => {
    const iconMap: Record<string, any> = {
      'file-text': FileText,
      'package': Package,
      'file-code': FileCode,
      'database': Database,
      'layout': Layout
    };

    return iconMap[iconName || 'file-text'] || FileText;
  };

  return {
    cptMenuItems: generateCPTMenuItems(),
    isLoading,
    cptTypes
  };
};

/**
 * 메뉴에 CPT 아이템을 삽입하는 유틸리티
 */
export const injectCPTMenuItems = (
  baseMenuItems: MenuItem[],
  cptMenuItems: MenuItem[]
): MenuItem[] => {
  if (cptMenuItems.length === 0) return baseMenuItems;

  const result = [...baseMenuItems];

  // 드롭쉬핑 CPT와 일반 CPT 분리
  const dropshippingCPTMenu = cptMenuItems.find(item => item.id === 'dropshipping-cpt-content');
  const regularCPTMenus = cptMenuItems.filter(item => item.id !== 'dropshipping-cpt-content');

  // 1. 드롭쉬핑 CPT는 드롭쉬핑 메뉴 하위에 추가
  if (dropshippingCPTMenu) {
    const dropshippingIndex = result.findIndex(item => item.id === 'dropshipping');

    if (dropshippingIndex !== -1) {
      const dropshippingMenu = result[dropshippingIndex];

      // 드롭쉬핑 메뉴에 children이 없으면 생성
      if (!dropshippingMenu.children) {
        dropshippingMenu.children = [];
      }

      // 이미 추가된 CPT 콘텐츠 관리 메뉴가 있는지 확인
      const existingCPTMenuIndex = dropshippingMenu.children.findIndex(
        child => child.id === 'dropshipping-cpt-content'
      );

      if (existingCPTMenuIndex !== -1) {
        // 기존 메뉴를 새 메뉴로 교체
        dropshippingMenu.children[existingCPTMenuIndex] = dropshippingCPTMenu;
      } else {
        // 없으면 추가
        dropshippingMenu.children.push(dropshippingCPTMenu);
      }
    }
  }

  // 2. 일반 CPT는 CPT Engine 다음에 삽입
  if (regularCPTMenus.length > 0) {
    const cptEngineIndex = result.findIndex(item => item.id === 'cpt-engine');

    if (cptEngineIndex !== -1) {
      // CPT Engine 바로 다음에 삽입
      result.splice(cptEngineIndex + 1, 0, ...regularCPTMenus);
    } else {
      // CPT Engine이 없으면 컨텐츠 관련 메뉴 다음에 삽입
      const postsIndex = result.findIndex(item => item.id === 'posts');
      if (postsIndex !== -1) {
        result.splice(postsIndex + 1, 0, ...regularCPTMenus);
      } else {
        // 적절한 위치를 찾지 못하면 마지막에 추가
        const collapseIndex = result.findIndex(item => item.id === 'collapse');
        if (collapseIndex !== -1) {
          result.splice(collapseIndex, 0, ...regularCPTMenus);
        } else {
          result.push(...regularCPTMenus);
        }
      }
    }
  }

  return result;
};
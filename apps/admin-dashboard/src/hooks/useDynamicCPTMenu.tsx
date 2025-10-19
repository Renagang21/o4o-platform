/**
 * Dynamic CPT Menu Hook
 * Fetches active CPTs and generates menu items
 */

import { useQuery } from '@tanstack/react-query';
import { MenuItem } from '@/config/wordpressMenuFinal';
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
      // "자체 글" 그룹 메뉴 생성
      const cptChildren: MenuItem[] = menuCPTs.map(cpt => {
        const IconComponent = getIconForCPT(cpt.icon);
        const cptName = cpt.name || cpt.labels?.singular || cpt.slug;
        const singularName = cpt.labels?.singular || cpt.name || cpt.slug;

        // Build children menu items
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

      // "자체 글" 부모 메뉴 추가
      menuItems.push({
        id: 'custom-posts',
        label: '자체 글',
        icon: <Package className="w-5 h-5" />,
        children: cptChildren
      });
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
  
  // CPT Engine 메뉴 다음 위치에 CPT 메뉴들을 삽입
  const cptEngineIndex = result.findIndex(item => item.id === 'cpt-engine');
  
  if (cptEngineIndex !== -1) {
    // CPT Engine 바로 다음에 삽입
    result.splice(cptEngineIndex + 1, 0, ...cptMenuItems);
  } else {
    // CPT Engine이 없으면 컨텐츠 관련 메뉴 다음에 삽입
    const postsIndex = result.findIndex(item => item.id === 'posts');
    if (postsIndex !== -1) {
      result.splice(postsIndex + 1, 0, ...cptMenuItems);
    } else {
      // 적절한 위치를 찾지 못하면 마지막에 추가
      const collapseIndex = result.findIndex(item => item.id === 'collapse');
      if (collapseIndex !== -1) {
        result.splice(collapseIndex, 0, ...cptMenuItems);
      } else {
        result.push(...cptMenuItems);
      }
    }
  }

  return result;
};
/**
 * Dynamic CPT Menu Hook
 * Fetches active CPTs and generates menu items
 */

import { useQuery } from '@tanstack/react-query';
import { cptApi } from '@/features/cpt-acf/services/cpt.api';
import { MenuItem } from '@/config/wordpressMenuFinal';
import { FileText, Package, FileCode, Database, Layout } from 'lucide-react';

/**
 * CPT를 메뉴 아이템으로 변환
 */
export const useDynamicCPTMenu = () => {
  // 활성화된 CPT 목록 가져오기
  const { data: cptTypesResponse, isLoading } = useQuery({
    queryKey: ['cpt-menu-items'],
    queryFn: async () => {
      const response = await cptApi.getAllTypes(true); // Only active CPTs
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const cptTypes = cptTypesResponse || [];

  // CPT를 메뉴 아이템으로 변환
  const generateCPTMenuItems = (): MenuItem[] => {
    const menuItems: MenuItem[] = [];

    // showInMenu가 true인 CPT만 필터링
    const menuCPTs = cptTypes
      .filter(cpt => cpt.showInMenu && cpt.isActive)
      .sort((a, b) => (a.menuPosition || 50) - (b.menuPosition || 50));

    if (menuCPTs.length > 0) {
      // CPT 섹션 구분선 추가
      menuItems.push({
        id: 'separator-cpt',
        label: '',
        icon: <></>,
        separator: true
      });

      // 각 CPT를 메뉴 아이템으로 추가
      menuCPTs.forEach(cpt => {
        const IconComponent = getIconForCPT(cpt.icon);
        
        menuItems.push({
          id: `cpt-${cpt.slug}`,
          label: cpt.label || cpt.singularLabel || cpt.slug,
          icon: <IconComponent className="w-5 h-5" />,
          children: [
            {
              id: `cpt-${cpt.slug}-all`,
              label: `모든 ${cpt.label}`,
              icon: <FileText className="w-4 h-4" />,
              path: `/cpt-engine/content/${cpt.slug}`
            },
            {
              id: `cpt-${cpt.slug}-new`,
              label: `새 ${cpt.singularLabel} 추가`,
              icon: <FileText className="w-4 h-4" />,
              path: `/cpt-engine/content/${cpt.slug}/new`
            }
          ]
        });
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
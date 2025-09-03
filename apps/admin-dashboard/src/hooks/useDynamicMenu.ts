import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { wordpressMenuItems, MenuItem } from '@/config/wordpressMenuFinal';

interface ActiveApp {
  id: string;
  name: string;
  displayName: string;
  permissions: string[];
  category: string;
}

/**
 * 활성화된 앱 기반으로 동적 메뉴 생성
 * 비활성화된 앱의 메뉴는 자동으로 숨김 처리
 */
export const useDynamicMenu = () => {
  // 활성화된 앱 목록 가져오기
  const { data: activeAppsData, isLoading } = useQuery({
    queryKey: ['active-apps'],
    queryFn: async () => {
      // Return mock data since API doesn't exist yet
      return {
        data: [
          { id: 'ecommerce', name: 'ecommerce', displayName: 'E-commerce', permissions: [], category: 'business' },
          { id: 'crowdfunding', name: 'crowdfunding', displayName: 'Crowdfunding', permissions: [], category: 'business' },
          { id: 'forum', name: 'forum', displayName: 'Forum', permissions: [], category: 'community' },
          { id: 'signage', name: 'signage', displayName: 'Digital Signage', permissions: [], category: 'marketing' }
        ]
      };
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시
    gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
    enabled: true, // Enable to show app menus
    refetchOnMount: false, // Don't refetch on mount
    refetchOnWindowFocus: false // Don't refetch on window focus
  });
  
  const activeApps: ActiveApp[] = activeAppsData?.data || [];

  // 앱 활성화 상태 확인 함수
  const isAppActive = (appName: string): boolean => {
    return activeApps.some((app: any) => app.name === appName || app.id === appName);
  };

  // 메뉴 아이템 필터링 함수
  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items.filter((item: any) => {
      // 구분선은 항상 표시
      if (item.separator) {
        return true;
      }

      // 핵심 메뉴는 항상 표시 (대시보드, 사용자, 페이지/글)
      const coreMenus = [
        'dashboard', 'users', 'posts', 'pages', 'media', 
        'appearance', // 외모 메뉴 추가
        'theme', 'themes', 'settings', 'tools', 'apps', 
        'monitoring', 'cpt-acf', 'collapse',
        'shortcodes', // Shortcode 메뉴 추가
        'plugins' // 플러그인 메뉴 추가 (apps 관리 포함)
      ];
      if (coreMenus.includes(item.id)) {
        return true;
      }

      // 모든 앱 메뉴를 표시 (임시로 활성화)
      // TODO: 실제 앱 활성화 API 구현 후 조건부 표시
      const appMenus = [
        'ecommerce', 'forum', 'signage', 'crowdfunding', 
        'affiliate', 'vendors'
      ];
      if (appMenus.includes(item.id)) {
        return true; // 임시로 모든 앱 메뉴 표시
      }

      // 앱별 메뉴 활성화 상태 확인 (API 구현 시 사용)
      // const appMenuMappings: Record<string, string> = {
      //   'ecommerce': 'ecommerce',
      //   'forum': 'forum',
      //   'signage': 'signage',
      //   'crowdfunding': 'crowdfunding',
      //   'affiliate': 'affiliate',
      //   'vendors': 'vendors'
      // };

      // const appName = appMenuMappings[item.id];
      // if (appName) {
      //   return isAppActive(appName);
      // }

      // 하위 메뉴가 있는 경우 재귀적으로 필터링
      if (item.children) {
        const filteredChildren = filterMenuItems(item.children);
        
        // 하위 메뉴가 모두 필터링되면 상위 메뉴도 숨김
        if (filteredChildren.length === 0) {
          return false;
        }
        
        // 필터링된 하위 메뉴로 업데이트
        item.children = filteredChildren;
      }

      return true;
    });
  };

  // 동적 메뉴 생성
  const dynamicMenu = filterMenuItems([...wordpressMenuItems]);

  // 앱 상태 변경 시 메뉴 다시 로드
  const refreshMenu = () => {
    // React Query 캐시 무효화로 메뉴 새로고침
    return activeAppsData; // 의존성을 위해 반환
  };

  return {
    menuItems: dynamicMenu,
    activeApps,
    isLoading,
    isAppActive,
    refreshMenu
  };
};

/**
 * 특정 앱의 활성화 상태만 확인하는 훅
 */
export const useAppStatus = (appName: string) => {
  const { data: activeAppsData } = useQuery({
    queryKey: ['active-apps'],
    queryFn: async () => {
      const response = await authClient.api.get('/platform/apps/active');
      return response.data;
    },
    staleTime: 5 * 60 * 1000
  });
  
  const activeApps: ActiveApp[] = activeAppsData?.data || [];
  const isActive = activeApps.some((app: any) => app.name === appName || app.id === appName);
  
  return {
    isActive,
    app: activeApps.find((app: any) => app.name === appName || app.id === appName)
  };
};

/**
 * 앱 권한 기반 메뉴 접근 제어
 */
export const useAppPermissions = () => {
  const { data: activeAppsData } = useQuery({
    queryKey: ['active-apps'],
    queryFn: async () => {
      const response = await authClient.api.get('/platform/apps/active');
      return response.data;
    }
  });
  
  const activeApps: ActiveApp[] = activeAppsData?.data || [];

  const hasAppPermission = (appName: string, permission: string): boolean => {
    const app = activeApps.find((a: any) => a.name === appName || a.id === appName);
    return app ? app.permissions.includes(permission) : false;
  };

  const getAppPermissions = (appName: string): string[] => {
    const app = activeApps.find((a: any) => a.name === appName || a.id === appName);
    return app ? app.permissions : [];
  };

  return {
    hasAppPermission,
    getAppPermissions,
    activeApps
  };
};
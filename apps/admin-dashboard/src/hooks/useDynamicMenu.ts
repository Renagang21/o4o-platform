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
  // Mock 모드 확인
  const isMockMode = import.meta.env.VITE_USE_MOCK === 'true';
  
  // 활성화된 앱 목록 가져오기
  const { data: activeAppsData, isLoading } = useQuery({
    queryKey: ['active-apps'],
    queryFn: async () => {
      // Mock 모드에서는 모든 핵심 앱을 활성화로 간주
      if (isMockMode) {
        return {
          data: [
            { id: 'ecommerce', name: 'ecommerce', displayName: 'E-commerce', permissions: ['products:read', 'products:write'], category: 'commerce' },
            { id: 'users', name: 'users', displayName: 'User Management', permissions: ['users:read', 'users:write'], category: 'core' },
            { id: 'content', name: 'content', displayName: 'Pages & Posts', permissions: ['content:read', 'content:write'], category: 'content' },
            { id: 'forum', name: 'forum', displayName: 'Forum', permissions: ['forum:read', 'forum:write'], category: 'community' }
          ]
        };
      }
      
      const response = await authClient.api.get('/v1/platform/apps/active');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시
    gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
    enabled: true, // Always enable query
    refetchOnMount: false, // Don't refetch on mount
    refetchOnWindowFocus: false // Don't refetch on window focus
  });
  
  const activeApps: ActiveApp[] = activeAppsData?.data || [];

  // 앱 활성화 상태 확인 함수
  const isAppActive = (appName: string): boolean => {
    return activeApps.some(app => app.name === appName || app.id === appName);
  };

  // 메뉴 아이템 필터링 함수
  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items.filter(item => {
      // 구분선은 항상 표시
      if (item.separator) {
        return true;
      }

      // 핵심 메뉴는 항상 표시 (대시보드, 사용자, 페이지/글)
      const coreMenus = ['dashboard', 'users', 'posts', 'pages', 'media', 'themes', 'settings'];
      if (coreMenus.includes(item.id)) {
        return true;
      }

      // 앱별 메뉴 활성화 상태 확인
      const appMenuMappings: Record<string, string> = {
        'ecommerce': 'ecommerce',
        'forum': 'forum',
        'signage': 'signage',
        'crowdfunding': 'crowdfunding',
        'affiliate': 'affiliate',
        'vendors': 'vendors'
      };

      const appName = appMenuMappings[item.id];
      if (appName) {
        return isAppActive(appName);
      }

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
  
  // 디버깅용 로그
  if (isMockMode) {
    // console.log('[useDynamicMenu] Mock mode active');
    // console.log('[useDynamicMenu] Active apps:', activeApps);
    // console.log('[useDynamicMenu] Menu items:', dynamicMenu);
  }

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
      const response = await authClient.api.get('/v1/platform/apps/active');
      return response.data;
    },
    staleTime: 5 * 60 * 1000
  });
  
  const activeApps: ActiveApp[] = activeAppsData?.data || [];
  const isActive = activeApps.some(app => app.name === appName || app.id === appName);
  
  return {
    isActive,
    app: activeApps.find(app => app.name === appName || app.id === appName)
  };
};

/**
 * 앱 권한 기반 메뉴 접근 제어
 */
export const useAppPermissions = () => {
  const { data: activeAppsData } = useQuery({
    queryKey: ['active-apps'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/platform/apps/active');
      return response.data;
    }
  });
  
  const activeApps: ActiveApp[] = activeAppsData?.data || [];

  const hasAppPermission = (appName: string, permission: string): boolean => {
    const app = activeApps.find(a => a.name === appName || a.id === appName);
    return app ? app.permissions.includes(permission) : false;
  };

  const getAppPermissions = (appName: string): string[] => {
    const app = activeApps.find(a => a.name === appName || a.id === appName);
    return app ? app.permissions : [];
  };

  return {
    hasAppPermission,
    getAppPermissions,
    activeApps
  };
};
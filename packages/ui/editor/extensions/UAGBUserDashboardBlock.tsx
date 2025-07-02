// UAGB User Dashboard Block - Spectra 스타일
// 사용자별 포스트 관리 대시보드

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { 
  UAGBCommonAttributes, 
  generateBlockId
} from './tiptap-block';
import UAGBUserDashboardView from './UAGBUserDashboardView';

// 대시보드 위젯 타입
export interface DashboardWidget {
  id: string;
  type: 'stats' | 'recent_posts' | 'quick_actions' | 'analytics' | 'notifications' | 'profile';
  title: string;
  enabled: boolean;
  position: { x: number; y: number; w: number; h: number };
  settings: Record<string, any>;
}

// 사용자 통계
export interface UserStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  totalComments: number;
  totalShares: number;
  monthlyViews: number[];
  topPosts: Array<{
    id: string;
    title: string;
    views: number;
    date: string;
  }>;
}

// 알림 설정
export interface NotificationSettings {
  enabled: boolean;
  email: boolean;
  browser: boolean;
  newComments: boolean;
  postPublished: boolean;
  weeklyReport: boolean;
}

// UAGB User Dashboard 속성 정의
export interface UAGBUserDashboardAttributes extends UAGBCommonAttributes {
  // 대시보드 설정
  dashboardTitle: string;
  showTitle: boolean;
  
  // 사용자 설정
  userId: string;               // 현재 사용자 ID (비어있으면 로그인 유저)
  userName: string;             // 사용자 이름
  userRole: string;             // 사용자 역할
  
  // 위젯 설정
  widgets: DashboardWidget[];
  enableDragDrop: boolean;      // 위젯 드래그앤드롭
  gridColumns: number;          // 그리드 컬럼 수
  
  // 표시 설정
  showWelcomeMessage: boolean;
  welcomeMessage: string;
  showQuickStats: boolean;
  showRecentActivity: boolean;
  showNotifications: boolean;
  
  // 데이터 설정
  postsLimit: number;           // 최근 포스트 표시 개수
  activityLimit: number;        // 최근 활동 표시 개수
  refreshInterval: number;      // 데이터 새로고침 간격 (초)
  
  // 테마 설정
  theme: 'light' | 'dark' | 'auto';
  accentColor: string;
  
  // 권한 설정
  canCreatePosts: boolean;
  canEditOwnPosts: boolean;
  canDeleteOwnPosts: boolean;
  canViewAnalytics: boolean;
  
  // 레이아웃 설정
  layout: 'grid' | 'list' | 'compact';
  sidebarEnabled: boolean;
  headerHeight: number;
  
  // 알림 설정
  notifications: NotificationSettings;
  
  // 고급 기능
  enableSearch: boolean;
  enableFilters: boolean;
  enableExport: boolean;
  enableBulkActions: boolean;
  
  // 스타일링
  backgroundColor: string;
  cardBackgroundColor: string;
  textColor: string;
  borderColor: string;
  borderRadius: number;
  cardShadow: boolean;
  
  // 반응형
  compactMobile: boolean;       // 모바일에서 축약 표시
  hideWidgetsMobile: string[];  // 모바일에서 숨길 위젯들
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    uagbUserDashboard: {
      setUAGBUserDashboard: (attrs: Partial<UAGBUserDashboardAttributes>) => ReturnType;
      updateUAGBUserDashboard: (attrs: Partial<UAGBUserDashboardAttributes>) => ReturnType;
    };
  }
}

export const UAGBUserDashboardBlock = Node.create({
  name: 'uagb/user-dashboard',
  
  group: 'block',
  atom: true,
  
  addAttributes() {
    return {
      // 블록 식별
      block_id: {
        default: () => generateBlockId(),
        parseHTML: element => element.getAttribute('data-block-id'),
        renderHTML: attributes => ({ 'data-block-id': attributes.block_id }),
      },
      classMigrate: {
        default: false,
      },
      
      // 대시보드 설정
      dashboardTitle: { default: 'My Dashboard' },
      showTitle: { default: true },
      
      // 사용자 설정
      userId: { default: '' },
      userName: { default: 'Current User' },
      userRole: { default: 'author' },
      
      // 위젯 설정
      widgets: {
        default: [
          {
            id: 'stats',
            type: 'stats',
            title: 'Statistics',
            enabled: true,
            position: { x: 0, y: 0, w: 4, h: 2 },
            settings: {}
          },
          {
            id: 'recent_posts',
            type: 'recent_posts',
            title: 'Recent Posts',
            enabled: true,
            position: { x: 4, y: 0, w: 4, h: 3 },
            settings: { limit: 5 }
          },
          {
            id: 'quick_actions',
            type: 'quick_actions',
            title: 'Quick Actions',
            enabled: true,
            position: { x: 8, y: 0, w: 4, h: 2 },
            settings: {}
          },
          {
            id: 'analytics',
            type: 'analytics',
            title: 'Analytics',
            enabled: true,
            position: { x: 0, y: 2, w: 8, h: 3 },
            settings: { period: '30d' }
          },
          {
            id: 'notifications',
            type: 'notifications',
            title: 'Notifications',
            enabled: true,
            position: { x: 8, y: 2, w: 4, h: 3 },
            settings: { limit: 5 }
          }
        ]
      },
      enableDragDrop: { default: true },
      gridColumns: { default: 12 },
      
      // 표시 설정
      showWelcomeMessage: { default: true },
      welcomeMessage: { default: 'Welcome back! Here\'s what\'s happening with your content.' },
      showQuickStats: { default: true },
      showRecentActivity: { default: true },
      showNotifications: { default: true },
      
      // 데이터 설정
      postsLimit: { default: 10 },
      activityLimit: { default: 15 },
      refreshInterval: { default: 300 },
      
      // 테마 설정
      theme: { default: 'light' },
      accentColor: { default: '#3b82f6' },
      
      // 권한 설정
      canCreatePosts: { default: true },
      canEditOwnPosts: { default: true },
      canDeleteOwnPosts: { default: true },
      canViewAnalytics: { default: true },
      
      // 레이아웃 설정
      layout: { default: 'grid' },
      sidebarEnabled: { default: false },
      headerHeight: { default: 60 },
      
      // 알림 설정
      notifications: {
        default: {
          enabled: true,
          email: true,
          browser: false,
          newComments: true,
          postPublished: true,
          weeklyReport: false
        }
      },
      
      // 고급 기능
      enableSearch: { default: true },
      enableFilters: { default: true },
      enableExport: { default: false },
      enableBulkActions: { default: true },
      
      // 스타일링
      backgroundColor: { default: '#f8fafc' },
      cardBackgroundColor: { default: '#ffffff' },
      textColor: { default: '#1f2937' },
      borderColor: { default: '#e5e7eb' },
      borderRadius: { default: 8 },
      cardShadow: { default: true },
      
      // 반응형
      compactMobile: { default: true },
      hideWidgetsMobile: { default: ['analytics'] },
      
      // Common UAGB attributes
      blockTopMargin: { default: 0 },
      blockRightMargin: { default: 0 },
      blockBottomMargin: { default: 20 },
      blockLeftMargin: { default: 0 },
      blockTopMarginTablet: { default: 0 },
      blockRightMarginTablet: { default: 0 },
      blockBottomMarginTablet: { default: 20 },
      blockLeftMarginTablet: { default: 0 },
      blockTopMarginMobile: { default: 0 },
      blockRightMarginMobile: { default: 0 },
      blockBottomMarginMobile: { default: 20 },
      blockLeftMarginMobile: { default: 0 },
      
      blockTopPadding: { default: 20 },
      blockRightPadding: { default: 20 },
      blockBottomPadding: { default: 20 },
      blockLeftPadding: { default: 20 },
      blockTopPaddingTablet: { default: 20 },
      blockRightPaddingTablet: { default: 20 },
      blockBottomPaddingTablet: { default: 20 },
      blockLeftPaddingTablet: { default: 20 },
      blockTopPaddingMobile: { default: 16 },
      blockRightPaddingMobile: { default: 16 },
      blockBottomPaddingMobile: { default: 16 },
      blockLeftPaddingMobile: { default: 16 },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="uagb/user-dashboard"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-type': 'uagb/user-dashboard',
          'class': `uagb-block-${HTMLAttributes['data-block-id']} uagb-user-dashboard`,
        },
        HTMLAttributes
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UAGBUserDashboardView);
  },

  addCommands() {
    return {
      setUAGBUserDashboard:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
      updateUAGBUserDashboard:
        (attrs) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, attrs);
        },
    };
  },
});

// 🔧 User Dashboard API 연동 함수들

/**
 * 사용자 통계 조회 API
 */
export const getUserStatsAPI = async (userId: string): Promise<UserStats> => {
  try {
    const response = await fetch(`http://localhost:3000/api/post-creation/user/${userId}/stats`);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
    
  } catch (error) {
    console.error('Get user stats API error:', error);
    
    // Fallback Mock 데이터
    return {
      totalPosts: 15,
      publishedPosts: 12,
      draftPosts: 3,
      totalViews: 2450,
      totalComments: 89,
      totalShares: 156,
      monthlyViews: [120, 150, 180, 200, 175, 220, 260, 240, 200, 180, 160, 140],
      topPosts: [
        {
          id: '1',
          title: 'Getting Started with React TypeScript',
          views: 450,
          date: '2024-06-20'
        },
        {
          id: '2',
          title: 'Modern CSS Techniques for 2024',
          views: 320,
          date: '2024-06-18'
        },
        {
          id: '3',
          title: 'Building Scalable Node.js APIs',
          views: 280,
          date: '2024-06-15'
        }
      ]
    };
  }
};

/**
 * 사용자 최근 포스트 조회 API
 */
export const getUserRecentPostsAPI = async (userId: string, limit: number = 10) => {
  try {
    const response = await fetch('http://localhost:3000/api/post-creation/archive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postTypeSlug: 'blog',
        limit,
        offset: 0,
        orderBy: 'createdAt',
        sortOrder: 'DESC',
        filters: {
          author: userId
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data.items;
    
  } catch (error) {
    console.error('Get user recent posts API error:', error);
    return [];
  }
};

/**
 * 사용자 활동 로그 조회 API
 */
export const getUserActivityAPI = async (userId: string, limit: number = 15) => {
  try {
    // 실제로는 별도의 activity log API가 필요
    // 현재는 Mock 데이터 반환
    return [
      {
        id: '1',
        type: 'post_published',
        title: 'Published "React TypeScript Guide"',
        date: '2024-06-20T10:30:00Z',
        icon: '📝'
      },
      {
        id: '2',
        type: 'comment_received',
        title: 'New comment on "CSS Techniques"',
        date: '2024-06-19T15:45:00Z',
        icon: '💬'
      },
      {
        id: '3',
        type: 'post_updated',
        title: 'Updated "Node.js APIs"',
        date: '2024-06-18T09:15:00Z',
        icon: '✏️'
      }
    ];
    
  } catch (error) {
    console.error('Get user activity API error:', error);
    return [];
  }
};

/**
 * 사용자 알림 조회 API
 */
export const getUserNotificationsAPI = async (userId: string, limit: number = 5) => {
  try {
    // Mock 데이터 (실제로는 알림 API 필요)
    return [
      {
        id: '1',
        type: 'comment',
        title: 'New comment on your post',
        message: 'John Doe commented on "React TypeScript Guide"',
        date: '2024-06-20T11:00:00Z',
        read: false,
        priority: 'normal'
      },
      {
        id: '2',
        type: 'like',
        title: 'Your post was liked',
        message: '5 people liked "Modern CSS Techniques"',
        date: '2024-06-19T16:30:00Z',
        read: true,
        priority: 'low'
      },
      {
        id: '3',
        type: 'system',
        title: 'Weekly report available',
        message: 'Your weekly analytics report is ready',
        date: '2024-06-17T08:00:00Z',
        read: false,
        priority: 'high'
      }
    ];
    
  } catch (error) {
    console.error('Get user notifications API error:', error);
    return [];
  }
};

/**
 * 빠른 액션 실행 API
 */
export const executeQuickActionAPI = async (action: string, data: any = {}) => {
  try {
    switch (action) {
      case 'create_post':
        // 새 포스트 생성 페이지로 이동 또는 모달 열기
        alert('새 포스트 작성 페이지로 이동합니다.');
        break;
        
      case 'view_analytics':
        // 분석 페이지로 이동
        alert('분석 페이지로 이동합니다.');
        break;
        
      case 'manage_posts':
        // 포스트 관리 페이지로 이동
        alert('포스트 관리 페이지로 이동합니다.');
        break;
        
      case 'settings':
        // 설정 페이지로 이동
        alert('설정 페이지로 이동합니다.');
        break;
        
      default:
        console.warn('Unknown quick action:', action);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Execute quick action API error:', error);
    return { success: false, error: error.message };
  }
};

export default UAGBUserDashboardBlock;
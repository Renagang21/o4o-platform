import { http, HttpResponse } from 'msw';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Mock platform apps data - 실제 O4O 플랫폼 앱 현황
let mockPlatformApps = [
  {
    id: 'ecommerce',
    name: 'ecommerce',
    displayName: 'E-commerce',
    description: '상품 관리, 주문 처리, 결제 시스템, 정산까지 완전한 전자상거래 기능',
    version: '2.1.0',
    status: 'active',
    implementationStatus: 'complete',
    category: 'commerce',
    dependencies: ['users'],
    dependents: ['settlements', 'analytics'],
    permissions: ['products:read', 'products:write', 'orders:read', 'orders:write'],
    icon: '🛒',
    color: '#10b981',
    lastUpdated: '2025-01-24T12:00:00Z',
    metrics: {
      activeUsers: 156,
      dailyUsage: 2450,
      errorRate: 0.2,
      uptime: 99.8
    },
    settings: {
      autoStart: true,
      requiresApproval: false,
      maintenanceMode: false,
      maxUsers: 1000
    }
  },
  {
    id: 'users',
    name: 'users',
    displayName: 'User Management',
    description: '사용자 관리, 역할 기반 권한, 승인 워크플로우 - 핵심 기능',
    version: '1.8.0',
    status: 'active',
    implementationStatus: 'complete',
    category: 'core',
    dependencies: [],
    dependents: ['ecommerce', 'forum', 'content'],
    permissions: ['users:read', 'users:write', 'roles:manage'],
    icon: '👥',
    color: '#3b82f6',
    lastUpdated: '2025-01-24T11:30:00Z',
    metrics: {
      activeUsers: 89,
      dailyUsage: 1890,
      errorRate: 0.1,
      uptime: 99.9
    },
    settings: {
      autoStart: true,
      requiresApproval: false,
      maintenanceMode: false
    }
  },
  {
    id: 'content',
    name: 'content',
    displayName: 'Pages & Posts',
    description: '페이지와 블로그 포스트 관리, Gutenberg 에디터 지원 - 완전 구현',
    version: '1.9.0',
    status: 'active',
    implementationStatus: 'complete',
    category: 'content',
    dependencies: ['users'],
    dependents: [],
    permissions: ['content:read', 'content:write', 'media:manage'],
    icon: '📝',
    color: '#6366f1',
    lastUpdated: '2025-01-24T10:15:00Z',
    metrics: {
      activeUsers: 45,
      dailyUsage: 890,
      errorRate: 0.3,
      uptime: 99.7
    },
    settings: {
      autoStart: true,
      requiresApproval: false,
      maintenanceMode: false,
      maxUsers: 500
    }
  },
  {
    id: 'forum',
    name: 'forum',
    displayName: 'Forum',
    description: '커뮤니티 포럼, 토론 게시판, 댓글 시스템 - 완전 구현됨',
    version: '1.2.0',
    status: 'active',
    implementationStatus: 'complete',
    category: 'community',
    dependencies: ['users'],
    dependents: [],
    permissions: ['forum:read', 'forum:write', 'forum:moderate'],
    icon: '💬',
    color: '#8b5cf6',
    lastUpdated: '2025-01-24T09:45:00Z',
    metrics: {
      activeUsers: 78,
      dailyUsage: 1240,
      errorRate: 0.4,
      uptime: 99.5
    },
    settings: {
      autoStart: true,
      requiresApproval: true,
      maintenanceMode: false,
      maxUsers: 300
    }
  },
  {
    id: 'signage',
    name: 'signage',
    displayName: 'Digital Signage',
    description: '디지털 사이니지 콘텐츠 관리 및 스케줄링 - 부분 구현 (비활성화)',
    version: '0.8.0',
    status: 'inactive',
    implementationStatus: 'partial',
    category: 'content',
    dependencies: ['users', 'content'],
    dependents: [],
    permissions: ['signage:read', 'signage:write'],
    icon: '📺',
    color: '#f59e0b',
    lastUpdated: '2025-01-20T14:00:00Z',
    metrics: {
      activeUsers: 0,
      dailyUsage: 0,
      errorRate: 0,
      uptime: 0
    },
    settings: {
      autoStart: false,
      requiresApproval: true,
      maintenanceMode: true
    }
  },
  {
    id: 'crowdfunding',
    name: 'crowdfunding',
    displayName: 'Crowdfunding',
    description: '크라우드펀딩 캠페인 생성 및 관리 - 부분 구현 (비활성화)',
    version: '0.5.0',
    status: 'inactive',
    implementationStatus: 'partial',
    category: 'commerce',
    dependencies: ['users', 'ecommerce'],
    dependents: [],
    permissions: ['crowdfunding:read', 'crowdfunding:write'],
    icon: '💰',
    color: '#ef4444',
    lastUpdated: '2025-01-18T16:30:00Z',
    metrics: {
      activeUsers: 0,
      dailyUsage: 0,
      errorRate: 0,
      uptime: 0
    },
    settings: {
      autoStart: false,
      requiresApproval: true,
      maintenanceMode: true
    }
  },
  {
    id: 'affiliate',
    name: 'affiliate',
    displayName: 'Affiliate Marketing',
    description: '제휴 마케팅 프로그램 관리, 커미션 추적 - 부분 구현 (비활성화)',
    version: '0.3.0',
    status: 'inactive',
    implementationStatus: 'partial',
    category: 'marketing',
    dependencies: ['users', 'ecommerce'],
    dependents: [],
    permissions: ['affiliate:read', 'affiliate:write'],
    icon: '🤝',
    color: '#f97316',
    lastUpdated: '2025-01-15T11:20:00Z',
    metrics: {
      activeUsers: 0,
      dailyUsage: 0,
      errorRate: 0,
      uptime: 0
    },
    settings: {
      autoStart: false,
      requiresApproval: true,
      maintenanceMode: true
    }
  },
  {
    id: 'vendors',
    name: 'vendors',
    displayName: 'Vendor Management',
    description: '판매자 관리, 승인 워크플로우 - 부분 구현 (활성화 가능)',
    version: '0.9.0',
    status: 'inactive',
    implementationStatus: 'partial',
    category: 'commerce',
    dependencies: ['users', 'ecommerce'],
    dependents: [],
    permissions: ['vendors:read', 'vendors:write'],
    icon: '🏪',
    color: '#06b6d4',
    lastUpdated: '2025-01-22T13:45:00Z',
    metrics: {
      activeUsers: 0,
      dailyUsage: 0,
      errorRate: 0,
      uptime: 0
    },
    settings: {
      autoStart: false,
      requiresApproval: true,
      maintenanceMode: false
    }
  }
];

// Mock platform metrics
const mockPlatformMetrics = {
  totalUsers: 456,
  activeToday: 123,
  dailyRequests: 15678,
  totalActiveApps: mockPlatformApps.filter((app: any) => app.status === 'active').length,
  systemUptime: 99.7,
  errorRate: 0.2
};

export const platformAppsHandlers = [
  // Get platform apps
  http.get(`${API_BASE}/v1/platform/apps`, () => {
    return HttpResponse.json({
      success: true,
      data: mockPlatformApps
    });
  }),

  // Get platform metrics
  http.get(`${API_BASE}/v1/platform/metrics`, () => {
    return HttpResponse.json({
      success: true,
      data: mockPlatformMetrics
    });
  }),

  // Toggle app status
  http.patch(`${API_BASE}/v1/platform/apps/:appId/status`, async ({ params, request }: any) => {
    const { appId } = params as any;
    const { status } = await request.json();
    
    const appIndex = mockPlatformApps.findIndex(app => app.id === appId);
    if (appIndex === -1) {
      return HttpResponse.json(
        { success: false, error: 'App not found' },
        { status: 404 }
      );
    }

    const app = mockPlatformApps[appIndex];
    
    // Check if app can be activated (must be complete or partial implementation)
    if (status === 'active' && app.implementationStatus === 'planned') {
      return HttpResponse.json(
        { success: false, error: '아직 구현되지 않은 앱입니다' },
        { status: 400 }
      );
    }

    // Check dependencies
    if (status === 'active') {
      const missingDeps = app.dependencies.filter((depId: any) => {
        const depApp = mockPlatformApps.find((a: any) => a.id === depId);
        return !depApp || depApp.status !== 'active';
      });
      
      if (missingDeps.length > 0) {
        const depNames = missingDeps.map((depId: any) => {
          const depApp = mockPlatformApps.find((a: any) => a.id === depId);
          return depApp ? depApp.displayName : depId;
        }).join(', ');
        
        return HttpResponse.json(
          { success: false, error: `의존성 앱이 비활성화되어 있습니다: ${depNames}` },
          { status: 400 }
        );
      }
    }

    // Update app status
    mockPlatformApps[appIndex] = {
      ...app,
      status: status as 'active' | 'inactive' | 'error' | 'maintenance',
      lastUpdated: new Date().toISOString(),
      metrics: status === 'active' ? {
        ...app.metrics,
        activeUsers: Math.floor(Math.random() * 200),
        dailyUsage: Math.floor(Math.random() * 3000),
        uptime: Math.random() * 10 + 90 // 90-100%
      } : {
        activeUsers: 0,
        dailyUsage: 0,
        errorRate: 0,
        uptime: 0
      }
    };

    return HttpResponse.json({
      success: true,
      data: mockPlatformApps[appIndex],
      message: `${app.displayName}이 ${status === 'active' ? '활성화' : '비활성화'}되었습니다`
    });
  }),

  // Update app settings
  http.put(`${API_BASE}/v1/platform/apps/:appId/settings`, async ({ params, request }: any) => {
    const { appId } = params as any;
    const settings = await request.json();
    
    const appIndex = mockPlatformApps.findIndex(app => app.id === appId);
    if (appIndex === -1) {
      return HttpResponse.json(
        { success: false, error: 'App not found' },
        { status: 404 }
      );
    }

    // Update app settings
    mockPlatformApps[appIndex] = {
      ...mockPlatformApps[appIndex],
      settings: {
        ...mockPlatformApps[appIndex].settings,
        ...settings
      },
      lastUpdated: new Date().toISOString()
    };

    return HttpResponse.json({
      success: true,
      data: mockPlatformApps[appIndex],
      message: '앱 설정이 업데이트되었습니다'
    });
  }),

  // Bulk operations
  http.post(`${API_BASE}/v1/platform/apps/bulk`, async ({ request }: any) => {
    const { appIds, operation } = await request.json();
    
    let successCount = 0;
    let errors: string[] = [];

    for (const appId of appIds) {
      const appIndex = mockPlatformApps.findIndex(app => app.id === appId);
      if (appIndex === -1) {
        errors.push(`${appId}: App not found`);
        continue;
      }

      const app = mockPlatformApps[appIndex];
      
      try {
        switch (operation) {
          case 'activate':
            if (app.implementationStatus === 'planned') {
              errors.push(`${app.displayName}: 아직 구현되지 않음`);
              continue;
            }
            mockPlatformApps[appIndex].status = 'active';
            break;
          case 'deactivate':
            mockPlatformApps[appIndex].status = 'inactive';
            break;
          case 'maintenance':
            mockPlatformApps[appIndex].status = 'maintenance';
            break;
          default:
            errors.push(`${app.displayName}: Unknown operation`);
            continue;
        }
        
        mockPlatformApps[appIndex].lastUpdated = new Date().toISOString();
        successCount++;
      } catch (error: any) {
        errors.push(`${app.displayName}: Operation failed`);
      }
    }

    return HttpResponse.json({
      success: errors.length === 0,
      data: {
        successCount,
        totalCount: appIds.length,
        errors
      },
      message: `${successCount}개 앱의 ${operation} 작업이 완료되었습니다${errors.length > 0 ? ` (${errors.length}개 실패)` : ''}`
    });
  }),

  // Get app by ID
  http.get(`${API_BASE}/v1/platform/apps/:appId`, ({ params }: any) => {
    const { appId } = params as any;
    
    const app = mockPlatformApps.find((a: any) => a.id === appId);
    if (!app) {
      return HttpResponse.json(
        { success: false, error: 'App not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: app
    });
  }),

  // Get active apps only (for menu generation)
  http.get(`${API_BASE}/v1/platform/apps/active`, () => {
    const activeApps = mockPlatformApps.filter((app: any) => app.status === 'active');
    
    return HttpResponse.json({
      success: true,
      data: activeApps.map((app: any) => ({
        id: app.id,
        name: app.name,
        displayName: app.displayName,
        permissions: app.permissions,
        category: app.category
      }))
    });
  }),

  // Health check for specific app
  http.get(`${API_BASE}/v1/platform/apps/:appId/health`, ({ params }: any) => {
    const { appId } = params as any;
    
    const app = mockPlatformApps.find((a: any) => a.id === appId);
    if (!app) {
      return HttpResponse.json(
        { success: false, error: 'App not found' },
        { status: 404 }
      );
    }

    // Simulate health check
    const isHealthy = app.status === 'active' && app.metrics.uptime > 95;
    
    return HttpResponse.json({
      success: true,
      data: {
        appId: app.id,
        status: app.status,
        healthy: isHealthy,
        uptime: app.metrics.uptime,
        errorRate: app.metrics.errorRate,
        lastCheck: new Date().toISOString()
      }
    });
  })
];
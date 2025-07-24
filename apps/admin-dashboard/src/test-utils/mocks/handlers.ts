import { http, HttpResponse } from 'msw';
import { createMockProduct, createMockProducts } from '../factories/product';
import { createMockOrder, createMockOrders } from '../factories/order';
import { createMockUser, createMockUserList } from '../factories/user';
import {
  SAMPLE_ECOMMERCE_STATS,
  SAMPLE_FORUM_STATS,
  SAMPLE_USER_STATS,
  SAMPLE_REALTIME_OVERVIEW,
  SAMPLE_RECENT_ACTIVITIES,
  SAMPLE_SYSTEM_HEALTH
} from '../../types/dashboard-api';
import { UserBulkAction, User, UserFormData, UserRole, BusinessInfo } from '../../types/user';
import { 
  Product, 
  OrderStatus, 
  BulkProductAction, 
  BulkOrderAction 
} from '../../types/ecommerce';
import { postHandlers } from '../../test/mocks/handlers/posts';
import { menuHandlers } from '../../test/mocks/handlers/menus';
import { customPostTypeHandlers } from '../../test/mocks/handlers/custom-post-types';
import { acfHandlers } from '../../test/mocks/handlers/acf';
import { mediaHandlers } from '../../test/mocks/handlers/media';
import { templateHandlers } from '../../test/mocks/handlers/templates';
import { widgetHandlers } from '../../test/mocks/handlers/widgets';

// API Base URL (환경에 따라 변경)
const API_BASE = 'http://localhost:4000/api';

// 모의 관리자 사용자 데이터
const mockAdminUser = {
  id: 'admin_1',
  email: 'admin@o4o.com',
  name: '관리자',
  role: 'admin',
  status: 'approved',
  permissions: ['admin.access', 'users.manage', 'content.manage', 'settings.manage'],
  lastLoginAt: new Date().toISOString(),
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString()
};

export const handlers = [
  // Post/Page handlers
  ...postHandlers,
  
  // Menu handlers
  ...menuHandlers,
  
  // Custom Post Type handlers
  ...customPostTypeHandlers,
  
  // ACF handlers
  ...acfHandlers,
  
  // Media handlers
  ...mediaHandlers,
  
  // Template handlers
  ...templateHandlers,
  
  // Widget handlers
  ...widgetHandlers,
  
  // =============================================================================
  // AUTHENTICATION HANDLERS - 최우선 순위
  // =============================================================================
  
  // 로그인 핸들러
  http.post(`${API_BASE}/auth/login`, async () => {
    
    // 개발 환경에서는 모든 로그인 성공 처리
    return HttpResponse.json({
      success: true,
      data: {
        user: mockAdminUser,
        token: 'mock-jwt-token-' + Date.now(),
        expiresIn: 3600
      },
      message: '로그인 성공'
    });
  }),

  // 현재 사용자 정보 조회
  http.get(`${API_BASE}/auth/me`, () => {
    
    // 개발 환경에서는 항상 관리자 반환
    return HttpResponse.json({
      success: true,
      data: mockAdminUser,
      message: '사용자 정보 조회 성공'
    });
  }),

  // 세션 체크
  http.get(`${API_BASE}/auth/session`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        isActive: true,
        user: mockAdminUser,
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      }
    });
  }),

  // 로그아웃
  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({
      success: true,
      message: '로그아웃 성공'
    });
  }),

  // 권한 확인
  http.get(`${API_BASE}/auth/permissions`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        permissions: ['admin.access', 'users.manage', 'content.manage', 'settings.manage'],
        role: 'admin'
      }
    });
  }),
  // Products API Handlers
  http.get(`${API_BASE}/ecommerce/products`, ({ request }: any) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const category = url.searchParams.get('category');

    // Mock 데이터 생성
    let products = [
      createMockProduct({ id: 'prod_1', name: 'MacBook Pro M3', status: 'active' }),
      createMockProduct({ id: 'prod_2', name: 'iPhone 15 Pro', status: 'active' }),
      createMockProducts.draft(),
      createMockProducts.outOfStock(),
      createMockProducts.featured(),
      createMockProducts.virtual(),
    ];

    // 필터링 적용
    if (status) {
      products = products.filter(p => p.status === status);
    }

    if (search) {
      products = products.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (category) {
      products = products.filter(p => 
        p.categories.some(c => c.id === category)
      );
    }

    // 페이지네이션
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = products.slice(startIndex, endIndex);

    return HttpResponse.json({
      success: true,
      data: paginatedProducts,
      total: products.length,
      page,
      limit,
      totalPages: Math.ceil(products.length / limit),
    });
  }),

  http.get(`${API_BASE}/ecommerce/products/:id`, ({ params }: any) => {
    const { id } = params;
    
    // Mock 상품 데이터 반환
    const product = createMockProduct({ 
      id: id as string,
      name: `Product ${id}`,
    });

    return HttpResponse.json({
      success: true,
      data: product,
    });
  }),

  http.post(`${API_BASE}/ecommerce/products`, async ({ request }: any) => {
    const productData = await request.json() as Partial<Product>;
    
    const newProduct = createMockProduct({
      ...productData,
      id: 'prod_' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return HttpResponse.json({
      success: true,
      data: newProduct,
      message: 'Product created successfully',
    }, { status: 201 });
  }),

  http.put(`${API_BASE}/ecommerce/products/:id`, async ({ params, request }: any) => {
    const { id } = params;
    const updateData = await request.json() as Partial<Product>;
    
    const updatedProduct = createMockProduct({
      id: id as string,
      ...updateData,
      updatedAt: new Date().toISOString(),
    });

    return HttpResponse.json({
      success: true,
      data: updatedProduct,
      message: 'Product updated successfully',
    });
  }),

  http.delete(`${API_BASE}/ecommerce/products/:id`, ({ params }: any) => {
    const { id } = params;
    
    return HttpResponse.json({
      success: true,
      message: `Product ${id} deleted successfully`,
    });
  }),

  http.post(`${API_BASE}/ecommerce/products/:id/duplicate`, ({ params }: any) => {
    const { id } = params;
    
    const duplicatedProduct = createMockProduct({
      id: 'prod_dup_' + Date.now(),
      name: `Copy of Product ${id}`,
      sku: `DUP-${id}`,
      status: 'draft',
    });

    return HttpResponse.json({
      success: true,
      data: duplicatedProduct,
      message: 'Product duplicated successfully',
    }, { status: 201 });
  }),

  // Orders API Handlers
  http.get(`${API_BASE}/ecommerce/orders`, ({ request }: any) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    // Mock 주문 데이터 생성
    let orders = [
      createMockOrder({ id: 'order_1', orderNumber: 'ORD-001', status: 'pending' }),
      createMockOrders.processing(),
      createMockOrders.completed(),
      createMockOrders.cancelled(),
      createMockOrders.refunded(),
      createMockOrders.bulk(),
    ];

    // 필터링 적용
    if (status) {
      orders = orders.filter(o => o.status === status);
    }

    if (search) {
      orders = orders.filter(o => 
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.customerEmail.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName.toLowerCase().includes(search.toLowerCase())
      );
    }

    // 페이지네이션
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = orders.slice(startIndex, endIndex);

    return HttpResponse.json({
      success: true,
      data: paginatedOrders,
      total: orders.length,
      page,
      limit,
      totalPages: Math.ceil(orders.length / limit),
    });
  }),

  http.get(`${API_BASE}/ecommerce/orders/:id`, ({ params }: any) => {
    const { id } = params;
    
    const order = createMockOrder({ 
      id: id as string,
      orderNumber: `ORD-${id}`,
    });

    return HttpResponse.json({
      success: true,
      data: order,
    });
  }),

  http.put(`${API_BASE}/ecommerce/orders/:id/status`, async ({ params, request }: any) => {
    const { id } = params;
    const { status, note } = await request.json() as { status: OrderStatus; note?: string };
    
    const updatedOrder = createMockOrder({
      id: id as string,
      status,
      updatedAt: new Date().toISOString(),
      adminNote: note,
    });

    return HttpResponse.json({
      success: true,
      data: updatedOrder,
      message: `Order status updated to ${status}`,
    });
  }),

  http.post(`${API_BASE}/ecommerce/orders/:id/refund`, async ({ params, request }: any) => {
    const { id } = params;
    const { amount, reason, items } = await request.json() as { amount: number; reason: string; items: Array<{ orderItemId: string; quantity: number; amount: number }> };
    
    return HttpResponse.json({
      success: true,
      message: `Refund of ${amount} processed for order ${id}`,
      data: {
        refundId: 'refund_' + Date.now(),
        amount,
        reason,
        items,
        processedAt: new Date().toISOString(),
      },
    });
  }),

  // Bulk Operations
  http.post(`${API_BASE}/ecommerce/products/bulk`, async ({ request }: any) => {
    const bulkAction = await request.json() as BulkProductAction;
    
    return HttpResponse.json({
      success: true,
      message: `Bulk ${bulkAction.action} completed for ${bulkAction.productIds.length} products`,
      affectedCount: bulkAction.productIds.length,
    });
  }),

  http.post(`${API_BASE}/ecommerce/orders/bulk`, async ({ request }: any) => {
    const bulkAction = await request.json() as BulkOrderAction;
    
    return HttpResponse.json({
      success: true,
      message: `Bulk ${bulkAction.action} completed for ${bulkAction.orderIds.length} orders`,
      affectedCount: bulkAction.orderIds.length,
    });
  }),

  // Categories API (기본)
  http.get(`${API_BASE}/ecommerce/categories`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: 'cat_1', name: 'Electronics', slug: 'electronics', count: 10 },
        { id: 'cat_2', name: 'Clothing', slug: 'clothing', count: 5 },
        { id: 'cat_3', name: 'Books', slug: 'books', count: 8 },
      ],
    });
  }),

  // Dashboard Stats
  http.get(`${API_BASE}/ecommerce/dashboard/stats`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        todaySales: 1250000,
        todayOrders: 24,
        totalProducts: 156,
        lowStockProducts: 8,
        pendingOrders: 12,
        totalCustomers: 1890,
      },
    });
  }),

  // Error scenarios for testing
  http.get(`${API_BASE}/ecommerce/products/error-test`, () => {
    return HttpResponse.json({
      success: false,
      message: 'Internal server error',
      error: 'TEST_ERROR',
    }, { status: 500 });
  }),

  // =============================================================================
  // DASHBOARD MVP API HANDLERS
  // =============================================================================

  // StatsOverview Widget APIs
  http.get(`${API_BASE}/services/ecommerce/stats`, () => {
    return HttpResponse.json(SAMPLE_ECOMMERCE_STATS);
  }),

  http.get(`${API_BASE}/services/forum/stats`, () => {
    return HttpResponse.json(SAMPLE_FORUM_STATS);
  }),

  http.get(`${API_BASE}/users/stats`, () => {
    return HttpResponse.json(SAMPLE_USER_STATS);
  }),

  // RealtimeStats Widget API
  http.get(`${API_BASE}/services/realtime-overview`, () => {
    return HttpResponse.json(SAMPLE_REALTIME_OVERVIEW);
  }),

  // RecentActivity Widget API
  http.get(`${API_BASE}/services/recent-activities`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const type = url.searchParams.get('type');
    const priority = url.searchParams.get('priority');

    let activities = [...SAMPLE_RECENT_ACTIVITIES.data.activities];

    // 필터링
    if (type) {
      activities = activities.filter(activity => activity.type === type);
    }
    if (priority) {
      activities = activities.filter(activity => activity.priority === priority);
    }

    // 페이지네이션
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedActivities = activities.slice(startIndex, endIndex);

    return HttpResponse.json({
      success: true,
      data: {
        activities: paginatedActivities,
        pagination: {
          current: page,
          total: Math.ceil(activities.length / limit),
          count: paginatedActivities.length,
          totalItems: activities.length
        },
        summary: SAMPLE_RECENT_ACTIVITIES.data.summary
      },
      message: "Recent activities retrieved successfully"
    });
  }),

  // SystemStatus Widget API
  http.get(`${API_BASE}/system/health-check`, () => {
    return HttpResponse.json(SAMPLE_SYSTEM_HEALTH);
  }),

  // Unified Dashboard API (optional)
  http.get(`${API_BASE}/dashboard/unified`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        ecommerceStats: SAMPLE_ECOMMERCE_STATS.data,
        forumStats: SAMPLE_FORUM_STATS.data,
        userStats: SAMPLE_USER_STATS.data,
        realtimeOverview: SAMPLE_REALTIME_OVERVIEW.data,
        recentActivities: SAMPLE_RECENT_ACTIVITIES.data,
        systemHealth: SAMPLE_SYSTEM_HEALTH.data,
      },
      message: "Unified dashboard data retrieved successfully"
    });
  }),

  // Dashboard API Error scenarios for testing
  http.get(`${API_BASE}/services/ecommerce/stats/error-test`, () => {
    return HttpResponse.json({
      success: false,
      error: 'Failed to fetch ecommerce statistics',
      code: 'ECOMMERCE_STATS_ERROR',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }),

  http.get(`${API_BASE}/system/health-check/slow-test`, async () => {
    // 5초 지연으로 로딩 상태 테스트
    await new Promise(resolve => setTimeout(resolve, 5000));
    return HttpResponse.json(SAMPLE_SYSTEM_HEALTH);
  }),

  // =============================================================================
  // DASHBOARD MAIN API HANDLERS
  // =============================================================================

  // Dashboard Stats API (main dashboard)
  http.get(`${API_BASE}/dashboard/stats`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        stats: {
          users: {
            total: 1234,
            pending: 23,
            today: 45,
            activeRate: 85.4,
            change: 12.5,
            trend: 'up' as const
          },
          sales: {
            today: 2450000,
            changePercent: 15.3,
            monthlyTotal: 35000000,
            monthlyTarget: 50000000,
            trend: 'up' as const
          },
          products: {
            active: 156,
            lowStock: 8,
            newThisWeek: 5,
            bestsellers: [
              { id: '1', name: 'Premium Omega-3', sales: 234 },
              { id: '2', name: 'Vitamin C 1000mg', sales: 189 },
              { id: '3', name: 'Multi-Vitamin Complex', sales: 156 }
            ],
            change: 8.2,
            trend: 'up' as const
          },
          content: {
            publishedPages: 45,
            draftContent: 12,
            totalMedia: 234,
            todayViews: 1567,
            change: 23.4,
            trend: 'up' as const
          },
          partners: {
            active: 34,
            pending: 5,
            totalCommission: 4500000,
            topPartners: [
              { id: '1', name: 'Health Store Plus', commission: 850000 },
              { id: '2', name: 'Wellness Shop', commission: 620000 },
              { id: '3', name: 'Natural Life', commission: 450000 }
            ],
            change: 5.8,
            trend: 'down' as const
          }
        }
      },
      message: "Dashboard stats retrieved successfully"
    });
  }),

  // Dashboard Chart Data API
  http.get(`${API_BASE}/dashboard/charts`, () => {
    const salesData = [];
    const today = new Date();
    
    // Generate 30 days of sales data
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      salesData.push({
        date: date.toISOString().split('T')[0],
        amount: Math.floor(Math.random() * 3000000) + 1000000,
        orders: Math.floor(Math.random() * 50) + 20
      });
    }

    // Generate user data for last 7 days
    const userData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      userData.push({
        date: date.toISOString().split('T')[0],
        newUsers: Math.floor(Math.random() * 30) + 10,
        activeUsers: Math.floor(Math.random() * 150) + 100
      });
    }

    return HttpResponse.json({
      success: true,
      data: {
        sales: salesData,
        orders: [
          { status: '대기중', count: 23, color: '#f59e0b' },
          { status: '처리중', count: 45, color: '#3b82f6' },
          { status: '배송중', count: 67, color: '#8b5cf6' },
          { status: '완료', count: 234, color: '#10b981' },
          { status: '취소', count: 12, color: '#ef4444' },
          { status: '환불', count: 5, color: '#f97316' }
        ],
        users: userData
      },
      message: "Chart data retrieved successfully"
    });
  }),

  // Dashboard Notifications API
  http.get(`${API_BASE}/admin/notifications`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        notifications: [
          {
            id: 'notif_1',
            type: 'urgent',
            title: '재고 부족 경고',
            message: '프리미엄 오메가3 제품의 재고가 5개 미만입니다.',
            time: '2분 전',
            read: false,
            actionUrl: '/products?filter=low-stock'
          },
          {
            id: 'notif_2',
            type: 'approval',
            title: '사업자 승인 대기',
            message: '새로운 사업자 회원 3명의 승인이 대기 중입니다.',
            time: '15분 전',
            read: false,
            actionUrl: '/users?filter=pending'
          },
          {
            id: 'notif_3',
            type: 'success',
            title: '일일 매출 목표 달성',
            message: '오늘 매출이 목표액을 초과 달성했습니다!',
            time: '1시간 전',
            read: true
          },
          {
            id: 'notif_4',
            type: 'info',
            title: '시스템 업데이트 완료',
            message: '시스템이 최신 버전으로 업데이트되었습니다.',
            time: '3시간 전',
            read: true
          }
        ]
      },
      message: "Notifications retrieved successfully"
    });
  }),

  // Dashboard Activities API
  http.get(`${API_BASE}/admin/activities`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        activities: [
          {
            id: 'act_1',
            type: 'user',
            message: '새로운 사업자 회원이 가입했습니다',
            time: '방금 전',
            user: '김사업 (businesskim@example.com)',
            icon: '👤'
          },
          {
            id: 'act_2',
            type: 'order',
            message: '새 주문이 접수되었습니다 (#ORD-2025-0123)',
            time: '5분 전',
            user: '이고객',
            icon: '🛒'
          },
          {
            id: 'act_3',
            type: 'product',
            message: '비타민C 1000mg 상품이 품절되었습니다',
            time: '10분 전',
            icon: '📦'
          },
          {
            id: 'act_4',
            type: 'content',
            message: '건강 관리 가이드 페이지가 수정되었습니다',
            time: '30분 전',
            user: '관리자',
            icon: '📄'
          },
          {
            id: 'act_5',
            type: 'order',
            message: '주문 #ORD-2025-0119이 배송 완료되었습니다',
            time: '1시간 전',
            icon: '✅'
          },
          {
            id: 'act_6',
            type: 'user',
            message: '제휴사 "헬스케어 프로"가 승인되었습니다',
            time: '2시간 전',
            user: '관리자',
            icon: '🤝'
          }
        ]
      },
      message: "Activities retrieved successfully"
    });
  }),

  // System Health API
  http.get(`${API_BASE}/system/health`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        api: {
          status: 'healthy',
          responseTime: 125,
          lastCheck: new Date().toISOString()
        },
        database: {
          status: 'healthy',
          connections: 12,
          lastCheck: new Date().toISOString()
        },
        storage: {
          status: 'healthy',
          usage: 3.2,
          total: 10
        },
        memory: {
          status: 'warning',
          usage: 1.8,
          total: 2
        }
      },
      message: "System health retrieved successfully"
    });
  }),

  // =============================================================================
  // USER MANAGEMENT API HANDLERS
  // =============================================================================

  // Users List API with filtering, searching, and pagination
  http.get(`${API_BASE}/users`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const role = url.searchParams.get('role');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');

    // 모의 사용자 데이터 생성 (50명)
    let users = createMockUserList(50);

    // 필터링 적용
    if (role && role !== 'all') {
      users = users.filter(user => user.role === role);
    }

    if (status && status !== 'all') {
      users = users.filter(user => user.status === status);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.businessInfo?.businessName?.toLowerCase().includes(searchLower))
      );
    }

    if (dateFrom) {
      users = users.filter(user => new Date(user.createdAt) >= new Date(dateFrom));
    }

    if (dateTo) {
      users = users.filter(user => new Date(user.createdAt) <= new Date(dateTo));
    }

    // 최신순 정렬
    users.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 페이지네이션
    const totalUsers = users.length;
    const totalPages = Math.ceil(totalUsers / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = users.slice(startIndex, endIndex);

    return HttpResponse.json({
      success: true,
      data: {
        users: paginatedUsers,
        pagination: {
          current: page,
          total: totalPages,
          count: paginatedUsers.length,
          totalItems: totalUsers,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        filters: {
          role,
          status,
          search,
          dateFrom,
          dateTo
        }
      },
      message: `${totalUsers}명의 사용자를 조회했습니다.`
    });
  }),

  // Get User by ID
  http.get(`${API_BASE}/users/:id`, ({ params }) => {
    const { id } = params;
    
    if (id === 'not-found') {
      return HttpResponse.json({
        success: false,
        error: 'User not found',
        message: '사용자를 찾을 수 없습니다.'
      }, { status: 404 });
    }

    const user = createMockUser({
      id: id as string,
      name: `사용자 ${id}`,
      email: `user${id}@example.com`,
      role: 'customer',
      status: 'approved'
    });

    return HttpResponse.json({
      success: true,
      data: user,
      message: '사용자 정보를 조회했습니다.'
    });
  }),

  // Create User
  http.post(`${API_BASE}/users`, async ({ request }) => {
    const userData = await request.json() as UserFormData;
    
    // 이메일 중복 검사 시뮬레이션
    if (userData.email === 'duplicate@example.com') {
      return HttpResponse.json({
        success: false,
        error: 'Email already exists',
        message: '이미 사용 중인 이메일입니다.'
      }, { status: 409 });
    }

    const newUser = createMockUser({
      id: `user_${Date.now()}`,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      businessInfo: userData.businessInfo as BusinessInfo | undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'approved'
    });

    return HttpResponse.json({
      success: true,
      data: newUser,
      message: '새 사용자가 생성되었습니다.'
    });
  }),

  // Update User
  http.put(`${API_BASE}/users/:id`, async ({ params, request }: any) => {
    const { id } = params;
    const updateData = await request.json() as Partial<User>;

    const updatedUser = createMockUser({
      id: id as string,
      ...updateData,
      updatedAt: new Date().toISOString()
    });

    return HttpResponse.json({
      success: true,
      data: updatedUser,
      message: '사용자 정보가 업데이트되었습니다.'
    });
  }),

  // Delete User
  http.delete(`${API_BASE}/users/:id`, ({ params }: any) => {
    const { id } = params;

    return HttpResponse.json({
      success: true,
      message: `사용자(${id})가 삭제되었습니다.`
    });
  }),

  // Bulk User Actions
  http.post(`${API_BASE}/users/bulk`, async ({ request }) => {
    const bulkAction = await request.json() as UserBulkAction;
    
    const actionLabels = {
      approve: '승인',
      reject: '거부',
      suspend: '정지',
      reactivate: '활성화',
      delete: '삭제'
    };

    return HttpResponse.json({
      success: true,
      message: `${bulkAction.userIds.length}명의 사용자를 ${actionLabels[bulkAction.action]}했습니다.`,
      affectedCount: bulkAction.userIds.length,
      action: bulkAction.action
    });
  }),

  // Bulk User Delete
  http.delete(`${API_BASE}/users`, async ({ request }: any) => {
    const { userIds } = await request.json() as { userIds: string[] };

    return HttpResponse.json({
      success: true,
      message: `${userIds.length}명의 사용자가 삭제되었습니다.`,
      affectedCount: userIds.length
    });
  }),

  // Change User Role (Bulk)
  http.put(`${API_BASE}/users/roles`, async ({ request }: any) => {
    const { userIds, role } = await request.json() as { userIds: string[]; role: UserRole };

    return HttpResponse.json({
      success: true,
      message: `${userIds.length}명의 사용자 역할을 변경했습니다.`,
      affectedCount: userIds.length,
      newRole: role
    });
  }),

  // User Statistics
  http.get(`${API_BASE}/users/statistics`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        total: 1250,
        pending: 23,
        approved: 1150,
        rejected: 45,
        suspended: 32,
        byRole: {
          admin: 5,
          customer: 980,
          business: 230,
          affiliate: 35
        },
        recentRegistrations: createMockUserList(5),
        growthRate: 15.2
      },
      message: '사용자 통계를 조회했습니다.'
    });
  }),

  // User Activity Logs
  http.get(`${API_BASE}/users/:id/activity`, ({ params, request }) => {
    const { id } = params;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const activities = Array.from({ length: 25 }, (_, i) => ({
      id: `activity_${i + 1}`,
      userId: id as string,
      action: ['로그인', '정보수정', '비밀번호변경', '권한변경'][i % 4],
      details: `사용자 활동 상세 정보 ${i + 1}`,
      performedBy: i % 3 === 0 ? 'system' : 'admin_1',
      performedAt: new Date(Date.now() - (i * 3600000)).toISOString()
    }));

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedActivities = activities.slice(startIndex, endIndex);

    return HttpResponse.json({
      success: true,
      data: {
        activities: paginatedActivities,
        pagination: {
          current: page,
          total: Math.ceil(activities.length / limit),
          count: paginatedActivities.length,
          totalItems: activities.length
        }
      },
      message: '사용자 활동 로그를 조회했습니다.'
    });
  })
];
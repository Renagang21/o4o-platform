/**
 * Dashboard MVP API Data Structures
 * 
 * This file defines the JSON response structures for all dashboard-related APIs
 * Based on existing API patterns in the admin-dashboard application
 * 
 * @version MVP v1.0
 * @created 2025-07-12
 */

// =============================================================================
// BASE API RESPONSE STRUCTURE
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current: number;
    total: number;
    count: number;
    totalItems: number;
  };
}

// =============================================================================
// 1. STATS OVERVIEW WIDGET API STRUCTURES
// =============================================================================

/**
 * GET /api/services/ecommerce/stats
 * E-commerce 관련 통계 데이터
 */
export interface EcommerceStatsResponse {
  success: true;
  data: {
    sales: {
      totalRevenue: number;          // 총 매출 (KRW)
      todayRevenue: number;          // 오늘 매출
      monthlyRevenue: number;        // 이번 달 매출
      revenueChange: number;         // 매출 변화율 (%)
      revenueChangeType: 'increase' | 'decrease' | 'stable';
    };
    orders: {
      totalOrders: number;           // 총 주문 수
      todayOrders: number;           // 오늘 주문 수
      pendingOrders: number;         // 대기 중 주문
      completedOrders: number;       // 완료된 주문
      orderChange: number;           // 주문 변화율 (%)
      orderChangeType: 'increase' | 'decrease' | 'stable';
      averageOrderValue: number;     // 평균 주문 금액
    };
    products: {
      totalProducts: number;         // 총 상품 수
      activeProducts: number;        // 활성 상품 수
      lowStockProducts: number;      // 재고 부족 상품
      outOfStockProducts: number;    // 품절 상품
      newProductsToday: number;      // 오늘 신규 등록 상품
    };
    users: {
      totalUsers: number;            // 총 사용자 수
      newUsersToday: number;         // 오늘 신규 사용자
      activeUsers: number;           // 활성 사용자 (최근 30일)
      userRetentionRate: number;     // 사용자 유지율 (%)
    };
    inventory: {
      totalInventoryValue: number;   // 총 재고 가치
      lowStockAlerts: number;        // 재고 부족 알림 수
      reorderSuggestions: number;    // 재주문 제안 수
    };
  };
  message: "E-commerce statistics retrieved successfully";
}

/**
 * GET /api/services/forum/stats  
 * 포럼/커뮤니티 관련 통계 데이터
 */
export interface ForumStatsResponse {
  success: true;
  data: {
    posts: {
      totalPosts: number;            // 총 게시글 수
      todayPosts: number;            // 오늘 게시글 수
      activePosts: number;           // 활성 게시글 수
      moderationPending: number;     // 승인 대기 게시글
      postChange: number;            // 게시글 변화율 (%)
      postChangeType: 'increase' | 'decrease' | 'stable';
    };
    engagement: {
      totalComments: number;         // 총 댓글 수
      todayComments: number;         // 오늘 댓글 수
      totalLikes: number;            // 총 좋아요 수
      averageEngagementRate: number; // 평균 참여율 (%)
    };
    users: {
      activeForumUsers: number;      // 활성 포럼 사용자
      newForumMembersToday: number;  // 오늘 신규 포럼 회원
      topContributors: number;       // 상위 기여자 수
    };
    moderation: {
      reportedContent: number;       // 신고된 콘텐츠
      bannedUsers: number;           // 차단된 사용자
      moderationActions: number;     // 오늘 조치 건수
    };
  };
  message: "Forum statistics retrieved successfully";
}

/**
 * GET /api/users/stats
 * 사용자 관련 통계 데이터  
 */
export interface UserStatsResponse {
  success: true;
  data: {
    overview: {
      totalUsers: number;            // 총 사용자 수
      activeUsers: number;           // 활성 사용자 (최근 30일)
      newUsersToday: number;         // 오늘 신규 가입
      userGrowthRate: number;        // 사용자 증가율 (%)
      userGrowthType: 'increase' | 'decrease' | 'stable';
    };
    byRole: {
      admins: number;                // 관리자 수
      users: number;                 // 일반 사용자 수
      business: number;              // 비즈니스 사용자 수
      affiliates: number;            // 제휴 파트너 수
    };
    byStatus: {
      active: number;                // 활성 사용자
      pending: number;               // 승인 대기 사용자
      suspended: number;             // 정지된 사용자
      inactive: number;              // 비활성 사용자
    };
    engagement: {
      dailyActiveUsers: number;      // 일일 활성 사용자
      weeklyActiveUsers: number;     // 주간 활성 사용자
      monthlyActiveUsers: number;    // 월간 활성 사용자
      averageSessionDuration: number; // 평균 세션 시간 (분)
    };
    geography: {
      korea: number;                 // 한국 사용자
      international: number;         // 해외 사용자
      topCities: Array<{
        city: string;
        count: number;
      }>;
    };
  };
  message: "User statistics retrieved successfully";
}

// Sample data for StatsOverviewWidget APIs
export const SAMPLE_ECOMMERCE_STATS: EcommerceStatsResponse = {
  success: true,
  data: {
    sales: {
      totalRevenue: 125480000,       // 1억 2548만원
      todayRevenue: 3420000,         // 342만원
      monthlyRevenue: 45600000,      // 4560만원
      revenueChange: 12.5,
      revenueChangeType: 'increase'
    },
    orders: {
      totalOrders: 8234,
      todayOrders: 47,
      pendingOrders: 23,
      completedOrders: 8187,
      orderChange: 8.3,
      orderChangeType: 'increase',
      averageOrderValue: 152400
    },
    products: {
      totalProducts: 1547,
      activeProducts: 1489,
      lowStockProducts: 34,
      outOfStockProducts: 12,
      newProductsToday: 5
    },
    users: {
      totalUsers: 12847,
      newUsersToday: 28,
      activeUsers: 3456,
      userRetentionRate: 78.5
    },
    inventory: {
      totalInventoryValue: 890450000, // 8억 9045만원
      lowStockAlerts: 34,
      reorderSuggestions: 18
    }
  },
  message: "E-commerce statistics retrieved successfully"
};

export const SAMPLE_FORUM_STATS: ForumStatsResponse = {
  success: true,
  data: {
    posts: {
      totalPosts: 15647,
      todayPosts: 89,
      activePosts: 12456,
      moderationPending: 12,
      postChange: 15.2,
      postChangeType: 'increase'
    },
    engagement: {
      totalComments: 48932,
      todayComments: 234,
      totalLikes: 156789,
      averageEngagementRate: 68.4
    },
    users: {
      activeForumUsers: 5678,
      newForumMembersToday: 45,
      topContributors: 156
    },
    moderation: {
      reportedContent: 8,
      bannedUsers: 23,
      moderationActions: 15
    }
  },
  message: "Forum statistics retrieved successfully"
};

export const SAMPLE_USER_STATS: UserStatsResponse = {
  success: true,
  data: {
    overview: {
      totalUsers: 28456,
      activeUsers: 12847,
      newUsersToday: 67,
      userGrowthRate: 9.8,
      userGrowthType: 'increase'
    },
    byRole: {
      admins: 12,
      users: 25634,
      business: 2456,
      affiliates: 354
    },
    byStatus: {
      active: 26789,
      pending: 234,
      suspended: 156,
      inactive: 1277
    },
    engagement: {
      dailyActiveUsers: 4567,
      weeklyActiveUsers: 12847,
      monthlyActiveUsers: 21456,
      averageSessionDuration: 28.5
    },
    geography: {
      korea: 24567,
      international: 3889,
      topCities: [
        { city: "서울", count: 12456 },
        { city: "부산", count: 3456 },
        { city: "대구", count: 2134 },
        { city: "인천", count: 1987 },
        { city: "광주", count: 1456 }
      ]
    }
  },
  message: "User statistics retrieved successfully"
};

// =============================================================================
// 2. REALTIME STATS WIDGET API STRUCTURES
// =============================================================================

/**
 * GET /api/services/realtime-overview
 * 실시간 대시보드 초기 스냅샷 데이터
 */
export interface RealtimeOverviewResponse {
  success: true;
  data: {
    timestamp: string;               // ISO 8601 format
    currentUsers: {
      online: number;                // 현재 온라인 사용자
      browsing: number;              // 현재 상품 브라우징 중인 사용자
      purchasing: number;            // 현재 구매 진행 중인 사용자
      chatting: number;              // 포럼/채팅 참여 중인 사용자
    };
    liveMetrics: {
      requestsPerMinute: number;     // 분당 요청 수
      averageResponseTime: number;   // 평균 응답 시간 (ms)
      errorRate: number;             // 에러율 (%)
      serverLoad: number;            // 서버 부하 (%)
    };
    realtimeActivities: {
      newOrders: number;             // 지난 5분간 신규 주문
      newRegistrations: number;      // 지난 5분간 신규 가입
      newPosts: number;              // 지난 5분간 신규 게시글
      activeChats: number;           // 현재 활성 채팅 세션
    };
    geographicDistribution: Array<{
      country: string;
      region: string;
      userCount: number;
      coordinates: [number, number]; // [longitude, latitude]
    }>;
    trafficSources: {
      direct: number;                // 직접 접속 (%)
      search: number;                // 검색 엔진 (%)
      social: number;                // 소셜 미디어 (%)
      referral: number;              // 레퍼럴 (%)
      ads: number;                   // 광고 (%)
    };
    performanceMetrics: {
      pageLoadTime: number;          // 평균 페이지 로드 시간 (ms)
      bounceRate: number;            // 이탈률 (%)
      conversionRate: number;        // 전환율 (%)
    };
  };
  message: "Real-time overview retrieved successfully";
}

/**
 * Socket.io Event Definitions for Real-time Updates
 */
export interface DashboardSocketEvents {
  // 클라이언트가 받는 이벤트들
  'dashboard:user_online': UserOnlineEvent;
  'dashboard:new_order': NewOrderEvent;
  'dashboard:new_registration': NewRegistrationEvent;
  'dashboard:new_post': NewPostEvent;
  'dashboard:metric_update': MetricUpdateEvent;
  'dashboard:alert': SystemAlertEvent;
  'dashboard:notification': NotificationEvent;
  
  // 클라이언트가 보내는 이벤트들  
  'dashboard:subscribe': DashboardSubscribeEvent;
  'dashboard:unsubscribe': DashboardUnsubscribeEvent;
}

export interface UserOnlineEvent {
  timestamp: string;
  data: {
    userId: number;
    action: 'joined' | 'left';
    currentOnlineCount: number;
    userInfo: {
      role: 'admin' | 'user' | 'business' | 'affiliate';
      location: string;
    };
  };
}

export interface NewOrderEvent {
  timestamp: string;
  data: {
    orderId: number;
    customerId: number;
    totalAmount: number;
    currency: string;
    items: Array<{
      productId: number;
      productName: string;
      quantity: number;
      price: number;
    }>;
    orderStatus: string;
    customerInfo: {
      name: string;
      location: string;
    };
  };
}

export interface NewRegistrationEvent {
  timestamp: string;
  data: {
    userId: number;
    userType: 'user' | 'business' | 'affiliate';
    location: string;
    registrationSource: 'website' | 'mobile' | 'api';
    userName: string; // 익명화된 이름 (예: "김**")
  };
}

export interface NewPostEvent {
  timestamp: string;
  data: {
    postId: number;
    authorId: number;
    postType: 'forum' | 'blog' | 'qa' | 'review';
    title: string;
    category: string;
    isModerated: boolean;
    engagement: {
      views: number;
      likes: number;
      comments: number;
    };
  };
}

export interface MetricUpdateEvent {
  timestamp: string;
  data: {
    metricType: 'sales' | 'traffic' | 'performance' | 'users';
    updates: {
      [key: string]: number;
    };
    trend: 'up' | 'down' | 'stable';
    percentage: number;
  };
}

export interface SystemAlertEvent {
  timestamp: string;
  data: {
    alertId: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    service: 'api' | 'database' | 'storage' | 'payment' | 'email';
    message: string;
    affectedUsers?: number;
    estimatedResolution?: string;
    actions?: Array<{
      label: string;
      url: string;
    }>;
  };
}

export interface NotificationEvent {
  timestamp: string;
  data: {
    notificationId: string;
    type: 'order' | 'user_action' | 'system' | 'security' | 'content';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    title: string;
    message: string;
    relatedEntityId?: number;
    relatedEntityType?: 'order' | 'user' | 'product' | 'post';
    actionRequired: boolean;
    actionUrl?: string;
  };
}

export interface DashboardSubscribeEvent {
  channels: Array<
    'user_activity' | 'orders' | 'registrations' | 'posts' | 
    'metrics' | 'alerts' | 'notifications' | 'system_health'
  >;
  adminId: number;
}

export interface DashboardUnsubscribeEvent {
  channels: Array<string>;
  adminId: number;
}

// Sample data for RealtimeStatsWidget
export const SAMPLE_REALTIME_OVERVIEW: RealtimeOverviewResponse = {
  success: true,
  data: {
    timestamp: "2025-07-12T09:15:30.000Z",
    currentUsers: {
      online: 1247,
      browsing: 456,
      purchasing: 23,
      chatting: 89
    },
    liveMetrics: {
      requestsPerMinute: 2340,
      averageResponseTime: 127,
      errorRate: 0.8,
      serverLoad: 45.2
    },
    realtimeActivities: {
      newOrders: 12,
      newRegistrations: 8,
      newPosts: 15,
      activeChats: 34
    },
    geographicDistribution: [
      { country: "Korea", region: "Seoul", userCount: 567, coordinates: [126.9780, 37.5665] },
      { country: "Korea", region: "Busan", userCount: 234, coordinates: [129.0756, 35.1796] },
      { country: "Korea", region: "Daegu", userCount: 156, coordinates: [128.6014, 35.8714] },
      { country: "USA", region: "California", userCount: 89, coordinates: [-119.4179, 36.7783] },
      { country: "Japan", region: "Tokyo", userCount: 67, coordinates: [139.6917, 35.6895] }
    ],
    trafficSources: {
      direct: 42.5,
      search: 28.3,
      social: 15.7,
      referral: 8.9,
      ads: 4.6
    },
    performanceMetrics: {
      pageLoadTime: 1245,
      bounceRate: 23.4,
      conversionRate: 3.8
    }
  },
  message: "Real-time overview retrieved successfully"
};

// Sample Socket.io events
export const SAMPLE_SOCKET_EVENTS = {
  USER_ONLINE: {
    timestamp: "2025-07-12T09:16:45.000Z",
    data: {
      userId: 12847,
      action: 'joined' as const,
      currentOnlineCount: 1248,
      userInfo: {
        role: 'user' as const,
        location: '서울'
      }
    }
  } as UserOnlineEvent,

  NEW_ORDER: {
    timestamp: "2025-07-12T09:17:12.000Z",
    data: {
      orderId: 98765,
      customerId: 12847,
      totalAmount: 245000,
      currency: "KRW",
      items: [
        { productId: 456, productName: "프리미엄 티셔츠", quantity: 2, price: 89000 },
        { productId: 789, productName: "청바지", quantity: 1, price: 67000 }
      ],
      orderStatus: "confirmed",
      customerInfo: {
        name: "김**",
        location: "서울"
      }
    }
  } as NewOrderEvent,

  NEW_REGISTRATION: {
    timestamp: "2025-07-12T09:17:34.000Z",
    data: {
      userId: 28457,
      userType: 'user' as const,
      location: "부산",
      registrationSource: 'website' as const,
      userName: "이**"
    }
  } as NewRegistrationEvent,

  NEW_POST: {
    timestamp: "2025-07-12T09:18:01.000Z",
    data: {
      postId: 15648,
      authorId: 9876,
      postType: 'forum' as const,
      title: "신제품 후기입니다",
      category: "상품후기",
      isModerated: false,
      engagement: {
        views: 1,
        likes: 0,
        comments: 0
      }
    }
  } as NewPostEvent,

  METRIC_UPDATE: {
    timestamp: "2025-07-12T09:18:30.000Z",
    data: {
      metricType: 'sales' as const,
      updates: {
        todayRevenue: 3465000,
        todayOrders: 48
      },
      trend: 'up' as const,
      percentage: 12.8
    }
  } as MetricUpdateEvent,

  SYSTEM_ALERT: {
    timestamp: "2025-07-12T09:19:15.000Z",
    data: {
      alertId: "SYS-2025-0712-001",
      level: 'warning' as const,
      service: 'payment' as const,
      message: "결제 서비스 응답 시간이 평소보다 느립니다",
      affectedUsers: 23,
      estimatedResolution: "10분",
      actions: [
        { label: "결제 대시보드 확인", url: "/admin/payments/dashboard" },
        { label: "시스템 상태 확인", url: "/admin/system/health" }
      ]
    }
  } as SystemAlertEvent
};

// =============================================================================
// 3. RECENT ACTIVITY WIDGET API STRUCTURES
// =============================================================================

/**
 * GET /api/services/recent-activities
 * 최근 활동 통합 데이터 (페이지네이션 지원)
 */
export interface RecentActivitiesResponse {
  success: true;
  data: {
    activities: ActivityItem[];
    pagination: {
      current: number;
      total: number;
      count: number;
      totalItems: number;
    };
    summary: {
      totalActivitiesToday: number;
      criticalActivities: number;
      pendingActions: number;
      lastUpdateTime: string;
    };
  };
  message: "Recent activities retrieved successfully";
}

export interface ActivityItem {
  id: string;
  timestamp: string;              // ISO 8601 format
  type: 'order' | 'user' | 'product' | 'content' | 'system' | 'security' | 'payment' | 'forum';
  category: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected' | 'cancelled' | 'error' | 'warning' | 'info';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  
  // 연관 엔티티 정보
  relatedEntity?: {
    id: number;
    type: 'order' | 'user' | 'product' | 'post' | 'page' | 'comment';
    name: string;
    url?: string;                 // 관련 페이지로의 링크
  };

  // 사용자 정보 (활동을 수행한 사용자)
  actor?: {
    id: number;
    name: string;                 // 익명화된 이름 (예: "김**", "관리자")
    role: 'admin' | 'user' | 'business' | 'affiliate' | 'system';
    avatar?: string;
  };

  // 대상 사용자 (활동의 대상이 되는 사용자, 예: 사용자 승인 등)
  targetUser?: {
    id: number;
    name: string;
    role: 'user' | 'business' | 'affiliate';
  };

  // 메타데이터
  metadata?: {
    amount?: number;              // 주문금액, 포인트 등
    currency?: string;
    location?: string;
    deviceType?: 'desktop' | 'mobile' | 'api';
    ipAddress?: string;           // 보안 관련 활동에서 사용
    userAgent?: string;
  };

  // 액션 버튼들
  actions?: Array<{
    label: string;
    type: 'primary' | 'secondary' | 'danger';
    url: string;
    requiresConfirmation?: boolean;
  }>;

  // 추가 컨텍스트
  context?: {
    oldValue?: unknown;               // 업데이트 활동에서 이전 값
    newValue?: unknown;               // 업데이트 활동에서 새로운 값
    reason?: string;              // 거부/취소 등의 사유
    additionalInfo?: Record<string, unknown>;
  };
}

// 활동 타입별 필터링을 위한 타입 정의
export interface ActivityFilters {
  types?: Array<ActivityItem['type']>;
  categories?: Array<ActivityItem['category']>;
  priorities?: Array<ActivityItem['priority']>;
  dateRange?: {
    from: string;
    to: string;
  };
  actorRoles?: Array<'admin' | 'user' | 'business' | 'affiliate' | 'system'>;
  relatedEntityTypes?: Array<'order' | 'user' | 'product' | 'post' | 'page' | 'comment'>;
}

// Sample data for RecentActivityWidget
export const SAMPLE_RECENT_ACTIVITIES: RecentActivitiesResponse = {
  success: true,
  data: {
    activities: [
      {
        id: "ACT-2025-0712-001",
        timestamp: "2025-07-12T09:25:30.000Z",
        type: "order",
        category: "created",
        priority: "medium",
        title: "새로운 주문이 접수되었습니다",
        description: "고객 김**님이 245,000원 상당의 주문을 완료했습니다",
        relatedEntity: {
          id: 98765,
          type: "order",
          name: "주문 #98765",
          url: "/admin/orders/98765"
        },
        actor: {
          id: 12847,
          name: "김**",
          role: "user"
        },
        metadata: {
          amount: 245000,
          currency: "KRW",
          location: "서울",
          deviceType: "mobile"
        },
        actions: [
          {
            label: "주문 상세보기",
            type: "primary",
            url: "/admin/orders/98765"
          },
          {
            label: "고객 정보보기",
            type: "secondary",
            url: "/admin/users/12847"
          }
        ]
      },
      {
        id: "ACT-2025-0712-002",
        timestamp: "2025-07-12T09:20:15.000Z",
        type: "user",
        category: "created",
        priority: "low",
        title: "신규 사용자가 가입했습니다",
        description: "이**님이 비즈니스 사용자로 가입했습니다",
        relatedEntity: {
          id: 28457,
          type: "user",
          name: "이** (비즈니스)",
          url: "/admin/users/28457"
        },
        actor: {
          id: 28457,
          name: "이**",
          role: "business"
        },
        metadata: {
          location: "부산",
          deviceType: "desktop"
        },
        actions: [
          {
            label: "사용자 승인",
            type: "primary",
            url: "/admin/users/28457/approve",
            requiresConfirmation: true
          },
          {
            label: "프로필 보기",
            type: "secondary",
            url: "/admin/users/28457"
          }
        ]
      },
      {
        id: "ACT-2025-0712-003",
        timestamp: "2025-07-12T09:18:45.000Z",
        type: "content",
        category: "created",
        priority: "low",
        title: "새로운 포럼 게시글이 작성되었습니다",
        description: "상품후기 카테고리에 '신제품 후기입니다' 게시글이 작성되었습니다",
        relatedEntity: {
          id: 15648,
          type: "post",
          name: "신제품 후기입니다",
          url: "/admin/posts/15648"
        },
        actor: {
          id: 9876,
          name: "박**",
          role: "user"
        },
        metadata: {
          location: "대구",
          deviceType: "mobile"
        },
        actions: [
          {
            label: "게시글 보기",
            type: "primary",
            url: "/admin/posts/15648"
          },
          {
            label: "승인하기",
            type: "secondary",
            url: "/admin/posts/15648/approve"
          }
        ]
      },
      {
        id: "ACT-2025-0712-004",
        timestamp: "2025-07-12T09:15:20.000Z",
        type: "product",
        category: "updated",
        priority: "medium",
        title: "상품 재고가 부족합니다",
        description: "프리미엄 티셔츠 재고가 5개 이하로 떨어졌습니다",
        relatedEntity: {
          id: 456,
          type: "product",
          name: "프리미엄 티셔츠",
          url: "/admin/products/456"
        },
        actor: {
          id: 0,
          name: "시스템",
          role: "system"
        },
        metadata: {
          deviceType: "api"
        },
        actions: [
          {
            label: "재고 관리",
            type: "primary",
            url: "/admin/products/456/inventory"
          },
          {
            label: "재주문 하기",
            type: "secondary",
            url: "/admin/inventory/reorder/456"
          }
        ],
        context: {
          oldValue: { stock: 15 },
          newValue: { stock: 4 },
          additionalInfo: { threshold: 5, autoReorderEnabled: false }
        }
      },
      {
        id: "ACT-2025-0712-005",
        timestamp: "2025-07-12T09:12:10.000Z",
        type: "payment",
        category: "error",
        priority: "high",
        title: "결제 처리 실패",
        description: "주문 #98764의 결제 처리 중 오류가 발생했습니다",
        relatedEntity: {
          id: 98764,
          type: "order",
          name: "주문 #98764",
          url: "/admin/orders/98764"
        },
        actor: {
          id: 12846,
          name: "최**",
          role: "user"
        },
        metadata: {
          amount: 127000,
          currency: "KRW",
          location: "인천",
          deviceType: "desktop"
        },
        actions: [
          {
            label: "결제 재시도",
            type: "primary",
            url: "/admin/orders/98764/retry-payment",
            requiresConfirmation: true
          },
          {
            label: "고객 연락",
            type: "secondary",
            url: "/admin/users/12846/contact"
          },
          {
            label: "주문 취소",
            type: "danger",
            url: "/admin/orders/98764/cancel",
            requiresConfirmation: true
          }
        ],
        context: {
          reason: "카드 한도 초과",
          additionalInfo: { errorCode: "CARD_LIMIT_EXCEEDED", attempts: 2 }
        }
      },
      {
        id: "ACT-2025-0712-006",
        timestamp: "2025-07-12T09:10:05.000Z",
        type: "security",
        category: "warning",
        priority: "high",
        title: "의심스러운 로그인 시도",
        description: "알 수 없는 위치에서 관리자 계정 로그인 시도가 감지되었습니다",
        relatedEntity: {
          id: 1,
          type: "user",
          name: "관리자",
          url: "/admin/users/1"
        },
        metadata: {
          location: "Unknown (해외 IP)",
          deviceType: "desktop",
          ipAddress: "203.0.113.1",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        actions: [
          {
            label: "계정 잠금",
            type: "danger",
            url: "/admin/security/lock-account/1",
            requiresConfirmation: true
          },
          {
            label: "로그 상세보기",
            type: "secondary",
            url: "/admin/security/logs?user=1"
          }
        ],
        context: {
          additionalInfo: { 
            attempts: 5, 
            lastSuccessfulLogin: "2025-07-11T18:30:00.000Z",
            countryCode: "CN"
          }
        }
      },
      {
        id: "ACT-2025-0712-007",
        timestamp: "2025-07-12T09:08:30.000Z",
        type: "system",
        category: "info",
        priority: "low",
        title: "시스템 백업 완료",
        description: "일일 데이터베이스 백업이 성공적으로 완료되었습니다",
        actor: {
          id: 0,
          name: "시스템",
          role: "system"
        },
        metadata: {
          deviceType: "api"
        },
        actions: [
          {
            label: "백업 로그 보기",
            type: "secondary",
            url: "/admin/system/backup-logs"
          }
        ],
        context: {
          additionalInfo: {
            backupSize: "2.4GB",
            duration: "18분",
            backupType: "full"
          }
        }
      },
      {
        id: "ACT-2025-0712-008",
        timestamp: "2025-07-12T09:05:15.000Z",
        type: "user",
        category: "approved",
        priority: "medium",
        title: "비즈니스 사용자 승인",
        description: "정**님의 비즈니스 사용자 신청이 승인되었습니다",
        relatedEntity: {
          id: 28456,
          type: "user",
          name: "정** (비즈니스)",
          url: "/admin/users/28456"
        },
        actor: {
          id: 1,
          name: "관리자",
          role: "admin"
        },
        targetUser: {
          id: 28456,
          name: "정**",
          role: "business"
        },
        metadata: {
          deviceType: "desktop"
        },
        actions: [
          {
            label: "사용자 프로필",
            type: "primary",
            url: "/admin/users/28456"
          },
          {
            label: "환영 이메일 발송",
            type: "secondary",
            url: "/admin/users/28456/send-welcome-email"
          }
        ]
      }
    ],
    pagination: {
      current: 1,
      total: 15,
      count: 8,
      totalItems: 127
    },
    summary: {
      totalActivitiesToday: 127,
      criticalActivities: 2,
      pendingActions: 8,
      lastUpdateTime: "2025-07-12T09:25:30.000Z"
    }
  },
  message: "Recent activities retrieved successfully"
};

// =============================================================================
// 4. SYSTEM STATUS WIDGET API STRUCTURES
// =============================================================================

/**
 * GET /api/system/health-check
 * 통합 시스템 상태 및 헬스 체크 데이터
 */
export interface SystemHealthResponse {
  success: true;
  data: {
    timestamp: string;               // ISO 8601 format
    overallStatus: 'healthy' | 'warning' | 'critical' | 'maintenance';
    statusMessage: string;
    uptime: {
      seconds: number;               // 전체 uptime (초)
      humanReadable: string;         // "5일 12시간 34분"
      startTime: string;             // 서버 시작 시간
    };
    
    // 개별 서비스 상태
    services: {
      api: ServiceHealth;
      database: ServiceHealth;
      storage: ServiceHealth;
      payment: ServiceHealth;
      email: ServiceHealth;
      forum: ServiceHealth;
      search: ServiceHealth;
      cache: ServiceHealth;
    };

    // 시스템 메트릭
    metrics: {
      cpu: {
        usage: number;               // CPU 사용률 (%)
        cores: number;               // CPU 코어 수
        loadAverage: [number, number, number]; // 1min, 5min, 15min
      };
      memory: {
        used: number;                // 사용 중인 메모리 (MB)
        total: number;               // 전체 메모리 (MB)
        usage: number;               // 메모리 사용률 (%)
        available: number;           // 사용 가능한 메모리 (MB)
      };
      disk: {
        used: number;                // 사용 중인 디스크 (GB)
        total: number;               // 전체 디스크 (GB)
        usage: number;               // 디스크 사용률 (%)
        available: number;           // 사용 가능한 디스크 (GB)
      };
      network: {
        inbound: number;             // 인바운드 트래픽 (MB/s)
        outbound: number;            // 아웃바운드 트래픽 (MB/s)
        totalConnections: number;    // 현재 연결 수
      };
    };

    // 성능 지표
    performance: {
      averageResponseTime: number;   // 평균 응답 시간 (ms)
      requestsPerSecond: number;     // 초당 요청 수
      errorRate: number;             // 에러율 (%)
      throughput: number;            // 처리량 (req/min)
      activeConnections: number;     // 활성 연결 수
    };

    // 최근 이슈 및 알림
    recentIssues: SystemIssue[];
    
    // 시스템 정보
    systemInfo: {
      version: string;               // 애플리케이션 버전
      environment: 'development' | 'staging' | 'production';
      nodeVersion: string;
      platform: string;
      architecture: string;
      timezone: string;
    };

    // 모니터링 설정
    monitoring: {
      alertsEnabled: boolean;
      maintenanceMode: boolean;
      lastHealthCheck: string;
      nextMaintenanceWindow?: string;
    };
  };
  message: "System health check completed successfully";
}

export interface ServiceHealth {
  status: 'healthy' | 'warning' | 'critical' | 'down' | 'maintenance';
  name: string;
  description: string;
  responseTime: number;              // 응답 시간 (ms)
  uptime: number;                    // 업타임 (%)
  lastCheck: string;                 // 마지막 체크 시간
  
  // 서비스별 세부 지표
  metrics?: {
    connections?: number;            // DB, Cache 등의 연결 수
    queueSize?: number;              // 대기열 크기
    errorCount?: number;             // 최근 1시간 에러 수
    warningCount?: number;           // 최근 1시간 경고 수
    memoryUsage?: number;            // 메모리 사용량 (MB)
    diskUsage?: number;              // 디스크 사용량 (%)
  };

  // 의존성
  dependencies?: Array<{
    name: string;
    status: 'healthy' | 'warning' | 'critical' | 'down';
    responseTime: number;
  }>;

  // 최근 이벤트
  recentEvents?: Array<{
    timestamp: string;
    type: 'info' | 'warning' | 'error';
    message: string;
  }>;

  // 액션 버튼 (문제 해결용)
  actions?: Array<{
    label: string;
    type: 'restart' | 'maintenance' | 'check' | 'logs';
    url: string;
    requiresConfirmation?: boolean;
  }>;
}

export interface SystemIssue {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  service: string;
  title: string;
  description: string;
  status: 'active' | 'investigating' | 'resolved' | 'monitoring';
  affectedUsers?: number;
  estimatedResolution?: string;
  
  // 해결 단계
  resolutionSteps?: Array<{
    step: number;
    description: string;
    completed: boolean;
    timestamp?: string;
  }>;

  // 연관 메트릭
  relatedMetrics?: Array<{
    name: string;
    currentValue: number;
    normalValue: number;
    unit: string;
  }>;
}

// Sample data for SystemStatusWidget
export const SAMPLE_SYSTEM_HEALTH: SystemHealthResponse = {
  success: true,
  data: {
    timestamp: "2025-07-12T09:30:00.000Z",
    overallStatus: "warning",
    statusMessage: "일부 서비스에서 성능 저하가 감지되었습니다",
    uptime: {
      seconds: 432000,
      humanReadable: "5일 0시간 0분",
      startTime: "2025-07-07T09:30:00.000Z"
    },
    
    services: {
      api: {
        status: "healthy",
        name: "API 서버",
        description: "메인 API 서버가 정상 작동 중입니다",
        responseTime: 95,
        uptime: 99.8,
        lastCheck: "2025-07-12T09:29:45.000Z",
        metrics: {
          connections: 1247,
          errorCount: 3,
          warningCount: 12,
          memoryUsage: 2048
        },
        dependencies: [
          { name: "Database", status: "healthy", responseTime: 23 },
          { name: "Redis Cache", status: "healthy", responseTime: 8 }
        ],
        recentEvents: [
          {
            timestamp: "2025-07-12T09:15:00.000Z",
            type: "warning",
            message: "응답 시간이 평소보다 약간 높습니다"
          }
        ]
      },
      database: {
        status: "healthy",
        name: "PostgreSQL",
        description: "데이터베이스가 정상 작동 중입니다",
        responseTime: 23,
        uptime: 99.9,
        lastCheck: "2025-07-12T09:29:50.000Z",
        metrics: {
          connections: 85,
          queueSize: 2,
          errorCount: 0,
          memoryUsage: 4096,
          diskUsage: 67
        },
        actions: [
          {
            label: "연결 상태 확인",
            type: "check",
            url: "/admin/system/database/connections"
          },
          {
            label: "성능 통계 보기",
            type: "logs",
            url: "/admin/system/database/performance"
          }
        ]
      },
      storage: {
        status: "healthy",
        name: "파일 저장소",
        description: "파일 업로드 및 저장이 정상 작동 중입니다",
        responseTime: 145,
        uptime: 99.7,
        lastCheck: "2025-07-12T09:29:55.000Z",
        metrics: {
          diskUsage: 78,
          errorCount: 1,
          warningCount: 5
        }
      },
      payment: {
        status: "warning",
        name: "결제 서비스",
        description: "결제 처리 시간이 평소보다 느립니다",
        responseTime: 3400,
        uptime: 98.2,
        lastCheck: "2025-07-12T09:29:40.000Z",
        metrics: {
          connections: 23,
          queueSize: 12,
          errorCount: 8,
          warningCount: 24
        },
        dependencies: [
          { name: "PG사 API", status: "warning", responseTime: 2800 },
          { name: "카드사 API", status: "healthy", responseTime: 450 }
        ],
        recentEvents: [
          {
            timestamp: "2025-07-12T09:20:00.000Z",
            type: "warning",
            message: "PG사 응답 시간 증가"
          },
          {
            timestamp: "2025-07-12T09:10:00.000Z",
            type: "error",
            message: "카드 승인 실패 증가"
          }
        ],
        actions: [
          {
            label: "결제 대시보드",
            type: "check",
            url: "/admin/payments/dashboard"
          },
          {
            label: "서비스 재시작",
            type: "restart",
            url: "/admin/system/payment/restart",
            requiresConfirmation: true
          }
        ]
      },
      email: {
        status: "healthy",
        name: "이메일 서비스",
        description: "이메일 발송이 정상 작동 중입니다",
        responseTime: 1200,
        uptime: 99.5,
        lastCheck: "2025-07-12T09:29:30.000Z",
        metrics: {
          queueSize: 15,
          errorCount: 2,
          warningCount: 8
        }
      },
      forum: {
        status: "healthy",
        name: "포럼 서비스",
        description: "커뮤니티 포럼이 정상 작동 중입니다",
        responseTime: 180,
        uptime: 99.6,
        lastCheck: "2025-07-12T09:29:35.000Z",
        metrics: {
          connections: 589,
          errorCount: 1,
          warningCount: 3
        }
      },
      search: {
        status: "healthy",
        name: "검색 엔진",
        description: "검색 기능이 정상 작동 중입니다",
        responseTime: 67,
        uptime: 99.8,
        lastCheck: "2025-07-12T09:29:25.000Z",
        metrics: {
          errorCount: 0,
          warningCount: 1
        }
      },
      cache: {
        status: "healthy",
        name: "Redis 캐시",
        description: "캐시 서비스가 정상 작동 중입니다",
        responseTime: 8,
        uptime: 99.9,
        lastCheck: "2025-07-12T09:29:58.000Z",
        metrics: {
          connections: 234,
          memoryUsage: 1024,
          errorCount: 0,
          warningCount: 0
        }
      }
    },

    metrics: {
      cpu: {
        usage: 45.2,
        cores: 8,
        loadAverage: [1.2, 1.5, 1.8]
      },
      memory: {
        used: 12288,
        total: 16384,
        usage: 75.0,
        available: 4096
      },
      disk: {
        used: 180,
        total: 500,
        usage: 36.0,
        available: 320
      },
      network: {
        inbound: 45.8,
        outbound: 23.4,
        totalConnections: 2456
      }
    },

    performance: {
      averageResponseTime: 127,
      requestsPerSecond: 234,
      errorRate: 0.8,
      throughput: 14040,
      activeConnections: 1247
    },

    recentIssues: [
      {
        id: "ISS-2025-0712-001",
        timestamp: "2025-07-12T09:20:00.000Z",
        severity: "medium",
        service: "payment",
        title: "결제 서비스 응답 지연",
        description: "PG사 API 응답 시간이 평소 대비 3배 증가했습니다",
        status: "investigating",
        affectedUsers: 23,
        estimatedResolution: "30분",
        resolutionSteps: [
          { step: 1, description: "PG사 상태 확인", completed: true, timestamp: "2025-07-12T09:22:00.000Z" },
          { step: 2, description: "로드밸런싱 조정", completed: true, timestamp: "2025-07-12T09:25:00.000Z" },
          { step: 3, description: "캐시 설정 최적화", completed: false }
        ],
        relatedMetrics: [
          { name: "응답시간", currentValue: 3400, normalValue: 800, unit: "ms" },
          { name: "에러율", currentValue: 5.2, normalValue: 0.5, unit: "%" }
        ]
      }
    ],

    systemInfo: {
      version: "2.1.4",
      environment: "production",
      nodeVersion: "20.18.0",
      platform: "linux",
      architecture: "x64",
      timezone: "Asia/Seoul"
    },

    monitoring: {
      alertsEnabled: true,
      maintenanceMode: false,
      lastHealthCheck: "2025-07-12T09:30:00.000Z",
      nextMaintenanceWindow: "2025-07-14T02:00:00.000Z"
    }
  },
  message: "System health check completed successfully"
};

// =============================================================================
// 5. UNIFIED DASHBOARD API TYPES & UTILITIES
// =============================================================================

/**
 * 통합 대시보드 API 응답 타입
 * 모든 위젯이 동시에 필요로 하는 데이터를 한 번에 가져올 때 사용
 */
export interface UnifiedDashboardResponse {
  success: true;
  data: {
    timestamp: string;
    ecommerceStats: EcommerceStatsResponse['data'];
    forumStats: ForumStatsResponse['data'];
    userStats: UserStatsResponse['data'];
    realtimeOverview: RealtimeOverviewResponse['data'];
    recentActivities: RecentActivitiesResponse['data'];
    systemHealth: SystemHealthResponse['data'];
  };
  message: "Unified dashboard data retrieved successfully";
}

/**
 * API 엔드포인트 목록
 */
export const DASHBOARD_API_ENDPOINTS = {
  // StatsOverview Widget
  ECOMMERCE_STATS: '/api/services/ecommerce/stats',
  FORUM_STATS: '/api/services/forum/stats',
  USER_STATS: '/api/users/stats',
  
  // RealtimeStats Widget
  REALTIME_OVERVIEW: '/api/services/realtime-overview',
  
  // RecentActivity Widget
  RECENT_ACTIVITIES: '/api/services/recent-activities',
  
  // SystemStatus Widget
  SYSTEM_HEALTH: '/api/system/health-check',
  
  // Unified Dashboard
  UNIFIED_DASHBOARD: '/api/dashboard/unified',
} as const;

/**
 * Socket.io 이벤트 이름 목록
 */
export const DASHBOARD_SOCKET_EVENTS = {
  // 서버에서 클라이언트로
  USER_ONLINE: 'dashboard:user_online',
  NEW_ORDER: 'dashboard:new_order',
  NEW_REGISTRATION: 'dashboard:new_registration',
  NEW_POST: 'dashboard:new_post',
  METRIC_UPDATE: 'dashboard:metric_update',
  SYSTEM_ALERT: 'dashboard:alert',
  NOTIFICATION: 'dashboard:notification',
  
  // 클라이언트에서 서버로
  SUBSCRIBE: 'dashboard:subscribe',
  UNSUBSCRIBE: 'dashboard:unsubscribe',
} as const;

/**
 * 대시보드 위젯 타입 정의
 */
export type DashboardWidgetType = 
  | 'stats-overview'
  | 'realtime-stats'
  | 'recent-activity'
  | 'system-status'
  | 'quick-actions'
  | 'analytics-chart';

/**
 * 위젯별 필요한 데이터 타입 매핑
 */
export interface DashboardWidgetDataMap {
  'stats-overview': {
    ecommerce: EcommerceStatsResponse['data'];
    forum: ForumStatsResponse['data'];
    users: UserStatsResponse['data'];
  };
  'realtime-stats': RealtimeOverviewResponse['data'];
  'recent-activity': RecentActivitiesResponse['data'];
  'system-status': SystemHealthResponse['data'];
  'quick-actions': object; // 별도 API 없이 정적 데이터 사용
  'analytics-chart': object; // 향후 구현 예정
}

/**
 * API 오류 타입 정의
 */
export interface DashboardApiError {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * 로딩 상태 타입
 */
export interface DashboardLoadingState {
  isLoading: boolean;
  isError: boolean;
  error?: DashboardApiError;
  lastUpdated?: string;
}

/**
 * 대시보드 설정 타입
 */
export interface DashboardConfig {
  autoRefresh: boolean;
  refreshInterval: number; // milliseconds
  enableRealtime: boolean;
  enableNotifications: boolean;
  widgets: {
    [K in DashboardWidgetType]: {
      enabled: boolean;
      position: { x: number; y: number };
      size: { width: number; height: number };
      settings?: Record<string, unknown>;
    };
  };
}

/**
 * 타입 가드 함수들
 */
export const isApiSuccess = <T>(response: ApiResponse<T> | DashboardApiError): response is ApiResponse<T> => {
  return response.success === true;
};

export const isApiError = (response: ApiResponse<unknown> | DashboardApiError): response is DashboardApiError => {
  return response.success === false;
};

/**
 * 기본 설정값들
 */
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  autoRefresh: true,
  refreshInterval: 30000, // 30초
  enableRealtime: true,
  enableNotifications: true,
  widgets: {
    'stats-overview': {
      enabled: true,
      position: { x: 0, y: 0 },
      size: { width: 12, height: 4 }
    },
    'realtime-stats': {
      enabled: true,
      position: { x: 0, y: 4 },
      size: { width: 8, height: 6 }
    },
    'recent-activity': {
      enabled: true,
      position: { x: 8, y: 4 },
      size: { width: 4, height: 6 }
    },
    'system-status': {
      enabled: true,
      position: { x: 0, y: 10 },
      size: { width: 6, height: 4 }
    },
    'quick-actions': {
      enabled: true,
      position: { x: 6, y: 10 },
      size: { width: 6, height: 4 }
    },
    'analytics-chart': {
      enabled: false,
      position: { x: 0, y: 14 },
      size: { width: 12, height: 6 }
    }
  }
};

/**
 * 샘플 데이터 통합 객체
 */
export const SAMPLE_DASHBOARD_DATA = {
  ecommerce: SAMPLE_ECOMMERCE_STATS,
  forum: SAMPLE_FORUM_STATS,
  users: SAMPLE_USER_STATS,
  realtime: SAMPLE_REALTIME_OVERVIEW,
  activities: SAMPLE_RECENT_ACTIVITIES,
  systemHealth: SAMPLE_SYSTEM_HEALTH,
  socketEvents: SAMPLE_SOCKET_EVENTS,
} as const;

/**
 * 유틸리티 함수들
 */
export class DashboardApiUtils {
  /**
   * 상태에 따른 색상 반환
   */
  static getStatusColor(status: string): string {
    switch (status) {
      case 'healthy': return 'green';
      case 'warning': return 'yellow';
      case 'critical': 
      case 'error': return 'red';
      case 'maintenance': return 'blue';
      default: return 'gray';
    }
  }

  /**
   * 우선순위에 따른 순서 반환
   */
  static getPriorityOrder(priority: string): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  /**
   * 바이트를 사람이 읽기 쉬운 형태로 변환
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 시간을 상대적 형태로 변환 (예: "5분 전")
   */
  static getRelativeTime(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}초 전`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    return `${Math.floor(diffInSeconds / 86400)}일 전`;
  }

  /**
   * 숫자를 한국어 단위로 포맷 (예: 1000 -> "1천")
   */
  static formatNumber(num: number): string {
    if (num >= 100000000) return `${(num / 100000000).toFixed(1)}억`;
    if (num >= 10000) return `${(num / 10000).toFixed(1)}만`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}천`;
    return num.toString() as any;
  }

  /**
   * 통화 포맷 (예: 1000000 -> "1,000,000원")
   */
  static formatCurrency(amount: number, currency: string = 'KRW'): string {
    const formatted = new Intl.NumberFormat('ko-KR').format(amount);
    return currency === 'KRW' ? `${formatted}원` : `${formatted} ${currency}`;
  }
}
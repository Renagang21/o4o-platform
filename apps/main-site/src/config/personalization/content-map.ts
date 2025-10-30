/**
 * 개인화 콘텐츠 맵
 *
 * - 역할별 카드, 배너, 추천 아이템 정의
 * - 조건 및 가중치 설정
 */

import { ContentCard, Banner, Suggestion } from '../../types/personalization';

/**
 * 판매자 카드
 */
export const SELLER_CARDS: ContentCard[] = [
  {
    id: 'seller-pending-orders',
    type: 'warning',
    title: '출고 대기 주문',
    description: '확인이 필요한 주문이 있습니다',
    icon: 'AlertCircle',
    badge: { text: '긴급', variant: 'urgent' },
    action: { label: '주문 확인', url: '/seller/orders?status=pending', variant: 'primary' },
    conditions: { roles: ['seller'], requiresPendingTasks: true },
    baseWeight: 100 // 최우선
  },
  {
    id: 'seller-add-product',
    type: 'action',
    title: '상품 등록',
    description: '새로운 상품을 판매하세요',
    icon: 'Plus',
    action: { label: '상품 등록', url: '/seller/products/new', variant: 'primary' },
    conditions: { roles: ['seller'] },
    baseWeight: 50
  },
  {
    id: 'seller-sales-report',
    type: 'info',
    title: '이번 주 매출 리포트',
    description: '판매 성과를 확인하세요',
    icon: 'TrendingUp',
    action: { label: '리포트 보기', url: '/seller/sales', variant: 'secondary' },
    conditions: { roles: ['seller'] },
    baseWeight: 40
  },
  {
    id: 'seller-onboarding-guide',
    type: 'guide',
    title: '판매자 시작 가이드',
    description: '상품 등록부터 주문 처리까지',
    icon: 'BookOpen',
    badge: { text: '신규', variant: 'new' },
    action: { label: '가이드 보기', url: '/seller/guide', variant: 'secondary' },
    conditions: { roles: ['seller'], maxDaysSinceSignup: 7 },
    baseWeight: 80 // 신규 사용자에게 높은 우선순위
  },
  {
    id: 'seller-customer-reviews',
    type: 'info',
    title: '고객 리뷰 관리',
    description: '새로운 리뷰에 답변하세요',
    icon: 'MessageSquare',
    action: { label: '리뷰 보기', url: '/seller/reviews' },
    conditions: { roles: ['seller'] },
    baseWeight: 35
  },
  {
    id: 'seller-inventory-low',
    type: 'warning',
    title: '재고 부족 상품',
    description: '재고가 부족한 상품이 있습니다',
    icon: 'Package',
    badge: { text: '주의', variant: 'warning' },
    action: { label: '재고 관리', url: '/seller/inventory' },
    conditions: { roles: ['seller'] },
    baseWeight: 70
  }
];

/**
 * 공급자 카드
 */
export const SUPPLIER_CARDS: ContentCard[] = [
  {
    id: 'supplier-pending-orders',
    type: 'warning',
    title: '처리 대기 주문',
    description: '파트너사 주문을 확인하세요',
    icon: 'ClipboardList',
    badge: { text: '신규', variant: 'new' },
    action: { label: '주문 보기', url: '/supplier/orders?status=pending', variant: 'primary' },
    conditions: { roles: ['supplier'], requiresPendingTasks: true },
    baseWeight: 100
  },
  {
    id: 'supplier-inventory-alert',
    type: 'warning',
    title: '재고 경고',
    description: '발주가 필요한 품목이 있습니다',
    icon: 'AlertTriangle',
    badge: { text: '긴급', variant: 'urgent' },
    action: { label: '재고 확인', url: '/supplier/inventory?filter=low' },
    conditions: { roles: ['supplier'], requiresPendingTasks: true },
    baseWeight: 95
  },
  {
    id: 'supplier-add-product',
    type: 'action',
    title: '제품 추가',
    description: '새로운 제품을 등록하세요',
    icon: 'Plus',
    action: { label: '제품 등록', url: '/supplier/products/new', variant: 'primary' },
    conditions: { roles: ['supplier'] },
    baseWeight: 50
  },
  {
    id: 'supplier-partners',
    type: 'info',
    title: '파트너 관리',
    description: '파트너사와의 거래 내역',
    icon: 'Handshake',
    action: { label: '파트너 보기', url: '/supplier/partners' },
    conditions: { roles: ['supplier'] },
    baseWeight: 40
  },
  {
    id: 'supplier-api-integration',
    type: 'guide',
    title: 'API 통합 가이드',
    description: '자동화된 재고 관리 연결',
    icon: 'Code',
    badge: { text: '신규', variant: 'new' },
    action: { label: '문서 보기', url: '/supplier/api-docs' },
    conditions: { roles: ['supplier'], maxDaysSinceSignup: 14 },
    baseWeight: 75
  }
];

/**
 * 제휴자 카드
 */
export const AFFILIATE_CARDS: ContentCard[] = [
  {
    id: 'affiliate-earnings',
    type: 'info',
    title: '이번 달 수익',
    description: '현재까지의 누적 수익 확인',
    icon: 'DollarSign',
    action: { label: '수익 보기', url: '/affiliate/earnings', variant: 'primary' },
    conditions: { roles: ['affiliate'] },
    baseWeight: 90
  },
  {
    id: 'affiliate-create-campaign',
    type: 'action',
    title: '캠페인 생성',
    description: '새로운 마케팅 캠페인 시작',
    icon: 'Megaphone',
    action: { label: '캠페인 만들기', url: '/affiliate/campaigns/new', variant: 'primary' },
    conditions: { roles: ['affiliate'] },
    baseWeight: 60
  },
  {
    id: 'affiliate-tracking-guide',
    type: 'guide',
    title: '트래킹 가이드',
    description: 'UTM 파라미터 및 링크 생성 방법',
    icon: 'Link',
    badge: { text: '필독', variant: 'info' },
    action: { label: '가이드 보기', url: '/affiliate/guide/tracking' },
    conditions: { roles: ['affiliate'], maxDaysSinceSignup: 7, requiresFirstVisit: true },
    baseWeight: 85
  },
  {
    id: 'affiliate-top-products',
    type: 'info',
    title: '인기 추천 상품',
    description: '전환율이 높은 상품들',
    icon: 'TrendingUp',
    action: { label: '상품 보기', url: '/affiliate/products?sort=conversion' },
    conditions: { roles: ['affiliate'] },
    baseWeight: 55
  },
  {
    id: 'affiliate-analytics',
    type: 'info',
    title: '성과 분석',
    description: '클릭 및 전환 데이터',
    icon: 'PieChart',
    action: { label: '분석 보기', url: '/affiliate/analytics' },
    conditions: { roles: ['affiliate'] },
    baseWeight: 45
  }
];

/**
 * 고객 카드
 */
export const CUSTOMER_CARDS: ContentCard[] = [
  {
    id: 'customer-recent-orders',
    type: 'info',
    title: '최근 주문',
    description: '배송 현황을 확인하세요',
    icon: 'Package',
    action: { label: '주문 보기', url: '/orders', variant: 'primary' },
    conditions: { roles: ['customer'] },
    baseWeight: 80
  },
  {
    id: 'customer-wishlist',
    type: 'info',
    title: '위시리스트',
    description: '관심 상품을 확인하세요',
    icon: 'Heart',
    action: { label: '위시리스트', url: '/wishlist' },
    conditions: { roles: ['customer'] },
    baseWeight: 50
  },
  {
    id: 'customer-new-arrivals',
    type: 'promotion',
    title: '신상품 입고',
    description: '이번 주 새로 입고된 제품',
    icon: 'Sparkles',
    badge: { text: '신규', variant: 'new' },
    action: { label: '둘러보기', url: '/shop/new' },
    conditions: { roles: ['customer'] },
    baseWeight: 60
  },
  {
    id: 'customer-points',
    type: 'info',
    title: '적립금',
    description: '사용 가능한 적립금 확인',
    icon: 'Gift',
    action: { label: '적립금 보기', url: '/points' },
    conditions: { roles: ['customer'] },
    baseWeight: 40
  }
];

/**
 * 역할별 카드 맵
 */
export const ROLE_CONTENT_CARDS: Record<string, ContentCard[]> = {
  seller: SELLER_CARDS,
  supplier: SUPPLIER_CARDS,
  affiliate: AFFILIATE_CARDS,
  customer: CUSTOMER_CARDS
};

/**
 * 공통 배너
 */
export const COMMON_BANNERS: Banner[] = [
  {
    id: 'system-maintenance',
    type: 'system',
    title: '시스템 점검 안내',
    message: '2025년 11월 1일 02:00-04:00 정기 점검이 예정되어 있습니다.',
    variant: 'info',
    dismissible: true,
    conditions: { priority: 10, startDate: '2025-10-28', endDate: '2025-11-01' }
  },
  {
    id: 'new-feature-announcement',
    type: 'notice',
    title: '신기능 출시',
    message: '이제 모바일 앱에서도 주문 관리가 가능합니다!',
    variant: 'success',
    dismissible: true,
    action: { label: '자세히 보기', url: '/announcements/mobile-app' },
    conditions: { priority: 8, startDate: '2025-10-25', endDate: '2025-11-10' }
  }
];

/**
 * 역할별 배너
 */
export const ROLE_BANNERS: Record<string, Banner[]> = {
  seller: [
    {
      id: 'seller-tax-deadline',
      type: 'notice',
      title: '세금 신고 마감',
      message: '11월 10일까지 세금 신고를 완료해주세요.',
      variant: 'warning',
      dismissible: false,
      action: { label: '신고하기', url: '/seller/tax' },
      conditions: { roles: ['seller'], priority: 9, startDate: '2025-11-01', endDate: '2025-11-10' }
    }
  ],
  supplier: [
    {
      id: 'supplier-contract-renewal',
      type: 'notice',
      title: '계약 갱신 안내',
      message: '파트너 계약 갱신 기간입니다.',
      variant: 'info',
      dismissible: true,
      action: { label: '계약 보기', url: '/supplier/contracts' },
      conditions: { roles: ['supplier'], priority: 7 }
    }
  ],
  affiliate: [
    {
      id: 'affiliate-bonus-campaign',
      type: 'promotion',
      title: '특별 보너스 캠페인',
      message: '이번 달 전환 5건 달성 시 추가 보너스 지급!',
      variant: 'success',
      dismissible: true,
      action: { label: '참여하기', url: '/affiliate/campaigns/bonus' },
      conditions: { roles: ['affiliate'], priority: 8, startDate: '2025-10-20', endDate: '2025-10-31' }
    }
  ],
  customer: []
};

/**
 * 공통 추천 (shortcuts/tools)
 */
export const COMMON_SUGGESTIONS: Suggestion[] = [
  {
    id: 'help-center',
    title: '도움말 센터',
    description: '자주 묻는 질문',
    icon: 'HelpCircle',
    url: '/help',
    category: 'doc',
    weight: 30
  },
  {
    id: 'contact-support',
    title: '고객 지원',
    description: '1:1 문의하기',
    icon: 'MessageCircle',
    url: '/support',
    category: 'tool',
    weight: 25
  }
];

/**
 * 역할별 추천
 */
export const ROLE_SUGGESTIONS: Record<string, Suggestion[]> = {
  seller: [
    {
      id: 'seller-bulk-upload',
      title: '대량 업로드',
      description: 'CSV로 상품 일괄 등록',
      icon: 'Upload',
      url: '/seller/products/bulk-upload',
      category: 'tool',
      weight: 50
    },
    {
      id: 'seller-sales-guide',
      title: '판매 가이드',
      description: '매출 향상 팁',
      icon: 'BookOpen',
      url: '/seller/guide',
      category: 'doc',
      weight: 40
    }
  ],
  supplier: [
    {
      id: 'supplier-api-docs',
      title: 'API 문서',
      description: '재고 연동 API',
      icon: 'Code',
      url: '/supplier/api-docs',
      category: 'doc',
      weight: 50
    },
    {
      id: 'supplier-reports',
      title: '리포트 생성',
      description: '거래 내역 다운로드',
      icon: 'Download',
      url: '/supplier/reports',
      category: 'tool',
      weight: 45
    }
  ],
  affiliate: [
    {
      id: 'affiliate-link-generator',
      title: '링크 생성기',
      description: 'UTM 링크 자동 생성',
      icon: 'Link',
      url: '/affiliate/tools/link-generator',
      category: 'tool',
      weight: 55
    },
    {
      id: 'affiliate-marketing-guide',
      title: '마케팅 가이드',
      description: '전환율 높이는 방법',
      icon: 'BookOpen',
      url: '/affiliate/guide',
      category: 'doc',
      weight: 45
    }
  ],
  customer: [
    {
      id: 'customer-order-tracking',
      title: '배송 조회',
      description: '주문 배송 현황',
      icon: 'Truck',
      url: '/orders/track',
      category: 'shortcut',
      weight: 50
    }
  ]
};

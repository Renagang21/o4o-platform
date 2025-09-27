// Seller Components Export
export { default as SellerDashboard } from './SellerDashboard';
export { default as SellerProducts } from './SellerProducts';
export { default as SellerSettlement } from './SellerSettlement';

// Seller Shortcodes Registration
export const sellerShortcodes = {
  'seller_dashboard': {
    component: 'SellerDashboard',
    description: '판매자 대시보드 - 총 마진, 전환율, 핵심 성과 지표',
    attributes: {
      period: {
        type: 'string',
        required: false,
        default: '30d',
        options: ['7d', '30d', '90d', '1y'],
        description: '데이터 조회 기간'
      }
    }
  },
  'seller_products': {
    component: 'SellerProducts',
    description: '판매자 상품 목록 - 자율 가격 설정 및 마진 관리',
    attributes: {
      limit: {
        type: 'number',
        required: false,
        default: 12,
        description: '표시할 상품 수'
      },
      category: {
        type: 'string',
        required: false,
        description: '카테고리별 필터링'
      },
      featured: {
        type: 'boolean',
        required: false,
        default: false,
        description: '추천 상품만 표시'
      }
    }
  },
  'seller_settlement': {
    component: 'SellerSettlement',
    description: '판매자 정산 내역 - 마진 정산 내역과 지급 상태',
    attributes: {
      period: {
        type: 'string',
        required: false,
        default: '30d',
        options: ['7d', '30d', '90d', '1y'],
        description: '조회 기간'
      },
      status: {
        type: 'string',
        required: false,
        default: 'all',
        options: ['all', 'pending', 'scheduled', 'paid'],
        description: '정산 상태 필터'
      }
    }
  },
  'seller_analytics': {
    component: 'SellerAnalytics',
    description: '판매자 분석 대시보드',
    attributes: {
      type: {
        type: 'string',
        required: false,
        default: 'overview',
        options: ['overview', 'margin', 'conversion', 'products'],
        description: '분석 유형'
      }
    }
  },
  'seller_pricing_manager': {
    component: 'SellerPricingManager',
    description: '판매자 가격 일괄 관리',
    attributes: {
      category: {
        type: 'string',
        required: false,
        description: '카테고리별 필터'
      }
    }
  }
};
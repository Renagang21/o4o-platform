/**
 * Dropshipping Shortcode Registration
 * Register all dropshipping-related shortcodes
 *
 * Phase SC-3: Enhanced with UI metadata for editor
 */

import { registerShortcode } from '../registry.js';
import { SellerDashboard } from './SellerDashboard.js';
import { SupplierDashboard } from './SupplierDashboard.js';
import { AffiliateDashboard } from './AffiliateDashboard.js';

// Import additional components (to be created)
// import { SellerOrders } from './SellerOrders.js';
// import { SellerInventory } from './SellerInventory.js';
// import { SellerAnalytics } from './SellerAnalytics.js';
// import { SupplierOrders } from './SupplierOrders.js';
// import { SupplierCatalog } from './SupplierCatalog.js';
// import { AffiliateLinks } from './AffiliateLinks.js';
// import { AffiliateCommissions } from './AffiliateCommissions.js';

/**
 * Register all dropshipping shortcodes
 */
export function registerDropshippingShortcodes() {
  // Seller shortcodes - Phase SC-3: Added UI metadata
  registerShortcode({
    name: 'seller_dashboard',
    component: SellerDashboard as any,
    label: '판매자 대시보드',
    category: 'Dropshipping',
    description: '판매자의 매출, 주문, 재고 현황을 보여주는 대시보드',
    fields: [
      {
        name: 'view',
        label: '기본 뷰',
        type: 'select',
        required: false,
        options: [
          { label: '전체 개요', value: 'overview' },
          { label: '주문 관리', value: 'orders' },
          { label: '상품 관리', value: 'products' },
          { label: '매출 분석', value: 'analytics' }
        ],
        defaultValue: 'overview',
        helpText: '대시보드 로드 시 표시할 기본 뷰를 선택합니다.'
      }
    ]
  });

  // Supplier shortcodes - Phase SC-3: Added UI metadata
  registerShortcode({
    name: 'supplier_dashboard',
    component: SupplierDashboard as any,
    label: '공급자 대시보드',
    category: 'Dropshipping',
    description: '공급자의 상품, 주문, 정산 현황을 보여주는 대시보드',
    fields: [
      {
        name: 'view',
        label: '기본 뷰',
        type: 'select',
        required: false,
        options: [
          { label: '전체 개요', value: 'overview' },
          { label: '주문 처리', value: 'orders' },
          { label: '상품 카탈로그', value: 'catalog' },
          { label: '정산 내역', value: 'settlements' }
        ],
        defaultValue: 'overview',
        helpText: '대시보드 로드 시 표시할 기본 뷰를 선택합니다.'
      }
    ]
  });

  // Affiliate/Partner shortcodes - Phase SC-3: Added UI metadata
  registerShortcode({
    name: 'affiliate_dashboard',
    component: AffiliateDashboard as any,
    label: '제휴 파트너 대시보드',
    category: 'Dropshipping',
    description: '제휴 파트너의 커미션, 링크, 정산 현황을 보여주는 대시보드',
    fields: [
      {
        name: 'tab',
        label: '기본 탭',
        type: 'select',
        required: false,
        options: [
          { label: '대시보드', value: 'dashboard' },
          { label: '커미션', value: 'commissions' },
          { label: '정산 요청', value: 'payouts' },
          { label: '링크 관리', value: 'links' }
        ],
        defaultValue: 'dashboard',
        helpText: '처음 로드 시 보여줄 탭을 선택합니다.'
      },
      {
        name: 'showStats',
        label: '통계 표시',
        type: 'boolean',
        required: false,
        defaultValue: true,
        helpText: '상단 통계 카드를 표시할지 선택합니다.'
      }
    ]
  });

  // Dropshipping shortcodes registered successfully
}

// Export components for direct use
export { SellerDashboard } from './SellerDashboard.js';
export { SupplierDashboard } from './SupplierDashboard.js';
export { AffiliateDashboard } from './AffiliateDashboard.js';
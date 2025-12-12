/**
 * PharmacyOps Pages
 *
 * @package @o4o/pharmacyops
 */

// Dashboard
export { PharmacyDashboardPage } from './PharmacyDashboardPage.js';

// Products
export { PharmacyProductListPage } from './PharmacyProductListPage.js';
export { PharmacyProductDetailPage } from './PharmacyProductDetailPage.js';

// Offers
export { PharmacyOfferListPage } from './PharmacyOfferListPage.js';

// Orders
export { PharmacyOrderListPage } from './PharmacyOrderListPage.js';
export { PharmacyOrderCreatePage } from './PharmacyOrderCreatePage.js';
export { PharmacyOrderDetailPage } from './PharmacyOrderDetailPage.js';

// Dispatch
export { PharmacyDispatchListPage } from './PharmacyDispatchListPage.js';
export { PharmacyDispatchDetailPage } from './PharmacyDispatchDetailPage.js';

// Settlement
export { PharmacySettlementListPage } from './PharmacySettlementListPage.js';
export { PharmacySettlementDetailPage } from './PharmacySettlementDetailPage.js';

// Page registry for navigation
export const pharmacyOpsPages = {
  dashboard: {
    component: 'PharmacyDashboardPage',
    path: '/pharmacyops/dashboard',
    title: '대시보드',
  },
  products: {
    list: {
      component: 'PharmacyProductListPage',
      path: '/pharmacyops/products',
      title: '의약품 목록',
    },
    detail: {
      component: 'PharmacyProductDetailPage',
      path: '/pharmacyops/products/:id',
      title: '의약품 상세',
    },
  },
  offers: {
    list: {
      component: 'PharmacyOfferListPage',
      path: '/pharmacyops/offers',
      title: '도매 Offer',
    },
  },
  orders: {
    list: {
      component: 'PharmacyOrderListPage',
      path: '/pharmacyops/orders',
      title: '주문 관리',
    },
    create: {
      component: 'PharmacyOrderCreatePage',
      path: '/pharmacyops/orders/create',
      title: '주문 생성',
    },
    detail: {
      component: 'PharmacyOrderDetailPage',
      path: '/pharmacyops/orders/:id',
      title: '주문 상세',
    },
  },
  dispatch: {
    list: {
      component: 'PharmacyDispatchListPage',
      path: '/pharmacyops/dispatch',
      title: '배송 조회',
    },
    detail: {
      component: 'PharmacyDispatchDetailPage',
      path: '/pharmacyops/dispatch/:id',
      title: '배송 상세',
    },
  },
  settlement: {
    list: {
      component: 'PharmacySettlementListPage',
      path: '/pharmacyops/settlement',
      title: '구매 내역',
    },
    detail: {
      component: 'PharmacySettlementDetailPage',
      path: '/pharmacyops/settlement/:id',
      title: '정산 상세',
    },
  },
};

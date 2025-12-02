/**
 * Seller Shortcodes - Admin Dashboard
 * Standard ShortcodeDefinition[] format for auto-discovery
 */

import React from 'react';
import { ShortcodeDefinition } from '@o4o/shortcodes';

// Seller Components Export
export { default as SellerDashboard } from './SellerDashboard';
export { default as SellerProducts } from './SellerProducts';
export { default as SellerSettlement } from './SellerSettlement';

// Lazy imports
const SellerDashboardLazy = React.lazy(() => import('./SellerDashboard'));
const SellerProductsLazy = React.lazy(() => import('./SellerProducts'));
const SellerSettlementLazy = React.lazy(() => import('./SellerSettlement'));

// Loading component
const Loading = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

/**
 * Seller Shortcodes Array - Auto-discoverable format
 */
export const sellerShortcodes: ShortcodeDefinition[] = [
  {
    name: 'seller_dashboard',
    component: ({ attributes }) => (
      <React.Suspense fallback={<Loading />}>
        <SellerDashboardLazy {...attributes} />
      </React.Suspense>
    ),
    description: '판매자 대시보드 - 총 마진, 전환율, 핵심 성과 지표'
  },
  {
    name: 'seller_products',
    component: ({ attributes }) => (
      <React.Suspense fallback={<Loading />}>
        <SellerProductsLazy {...attributes} />
      </React.Suspense>
    ),
    description: '판매자 상품 목록 - 자율 가격 설정 및 마진 관리'
  },
  {
    name: 'seller_settlement',
    component: ({ attributes }) => (
      <React.Suspense fallback={<Loading />}>
        <SellerSettlementLazy {...attributes} />
      </React.Suspense>
    ),
    description: '판매자 정산 내역 - 마진 정산 내역과 지급 상태'
  },
  {
    name: 'seller_analytics',
    component: () => (
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
        <p className="text-yellow-800">Seller Analytics - Coming Soon</p>
      </div>
    ),
    description: '판매자 분석 대시보드'
  },
  {
    name: 'seller_pricing_manager',
    component: () => (
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
        <p className="text-yellow-800">Seller Pricing Manager - Coming Soon</p>
      </div>
    ),
    description: '판매자 가격 일괄 관리'
  }
];

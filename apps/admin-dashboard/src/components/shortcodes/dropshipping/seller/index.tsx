/**
 * Seller Shortcodes - Admin Dashboard
 *
 * H4-0: Seller components removed (stub backend deleted)
 * Placeholder stubs retained for graceful degradation
 */

import React from 'react';
import { ShortcodeDefinition } from '@o4o/shortcodes';

// H4-0: Components removed - stub placeholders only
const RemovedPlaceholder = ({ name }: { name: string }) => (
  <div className="bg-gray-50 border border-gray-200 rounded p-4">
    <p className="text-gray-600">{name} - Removed in H4-0 cleanup</p>
  </div>
);

/**
 * Seller Shortcodes Array - Stub placeholders
 * H4-0: Original components removed due to backend stub deletion
 */
export const sellerShortcodes: ShortcodeDefinition[] = [
  {
    name: 'seller_dashboard',
    component: () => <RemovedPlaceholder name="Seller Dashboard" />,
    description: '판매자 대시보드 - H4-0 제거됨'
  },
  {
    name: 'seller_products',
    component: () => <RemovedPlaceholder name="Seller Products" />,
    description: '판매자 상품 목록 - H4-0 제거됨'
  },
  {
    name: 'seller_settlement',
    component: () => <RemovedPlaceholder name="Seller Settlement" />,
    description: '판매자 정산 내역 - H4-0 제거됨'
  },
  {
    name: 'seller_analytics',
    component: () => <RemovedPlaceholder name="Seller Analytics" />,
    description: '판매자 분석 대시보드 - H4-0 제거됨'
  },
  {
    name: 'seller_pricing_manager',
    component: () => <RemovedPlaceholder name="Seller Pricing Manager" />,
    description: '판매자 가격 일괄 관리 - H4-0 제거됨'
  }
];

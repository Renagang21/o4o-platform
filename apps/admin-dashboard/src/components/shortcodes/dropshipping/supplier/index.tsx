/**
 * Supplier Shortcodes - Admin Dashboard
 * Standard ShortcodeDefinition[] format for auto-discovery
 */

import React from 'react';
import { ShortcodeDefinition } from '@o4o/shortcodes';

// Supplier Components Export
export { default as SupplierProducts } from './SupplierProducts';
export { default as SupplierProductEditor } from './SupplierProductEditor';

// Lazy imports
const SupplierProductsLazy = React.lazy(() => import('./SupplierProducts'));
const SupplierProductEditorLazy = React.lazy(() => import('./SupplierProductEditor'));

// Loading component
const Loading = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

/**
 * Supplier Shortcodes Array - Auto-discoverable format
 */
export const supplierShortcodes: ShortcodeDefinition[] = [
  {
    name: 'supplier_products',
    component: ({ attributes }) => (
      <React.Suspense fallback={<Loading />}>
        <SupplierProductsLazy {...attributes} />
      </React.Suspense>
    ),
    description: '공급자가 자신이 등록/관리하는 ds_product 목록을 출력합니다'
  },
  {
    name: 'supplier_product_editor',
    component: ({ attributes }) => (
      <React.Suspense fallback={<Loading />}>
        <SupplierProductEditorLazy {...attributes} />
      </React.Suspense>
    ),
    description: '상품의 공급가, MSRP, 수수료율을 편집하고 승인 요청하는 UI'
  },
  {
    name: 'supplier_dashboard',
    component: () => (
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
        <p className="text-yellow-800">Supplier Dashboard - Coming Soon</p>
      </div>
    ),
    description: '공급자 메인 대시보드 - 상품 현황, 정산, 승인 대기 등'
  },
  {
    name: 'supplier_analytics',
    component: () => (
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
        <p className="text-yellow-800">Supplier Analytics - Coming Soon</p>
      </div>
    ),
    description: '공급자 판매 분석 및 통계'
  },
  {
    name: 'supplier_approval_queue',
    component: () => (
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
        <p className="text-yellow-800">Supplier Approval Queue - Coming Soon</p>
      </div>
    ),
    description: '공급자 승인 대기 목록 관리'
  }
];

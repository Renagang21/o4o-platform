/**
 * Dropshipping Shortcodes Index - Admin Dashboard
 * Unified array format for auto-discovery
 *
 * All shortcodes are defined here to avoid Vite's dynamic/static import mixing warning.
 * Sub-modules (partner, supplier, seller) no longer export shortcode arrays.
 */

import React from 'react';
import { ShortcodeDefinition } from '@o4o/shortcodes';

// Loading component
const Loading = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// ===== Core Components (Lazy) =====
const UserDashboardLazy = React.lazy(() => import('./UserDashboard'));
const RoleVerificationLazy = React.lazy(() => import('./RoleVerification'));

// ===== Partner Components (Lazy) =====
const PartnerDashboardLazy = React.lazy(() => import('./partner/PartnerDashboard'));
const PartnerProductsLazy = React.lazy(() => import('./partner/PartnerProducts'));
const PartnerCommissionsLazy = React.lazy(() => import('./partner/PartnerCommissions'));
const PartnerLinkGeneratorLazy = React.lazy(() => import('./partner/PartnerLinkGenerator'));
const PartnerCommissionDashboardLazy = React.lazy(() => import('./partner/PartnerCommissionDashboard'));
const PayoutRequestsLazy = React.lazy(() => import('./partner/PayoutRequests'));

// ===== Supplier Components (Lazy) =====
const SupplierProductsLazy = React.lazy(() => import('./supplier/SupplierProducts'));
const SupplierProductEditorLazy = React.lazy(() => import('./supplier/SupplierProductEditor'));

// ===== Placeholder Components =====
const ComingSoon = ({ name }: { name: string }) => (
  <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
    <p className="text-yellow-800">{name} - Coming Soon</p>
  </div>
);

const RemovedPlaceholder = ({ name }: { name: string }) => (
  <div className="bg-gray-50 border border-gray-200 rounded p-4">
    <p className="text-gray-600">{name} - Removed in H4-0 cleanup</p>
  </div>
);

/**
 * All dropshipping shortcodes - Combined array
 * This format is compatible with the auto-registration system
 */
export const dropshippingShortcodes: ShortcodeDefinition[] = [
  // ===== Core Shortcodes =====
  {
    name: 'user_dashboard',
    component: ({ attributes }) => (
      <React.Suspense fallback={<Loading />}>
        <UserDashboardLazy {...attributes} />
      </React.Suspense>
    ),
    description: 'User role-based dashboard for dropshipping platform'
  },
  {
    name: 'role_verification',
    component: ({ attributes }) => (
      <React.Suspense fallback={<Loading />}>
        <RoleVerificationLazy {...attributes} />
      </React.Suspense>
    ),
    description: 'Role verification form for dropshipping users'
  },
  {
    name: 'profile_manager',
    component: () => <ComingSoon name="Profile Manager" />,
    description: 'Profile management for dropshipping users'
  },
  {
    name: 'role_switcher',
    component: () => <ComingSoon name="Role Switcher" />,
    description: 'Switch between multiple user roles'
  },

  // ===== Partner Shortcodes =====
  {
    name: 'partner_dashboard',
    component: ({ attributes }) => (
      <React.Suspense fallback={<Loading />}>
        <PartnerDashboardLazy {...attributes} />
      </React.Suspense>
    ),
    description: '파트너 메인 대시보드 - 총 수익, 전환율, 개인 추천 링크를 보여주는 통합 UI'
  },
  {
    name: 'partner_products',
    component: ({ attributes }) => (
      <React.Suspense fallback={<Loading />}>
        <PartnerProductsLazy {...attributes} />
      </React.Suspense>
    ),
    description: '홍보 상품 목록 - 파트너 개인의 추천 코드가 적용된 링크 생성 기능'
  },
  {
    name: 'partner_commissions',
    component: ({ attributes }) => (
      <React.Suspense fallback={<Loading />}>
        <PartnerCommissionsLazy {...attributes} />
      </React.Suspense>
    ),
    description: '정산 내역 확인 - 수수료 정산 내역과 지급 상태를 보여주는 투명한 UI'
  },
  {
    name: 'partner_link_generator',
    component: ({ attributes }) => (
      <React.Suspense fallback={<Loading />}>
        <PartnerLinkGeneratorLazy {...attributes} />
      </React.Suspense>
    ),
    description: 'Generate and manage partner links with PARTNER app integration'
  },
  {
    name: 'partner_commission_dashboard',
    component: ({ attributes }) => (
      <React.Suspense fallback={<Loading />}>
        <PartnerCommissionDashboardLazy {...attributes} />
      </React.Suspense>
    ),
    description: 'Track commissions, earnings, and performance metrics'
  },
  {
    name: 'partner_payout_requests',
    component: ({ attributes }) => (
      <React.Suspense fallback={<Loading />}>
        <PayoutRequestsLazy {...attributes} />
      </React.Suspense>
    ),
    description: 'Manage payout requests and payment methods'
  },

  // ===== Supplier Shortcodes =====
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
    component: () => <ComingSoon name="Supplier Dashboard" />,
    description: '공급자 메인 대시보드 - 상품 현황, 정산, 승인 대기 등'
  },
  {
    name: 'supplier_analytics',
    component: () => <ComingSoon name="Supplier Analytics" />,
    description: '공급자 판매 분석 및 통계'
  },
  {
    name: 'supplier_approval_queue',
    component: () => <ComingSoon name="Supplier Approval Queue" />,
    description: '공급자 승인 대기 목록 관리'
  },

  // ===== Seller Shortcodes (H4-0: Removed) =====
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

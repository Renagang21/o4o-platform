/**
 * Partner Shortcodes - Admin Dashboard
 * Standard ShortcodeDefinition[] format for auto-discovery
 */

import React from 'react';
import { ShortcodeDefinition } from '@o4o/shortcodes';

// Partner Shortcodes Export
export { default as PartnerLinkGenerator } from './PartnerLinkGenerator';
export { default as PartnerCommissionDashboard } from './PartnerCommissionDashboard';
export { default as PayoutRequests } from './PayoutRequests';
export { default as PartnerMainDashboard } from './PartnerMainDashboard';
export { default as PartnerProducts } from './PartnerProducts';
export { default as PartnerCommissions } from './PartnerCommissions';

// Lazy imports for shortcode components
const PartnerMainDashboardLazy = React.lazy(() => import('./PartnerMainDashboard'));
const PartnerProductsLazy = React.lazy(() => import('./PartnerProducts'));
const PartnerCommissionsLazy = React.lazy(() => import('./PartnerCommissions'));
const PartnerLinkGeneratorLazy = React.lazy(() => import('./PartnerLinkGenerator'));
const PartnerCommissionDashboardLazy = React.lazy(() => import('./PartnerCommissionDashboard'));
const PayoutRequestsLazy = React.lazy(() => import('./PayoutRequests'));

// Loading component
const Loading = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

/**
 * Partner Shortcodes Array - Auto-discoverable format
 * This format is compatible with the auto-registration system in main.tsx
 */
export const partnerShortcodes: ShortcodeDefinition[] = [
  {
    name: 'partner_dashboard',
    component: ({ attributes }) => (
      <React.Suspense fallback={<Loading />}>
        <PartnerMainDashboardLazy {...attributes} />
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
  }
];

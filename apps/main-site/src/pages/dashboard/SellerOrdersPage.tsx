/**
 * Seller Orders Page
 * Phase 3-7: 판매자 주문 관리 전체 페이지
 */

import React from 'react';
import Breadcrumb from '../../components/common/Breadcrumb';
import { PageHeader } from '../../components/common/PageHeader';
import { SellerOrdersSection } from '../../components/dashboard/seller/SellerOrdersSection';

export const SellerOrdersPage: React.FC = () => {
  return (
    <>
      <Breadcrumb
        items={[
          { label: '판매자 대시보드', href: '/dashboard/seller' },
          { label: '주문 관리', isCurrent: true },
        ]}
      />

      <PageHeader
        title="주문 관리"
        subtitle="판매자의 주문을 확인하고 처리합니다."
      />

      <SellerOrdersSection mode="full-page" />
    </>
  );
};

export default SellerOrdersPage;

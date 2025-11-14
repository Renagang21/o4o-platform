/**
 * Seller Products Page
 * Full-page view for product management
 */

import React from 'react';
import Breadcrumb from '../../components/common/Breadcrumb';
import { SellerProductsSection } from '../../components/dashboard/seller/SellerProductsSection';

export const SellerProductsPage: React.FC = () => {
  return (
    <>
      <Breadcrumb
        items={[
          { label: '판매자 대시보드', href: '/dashboard/seller' },
          { label: '상품 관리', isCurrent: true },
        ]}
      />

      <SellerProductsSection mode="full-page" />
    </>
  );
};

export default SellerProductsPage;

/**
 * Supplier Products Page
 * Full-page view for product management
 */

import React from 'react';
import Breadcrumb from '../../components/common/Breadcrumb';
import { SupplierProductsSection } from '../../components/dashboard/supplier/SupplierProductsSection';

export const SupplierProductsPage: React.FC = () => {
  return (
    <>
      <Breadcrumb
        items={[
          { label: '공급자 대시보드', href: '/dashboard/supplier' },
          { label: '제품 관리', isCurrent: true },
        ]}
      />

      <SupplierProductsSection mode="full-page" />
    </>
  );
};

export default SupplierProductsPage;

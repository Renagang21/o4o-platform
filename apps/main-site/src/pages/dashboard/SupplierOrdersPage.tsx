/**
 * Supplier Orders Page
 * Full-page view for order management
 */

import React from 'react';
import Breadcrumb from '../../components/common/Breadcrumb';
import { SupplierOrdersSection } from '../../components/dashboard/supplier/SupplierOrdersSection';

export const SupplierOrdersPage: React.FC = () => {
  return (
    <>
      <Breadcrumb
        items={[
          { label: '공급자 대시보드', href: '/dashboard/supplier' },
          { label: '주문 관리', isCurrent: true },
        ]}
      />
      <SupplierOrdersSection mode="full-page" />
    </>
  );
};

export default SupplierOrdersPage;

/**
 * Supplier Product Create Page
 * Page for creating a new product
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '@/components/common/Breadcrumb';
import { PageHeader } from '@/components/common/PageHeader';
import { SupplierProductForm } from '@/components/dashboard/supplier/SupplierProductForm';
import { SupplierProductFormValues } from '@/types/supplier-product';
import { supplierProductAPI } from '@/services/supplierProductApi';

export const SupplierProductCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const handleSubmit = async (values: SupplierProductFormValues) => {
    try {
      await supplierProductAPI.createProduct(values);
      // Navigate back to product list
      navigate('/dashboard/supplier/products');
    } catch (error) {
      console.error('Failed to create product:', error);
      throw error;
    }
  };

  const handleCancel = () => {
    navigate('/dashboard/supplier/products');
  };

  return (
    <>
      <Breadcrumb
        items={[
          { label: '공급자 대시보드', href: '/dashboard/supplier' },
          { label: '제품 관리', href: '/dashboard/supplier/products' },
          { label: '새 제품 등록', isCurrent: true },
        ]}
      />

      <PageHeader
        title="새 제품 등록"
        subtitle="공급할 제품의 정보를 입력해주세요."
      />

      <SupplierProductForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isEdit={false}
      />
    </>
  );
};

export default SupplierProductCreatePage;

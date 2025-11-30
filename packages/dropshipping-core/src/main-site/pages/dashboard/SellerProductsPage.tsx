/**
 * Seller Products Page
 * Full-page view for product management
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { PageHeader } from '@/components/common/PageHeader';
import { SellerProductsSection } from '@/components/dashboard/seller/SellerProductsSection';

export const SellerProductsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <Breadcrumb
        items={[
          { label: '판매자 대시보드', href: '/dashboard/seller' },
          { label: '상품 관리', isCurrent: true },
        ]}
      />

      <PageHeader
        title="상품 관리"
        subtitle="공급자의 상품을 가져와 판매하세요."
        actions={
          <button
            onClick={() => navigate('/dashboard/seller/products/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            상품 가져오기
          </button>
        }
      />

      <SellerProductsSection mode="full-page" />
    </>
  );
};

export default SellerProductsPage;

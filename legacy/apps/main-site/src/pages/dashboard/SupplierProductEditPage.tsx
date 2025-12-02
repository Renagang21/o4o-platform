/**
 * Supplier Product Edit Page
 * Page for editing an existing product
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';
import { PageHeader } from '../../components/common/PageHeader';
import { SupplierProductForm } from '../../components/dashboard/supplier/SupplierProductForm';
import {
  SupplierProductFormValues,
  SupplierProductDetail,
} from '../../types/supplier-product';
import { supplierProductAPI } from '../../services/supplierProductApi';

export const SupplierProductEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [product, setProduct] = useState<SupplierProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch product data on mount
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setError('제품 ID가 없습니다.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await supplierProductAPI.getProduct(id);
        setProduct(response.data);
      } catch (err) {
        console.error('Failed to fetch product:', err);
        setError('제품 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleSubmit = async (values: SupplierProductFormValues) => {
    if (!id) {
      throw new Error('제품 ID가 없습니다.');
    }

    try {
      await supplierProductAPI.updateProduct(id, values);
      // Navigate back to product list
      navigate('/dashboard/supplier/products');
    } catch (error) {
      console.error('Failed to update product:', error);
      throw error;
    }
  };

  const handleCancel = () => {
    navigate('/dashboard/supplier/products');
  };

  if (loading) {
    return (
      <>
        <Breadcrumb
          items={[
            { label: '공급자 대시보드', href: '/dashboard/supplier' },
            { label: '제품 관리', href: '/dashboard/supplier/products' },
            { label: '제품 수정', isCurrent: true },
          ]}
        />
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <Breadcrumb
          items={[
            { label: '공급자 대시보드', href: '/dashboard/supplier' },
            { label: '제품 관리', href: '/dashboard/supplier/products' },
            { label: '제품 수정', isCurrent: true },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error || '제품을 찾을 수 없습니다.'}</p>
          <button
            onClick={() => navigate('/dashboard/supplier/products')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            제품 목록으로 돌아가기
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: '공급자 대시보드', href: '/dashboard/supplier' },
          { label: '제품 관리', href: '/dashboard/supplier/products' },
          { label: product.name, isCurrent: true },
        ]}
      />

      <PageHeader
        title={`제품 수정: ${product.name}`}
        subtitle="제품 정보를 수정합니다."
      />

      <SupplierProductForm
        initialValues={product}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isEdit={true}
      />
    </>
  );
};

export default SupplierProductEditPage;

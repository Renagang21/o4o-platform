/**
 * Glycopharm Product Detail Page
 *
 * 상품 상세 페이지 (Admin)
 * - 상품 정보
 * - 가격 정보
 * - 상태 관리
 *
 * Phase B-3: Glycopharm Admin Integration
 * API Endpoint: /api/v1/glycopharm/admin/products/:id
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGTag,
  AGSelect,
} from '@o4o/ui';
import {
  Package,
  ArrowLeft,
  AlertCircle,
  Star,
  Building2,
  Tag,
  Boxes,
  Factory,
} from 'lucide-react';

/**
 * API Response Types (Phase B-1 Glycopharm API)
 */
type ProductStatus = 'draft' | 'active' | 'inactive' | 'discontinued';
type ProductCategory = 'cgm_device' | 'test_strip' | 'lancet' | 'meter' | 'accessory' | 'other';

interface Pharmacy {
  id: string;
  name: string;
  code: string;
  status: string;
}

interface Product {
  id: string;
  pharmacy_id?: string;
  pharmacy?: Pharmacy;
  name: string;
  sku: string;
  category: ProductCategory;
  description?: string;
  price: number;
  sale_price?: number;
  stock_quantity: number;
  manufacturer?: string;
  status: ProductStatus;
  is_featured: boolean;
  sort_order: number;
  created_by_user_id?: string;
  created_by_user_name?: string;
  created_at: string;
  updated_at: string;
}

interface ProductDetailResponse {
  data: Product;
}

const statusLabels: Record<ProductStatus, string> = {
  draft: '초안',
  active: '판매중',
  inactive: '비활성',
  discontinued: '단종',
};

const statusColors: Record<ProductStatus, 'gray' | 'green' | 'yellow' | 'red'> = {
  draft: 'gray',
  active: 'green',
  inactive: 'yellow',
  discontinued: 'red',
};

const categoryLabels: Record<ProductCategory, string> = {
  cgm_device: 'CGM 기기',
  test_strip: '시험지',
  lancet: '란셋',
  meter: '측정기',
  accessory: '액세서리',
  other: '기타',
};

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const api = authClient.api;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchProduct = useCallback(async () => {
    if (!productId) {
      setError('상품 ID가 없습니다.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ProductDetailResponse>(
        `/api/v1/glycopharm/admin/products/${productId}`
      );
      if (response.data) {
        setProduct(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch product:', err);
      if (err.response?.status === 404) {
        setError('상품을 찾을 수 없습니다.');
      } else {
        setError(err.message || '상품 정보를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [api, productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleStatusChange = async (newStatus: ProductStatus) => {
    if (!productId || !product) return;

    setUpdating(true);
    try {
      const response = await api.patch<ProductDetailResponse>(
        `/api/v1/glycopharm/admin/products/${productId}/status`,
        { status: newStatus }
      );
      if (response.data) {
        setProduct(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to update product status:', err);
      alert('상태 변경에 실패했습니다: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setUpdating(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="bg-white rounded-lg p-6">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error || '상품을 찾을 수 없습니다'}</p>
          <AGButton variant="outline" onClick={() => navigate('/glycopharm/products')}>
            목록으로 돌아가기
          </AGButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <AGPageHeader
        title={product.name}
        description={`SKU: ${product.sku}`}
        icon={<Package className="w-5 h-5" />}
        breadcrumb={
          <Link
            to="/glycopharm/products"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            상품 목록
          </Link>
        }
        actions={
          <div className="flex items-center gap-2">
            {product.is_featured && (
              <AGTag color="yellow" size="md">
                <Star className="w-3 h-3 inline mr-1" />추천
              </AGTag>
            )}
            <AGTag color={statusColors[product.status]} size="md">
              {statusLabels[product.status]}
            </AGTag>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Product Info */}
        <AGSection>
          <AGCard>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">상품명</label>
                  <p className="text-lg font-semibold text-gray-900">{product.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">SKU</label>
                  <p className="text-gray-900 font-mono">{product.sku}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">카테고리</label>
                    <p className="text-gray-900">{categoryLabels[product.category]}</p>
                  </div>
                </div>
                {product.manufacturer && (
                  <div className="flex items-center gap-2">
                    <Factory className="w-4 h-4 text-gray-400" />
                    <div>
                      <label className="text-sm font-medium text-gray-500">제조사</label>
                      <p className="text-gray-900">{product.manufacturer}</p>
                    </div>
                  </div>
                )}
                {product.pharmacy && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <div>
                      <label className="text-sm font-medium text-gray-500">등록 약국</label>
                      <p className="text-gray-900">{product.pharmacy.name}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Price & Stock */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">정가</label>
                  <p className="text-xl font-bold text-gray-900">{formatPrice(product.price)}</p>
                </div>
                {product.sale_price && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">할인가</label>
                    <p className="text-xl font-bold text-red-600">{formatPrice(product.sale_price)}</p>
                    <p className="text-sm text-gray-500">
                      {Math.round((1 - product.sale_price / product.price) * 100)}% 할인
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-gray-400" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">재고 수량</label>
                    <p className={`text-lg font-semibold ${product.stock_quantity < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                      {product.stock_quantity}개
                    </p>
                  </div>
                </div>
                {product.created_by_user_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">등록자</label>
                    <p className="text-gray-900">{product.created_by_user_name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="mt-6 pt-6 border-t">
                <label className="text-sm font-medium text-gray-500">상품 설명</label>
                <p className="text-gray-700 mt-2 whitespace-pre-wrap">{product.description}</p>
              </div>
            )}

            {/* Status Management */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-500">상태 변경</label>
                  <p className="text-xs text-gray-400">상품 판매 상태를 변경합니다</p>
                </div>
                <AGSelect
                  value={product.status}
                  onChange={(e) => handleStatusChange(e.target.value as ProductStatus)}
                  disabled={updating}
                  className="w-40"
                >
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </AGSelect>
              </div>
            </div>

            {/* Timestamps */}
            <div className="mt-6 pt-6 border-t text-sm text-gray-500">
              <div className="flex gap-6">
                <span>등록: {formatDate(product.created_at)}</span>
                <span>수정: {formatDate(product.updated_at)}</span>
              </div>
            </div>
          </AGCard>
        </AGSection>
      </div>
    </div>
  );
};

export default ProductDetailPage;

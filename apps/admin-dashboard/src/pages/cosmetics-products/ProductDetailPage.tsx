/**
 * Cosmetics Product Detail Page
 *
 * 화장품 제품 상세 페이지
 * - 제품 정보
 * - 성분 목록
 * - 가격 정보
 *
 * Phase 7-A-2: Cosmetics API Integration
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
} from '@o4o/ui';
import {
  Package,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

/**
 * API Response Types (OpenAPI 계약 기반)
 */
interface BrandDetail {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  is_active: boolean;
  lines?: LineSummary[];
  product_count?: number;
}

interface LineSummary {
  id: string;
  name: string;
  product_count?: number;
}

interface Price {
  base: number;
  sale?: number | null;
  currency: string;
}

interface ProductImage {
  url: string;
  alt?: string;
  is_primary: boolean;
  order?: number;
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price_modifier?: number;
}

type ProductStatus = 'draft' | 'visible' | 'hidden' | 'sold_out';

interface ProductDetail {
  id: string;
  name: string;
  brand: BrandDetail;
  line?: LineSummary;
  description?: string;
  ingredients?: string[];
  status: ProductStatus;
  price: Price;
  variants?: ProductVariant[];
  images?: ProductImage[];
  created_at: string;
  updated_at: string;
}

interface ProductDetailResponse {
  data: ProductDetail;
}

const statusLabels: Record<ProductStatus, string> = {
  draft: '초안',
  visible: '공개',
  hidden: '숨김',
  sold_out: '품절',
};

const statusColors: Record<ProductStatus, 'gray' | 'green' | 'yellow' | 'red'> = {
  draft: 'gray',
  visible: 'green',
  hidden: 'yellow',
  sold_out: 'red',
};

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const api = authClient.api;
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);

  const fetchProduct = useCallback(async () => {
    if (!productId) {
      setError('상품 ID가 없습니다.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ProductDetailResponse>(`/api/v1/cosmetics/products/${productId}`);
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

  const formatPrice = (price: Price) => {
    const displayPrice = price.sale ?? price.base;
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: price.currency || 'KRW' }).format(displayPrice);
  };

  const getPrimaryImage = (images?: ProductImage[]) => {
    if (!images || images.length === 0) return null;
    const primary = images.find(img => img.is_primary);
    return primary || images[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
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
          {error ? (
            <>
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
            </>
          ) : (
            <>
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">제품을 찾을 수 없습니다</p>
            </>
          )}
          <AGButton variant="outline" onClick={() => navigate('/cosmetics-products')}>
            목록으로 돌아가기
          </AGButton>
        </div>
      </div>
    );
  }

  const primaryImage = getPrimaryImage(product.images);
  const allImages = product.images?.sort((a, b) => (a.order || 0) - (b.order || 0)) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <AGPageHeader
        title={product.name}
        description={product.brand.name}
        icon={<Package className="w-5 h-5" />}
        breadcrumb={
          <Link
            to="/cosmetics-products"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            제품 목록
          </Link>
        }
        actions={
          <AGTag color={statusColors[product.status]} size="md">
            {statusLabels[product.status]}
          </AGTag>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Product Header Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Images */}
          <div className="space-y-4">
            <AGCard padding="none" className="overflow-hidden">
              <div className="relative aspect-square bg-gray-100">
                {allImages[selectedImage] ? (
                  <img
                    src={allImages[selectedImage].url}
                    alt={allImages[selectedImage].alt || product.name}
                    className="w-full h-full object-cover"
                  />
                ) : primaryImage ? (
                  <img
                    src={primaryImage.url}
                    alt={primaryImage.alt || product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-20 h-20 text-gray-300" />
                  </div>
                )}
                {/* Sale Badge */}
                {product.price.sale && (
                  <AGTag color="red" size="md" className="absolute top-4 right-4">
                    SALE
                  </AGTag>
                )}
              </div>
            </AGCard>
            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImage === idx ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <img src={img.url} alt={img.alt || `${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <Link
                to={`/cosmetics-products/brands/${product.brand.id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                {product.brand.name}
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">{product.name}</h1>
              {product.line && (
                <p className="text-sm text-gray-500 mt-1">{product.line.name}</p>
              )}
            </div>

            {/* Price */}
            <div className="space-y-1">
              {product.price.sale ? (
                <>
                  <div className="text-lg text-gray-400 line-through">
                    {new Intl.NumberFormat('ko-KR').format(product.price.base)}원
                  </div>
                  <div className="text-3xl font-bold text-red-600">{formatPrice(product.price)}</div>
                </>
              ) : (
                <div className="text-3xl font-bold text-gray-900">{formatPrice(product.price)}</div>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">상품 설명</h3>
                <p className="text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">등록일</span>
                <p className="font-medium text-gray-900">{formatDate(product.created_at)}</p>
              </div>
              <div>
                <span className="text-gray-500">최종 수정일</span>
                <p className="font-medium text-gray-900">{formatDate(product.updated_at)}</p>
              </div>
            </div>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">옵션</h3>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <AGTag key={variant.id} color="gray" size="md">
                      {variant.name}
                      {variant.price_modifier && variant.price_modifier !== 0 && (
                        <span className="ml-1">
                          ({variant.price_modifier > 0 ? '+' : ''}{new Intl.NumberFormat('ko-KR').format(variant.price_modifier)}원)
                        </span>
                      )}
                    </AGTag>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ingredients Section */}
        {product.ingredients && product.ingredients.length > 0 && (
          <AGSection title="성분 목록">
            <AGCard>
              <div className="flex flex-wrap gap-2">
                {product.ingredients.map((ingredient, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full"
                  >
                    {ingredient}
                  </span>
                ))}
              </div>
            </AGCard>
          </AGSection>
        )}

        {/* Brand Info */}
        <AGSection title="브랜드 정보">
          <AGCard>
            <Link
              to={`/cosmetics-products/brands/${product.brand.id}`}
              className="flex items-center gap-4 hover:bg-gray-50 -m-4 p-4 rounded-lg transition-colors"
            >
              {product.brand.logo_url ? (
                <img
                  src={product.brand.logo_url}
                  alt={product.brand.name}
                  className="w-16 h-16 object-contain rounded-lg bg-white"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Package className="w-8 h-8 text-gray-300" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{product.brand.name}</h3>
                {product.brand.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mt-1">{product.brand.description}</p>
                )}
              </div>
              <ArrowLeft className="w-5 h-5 text-gray-400 rotate-180" />
            </Link>
          </AGCard>
        </AGSection>
      </div>
    </div>
  );
};

export default ProductDetailPage;

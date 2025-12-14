/**
 * Cosmetics Product Detail Page
 *
 * 화장품 제품 상세 페이지
 * - 제품 정보
 * - 성분 분석
 * - 관련 루틴
 * - 추천 제품
 *
 * Phase 7-H: Cosmetics Products/Brands/Routines UI Redesign (AG Design System)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGTag,
  AGTable,
} from '@o4o/ui';
import type { AGTableColumn } from '@o4o/ui';
import {
  Package,
  ArrowLeft,
  Star,
  Heart,
  Share2,
  Shield,
  Droplet,
  Sparkles,
  ChevronRight,
  ExternalLink,
  FlaskConical,
  Clock,
} from 'lucide-react';

interface ProductDetail {
  id: string;
  name: string;
  brandId: string;
  brandName: string;
  category: string;
  price: number;
  imageUrl?: string;
  images: string[];
  description: string;
  skinTypes: string[];
  concerns: string[];
  certifications: string[];
  rating: number;
  reviewCount: number;
  isNew: boolean;
  isBestSeller: boolean;
  ingredients: Array<{
    name: string;
    function: string;
    percentage?: string;
    ewgScore?: number;
  }>;
  relatedRoutines: Array<{
    id: string;
    title: string;
    stepCount: number;
    skinTypes: string[];
  }>;
  relatedProducts: Array<{
    id: string;
    name: string;
    brandName: string;
    price: number;
    imageUrl?: string;
    rating: number;
  }>;
}

type TabType = 'overview' | 'ingredients' | 'routines' | 'reviews';

const skinTypeLabels: Record<string, string> = {
  dry: '건성',
  oily: '지성',
  combination: '복합성',
  sensitive: '민감성',
  normal: '중성',
};

const concernLabels: Record<string, string> = {
  wrinkle: '주름',
  pigmentation: '색소침착',
  pore: '모공',
  acne: '여드름',
  dryness: '건조',
  oiliness: '유수분',
};

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const api = authClient.api;
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedImage, setSelectedImage] = useState(0);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      // Demo data
      setProduct({
        id: productId || 'prod-1',
        name: '하이드로 부스팅 세럼 30ml',
        brandId: 'brand-1',
        brandName: '네이처리퍼블릭',
        category: '세럼',
        price: 45000,
        imageUrl: 'https://placehold.co/400x400/e0f2fe/0891b2?text=Serum',
        images: [
          'https://placehold.co/400x400/e0f2fe/0891b2?text=Main',
          'https://placehold.co/400x400/e0f2fe/0891b2?text=Side',
          'https://placehold.co/400x400/e0f2fe/0891b2?text=Back',
        ],
        description:
          '히알루론산과 세라마이드가 풍부하게 함유된 고보습 세럼입니다. 건조하고 민감한 피부에 깊은 수분을 공급하고, 피부 장벽을 강화하여 외부 자극으로부터 보호합니다. 가볍고 산뜻한 텍스처로 끈적임 없이 빠르게 흡수됩니다.',
        skinTypes: ['dry', 'sensitive'],
        concerns: ['dryness', 'wrinkle'],
        certifications: ['KFDA', 'EWG Verified'],
        rating: 4.8,
        reviewCount: 1245,
        isNew: true,
        isBestSeller: true,
        ingredients: [
          { name: '히알루론산', function: '보습', percentage: '2%', ewgScore: 1 },
          { name: '세라마이드 NP', function: '장벽 강화', percentage: '0.5%', ewgScore: 1 },
          { name: '나이아신아마이드', function: '미백, 피지 조절', percentage: '5%', ewgScore: 1 },
          { name: '판테놀', function: '진정, 보습', percentage: '1%', ewgScore: 1 },
          { name: '알란토인', function: '진정', percentage: '0.2%', ewgScore: 1 },
          { name: '글리세린', function: '보습', ewgScore: 2 },
        ],
        relatedRoutines: [
          { id: 'routine-1', title: '피부 보습 집중 루틴', stepCount: 5, skinTypes: ['dry', 'sensitive'] },
          { id: 'routine-2', title: '안티에이징 모닝 케어', stepCount: 4, skinTypes: ['dry', 'normal'] },
        ],
        relatedProducts: [
          {
            id: 'prod-2',
            name: '비타민C 브라이트닝 앰플',
            brandName: '이니스프리',
            price: 52000,
            imageUrl: 'https://placehold.co/200x200/fef3c7/d97706?text=Ampoule',
            rating: 4.6,
          },
          {
            id: 'prod-3',
            name: '수분 크림 50ml',
            brandName: '네이처리퍼블릭',
            price: 38000,
            imageUrl: 'https://placehold.co/200x200/dcfce7/16a34a?text=Cream',
            rating: 4.5,
          },
          {
            id: 'prod-4',
            name: '선스크린 SPF50+',
            brandName: '라로슈포제',
            price: 28000,
            imageUrl: 'https://placehold.co/200x200/fef9c3/ca8a04?text=Sun',
            rating: 4.9,
          },
        ],
      });
    } catch (err) {
      console.error('Failed to fetch product:', err);
    } finally {
      setLoading(false);
    }
  }, [api, productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(price);
  };

  const getEwgColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-600';
    if (score <= 2) return 'bg-green-100 text-green-700';
    if (score <= 6) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'overview', label: '개요' },
    { key: 'ingredients', label: '성분' },
    { key: 'routines', label: '루틴' },
    { key: 'reviews', label: '리뷰' },
  ];

  // Ingredients table columns
  const ingredientColumns: AGTableColumn<ProductDetail['ingredients'][0]>[] = [
    {
      key: 'name',
      header: '성분명',
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'function',
      header: '기능',
    },
    {
      key: 'percentage',
      header: '함량',
      align: 'center',
      render: (value) => value || '-',
    },
    {
      key: 'ewgScore',
      header: 'EWG',
      align: 'center',
      render: (value) => (
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getEwgColor(value)}`}>
          {value || '-'}
        </span>
      ),
    },
  ];

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

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">제품을 찾을 수 없습니다</p>
          <Link to="/cosmetics-products">
            <AGButton variant="outline" className="mt-4">
              목록으로 돌아가기
            </AGButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <AGPageHeader
        title={product.name}
        description={product.brandName}
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
          <div className="flex gap-2">
            <AGButton variant="ghost" size="sm" iconLeft={<Heart className="w-4 h-4" />}>
              찜하기
            </AGButton>
            <AGButton variant="ghost" size="sm" iconLeft={<Share2 className="w-4 h-4" />}>
              공유
            </AGButton>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Product Header Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Images */}
          <div className="space-y-4">
            <AGCard padding="none" className="overflow-hidden">
              <div className="relative aspect-square bg-gray-100">
                {product.images[selectedImage] ? (
                  <img
                    src={product.images[selectedImage]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-20 h-20 text-gray-300" />
                  </div>
                )}
                {product.isNew && (
                  <AGTag color="blue" size="sm" className="absolute top-4 left-4">
                    NEW
                  </AGTag>
                )}
                {product.isBestSeller && (
                  <AGTag color="red" size="sm" className="absolute top-4 left-16">
                    BEST
                  </AGTag>
                )}
              </div>
            </AGCard>
            {/* Thumbnails */}
            <div className="flex gap-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === idx ? 'border-blue-500' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <Link
                to={`/cosmetics-products/brands/${product.brandId}`}
                className="text-sm text-blue-600 hover:underline"
              >
                {product.brandName}
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">{product.name}</h1>
              <p className="text-sm text-gray-500 mt-1">{product.category}</p>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-lg">{product.rating}</span>
              </div>
              <span className="text-gray-400">|</span>
              <span className="text-gray-500">{product.reviewCount.toLocaleString()} 리뷰</span>
            </div>

            {/* Price */}
            <div className="text-3xl font-bold text-gray-900">{formatPrice(product.price)}</div>

            {/* Tags */}
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 mb-2">피부 타입</p>
                <div className="flex flex-wrap gap-2">
                  {product.skinTypes.map((type) => (
                    <AGTag key={type} color="blue" size="md">
                      {skinTypeLabels[type]}
                    </AGTag>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">피부 고민</p>
                <div className="flex flex-wrap gap-2">
                  {product.concerns.map((concern) => (
                    <AGTag key={concern} color="green" size="md">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {concernLabels[concern]}
                    </AGTag>
                  ))}
                </div>
              </div>
            </div>

            {/* Certifications */}
            {product.certifications.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <Shield className="w-5 h-5 text-green-600" />
                <div className="flex flex-wrap gap-2">
                  {product.certifications.map((cert) => (
                    <span key={cert} className="text-sm font-medium text-green-700">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <p className="text-gray-600 leading-relaxed">{product.description}</p>

            {/* CTA */}
            <div className="flex gap-3">
              <AGButton variant="primary" size="lg" fullWidth>
                루틴에 추가
              </AGButton>
              <AGButton variant="outline" size="lg">
                <ExternalLink className="w-4 h-4" />
              </AGButton>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <AGSection>
          <div className="border-b">
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </AGSection>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <AGSection title="제품 개요">
            <AGCard>
              <p className="text-gray-600 leading-relaxed">{product.description}</p>
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Droplet className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                  <p className="text-sm font-medium">고보습</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Shield className="w-6 h-6 mx-auto mb-2 text-green-500" />
                  <p className="text-sm font-medium">저자극</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <FlaskConical className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                  <p className="text-sm font-medium">피부과 테스트</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                  <p className="text-sm font-medium">빠른 흡수</p>
                </div>
              </div>
            </AGCard>
          </AGSection>
        )}

        {activeTab === 'ingredients' && (
          <AGSection title="성분 분석">
            <AGCard padding="none">
              <AGTable
                columns={ingredientColumns}
                data={product.ingredients}
                emptyMessage="성분 정보가 없습니다"
              />
            </AGCard>
          </AGSection>
        )}

        {activeTab === 'routines' && (
          <AGSection title="관련 루틴">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {product.relatedRoutines.map((routine) => (
                <Link key={routine.id} to={`/cosmetics-partner/routines?id=${routine.id}`}>
                  <AGCard hoverable padding="md">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{routine.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{routine.stepCount}단계</p>
                        <div className="flex gap-1 mt-2">
                          {routine.skinTypes.map((type) => (
                            <span key={type} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">
                              {skinTypeLabels[type]}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </AGCard>
                </Link>
              ))}
            </div>
          </AGSection>
        )}

        {activeTab === 'reviews' && (
          <AGSection title="리뷰">
            <AGCard>
              <div className="text-center py-8 text-gray-500">
                <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>리뷰 기능은 준비 중입니다</p>
              </div>
            </AGCard>
          </AGSection>
        )}

        {/* Related Products */}
        <AGSection
          title="추천 제품"
          action={
            <Link to="/cosmetics-products" className="text-sm text-blue-600 hover:underline">
              더보기
            </Link>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {product.relatedProducts.map((relProd) => (
              <Link key={relProd.id} to={`/cosmetics-products/${relProd.id}`}>
                <AGCard hoverable padding="none" className="overflow-hidden">
                  <div className="h-40 bg-gray-100">
                    {relProd.imageUrl ? (
                      <img src={relProd.imageUrl} alt={relProd.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-10 h-10 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-gray-500">{relProd.brandName}</p>
                    <h4 className="font-medium text-gray-900 line-clamp-1">{relProd.name}</h4>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span>{relProd.rating}</span>
                      </div>
                      <span className="font-bold">{formatPrice(relProd.price)}</span>
                    </div>
                  </div>
                </AGCard>
              </Link>
            ))}
          </div>
        </AGSection>
      </div>
    </div>
  );
};

export default ProductDetailPage;

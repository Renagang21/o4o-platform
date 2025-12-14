/**
 * Cosmetics Brand Detail Page
 *
 * 화장품 브랜드 상세 페이지
 * - 브랜드 정보
 * - 제품 목록
 * - 관련 루틴
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
  AGKPIBlock,
  AGKPIGrid,
} from '@o4o/ui';
import {
  Building2,
  ArrowLeft,
  Star,
  Globe,
  Package,
  ChevronRight,
  Shield,
  Award,
  MapPin,
  Heart,
  Share2,
  Sparkles,
} from 'lucide-react';

interface BrandDetail {
  id: string;
  name: string;
  logoUrl?: string;
  bannerUrl?: string;
  country: string;
  description: string;
  longDescription: string;
  categories: string[];
  productCount: number;
  rating: number;
  reviewCount: number;
  certifications: string[];
  website?: string;
  foundedYear?: number;
  isFeatured: boolean;
  products: Array<{
    id: string;
    name: string;
    category: string;
    price: number;
    imageUrl?: string;
    rating: number;
    isBestSeller: boolean;
  }>;
  routines: Array<{
    id: string;
    title: string;
    stepCount: number;
    skinTypes: string[];
  }>;
}

type TabType = 'products' | 'routines' | 'about';

const skinTypeLabels: Record<string, string> = {
  dry: '건성',
  oily: '지성',
  combination: '복합성',
  sensitive: '민감성',
  normal: '중성',
};

const BrandDetailPage: React.FC = () => {
  const { brandId } = useParams<{ brandId: string }>();
  const api = authClient.api;
  const [brand, setBrand] = useState<BrandDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('products');

  const fetchBrand = useCallback(async () => {
    setLoading(true);
    try {
      // Demo data
      setBrand({
        id: brandId || 'brand-1',
        name: '네이처리퍼블릭',
        logoUrl: 'https://placehold.co/120x120/dcfce7/16a34a?text=NR',
        bannerUrl: 'https://placehold.co/1200x300/dcfce7/16a34a?text=Nature+Republic',
        country: '대한민국',
        description: '자연에서 찾은 건강한 아름다움을 추구하는 천연 화장품 브랜드',
        longDescription:
          '네이처리퍼블릭은 2009년 설립된 대한민국의 천연 화장품 브랜드입니다. 자연에서 영감을 받은 건강한 아름다움을 추구하며, 전 세계 곳곳의 청정 지역에서 엄선한 원료를 사용합니다. 피부에 부담을 주지 않는 저자극 포뮬러와 합리적인 가격으로 전 연령대의 사랑을 받고 있습니다.',
        categories: ['스킨케어', '클렌저', '마스크팩', '바디케어'],
        productCount: 128,
        rating: 4.6,
        reviewCount: 15420,
        certifications: ['KFDA', 'EWG Verified', 'Vegan Friendly'],
        website: 'https://www.naturerepublic.com',
        foundedYear: 2009,
        isFeatured: true,
        products: [
          {
            id: 'prod-1',
            name: '하이드로 부스팅 세럼 30ml',
            category: '세럼',
            price: 45000,
            imageUrl: 'https://placehold.co/200x200/e0f2fe/0891b2?text=Serum',
            rating: 4.8,
            isBestSeller: true,
          },
          {
            id: 'prod-3',
            name: '수분 크림 50ml',
            category: '크림',
            price: 38000,
            imageUrl: 'https://placehold.co/200x200/dcfce7/16a34a?text=Cream',
            rating: 4.5,
            isBestSeller: false,
          },
          {
            id: 'prod-7',
            name: '알로에 수딩 젤 300ml',
            category: '젤',
            price: 12000,
            imageUrl: 'https://placehold.co/200x200/d1fae5/059669?text=Aloe',
            rating: 4.9,
            isBestSeller: true,
          },
          {
            id: 'prod-8',
            name: '클렌징 오일 150ml',
            category: '클렌저',
            price: 18000,
            imageUrl: 'https://placehold.co/200x200/fef3c7/d97706?text=Oil',
            rating: 4.4,
            isBestSeller: false,
          },
        ],
        routines: [
          { id: 'routine-1', title: '피부 보습 집중 루틴', stepCount: 5, skinTypes: ['dry', 'sensitive'] },
          { id: 'routine-3', title: '진정 케어 루틴', stepCount: 4, skinTypes: ['sensitive', 'combination'] },
        ],
      });
    } catch (err) {
      console.error('Failed to fetch brand:', err);
    } finally {
      setLoading(false);
    }
  }, [api, brandId]);

  useEffect(() => {
    fetchBrand();
  }, [fetchBrand]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(price);
  };

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'products', label: '제품', count: brand?.products.length },
    { key: 'routines', label: '루틴', count: brand?.routines.length },
    { key: 'about', label: '브랜드 소개' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-gray-200 rounded-lg"></div>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 bg-gray-200 rounded-xl"></div>
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-48"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">브랜드를 찾을 수 없습니다</p>
          <Link to="/cosmetics-products/brands">
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
      {/* Banner */}
      <div className="relative h-48 bg-gradient-to-r from-green-400 to-green-600">
        {brand.bannerUrl && (
          <img
            src={brand.bannerUrl}
            alt={brand.name}
            className="w-full h-full object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
      </div>

      {/* Header */}
      <div className="relative -mt-16 px-4 sm:px-6 lg:px-8">
        <AGCard className="relative">
          <Link
            to="/cosmetics-products/brands"
            className="absolute top-4 left-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            브랜드 목록
          </Link>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 pt-8">
            {/* Logo */}
            <div className="w-24 h-24 bg-white rounded-xl border-4 border-white shadow-lg overflow-hidden flex-shrink-0">
              {brand.logoUrl ? (
                <img src={brand.logoUrl} alt={brand.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <Building2 className="w-10 h-10 text-gray-300" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{brand.name}</h1>
                {brand.isFeatured && (
                  <AGTag color="yellow" size="sm">
                    <Award className="w-3 h-3 mr-1" />
                    Featured
                  </AGTag>
                )}
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {brand.country}
                {brand.foundedYear && <span className="ml-2">설립 {brand.foundedYear}년</span>}
              </p>
              <p className="text-gray-600 mt-2">{brand.description}</p>

              {/* Certifications */}
              <div className="flex flex-wrap gap-2 mt-3">
                {brand.certifications.map((cert) => (
                  <AGTag key={cert} color="green" size="sm">
                    <Shield className="w-3 h-3 mr-1" />
                    {cert}
                  </AGTag>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <AGButton variant="ghost" size="sm" iconLeft={<Heart className="w-4 h-4" />}>
                팔로우
              </AGButton>
              <AGButton variant="ghost" size="sm" iconLeft={<Share2 className="w-4 h-4" />}>
                공유
              </AGButton>
              {brand.website && (
                <a href={brand.website} target="_blank" rel="noopener noreferrer">
                  <AGButton variant="outline" size="sm" iconLeft={<Globe className="w-4 h-4" />}>
                    웹사이트
                  </AGButton>
                </a>
              )}
            </div>
          </div>
        </AGCard>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats */}
        <AGSection>
          <AGKPIGrid columns={4}>
            <AGKPIBlock
              title="제품 수"
              value={brand.productCount}
              icon={<Package className="w-5 h-5 text-blue-500" />}
            />
            <AGKPIBlock
              title="평점"
              value={brand.rating}
              icon={<Star className="w-5 h-5 text-yellow-500" />}
            />
            <AGKPIBlock
              title="리뷰"
              value={brand.reviewCount.toLocaleString()}
              icon={<Sparkles className="w-5 h-5 text-purple-500" />}
            />
            <AGKPIBlock
              title="루틴"
              value={brand.routines.length}
              icon={<Sparkles className="w-5 h-5 text-green-500" />}
            />
          </AGKPIGrid>
        </AGSection>

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
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-1 text-gray-400">({tab.count})</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </AGSection>

        {/* Tab Content */}
        {activeTab === 'products' && (
          <AGSection
            title="제품"
            action={
              <Link
                to={`/cosmetics-products?brand=${brand.id}`}
                className="text-sm text-green-600 hover:underline"
              >
                전체보기
              </Link>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {brand.products.map((product) => (
                <Link key={product.id} to={`/cosmetics-products/${product.id}`}>
                  <AGCard hoverable padding="none" className="overflow-hidden">
                    <div className="relative h-40 bg-gray-100">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-10 h-10 text-gray-300" />
                        </div>
                      )}
                      {product.isBestSeller && (
                        <AGTag color="red" size="sm" className="absolute top-2 left-2">
                          BEST
                        </AGTag>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-gray-500">{product.category}</p>
                      <h4 className="font-medium text-gray-900 line-clamp-1">{product.name}</h4>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          <span>{product.rating}</span>
                        </div>
                        <span className="font-bold">{formatPrice(product.price)}</span>
                      </div>
                    </div>
                  </AGCard>
                </Link>
              ))}
            </div>
          </AGSection>
        )}

        {activeTab === 'routines' && (
          <AGSection title="루틴">
            {brand.routines.length === 0 ? (
              <AGCard>
                <div className="text-center py-8 text-gray-500">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>등록된 루틴이 없습니다</p>
                </div>
              </AGCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {brand.routines.map((routine) => (
                  <Link key={routine.id} to={`/cosmetics-partner/routines?id=${routine.id}`}>
                    <AGCard hoverable padding="md">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{routine.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">{routine.stepCount}단계</p>
                          <div className="flex gap-1 mt-2">
                            {routine.skinTypes.map((type) => (
                              <span
                                key={type}
                                className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded"
                              >
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
            )}
          </AGSection>
        )}

        {activeTab === 'about' && (
          <AGSection title="브랜드 소개">
            <AGCard>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-600 leading-relaxed">{brand.longDescription}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">브랜드 정보</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex">
                        <dt className="w-24 text-gray-500">국가</dt>
                        <dd className="text-gray-900">{brand.country}</dd>
                      </div>
                      {brand.foundedYear && (
                        <div className="flex">
                          <dt className="w-24 text-gray-500">설립</dt>
                          <dd className="text-gray-900">{brand.foundedYear}년</dd>
                        </div>
                      )}
                      <div className="flex">
                        <dt className="w-24 text-gray-500">제품 수</dt>
                        <dd className="text-gray-900">{brand.productCount}개</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">주요 카테고리</h4>
                    <div className="flex flex-wrap gap-2">
                      {brand.categories.map((cat) => (
                        <AGTag key={cat} color="gray" size="md">
                          {cat}
                        </AGTag>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </AGCard>
          </AGSection>
        )}
      </div>
    </div>
  );
};

export default BrandDetailPage;

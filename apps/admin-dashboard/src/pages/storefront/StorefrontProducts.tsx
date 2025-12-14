/**
 * StorefrontProducts - Product List Page
 *
 * Phase 7-I: Storefront & QR Landing UI
 *
 * Consumer-facing product listing with filters.
 * Features:
 * - Search bar
 * - Skin type filter
 * - Skin concern filter
 * - Responsive product grid
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGStorefrontLayout,
  AGStorefrontPageTitle,
  AGStorefrontSection,
  AGStorefrontCardGrid,
  AGStorefrontProductCard,
  StorefrontPartner,
} from '@o4o/ui';
import { AGInput, AGSelect } from '@o4o/ui';
import { Search, Filter, X } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  brand?: string;
  image?: string;
  price?: number;
  skinTypes?: string[];
  concerns?: string[];
  category?: string;
}

const SKIN_TYPE_OPTIONS = [
  { value: 'all', label: '전체 피부타입' },
  { value: '건성', label: '건성' },
  { value: '지성', label: '지성' },
  { value: '복합성', label: '복합성' },
  { value: '민감성', label: '민감성' },
  { value: '중성', label: '중성' },
];

const CONCERN_OPTIONS = [
  { value: 'all', label: '전체 고민' },
  { value: '건조', label: '건조' },
  { value: '주름', label: '주름' },
  { value: '모공', label: '모공' },
  { value: '미백', label: '미백' },
  { value: '트러블', label: '트러블' },
  { value: '탄력', label: '탄력' },
];

export default function StorefrontProducts() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<StorefrontPartner | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [skinTypeFilter, setSkinTypeFilter] = useState('all');
  const [concernFilter, setConcernFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const loadProducts = useCallback(async () => {
    if (!slug) return;

    try {
      setLoading(true);

      const response = await authClient.api.get(`/api/v1/storefront/${slug}/products`);

      if (response.data?.success) {
        setPartner(response.data.data.partner);
        setProducts(response.data.data.products);
      }
    } catch (err) {
      console.error('Error loading products:', err);
      // Demo data
      setPartner({
        name: '뷰티인사이더 지수',
        slug: slug || 'demo',
        profileImage: 'https://placehold.co/100x100/pink/white?text=J',
        tagline: '피부과학 기반 스킨케어 전문가',
      });
      setProducts([
        {
          id: '1',
          name: '히알루론산 수분 세럼',
          brand: '더마랩',
          image: 'https://placehold.co/300x300/f5f5f5/666?text=Serum',
          price: 35000,
          skinTypes: ['건성', '복합성'],
          concerns: ['건조', '수분'],
          category: '세럼',
        },
        {
          id: '2',
          name: '세라마이드 보습 크림',
          brand: '피부연구소',
          image: 'https://placehold.co/300x300/f5f5f5/666?text=Cream',
          price: 42000,
          skinTypes: ['건성', '민감성'],
          concerns: ['보습', '장벽강화'],
          category: '크림',
        },
        {
          id: '3',
          name: '비타민C 브라이트닝 앰플',
          brand: '글로우랩',
          image: 'https://placehold.co/300x300/f5f5f5/666?text=Ampoule',
          price: 38000,
          skinTypes: ['모든피부'],
          concerns: ['미백', '톤업'],
          category: '앰플',
        },
        {
          id: '4',
          name: 'BHA 모공 클렌저',
          brand: '클리어스킨',
          image: 'https://placehold.co/300x300/f5f5f5/666?text=Cleanser',
          price: 28000,
          skinTypes: ['지성', '복합성'],
          concerns: ['모공', '각질'],
          category: '클렌저',
        },
        {
          id: '5',
          name: '나이아신아마이드 토너',
          brand: '스킨랩',
          image: 'https://placehold.co/300x300/f5f5f5/666?text=Toner',
          price: 25000,
          skinTypes: ['지성', '복합성'],
          concerns: ['모공', '피지'],
          category: '토너',
        },
        {
          id: '6',
          name: '레티놀 안티에이징 크림',
          brand: '에이지랩',
          image: 'https://placehold.co/300x300/f5f5f5/666?text=Retinol',
          price: 55000,
          skinTypes: ['건성', '중성'],
          concerns: ['주름', '탄력'],
          category: '크림',
        },
        {
          id: '7',
          name: '센텔라 진정 세럼',
          brand: '시카케어',
          image: 'https://placehold.co/300x300/f5f5f5/666?text=Cica',
          price: 32000,
          skinTypes: ['민감성', '복합성'],
          concerns: ['트러블', '진정'],
          category: '세럼',
        },
        {
          id: '8',
          name: 'AHA 각질 케어 패드',
          brand: '글로우업',
          image: 'https://placehold.co/300x300/f5f5f5/666?text=Pad',
          price: 22000,
          skinTypes: ['지성', '복합성'],
          concerns: ['각질', '톤업'],
          category: '패드',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(search);
        const matchesBrand = product.brand?.toLowerCase().includes(search);
        if (!matchesName && !matchesBrand) return false;
      }

      // Skin type filter
      if (skinTypeFilter !== 'all') {
        if (!product.skinTypes?.includes(skinTypeFilter)) return false;
      }

      // Concern filter
      if (concernFilter !== 'all') {
        if (!product.concerns?.includes(concernFilter)) return false;
      }

      return true;
    });
  }, [products, searchTerm, skinTypeFilter, concernFilter]);

  const hasActiveFilters = skinTypeFilter !== 'all' || concernFilter !== 'all' || searchTerm !== '';

  const handleProductClick = (productId: string) => {
    navigate(`/storefront/${slug}/products/${productId}`);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSkinTypeFilter('all');
    setConcernFilter('all');
  };

  const handleBack = () => {
    navigate(`/storefront/${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">스토어를 찾을 수 없습니다</h2>
        </div>
      </div>
    );
  }

  return (
    <AGStorefrontLayout partner={partner} showBackButton onBack={handleBack}>
      <AGStorefrontPageTitle
        title="제품 목록"
        subtitle={`${products.length}개의 추천 제품`}
      />

      {/* Search & Filter Section */}
      <AGStorefrontSection noPadding className="px-4 pb-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <AGInput
            type="text"
            placeholder="제품명 또는 브랜드 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle (Mobile) */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="mt-3 flex items-center gap-2 text-sm text-gray-600 sm:hidden"
        >
          <Filter className="w-4 h-4" />
          필터 {showFilters ? '숨기기' : '보기'}
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
          )}
        </button>

        {/* Filters */}
        <div className={`mt-3 flex flex-col sm:flex-row gap-3 ${showFilters ? 'block' : 'hidden sm:flex'}`}>
          <AGSelect
            value={skinTypeFilter}
            onChange={(e) => setSkinTypeFilter(e.target.value)}
            className="flex-1"
          >
            {SKIN_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </AGSelect>
          <AGSelect
            value={concernFilter}
            onChange={(e) => setConcernFilter(e.target.value)}
            className="flex-1"
          >
            {CONCERN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </AGSelect>
        </div>

        {/* Active Filters & Clear */}
        {hasActiveFilters && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {filteredProducts.length}개 제품 표시
            </p>
            <button
              onClick={handleClearFilters}
              className="text-sm text-pink-600 hover:text-pink-700"
            >
              필터 초기화
            </button>
          </div>
        )}
      </AGStorefrontSection>

      {/* Product Grid */}
      <AGStorefrontSection>
        {filteredProducts.length > 0 ? (
          <AGStorefrontCardGrid columns={2}>
            {filteredProducts.map((product) => (
              <AGStorefrontProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                brand={product.brand}
                image={product.image}
                price={product.price}
                tags={[...(product.skinTypes || []), ...(product.concerns || [])].slice(0, 2)}
                onClick={() => handleProductClick(product.id)}
              />
            ))}
          </AGStorefrontCardGrid>
        ) : (
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              검색 결과가 없습니다
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              다른 검색어나 필터를 시도해보세요
            </p>
            <button
              onClick={handleClearFilters}
              className="text-sm text-pink-600 hover:text-pink-700"
            >
              필터 초기화
            </button>
          </div>
        )}
      </AGStorefrontSection>
    </AGStorefrontLayout>
  );
}

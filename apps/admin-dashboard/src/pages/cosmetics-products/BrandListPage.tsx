/**
 * Cosmetics Brand List Page
 *
 * 화장품 브랜드 목록 페이지
 * - 브랜드 카드 그리드
 * - 검색/필터
 *
 * Phase 7-H: Cosmetics Products/Brands/Routines UI Redesign (AG Design System)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGInput,
  AGSelect,
  AGTag,
} from '@o4o/ui';
import {
  Building2,
  Search,
  RefreshCw,
  Globe,
  Package,
  Star,
  ChevronRight,
  Award,
  MapPin,
} from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  country: string;
  description: string;
  categories: string[];
  productCount: number;
  rating: number;
  certifications: string[];
  isFeatured: boolean;
}

const BrandListPage: React.FC = () => {
  const api = authClient.api;
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      // Demo data
      setBrands([
        {
          id: 'brand-1',
          name: '네이처리퍼블릭',
          logoUrl: 'https://placehold.co/120x120/dcfce7/16a34a?text=NR',
          country: '대한민국',
          description: '자연에서 찾은 건강한 아름다움을 추구하는 천연 화장품 브랜드',
          categories: ['스킨케어', '클렌저', '마스크팩'],
          productCount: 128,
          rating: 4.6,
          certifications: ['KFDA', 'EWG Verified'],
          isFeatured: true,
        },
        {
          id: 'brand-2',
          name: '이니스프리',
          logoUrl: 'https://placehold.co/120x120/e0f2fe/0891b2?text=INF',
          country: '대한민국',
          description: '제주의 청정 자연을 담은 천연 화장품 브랜드',
          categories: ['스킨케어', '메이크업', '바디케어'],
          productCount: 256,
          rating: 4.5,
          certifications: ['KFDA'],
          isFeatured: true,
        },
        {
          id: 'brand-3',
          name: '라로슈포제',
          logoUrl: 'https://placehold.co/120x120/fef9c3/ca8a04?text=LRP',
          country: '프랑스',
          description: '민감하고 까다로운 피부를 위한 더마 코스메틱 브랜드',
          categories: ['선케어', '스킨케어', '클렌저'],
          productCount: 89,
          rating: 4.8,
          certifications: ['Dermatologist Tested', 'EWG Verified'],
          isFeatured: true,
        },
        {
          id: 'brand-4',
          name: '달바',
          logoUrl: 'https://placehold.co/120x120/fce7f3/ec4899?text=DBA',
          country: '대한민국',
          description: '화이트 트러플과 프리미엄 원료를 사용한 럭셔리 스킨케어',
          categories: ['스킨케어', '미스트'],
          productCount: 45,
          rating: 4.7,
          certifications: ['KFDA'],
          isFeatured: false,
        },
        {
          id: 'brand-5',
          name: '코스알엑스',
          logoUrl: 'https://placehold.co/120x120/e0e7ff/6366f1?text=CSX',
          country: '대한민국',
          description: '효능과 안전성을 중시하는 더마 코스메틱 브랜드',
          categories: ['스킨케어', '클렌저'],
          productCount: 67,
          rating: 4.6,
          certifications: ['KFDA', 'Vegan'],
          isFeatured: false,
        },
        {
          id: 'brand-6',
          name: '에스티로더',
          logoUrl: 'https://placehold.co/120x120/fef3c7/d97706?text=EL',
          country: '미국',
          description: '1946년 설립된 글로벌 프레스티지 뷰티 브랜드',
          categories: ['스킨케어', '메이크업', '향수'],
          productCount: 312,
          rating: 4.7,
          certifications: [],
          isFeatured: true,
        },
      ]);
    } catch (err) {
      console.error('Failed to fetch brands:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // Get unique countries and categories
  const countries = [...new Set(brands.map((b) => b.country))];
  const categories = [...new Set(brands.flatMap((b) => b.categories))];

  // Filtering
  const filteredBrands = brands.filter((brand) => {
    if (searchTerm && !brand.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (countryFilter !== 'all' && brand.country !== countryFilter) return false;
    if (categoryFilter !== 'all' && !brand.categories.includes(categoryFilter)) return false;
    return true;
  });

  // Sort featured first
  const sortedBrands = [...filteredBrands].sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return a.name.localeCompare(b.name);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
              <div className="w-20 h-20 bg-gray-200 rounded-lg mx-auto mb-4"></div>
              <div className="h-5 bg-gray-200 rounded w-2/3 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <AGPageHeader
        title="Brands"
        description="화장품 브랜드"
        icon={<Building2 className="w-5 h-5" />}
        actions={
          <AGButton
            variant="ghost"
            size="sm"
            onClick={fetchBrands}
            iconLeft={<RefreshCw className="w-4 h-4" />}
          >
            새로고침
          </AGButton>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Filters */}
        <AGSection>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <AGInput
                type="text"
                placeholder="브랜드 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <AGSelect
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-40"
            >
              <option value="all">전체 국가</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </AGSelect>
            <AGSelect
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-40"
            >
              <option value="all">전체 카테고리</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </AGSelect>
          </div>
        </AGSection>

        {/* Results */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            총 <span className="font-medium">{filteredBrands.length}</span>개 브랜드
          </p>
        </div>

        {/* Brand Grid */}
        <AGSection>
          {sortedBrands.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>검색 결과가 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedBrands.map((brand) => (
                <Link key={brand.id} to={`/cosmetics-products/brands/${brand.id}`}>
                  <AGCard hoverable padding="lg" className="text-center group">
                    {/* Featured Badge */}
                    {brand.isFeatured && (
                      <div className="absolute top-3 right-3">
                        <AGTag color="yellow" size="sm">
                          <Award className="w-3 h-3 mr-1" />
                          Featured
                        </AGTag>
                      </div>
                    )}

                    {/* Logo */}
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-xl overflow-hidden">
                      {brand.logoUrl ? (
                        <img
                          src={brand.logoUrl}
                          alt={brand.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="w-10 h-10 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Name & Country */}
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{brand.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center justify-center gap-1 mb-3">
                      <MapPin className="w-3 h-3" />
                      {brand.country}
                    </p>

                    {/* Description */}
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">{brand.description}</p>

                    {/* Categories */}
                    <div className="flex flex-wrap justify-center gap-1 mb-4">
                      {brand.categories.slice(0, 3).map((cat) => (
                        <span
                          key={cat}
                          className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-center gap-4 pt-4 border-t text-sm">
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{brand.productCount}개 제품</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="font-medium">{brand.rating}</span>
                      </div>
                    </div>

                    {/* Certifications */}
                    {brand.certifications.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1 mt-3">
                        {brand.certifications.map((cert) => (
                          <AGTag key={cert} color="green" size="sm">
                            {cert}
                          </AGTag>
                        ))}
                      </div>
                    )}
                  </AGCard>
                </Link>
              ))}
            </div>
          )}
        </AGSection>
      </div>
    </div>
  );
};

export default BrandListPage;

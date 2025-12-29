/**
 * Cosmetics Brand List Page
 *
 * 화장품 브랜드 목록 페이지
 * - 브랜드 카드 그리드
 * - 검색/필터
 *
 * Phase 7-A-2: Cosmetics API Integration
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
  AGTag,
} from '@o4o/ui';
import {
  Building2,
  Search,
  RefreshCw,
  Package,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

/**
 * API Response Types (OpenAPI 계약 기반)
 */
interface LineSummary {
  id: string;
  name: string;
  product_count?: number;
}

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

interface BrandListResponse {
  data: BrandDetail[];
}

const BrandListPage: React.FC = () => {
  const api = authClient.api;
  const [brands, setBrands] = useState<BrandDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeFilter === 'active') {
        params.set('is_active', 'true');
      } else if (activeFilter === 'inactive') {
        params.set('is_active', 'false');
      }

      const response = await api.get<BrandListResponse>(`/api/v1/cosmetics/brands?${params.toString()}`);
      if (response.data) {
        setBrands(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch brands:', err);
      setError(err.message || '브랜드 목록을 불러오는데 실패했습니다.');
      setBrands([]);
    } finally {
      setLoading(false);
    }
  }, [api, activeFilter]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // Client-side filtering for search
  const filteredBrands = brands.filter((brand) => {
    if (searchTerm && !brand.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Sort active brands first
  const sortedBrands = [...filteredBrands].sort((a, b) => {
    if (a.is_active && !b.is_active) return -1;
    if (!a.is_active && b.is_active) return 1;
    return a.name.localeCompare(b.name);
  });

  if (loading && brands.length === 0) {
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
            iconLeft={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            새로고침
          </AGButton>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

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
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 text-sm transition-colors ${
                  activeFilter === 'all' ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setActiveFilter('active')}
                className={`px-4 py-2 text-sm transition-colors border-l ${
                  activeFilter === 'active' ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
                }`}
              >
                활성
              </button>
              <button
                onClick={() => setActiveFilter('inactive')}
                className={`px-4 py-2 text-sm transition-colors border-l ${
                  activeFilter === 'inactive' ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
                }`}
              >
                비활성
              </button>
            </div>
          </div>
        </AGSection>

        {/* Results */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            총 <span className="font-medium">{sortedBrands.length}</span>개 브랜드
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
                  <AGCard hoverable padding="lg" className="relative group">
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <AGTag color={brand.is_active ? 'green' : 'gray'} size="sm">
                        {brand.is_active ? '활성' : '비활성'}
                      </AGTag>
                    </div>

                    <div className="flex items-start gap-4">
                      {/* Logo */}
                      <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                        {brand.logo_url ? (
                          <img
                            src={brand.logo_url}
                            alt={brand.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="w-10 h-10 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-gray-900 mb-1">{brand.name}</h3>
                        <p className="text-xs text-gray-400 mb-2">/{brand.slug}</p>
                        {brand.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{brand.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Lines & Product Count */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span>{brand.product_count || 0}개 제품</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>

                      {/* Lines */}
                      {brand.lines && brand.lines.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {brand.lines.slice(0, 3).map((line) => (
                            <span
                              key={line.id}
                              className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded"
                            >
                              {line.name}
                            </span>
                          ))}
                          {brand.lines.length > 3 && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                              +{brand.lines.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
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

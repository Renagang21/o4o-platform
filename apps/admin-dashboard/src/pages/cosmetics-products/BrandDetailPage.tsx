/**
 * Cosmetics Brand Detail Page
 *
 * 화장품 브랜드 상세 페이지
 * - 브랜드 정보
 * - 라인 목록
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
  Building2,
  ArrowLeft,
  Package,
  AlertCircle,
  ChevronRight,
  Layers,
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

interface BrandDetailResponse {
  data: BrandDetail;
}

const BrandDetailPage: React.FC = () => {
  const { brandId } = useParams<{ brandId: string }>();
  const navigate = useNavigate();
  const api = authClient.api;
  const [brand, setBrand] = useState<BrandDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrand = useCallback(async () => {
    if (!brandId) {
      setError('브랜드 ID가 없습니다.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get<BrandDetailResponse>(`/api/v1/cosmetics/brands/${brandId}`);
      if (response.data) {
        setBrand(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch brand:', err);
      if (err.response?.status === 404) {
        setError('브랜드를 찾을 수 없습니다.');
      } else {
        setError(err.message || '브랜드 정보를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [api, brandId]);

  useEffect(() => {
    fetchBrand();
  }, [fetchBrand]);

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

  if (error || !brand) {
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
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">브랜드를 찾을 수 없습니다</p>
            </>
          )}
          <AGButton variant="outline" onClick={() => navigate('/cosmetics-products/brands')}>
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
        title={brand.name}
        description={`/${brand.slug}`}
        icon={<Building2 className="w-5 h-5" />}
        breadcrumb={
          <Link
            to="/cosmetics-products/brands"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            브랜드 목록
          </Link>
        }
        actions={
          <AGTag color={brand.is_active ? 'green' : 'gray'} size="md">
            {brand.is_active ? '활성' : '비활성'}
          </AGTag>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Brand Info */}
        <AGSection>
          <AGCard>
            <div className="flex flex-col md:flex-row items-start gap-6">
              {/* Logo */}
              <div className="w-32 h-32 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                {brand.logo_url ? (
                  <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-16 h-16 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{brand.name}</h1>
                <p className="text-sm text-gray-400 mt-1">/{brand.slug}</p>

                {brand.description && (
                  <p className="text-gray-600 mt-4 leading-relaxed">{brand.description}</p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-6 mt-6 pt-6 border-t">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{brand.product_count || 0}</p>
                      <p className="text-xs text-gray-500">제품</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{brand.lines?.length || 0}</p>
                      <p className="text-xs text-gray-500">라인</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AGCard>
        </AGSection>

        {/* Lines Section */}
        <AGSection
          title="제품 라인"
          action={
            <Link to={`/cosmetics-products?brand_id=${brand.id}`}>
              <AGButton variant="ghost" size="sm">
                전체 제품 보기
                <ChevronRight className="w-4 h-4 ml-1" />
              </AGButton>
            </Link>
          }
        >
          {brand.lines && brand.lines.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {brand.lines.map((line) => (
                <Link key={line.id} to={`/cosmetics-products?brand_id=${brand.id}&line_id=${line.id}`}>
                  <AGCard hoverable padding="md">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{line.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {line.product_count || 0}개 제품
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </AGCard>
                </Link>
              ))}
            </div>
          ) : (
            <AGCard>
              <div className="text-center py-8 text-gray-500">
                <Layers className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>등록된 라인이 없습니다</p>
              </div>
            </AGCard>
          )}
        </AGSection>
      </div>
    </div>
  );
};

export default BrandDetailPage;

/**
 * Yaksa Forum Category List Page
 *
 * 약사 포럼 카테고리 목록 페이지
 * - 카테고리 카드 그리드
 * - 카테고리별 게시글 수
 *
 * Phase 9-B: Web Business Template 복제 검증
 * Template Reference: cosmetics-products/BrandListPage.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
} from '@o4o/ui';
import {
  FolderOpen,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';

/**
 * API Response Types (OpenAPI 계약 기반)
 */
interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount?: number;
  isActive?: boolean;
}

interface CategoryListResponse {
  data: Category[];
}

const CategoryListPage: React.FC = () => {
  const api = authClient.api;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<CategoryListResponse>('/api/v1/forum/categories');
      if (response.data) {
        setCategories(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
      setError(err.message || '카테고리 목록을 불러오는데 실패했습니다.');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
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
        title="Categories"
        description="포럼 카테고리 목록"
        icon={<FolderOpen className="w-5 h-5" />}
        actions={
          <AGButton
            variant="ghost"
            size="sm"
            onClick={fetchCategories}
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

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            총 <span className="font-medium">{categories.length}</span>개 카테고리
          </p>
        </div>

        {/* Category Grid */}
        <AGSection>
          {categories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>등록된 카테고리가 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/yaksa-forum?categoryId=${category.id}`}
                >
                  <AGCard hoverable padding="lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FolderOpen className="w-5 h-5 text-blue-500" />
                          <h3 className="font-semibold text-gray-900">
                            {category.name}
                          </h3>
                        </div>
                        {category.description && (
                          <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                            {category.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <MessageSquare className="w-4 h-4" />
                          <span>{category.postCount || 0}개 게시글</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
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

export default CategoryListPage;

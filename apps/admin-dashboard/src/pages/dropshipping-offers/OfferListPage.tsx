/**
 * Dropshipping Offer List Page
 *
 * 드롭쉬핑 오퍼 목록 페이지
 * - 카드 그리드/리스트 뷰
 * - 필터/검색/정렬
 * - 반응형 레이아웃
 *
 * Phase 10: Web Extension Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 Generator 입력 정의를 수정하고 재생성하세요.
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
  AGTablePagination,
} from '@o4o/ui';
import {
  ShoppingBag,
  Search,
  RefreshCw,
  Grid,
  List,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import type { OfferSummary, OfferListResponse, PaginationMeta } from './types';

/**
 * Status Definitions
 */
type OfferStatus = 'draft' | 'active' | 'inactive' | 'archived';

const statusLabels: Record<OfferStatus, string> = {
  draft: '초안',
  active: '활성',
  inactive: '비활성',
  archived: '보관됨',
};

const statusColors: Record<OfferStatus, 'gray' | 'green' | 'yellow' | 'red' | 'blue'> = {
  draft: 'gray',
  active: 'green',
  inactive: 'yellow',
  archived: 'red',
};

const OfferListPage: React.FC = () => {
  const api = authClient.api;
  const [items, setItems] = useState<OfferSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OfferStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'name'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  // Fetch items with filters
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(itemsPerPage));
      params.set('sort', sortBy);
      params.set('order', sortOrder);

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (searchTerm.length >= 2) {
        params.set('q', searchTerm);
      }

      const response = await api.get<OfferListResponse>(`/api/v1/dropshipping/offers?${params.toString()}`);

      if (response.data) {
        setItems(response.data.data);
        setTotalItems(response.data.meta.total);
        setTotalPages(response.data.meta.totalPages);
      }
    } catch (err: any) {
      console.error('Failed to fetch items:', err);
      setError(err.message || '목록을 불러오는데 실패했습니다.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [api, currentPage, statusFilter, sortBy, sortOrder, searchTerm]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sortBy, sortOrder, searchTerm]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
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
        title="Offers"
        description="드롭쉬핑 오퍼"
        icon={<ShoppingBag className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <AGButton
              variant="ghost"
              size="sm"
              onClick={fetchItems}
              iconLeft={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            >
              새로고침
            </AGButton>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
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
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <AGInput
                type="text"
                placeholder="검색 (2자 이상)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <AGSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as OfferStatus | 'all')}
                className="w-32"
              >
                <option value="all">전체 상태</option>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </AGSelect>
              <AGSelect
                value={`${sortBy}_${sortOrder}`}
                onChange={(e) => {
                  const [sort, order] = e.target.value.split('_') as ['createdAt' | 'updatedAt' | 'name', 'asc' | 'desc'];
                  setSortBy(sort);
                  setSortOrder(order);
                }}
                className="w-36"
              >
                <option value="createdAt_desc">최신순</option>
                <option value="createdAt_asc">오래된순</option>
                <option value="name_asc">이름순</option>
                <option value="name_desc">이름역순</option>
              </AGSelect>
            </div>
          </div>
        </AGSection>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            총 <span className="font-medium">{totalItems}</span>개
          </p>
        </div>

        {/* Item List */}
        <AGSection>
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>데이터가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <Link key={item.id} to={`/dropshipping-offers/${item.id}`}>
                  <AGCard hoverable padding="md">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <AGTag color={statusColors[item.status as OfferStatus]} size="sm">
                            {statusLabels[item.status as OfferStatus]}
                          </AGTag>
                        </div>
                        <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </AGCard>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
              <AGTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </AGSection>
      </div>
    </div>
  );
};

export default OfferListPage;

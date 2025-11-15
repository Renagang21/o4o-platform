/**
 * Partner Links Section
 * Can be used in dashboard (summary) or full-page mode
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash2, Copy, ExternalLink, Link2, AlertCircle, RefreshCw } from 'lucide-react';
import { EmptyState } from '../../common/EmptyState';
import { PageHeader } from '../../common/PageHeader';
import { partnerLinkAPI } from '../../../services/partnerLinkApi';
import { handleApiError } from '../../../utils/apiErrorHandler';
import {
  PartnerLinkListItem,
  GetPartnerLinksQuery,
  PartnerLinkStatus,
} from '../../../types/partner-link';
import type { SectionMode } from '../supplier/SupplierProductsSection';

export interface PartnerLinksSectionProps {
  mode?: SectionMode;
}

export const PartnerLinksSection: React.FC<PartnerLinksSectionProps> = ({
  mode = 'dashboard'
}) => {
  const navigate = useNavigate();
  const [links, setLinks] = useState<PartnerLinkListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<PartnerLinkStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'name' | 'clicks'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const pageSize = mode === 'dashboard' ? 5 : 20;

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch links
  useEffect(() => {
    const fetchLinks = async () => {
      setLoading(true);
      setError(null);
      try {
        const query: GetPartnerLinksQuery = {
          page: currentPage,
          limit: pageSize,
          search: searchQuery || undefined,
          status: statusFilter,
          sort_by: sortBy,
          sort_order: sortOrder,
        };

        const response = await partnerLinkAPI.fetchLinks(query);
        setLinks(response.data.links);
        setTotalPages(response.data.pagination.total_pages);
        setTotal(response.data.pagination.total);
      } catch (err) {
        const errorMessage = handleApiError(err, '파트너 링크 목록');
        setError(errorMessage);
        setLinks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, [currentPage, pageSize, searchQuery, statusFilter, sortBy, sortOrder]);

  const handleDelete = async (id: string) => {
    if (!confirm('이 링크를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await partnerLinkAPI.deleteLink(id);
      alert('링크가 삭제되었습니다.');
      // Refresh list
      setError(null);
      const query: GetPartnerLinksQuery = {
        page: currentPage,
        limit: pageSize,
        search: searchQuery || undefined,
        status: statusFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      const response = await partnerLinkAPI.fetchLinks(query);
      setLinks(response.data.links);
      setTotalPages(response.data.pagination.total_pages);
      setTotal(response.data.pagination.total);
    } catch (err) {
      const errorMessage = handleApiError(err, '링크 삭제');
      alert(errorMessage);
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      alert('링크가 클립보드에 복사되었습니다.');
    } catch (error) {
      console.error('복사 실패:', error);
      alert('링크 복사에 실패했습니다.');
    }
  };

  const getStatusBadge = (status: PartnerLinkStatus) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      active: '활성',
      inactive: '비활성',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (mode === 'dashboard') {
    // Summary mode for dashboard overview
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">링크 관리</h2>
          <button
            onClick={() => navigate('/dashboard/partner/links')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            전체 보기 →
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : error ? (
          <EmptyState
            icon={<AlertCircle className="w-12 h-12 text-red-400" />}
            title="데이터를 불러올 수 없습니다"
            description={error}
            action={
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                다시 시도
              </button>
            }
          />
        ) : links.length === 0 ? (
          <EmptyState
            icon={<Link2 className="w-12 h-12 text-gray-400" />}
            title="생성된 링크가 없습니다"
            description="추천 링크를 생성하여 수익을 창출하세요."
            action={
              <button
                onClick={() => navigate('/dashboard/partner/links/new')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                링크 생성
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{link.name}</div>
                  <div className="text-xs text-gray-500 truncate">{link.final_url}</div>
                </div>
                <div className="ml-4 text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {link.clicks.toLocaleString()} 클릭
                  </div>
                  <div className="text-xs text-green-600">
                    {link.conversions.toLocaleString()} 전환
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full-page mode
  return (
    <div>
      <PageHeader
        title="링크 관리"
        subtitle="추천 링크를 생성하고 성과를 추적하세요."
        actions={
          <button
            onClick={() => navigate('/dashboard/partner/links/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            링크 생성
          </button>
        }
      />

      <div className="bg-white rounded-lg shadow-sm">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="링크명, URL로 검색..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as PartnerLinkStatus | 'all');
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">전체 상태</option>
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [by, order] = e.target.value.split('-') as [
                    'created_at' | 'name' | 'clicks',
                    'asc' | 'desc'
                  ];
                  setSortBy(by);
                  setSortOrder(order);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="created_at-desc">최신순</option>
                <option value="created_at-asc">오래된순</option>
                <option value="name-asc">이름순 (가나다)</option>
                <option value="name-desc">이름순 (역순)</option>
                <option value="clicks-desc">클릭수 많은순</option>
                <option value="clicks-asc">클릭수 적은순</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : error ? (
          <div className="p-12">
            <EmptyState
              icon={<AlertCircle className="w-16 h-16 text-red-400" />}
              title="데이터를 불러올 수 없습니다"
              description={error}
              action={
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  다시 시도
                </button>
              }
            />
          </div>
        ) : links.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<Link2 className="w-16 h-16 text-gray-400" />}
              title="생성된 링크가 없습니다"
              description="추천 링크를 생성하여 수익을 창출하세요."
              action={
                <button
                  onClick={() => navigate('/dashboard/partner/links/new')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  첫 링크 생성하기
                </button>
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      링크명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      최종 URL
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      클릭수
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      전환수
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {links.map((link) => (
                    <tr key={link.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {link.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(link.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-gray-900 truncate max-w-md">
                            {link.final_url}
                          </div>
                          <button
                            onClick={() => handleCopyUrl(link.final_url)}
                            className="text-gray-400 hover:text-gray-600"
                            title="복사"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <a
                            href={link.final_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-gray-600"
                            title="새 탭에서 열기"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {link.clicks.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {link.conversions.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(link.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/dashboard/partner/links/${link.id}/edit`)}
                            className="text-blue-600 hover:text-blue-900"
                            title="수정"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(link.id)}
                            className="text-red-600 hover:text-red-900"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  페이지 {currentPage} / {totalPages} (전체 {total}개)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    이전
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    다음
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PartnerLinksSection;

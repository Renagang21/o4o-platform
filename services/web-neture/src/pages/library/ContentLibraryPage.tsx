/**
 * ContentLibraryPage — Neture 콘텐츠 라이브러리
 *
 * WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1
 *
 * Route: /library/content
 * API: GET /api/v1/hub/contents?serviceKey=neture&sourceDomain=cms
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { hubContentApi } from '../../lib/api/hubContent';
import type { HubContentItemResponse } from '@o4o/types/hub-content';

const TYPE_FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'notice', label: '공지' },
  { key: 'guide', label: '가이드' },
  { key: 'knowledge', label: '지식' },
  { key: 'promo', label: '프로모션' },
  { key: 'news', label: '뉴스' },
] as const;

const PAGE_SIZE = 12;

export default function ContentLibraryPage() {
  const [items, setItems] = useState<HubContentItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchContents = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await hubContentApi.list({
        sourceDomain: 'cms',
        page: p,
        limit: PAGE_SIZE,
      });
      const list = Array.isArray(res?.data) ? res.data : [];
      setItems(list);
      setTotalPages(res?.pagination?.totalPages ?? 1);
      setTotal(res?.pagination?.total ?? list.length);
    } catch {
      setItems([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContents(page);
  }, [page, fetchContents]);

  const handleTypeChange = (type: string) => {
    setActiveType(type);
    setPage(1);
  };

  const handleItemClick = (item: HubContentItemResponse) => {
    if (item.linkUrl) {
      window.open(item.linkUrl, '_blank', 'noopener');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  // Client-side type filter
  const filteredItems = activeType === 'all'
    ? items
    : items.filter(item => item.cmsType === activeType);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/community"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          커뮤니티
        </Link>
        <h1 className="text-xl font-bold text-gray-900">콘텐츠 라이브러리</h1>
        <p className="text-sm text-gray-500 mt-1">
          Neture 콘텐츠를 한눈에 확인하세요
        </p>
      </div>

      {/* Type Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => handleTypeChange(f.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              activeType === f.key
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Result count */}
      {!loading && total > 0 && (
        <p className="text-xs text-gray-400 mb-4">{total}개의 콘텐츠</p>
      )}

      {/* Content List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">등록된 콘텐츠가 없습니다.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredItems.map((item) => {
            const hasLink = !!item.linkUrl;
            const img = item.thumbnailUrl || item.imageUrl || null;
            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`bg-white rounded-lg border border-gray-200 overflow-hidden transition-all ${
                  hasLink
                    ? 'cursor-pointer hover:shadow-md hover:border-primary-200'
                    : 'opacity-80'
                }`}
              >
                {img ? (
                  <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
                    <img
                      src={img}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/9] bg-gray-50 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-200" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {item.cmsType && (
                          <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded">
                            {item.cmsType}
                          </span>
                        )}
                        {item.isPinned && (
                          <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-primary-50 text-primary-600 rounded">
                            추천
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-800 line-clamp-2">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                    {hasLink && (
                      <ExternalLink className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            이전
          </button>
          <span className="text-xs text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

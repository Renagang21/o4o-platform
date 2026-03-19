/**
 * HubContentListPage — GlycoPharm CMS 콘텐츠 전체 목록
 *
 * WO-GLYCOPHARM-HUB-CONTENT-PAGE-V1
 *
 * Route: /hub/content
 * API: GET /api/v1/hub/contents?serviceKey=glycopharm&sourceDomain=cms
 *
 * CommunityMainPage "매장에서 바로 쓰는 콘텐츠" 더보기에서 진입.
 * linkUrl이 있는 항목은 외부 링크 오픈, 없으면 비활성.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { apiClient } from '@/services/api';

// ─── Types ──────────────────────────────────────────────────

interface HubContentItem {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  cmsType?: string | null;
  createdAt: string;
  publishedAt?: string | null;
}

interface HubContentResponse {
  success: boolean;
  data: HubContentItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Constants ──────────────────────────────────────────────

const TYPE_FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'notice', label: '공지' },
  { key: 'guide', label: '가이드' },
  { key: 'knowledge', label: '지식' },
  { key: 'promo', label: '프로모션' },
  { key: 'news', label: '뉴스' },
] as const;

const PAGE_SIZE = 12;

// ─── Component ──────────────────────────────────────────────

export function HubContentListPage() {
  const [items, setItems] = useState<HubContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchContents = useCallback(async (p: number, type: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        serviceKey: 'glycopharm',
        sourceDomain: 'cms',
        page: String(p),
        limit: String(PAGE_SIZE),
      });
      if (type !== 'all') params.set('type', type);

      const res = await apiClient.get<HubContentResponse>(
        `/api/v1/hub/contents?${params.toString()}`
      );

      const data = res.data;
      const list = Array.isArray(data?.data) ? data.data : [];
      setItems(list);
      setTotalPages(data?.pagination?.totalPages ?? 1);
      setTotal(data?.pagination?.total ?? list.length);
    } catch {
      setItems([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContents(page, activeType);
  }, [page, activeType, fetchContents]);

  const handleTypeChange = (type: string) => {
    setActiveType(type);
    setPage(1);
  };

  const handleItemClick = (item: HubContentItem) => {
    if (item.linkUrl) {
      window.open(item.linkUrl, '_blank', 'noopener');
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const imgSrc = (item: HubContentItem) => item.thumbnailUrl || item.imageUrl || null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/community"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          커뮤니티
        </Link>
        <h1 className="text-xl font-bold text-slate-900">매장에서 바로 쓰는 콘텐츠</h1>
        <p className="text-sm text-slate-500 mt-1">
          GlycoPharm 약국을 위한 콘텐츠 라이브러리
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
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Result count */}
      {!loading && (
        <p className="text-xs text-slate-400 mb-4">
          {total > 0 ? `${total}개의 콘텐츠` : ''}
        </p>
      )}

      {/* Content List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">등록된 콘텐츠가 없습니다.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const hasLink = !!item.linkUrl;
            const img = imgSrc(item);
            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`bg-white rounded-lg border border-slate-200 overflow-hidden transition-all ${
                  hasLink
                    ? 'cursor-pointer hover:shadow-md hover:border-primary-200'
                    : 'opacity-80'
                }`}
              >
                {/* Thumbnail */}
                {img ? (
                  <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
                    <img
                      src={img}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/9] bg-slate-50 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-slate-200" />
                  </div>
                )}

                {/* Body */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {/* Type badge */}
                      {item.cmsType && (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 rounded mb-1.5">
                          {item.cmsType}
                        </span>
                      )}
                      <h3 className="text-sm font-semibold text-slate-800 line-clamp-2">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                    {hasLink && (
                      <ExternalLink className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    {formatDate(item.publishedAt || item.createdAt)}
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
            className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            이전
          </button>
          <span className="text-xs text-slate-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

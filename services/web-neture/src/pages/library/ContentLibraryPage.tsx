/**
 * ContentLibraryPage — Neture 콘텐츠 라이브러리
 *
 * WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1
 *
 * Route: /library/content
 * API: GET /api/v1/hub/contents?serviceKey=neture&sourceDomain=cms
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, ExternalLink, Image as ImageIcon, Download, Check, Loader2 } from 'lucide-react';
import { hubContentApi } from '../../lib/api/hubContent';
import { dashboardCopyApi } from '../../lib/api/dashboardCopy';
import { useAuth } from '../../contexts/AuthContext';
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<HubContentItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [copyingId, setCopyingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    dashboardCopyApi.getCopiedSourceIds(user.id)
      .then(ids => setCopiedIds(new Set(ids)))
      .catch(() => {});
  }, [user?.id]);

  const handleCopy = async (e: React.MouseEvent, item: HubContentItemResponse) => {
    e.stopPropagation();
    if (!user?.id || copyingId) return;
    setCopyingId(item.id);
    try {
      await dashboardCopyApi.copyAsset({
        sourceType: 'hub_content',
        sourceId: item.id,
        targetDashboardId: user.id,
      });
      setCopiedIds(prev => new Set(prev).add(item.id));
      if (confirm('내 콘텐츠에 복사되었습니다.\n내 콘텐츠로 이동하시겠습니까?')) {
        navigate('/my-content');
      }
    } catch (err: any) {
      alert(err.message || '복사 중 오류가 발생했습니다.');
    } finally {
      setCopyingId(null);
    }
  };

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
          to="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
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
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-gray-400">
                      {formatDate(item.createdAt)}
                    </p>
                    {user && (
                      <button
                        onClick={(e) => handleCopy(e, item)}
                        disabled={copiedIds.has(item.id) || copyingId === item.id}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                          copiedIds.has(item.id)
                            ? 'bg-gray-100 text-gray-400 cursor-default'
                            : copyingId === item.id
                              ? 'bg-gray-100 text-gray-400 cursor-wait'
                              : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                        }`}
                      >
                        {copiedIds.has(item.id) ? (
                          <><Check className="w-3 h-3" /> 가져옴</>
                        ) : copyingId === item.id ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> 복사 중</>
                        ) : (
                          <><Download className="w-3 h-3" /> 내 콘텐츠로</>
                        )}
                      </button>
                    )}
                  </div>
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

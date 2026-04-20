/**
 * Store Content List Page
 *
 * WO-O4O-STORE-CONTENT-UI
 *
 * 매장 콘텐츠 목록 관리
 * - StoreContent 목록 조회 (상태별 필터, 검색)
 * - 템플릿 복사 → StoreContent 생성
 * - 상세 편집 / 삭제
 */

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, ArrowLeft, Plus, Search, RefreshCw, AlertCircle,
  Trash2, Eye, Edit2, Share2, QrCode,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  storeContentApi,
  StoreContent,
  StoreContentStatus,
} from '@/api/store-content.api';

const STATUS_STYLES: Record<StoreContentStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Draft' },
  active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
  archived: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Archived' },
};

const DEFAULT_STORE_ID = 'default';

export default function StoreContentListPage() {
  const navigate = useNavigate();

  // Filters
  const [statusFilter, setStatusFilter] = useState<StoreContentStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Data
  const [items, setItems] = useState<StoreContent[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<StoreContent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await storeContentApi.list({
        storeId: DEFAULT_STORE_ID,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
        page,
        limit,
      });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err: any) {
      setError(err.message || '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await storeContentApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || '삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-6 max-w-6xl">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-gray-400" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">매장 콘텐츠</h1>
              <p className="text-gray-500 text-sm">Store Content 관리 — 매장별 맞춤 콘텐츠</p>
            </div>
          </div>
          <Link
            to="/store-content/templates"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            템플릿에서 복사
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="제목 검색..."
            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as StoreContentStatus | 'all'); setPage(1); }}
          className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white"
          disabled={loading}
        >
          <option value="all">전체 상태</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>

        {/* Refresh */}
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          title="새로고침"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <span className="text-sm text-gray-400 ml-auto">
          {loading ? '로딩중...' : `${items.length} / ${total} items`}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={fetchData}
              className="ml-auto text-sm text-red-600 hover:text-red-700 underline"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* Content Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">매장 콘텐츠가 없습니다</p>
          <p className="text-sm mt-1">
            {search ? '검색 결과가 없습니다' : '템플릿 라이브러리에서 콘텐츠를 복사해보세요'}
          </p>
          <Link
            to="/store-content/templates"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            템플릿 선택
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const style = STATUS_STYLES[item.status];
            return (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* Title & Status */}
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1 mr-2">
                    {item.title}
                  </h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${style.bg} ${style.text}`}>
                    {style.label}
                  </span>
                </div>

                {/* Description */}
                {item.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{item.description}</p>
                )}

                {/* Meta */}
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                  <span>{formatDate(item.updatedAt)}</span>
                  {item.slug && <span className="truncate max-w-[120px]">/{item.slug}</span>}
                  {item.isPublic && (
                    <span className="inline-flex items-center gap-1 text-green-600">
                      <Eye className="w-3 h-3" /> 공개
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => navigate(`/store-content/${item.id}`)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="편집"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    편집
                  </button>
                  {item.slug && (
                    <>
                      <button
                        onClick={() => navigate(`/store-content/${item.id}?tab=sns`)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded"
                        title="SNS 공유"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      {/* POP 출력 버튼 비활성 — WO-STORE-POP-CREATION-RESTRUCTURE-V1: /store/pop 경로로 이전 */}
                      <button
                        onClick={() => navigate(`/store-content/${item.id}?tab=qr`)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded"
                        title="QR 코드"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setDeleteTarget(item)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 rounded ml-auto"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            이전
          </button>
          <span className="text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">콘텐츠 삭제</h3>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{deleteTarget.title}</strong>을(를) 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                disabled={deleting}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

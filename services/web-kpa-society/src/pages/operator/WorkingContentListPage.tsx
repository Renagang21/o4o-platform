/**
 * WorkingContentListPage — 내 콘텐츠 목록
 *
 * WO-O4O-STORE-CONTENT-USAGE-RECOMPOSE-V1 Phase 2
 *
 * 사용자가 "내 공간에 복사"한 콘텐츠 목록을 표시.
 * 편집/삭제/발행 진입점.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Trash2, Loader2, AlertCircle, Edit3 } from 'lucide-react';
import {
  fetchWorkingContents,
  deleteWorkingContent,
  type WorkingContentItem,
} from '../../api/workingContent';
import { toast } from '@o4o/error-handling';

export default function WorkingContentListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<WorkingContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchWorkingContents({ page, search: search || undefined, limit: 20 });
      setItems(res.items);
      setTotal(res.total);
    } catch (e: any) {
      setError(e?.message || '목록을 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`"${title}" 콘텐츠를 삭제하시겠습니까?`)) return;
    try {
      await deleteWorkingContent(id);
      toast.success('콘텐츠가 삭제되었습니다');
      loadData();
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">내 콘텐츠</h1>
        <p className="text-sm text-slate-500 mt-1">
          콘텐츠 허브에서 복사한 콘텐츠를 편집하고 매장에 발행할 수 있습니다.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="제목으로 검색..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          검색
        </button>
      </form>

      {/* Content */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm">{error}</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <FileText className="w-10 h-10 text-slate-300" />
          <p className="text-sm text-slate-400">
            {search ? '검색 결과가 없습니다' : '아직 복사한 콘텐츠가 없습니다'}
          </p>
          {!search && (
            <button
              onClick={() => navigate('/operator/docs')}
              className="text-sm text-blue-500 hover:underline"
            >
              콘텐츠 허브에서 복사하기
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-4 hover:border-slate-200 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-800 truncate">{item.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {item.category && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                        {item.category}
                      </span>
                    )}
                    {(item.tags || []).slice(0, 3).map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600">
                        {t}
                      </span>
                    ))}
                    <span className="text-xs text-slate-400">
                      {new Date(item.updated_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/operator/working-content/${item.id}`)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                    title="편집"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.title)}
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 disabled:opacity-40"
              >
                이전
              </button>
              <span className="px-3 py-1.5 text-sm text-slate-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 disabled:opacity-40"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

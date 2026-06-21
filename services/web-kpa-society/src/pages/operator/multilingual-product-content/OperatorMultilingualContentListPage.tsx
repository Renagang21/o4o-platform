/**
 * OperatorMultilingualContentListPage — 운영자 매장 HUB 다국어 상품 콘텐츠 목록
 *
 * WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-WEB-PILOT-V1
 *
 * 운영자가 KPA 매장 HUB 에 게시할 다국어 상품 콘텐츠 ORIGINAL 목록.
 *   /operator/multilingual-product-contents
 * 작성/수정은 /operator/multilingual-product-contents/new · /:id
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Languages, Send, Archive, Pencil } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import {
  listOperatorMlcGroups,
  publishOperatorMlcGroup,
  archiveOperatorMlcGroup,
  OPERATOR_MLC_LOCALE_LABELS,
  type OperatorMlcGroup,
  type OperatorMlcStatus,
} from '../../../api/operatorMultilingualContent';

const PAGE_LIMIT = 20;

const STATUS_PILL: Record<OperatorMlcStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  archived: 'bg-amber-50 text-amber-700 border-amber-200',
};
const STATUS_LABEL: Record<OperatorMlcStatus, string> = {
  draft: '초안',
  published: '발행됨',
  archived: '보관됨',
};

export default function OperatorMultilingualContentListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<OperatorMlcGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<OperatorMlcStatus | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listOperatorMlcGroups({
        page,
        limit: PAGE_LIMIT,
        status: statusFilter || undefined,
      });
      setItems(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch (e: any) {
      setError(e?.message || '다국어 상품 콘텐츠를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePublish = async (id: string) => {
    setBusyId(id);
    try {
      await publishOperatorMlcGroup(id);
      toast.success('발행되었습니다 — KPA 매장 HUB 에 노출됩니다');
      await loadData();
    } catch (e: any) {
      toast.error(e?.message || '발행에 실패했습니다');
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (id: string) => {
    if (!window.confirm('보관 처리하면 매장 HUB 에서 더 이상 노출되지 않습니다. 계속할까요?')) return;
    setBusyId(id);
    try {
      await archiveOperatorMlcGroup(id);
      toast.success('보관되었습니다');
      await loadData();
    } catch (e: any) {
      toast.error(e?.message || '보관에 실패했습니다');
    } finally {
      setBusyId(null);
    }
  };

  const publishedLocales = (g: OperatorMlcGroup): string[] =>
    (g.pages || []).filter((p) => p.status === 'published').map((p) => p.locale);

  return (
    <div className="max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3 pb-5 border-b-2 border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">매장 HUB 다국어 상품 콘텐츠</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            외국인 고객 대상 다국어 상품 안내 콘텐츠를 작성·게시하면 매장이 가져가(복사) 자기 상품에 연결합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/operator/multilingual-product-contents/new')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 shrink-0"
        >
          <Plus className="w-4 h-4" />
          새 콘텐츠 작성
        </button>
      </header>

      {/* Status filter */}
      <div className="flex items-center gap-2">
        {(['', 'draft', 'published', 'archived'] as const).map((s) => (
          <button
            key={s || 'all'}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs rounded-full border ${
              statusFilter === s
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s === '' ? '전체' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-center py-12 text-red-600 text-sm">
          <p>{error}</p>
          <button onClick={loadData} className="mt-3 px-4 py-1.5 text-xs text-blue-600 border border-blue-400 rounded-lg hover:bg-blue-50">
            다시 시도
          </button>
        </div>
      )}

      {!error && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 animate-spin text-slate-300" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">아직 작성한 다국어 상품 콘텐츠가 없습니다</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                  <th className="px-5 py-3 font-medium">제목</th>
                  <th className="px-5 py-3 font-medium">상태</th>
                  <th className="px-5 py-3 font-medium">발행 언어</th>
                  <th className="px-5 py-3 font-medium">수정일</th>
                  <th className="px-5 py-3 font-medium text-right">작업</th>
                </tr>
              </thead>
              <tbody>
                {items.map((g) => {
                  const locales = publishedLocales(g);
                  return (
                    <tr key={g.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <button
                          onClick={() => navigate(`/operator/multilingual-product-contents/${g.id}`)}
                          className="flex items-center gap-2 min-w-0 text-left"
                        >
                          <span className="w-7 h-7 rounded flex items-center justify-center bg-slate-100 shrink-0 text-slate-400">
                            <Languages className="w-3.5 h-3.5" />
                          </span>
                          <span className="font-medium text-slate-800 truncate hover:text-blue-600">{g.title}</span>
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full border ${STATUS_PILL[g.status]}`}>
                          {STATUS_LABEL[g.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {locales.length === 0 ? (
                          <span className="text-xs text-slate-400">발행 페이지 없음</span>
                        ) : (
                          <span className="text-xs text-slate-600">
                            {locales.map((l) => OPERATOR_MLC_LOCALE_LABELS[l as keyof typeof OPERATOR_MLC_LOCALE_LABELS] || l).join(' · ')}
                            <span className="text-slate-400"> ({locales.length})</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {new Date(g.updatedAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/operator/multilingual-product-contents/${g.id}`)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
                            title="수정"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {g.status !== 'published' && (
                            <button
                              onClick={() => handlePublish(g.id)}
                              disabled={busyId === g.id}
                              className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                              title="발행"
                            >
                              {busyId === g.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {g.status !== 'archived' && (
                            <button
                              onClick={() => handleArchive(g.id)}
                              disabled={busyId === g.id}
                              className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 disabled:opacity-40"
                              title="보관"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50"
          >
            이전
          </button>
          <span className="text-sm text-slate-500">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

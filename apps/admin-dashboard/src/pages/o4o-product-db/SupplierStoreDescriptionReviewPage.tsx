/**
 * SupplierStoreDescriptionReviewPage — 공급자 매장용(STORE) 설명서 최소 검수 큐 (operator)
 *
 * WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-AND-REVIEW-QUEUE-V1
 *
 * 배경: 통합 설명서 검토 큐(OTC+SPD)는 WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-REVIEW-REMOVE-V1 로 제거됨.
 *   본 화면은 그 큐를 되살리는 것이 아니라, 공급자 STORE 설명서(source_type='supplier') 전용 최소 검수 큐다.
 *
 * 범위: 목록 + 상세(미리보기) + canonical 승격(승인) + 반려(보류).
 *   공급자 검수요청(status=needs_review) 이 기본 필터. 승인 시 매장에 노출(canonical).
 */

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Eye, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { ContentRenderer } from '@o4o/content-editor';
import {
  listSupplierStoreReview,
  getSupplierStoreReviewDetail,
  approveSupplierStoreReview,
  rejectSupplierStoreReview,
  type SupplierStoreReviewRow,
  type SupplierStoreReviewDetail,
} from '@/api/supplier-store-description-review.api';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'needs_review', label: '검수 대기' },
  { value: 'draft', label: '임시저장' },
  { value: 'canonical', label: '검수 완료' },
  { value: 'all', label: '전체' },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: '임시저장', cls: 'bg-slate-100 text-slate-600' },
  needs_review: { label: '검수 대기', cls: 'bg-amber-50 text-amber-700' },
  canonical: { label: '검수 완료', cls: 'bg-emerald-50 text-emerald-700' },
  hidden: { label: '반려/보류', cls: 'bg-red-50 text-red-700' },
};

const LIMIT = 20;

function fmtDate(v: string | null | undefined): string {
  if (!v) return '-';
  return new Date(v).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function SupplierStoreDescriptionReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<SupplierStoreReviewRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [status, setStatus] = useState(searchParams.get('status') || 'needs_review');
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<SupplierStoreReviewDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listSupplierStoreReview({ status, q, page, limit: LIMIT })
      .then((res) => {
        setRows(res.items);
        setTotal(res.total);
      })
      .catch(() => setError('검수 큐를 불러오지 못했습니다'))
      .finally(() => setLoading(false));
  }, [status, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const next: Record<string, string> = {};
    if (status !== 'needs_review') next.status = status;
    if (q) next.q = q;
    if (page > 1) next.page = String(page);
    setSearchParams(next, { replace: true });
  }, [status, q, page, setSearchParams]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const d = await getSupplierStoreReviewDetail(id);
      setDetail(d);
    } catch {
      toast.error('상세를 불러오지 못했습니다');
    } finally {
      setDetailLoading(false);
    }
  };

  const doApprove = async (id: string) => {
    if (!window.confirm('이 설명서를 검수 완료(매장 노출)로 승격할까요?')) return;
    setActing(true);
    try {
      await approveSupplierStoreReview(id);
      toast.success('검수 완료로 승격되었습니다');
      setDetail(null);
      load();
    } catch {
      toast.error('승격에 실패했습니다');
    } finally {
      setActing(false);
    }
  };

  const doReject = async (id: string) => {
    if (!window.confirm('이 설명서를 반려/보류 처리할까요?')) return;
    setActing(true);
    try {
      await rejectSupplierStoreReview(id);
      toast.success('반려/보류 처리되었습니다');
      setDetail(null);
      load();
    } catch {
      toast.error('반려 처리에 실패했습니다');
    } finally {
      setActing(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div>
      <div className="mb-2">
        <h2 className="text-lg font-bold text-gray-900">공급자 매장용 설명서 검수</h2>
        <p className="text-sm text-gray-500">
          공급자가 작성한 매장용(STORE) 상품 설명서를 검수합니다. 승인하면 매장에 노출(canonical)됩니다.
        </p>
      </div>

      {/* 필터 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                setStatus(o.value);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                status === o.value ? 'bg-admin-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <form
          className="ml-auto flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(searchInput.trim());
            setPage(1);
          }}
        >
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="상품명 · 공급자 검색"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-admin-blue"
          />
          <button type="submit" className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200">
            검색
          </button>
        </form>
      </div>

      {/* 목록 */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold text-gray-500">
              <th className="px-4 py-2">상품명</th>
              <th className="px-4 py-2">공급자</th>
              <th className="px-4 py-2">작성자</th>
              <th className="px-4 py-2">제출일시</th>
              <th className="px-4 py-2">상태</th>
              <th className="px-4 py-2 text-right">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  불러오는 중…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-red-500">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  해당 조건의 설명서가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const badge = STATUS_BADGE[r.status] ?? { label: r.status, cls: 'bg-gray-100 text-gray-600' };
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-800">{r.masterName || '(이름 없음)'}</div>
                      <div className="font-mono text-xs text-gray-400">
                        {r.barcode}
                        {r.manufacturerName ? ` · ${r.manufacturerName}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">{r.supplierName || '-'}</td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {r.authorName || '-'}
                      {r.authorEmail ? <div className="text-xs text-gray-400">{r.authorEmail}</div> : null}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{fmtDate(r.submittedAt || r.updatedAt)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openDetail(r.id)}
                          title="미리보기"
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
                        >
                          <Eye size={16} />
                        </button>
                        {r.status !== 'canonical' && (
                          <button
                            onClick={() => doApprove(r.id)}
                            disabled={acting}
                            title="승인(매장 노출)"
                            className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {r.status !== 'hidden' && (
                          <button
                            onClick={() => doReject(r.id)}
                            disabled={acting}
                            title="반려/보류"
                            className="rounded p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {total > LIMIT && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded px-3 py-1 text-gray-600 disabled:opacity-40 hover:bg-gray-100"
          >
            이전
          </button>
          <span className="text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded px-3 py-1 text-gray-600 disabled:opacity-40 hover:bg-gray-100"
          >
            다음
          </button>
        </div>
      )}

      {/* 상세 모달 */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !acting && setDetail(null)}>
          <div
            className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading || !detail ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-admin-blue" />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-6 py-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold text-gray-900">{detail.masterName || '(이름 없음)'}</h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                      공급자 {detail.supplierName || '-'} · 작성자 {detail.authorName || '-'} · 제출 {fmtDate(detail.submittedAt || detail.updatedAt)}
                    </p>
                  </div>
                  <button onClick={() => setDetail(null)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
                    <XCircle size={18} />
                  </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
                  <ContentRenderer html={detail.content} variant="store-description" />
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
                  {detail.status !== 'hidden' && (
                    <button
                      onClick={() => doReject(detail.id)}
                      disabled={acting}
                      className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      반려/보류
                    </button>
                  )}
                  {detail.status !== 'canonical' && (
                    <button
                      onClick={() => doApprove(detail.id)}
                      disabled={acting}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {acting ? '처리 중…' : '승인 (매장 노출)'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Pagination — Server-side Pagination UI
 *
 * WO-O4O-LIST-BASE-MODULE-V1
 *
 * page/totalPages 기반 이전/다음 네비게이션.
 * Neture UsersManagementPage 패턴 기반.
 */

import type { PaginationProps } from './types';

export function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
      {total != null ? (
        <span className="text-sm text-slate-500">
          전체 <span className="font-medium text-slate-700">{total}</span>건
        </span>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          이전
        </button>
        <span className="text-sm text-slate-600">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          다음
        </button>
      </div>
    </div>
  );
}

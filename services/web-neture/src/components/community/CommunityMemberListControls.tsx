import { useEffect, useState } from 'react';
import type { CommunityMemberPagination } from '../../lib/api/communityMemberList';

export function CommunityMemberListControls({ q, status, pageSize, pagination, busy, loading, statuses, onFilter, onPage }: Readonly<{
  q: string; status: string; pageSize: number; pagination: CommunityMemberPagination | null;
  busy: boolean; loading: boolean; statuses: ReadonlyArray<{ value: string; label: string }>;
  onFilter: (filter: { q: string; status: string; pageSize: number }) => void;
  onPage: (page: number) => void;
}>) {
  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);
  return <div className="mt-4 space-y-3">
    <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); onFilter({ q: draft.trim(), status, pageSize }); }}>
      <label className="text-xs text-gray-600">이름 검색
        <input aria-label="이름 검색" className="mt-1 block min-h-11 w-44 max-w-full rounded border px-3" value={draft} maxLength={100} disabled={busy} onChange={e => setDraft(e.target.value)} placeholder="회원 이름" />
      </label>
      <button type="submit" className="min-h-11 rounded border px-3 disabled:opacity-50" disabled={busy}>검색</button>
      <button type="button" className="min-h-11 rounded border px-3 disabled:opacity-50" disabled={busy} onClick={() => { setDraft(''); onFilter({ q: '', status, pageSize }); }}>검색 초기화</button>
      <label className="text-xs text-gray-600">회원 상태
        <select aria-label="회원 상태" className="mt-1 block min-h-11 rounded border px-3" value={status} disabled={busy} onChange={e => onFilter({ q, status: e.target.value, pageSize })}>
          {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </label>
      <label className="text-xs text-gray-600">페이지 크기
        <select aria-label="페이지 크기" className="mt-1 block min-h-11 rounded border px-3" value={pageSize} disabled={busy} onChange={e => onFilter({ q, status, pageSize: Number(e.target.value) })}>
          {[20, 50, 100].map(size => <option key={size} value={size}>{size}명씩</option>)}
        </select>
      </label>
    </form>
    {pagination && <nav aria-label="회원 목록 페이지" className="flex flex-wrap items-center gap-3">
      <span>총 {pagination.total}명 · {pagination.page} / {pagination.totalPages} 페이지</span>
      <button type="button" className="min-h-11 rounded border px-3 disabled:opacity-50" disabled={busy || loading || pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>이전 페이지</button>
      <button type="button" className="min-h-11 rounded border px-3 disabled:opacity-50" disabled={busy || loading || pagination.page >= pagination.totalPages} onClick={() => onPage(pagination.page + 1)}>다음 페이지</button>
    </nav>}
  </div>;
}

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { api } from '../../lib/apiClient';

interface BoardRequest {
  id: string;
  name: string;
  requesterName: string | null;
}

// Isolate pending actions and late responses when the workspace changes.
export default function CommunityBoardReview({ communityKey }: { communityKey: string }) {
  return <BoardReviewPanel key={communityKey} communityKey={communityKey} />;
}

function BoardReviewPanel({ communityKey }: { communityKey: string }) {
  const [rows, setRows] = useState<BoardRequest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [processing, setProcessing] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const reasonId = useId();
  const mounted = useRef(false);
  const requestVersion = useRef(0);
  const submitting = useRef(false);
  const rejectButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; requestVersion.current += 1; };
  }, []);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get(`/communities/${encodeURIComponent(communityKey)}/board-requests?review=true`);
      const data: unknown = response.data.data;
      if (!Array.isArray(data)) throw new Error('Invalid board request list');
      if (mounted.current && version === requestVersion.current) setRows(data);
    } catch {
      if (mounted.current && version === requestVersion.current) {
        setLoadError('게시판 개설 신청 목록을 불러오지 못했습니다. 다시 시도해 주세요.');
      }
    } finally {
      if (mounted.current && version === requestVersion.current) setLoading(false);
    }
  }, [communityKey]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (rejectId === null) rejectButton.current?.focus();
  }, [rejectId]);

  const review = async (row: BoardRequest, action: 'approve' | 'reject') => {
    if (submitting.current || loading) return;
    submitting.current = true;
    setProcessing({ id: row.id, action });
    setActionError('');
    setNotice('');
    try {
      await api.patch(`/communities/${encodeURIComponent(communityKey)}/board-requests/${encodeURIComponent(row.id)}`, {
        action,
        ...(action === 'reject' && reason.trim() ? { reviewComment: reason.trim() } : {}),
      });
      if (!mounted.current) return;
      // Keep confirmed requests out of the pending list even if the next GET fails.
      setRows(current => current?.filter(item => item.id !== row.id) ?? null);
      setRejectId(null);
      setReason('');
      setNotice(`‘${row.name}’ 게시판 개설 신청을 ${action === 'approve' ? '승인' : '반려'}했습니다.`);
      void load();
    } catch {
      if (mounted.current) setActionError('개설 신청을 처리하지 못했습니다. 권한과 신청 상태를 확인한 뒤 다시 시도해 주세요.');
    } finally {
      submitting.current = false;
      if (mounted.current) setProcessing(null);
    }
  };

  const cancelReject = () => {
    setRejectId(null);
    setReason('');
    setActionError('');
  };
  const disabled = loading || processing !== null;

  return <section className="my-4 rounded-lg border border-slate-200 bg-white p-4 sm:p-6" aria-label="게시판 개설 신청 심사" aria-busy={disabled}>
    <h2 className="font-semibold text-slate-900">게시판 개설 신청 심사</h2>
    <p className="mt-1 text-sm text-slate-500">신청 내용을 확인하고 게시판 개설 여부를 결정해 주세요.</p>
    {notice && <p role="status" className="mt-3 text-sm text-green-700">{notice}</p>}
    {actionError && <p role="alert" className="mt-3 text-sm text-red-700">{actionError}</p>}
    {loadError && <div className="mt-3">
      <p role="alert" className="text-sm text-red-700">{loadError}</p>
      <button type="button" onClick={() => void load()} disabled={disabled} className="mt-2 rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">목록 다시 불러오기</button>
    </div>}
    {loading && <p role="status" className="mt-3 text-sm text-slate-500">{rows === null ? '개설 신청을 불러오는 중입니다…' : '신청 목록을 갱신하는 중입니다…'}</p>}
    {rows !== null && rows.length > 0 && <ul className="mt-4 divide-y divide-slate-200">
      {rows.map(row => <li key={row.id} className="py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1"><h3 className="break-words font-medium text-slate-900">{row.name}</h3><p className="mt-1 break-words text-sm text-slate-500">신청자: {row.requesterName || '이름 미등록'}</p></div>
          <div className="flex shrink-0 gap-2">
            <button type="button" disabled={disabled || rejectId !== null} onClick={() => void review(row, 'approve')} className="rounded bg-blue-700 px-3 py-2 text-sm text-white disabled:opacity-50">{processing?.id === row.id && processing.action === 'approve' ? '승인 중…' : '승인'}</button>
            <button type="button" disabled={disabled || rejectId !== null} onClick={event => { rejectButton.current = event.currentTarget; setRejectId(row.id); setReason(''); setActionError(''); setNotice(''); }} className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">반려</button>
          </div>
        </div>
        {rejectId === row.id && <form className="mt-3 rounded-lg bg-slate-50 p-3" onSubmit={event => { event.preventDefault(); void review(row, 'reject'); }}>
          <label htmlFor={reasonId} className="text-sm font-medium">반려 사유 (선택)</label>
          <textarea id={reasonId} autoFocus value={reason} onChange={event => setReason(event.target.value)} disabled={disabled} rows={3} className="mt-2 block w-full rounded border border-slate-300 p-2 text-sm" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="submit" disabled={disabled} className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50">{processing?.id === row.id ? '반려 중…' : '반려 확정'}</button>
            <button type="button" onClick={cancelReject} disabled={disabled} className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">취소</button>
          </div>
        </form>}
      </li>)}
    </ul>}
    {!loading && !loadError && rows?.length === 0 && <p className="mt-4 text-sm text-slate-500">대기 중인 신청이 없습니다.</p>}
  </section>;
}

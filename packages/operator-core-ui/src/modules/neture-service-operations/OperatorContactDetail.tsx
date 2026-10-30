import { useNetureServiceOperations } from './runtime';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useLatestRequest } from '../../common/operation-support';

interface Detail {
  id: string; subject: string; message: string; status: string; adminNotes: string | null; updatedAt: string;
}
function failure(error: any) { return typeof error?.response?.data?.error === 'string' ? error.response.data.error : error?.message || '요청을 완료하지 못했습니다.'; }

/** Drafts survive write failures. A committed write is never replayed to recover a read. */
export default function OperatorContactDetail({ id, onClose, onSaved, onBusy }: {
  id: string; onClose: () => void; onSaved: () => Promise<unknown>; onBusy: (busy: boolean) => void;
}) {
  const { http: api } = useNetureServiceOperations();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [status, setStatus] = useState('new');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reading, setReading] = useState(false);
  const [writing, setWriting] = useState(false);
  const lock = useRef(false);
  const beginRead = useLatestRequest(`contact-detail:${id}`);
  const beginWrite = useLatestRequest(`contact-write:${id}`);
  const read = useCallback(async () => {
    const current = beginRead(); setReading(true); setError('');
    try {
      const result = await api.get(`/neture/operator/contact-messages/${id}`);
      if (!current()) return;
      if (!result.data?.success || !result.data.data) throw new Error('문의 상세를 불러오지 못했습니다.');
      const data = result.data.data as Detail;
      setDetail(data); setStatus(data.status); setNotes(data.adminNotes ?? '');
    } catch (e) { if (current()) setError(failure(e)); }
    finally { if (current()) setReading(false); }
  }, [id, beginRead]);
  useEffect(() => { void read(); }, [read]);
  async function save() {
    if (lock.current || !detail || reading) return;
    lock.current = true; onBusy(true); setWriting(true); setError(''); setNotice('');
    const current = beginWrite();
    try {
      const result = await api.patch(`/neture/operator/contact-messages/${id}`, { status, adminNotes: notes, expectedUpdatedAt: detail.updatedAt });
      if (!current()) return;
      if (!result.data?.success || !result.data.data) throw new Error('문의 저장에 실패했습니다.');
      const saved = result.data.data as Detail;
      setDetail(saved); setStatus(saved.status); setNotes(saved.adminNotes ?? ''); setNotice('저장했습니다.');
      // Parent distinguishes read failure from the already committed update.
      await onSaved();
    } catch (e) { if (current()) setError(failure(e)); }
    finally { lock.current = false; if (current()) { onBusy(false); setWriting(false); } }
  }
  return <section aria-label="문의 상세 처리" className="rounded-xl border bg-white p-4 space-y-3">
    <div className="flex justify-between"><h2 className="font-bold">{detail?.subject || '문의 상세'}</h2><button type="button" disabled={writing} onClick={onClose}>닫기</button></div>
    {reading && <p role="status">상세 조회 중…</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {notice && <p role="status" className="text-emerald-700">{notice}</p>}
    {detail && <>
      <p className="whitespace-pre-wrap break-words">{detail.message}</p>
      <label className="block">처리 상태<select aria-label="상세 처리 상태" value={status} disabled={reading || writing} onChange={e => setStatus(e.target.value)} className="ml-3 border p-2">
        <option value="new">신규</option><option value="in_progress">처리중</option><option value="resolved">완료</option>
      </select></label>
      <label className="block">내부 메모<textarea aria-label="문의 내부 메모" value={notes} maxLength={10000} disabled={reading || writing} onChange={e => setNotes(e.target.value)} className="block w-full border rounded p-2" /></label>
      <button type="button" disabled={reading || writing} onClick={() => void save()} className="px-4 py-2 bg-emerald-700 text-white rounded">{writing ? '저장 중…' : '문의 저장'}</button>
    </>}
    <button type="button" disabled={reading || writing} onClick={() => { if (!detail || window.confirm('작성 중인 입력을 최신 저장 내용으로 바꿉니다. 다시 조회할까요?')) void read(); }} className="ml-3 underline">최신 상세 다시 조회</button>
  </section>;
}

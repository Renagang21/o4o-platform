import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/apiClient';
import type { SupplierLibraryItem } from '../../lib/api';

type RequestRow = { id: string; title: string; sourceItemId: string; businessName: string; status: string; reason: string | null };
const STATUS: Record<string, string> = { pending: '검토 대기', draft: '검토 중', published: '게시됨', rejected: '반려', archived: '게시 중단' };

/** Business requests never change the original's visibility or create a community post. */
export default function SupplierContentDestinations({ item, onClose }: { item: SupplierLibraryItem | null; onClose: () => void }) {
  const [targets, setTargets] = useState<Array<{ key: string; name: string }>>([]);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [reload, setReload] = useState(0);
  const panel = useRef<HTMLElement>(null);
  const submitting = useRef(false);
  const currentItem = useRef(item?.id);
  currentItem.current = item?.id;
  useEffect(() => { setTarget(''); setError(''); setNotice(''); if (item) panel.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }); }, [item?.id]);
  useEffect(() => {
    let live = true;
    setReady(false);
    Promise.all([api.get('/neture/supplier/content-targets'), api.get('/neture/supplier/content-requests')])
      .then(([t, r]) => {
        if (!live) return;
        if (!t.data?.success || !r.data?.success || !Array.isArray(t.data.data) || !Array.isArray(r.data.data)) throw new Error();
        setTargets(t.data.data); setRows(r.data.data); setReady(true); setError('');
      })
      .catch(() => { if (live) setError('협력사업과 등재 요청 현황을 불러오지 못했습니다.'); });
    return () => { live = false; };
  }, [reload]);
  const submit = async () => {
    if (!item || !target || !ready || submitting.current) return;
    const id = item.id;
    submitting.current = true; setBusy(true); setError('');
    try {
      const r = await api.post('/neture/supplier/content-requests', { itemId: id, businessKey: target });
      if (!r.data?.success) throw new Error();
      if (currentItem.current !== id) return;
      setNotice(r.data.data.reused ? '이미 접수되었거나 게시된 자료입니다. 중복 요청하지 않았습니다.' : '등재 요청을 접수했습니다. 운영자 승인 전에는 회원 약국에 공개되지 않습니다.');
      setReload(n => n + 1);
    } catch { if (currentItem.current === id) setError('등재 요청을 처리하지 못했습니다. 대상 사업 상태를 확인하고 다시 시도하세요.'); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <section ref={panel} aria-label="협력사업 콘텐츠 등재" className="my-5 space-y-3 rounded-lg border bg-white p-4 text-sm">
    <h2 className="font-semibold">서비스 등재 요청 현황</h2>
    <p>자료함의 원본과 커뮤니티 게시물은 별도입니다. 서비스에는 검토용 사본을 보내며, 원본 수정이 이미 보낸 사본에 자동 반영되지 않습니다.</p>
    {error && <p role="alert">{error} <button type="button" onClick={() => setReload(n => n + 1)} className="underline">다시 조회</button></p>}
    {notice && <p role="status">{notice}</p>}
    {!ready && !error && <p>등재 요청 불러오는 중...</p>}
    {item && <div role="dialog" aria-label="협력사업에 등재 요청" className="space-y-3 rounded border p-3">
      <p><strong>{item.title}</strong>의 등재를 요청합니다. 커뮤니티 게시나 원본 공개 설정은 변경하지 않습니다.</p>
      <label className="block">대상 협력사업
        <select className="ml-2 max-w-full rounded border p-2" value={target} disabled={busy || !ready} onChange={e => setTarget(e.target.value)}>
          <option value="">선택하세요</option>{targets.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
        </select>
      </label>
      {ready && !targets.length && <p>현재 등재 요청을 받을 수 있는 협력사업이 없습니다.</p>}
      <button type="button" disabled={busy || !ready || !target} onClick={submit} className="mr-3 rounded bg-blue-700 px-3 py-2 text-white disabled:opacity-50">{busy ? '요청 중...' : '등재 요청'}</button>
      <button type="button" disabled={busy} onClick={onClose}>닫기</button>
    </div>}
    {ready && !rows.length && <p>요청한 자료가 없습니다.</p>}
    {ready && rows.map(row => <div key={row.id} className="flex flex-wrap gap-x-4 rounded border p-3">
      <span>{row.title}</span><span>{row.businessName}</span><span>{STATUS[row.status] ?? row.status}</span>
      {row.reason && <span className="w-full text-amber-800">반려 사유: {row.reason}</span>}
    </div>)}
  </section>;
}

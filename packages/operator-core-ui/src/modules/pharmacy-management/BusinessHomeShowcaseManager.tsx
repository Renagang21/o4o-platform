import { useEffect, useRef, useState } from 'react';
import { getPharmacyManagementClient } from './api';

type Row = { id: string; kind: string; title: string; summary: string | null; hidden: boolean; position: number; targetOrganizationId: string | null };
type State = { businessKey: string; version: number; items: Row[] };
type History = { actorId: string; actorName?: string; action: string; createdAt: string; meta: { title?: string; itemId?: string; before?: unknown; after?: unknown; reason?: string | null } };
export function BusinessHomeShowcaseManager({ businessKey }: Readonly<{ businessKey: string }>) {
  return <Manager key={businessKey} businessKey={businessKey} />;
}
function Manager({ businessKey }: Readonly<{ businessKey: string }>) {
  const [open, setOpen] = useState(false);
  const api = open ? getPharmacyManagementClient() : null;
  const [state, setState] = useState<State | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const gate = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const base = `/neture/operator/semi-franchises/${encodeURIComponent(businessKey)}`;
  useEffect(() => {
    if (!open || !api) return;
    let current = true;
    setError(''); setState(null); setHistoryError('');
    api.get(`${base}/showcase`).then(r => {
      const data: State = r.data.data;
      if (data.businessKey !== businessKey || !Array.isArray(data.items)) throw new Error();
      if (current) setState(data);
    }).catch(() => { if (current) setError('진열 목록을 조회하지 못했습니다.'); });
    api.get(`${base}/showcase-history`).then(r => { if (current) setHistory(r.data.data); })
      .catch(() => { if (current) setHistoryError('처리 이력을 조회하지 못했습니다. 다시 조회해 주세요.'); });
    return () => { current = false; };
  }, [api, base, businessKey, open, retry]);
  async function save(row: Row, hidden: boolean, position: number) {
    if (gate.current || !state || !api) return;
    gate.current = true; setBusy(true); setError(''); setMessage('');
    try {
      await api.put(`${base}/showcase`, { id: row.id, hidden, position, version: state.version });
      if (!alive.current) return;
      setMessage('진열 변경을 저장했습니다.'); setRetry(n => n + 1);
    } catch (e) {
      if (!alive.current) return;
      const response = e as { response?: { data?: { error?: string } } };
      setError(response.response?.data?.error ?? '저장하지 못했습니다. 입력을 보존했습니다. 다시 시도해 주세요.');
    } finally { gate.current = false; if (alive.current) setBusy(false); }
  }
  return <section className="rounded-lg border p-4 space-y-3" aria-label="메인 진열 관리">
    <button type="button" aria-expanded={open} disabled={busy} onClick={() => setOpen(v => !v)}>메인 진열 관리 · 처리 이력</button>
    {open && <>
      <p>승인·게시된 항목은 기본으로 메인에 진열됩니다. 작은 순서부터 표시합니다. 진열 중단은 공급 종료나 콘텐츠 보관과 별개입니다.</p>
      {message && <output>{message}</output>}{error && <p role="alert">{error}</p>}
      <button type="button" disabled={busy} onClick={() => setRetry(n => n + 1)}>진열·이력 다시 조회</button>
      {!state ? !error && <output>진열 목록을 불러오고 있습니다…</output> :
        <fieldset disabled={busy}>{!state.items.length ? <p>승인·게시된 항목이 없습니다.</p> : state.items.map(row =>
          <EditRow key={`${row.id}:${state.version}`} row={row} save={save} />)}</fieldset>}
      <h3 className="font-semibold">최근 처리 이력</h3>
      {historyError ? <p role="alert">{historyError}</p> : <ul>{history.map((h, index) => <li key={`${h.createdAt}:${index}`} className="my-2 text-sm break-words">
        {h.createdAt} · {h.action === 'business.content.status' ? '콘텐츠 처리' : '진열 변경'} · {h.meta.title || '자료'} · 처리자 {h.actorName || '운영자'}
        <div>변경 전: {describeChange(h.meta.before)} → 변경 후: {describeChange(h.meta.after)}</div>{h.meta.reason && <p>사유: {h.meta.reason}</p>}
      </li>)}</ul>}
    </>}
  </section>;
}
function EditRow({ row, save }: Readonly<{ row: Row; save: (row: Row, hidden: boolean, position: number) => Promise<void> }>) {
  const [hidden, setHidden] = useState(row.hidden);
  const [position, setPosition] = useState(String(row.position));
  const number = Number(position);
  return <div className="my-3 rounded border p-3 space-y-2">
    <h3 className="font-semibold">{row.title}</h3><p>{row.kind === 'product' ? '제품' : '콘텐츠'}{row.targetOrganizationId ? ' · 지정 약국에만 표시' : ''}</p>
    {row.summary && <p>{row.summary}</p>}
    <label className="mr-4">진열 순서 <input aria-label={`${row.title} 진열 순서`} className="w-24 border" type="number" min="0" max="9999" value={position} onChange={e => setPosition(e.target.value)} /></label>
    <label><input type="checkbox" checked={hidden} onChange={e => setHidden(e.target.checked)} />메인에서 숨김</label>
    <button type="button" className="ml-4 rounded border px-3 py-2" disabled={!position.trim() || !Number.isInteger(number) || number<0 || number>9999} onClick={() => void save(row, hidden, number)}>{row.title} 진열 저장</button>
  </div>;
}

function describeChange(value: unknown): string {
  if (value && typeof value === 'object') {
    const setting = value as { hidden?: boolean; position?: number };
    return `${setting.hidden ? '숨김' : '진열 중'} · 순서 ${setting.position ?? 1000}`;
  }
  return ({ pending: '검토 대기', published: '게시', archived: '보관', rejected: '반려', draft: '초안' } as Record<string,string>)[String(value)] || '이전 기록';
}

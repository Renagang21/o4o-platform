import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/apiClient';

interface Inquiry {
  id: string; name: string; organizationName: string | null; subject: string | null;
  status: 'pending' | 'reviewing' | 'done'; createdAt: string;
}
interface Detail extends Inquiry { email: string; phone: string | null; message: string }
const base = '/admin/services/lecture/legacy-education-requests';
const labels = { pending: '접수 대기', reviewing: '검토 중', done: '완료' };

export default function LegacyEducationRequestsPanel() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await api.get(base, { params: { page } });
    setItems(response.data.data.items);
    setPages(Math.max(1, response.data.data.pagination.totalPages));
  }, [page]);
  useEffect(() => { void load().catch(() => setError('기존 문의를 불러오지 못했습니다.')); }, [load]);

  async function open(id: string) {
    setError('');
    try { setDetail((await api.get(`${base}/${id}`)).data.data); }
    catch { setError('문의 상세를 불러오지 못했습니다.'); }
  }
  async function update(status: Inquiry['status']) {
    if (!detail || busy) return;
    setBusy(true); setError('');
    try {
      await api.patch(`${base}/${detail.id}/status`, { status });
      setDetail({ ...detail, status }); await load();
    } catch { setError('문의 상태를 저장하지 못했습니다.'); }
    finally { setBusy(false); }
  }

  return <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5" aria-label="기존 강의 개설 문의">
    <h2 className="mb-2 text-lg font-semibold">기존 강의 개설 문의</h2>
    <p className="mb-4 text-sm text-slate-500">이전에 접수된 문의를 확인하고 처리합니다.</p>
    {error && <p role="alert" className="mb-3 text-red-700">{error}</p>}
    <ul className="divide-y divide-slate-100">{items.map(item => <li key={item.id} className="flex items-center justify-between gap-3 py-3">
      <button className="text-left text-blue-700" disabled={busy} onClick={() => void open(item.id)}>{item.subject || '강의 개설 문의'} · {item.name}</button>
      <span className="text-sm text-slate-500">{labels[item.status]}</span>
    </li>)}</ul>
    {items.length === 0 && <p className="text-sm text-slate-500">기존 문의가 없습니다.</p>}
    {pages > 1 && <nav aria-label="기존 문의 페이지" className="mt-3 flex gap-3">
      <button disabled={page === 1} onClick={() => setPage(page - 1)}>이전</button><span>{page} / {pages}</span>
      <button disabled={page === pages} onClick={() => setPage(page + 1)}>다음</button>
    </nav>}
    {detail && <div className="mt-4 border-t border-slate-200 pt-4">
      <h3 className="font-semibold">{detail.subject || '강의 개설 문의'}</h3>
      <p>{detail.name} · {detail.email}{detail.phone && ` · ${detail.phone}`}</p>
      <p className="my-3 whitespace-pre-wrap">{detail.message}</p>
      <label className="mr-2" htmlFor="previous-inquiry-status">처리 상태</label>
      <select id="previous-inquiry-status" value={detail.status} disabled={busy} onChange={event => void update(event.target.value as Inquiry['status'])}>
        {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <button className="ml-3" disabled={busy} onClick={() => setDetail(null)}>상세 닫기</button>
    </div>}
  </section>;
}

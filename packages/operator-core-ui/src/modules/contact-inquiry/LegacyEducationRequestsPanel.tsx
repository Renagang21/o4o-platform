import { useLegacyEducationRequests, type LegacyEducationHttpClient } from './useLegacyEducationRequests';

const labels = { pending: '접수 대기', reviewing: '검토 중', done: '완료' };
export function LegacyEducationRequestsPanel({ client }: { client: LegacyEducationHttpClient }) {
  const { items, detail, page, pages, error, busy, loading, detailLoading, refreshRequired, savedNotice, open, update, close, changePage, retry } = useLegacyEducationRequests(client);

  return <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5" aria-label="기존 강의 개설 문의">
    <h2 className="mb-2 text-lg font-semibold">기존 강의 개설 문의</h2>
    <p className="mb-4 text-sm text-slate-500">이전에 접수된 문의를 확인하고 처리합니다.</p>
    {savedNotice && <p role="status" className="mb-3">{savedNotice}</p>}
    {error && <p role="alert" className="mb-3 text-red-700">{error}</p>}
    {loading && <output>기존 문의를 불러오는 중…</output>}
    {!loading && <ul className="divide-y divide-slate-100">{items.map(item => <li key={item.id} className="flex items-center justify-between gap-3 py-3">
      <button className="text-left text-blue-700" disabled={busy} onClick={() => void open(item.id)}>{item.subject || '강의 개설 문의'} · {item.name}</button>
      <span className="text-sm text-slate-500">{labels[item.status]}</span>
    </li>)}</ul>}
    {!loading && !error && items.length === 0 && <p className="text-sm text-slate-500">기존 문의가 없습니다.</p>}
    {error && <button disabled={loading || busy} className="mb-3 rounded border px-3 py-2" onClick={() => void retry()}>다시 불러오기</button>}
    {detailLoading && <output>문의 상세를 불러오는 중…</output>}
    {pages > 1 && <nav aria-label="기존 문의 페이지" className="mt-3 flex gap-3">
      <button disabled={page === 1 || loading || busy} onClick={() => changePage(page - 1)}>이전</button><span>{page} / {pages}</span>
      <button disabled={page === pages || loading || busy} onClick={() => changePage(page + 1)}>다음</button>
    </nav>}
    {detail && <div className="mt-4 border-t border-slate-200 pt-4">
      <h3 className="font-semibold">{detail.subject || '강의 개설 문의'}</h3>
      <p>{detail.name} · {detail.email}{detail.phone && ` · ${detail.phone}`}</p>
      <p className="my-3 whitespace-pre-wrap">{detail.message}</p>
      <label className="mr-2" htmlFor="previous-inquiry-status">처리 상태</label>
      <select id="previous-inquiry-status" value={detail.status} disabled={busy || refreshRequired} onChange={event => void update(event.target.value as 'pending' | 'reviewing' | 'done')}>
        {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <button className="ml-3" disabled={busy} onClick={close}>상세 닫기</button>
    </div>}
  </section>;
}

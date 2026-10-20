import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { parseHomePresentation, visibleHomePresentation, type HomePresentation } from '@o4o/types';
import { api } from '../../lib/apiClient';

/** Only the explicitly published, public home slot is read. Never query member posts. */
export function CarePharmNotices({ detailId }: { detailId?: string }) {
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; config: HomePresentation | null }>({ status: 'loading', config: null });
  const [retry, setRetry] = useState(0);
  const [, tick] = useState(0);
  useEffect(() => {
    let alive = true;
    let pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const response = await api.get('/home-presentation/carepharm');
        if (response.data.success !== true) throw new Error('INVALID_RESPONSE');
        const config = response.data.data === null ? null : parseHomePresentation(response.data.data);
        if (alive) setState({ status: 'ready', config });
      } catch {
        // A failed refresh must also remove an earlier, potentially withdrawn notice.
        if (alive) setState({ status: 'error', config: null });
      } finally { pending = false; }
    };
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    const timer = window.setInterval(() => { tick(n => n + 1); void refresh(); }, 30_000);
    document.addEventListener('visibilitychange', visible);
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [retry]);
  if (state.status === 'loading') return <p role="status" className="text-sm text-slate-600">공지를 불러오고 있습니다…</p>;
  if (state.status === 'error') return <div role="alert" className="rounded-xl border border-slate-200 p-4 text-sm">
    <p>공지를 불러오지 못했습니다.</p>
    <button type="button" className="mt-3 min-h-11 text-teal-800 underline" onClick={() => { setState({ status: 'loading', config: null }); setRetry(n => n + 1); }}>공지 다시 불러오기</button>
  </div>;
  const messages = state.config ? visibleHomePresentation(state.config).promotions : [];
  if (detailId !== undefined) {
    const notice = messages.find(item => item.id === detailId);
    if (!notice) return <p className="py-6 text-slate-600">게시 중인 공지를 찾을 수 없습니다. 게시가 종료되거나 철회되었을 수 있습니다.</p>;
    return <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
      <p className="text-sm text-teal-800">{notice.kind === 'advertisement' ? `광고 · ${notice.sponsor}` : 'CarePharm 운영 안내'}</p>
      <h1 className="mt-3 break-words text-2xl font-semibold">{notice.title}</h1>
      {notice.imageUrl && <img className="mt-6 max-h-80 max-w-full rounded-lg object-contain" src={notice.imageUrl} alt="" />}
      <p className="mt-5 whitespace-pre-line break-words leading-7 text-slate-700">{notice.description}</p>
      {notice.linkUrl && <a href={notice.linkUrl} className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-teal-800 px-5 py-3 text-sm font-semibold text-white">{notice.linkText}</a>}
    </article>;
  }
  if (!messages.length) return <p className="py-3 text-sm text-slate-500">아직 게시된 공지가 없습니다.</p>;
  return <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
    {messages.map(item => <li key={item.id}>
      <Link to={`/news/${encodeURIComponent(item.id)}`} className="block p-5 hover:bg-teal-50 focus-visible:outline-teal-700">
        <span className="text-xs text-teal-800">{item.kind === 'advertisement' ? `광고 · ${item.sponsor}` : '공지·안내'}</span>
        <h3 className="mt-2 break-words font-semibold text-slate-900">{item.title}</h3>
        <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-slate-600">{item.description}</p>
        <span className="mt-3 inline-block text-sm text-teal-800">자세히 보기 →</span>
      </Link>
    </li>)}
  </ul>;
}

export default function CarePharmNewsPage() {
  const { noticeId } = useParams();
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-8">
    <Link to="/#news" className="inline-flex min-h-11 items-center text-sm text-teal-800">← 공지·안내 목록</Link>
    <CarePharmNotices key={noticeId} detailId={noticeId ?? ''} />
  </main>;
}

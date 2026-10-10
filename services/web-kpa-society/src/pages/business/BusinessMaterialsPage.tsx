import { useEffect, useState } from 'react';
import { ContentRenderer } from '@o4o/content-editor';
import { useBusiness } from './BusinessWorkspace';
import { businessApi, businessError, pharmacyApiBase, type BusinessContent } from './api';

export default function BusinessMaterialsPage() {
  const { business, access } = useBusiness();
  const [items, setItems] = useState<BusinessContent[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    setItems([]); setError(''); setLoading(true);
    if (!access?.allowed || access.canManage) { setLoading(false); return; }
    businessApi.get<{ items: BusinessContent[]; total: number }>(`${pharmacyApiBase}/store/contents`, { sf: business.key, page, limit: 20 })
      .then(data => { if (alive) { setItems(data.items.filter(item => item.semiFranchiseKey === business.key)); setTotal(data.total); } })
      .catch(e => { if (alive) setError(businessError(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [business.key, access?.allowed, access?.canManage, page, version]);
  if (!access?.allowed) return <p>사업 참여 승인 후 자료를 이용할 수 있습니다.</p>;
  if (access.canManage) return <div><p>자료 등록과 게시 상태는 사업 운영 화면에서 관리합니다.</p><a href="/operator/semi-franchises" className="text-blue-700">사업 자료 관리 →</a></div>;
  return <section>
    <h2 className="text-lg font-semibold">사업 자료</h2>
    {error && <div><p role="alert">{error}</p><button onClick={() => setVersion(n => n + 1)}>다시 시도</button></div>}
    {loading && <p role="status">자료를 불러오고 있습니다…</p>}
    {!loading && !error && !items.length && <p className="mt-4">등록된 자료가 없습니다.</p>}
    {items.map(item => <details key={item.id} className="my-4 rounded-xl border bg-white p-5">
      <summary className="cursor-pointer font-semibold">{item.title}</summary>
      {item.summary && <p className="my-3 text-slate-600">{item.summary}</p>}
      {item.body && <ContentRenderer html={item.body} />}
    </details>)}
    {total > 20 && <nav aria-label="자료 목록 페이지" className="mt-4 flex items-center gap-4"><button disabled={page <= 1 || loading} onClick={() => setPage(n => n - 1)}>이전</button><span>{page} / {Math.ceil(total / 20)}</span><button disabled={page * 20 >= total || loading} onClick={() => setPage(n => n + 1)}>다음</button></nav>}
  </section>;
}

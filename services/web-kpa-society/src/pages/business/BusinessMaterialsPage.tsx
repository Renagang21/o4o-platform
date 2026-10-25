import { safeEducationUrl } from '@o4o/shared-space-ui';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ContentRenderer } from '@o4o/content-editor';
import { useBusiness } from './BusinessWorkspace';
import { businessApi, businessError, pharmacyApiBase, type BusinessContent } from './api';
import BusinessStoreShortcut from './BusinessStoreShortcut';
import { useBusinessMaterialStore } from './useBusinessMaterialStore';

export default function BusinessMaterialsPage() {
  const { business, access } = useBusiness();
  const materialStore = useBusinessMaterialStore(!!access?.allowed && !access.canManage, business.key);
  return <BusinessMaterialRecords key={`${business.key}:${materialStore.organizationId ?? ''}`} materialStore={materialStore} />;
}

function BusinessMaterialRecords({ materialStore }: { materialStore: ReturnType<typeof useBusinessMaterialStore> }) {
  const { business, access } = useBusiness();
  const [params] = useSearchParams();
  const [items, setItems] = useState<BusinessContent[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    setItems([]); setError(''); setLoading(true);
    if (!access?.allowed || access.canManage || !materialStore.organizationId) { setLoading(false); return; }
    businessApi.get<{ items: BusinessContent[]; total: number }>(`${pharmacyApiBase}/store/contents`, { sf: business.key, page, limit: 20 }, materialStore.organizationId)
      .then(data => { if (alive) { setItems(data.items.filter(item => item.semiFranchiseKey === business.key)); setTotal(data.total); } })
      .catch(e => { if (alive) setError(businessError(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [business.key, access?.allowed, access?.canManage, materialStore.organizationId, page, version]);
  if (!access?.allowed) return <p className="rounded-xl border bg-white p-6 text-sm leading-6 text-slate-600">사업 참여 승인 후 자료를 이용할 수 있습니다.</p>;
  if (access.canManage) return <div className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="mb-3 text-xl font-semibold text-slate-900">사업 자료</h2><p className="text-sm leading-6 text-slate-600">자료 등록과 게시 상태는 사업 운영 화면에서 관리합니다.</p><a href="/operator/semi-franchises" className="mt-4 inline-flex min-h-11 items-center rounded-lg border px-4 py-2 text-sm font-medium text-blue-700">사업 자료 관리 →</a></div>;
  return <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-6" aria-labelledby="business-materials-title">
    <h2 id="business-materials-title" className="text-xl font-semibold text-slate-900">사업 자료</h2>
    <p className="mb-5 mt-2 text-sm leading-6 text-slate-500">약국 경영에 필요한 사업 자료를 확인하세요. 제목을 선택하면 내용을 펼쳐 볼 수 있습니다.</p>
    {materialStore.selection}
    {error && <div className="rounded-lg border border-red-100 bg-red-50 p-4"><p role="alert" className="text-sm text-red-700">{error}</p><button className="mt-3 min-h-11 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm text-red-700" type="button" onClick={() => setVersion(n => n + 1)}>다시 시도</button></div>}
    {loading && <output className="block py-6 text-sm text-slate-500" aria-live="polite">자료를 불러오고 있습니다…</output>}
    {materialStore.organizationId && !loading && !error && !items.length && <p className="rounded-xl border border-dashed bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">등록된 자료가 없습니다.</p>}
    {items.map(item => <details key={item.id} open={params.get('content') === item.id || undefined} className="my-4 min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:px-5">
      <summary className="min-h-11 cursor-pointer break-words py-3 font-semibold leading-7 text-slate-900">{item.title}</summary>
      {item.revision && <p className="my-3 text-sm">{item.category || '미분류'} · 개정 {item.revision}</p>}
      {safeEducationUrl(item.educationUrl) && <a href={safeEducationUrl(item.educationUrl)} target="_blank" rel="noopener noreferrer" className="my-3 inline-flex min-h-11 items-center text-blue-700 underline">관련 교육 열기 ↗</a>}
      {item.summary && <p className="my-3 break-words text-sm leading-7 text-slate-600">{item.summary}</p>}
      {item.body && <div className="min-w-0 break-words border-t border-slate-100 pt-4 leading-8 [&_img]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto"><ContentRenderer html={item.body} /></div>}
      <div className="mt-4 border-t pt-4"><p className="mb-3 text-sm text-slate-500">내 매장에 복사해 편집할 수 있습니다. 매장이 여러 곳이면 이동 후 사용할 매장을 선택해 주세요.</p><BusinessStoreShortcut businessKey={business.key} contentId={item.id} /></div>
    </details>)}
    {total > 20 && <nav aria-label="자료 목록 페이지" className="mt-6 flex flex-wrap items-center justify-center gap-3 border-t border-slate-100 pt-5 text-sm text-slate-600"><button className="min-h-11 rounded-lg border bg-white px-4 py-2 font-medium disabled:opacity-40" type="button" disabled={page <= 1 || loading} onClick={() => setPage(n => n - 1)}>이전</button><span>{page} / {Math.ceil(total / 20)}</span><button className="min-h-11 rounded-lg border bg-white px-4 py-2 font-medium disabled:opacity-40" type="button" disabled={page * 20 >= total || loading} onClick={() => setPage(n => n + 1)}>다음</button></nav>}
  </section>;
}

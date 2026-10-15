import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { sanitizeRichHtml } from '@o4o/content-editor';
import { getStoreMlcGroup, listMyMlcGroups, resolveMlc, STORE_MLC_LOCALES, STORE_MLC_LOCALE_LABELS, type StoreMlcGroup, type StoreMlcLocale } from '../../api/multilingualProductContentStore';
import { useStoreOperationScope } from '../../hooks/useStoreOperationScope';
import { storeWorkspaceBase } from '../../components/store/StoreWorkflowNavigation';
import { MultilingualPublicActions } from '../../components/MultilingualPublicActions';
import { useLatestStoreRequest } from './hooks/useLatestStoreRequest';

export function StoreMultilingualContentsMyPage() {
  const scope = useStoreOperationScope();
  return <MyContentsSession key={scope.key} isCurrent={scope.isCurrent} />;
}

function MyContentsSession({ isCurrent }: Readonly<{ isCurrent: () => boolean }>) {
  const { pathname } = useLocation();
  const base = storeWorkspaceBase(pathname);
  const [params] = useSearchParams();
  const selected = params.get('groupId');
  const [groups, setGroups] = useState<StoreMlcGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requests = useLatestStoreRequest();
  const load = useCallback(async () => {
    if (!isCurrent()) return;
    const current = requests.begin(); setLoading(true); setError(null);
    try {
      const data = await listMyMlcGroups({ includeArchived: false });
      if (current() && isCurrent()) setGroups(data);
    } catch {
      if (current() && isCurrent()) setError('내 매장 다국어 콘텐츠를 불러오지 못했습니다. 다시 시도해 주세요.');
    } finally {
      if (current() && isCurrent()) setLoading(false);
    }
  }, [isCurrent, requests]);
  useEffect(() => { void load(); return requests.cancel; }, [load, requests]);
  const ordered = selected ? [...groups].sort((a, b) => Number(b.id === selected) - Number(a.id === selected)) : groups;
  return <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
    <header><h1 className="text-xl font-bold">내 매장 다국어 상품 콘텐츠</h1>
      <p className="text-sm text-slate-600 mt-2">제품에 연결한 안내 자료를 확인하고 언어별 내용을 작성하거나 고객용 링크·QR로 활용합니다.</p>
      <Link to={`${base}/library/multilingual-product-contents`} className="inline-flex items-center min-h-11 text-blue-700 underline">제공 자료에서 가져오기</Link>
    </header>
    {error ? <div role="alert"><p>{error}</p><button onClick={() => void load()} className="min-h-11 underline">다시 시도</button></div>
      : loading ? <p role="status">콘텐츠 불러오는 중…</p>
      : groups.length === 0 ? <p>아직 가져오거나 작성한 다국어 콘텐츠가 없습니다.</p>
      : <>
        {selected && !groups.some(g => g.id === selected) && <p role="status">선택한 콘텐츠가 현재 매장 목록에 없습니다. 목록에서 다시 선택해 주세요.</p>}
        {ordered.map(group => <ContentCard key={group.id} group={group} base={base} selected={group.id === selected} isCurrent={isCurrent} />)}
      </>}
  </div>;
}
function ContentCard({ group: initialGroup, base, selected, isCurrent }: Readonly<{ group: StoreMlcGroup; base: string; selected: boolean; isCurrent: () => boolean }>) {
  const [group, setGroup] = useState(initialGroup);
  const publication = useLatestStoreRequest();
  const [locale, setLocale] = useState<StoreMlcLocale>(group.defaultLocale);
  const [result, setResult] = useState<Awaited<ReturnType<typeof resolveMlc>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requests = useLatestStoreRequest(locale);
  const preview = async () => {
    if (!isCurrent()) return;
    const current = requests.begin(); setLoading(true); setResult(null); setError(null);
    try {
      const data = await resolveMlc(group.id, locale);
      if (!data?.page?.locale) throw new Error('Invalid locale');
      if (current() && isCurrent()) setResult(data);
    } catch (e) {
      if (current() && isCurrent()) setError((e as { code?: string }).code === 'PUBLISHED_PAGE_NOT_FOUND'
        ? '발행된 대체 언어가 없습니다. 언어별 내용 확인·편집에서 발행하거나 고객용 링크를 준비해 주세요.'
        : '언어별 보기를 불러오지 못했습니다. 다시 시도해 주세요.');
    } finally { if (current() && isCurrent()) setLoading(false); }
  };
  const html = result?.page.content?.html;
  return <section aria-label={group.title} className={`bg-white rounded-xl border p-4 sm:p-5 space-y-3 ${selected ? 'border-blue-500' : 'border-slate-200'}`}>
    <h2 className="font-semibold break-words">{group.title}{selected && <span className="ml-2 text-xs text-blue-700">선택한 콘텐츠</span>}</h2>
    <p className="text-sm text-slate-600">연결 제품: {group.targetKind === 'local' ? '매장 경영활용 제품' : 'O4O 주문 가능 상품'} · 기본 언어 {STORE_MLC_LOCALE_LABELS[group.defaultLocale]}</p>
    <p className="text-xs text-slate-500">{group.sourceType === 'operator_hub' ? '제공 자료의 독립 사본' : '매장 직접 작성'} · 작성 언어: {group.pages.map(p => `${STORE_MLC_LOCALE_LABELS[p.locale]} (${p.status === 'published' ? '발행' : p.status === 'archived' ? '보관' : '초안'})`).join(', ') || '없음'}</p>
    <Link className="inline-flex items-center min-h-11 text-blue-700 underline text-sm" to={`${base}/products/multilingual/${group.targetKind}/${encodeURIComponent(group.targetId)}?groupId=${encodeURIComponent(group.id)}`}>연결 제품의 언어별 내용 확인·편집</Link>
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-sm">확인할 언어 <select aria-label="확인할 언어" value={locale} className="min-h-11 border rounded px-2" onChange={e => { setLocale(e.target.value as StoreMlcLocale); setResult(null); setError(null); setLoading(false); }}>
        {STORE_MLC_LOCALES.map(loc => <option key={loc} value={loc}>{STORE_MLC_LOCALE_LABELS[loc]}</option>)}
      </select></label>
      <button onClick={() => void preview()} disabled={loading} className="min-h-11 border rounded px-3 text-sm disabled:opacity-50">{loading ? '불러오는 중…' : error ? '언어별 보기 다시 시도' : '발행 내용 보기'}</button>
    </div>
    <p className="text-xs text-slate-500">요청한 언어가 없으면 English → 기본 언어 → 한국어 순서로 발행된 내용을 표시합니다.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {result && <div role="status" className="rounded-lg border p-3 space-y-2 break-words">
      <p className="text-sm">요청 {STORE_MLC_LOCALE_LABELS[locale]} → 표시 {STORE_MLC_LOCALE_LABELS[result.page.resolvedLocale || result.page.locale]}{result.page.fallbackReason && ' (대체 언어)'}</p>
      <h3 className="font-semibold">{result.page.title}</h3><p>{result.page.summary}</p>
      {typeof html === 'string' ? <div className="prose max-w-full overflow-x-auto" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }} /> : <p className="text-sm">이 형식의 전체 내용은 고객용 보기에서 확인해 주세요.</p>}
    </div>}
    <MultilingualPublicActions groupId={group.id} onPublished={async () => {
      const current = publication.begin();
      const saved = await getStoreMlcGroup(group.id);
      if (saved.id !== group.id || saved.targetId !== group.targetId) throw new Error('Invalid group');
      if (current() && isCurrent()) { requests.cancel(); setLoading(false); setResult(null); setError(null); setGroup(saved); }
    }} />
  </section>;
}
export default StoreMultilingualContentsMyPage;

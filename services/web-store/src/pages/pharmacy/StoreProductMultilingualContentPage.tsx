/**
 * StoreProductMultilingualContentPage — 매장 상품별 다국어 QR 콘텐츠 저작 (한국어/中文 …)
 *
 * WO-O4O-PRODUCT-QR-CONTENT-FLOW-MINIMAL-V1 (B-1: 상품당 QR 1개 + 언어 탭)
 *
 *   /store/products/multilingual/:targetKind/:targetId   — 매장 취급 상품(local|listing) 기준
 *
 * 매장 경영자가 상품 화면에서 진입하여 한국어/중국어 HTML 을 각각 작성한다.
 * 저장소 = store_multilingual_product_content_groups/pages (source_type='store_created').
 * QR = 다국어 그룹 publicKey QR(MultilingualPublicActions). store_qr_codes 미생성.
 * 공개 경로 = /multilingual-products/:publicKey (언어 탭 랜딩).
 *
 * operator 저작 편집기(OperatorMultilingualContentWritePage)를 store 스코프로 이식.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, Save, ArrowLeft, Send, Globe } from 'lucide-react';
import { RichTextEditor } from '@o4o/content-editor';
import { ProductDescriptionAssist } from '../../components/product-description/ProductDescriptionAssist';
import { ProductEvidencePicker, type ProductEvidenceSelection } from '../../components/product-description/ProductEvidencePicker';
import { toast } from '@o4o/error-handling';
import {
  getStoreMlcGroup,
  hasPublishableMlcPage,
  createStoreMlcGroup,
  updateStoreMlcGroup,
  upsertStoreMlcPage,
  setStoreMlcPageStatus,
  listMyMlcGroups,
  STORE_MLC_LOCALES,
  STORE_MLC_LOCALE_LABELS,
  type StoreMlcGroupDetail,
  type StoreMlcLocale,
  type StoreMlcPageDetail,
  type StoreMlcTargetKind,
} from '../../api/multilingualProductContentStore';
import { useStoreOperationScope } from '../../hooks/useStoreOperationScope';
import { storeWorkspaceBase } from '../../components/store/StoreWorkflowNavigation';
import { useLatestStoreRequest } from './hooks/useLatestStoreRequest';
import { MultilingualPublicActions } from '../../components/MultilingualPublicActions';
import { MultilingualChannelActions } from './multilingual/MultilingualChannelActions';

interface PageDraft {
  title: string;
  summary: string;
  html: string;
  status: 'draft' | 'published' | 'archived';
}

function draftFromPage(p?: StoreMlcPageDetail): PageDraft {
  return {
    title: p?.title ?? '',
    summary: p?.summary ?? '',
    html: typeof p?.content?.html === 'string' ? p.content.html : '',
    status: p?.status ?? 'draft',
  };
}

function isTargetKind(v: string | undefined): v is StoreMlcTargetKind {
  return v === 'local' || v === 'listing';
}

export default function StoreProductMultilingualContentPage() {
  const scope = useStoreOperationScope();
  const { targetKind, targetId } = useParams();
  const [params] = useSearchParams();
  return <AuthoringSession key={`${scope.key}:${targetKind}:${targetId}:${params.get('groupId') || ''}`} isCurrent={scope.isCurrent} />;
}

function AuthoringSession({ isCurrent }: Readonly<{ isCurrent: () => boolean }>) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const base = storeWorkspaceBase(pathname);
  const { targetKind, targetId } = useParams<{ targetKind?: string; targetId?: string }>();
  const [searchParams] = useSearchParams();
  const productName = searchParams.get('name') || '';
  const requestedGroupId = searchParams.get('groupId');
  const validTarget = isTargetKind(targetKind) && !!targetId;
  const reads = useLatestStoreRequest();
  const writes = useLatestStoreRequest();
  const lock = useRef(false);
  // Held by a public link/QR action: shares `lock` so editor writes cannot race public-key promotion.
  const publicLock = useRef(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [retry, setRetry] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [group, setGroup] = useState<StoreMlcGroupDetail | null>(null);
  const [title, setTitle] = useState('');
  const [defaultLocale, setDefaultLocale] = useState<StoreMlcLocale>('ko');

  const [activeLocale, setActiveLocale] = useState<StoreMlcLocale>('ko');
  const [requestedLocale] = useState(() => searchParams.get('locale'));
  const [drafts, setDrafts] = useState<Record<string, PageDraft>>({});
  const [productEvidence, setProductEvidence] = useState<ProductEvidenceSelection | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [isSavingPage, setIsSavingPage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNew = !group;

  const hydrate = useCallback((g: StoreMlcGroupDetail) => {
    setGroup(g);
    setTitle(g.title);
    setDefaultLocale(g.defaultLocale);
    const next: Record<string, PageDraft> = {};
    for (const loc of STORE_MLC_LOCALES) {
      next[loc] = draftFromPage(g.pages.find((p) => p.locale === loc));
    }
    setDrafts(next);
    const requestedPage = g.pages.find(p => p.locale === requestedLocale);
    setActiveLocale(requestedPage?.locale ?? g.defaultLocale);
  }, [requestedLocale]);

  const verifyGroup = useCallback((value: StoreMlcGroupDetail) => {
    if (!value?.id || value.targetKind !== targetKind || value.targetId !== targetId || !Array.isArray(value.pages))
      throw new Error('Invalid product content');
    return value;
  }, [targetKind, targetId]);
  useEffect(() => {
    if (!validTarget) { setIsLoading(false); setError('잘못된 상품 대상입니다.'); return; }
    const current = reads.begin();
    void (async () => {
      setIsLoading(true); setError(null);
      try {
        let id = requestedGroupId;
        if (!id) {
          const groups = await listMyMlcGroups({ targetKind: targetKind as StoreMlcTargetKind, targetId, includeArchived: false });
          if (!current() || !isCurrent()) return;
          id = (groups.find(g => g.contentKey === 'default') ?? groups[0])?.id || null;
        }
        if (!current() || !isCurrent()) return;
        if (id) {
          const full = verifyGroup(await getStoreMlcGroup(id));
          if (full.id !== id) throw new Error('Invalid group');
          if (current() && isCurrent()) hydrate(full);
        } else if (current() && isCurrent()) setTitle(productName ? `${productName} 다국어 안내` : '');
      } catch {
        if (current() && isCurrent()) setError('콘텐츠를 불러오지 못했습니다. 다시 시도해 주세요.');
      } finally { if (current() && isCurrent()) setIsLoading(false); }
    })();
    return reads.cancel;
  }, [validTarget, requestedGroupId, targetKind, targetId, productName, retry, reads, hydrate, verifyGroup, isCurrent]);

  const activeDraft = drafts[activeLocale] ?? draftFromPage();
  const setActiveDraft = (patch: Partial<PageDraft>) => {
    if (!lock.current && isCurrent()) setDrafts(prev => ({ ...prev, [activeLocale]: { ...(prev[activeLocale] ?? draftFromPage()), ...patch } }));
  };
  const busy = isSavingGroup || isSavingPage || isPublishing;
  const acquirePublicLock = useCallback(() => {
    if (lock.current) return null;
    lock.current = true; publicLock.current = true; setIsPublishing(true);
    return () => { lock.current = false; publicLock.current = false; setIsPublishing(false); };
  }, []);
  const unsupported = !!group?.pages.some(p => p.locale === activeLocale && p.contentFormat !== 'html');
  const dirty = !!group && (title !== group.title || defaultLocale !== group.defaultLocale || STORE_MLC_LOCALES.some(loc =>
    JSON.stringify(drafts[loc] ?? draftFromPage()) !== JSON.stringify(draftFromPage(group.pages.find(p => p.locale === loc)))));


  // WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1 §14: 외부 LLM 번역 기준 본문 선택 — 메모리의 locale draft 만 사용(새 fetch 없음).
  //   target locale 본문은 currentHtml(참고해 다듬기) · 기준 source = defaultLocale 본문 → 없으면 한국어 본문 → 없으면 없음.
  //   기준 본문이 하나도 없으면 referenceHtml 이 비어 Prompt 는 제품명만으로 사실을 만들지 않도록 지시한다.
  const translateSource = (() => {
    const pick = (loc: string) => {
      if (loc === activeLocale) return null;
      const html = drafts[loc]?.html ?? '';
      return html.trim() && html.trim() !== '<p></p>' ? { locale: loc, html } : null;
    };
    return pick(defaultLocale) ?? pick('ko');
  })();

  const localesWithContent = useMemo(() => {
    const set = new Set<string>();
    for (const loc of STORE_MLC_LOCALES) {
      const d = drafts[loc];
      if (d && (d.title.trim() || d.html.trim())) set.add(loc);
    }
    return set;
  }, [drafts]);

  const publishedLocaleCount = useMemo(
    () => STORE_MLC_LOCALES.filter((loc) => drafts[loc]?.status === 'published').length,
    [drafts],
  );

  const handleSaveGroup = async () => {
    if (!validTarget || lock.current || !isCurrent()) return;
    if (!title.trim()) { setSaveError('콘텐츠 제목을 입력하세요.'); return; }
    const current = writes.begin();
    lock.current = true; setIsSavingGroup(true); setSaveError(null);
    try {
      const saved = verifyGroup(group
        ? await updateStoreMlcGroup(group.id, { title: title.trim(), defaultLocale })
        : await createStoreMlcGroup({ targetKind: targetKind as StoreMlcTargetKind, targetId: targetId!, title: title.trim(), defaultLocale }));
      if (!current() || !isCurrent()) return;
      // Updating metadata must not replace unsaved text in any language.
      if (group) { setGroup(saved); setTitle(saved.title); setDefaultLocale(saved.defaultLocale); }
      else hydrate(saved);
      toast.success(isNew ? '다국어 콘텐츠가 생성되었습니다 (초안)' : '기본 정보가 저장되었습니다');
    } catch { if (current() && isCurrent()) setSaveError('기본 정보 저장 결과를 확인하지 못했습니다. 입력을 유지했습니다. 다시 시도해 주세요.'); }
    finally { lock.current = false; if (current() && isCurrent()) setIsSavingGroup(false); }
  };

  const persistPage = async (publish: boolean, statusOnly = false) => {
    // Non-HTML pages keep their original body: block upserts, but allow status-only changes (e.g. unpublish).
    if (!group || lock.current || (unsupported && !statusOnly) || !isCurrent()) return;
    if (!statusOnly && !activeDraft.title.trim()) { setSaveError('이 언어의 제목을 입력하세요.'); return; }
    const locale = activeLocale;
    const current = writes.begin();
    lock.current = true; setIsSavingPage(true); setSaveError(null);
    try {
      const saved = verifyGroup(statusOnly
        ? await setStoreMlcPageStatus(group.id, locale, 'draft')
        : await upsertStoreMlcPage(group.id, locale, {
          title: activeDraft.title.trim(), summary: activeDraft.summary.trim(), contentFormat: 'html',
          content: { html: activeDraft.html }, status: publish || activeDraft.status === 'published' ? 'published' : 'draft',
        }));
      if (!current() || !isCurrent()) return;
      setGroup(saved);
      // Preserve the metadata form and every other locale's unsaved draft.
      setDrafts(prev => ({ ...prev, [locale]: statusOnly
        ? { ...prev[locale], status: saved.pages.find(p => p.locale === locale)?.status ?? 'draft' }
        : draftFromPage(saved.pages.find(p => p.locale === locale)) }));
      toast.success(`${STORE_MLC_LOCALE_LABELS[locale]} 페이지가 ${statusOnly ? '초안으로 변경' : publish ? '발행' : '저장'}되었습니다`);
    } catch { if (current() && isCurrent()) setSaveError('언어별 저장 결과를 확인하지 못했습니다. 선택한 언어와 입력을 유지했습니다. 다시 시도해 주세요.'); }
    finally { lock.current = false; if (current() && isCurrent()) setIsSavingPage(false); }
  };

  /** Returns false when skipped or superseded by an editor write, so the caller must not deliver the link. */
  const refreshPublication = async (): Promise<boolean> => {
    // Serialize with editor writes: a save/unpublish that starts during this GET supersedes it, and the
    // late response must not overwrite the newer result. Skip while a write is already in flight.
    // The public action itself holds the shared lock (publicLock); any other holder is an editor write.
    if (!group || (lock.current && !publicLock.current) || !isCurrent()) return false;
    const current = writes.begin();
    const saved = verifyGroup(await getStoreMlcGroup(group.id));
    if (!current() || !isCurrent()) return false;
    setGroup(saved);
    setDrafts(prev => Object.fromEntries(STORE_MLC_LOCALES.map(loc => [loc, {
      ...(prev[loc] ?? draftFromPage()), status: saved.pages.find(p => p.locale === loc)?.status ?? 'draft',
    }])));
    return true;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm" role="alert">{error}</p>
        <button onClick={() => setRetry(v => v + 1)} className="min-h-11 underline text-blue-700">다시 시도</button>
        <button onClick={() => navigate(`${base}/handled-products`)} className="text-sm text-blue-600 hover:underline">
          상품 목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl p-4 sm:p-6">
      {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`${base}/handled-products`)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="상품 목록">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">상품 다국어 QR 콘텐츠</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {productName ? <span className="font-medium text-slate-600">{productName}</span> : '상품'}
              {' · '}
              {group ? `상태: ${group.status === 'published' ? '발행됨' : group.status === 'archived' ? '보관됨' : '초안'}` : '신규 (저장 시 초안 생성)'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSaveGroup}
          disabled={busy}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
        >
          {isSavingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          기본 정보 저장
        </button>
      </div>

      <nav className="flex flex-wrap gap-3 text-sm" aria-label="다국어 안내 다음 작업">
        <Link to="/store/library/multilingual-product-contents/my" className="min-h-11 content-center text-blue-700 underline">내 다국어 안내 목록</Link>
        <Link to={`${base}/workspace/use`} className="min-h-11 content-center text-blue-700 underline">매장 적용·출력</Link>
      </nav>
      {/* Group meta */}
      <div className="space-y-4 bg-white rounded-xl border border-slate-100 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">콘텐츠 제목 <span className="text-red-400">*</span></label>
            <input
              type="text"
              aria-label="콘텐츠 제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 아쿠아셀 오메가-3 안내"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={busy}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">기본 언어</label>
            <select
              aria-label="기본 언어"
              value={defaultLocale}
              onChange={(e) => setDefaultLocale(e.target.value as StoreMlcLocale)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              disabled={busy}
            >
              {STORE_MLC_LOCALES.map((loc) => (
                <option key={loc} value={loc}>{STORE_MLC_LOCALE_LABELS[loc]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* QR / 고객용 링크 — 그룹이 있을 때만. publicKey QR(언어 탭 랜딩). */}
        {group && <><MultilingualPublicActions groupId={group.id} publishable={hasPublishableMlcPage(group)} disabled={isSavingGroup || isSavingPage || dirty} onPublished={refreshPublication} acquireLock={acquirePublicLock} />
          <MultilingualChannelActions groupId={group.id} locale={activeLocale} disabled={busy || dirty}
            published={group.pages.some(p => p.status === 'published')} /></>}
      </div>

      {dirty && <p className="text-sm text-amber-800">미저장 변경이 있습니다. 기본 정보와 언어별 본문을 저장한 뒤 고객용 링크·QR을 사용해 주세요.</p>}
      {!group && (
        <div className="flex items-start gap-3 p-4 border rounded-xl text-sm bg-amber-50/70 border-amber-200 text-amber-800">
          <Globe className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
          <p className="font-semibold">먼저 <strong>기본 정보 저장</strong>으로 콘텐츠를 생성하면 언어별(한국어/中文 …) 본문을 작성하고 QR을 만들 수 있습니다.</p>
        </div>
      )}

      {group && publishedLocaleCount === 0 && (
        <div className="flex items-start gap-3 p-4 border rounded-xl text-sm bg-orange-50/70 border-orange-200 text-orange-800">
          <Globe className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
          <div className="space-y-1">
            <p className="font-semibold">아직 발행된 언어가 없습니다.</p>
            <p className="text-xs opacity-80">언어별로 본문을 작성한 뒤 "저장 후 이 언어 발행"을 눌러야 QR 랜딩에 노출됩니다. (QR 보기를 누르면 초안도 함께 발행됩니다.)</p>
          </div>
        </div>
      )}

      {group && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          {/* Language tabs */}
          <div className="flex flex-wrap gap-1 border-b border-slate-100 px-4 pt-3">
            {STORE_MLC_LOCALES.map((loc) => {
              const has = localesWithContent.has(loc);
              const published = drafts[loc]?.status === 'published';
              return (
                <button
                  key={loc}
                  disabled={busy}
                  onClick={() => { if (!lock.current) setActiveLocale(loc); }}
                  className={`relative px-3 py-2 text-sm rounded-t-lg ${
                    activeLocale === loc ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {STORE_MLC_LOCALE_LABELS[loc]}
                  {loc === defaultLocale && <span className="ml-1 text-[10px] text-blue-500">기본</span>}
                  <span
                    className={`ml-1.5 text-[10px] align-middle ${
                      published ? 'text-emerald-600' : has ? 'text-amber-600' : 'text-slate-300'
                    }`}
                  >
                    {published ? '· 발행됨' : has ? '· 초안' : '· 미작성'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active locale editor */}
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-500">
                <span className="font-semibold text-slate-700">{STORE_MLC_LOCALE_LABELS[activeLocale]}</span> 페이지
                <span className={`ml-2 inline-flex items-center px-2 py-0.5 text-xs rounded-full border ${
                  activeDraft.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {activeDraft.status === 'published' ? '발행됨' : '초안'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {activeDraft.status === 'published' && (
                  <button
                    onClick={() => void persistPage(false, true)}
                    disabled={busy}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    초안으로 내리기
                  </button>
                )}
                <button
                  onClick={() => persistPage(false)}
                  disabled={busy || unsupported}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 disabled:opacity-50"
                >
                  {isSavingPage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  임시 저장
                </button>
                <button
                  onClick={() => persistPage(true)}
                  disabled={busy || unsupported}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSavingPage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  저장 후 이 언어 발행
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">제목 <span className="text-red-400">*</span></label>
              <input
                type="text"
                aria-label="언어별 제목"
                value={activeDraft.title}
                onChange={(e) => setActiveDraft({ title: e.target.value })}
                placeholder={`${STORE_MLC_LOCALE_LABELS[activeLocale]} 제목`}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={busy || unsupported}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">요약 <span className="text-xs text-slate-400 font-normal">(선택)</span></label>
              <textarea
                aria-label="언어별 요약"
                value={activeDraft.summary}
                onChange={(e) => setActiveDraft({ summary: e.target.value })}
                rows={2}
                placeholder="한 줄 요약"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                disabled={busy || unsupported}
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="block text-sm font-medium text-slate-700">본문 (HTML)</label>
                {/* 한국어 원문 작성과 외부 LLM 번역/현지화. 결과는 이 언어 draft.html 에만 반영 —
                    자동 임시저장·발행·QR 생성 없음(기존 버튼을 사용자가 누른다). */}
              </div>
              {isTargetKind(targetKind) && targetId && <ProductEvidencePicker key={`${targetKind}:${targetId}:${activeLocale}`}
                kind={targetKind} id={targetId} locale={activeLocale} disabled={busy || unsupported} isCurrent={isCurrent}
                onLoaded={setProductEvidence} onInsert={html => setActiveDraft({ html: [activeDraft.html, html].filter(Boolean).join('\n') })} />}
                {!busy && !unsupported && <ProductDescriptionAssist key={`assist:${group.id}:${activeLocale}`}
                  context={{
                      // Non-Korean drafts need the translation prompt's explicit target-language instruction, even without a reference.
                      task: activeLocale === 'ko' && !translateSource?.html ? 'product-description' : 'translate',
                      title: activeDraft.title || title,
                      productName,
                      currentHtml: activeDraft.html,
                      referenceHtml: translateSource?.html ?? null,
                      sourceLocale: translateSource?.locale ?? null,
                      targetLocale: activeLocale,
                      purpose: 'consumer-qr',
                      evidence: productEvidence ? [{ kind: 'product-fact', title: productEvidence.title,
                        source: productEvidence.source, content: productEvidence.html, reviewStatus: 'pending' }] : [],
                    }}
                  onApplyHtml={(html) => setActiveDraft({ html })}
                />}
              {unsupported && <p role="status" className="text-sm text-amber-800">이 언어는 HTML 편집을 지원하지 않는 형식입니다. 원본 형식을 유지하며 발행 내용 보기에서 확인해 주세요.</p>}
              <RichTextEditor showInternalAi={false}
                key={`${group.id}:${activeLocale}`}
                value={activeDraft.html}
                onChange={(c) => setActiveDraft({ html: c.html })}
                placeholder={`${STORE_MLC_LOCALE_LABELS[activeLocale]} 본문을 작성하세요`}
                minHeight="360px"
                editable={!busy && !unsupported}
              />
            </div>
            <p className="text-xs text-slate-400">
              언어별 내용은 동일할 필요가 없습니다. 각 언어 독립 안내 페이지로 작성하세요. 스캔 시 하나의 QR 에서 언어 탭으로 표시됩니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

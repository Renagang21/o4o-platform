/**
 * OperatorMultilingualContentWritePage — 운영자 다국어 상품 콘텐츠 작성/수정
 *
 * WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-WEB-PILOT-V1
 *
 *   /operator/multilingual-product-contents/new   — 신규 (그룹 생성 후 :id 로 redirect)
 *   /operator/multilingual-product-contents/:id    — 그룹 메타 + 언어별 페이지 편집
 *
 * 언어별 페이지는 독립 마케팅 버전이다 (동일성/자동번역 강제 없음).
 * V1 본문 포맷 = html (RichTextEditor). 프론트는 author_role/service_key 를 보내지 않는다.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, AlertCircle, Save, ArrowLeft, Send, Globe } from 'lucide-react';
import { RichTextEditor } from '@o4o/content-editor';
import { toast } from '@o4o/error-handling';
import {
  createOperatorMlcGroup,
  getOperatorMlcGroup,
  updateOperatorMlcGroup,
  upsertOperatorMlcPage,
  setOperatorMlcPageStatus,
  OPERATOR_MLC_LOCALES,
  OPERATOR_MLC_LOCALE_LABELS,
  type OperatorMlcGroup,
  type OperatorMlcLocale,
  type OperatorMlcPage,
} from '../../../api/operatorMultilingualContent';

interface PageDraft {
  title: string;
  summary: string;
  html: string;
  status: 'draft' | 'published' | 'archived';
}

function draftFromPage(p?: OperatorMlcPage): PageDraft {
  return {
    title: p?.title ?? '',
    summary: p?.summary ?? '',
    html: typeof (p?.content as any)?.html === 'string' ? ((p!.content as any).html as string) : '',
    status: p?.status ?? 'draft',
  };
}

export default function OperatorMultilingualContentWritePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isNew = !id;

  const [group, setGroup] = useState<OperatorMlcGroup | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [defaultLocale, setDefaultLocale] = useState<OperatorMlcLocale>('ko');

  const [activeLocale, setActiveLocale] = useState<OperatorMlcLocale>('ko');
  const [drafts, setDrafts] = useState<Record<string, PageDraft>>({});

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [isSavingPage, setIsSavingPage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydrate = (g: OperatorMlcGroup) => {
    setGroup(g);
    setTitle(g.title);
    setDescription(g.description ?? '');
    setDefaultLocale(g.defaultLocale);
    const next: Record<string, PageDraft> = {};
    for (const loc of OPERATOR_MLC_LOCALES) {
      next[loc] = draftFromPage(g.pages.find((p) => p.locale === loc));
    }
    setDrafts(next);
    setActiveLocale(g.defaultLocale);
  };

  useEffect(() => {
    if (isNew) return;
    let canceled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const g = await getOperatorMlcGroup(id!);
        if (canceled) return;
        hydrate(g);
      } catch (e: any) {
        if (!canceled) setError(e?.message || '콘텐츠를 불러올 수 없습니다');
      } finally {
        if (!canceled) setIsLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew]);

  const activeDraft = drafts[activeLocale] ?? draftFromPage();
  const setActiveDraft = (patch: Partial<PageDraft>) =>
    setDrafts((prev) => ({ ...prev, [activeLocale]: { ...(prev[activeLocale] ?? draftFromPage()), ...patch } }));

  const localesWithContent = useMemo(() => {
    const set = new Set<string>();
    for (const loc of OPERATOR_MLC_LOCALES) {
      const d = drafts[loc];
      if (d && (d.title.trim() || d.html.trim())) set.add(loc);
    }
    return set;
  }, [drafts]);

  const handleSaveGroup = async (): Promise<OperatorMlcGroup | null> => {
    if (!title.trim()) {
      toast.error('콘텐츠 제목을 입력하세요');
      return null;
    }
    setIsSavingGroup(true);
    try {
      const saved = isNew
        ? await createOperatorMlcGroup({ title: title.trim(), description: description.trim() || undefined, defaultLocale })
        : await updateOperatorMlcGroup(id!, { title: title.trim(), description: description.trim(), defaultLocale });
      toast.success(isNew ? '콘텐츠가 생성되었습니다 (초안)' : '저장되었습니다');
      if (isNew) {
        navigate(`/operator/multilingual-product-contents/${saved.id}`, { replace: true });
      } else {
        hydrate(saved);
      }
      return saved;
    } catch (e: any) {
      toast.error(e?.message || '저장에 실패했습니다');
      return null;
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleSavePage = async (publish: boolean) => {
    if (!group) return;
    const d = activeDraft;
    if (!d.title.trim()) {
      toast.error('이 언어의 제목을 입력하세요');
      return;
    }
    setIsSavingPage(true);
    try {
      const g = await upsertOperatorMlcPage(group.id, activeLocale, {
        title: d.title.trim(),
        summary: d.summary.trim() || undefined,
        contentFormat: 'html',
        content: { html: d.html },
        status: publish ? 'published' : d.status === 'published' ? 'published' : 'draft',
      });
      hydrate(g);
      setActiveLocale(activeLocale);
      toast.success(
        `${OPERATOR_MLC_LOCALE_LABELS[activeLocale]} 페이지가 ${publish ? '발행' : '저장'}되었습니다`,
      );
    } catch (e: any) {
      toast.error(e?.message || '페이지 저장에 실패했습니다');
    } finally {
      setIsSavingPage(false);
    }
  };

  const handleTogglePageStatus = async () => {
    if (!group) return;
    const next = activeDraft.status === 'published' ? 'draft' : 'published';
    setIsSavingPage(true);
    try {
      const g = await setOperatorMlcPageStatus(group.id, activeLocale, next);
      hydrate(g);
      setActiveLocale(activeLocale);
      toast.success(`상태가 '${next === 'published' ? '발행됨' : '초안'}' 으로 변경되었습니다`);
    } catch (e: any) {
      toast.error(e?.message || '상태 변경에 실패했습니다');
    } finally {
      setIsSavingPage(false);
    }
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
        <p className="text-sm">{error}</p>
        <button onClick={() => navigate('/operator/multilingual-product-contents')} className="text-sm text-blue-600 hover:underline">
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/operator/multilingual-product-contents')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="목록">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{isNew ? '새 다국어 상품 콘텐츠' : '다국어 상품 콘텐츠 편집'}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {group ? `상태: ${group.status === 'published' ? '발행됨' : group.status === 'archived' ? '보관됨' : '초안'}` : '신규 (저장 시 초안 생성)'}
              {' · 매장 HUB 노출 대상 (KPA)'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSaveGroup}
          disabled={isSavingGroup}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
        >
          {isSavingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          기본 정보 저장
        </button>
      </div>

      {/* Group meta */}
      <div className="space-y-4 bg-white rounded-xl border border-slate-100 p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">콘텐츠 제목 <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 외국인 고객 인기 상품 안내"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSavingGroup}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">설명 <span className="text-xs text-slate-400 font-normal">(선택 — HUB 목록 표시)</span></label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="콘텐츠를 한 줄로 설명하세요"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSavingGroup}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">기본 언어</label>
            <select
              value={defaultLocale}
              onChange={(e) => setDefaultLocale(e.target.value as OperatorMlcLocale)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              disabled={isSavingGroup}
            >
              {OPERATOR_MLC_LOCALES.map((loc) => (
                <option key={loc} value={loc}>{OPERATOR_MLC_LOCALE_LABELS[loc]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isNew ? (
        <div className="flex items-start gap-3 p-5 bg-blue-50/60 border border-blue-100 rounded-xl text-sm text-slate-600">
          <Globe className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>먼저 <strong>기본 정보 저장</strong>으로 콘텐츠를 생성하면 언어별 페이지(한국어/English/中文 …)를 작성할 수 있습니다.</span>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          {/* Language tabs */}
          <div className="flex flex-wrap gap-1 border-b border-slate-100 px-4 pt-3">
            {OPERATOR_MLC_LOCALES.map((loc) => {
              const has = localesWithContent.has(loc);
              const published = drafts[loc]?.status === 'published';
              return (
                <button
                  key={loc}
                  onClick={() => setActiveLocale(loc)}
                  className={`relative px-3 py-2 text-sm rounded-t-lg ${
                    activeLocale === loc ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {OPERATOR_MLC_LOCALE_LABELS[loc]}
                  {loc === defaultLocale && <span className="ml-1 text-[10px] text-blue-500">기본</span>}
                  {has && (
                    <span className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full align-middle ${published ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active locale editor */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-slate-500">
                <span className="font-semibold text-slate-700">{OPERATOR_MLC_LOCALE_LABELS[activeLocale]}</span> 페이지
                <span className={`ml-2 inline-flex items-center px-2 py-0.5 text-xs rounded-full border ${
                  activeDraft.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {activeDraft.status === 'published' ? '발행됨' : '초안'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {activeDraft.status === 'published' && (
                  <button
                    onClick={handleTogglePageStatus}
                    disabled={isSavingPage}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    초안으로 내리기
                  </button>
                )}
                <button
                  onClick={() => handleSavePage(false)}
                  disabled={isSavingPage}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 disabled:opacity-50"
                >
                  {isSavingPage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  저장
                </button>
                <button
                  onClick={() => handleSavePage(true)}
                  disabled={isSavingPage}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSavingPage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  저장 후 발행
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">제목 <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={activeDraft.title}
                onChange={(e) => setActiveDraft({ title: e.target.value })}
                placeholder={`${OPERATOR_MLC_LOCALE_LABELS[activeLocale]} 제목`}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSavingPage}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">요약 <span className="text-xs text-slate-400 font-normal">(선택)</span></label>
              <textarea
                value={activeDraft.summary}
                onChange={(e) => setActiveDraft({ summary: e.target.value })}
                rows={2}
                placeholder="한 줄 요약"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                disabled={isSavingPage}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">본문</label>
              <RichTextEditor
                key={activeLocale}
                value={activeDraft.html}
                onChange={(c) => setActiveDraft({ html: c.html })}
                placeholder={`${OPERATOR_MLC_LOCALE_LABELS[activeLocale]} 본문을 작성하세요`}
                minHeight="360px"
                editable={!isSavingPage}
              />
            </div>
            <p className="text-xs text-slate-400">
              언어별 내용은 동일할 필요가 없습니다. 각 언어 독립 마케팅 페이지로 작성하세요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 이용 가능 콘텐츠 — WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1
 *
 *   GET  /api/v1/neture/pharmacy/store/contents?sf=&q=&page=&limit=  가입(active) 세미프랜차이즈의 게시 콘텐츠
 *   POST /api/v1/neture/pharmacy/store/contents/:id/copy              내 매장 사본(매장 소유 독립 사본) 만들기
 * 어떤 콘텐츠를 볼 수 있는지는 서버 판정이다(가입 상태 · 게시 상태). 화면은 응답을 그대로 보여준다.
 * 다른 출처(커뮤니티 · 운영자 콘텐츠 / 공급자 자료)는 기존 화면으로 안내만 한다 — 이 화면에 새 가져오기 흐름을 두지 않는다.
 */
import { useLatestRequest } from '../../hooks/useLatestRequest';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { ContentRenderer } from '@o4o/content-editor';
import { neturePharmacyApi, pharmacyErrorMessage, type SemiFranchiseContent, type SemiFranchiseRow } from '../../api/neturePharmacy';
import { WORKSPACE_PATHS } from '../../config/workspace';
import { BusinessTabs } from '../../components/BusinessTabs';
import { StoreLibraryNavigation } from '../../components/StoreLibraryNavigation';
import { Notice, PharmacyPage, btn, formatDate, pharmacyStorePath } from './shared';

const PAGE_SIZE = 20;
const STORE_LIBRARY_PATH = `${WORKSPACE_PATHS.myStore}/library/contents`;

/** 다른 콘텐츠 출처 — 기존 화면으로 이동만 한다. */
const OTHER_SOURCES: Array<{ key: string; title: string; description: string; to: string }> = [
  { key: 'hub-content', title: '일반 커뮤니티 · 운영자 콘텐츠', description: '내 매장의 일반 콘텐츠 자료에서 사본을 만들 수 있습니다.', to: `${WORKSPACE_PATHS.library}/content` },
  { key: 'supplier-library', title: '공급자 자료', description: '공급자의 공개 자료를 읽을 수 있습니다.', to: `${WORKSPACE_PATHS.library}/supplier-library` },
  { key: 'store-library', title: '내 매장 자료함', description: '가져온 사본과 직접 만든 콘텐츠를 관리합니다.', to: STORE_LIBRARY_PATH },
];

const looksLikeHtml = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s);

function ContentBody({ body }: { body: string | null }) {
  if (!body || !body.trim()) return <p className="text-sm text-gray-400">본문 내용이 없습니다.</p>;
  if (looksLikeHtml(body)) return <ContentRenderer html={body} />;
  return <p className="whitespace-pre-wrap text-sm text-gray-700">{body}</p>;
}

export default function PharmacyContentSourcesPage() {
  const [franchises, setFranchises] = useState<SemiFranchiseRow[]>([]);
  const [params, setParams] = useSearchParams();
  const sf = params.get('business') || '';
  const setSf = (value: string) => { setParams(prev => { const p = new URLSearchParams(prev); if (value) p.set('business', value); else p.delete('business'); return p; }); };
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<SemiFranchiseContent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    neturePharmacyApi.listSemiFranchises()
      .then((rows) => setFranchises(rows.filter((r) => r.membershipStatus === 'active')))
      .catch(() => setFranchises([]));
  }, []);

  const { begin, invalidate } = useLatestRequest();
  const load = useCallback(async () => {
    const isCurrent = begin();
    setItems([]);
    setTotal(0);
    setLoading(true);
    setError(null);
    try {
      const res = await neturePharmacyApi.listContents({ sf: sf || undefined, q: q || undefined, page, limit: PAGE_SIZE });
      if (!isCurrent()) return;
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      if (!isCurrent()) return;
      setError(pharmacyErrorMessage(e, '콘텐츠 목록을 불러오지 못했습니다.'));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [sf, q, page, begin]);

  useEffect(() => { void load(); return invalidate; }, [load, invalidate]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  };

  const copy = async (c: SemiFranchiseContent) => {
    setBusyId(c.id);
    setError(null);
    setCopied(null);
    try {
      await neturePharmacyApi.copyContent(c.id);
      setCopied(c.title);
    } catch (e) {
      setError(pharmacyErrorMessage(e, '내 매장 사본을 만들지 못했습니다.'));
    } finally {
      setBusyId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PharmacyPage
      title="자료 가져오기"
      description="가입한 세미프랜차이즈가 게시한 콘텐츠를 확인하고 내 매장 사본으로 가져와 편집할 수 있습니다. 사본은 원본이 바뀌어도 자동으로 바뀌지 않습니다."
      actions={<button className={btn.secondary} onClick={load} disabled={loading}><RefreshCw size={14} className={`inline ${loading ? 'animate-spin' : ''}`} /> 새로고침</button>}
    >
      <StoreLibraryNavigation section="sources" />
      <BusinessTabs businesses={franchises} value={sf} onChange={key => { setSf(key); setPage(1); }} />
      <section className="mb-6 grid gap-3 sm:grid-cols-3" data-testid="pharmacy-content-other-sources">
        {OTHER_SOURCES.map((s) => (
          <Link key={s.key} to={s.to} className="rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-emerald-300 hover:bg-emerald-50">
            <p className="text-sm font-medium text-gray-900">{s.title}</p>
            <p className="mt-1 text-xs text-gray-500">{s.description}</p>
          </Link>
        ))}
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-gray-200">
        <span className="-mb-px border-b-2 border-emerald-600 px-3 py-2 text-sm font-medium text-emerald-700">가입 세미프랜차이즈</span>
      </div>

      {copied && (
        <Notice>
          '{copied}' 를 내 매장 사본으로 만들었습니다. <Link to={STORE_LIBRARY_PATH} className="font-medium text-emerald-700 underline">내 매장 자료함에서 보기</Link>
        </Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}

      <form className="mb-4 flex flex-wrap gap-2" onSubmit={onSearch}>
        <input
          className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          placeholder="제목 · 요약 검색"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
        <button type="submit" className={btn.secondary}>검색</button>
      </form>

      {loading ? (
        <p className="py-12 text-center text-gray-500">불러오는 중...</p>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          <p>이용할 수 있는 세미프랜차이즈 콘텐츠가 없습니다.</p>
          <p className="mt-1">세미프랜차이즈에 가입하면 그 세미프랜차이즈가 게시한 콘텐츠를 이용할 수 있습니다.</p>
          <Link to={pharmacyStorePath('semiFranchises')} className="mt-3 inline-block text-emerald-700 underline">세미프랜차이즈 보기</Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {items.map((c) => {
            const expanded = expandedId === c.id;
            return (
              <li key={c.id} className="px-4 py-3" data-testid={`semi-franchise-content-${c.id}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{c.title}</p>
                    {c.summary && <p className="mt-1 text-sm text-gray-600">{c.summary}</p>}
                    <p className="mt-1 text-xs text-gray-500">{c.semiFranchiseName} · 게시 {formatDate(c.publishedAt)}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button className={btn.secondary} onClick={() => setExpandedId(expanded ? null : c.id)}>
                      {expanded ? '내용 닫기' : '내용 보기'}
                    </button>
                    <button className={btn.primary} disabled={busyId === c.id} onClick={() => copy(c)}>
                      {busyId === c.id ? '만드는 중...' : '내 매장 사본 만들기'}
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <ContentBody body={c.body} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!loading && total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button className={btn.secondary} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>이전</button>
          <span className="text-gray-600">{page} / {totalPages}</span>
          <button className={btn.secondary} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>다음</button>
        </div>
      )}
    </PharmacyPage>
  );
}

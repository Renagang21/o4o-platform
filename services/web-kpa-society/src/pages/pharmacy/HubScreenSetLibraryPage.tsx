/**
 * HubScreenSetLibraryPage — 매장 HUB 태블렛 화면(운영자·공급자 제공) 진열 + 내 태블렛 콘텐츠로 가져오기
 *
 * WO-O4O-OPERATOR-SCREEN-SET-HUB-PUBLISH-AND-STORE-INDEPENDENT-COPY-V1 (운영자 제공)
 * WO-O4O-SUPPLIER-SCREEN-SET-UI-STORE-HUB-INTEGRATION-V2C           (공급자 제공 섹션 추가)
 *
 * 운영자/공급자가 제작한 Screen Set 원본을 보고, "내 태블렛 콘텐츠로 가져오기" 로 **매장 소유 독립 사본**을
 * 만든다(가져오기=사본 불변식). 공급자 제공은 별도 소스 탭으로 구분하며, 공급자명·게시 대상(매장 유형)이
 * 추가로 표시된다. 매장 유형·의약품 정책 검사는 모두 서버(V2b)가 수행하며, 프론트는 서버 결과를 신뢰한다.
 *
 * 데이터 흐름(소스별):
 *   운영자: listOperatorTemplates / getOperatorTemplate / importOperatorTemplate  — /store/screen-set-hub/templates
 *   공급자: listSupplierTemplates / getSupplierTemplate / importSupplierTemplate  — /store/screen-set-hub/supplier-templates
 *   미리보기(공통): previewScreenSet({ templateKey, blocks }) — 기존 draft preview 재사용(내 매장 기준)
 *
 * 복사 후 매장 사본은 원본의 수정·보관·삭제와 무관하다(FK·동기화 없음).
 * 가져오기만 하고 코너에는 자동 적용하지 않는다 — 적용은 '코너별 운영'.
 * 원본에는 공개 URL·QR 이 없다(미리보기는 인증된 매장 화면에서만).
 *
 * 권한: store_owner (HubGuard + backend withStoreAuth).
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MonitorSmartphone, Download, X, Search, Store, Truck } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { DataTable, Pagination } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { TabletKioskPage, type TabletKioskApi, type TabletScreenResponse } from '@o4o/tablet-kiosk-core';
import {
  listOperatorTemplatesPaged,
  getOperatorTemplate,
  importOperatorTemplate,
  listSupplierTemplatesPaged,
  getSupplierTemplate,
  importSupplierTemplate,
  type OperatorTemplateListItem,
  type SupplierTemplateListItem,
  type SupplierHubTargetStoreType,
} from '../../api/storeScreenSetHub';
import type { ScreenBlock } from '../../api/tabletDisplays';
import { previewScreenSet } from '../../api/tabletDisplays';
import { getStoreSlug } from '../../api/pharmacyInfo';
// 라벨 드리프트 방지 — 제작기와 같은 사용자용 템플릿 라벨을 재사용(내부 template_key 미노출).
import { templateLabel } from '@o4o/tablet-screen-set-editor';

/** 신규 제작 대상 4종(legacy idle_touch_video 는 신규 선택·추천 제외 — WO). */
const TEMPLATE_FILTERS = [
  { key: '', label: '템플릿 전체' },
  { key: 'corner_information_basic_v1', label: '기본 코너 안내형' },
  { key: 'product_focus', label: '상품 집중형' },
  { key: 'corner_overview_qr', label: '코너 소개형' },
  { key: 'product_grid_qr', label: '제품 진열형' },
];

type SourceTab = 'operator' | 'supplier';

const PAGE_LIMIT = 20;

function targetLabel(t: SupplierHubTargetStoreType): string {
  if (t === 'pharmacy') return '약국';
  if (t === 'non_pharmacy') return '비약국';
  return '전체 매장';
}

/** 상세/미리보기 패널 공통 상태(소스 무관). */
interface DetailState {
  source: SourceTab;
  id: string;
  name: string;
  templateKey: string;
  blocks: ScreenBlock[];
  supplierName?: string | null;
  hubTargetStoreType?: SupplierHubTargetStoreType;
}

export function HubScreenSetLibraryPage() {
  const navigate = useNavigate();
  const [source, setSource] = useState<SourceTab>('operator');
  const [operatorItems, setOperatorItems] = useState<OperatorTemplateListItem[]>([]);
  const [supplierItems, setSupplierItems] = useState<SupplierTemplateListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  // WO-O4O-KPA-SCREEN-SET-HUB-SERVER-PAGINATION-V1: 서버 페이지네이션 상태(운영자/공급자 탭 공통).
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  // 상세/미리보기 패널
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [screen, setScreen] = useState<TabletScreenResponse | null>(null);
  const [view, setView] = useState<'tablet' | 'mobile'>('tablet');
  const [importing, setImporting] = useState(false);
  /** 가져오기 완료 후 안내(코너 미적용 고지). */
  const [imported, setImported] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const s = await getStoreSlug();
        if (!canceled) setStoreSlug(s);
      } catch { if (!canceled) setStoreSlug(null); }
    })();
    return () => { canceled = true; };
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { q: q.trim() || undefined, templateKey: templateFilter || undefined, page, limit: PAGE_LIMIT };
      if (source === 'operator') {
        const res = await listOperatorTemplatesPaged(params);
        setOperatorItems(res.items);
        setTotal(res.pagination.total);
      } else {
        const res = await listSupplierTemplatesPaged(params);
        setSupplierItems(res.items);
        setTotal(res.pagination.total);
      }
    } catch (e: any) {
      setError(e?.message || '태블렛 화면을 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [q, templateFilter, source, page]);

  useEffect(() => { void loadData(); }, [loadData]);

  // 검색어/템플릿 필터 변경 → 1페이지로(§8). 값 변경과 같은 렌더 배치라 loadData 는 1회만 실행.
  const handleSearchChange = useCallback((value: string) => { setQ(value); setPage(1); }, []);
  const handleTemplateFilterChange = useCallback((value: string) => { setTemplateFilter(value); setPage(1); }, []);

  // 소스 전환 시 열린 상세를 닫고 1페이지로 초기화한다(§7, 축 혼동 방지).
  const switchSource = useCallback((next: SourceTab) => {
    if (next === source) return;
    setSource(next);
    setPage(1);
    setTotal(0);
    setDetail(null);
    setScreen(null);
    setImported(null);
  }, [source]);

  // 미리보기: 원본 blocks → 기존 draft preview(내 매장 기준 렌더)
  const openDetail = useCallback(async (d: DetailState) => {
    setDetailLoading(true);
    setScreen(null);
    setImported(null);
    setView('tablet');
    setDetail(d);
    try {
      setScreen(await previewScreenSet({ templateKey: d.templateKey, blocks: d.blocks }));
    } catch {
      // 미리보기 실패해도 상세·가져오기는 가능(안내만).
      setScreen(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openOperatorDetail = useCallback(async (row: OperatorTemplateListItem) => {
    setDetailLoading(true);
    try {
      const full = await getOperatorTemplate(row.id);
      await openDetail({ source: 'operator', id: full.id, name: full.name, templateKey: full.templateKey, blocks: full.blocks });
    } catch (e: any) {
      toast.error(e?.message || '상세를 불러오지 못했습니다');
      setDetail(null);
      setDetailLoading(false);
    }
  }, [openDetail]);

  const openSupplierDetail = useCallback(async (row: SupplierTemplateListItem) => {
    setDetailLoading(true);
    try {
      const full = await getSupplierTemplate(row.id);
      await openDetail({
        source: 'supplier', id: full.id, name: full.name, templateKey: full.templateKey, blocks: full.blocks,
        supplierName: row.supplierName, hubTargetStoreType: full.hubTargetStoreType,
      });
    } catch (e: any) {
      // 비약국 의약품 세트는 403 — 사용자 문구로 구분.
      const msg = e?.code === 'MEDICATION_PHARMACY_ONLY'
        ? '의약품이 포함된 콘텐츠는 약국 매장만 열람할 수 있습니다.'
        : (e?.message || '상세를 불러오지 못했습니다');
      toast.error(msg);
      setDetail(null);
      setDetailLoading(false);
    }
  }, [openDetail]);

  const handleImport = useCallback(async () => {
    if (!detail || importing) return;
    setImporting(true);
    try {
      const copy = detail.source === 'operator'
        ? await importOperatorTemplate(detail.id)
        : await importSupplierTemplate(detail.id);
      setImported({ id: copy.id, name: copy.name });
      toast.success(`“${copy.name}” 을(를) 내 태블렛 콘텐츠로 가져왔습니다.`);
    } catch (e: any) {
      const msg = e?.code === 'MEDICATION_PHARMACY_ONLY'
        ? '의약품이 포함된 콘텐츠는 약국 매장만 가져올 수 있습니다.'
        : (e?.message || '가져오기에 실패했습니다');
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  }, [detail, importing]);

  // QR 모바일 미리보기는 대기 화면(idle_media)을 제외한다 — 실제 QR 채널 규칙(resolver)과 동일.
  const mobileScreen = useMemo<TabletScreenResponse | null>(() => {
    if (!screen) return null;
    const sections = (screen as any).sections;
    if (!Array.isArray(sections)) return screen;
    return { ...(screen as any), sections: sections.filter((s: any) => s?.blockType !== 'idle_media') };
  }, [screen]);

  // 미리보기 전용 kiosk API — 상품은 코너 문맥이 없으므로 빈 목록(임의 추정 금지), 상담 요청 차단.
  const previewApi = useMemo<TabletKioskApi>(() => ({
    fetchProducts: (_slug, params) =>
      Promise.resolve({ data: [], meta: { page: 1, limit: params?.limit ?? 20, total: 0, totalPages: 1 } }),
    submitInterest: async () => { throw new Error('미리보기에서는 상담 요청이 전송되지 않습니다.'); },
    checkStatus: async () => { throw new Error('미리보기에서는 상담 요청이 전송되지 않습니다.'); },
    fetchScreen: async () => { throw new Error('미리보기 전용'); },
  }), []);

  const operatorColumns: ListColumnDef<OperatorTemplateListItem>[] = useMemo(() => [
    {
      key: 'name',
      header: '콘텐츠명',
      // WO-O4O-KPA-STORE-HUB-UX-CONSISTENCY-CLEANUP-V1 (A-3): 현재 목록만 정렬되는 UI 제거.
      //   서버 정렬 도입 시 manualSort + sortKey/sortDirection/onSort 로 재도입할 것.
      render: (_v, item) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded flex items-center justify-center bg-slate-100 shrink-0 text-slate-400">
            <MonitorSmartphone className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium text-slate-800 text-sm truncate">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'producer',
      header: '출처',
      width: '100px',
      render: () => (
        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full border bg-blue-50 border-blue-200 text-blue-700">
          운영자 제공
        </span>
      ),
    },
    {
      key: 'templateKey',
      header: '템플릿',
      width: '140px',
      render: (_v, item) => <span className="text-xs text-slate-600">{templateLabel(item.templateKey)}</span>,
    },
    {
      key: 'updatedAt',
      header: '수정일',
      width: '120px',
      render: (_v, item) => (
        <span className="text-xs text-slate-500">{new Date(item.updatedAt).toLocaleDateString('ko-KR')}</span>
      ),
    },
  ], []);

  const supplierColumns: ListColumnDef<SupplierTemplateListItem>[] = useMemo(() => [
    {
      key: 'name',
      header: '콘텐츠명',
      // WO-O4O-KPA-STORE-HUB-UX-CONSISTENCY-CLEANUP-V1 (A-3): 현재 목록만 정렬되는 UI 제거.
      //   서버 정렬 도입 시 manualSort + sortKey/sortDirection/onSort 로 재도입할 것.
      render: (_v, item) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded flex items-center justify-center bg-slate-100 shrink-0 text-slate-400">
            <MonitorSmartphone className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium text-slate-800 text-sm truncate">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'supplierName',
      header: '공급자',
      width: '140px',
      render: (_v, item) => <span className="text-xs text-slate-600 truncate">{item.supplierName || '공급자'}</span>,
    },
    {
      key: 'hubTargetStoreType',
      header: '게시 대상',
      width: '100px',
      render: (_v, item) => (
        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full border bg-violet-50 border-violet-200 text-violet-700">
          {targetLabel(item.hubTargetStoreType)}
        </span>
      ),
    },
    {
      key: 'templateKey',
      header: '템플릿',
      width: '130px',
      render: (_v, item) => <span className="text-xs text-slate-600">{templateLabel(item.templateKey)}</span>,
    },
    {
      key: 'updatedAt',
      header: '수정일',
      width: '110px',
      render: (_v, item) => (
        <span className="text-xs text-slate-500">{new Date(item.updatedAt).toLocaleDateString('ko-KR')}</span>
      ),
    },
  ], []);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <MonitorSmartphone className="w-5 h-5 text-indigo-600" />
          태블렛 화면 (HUB)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          운영자·공급자가 제작한 태블렛 화면을 내 매장으로 가져올 수 있습니다. 가져오면 <b>내 매장 소유의 사본</b>이 만들어지며,
          이후 원본을 수정·삭제해도 내 콘텐츠는 영향을 받지 않습니다.
        </p>
      </div>

      {/* 소스 탭: 운영자 제공 / 공급자 제공 */}
      <div className="flex items-center gap-1 mb-3 border-b border-slate-200">
        <button
          onClick={() => switchSource('operator')}
          className={`px-3 py-2 text-sm font-semibold inline-flex items-center gap-1.5 border-b-2 -mb-px ${
            source === 'operator' ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Store className="w-4 h-4" /> 운영자 제공
        </button>
        <button
          onClick={() => switchSource('supplier')}
          className={`px-3 py-2 text-sm font-semibold inline-flex items-center gap-1.5 border-b-2 -mb-px ${
            source === 'supplier' ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Truck className="w-4 h-4" /> 공급자 제공
        </button>
      </div>

      {/* 검색 + 템플릿 필터 */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="콘텐츠명 검색"
            className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <select
          value={templateFilter}
          onChange={(e) => handleTemplateFilterChange(e.target.value)}
          aria-label="템플릿 필터"
          className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm"
        >
          {TEMPLATE_FILTERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>

      {/* 목록 조회 실패 — 오류를 성공/0건으로 위장하지 않고 명시 + 재시도 제공(§11, load-error 계약 4상태). */}
      {error && (
        <div className="mb-3 flex items-center justify-between gap-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <span className="min-w-0">{error}</span>
          <button
            onClick={() => void loadData()}
            disabled={isLoading}
            className="shrink-0 px-2.5 py-1 rounded-md border border-red-300 text-red-700 text-xs font-semibold hover:bg-red-100 disabled:opacity-50"
          >
            다시 시도
          </button>
        </div>
      )}

      {source === 'operator' ? (
        <DataTable<OperatorTemplateListItem>
          columns={operatorColumns}
          data={operatorItems}
          rowKey="id"
          loading={isLoading}
          emptyMessage="아직 운영자가 게시한 태블렛 화면이 없습니다"
          tableId="store-hub-screen-set-operator"
          onRowClick={(row) => void openOperatorDetail(row)}
        />
      ) : (
        <DataTable<SupplierTemplateListItem>
          columns={supplierColumns}
          data={supplierItems}
          rowKey="id"
          loading={isLoading}
          emptyMessage="아직 내 매장 유형에 게시된 공급자 태블렛 화면이 없습니다"
          tableId="store-hub-screen-set-supplier"
          onRowClick={(row) => void openSupplierDetail(row)}
        />
      )}

      {/* 표준 Pagination — 구 LIMIT 200 무고지 절단 제거(WO-O4O-KPA-SCREEN-SET-HUB-SERVER-PAGINATION-V1). 한 페이지 이하면 컴포넌트가 자체적으로 미노출. */}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} />
      )}

      {/* 상세 · 미리보기 · 가져오기 패널 */}
      {detail && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
          <div className="flex-1 bg-black/40" onClick={() => setDetail(null)} />
          <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-bold text-slate-800 truncate">{detail.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  템플릿 <b>{templateLabel(detail.templateKey)}</b>
                  {detail.source === 'operator'
                    ? ' · 운영자 제공'
                    : ` · 공급자 제공${detail.supplierName ? ` (${detail.supplierName})` : ''} · 대상 ${detail.hubTargetStoreType ? targetLabel(detail.hubTargetStoreType) : '-'}`}
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="p-1.5 rounded hover:bg-slate-100" aria-label="닫기">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* 가져오기 완료 안내 — 코너 자동 적용 없음 */}
            {imported ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 space-y-2">
                <div className="text-sm font-semibold text-emerald-800">
                  “{imported.name}” 을(를) 내 태블렛 콘텐츠로 가져왔습니다.
                </div>
                <p className="text-[12px] text-emerald-900 leading-relaxed">
                  매장 소유의 <b>독립 사본</b>이 만들어졌습니다. 이후 원본이 수정·게시 해제되어도 이 사본은 영향을 받지 않습니다.
                  <br /><b>코너에는 아직 적용되지 않았습니다.</b> 실제 태블렛에 띄우려면 ‘코너별 운영’에서 이 콘텐츠를 선택해 주세요.
                </p>
                <button
                  onClick={() => navigate('/store/commerce/tablet-displays', {
                    state: { tab: 'contents', highlightScreenSetId: imported.id },
                  })}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                >
                  내 태블렛 콘텐츠에서 확인
                </button>
              </div>
            ) : (
              <>
                <p className="text-[12px] text-slate-500 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  이 화면을 가져오면 <b>그 시점의 내용을 복사한 매장 소유 독립 사본</b>이 만들어집니다. 가져온 후 수정할 수 있으며,
                  {detail.source === 'supplier' ? ' 공급자 원본' : ' 운영자 원본'}의 변경 사항은 자동으로 반영되지 않습니다. 가져오기만으로 태블렛에 자동 적용되지 않습니다.
                </p>
                <button
                  onClick={() => void handleImport()}
                  disabled={importing}
                  className="w-full px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {importing ? '가져오는 중…' : '내 태블렛 콘텐츠로 가져오기'}
                </button>
              </>
            )}

            {/* 미리보기 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-slate-700">미리보기</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setView('tablet')}
                    className={`px-2 py-1 text-xs rounded border ${view === 'tablet' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-slate-200 text-slate-500'}`}
                  >태블렛 화면</button>
                  <button
                    onClick={() => setView('mobile')}
                    className={`px-2 py-1 text-xs rounded border ${view === 'mobile' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-slate-200 text-slate-500'}`}
                  >QR 모바일 화면</button>
                </div>
              </div>
              {detailLoading ? (
                <div className="text-sm text-slate-400 py-8 text-center">불러오는 중…</div>
              ) : screen ? (
                // kiosk 뷰어는 뷰포트를 채우도록 렌더되므로 반드시 relative+overflow:hidden 박스로 가둔다
                // (제작기 미리보기와 동일 패턴). 없으면 패널 전체를 덮어 버튼 클릭이 막힌다.
                <div className="bg-slate-100 p-3 flex items-center justify-center rounded-lg">
                  {view === 'tablet' ? (
                    <div style={{ position: 'relative', overflow: 'hidden', width: '100%', aspectRatio: '16 / 10', background: '#000', borderRadius: 10 }}>
                      <TabletKioskPage api={previewApi} slug={storeSlug ?? undefined} previewScreen={screen} embedded showQrBadge={false} previewLayoutOnly />
                    </div>
                  ) : (
                    <div style={{ position: 'relative', overflow: 'hidden', width: 'min(100%, 240px)', aspectRatio: '9 / 19', background: '#000', borderRadius: 18 }}>
                      <TabletKioskPage api={previewApi} slug={storeSlug ?? undefined} previewScreen={mobileScreen} embedded showQrBadge={false} previewLayoutOnly />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-400 py-8 text-center">미리보기를 불러오지 못했습니다.</div>
              )}
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                템플릿 배치를 보여줍니다. 상품은 가져온 뒤 이 콘텐츠를 적용한 코너의 진열 상품으로 표시됩니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HubScreenSetLibraryPage;

/**
 * HubScreenSetLibraryPage — 매장 HUB 타블렛 화면(운영자 원본) 진열 + 내 타블렛 콘텐츠로 가져오기
 *
 * WO-O4O-OPERATOR-SCREEN-SET-HUB-PUBLISH-AND-STORE-INDEPENDENT-COPY-V1
 *
 * 운영자가 제작한 Screen Set 원본(origin='operator', status='operator_template')을 보고,
 * "내 타블렛 콘텐츠로 가져오기" 로 **매장 소유 독립 사본**을 만든다(가져오기=사본 불변식).
 *
 * 데이터 흐름:
 *   - 목록: listOperatorTemplates({ q, templateKey })   — /store/screen-set-hub/templates
 *   - 상세: getOperatorTemplate(id)                     — blocks 포함(미리보기 입력)
 *   - 미리보기: previewScreenSet({ templateKey, blocks }) — 기존 draft preview 재사용(내 매장 기준)
 *   - 가져오기: importOperatorTemplate(id)              — 매장 사본 INSERT(트랜잭션, 새 ID)
 *
 * 복사 후 매장 사본은 운영자 원본의 수정·보관·삭제와 무관하다(FK·동기화 없음).
 * 가져오기만 하고 코너에는 자동 적용하지 않는다 — 적용은 '코너별 운영'.
 * 운영자 원본에는 공개 URL·QR 이 없다(미리보기는 인증된 매장 화면에서만).
 *
 * 권한: store_owner (HubGuard + backend withStoreAuth).
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MonitorSmartphone, Download, X, Search } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { TabletKioskPage, type TabletKioskApi, type TabletScreenResponse } from '@o4o/tablet-kiosk-core';
import {
  listOperatorTemplates,
  getOperatorTemplate,
  importOperatorTemplate,
  type OperatorTemplateListItem,
  type OperatorTemplateDetail,
} from '../../api/storeScreenSetHub';
import { previewScreenSet } from '../../api/tabletDisplays';
import { getStoreSlug } from '../../api/pharmacyInfo';
// 라벨 드리프트 방지 — 제작기와 같은 사용자용 템플릿 라벨을 재사용(내부 template_key 미노출).
import { templateLabel } from './TabletScreenSetManager';

/** 신규 제작 대상 4종(legacy idle_touch_video 는 신규 선택·추천 제외 — WO). */
const TEMPLATE_FILTERS = [
  { key: '', label: '템플릿 전체' },
  { key: 'corner_information_basic_v1', label: '기본 코너 안내형' },
  { key: 'product_focus', label: '상품 집중형' },
  { key: 'corner_overview_qr', label: '코너 소개형' },
  { key: 'product_grid_qr', label: '제품 진열형' },
];

export function HubScreenSetLibraryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<OperatorTemplateListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [storeSlug, setStoreSlug] = useState<string | null>(null);

  // 상세/미리보기 패널
  const [detail, setDetail] = useState<OperatorTemplateDetail | null>(null);
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
      setItems(await listOperatorTemplates({ q: q.trim() || undefined, templateKey: templateFilter || undefined }));
    } catch (e: any) {
      setError(e?.message || '운영자 타블렛 화면을 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [q, templateFilter]);

  useEffect(() => { void loadData(); }, [loadData]);

  // 미리보기: 운영자 원본 blocks → 기존 draft preview(내 매장 기준 렌더)
  const openDetail = useCallback(async (row: OperatorTemplateListItem) => {
    setDetailLoading(true);
    setScreen(null);
    setImported(null);
    setView('tablet');
    try {
      const d = await getOperatorTemplate(row.id);
      setDetail(d);
      try {
        setScreen(await previewScreenSet({ templateKey: d.templateKey, blocks: d.blocks }));
      } catch {
        // 미리보기 실패해도 상세·가져오기는 가능(안내만).
        setScreen(null);
      }
    } catch (e: any) {
      toast.error(e?.message || '상세를 불러오지 못했습니다');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!detail || importing) return;
    setImporting(true);
    try {
      const copy = await importOperatorTemplate(detail.id);
      setImported({ id: copy.id, name: copy.name });
      toast.success(`“${copy.name}” 을(를) 내 타블렛 콘텐츠로 가져왔습니다.`);
    } catch (e: any) {
      toast.error(e?.message || '가져오기에 실패했습니다');
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

  const columns: ListColumnDef<OperatorTemplateListItem>[] = useMemo(() => [
    {
      key: 'name',
      header: '콘텐츠명',
      sortable: true,
      sortAccessor: (item) => item.name,
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
          운영자 자료
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

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <MonitorSmartphone className="w-5 h-5 text-indigo-600" />
          타블렛 화면 (운영자 자료)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          운영자가 제작한 타블렛 화면을 내 매장으로 가져올 수 있습니다. 가져오면 <b>내 매장 소유의 사본</b>이 만들어지며,
          이후 운영자가 원본을 수정·삭제해도 내 콘텐츠는 영향을 받지 않습니다.
        </p>
      </div>

      {/* 검색 + 템플릿 필터 */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="콘텐츠명 검색"
            className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <select
          value={templateFilter}
          onChange={(e) => setTemplateFilter(e.target.value)}
          aria-label="템플릿 필터"
          className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm"
        >
          {TEMPLATE_FILTERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      <DataTable<OperatorTemplateListItem>
        columns={columns}
        data={items}
        rowKey="id"
        loading={isLoading}
        emptyMessage="아직 운영자가 게시한 타블렛 화면이 없습니다"
        tableId="store-hub-screen-set"
        onRowClick={(row) => void openDetail(row)}
      />

      {/* 상세 · 미리보기 · 가져오기 패널 */}
      {detail && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
          <div className="flex-1 bg-black/40" onClick={() => setDetail(null)} />
          <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-bold text-slate-800 truncate">{detail.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  템플릿 <b>{templateLabel(detail.templateKey)}</b> · 운영자 자료
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
                  “{imported.name}” 을(를) 내 타블렛 콘텐츠로 가져왔습니다.
                </div>
                <p className="text-[12px] text-emerald-900 leading-relaxed">
                  <b>코너에는 아직 적용되지 않았습니다.</b> 실제 태블릿에 띄우려면 ‘코너별 운영’에서 이 콘텐츠를 선택해 주세요.
                </p>
                <button
                  onClick={() => navigate('/store/commerce/tablet-displays')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                >
                  내 타블렛 콘텐츠에서 확인
                </button>
              </div>
            ) : (
              <button
                onClick={() => void handleImport()}
                disabled={importing}
                className="w-full px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                {importing ? '가져오는 중…' : '내 타블렛 콘텐츠로 가져오기'}
              </button>
            )}

            {/* 미리보기 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-slate-700">미리보기</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setView('tablet')}
                    className={`px-2 py-1 text-xs rounded border ${view === 'tablet' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-slate-200 text-slate-500'}`}
                  >태블릿 화면</button>
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

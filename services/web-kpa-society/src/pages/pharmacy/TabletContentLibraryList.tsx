/**
 * TabletContentLibraryList — 태블렛 콘텐츠(화면 세트) O4O 표준 리스트
 *
 * WO-O4O-KPA-TABLET-CONTENT-STANDARD-LIST-V1 (기반)
 * WO-O4O-KPA-TABLET-CONTENT-LIST-SEARCH-PAGINATION-PREVIEW-V1
 *   - 검색 + 템플릿/상태/사용코너 필터 + 페이지네이션(페이지당 표시 수 선택)
 *   - 행 단위 미리보기(kebab '미리보기' + 콘텐츠명 클릭) → read-only Screen Set preview 모달(태블렛/QR 모바일)
 * WO-O4O-KPA-TABLET-CONTENT-LIST-REMOVE-LABEL-V1
 *   - 사용자 문구 '보관' → '리스트에서 제거'(내부 status/API 는 archived/soft-delete 그대로).
 *
 * 범위(금지선 준수): 기존 Screen Set 관리/미리보기 API 만 사용. API/DB/runtime 변경 없음.
 *   Screen Set API 는 전체 목록 반환 → 검색/필터/페이지네이션은 client-side.
 *   미리보기 = 기존 previewScreenSet(저장 전 draft resolve) + TabletKioskPage embedded 재사용.
 */

import { useMemo, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { Edit3, Trash2, Plus, Layers, Eye, X, Loader2, MonitorSmartphone, Check, QrCode, Download } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { ActionBar, BulkResultModal, RowActionMenu } from '@o4o/ui';
import {
  DataTable,
  Pagination,
  defineActionPolicy,
  buildRowActions,
  useBatchAction,
  type ListColumnDef,
} from '@o4o/operator-ux-core';
import { TabletKioskPage, type TabletKioskApi, type TabletScreenResponse } from '@o4o/tablet-kiosk-core';
import { archiveScreenSet, fetchScreenSet, previewScreenSet, type ScreenSet, type ScreenSetStatus } from '../../api/tabletDisplays';
// WO-O4O-SCREEN-SET-CORNER-QR-VISIBILITY-V1 §범위⑦: 기존 매장 QR 출력/다운로드 기능 재사용(신규 엔드포인트 없음).
import {
  getStoreQrCodes,
  fetchQrExportBlob,
  downloadQrExport,
  QR_EXPORT_PRESETS,
  type StoreQrCode,
} from '../../api/storeQr';

// ─── 상수 ────────────────────────────────────────────────────────────────────

// WO-O4O-KPA-TABLET-REMOVE-DRAFT-CONCEPT-V1: 사용자 화면 status 를 2분류로 통일 —
//   '사용 가능'(코너에 선택·적용 가능: active·draft) / '보관'(archived). 실제 적용 여부는 '현재 적용 코너'가 담당.
//   내부 status/API/enum(draft/active/archived) 는 그대로. '초안'·'활성' 표현은 사용자에게 노출하지 않는다.
const STATUS_LABEL: Record<ScreenSetStatus, string> = {
  draft: '사용 가능',
  active: '사용 가능',
  archived: '보관',
  operator_template: '운영자 템플릿',
};
const STATUS_BADGE_CLASS: Record<ScreenSetStatus, string> = {
  draft: 'bg-emerald-50 text-emerald-700',
  active: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-amber-50 text-amber-700',
  operator_template: 'bg-indigo-50 text-indigo-700',
};

type StatusFilter = 'all' | 'available' | 'archived';
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'available', label: '사용 가능' },
  { value: 'archived', label: '보관' },
];

const PAGE_SIZES = [10, 20, 50];

// WO-...-PREVIEW-CORNER-CONTEXT-AND-LABEL-FIX-V1: 리스트 단독 미리보기는 코너 문맥 없음 → 상품 미표시(페이지 previewApi 와 동일 sentinel).
const PREVIEW_NO_CORNER = '__none__';

// ─── Action Policy (개별 작업 = 점 3개 kebab) ─────────────────────────────────
const contentActionPolicy = defineActionPolicy<ScreenSet>('kpa:tablet-content', {
  inlineMax: 0,
  rules: [
    { key: 'preview', label: '미리보기' },
    // WO-O4O-STORE-TABLET-LAST-MILE-UX-CLEANUP-V1: 콘텐츠 → 대상 태블렛에 바로 적용(보관 제외).
    { key: 'apply', label: '태블렛에 적용', visible: (s) => s.status !== 'archived' },
    // WO-O4O-SCREEN-SET-CORNER-QR-VISIBILITY-V1 §범위⑦: 자동 생성된 코너 QR 보기·출력 진입.
    //   slug 가 없는 콘텐츠(아직 QR 미확보)는 노출하지 않는다 — 없는 QR 을 있는 것처럼 보이지 않게.
    { key: 'qr', label: 'QR 보기·출력', visible: (s) => !!s.publicQrSlug && s.status !== 'archived' },
    { key: 'edit', label: '수정' },
    // 보관(= soft delete/archived). 확인은 상위 handleArchive 에서 수행(중복 방지). 내부 status 는 archived 그대로.
    { key: 'archive', label: '보관', variant: 'warning', visible: (s) => s.status !== 'archived' },
  ],
});
const ACTION_ICONS: Record<string, ReactNode> = {
  preview: <Eye className="w-4 h-4" />,
  apply: <MonitorSmartphone className="w-4 h-4" />,
  edit: <Edit3 className="w-4 h-4" />,
  archive: <Trash2 className="w-4 h-4" />,
  qr: <QrCode className="w-4 h-4" />,
};

/** 적용 대상 태블렛(최소 형태 — StoreTabletDisplaysPage 의 TabletType 하위집합). */
export interface ApplyTargetTablet {
  id: string;
  name: string;
  location?: string | null;
  currentScreenSetId?: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  /** 전체 화면 세트(부모 reload 가 includeArchived 포함해 전달). */
  sets: ScreenSet[];
  loading: boolean;
  busy: boolean;
  /** 세트 id → 적용 중인 코너 이름 목록(부모 계산). */
  usageBySet: Record<string, string[]>;
  /** templateKey → 사람이 읽는 라벨(부모 TEMPLATE_OPTIONS 기준). */
  templateLabel: (key: string | null | undefined) => string;
  /** WO-O4O-KPA-TABLET-REMOVE-IDLE-VIDEO-TEMPLATE-V1: 필터 드롭다운에서 숨길 legacy 전용 template_key.
   *  (기존 콘텐츠는 목록 '템플릿 전체'에 그대로 노출·편집 가능 — 필터 선택지에서만 제외.) */
  hiddenTemplateFilterKeys?: string[];
  /** 태블렛 화면 만들기 진입(부모 생성 폼 오픈). */
  onCreate: () => void;
  /** 개별 수정(부모 인라인 편집 패널 오픈). dirty guard 는 부모에서 처리. */
  onEdit: (id: string) => void;
  /** 개별 리스트에서 제거(부모 handleArchive — 확인 + 적용중 가드 + reload 포함). */
  onArchive: (set: ScreenSet) => void;
  /** 일괄 작업 후 목록 갱신. */
  onRefresh: () => void;
  /** 행 미리보기(kiosk-core 재사용) — 미주입 시 미리보기 비활성. */
  previewApi?: TabletKioskApi;
  storeSlug?: string | null;
  /** WO-...-PREVIEW-CORNER-CONTEXT-AND-LABEL-FIX-V1: 미리보기 코너 문맥. 리스트 단독은 코너 없음(상품 미표시). */
  onPreviewContext?: (tabletId: string | null) => void;
  /** WO-O4O-STORE-TABLET-LAST-MILE-UX-CLEANUP-V1: 적용 대상 태블렛 목록(설치 코너 표시용). */
  tablets?: ApplyTargetTablet[];
  /** 콘텐츠 → 대상 태블렛 적용(기존 current-screen-set API). 성공 시 부모가 tablets 상태 갱신. */
  onApplyToTablet?: (screenSetId: string, tabletId: string) => Promise<void>;
  /** HUB 가져오기 완료 후 방금 가져온 사본 하이라이트. */
  highlightId?: string | null;
}

export default function TabletContentLibraryList({
  sets,
  loading,
  busy,
  usageBySet,
  templateLabel,
  hiddenTemplateFilterKeys,
  onCreate,
  onEdit,
  onArchive,
  onRefresh,
  previewApi,
  storeSlug,
  onPreviewContext,
  tablets,
  onApplyToTablet,
  highlightId,
}: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('available');
  const [templateFilter, setTemplateFilter] = useState<string>('');
  const [cornerFilter, setCornerFilter] = useState<string>(''); // '' 전체 / '__none__' 미사용 / 코너명
  const [pageSize, setPageSize] = useState<number>(20);
  const [page, setPage] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const batch = useBatchAction();

  // WO-O4O-STORE-TABLET-LAST-MILE-UX-CLEANUP-V1: '태블렛에 적용' 모달 + 하이라이트/스크롤.
  const [applyFor, setApplyFor] = useState<ScreenSet | null>(null);
  const [applyBusyTabletId, setApplyBusyTabletId] = useState<string | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const listTopRef = useRef<HTMLDivElement | null>(null);

  // HUB 가져오기 완료 → 방금 가져온 사본을 보이게: 필터 초기화(전체) + 1페이지(최신순이라 상단) + 스크롤 + 하이라이트.
  useEffect(() => {
    if (!highlightId) return;
    setStatusFilter('all');
    setSearch('');
    setTemplateFilter('');
    setCornerFilter('');
    setPage(1);
    setActiveHighlight(highlightId);
    const scrollTimer = setTimeout(() => {
      listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    const clearTimer = setTimeout(() => setActiveHighlight(null), 8000);
    return () => { clearTimeout(scrollTimer); clearTimeout(clearTimer); };
  }, [highlightId]);

  const openApply = useCallback((s: ScreenSet) => {
    if (!onApplyToTablet) return;
    if (!tablets || tablets.length === 0) {
      toast.error('먼저 ‘코너별 운영’에서 태블렛을 추가해 주세요.');
      return;
    }
    setApplyFor(s);
  }, [tablets, onApplyToTablet]);

  const handleApplySelect = useCallback(async (tabletId: string) => {
    if (!applyFor || !onApplyToTablet || applyBusyTabletId) return;
    setApplyBusyTabletId(tabletId);
    try {
      await onApplyToTablet(applyFor.id, tabletId);
      setApplyFor(null);
      onRefresh();
    } catch {
      /* 오류 토스트는 부모(onApplyToTablet)에서 표시 */
    } finally {
      setApplyBusyTabletId(null);
    }
  }, [applyFor, onApplyToTablet, applyBusyTabletId, onRefresh]);

  // 미리보기 모달 (WO-...-SEARCH-PAGINATION-PREVIEW-V1)
  const canPreview = !!previewApi && !!storeSlug;
  const [preview, setPreview] = useState<{ name: string; screen: TabletScreenResponse; view: 'tablet' | 'mobile' } | null>(null);
  const [previewBusy, setPreviewBusy] = useState<string | null>(null);
  const handlePreview = useCallback(async (s: ScreenSet) => {
    if (!canPreview) { toast.error('매장 공개 주소를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.'); return; }
    if (previewBusy) return;
    // WO-...-PREVIEW-CORNER-CONTEXT-AND-LABEL-FIX-V1: 리스트 단독 미리보기 = 코너 문맥 없음 → Screen Set 원본 기준(상품 미표시).
    onPreviewContext?.(PREVIEW_NO_CORNER);
    setPreviewBusy(s.id);
    try {
      const detail = await fetchScreenSet(s.id);
      const screen = await previewScreenSet({ templateKey: detail.templateKey, blocks: detail.blocks });
      setPreview({ name: s.name, screen, view: 'tablet' });
    } catch (e: any) {
      toast.error(e?.message || '미리보기를 불러오지 못했습니다.');
    } finally { setPreviewBusy(null); }
  }, [canPreview, previewBusy]);

  // ── 코너 QR 보기·출력 (WO-O4O-SCREEN-SET-CORNER-QR-VISIBILITY-V1 §범위⑦) ──
  //   자동 생성된 screen_set QR 을 '매장 QR 관리'로 이동하지 않고 콘텐츠 목록에서 바로 확인·출력한다.
  //   미리보기 이미지·다운로드는 기존 QR export 엔드포인트(GET /pharmacy/qr/:id/export)를 그대로 사용한다.
  const [qrFor, setQrFor] = useState<{ set: ScreenSet; qr: StoreQrCode | null; imageUrl: string | null } | null>(null);
  const [qrBusy, setQrBusy] = useState<string | null>(null);
  const [qrDownloading, setQrDownloading] = useState<string | null>(null);
  const qrImageUrlRef = useRef<string | null>(null);

  const closeQr = useCallback(() => {
    if (qrImageUrlRef.current) { URL.revokeObjectURL(qrImageUrlRef.current); qrImageUrlRef.current = null; }
    setQrFor(null);
  }, []);
  useEffect(() => () => { if (qrImageUrlRef.current) URL.revokeObjectURL(qrImageUrlRef.current); }, []);

  const openQr = useCallback(async (s: ScreenSet) => {
    if (qrBusy) return;
    if (!s.publicQrSlug) { toast.error('이 콘텐츠에는 아직 QR이 없습니다. 콘텐츠를 다시 저장하면 자동으로 만들어집니다.'); return; }
    setQrBusy(s.id);
    try {
      // screen_set QR 은 저장 시 자동 생성된다 — 목록에서 이 콘텐츠의 QR 레코드를 찾는다(신규 API 없음).
      const res = await getStoreQrCodes({ limit: 200 });
      const qr = (res?.data?.items ?? []).find(
        (q) => q.landingType === 'screen_set' && q.landingTargetId === s.id,
      ) ?? null;
      let imageUrl: string | null = null;
      if (qr) {
        try {
          const { blob } = await fetchQrExportBlob(qr.id, 'png', 'medium');
          if (qrImageUrlRef.current) URL.revokeObjectURL(qrImageUrlRef.current);
          imageUrl = URL.createObjectURL(blob);
          qrImageUrlRef.current = imageUrl;
        } catch { /* 이미지 실패는 모달을 막지 않는다(주소·안내는 계속 표시) */ }
      }
      setQrFor({ set: s, qr, imageUrl });
    } catch (e: any) {
      toast.error(e?.message || 'QR 정보를 불러오지 못했습니다.');
    } finally { setQrBusy(null); }
  }, [qrBusy]);

  const handleQrDownload = useCallback(async (format: 'png' | 'svg' | 'pdf', preset: string, key: string) => {
    if (!qrFor?.qr || qrDownloading) return;
    setQrDownloading(key);
    try {
      await downloadQrExport(qrFor.qr.id, format, preset as any);
    } catch (e: any) {
      toast.error(e?.message || 'QR 파일을 내려받지 못했습니다.');
    } finally { setQrDownloading(null); }
  }, [qrFor, qrDownloading]);

  // ── 필터 옵션(현재 목록에서 도출) ──
  const templateOptions = useMemo(() => {
    // WO-O4O-KPA-TABLET-REMOVE-IDLE-VIDEO-TEMPLATE-V1: legacy 전용 키(idle_touch_video)는 필터 선택지에서 제외.
    //   해당 콘텐츠는 '템플릿 전체'에 여전히 노출되며 badge/편집은 유지된다.
    const hidden = new Set(hiddenTemplateFilterKeys ?? []);
    const keys = Array.from(new Set(sets.map((s) => s.templateKey))).filter((k) => !hidden.has(k));
    return keys.map((k) => ({ key: k, label: templateLabel(k) })).sort((a, b) => a.label.localeCompare(b.label, 'ko'));
  }, [sets, templateLabel, hiddenTemplateFilterKeys]);
  const cornerOptions = useMemo(() => {
    const names = new Set<string>();
    Object.values(usageBySet).forEach((arr) => arr.forEach((n) => names.add(n)));
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [usageBySet]);

  // ── client-side 필터/검색/정렬 ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sets
      .filter((s) => (statusFilter === 'all' ? true : statusFilter === 'archived' ? s.status === 'archived' : s.status !== 'archived'))
      .filter((s) => !templateFilter || s.templateKey === templateFilter)
      .filter((s) => {
        if (!cornerFilter) return true;
        const corners = usageBySet[s.id] ?? [];
        if (cornerFilter === '__none__') return corners.length === 0;
        return corners.includes(cornerFilter);
      })
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [sets, search, statusFilter, templateFilter, cornerFilter, usageBySet]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => filtered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize),
    [filtered, clampedPage, pageSize],
  );

  // 검색/필터/페이지크기 변경 시 1페이지로 + 선택 해제.
  useEffect(() => { setPage(1); }, [search, statusFilter, templateFilter, cornerFilter, pageSize]);
  useEffect(() => { setSelectedKeys(new Set()); }, [page, search, statusFilter, templateFilter, cornerFilter, pageSize, sets]);

  // ── 일괄 보관 ──
  const batchArchiveOp = useCallback(
    async (
      ids: string[],
    ): Promise<{ data: { results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> } }> => {
      const settled = await Promise.allSettled(ids.map((id) => archiveScreenSet(id)));
      const results = settled.map((r, i) => {
        const id = ids[i];
        if (r.status === 'fulfilled') return { id, status: 'success' as const };
        const err = r.reason as { code?: string; message?: string } | null;
        const error = (err?.code === 'SCREEN_SET_IN_USE' || err?.code === 'ARCHIVE_BLOCKED_CONNECTED')
          ? '코너에 연결되어 있어 보관할 수 없습니다. 먼저 코너 연결을 해제하세요'
          : err?.message || '보관하지 못했습니다';
        return { id, status: 'failed' as const, error };
      });
      return { data: { results } };
    },
    [],
  );

  const handleBulkArchive = useCallback(async () => {
    const ids = pageRows.filter((s) => selectedKeys.has(s.id) && s.status !== 'archived').map((s) => s.id);
    if (ids.length === 0) {
      toast.error('보관할 수 있는 항목이 없습니다. (이미 보관된 항목은 제외됩니다)');
      return;
    }
    if (!window.confirm(`선택한 ${ids.length}개 콘텐츠를 보관하시겠습니까?\n콘텐츠는 삭제되지 않으며, ‘보관’ 필터에서 다시 확인할 수 있습니다.\n(코너에 연결된 콘텐츠는 먼저 연결을 해제해야 합니다.)`)) return;
    const result = await batch.executeBatch(batchArchiveOp, ids);
    if (result.successCount > 0) {
      setSelectedKeys(new Set());
      onRefresh();
    }
  }, [pageRows, selectedKeys, batch, batchArchiveOp, onRefresh]);

  const archivableSelectedCount = useMemo(
    () => pageRows.filter((s) => selectedKeys.has(s.id) && s.status !== 'archived').length,
    [pageRows, selectedKeys],
  );

  // ── Columns ──
  const columns: ListColumnDef<ScreenSet>[] = useMemo(() => [
    {
      key: 'name',
      header: '콘텐츠명',
      sortable: true,
      sortAccessor: (s) => s.name,
      render: (_v, s) => {
        const highlighted = s.id === activeHighlight;
        return (
          <div className={`flex items-center gap-2 min-w-0 ${highlighted ? 'ring-2 ring-teal-400 rounded-lg bg-teal-50/60 -mx-1 px-1 py-0.5' : ''}`}>
            <div className="w-7 h-7 rounded flex items-center justify-center bg-indigo-50 shrink-0 text-indigo-500">
              <Layers className="w-3.5 h-3.5" />
            </div>
            {/* WO-...-REMOVE-REUSE-BADGE-V1: 모든 Screen Set 이 코너와 독립돼 원래 재사용 가능 → '재사용' 배지는 구분정보 아님(제거). */}
            <span className="font-medium text-slate-800 text-sm truncate">{s.name}</span>
            {/* WO-O4O-STORE-TABLET-LAST-MILE-UX-CLEANUP-V1: 방금 가져온 사본 하이라이트 배지. */}
            {highlighted && (
              <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-teal-600 text-white">방금 가져옴</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'templateKey',
      header: '템플릿',
      width: '120px',
      render: (_v, s) => <span className="text-xs text-slate-500">{templateLabel(s.templateKey)}</span>,
    },
    {
      key: 'status',
      header: '상태',
      width: '110px',
      render: (_v, s) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE_CLASS[s.status]}`}>
          {STATUS_LABEL[s.status]}
        </span>
      ),
    },
    {
      key: 'usage',
      // WO-...-PREVIEW-CORNER-CONTEXT-AND-LABEL-FIX-V1: usageBySet = '현재 화면으로 적용된' 코너(연결만은 미포함) → 정확한 라벨.
      header: '현재 적용 코너',
      render: (_v, s) => {
        const corners = usageBySet[s.id] ?? [];
        return corners.length > 0 ? (
          <span className="text-xs text-emerald-700 truncate" title={`현재 적용 코너: ${corners.join(', ')}`}>{corners.join(', ')}</span>
        ) : (
          <span className="text-xs text-slate-400" title="현재 어느 코너에도 적용되지 않음(연결만 되어 있을 수 있음)">현재 미적용</span>
        );
      },
    },
    {
      key: 'blockCount',
      header: '블록 수',
      width: '70px',
      align: 'center',
      render: (_v, s) => <span className="text-xs text-slate-500">{s.blockCount ?? 0}</span>,
    },
    {
      key: 'updatedAt',
      header: '수정일',
      width: '100px',
      sortable: true,
      sortAccessor: (s) => new Date(s.updatedAt).getTime(),
      render: (_v, s) => (
        <span className="text-xs text-slate-500">{new Date(s.updatedAt).toLocaleDateString('ko-KR')}</span>
      ),
    },
    {
      key: '_actions',
      header: '작업',
      width: '60px',
      align: 'center',
      system: true,
      render: (_v, s) => (
        <RowActionMenu
          actions={buildRowActions(contentActionPolicy, s, {
            preview: () => handlePreview(s),
            apply: () => openApply(s),
            qr: () => openQr(s),
            edit: () => onEdit(s.id),
            archive: () => onArchive(s),
          }, {
            icons: ACTION_ICONS,
            loading: previewBusy === s.id
              ? { preview: true }
              : qrBusy === s.id
                ? { qr: true }
                : (busy ? { archive: true } : undefined),
          })}
          inlineMax={contentActionPolicy.inlineMax}
        />
      ),
    },
  ], [templateLabel, usageBySet, onEdit, onArchive, busy, handlePreview, previewBusy, activeHighlight, openApply, openQr, qrBusy]);

  const selectCls = 'px-2.5 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400';

  const highlightedSet = activeHighlight ? sets.find((s) => s.id === activeHighlight) : null;

  return (
    <div className="space-y-3" ref={listTopRef}>
      {/* WO-O4O-STORE-TABLET-LAST-MILE-UX-CLEANUP-V1: 방금 가져온 사본 안내 배너. */}
      {highlightedSet && (
        <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
          <Check className="w-4 h-4 shrink-0" />
          <span className="min-w-0">
            방금 가져온 <b className="truncate">“{highlightedSet.name}”</b> 을(를) 표시했습니다. <b>태블렛에 적용</b>으로 원하는 태블렛에 바로 띄울 수 있어요.
          </span>
        </div>
      )}
      {/* ── 도구막대: 검색 + 필터(상태/템플릿/코너) + 만들기 ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="콘텐츠명 검색"
            className="min-w-[180px] flex-1 sm:flex-none px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            aria-label="콘텐츠명 검색"
          />
          {/* 템플릿 필터 */}
          <select value={templateFilter} onChange={(e) => setTemplateFilter(e.target.value)} className={selectCls} aria-label="템플릿 필터">
            <option value="">템플릿 전체</option>
            {templateOptions.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          {/* 현재 적용 코너 필터 */}
          <select value={cornerFilter} onChange={(e) => setCornerFilter(e.target.value)} className={selectCls} aria-label="현재 적용 코너 필터">
            <option value="">현재 적용 코너 전체</option>
            {cornerOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            <option value="__none__">현재 미적용</option>
          </select>
          {/* 상태 필터 */}
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  statusFilter === f.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shrink-0"
        >
          <Plus className="w-4 h-4" /> 태블렛 화면 만들기
        </button>
      </div>

      {/* ── 일괄 작업(선택 시) ── */}
      <ActionBar
        selectedCount={selectedKeys.size}
        onClearSelection={() => setSelectedKeys(new Set())}
        actions={[
          {
            key: 'bulk-archive',
            label: `선택한 콘텐츠 보관 (${archivableSelectedCount})`,
            onClick: handleBulkArchive,
            variant: 'default' as const,
            icon: <Trash2 className="w-3.5 h-3.5" />,
            loading: batch.loading,
            group: 'actions',
            visible: selectedKeys.size > 0,
            tooltip: '선택한 콘텐츠를 보관합니다(콘텐츠는 삭제되지 않음). 코너에 연결된 콘텐츠는 먼저 연결 해제 필요.',
          },
        ]}
      />

      <BulkResultModal
        open={batch.showResult}
        onClose={() => batch.clearResult()}
        result={batch.result}
        onRetry={() => batch.retryFailed()}
      />

      {/* ── 표준 테이블 (행/콘텐츠명 클릭 = 미리보기) ── */}
      <DataTable<ScreenSet>
        columns={columns}
        data={pageRows}
        rowKey="id"
        loading={loading}
        emptyMessage={
          search || statusFilter !== 'available' || templateFilter || cornerFilter
            ? '조건에 맞는 태블렛 콘텐츠가 없습니다.'
            : '아직 태블렛 콘텐츠가 없습니다. ‘태블렛 화면 만들기’로 첫 화면 세트를 만들어 주세요.'
        }
        tableId="kpa-tablet-content-list"
        onRowClick={(s) => handlePreview(s)}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
      />

      {/* ── 페이지네이션 + 요약 + 페이지당 표시 수 ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-500">
          총 <span className="font-medium text-slate-700">{total}</span>건 · {clampedPage} / {totalPages} 페이지 · 페이지당 {pageSize}개
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">페이지당
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="ml-1 px-2 py-1 rounded border border-slate-200 text-xs" aria-label="페이지당 표시 수">
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}개</option>)}
            </select>
          </label>
          <Pagination page={clampedPage} totalPages={totalPages} onPageChange={setPage} total={total} />
        </div>
      </div>

      {/* ── 미리보기 모달(read-only, 태블렛/QR 모바일 전환) ── */}
      {preview && previewApi && (
        <div className="fixed inset-0 z-[100000] bg-slate-900/70 flex flex-col" onClick={() => setPreview(null)} role="presentation">
          <div className="bg-slate-900/95 text-white px-4 py-2 flex items-center justify-between gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-semibold truncate">{preview.name}</span>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setPreview((p) => (p ? { ...p, view: 'tablet' } : p))}
                  className={`px-3 py-1 text-xs font-medium rounded-full ${preview.view === 'tablet' ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>태블렛 화면</button>
                <button onClick={() => setPreview((p) => (p ? { ...p, view: 'mobile' } : p))}
                  className={`px-3 py-1 text-xs font-medium rounded-full ${preview.view === 'mobile' ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>QR 모바일 화면</button>
              </div>
            </div>
            <button onClick={() => setPreview(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium whitespace-nowrap">
              <X className="w-4 h-4" /> 닫기
            </button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center p-3 overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div style={preview.view === 'tablet'
              ? { position: 'relative', overflow: 'hidden', width: 'min(100%, 1024px)', aspectRatio: '16 / 10', background: '#000', borderRadius: 12 }
              : { position: 'relative', overflow: 'hidden', width: 390, maxWidth: '100%', height: 'min(86vh, 780px)', background: '#000', borderRadius: 24 }}>
              <TabletKioskPage api={previewApi} slug={storeSlug ?? undefined} previewScreen={preview.screen} embedded showQrBadge={false} />
            </div>
          </div>
          <div className="bg-slate-900/90 text-slate-300 text-[11px] px-4 py-1.5 text-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            저장된 내용을 보여 주는 미리보기입니다. 실제 태블렛에서는 화면 크기·방향에 따라 달라질 수 있습니다.
          </div>
        </div>
      )}

      {previewBusy && !preview && (
        <div className="fixed inset-0 z-[100000] bg-slate-900/40 flex items-center justify-center" role="presentation">
          <div className="bg-white rounded-xl px-4 py-3 text-sm text-slate-600 inline-flex items-center gap-2 shadow-lg">
            <Loader2 className="w-4 h-4 animate-spin" /> 미리보기 준비 중…
          </div>
        </div>
      )}

      {/* ── 코너 QR 보기·출력 모달 (WO-O4O-SCREEN-SET-CORNER-QR-VISIBILITY-V1 §범위⑦) ──
          태블렛 화면(대기·메인)에 상시 표시되는 것과 같은 QR. 파일 출력은 기존 QR export 재사용. */}
      {qrFor && (
        <div className="fixed inset-0 z-[100001] bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={closeQr}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-800">코너 QR</h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate">“{qrFor.set.name}” 의 휴대전화 보기 QR입니다.</p>
              </div>
              <button onClick={closeQr} className="p-1.5 rounded hover:bg-slate-100 shrink-0" aria-label="닫기">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto">
              <div className="flex flex-col items-center gap-2">
                {qrFor.imageUrl ? (
                  <img src={qrFor.imageUrl} alt={`${qrFor.set.name} QR`} className="w-40 h-40 object-contain rounded-lg border border-slate-200 bg-white" />
                ) : (
                  <div className="w-40 h-40 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-center text-[11px] text-slate-400 px-3">
                    QR 이미지를 불러오지 못했습니다.<br />주소는 아래에서 확인할 수 있습니다.
                  </div>
                )}
                <a
                  href={`/qr/${qrFor.set.publicQrSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 hover:underline break-all text-center"
                >
                  {`${window.location.origin}/qr/${qrFor.set.publicQrSlug}`}
                </a>
              </div>

              {qrFor.qr ? (
                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-600 mb-2">출력·다운로드</div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {QR_EXPORT_PRESETS.map((p) => {
                      const key = `${p.format}:${p.preset}`;
                      return (
                        <button
                          key={key}
                          onClick={() => handleQrDownload(p.format, p.preset, key)}
                          disabled={!!qrDownloading}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-left text-sm hover:border-indigo-300 hover:bg-indigo-50/40 disabled:opacity-50"
                        >
                          {qrDownloading === key
                            ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                            : <Download className="w-4 h-4 text-slate-400 shrink-0" />}
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-slate-800">{p.label}</span>
                            <span className="block text-[11px] text-slate-400">{p.hint}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
                  QR 파일 출력 정보를 찾지 못했습니다. ‘매장 QR 관리’에서 확인해 주세요.
                </p>
              )}
              <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                이 QR은 콘텐츠를 저장할 때 자동으로 만들어지며, 이름을 바꾸어도 주소는 그대로 유지됩니다.
                태블렛 대기 화면과 메인 화면에도 같은 QR이 표시됩니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* WO-O4O-STORE-TABLET-LAST-MILE-UX-CLEANUP-V1: '태블렛에 적용' — 대상 태블렛 선택 모달.
          기존 current-screen-set API 재사용. 적용 = 그 태블렛의 '지금 나오는 화면' 교체(코너별 운영과 동일 결과). */}
      {applyFor && (
        <div className="fixed inset-0 z-[100001] bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => !applyBusyTabletId && setApplyFor(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-800">태블렛에 적용</h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate">“{applyFor.name}” 을(를) 어느 태블렛에 띄울지 고르세요.</p>
              </div>
              <button onClick={() => !applyBusyTabletId && setApplyFor(null)} className="p-1.5 rounded hover:bg-slate-100 shrink-0" aria-label="닫기">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="px-4 py-3 overflow-y-auto">
              <ul className="space-y-2">
                {(tablets ?? []).map((t) => {
                  const corner = t.location?.trim() || null;
                  const already = t.currentScreenSetId === applyFor.id;
                  const busyThis = applyBusyTabletId === t.id;
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => handleApplySelect(t.id)}
                        disabled={already || !!applyBusyTabletId}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                          already ? 'border-emerald-200 bg-emerald-50 cursor-default'
                          : 'border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 disabled:opacity-50'
                        }`}
                      >
                        <MonitorSmartphone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-slate-800 truncate">{t.name}</span>
                          <span className="block text-[11px] text-slate-400 truncate">{corner ? `설치 코너: ${corner}` : '설치 코너 미지정'}</span>
                        </span>
                        {busyThis ? (
                          <Loader2 className="w-4 h-4 animate-spin text-teal-600 shrink-0" />
                        ) : already ? (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><Check className="w-3.5 h-3.5" /> 적용 중</span>
                        ) : (
                          <span className="shrink-0 text-xs font-semibold text-teal-700">적용</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                적용하면 해당 태블렛의 ‘지금 나오는 화면’이 바뀝니다. 자동으로 QR이 만들어지지 않으며, 공개 태블렛 화면에서 새로고침하면 반영됩니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

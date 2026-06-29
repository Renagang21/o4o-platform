/**
 * StoreContentsSelector — 콘텐츠 선택 canonical 셀렉터 (공유)
 *
 * WO-O4O-STORE-PRODUCTION-MATERIALS-CONTENT-SELECTOR-MODAL-V1
 *
 * `/store/library/contents` 페이지와 `/store/library/production-materials`의
 * "새 제작 자료 만들기" 모달이 같은 selector 구조를 공유한다.
 *
 * WO-O4O-KPA-STORE-LIBRARY-CONTENT-ONLY-SELECTOR-V1:
 *   콘텐츠/강의 상위 전환(TopTabBar)과 LessonsSection 을 제거하고 콘텐츠 전용으로 정리한다.
 *   selector 는 DocumentsSection 을 직접 렌더한다. 기존 lesson snapshot 데이터/조회 호환은
 *   백엔드에 그대로 유지(2단계에서 신규 생성만 차단). 콘텐츠 선택 → QR/POP/PDF/제작 흐름 보존.
 *
 * 데이터 source / 페이지네이션 / 검색 / row selection / "제작 시작" 호출 흐름 모두 동일.
 * mode='modal' 시 destructive action(선택 제거) 및 내부 router Link 를 안전한 형태로 대체.
 */

import { useEffect, useMemo, useRef, useState, useCallback, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Trash2, Search, FileText, Info, Printer, QrCode, Image as ImageIcon } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { Pagination } from '@o4o/operator-ux-core';
import { DataTable, type Column, ActionBar } from '@o4o/ui';
import {
  storeLibraryApi,
  type LibraryContentItem,
} from '../../api/assetSnapshot';
import { colors } from '../../styles/theme';
import type { ProductionSourceItem } from './productionTargets';
// WO-O4O-KPA-STORE-LIBRARY-CONTENTS-PDF-EXPORT-OPTIONS-V1: 선택 콘텐츠 인쇄용 PDF
import { ContentPdfExportModal, type PdfExportContent } from './ContentPdfExportModal';
// WO-O4O-KPA-CONTENT-LIST-INLINE-QR-CREATE-V1: 콘텐츠 선택 → QR 만들기 바로 호출
import { StoreQrCreateModal, type InlineQrTarget } from '../../components/store/StoreQrCreateModal';
// WO-O4O-KPA-CONTENT-LIST-INLINE-POP-CREATE-V1: 콘텐츠 선택 → POP 만들기 바로 호출
import { StorePopCreateModal, type InlinePopTarget } from '../../components/store/StorePopCreateModal';

const PAGE_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

// ─── Row Types ───────────────────────────────────────────────────────────────

// WO-O4O-KPA-STORE-LIBRARY-CONTENT-CREATED-BUT-LIST-MISSING-V1 (A안):
//   'execution-asset' = store_execution_assets(content) — QR "내 매장 자료"와 동일 소스를 콘텐츠 목록에 노출.
type RowOrigin = 'snapshot' | 'direct' | 'execution-asset';
type DocSourceType = 'cms' | 'content' | 'direct' | 'execution';

// WO-O4O-KPA-CONTENT-LIST-TAG-SEARCH-FILTER-V1: 출처 탭
//   all=전체 / operator=운영자 제공(snapshot cms) / community=커뮤니티 가져옴(snapshot content) / mine=내가 만든(direct+execution-asset)
// WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1: ai-description = content_json.aiDescription.mode 필터(SSOT). 태그는 보조.
type SourceFilter = 'all' | 'operator' | 'community' | 'mine' | 'ai-description';
const SOURCE_TABS: { key: SourceFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'operator', label: '운영자 제공' },
  { key: 'community', label: '커뮤니티 가져옴' },
  { key: 'mine', label: '내가 만든 콘텐츠' },
  { key: 'ai-description', label: 'AI 설명' },
];

interface DocumentRow {
  id: string;
  origin: RowOrigin;
  selectionKey: string;
  title: string;
  authorName: string;
  sourceType: DocSourceType;
  createdAt: string;
  lifecycleStatus: string | null;
  href: string;
  // WO-O4O-KPA-STORE-LIBRARY-CONTENTS-PDF-EXPORT-OPTIONS-V1:
  //   인쇄용 PDF 본문 추출용 — 피드가 origin별 본문을 contentJson 에 포함(html/body/blocks).
  contentJson: Record<string, unknown>;
  // WO-O4O-KPA-CONTENT-LIST-TAG-FIELD-AND-DISPLAY-V1: 태그 chip 표시 (단순 표시, 클릭 필터 없음)
  tags: string[];
  // WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1: AI 설명 분류 SSOT('single'|'corner'|null)
  aiDescriptionMode: string | null;
}

const keyOf = (origin: RowOrigin, id: string) => `${origin}:${id}`;

const SOURCE_TYPE_LABEL: Record<DocSourceType, string> = {
  cms: '커뮤니티 (CMS)',
  content: '커뮤니티 (콘텐츠 허브)',
  direct: '매장 직접 작성',
  execution: '매장 제작 자료',
};

function readString(json: unknown, key: string): string {
  if (!json || typeof json !== 'object') return '';
  const v = (json as Record<string, unknown>)[key];
  return typeof v === 'string' ? v : '';
}

function formatDate(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ko-KR');
}

function toDocumentRow(it: LibraryContentItem): DocumentRow {
  const sourceType: DocSourceType =
    it.origin === 'execution-asset'
      ? 'execution'
      : it.origin === 'direct'
        ? 'direct'
        : it.assetType === 'content'
          ? 'content'
          : 'cms';
  // WO-O4O-KPA-STORE-LIBRARY-EXECUTION-ASSET-EDIT-ACTION-V1:
  //   execution-asset(매장 제작 자료, asset_type='content')은 매장 소유 사본이므로 단건 편집기로 연결.
  //   편집 저장은 같은 row update(id 불변) → 이 자산을 참조하는 QR(library_item_id)은 그대로 유지.
  // WO-O4O-KPA-STORE-LIBRARY-SNAPSHOT-SINGLE-EDIT-V1:
  //   snapshot(o4o_asset_snapshots, 매장 소유 사본)도 편집 — kpa_store_contents(snapshot_edit) override 편집기로 연결.
  //   원본 o4o_asset_snapshots/kpa_contents 불변, snapshot id 불변. 자료함 콘텐츠형은 모두 편집.
  // WO-O4O-KPA-STORE-LIBRARY-CONTENTS-EDIT-ROUTE-UNIFY-V1:
  //   direct 도 목록 [편집] 클릭 시 상세 보기를 거치지 않고 편집기로 직행하도록 ?edit=1 부여
  //   (StoreDirectContentPage 가 ?edit=1 시 편집 모드로 자동 진입). execution-asset/snapshot 은 이미 편집기 직행.
  const href =
    it.origin === 'execution-asset'
      ? `/store/library/production-materials/${it.id}/edit`
      : it.origin === 'direct'
        ? `/store/content/direct/${it.id}?edit=1`
        : `/store/content/${it.id}/edit`;
  const authorName =
    it.origin === 'direct' || it.origin === 'execution-asset'
      ? '내 매장'
      : readString(it.contentJson, 'authorName') || '-';
  return {
    id: it.id,
    origin: it.origin,
    selectionKey: it.selectionKey || keyOf(it.origin, it.id),
    title: it.title || '(제목 없음)',
    authorName,
    sourceType,
    createdAt: it.createdAt,
    lifecycleStatus: it.lifecycleStatus,
    href,
    contentJson: it.contentJson || {},
    tags: Array.isArray(it.tags) ? it.tags.filter((t): t is string => typeof t === 'string') : [],
    aiDescriptionMode: typeof it.aiDescriptionMode === 'string' ? it.aiDescriptionMode : null,
  };
}

// ─── Selector — public API ───────────────────────────────────────────────────

export interface StoreContentsSelectorProps {
  /** 외부에서 reload 를 트리거할 때 증가시킬 키 (없으면 내부 mount/탭변경에만 반응) */
  reloadKey?: number;
  /** 선택 완료 → 제작 시작 콜백 (page: 모달 open / modal: 부모에 넘김) */
  onStartProduction: (items: ProductionSourceItem[]) => void;
  /** snapshot 제거 API (page mode 전용 — 미제공 시 "선택 제거" 버튼 숨김) */
  onRemoveSnapshots?: (snapshotIds: string[]) => Promise<number>;
  /** 제거 후 reload 신호 (page mode 전용) */
  onAfterRemove?: () => void;
  /** 'page' (default) | 'modal' — modal 시 router Link 회피, 선택 제거 숨김 */
  mode?: 'page' | 'modal';
  /** "제작 시작" 버튼 라벨 오버라이드 (modal 에선 보통 "선택 완료") */
  startButtonLabel?: string;
  /**
   * WO-O4O-KPA-STORE-LIBRARY-CONTENTS-PDF-EXPORT-OPTIONS-V1:
   * 문서형 콘텐츠 선택 작업 영역에 "인쇄용 PDF 만들기" 추가 (page 모드 전용 opt-in).
   * 미지정 시 기존 동작 유지 — production-materials 선택 모달(mode='modal')은 영향 없음.
   */
  enablePdfExport?: boolean;
}

export function StoreContentsSelector({
  reloadKey = 0,
  onStartProduction,
  onRemoveSnapshots,
  onAfterRemove,
  mode = 'page',
  startButtonLabel,
  enablePdfExport = false,
}: StoreContentsSelectorProps) {
  // WO-O4O-KPA-STORE-LIBRARY-CONTENT-ONLY-SELECTOR-V1: 콘텐츠 전용 — DocumentsSection 직접 렌더.
  return (
    <DocumentsSection
      reloadKey={reloadKey}
      onStartProduction={onStartProduction}
      onAfterRemove={onAfterRemove}
      onRemoveSnapshots={onRemoveSnapshots}
      mode={mode}
      startButtonLabel={startButtonLabel}
      enablePdfExport={enablePdfExport}
    />
  );
}

// ─── DocumentsSection ────────────────────────────────────────────────────────

function DocumentsSection({
  reloadKey,
  onStartProduction,
  onAfterRemove,
  onRemoveSnapshots,
  mode,
  startButtonLabel,
  enablePdfExport = false,
}: {
  reloadKey: number;
  onStartProduction: (items: ProductionSourceItem[]) => void;
  onAfterRemove?: () => void;
  onRemoveSnapshots?: (snapshotIds: string[]) => Promise<number>;
  mode: 'page' | 'modal';
  startButtonLabel?: string;
  enablePdfExport?: boolean;
}) {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // WO-O4O-KPA-STORE-LIBRARY-CONTENTS-PDF-EXPORT-OPTIONS-V1: 인쇄용 PDF 대상(단일)
  const [pdfTarget, setPdfTarget] = useState<PdfExportContent | null>(null);
  // WO-O4O-KPA-CONTENT-LIST-INLINE-QR-CREATE-V1: 인라인 QR 생성 대상(단일)
  const [qrTarget, setQrTarget] = useState<InlineQrTarget | null>(null);
  // WO-O4O-KPA-CONTENT-LIST-INLINE-POP-CREATE-V1: 인라인 POP 생성 대상(단일)
  const [popTarget, setPopTarget] = useState<InlinePopTarget | null>(null);
  // WO-O4O-KPA-CONTENT-LIST-TAG-SEARCH-FILTER-V1: 출처 탭 + 태그 정확 필터
  const [source, setSource] = useState<SourceFilter>('all');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // 출처 탭/태그 필터 변경 시 1페이지로 리셋
  const changeSource = useCallback((s: SourceFilter) => { setSource(s); setPage(1); }, []);
  const applyTag = useCallback((t: string) => { setActiveTag(t); setPage(1); }, []);
  const clearTag = useCallback(() => { setActiveTag(null); setPage(1); }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const reqIdRef = useRef(0);
  useEffect(() => {
    const myReq = ++reqIdRef.current;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const res = await storeLibraryApi
        .listContents({
          type: 'document',
          page,
          limit: PAGE_LIMIT,
          search: searchQuery || undefined,
          // 'ai-description' 탭 = content_json.aiDescription.mode 필터(SSOT). 'all' → 미지정.
          source: source !== 'all' ? source : undefined,
          tag: activeTag || undefined,
        })
        .catch(() => null);
      if (cancelled || myReq !== reqIdRef.current) return;

      const items = res?.data?.items ?? [];
      setRows(items.map(toDocumentRow));
      setTotal(res?.data?.total ?? 0);
      setTotalPages(Math.max(1, res?.data?.totalPages ?? 1));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [page, searchQuery, source, activeTag, reloadKey]);

  useEffect(() => {
    setSelected((prev) => {
      const validKeys = new Set(rows.map((r) => r.selectionKey));
      const next = new Set<string>();
      for (const k of prev) {
        if (validKeys.has(k)) next.add(k);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const handleStart = useCallback(() => {
    if (selected.size === 0) return;
    const items: ProductionSourceItem[] = rows
      .filter((r) => selected.has(r.selectionKey))
      // WO-O4O-KPA-STORE-LIBRARY-CONTENT-CREATED-BUT-LIST-MISSING-V1:
      //   'execution-asset'(store_execution_assets) → ProductionSourceItem 의 canonical origin 'library' 로 매핑.
      .map((r) => ({ id: r.id, title: r.title, origin: r.origin === 'execution-asset' ? 'library' : r.origin }));
    onStartProduction(items);
  }, [selected, rows, onStartProduction]);

  const handleRemove = useCallback(async () => {
    if (!onRemoveSnapshots) return;
    const snapshotIds = rows
      .filter((r) => selected.has(r.selectionKey) && r.origin === 'snapshot')
      .map((r) => r.id);
    const directCount = selected.size - snapshotIds.length;
    if (snapshotIds.length === 0) {
      toast.error('삭제 가능한 항목이 없습니다 (직접 작성 콘텐츠는 매장 제작 자료에서 삭제)');
      return;
    }
    if (
      !confirm(
        `선택한 ${snapshotIds.length}개 콘텐츠를 내 자료함에서 삭제하시겠습니까?${
          directCount > 0 ? `\n(직접 작성 ${directCount}개는 매장 제작 자료에서 삭제)` : ''
        }`,
      )
    )
      return;
    try {
      const n = await onRemoveSnapshots(snapshotIds);
      if (n > 0) {
        toast.success(`${n}개 콘텐츠를 내 자료함에서 삭제했습니다`);
        setSelected(new Set());
        onAfterRemove?.();
      }
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    }
  }, [selected, rows, onRemoveSnapshots, onAfterRemove]);

  // WO-O4O-KPA-STORE-LIBRARY-CONTENTS-PDF-EXPORT-OPTIONS-V1:
  //   콘텐츠 1개 선택 시에만 인쇄용 PDF 만들기 활성. 선택 행에서 id/title/origin 을 PDF 모달로 전달.
  const handlePdfExport = useCallback(() => {
    if (selected.size !== 1) return;
    const key = Array.from(selected)[0];
    const row = rows.find((r) => r.selectionKey === key);
    if (!row) return;
    setPdfTarget({ id: row.id, title: row.title, origin: row.origin, contentJson: row.contentJson });
  }, [selected, rows]);

  // WO-O4O-KPA-CONTENT-LIST-INLINE-QR-CREATE-V1:
  //   콘텐츠 1개 선택 시 QR 만들기 바로 호출. direct/execution-asset 만 공개 landing 이 렌더 가능 →
  //   snapshot 은 QR 대상 미지원(아래 안내). QR 결과는 store_qr_codes 에만 생성(원본/제작자료 신규 생성 없음).
  const singleSelectedRow = useMemo(() => {
    if (selected.size !== 1) return null;
    const key = Array.from(selected)[0];
    return rows.find((r) => r.selectionKey === key) ?? null;
  }, [selected, rows]);
  const qrEligible = !!singleSelectedRow && (singleSelectedRow.origin === 'direct' || singleSelectedRow.origin === 'execution-asset');
  const handleCreateQr = useCallback(() => {
    if (!singleSelectedRow) return;
    if (singleSelectedRow.origin !== 'direct' && singleSelectedRow.origin !== 'execution-asset') return;
    setQrTarget({ id: singleSelectedRow.id, title: singleSelectedRow.title, origin: singleSelectedRow.origin });
  }, [singleSelectedRow]);

  // WO-O4O-KPA-CONTENT-LIST-INLINE-POP-CREATE-V1:
  //   POP 은 백엔드 generate 가 direct/execution-asset/snapshot 3 origin 모두 받으므로 1개 선택이면 활성.
  //   결과는 store_execution_assets(file/pop)=매장 제작 자료에 저장(콘텐츠 목록 asset_type='content' 필터로 미노출).
  const popEligible = !!singleSelectedRow;
  const handleCreatePop = useCallback(() => {
    if (!singleSelectedRow) return;
    setPopTarget({ id: singleSelectedRow.id, title: singleSelectedRow.title, origin: singleSelectedRow.origin });
  }, [singleSelectedRow]);

  // WO-O4O-KPA-STORE-LIBRARY-CONTENTS-STANDARD-TABLE-V1: @o4o/ui Column<T>
  const columns = useMemo<Column<DocumentRow>[]>(
    () => [
      {
        key: 'title',
        title: '제목',
        sortable: true,
        sorter: (a, b) => a.title.localeCompare(b.title),
        render: (_v, row) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {/* WO-O4O-KPA-STORE-LIBRARY-SNAPSHOT-SINGLE-EDIT-V1: 자료함 콘텐츠형은 모두 편집 가능 → 아이콘 통일(FileText) */}
            <FileText size={14} style={{ color: colors.primary, flexShrink: 0 }} />
            {mode === 'modal' ? (
              // WO-O4O-STORE-PRODUCTION-MATERIALS-CONTENT-SELECTOR-MODAL-V1:
              // 모달 안에서 router Link 사용 시 host 페이지가 unmount → 작업 흐름 끊김.
              // 새 탭으로 열어 작업 컨텍스트 유지.
              <a href={row.href} target="_blank" rel="noreferrer" style={styles.titleLink} title={row.title}>
                {row.title}
              </a>
            ) : (
              <Link to={row.href} style={styles.titleLink} title={row.title}>
                {row.title}
              </Link>
            )}
            {/* WO-O4O-STORE-LIBRARY-CONTENTS-DIRECT-CONTENT-REENTRY-UX-V1: direct 콘텐츠 visual indicator */}
            {row.origin === 'direct' && (
              <span style={{ ...styles.badge, background: '#DCFCE7', color: '#16A34A', flexShrink: 0 }}>내 콘텐츠</span>
            )}
            {/* WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1: AI 설명 콘텐츠 표식 (SSOT=aiDescriptionMode, 단일/코너 구분) */}
            {row.aiDescriptionMode && (
              <span style={{ ...styles.badge, background: '#FEF3C7', color: '#B45309', flexShrink: 0 }}>
                AI 설명{row.aiDescriptionMode === 'corner' ? '·코너' : '·단일'}
              </span>
            )}
            {/* WO-O4O-KPA-STORE-LIBRARY-CONTENT-CREATED-BUT-LIST-MISSING-V1: 제작 자료(store_execution_assets) 표식 */}
            {row.origin === 'execution-asset' && (
              <span style={{ ...styles.badge, background: '#EDE9FE', color: '#7C3AED', flexShrink: 0 }}>제작 자료</span>
            )}
            {row.lifecycleStatus === 'archived' && (
              <span style={{ ...styles.badge, background: '#FEF3C7', color: '#D97706' }}>보관</span>
            )}
            {row.lifecycleStatus === 'expired' && (
              <span style={{ ...styles.badge, background: '#FEE2E2', color: '#DC2626' }}>만료</span>
            )}
            {/* WO-O4O-KPA-CONTENT-LIST-TAG-SEARCH-FILTER-V1: 태그 chip 클릭 → 해당 태그 필터 적용 (행 클릭/선택과 분리) */}
            {row.tags.slice(0, 5).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={(e) => { e.stopPropagation(); applyTag(tag); }}
                style={{ ...styles.tagChip, ...styles.tagChipClickable }}
                title={`'${tag}' 태그로 필터`}
              >
                {tag}
              </button>
            ))}
            {row.tags.length > 5 && (
              <span style={styles.tagMore}>+{row.tags.length - 5}</span>
            )}
          </div>
        ),
      },
      {
        key: 'authorName',
        title: '작성자',
        width: '140px',
        sortable: true,
        sorter: (a, b) => a.authorName.localeCompare(b.authorName),
        render: (_v, row) => <span style={styles.metaText}>{row.authorName}</span>,
      },
      {
        key: 'sourceType',
        title: '원본 유형',
        width: '180px',
        sortable: true,
        sorter: (a, b) => SOURCE_TYPE_LABEL[a.sourceType].localeCompare(SOURCE_TYPE_LABEL[b.sourceType]),
        render: (_v, row) => <span style={styles.metaText}>{SOURCE_TYPE_LABEL[row.sourceType]}</span>,
      },
      {
        key: 'createdAt',
        title: '가져온 날짜',
        width: '120px',
        sortable: true,
        sorter: (a, b) => a.createdAt.localeCompare(b.createdAt),
        render: (_v, row) => <span style={styles.metaText}>{formatDate(row.createdAt)}</span>,
      },
      {
        key: '_actions',
        title: '액션',
        align: 'center' as const,
        width: '80px',
        // WO-O4O-STORE-LIBRARY-CONTENTS-DIRECT-CONTENT-REENTRY-UX-V1: direct 콘텐츠는 편집 가능
        // WO-O4O-KPA-STORE-LIBRARY-EXECUTION-ASSET-EDIT-ACTION-V1:
        //   execution-asset(매장 사본)도 편집 가능 — "열기" → "편집".
        // WO-O4O-KPA-STORE-LIBRARY-SNAPSHOT-SINGLE-EDIT-V1: snapshot 도 매장 사본 → "보기" → "편집".
        //   자료함의 콘텐츠형 항목은 direct/execution-asset/snapshot 모두 편집으로 통일(보기 전용 없음).
        render: (_v, row) => (
          <a
            href={row.href}
            target={mode === 'modal' ? '_blank' : undefined}
            rel={mode === 'modal' ? 'noreferrer' : undefined}
            style={styles.viewBtn}
            aria-label="콘텐츠 편집"
          >
            편집
          </a>
        ),
      },
    ],
    [mode, applyTag],
  );

  const showRemoveButton = mode === 'page' && !!onRemoveSnapshots;
  // WO-O4O-KPA-STORE-LIBRARY-CONTENTS-PDF-EXPORT-OPTIONS-V1: page 모드 opt-in 일 때만 노출
  const showPdfExport = mode === 'page' && enablePdfExport;
  // WO-O4O-KPA-CONTENT-LIST-INLINE-QR-CREATE-V1: page 모드에서만 QR 만들기 노출
  const showInlineQr = mode === 'page';
  // WO-O4O-KPA-CONTENT-LIST-INLINE-POP-CREATE-V1: page 모드에서만 POP 만들기 노출
  const showInlinePop = mode === 'page';

  return (
    <section style={styles.section}>
      {/* WO-O4O-STORE-LIBRARY-CONTENTS-DIRECT-CONTENT-REENTRY-UX-V1: guide bar */}
      <div style={styles.infoBar}>
        <Info size={14} style={{ color: colors.primary, flexShrink: 0 }} />
        <span>
          제작 후 저장한 콘텐츠는 <strong style={{ color: '#1D4ED8' }}>내 콘텐츠</strong> 표시 항목에서 다시 수정할 수 있습니다.
        </span>
      </div>

      {/* WO-O4O-KPA-CONTENT-LIST-TAG-SEARCH-FILTER-V1: 출처 탭 (page 모드 전용) */}
      {mode === 'page' && (
        <div style={styles.sourceTabBar}>
          {SOURCE_TABS.map(({ key, label }) => {
            const active = source === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => changeSource(key)}
                style={{ ...styles.sourceTab, ...(active ? styles.sourceTabActive : styles.sourceTabInactive) }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div style={styles.sectionHeader}>
        <span style={styles.countBadge}>{total}건</span>
        {/* WO-O4O-KPA-CONTENT-LIST-TAG-SEARCH-FILTER-V1: 적용된 태그 필터 chip */}
        {activeTag && (
          <span style={styles.activeTagChip}>
            태그: {activeTag}
            <button type="button" onClick={clearTag} style={styles.activeTagRemove} aria-label="태그 필터 해제">
              <span aria-hidden>×</span>
            </button>
          </span>
        )}
        <div style={styles.searchWrap}>
          <Search size={14} style={styles.searchIcon} />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="제목·요약·본문·태그 검색"
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* WO-O4O-KPA-STORE-LIBRARY-CONTENTS-STANDARD-TABLE-V1: custom toolbar → @o4o/ui ActionBar */}
      <ActionBar
        selectedCount={selected.size}
        onClearSelection={() => setSelected(new Set())}
        actions={[
          {
            key: 'start',
            label: startButtonLabel ?? '제작 시작',
            icon: <Sparkles size={14} />,
            onClick: handleStart,
            disabled: selected.size === 0,
          },
          // WO-O4O-KPA-CONTENT-LIST-INLINE-QR-CREATE-V1:
          //   콘텐츠 1개(direct/execution-asset) 선택 시 QR 만들기 활성. snapshot/복수 선택 비활성(아래 안내).
          ...(showInlineQr ? [{
            key: 'qr',
            label: 'QR-code 만들기',
            icon: <QrCode size={14} />,
            onClick: handleCreateQr,
            disabled: !qrEligible,
          }] : []),
          // WO-O4O-KPA-CONTENT-LIST-INLINE-POP-CREATE-V1:
          //   POP 은 3 origin 모두 지원 → 1개 선택 시 활성(복수 선택 비활성+안내).
          ...(showInlinePop ? [{
            key: 'pop',
            label: 'POP 만들기',
            icon: <ImageIcon size={14} />,
            onClick: handleCreatePop,
            disabled: !popEligible,
          }] : []),
          // WO-O4O-KPA-STORE-LIBRARY-CONTENTS-PDF-EXPORT-OPTIONS-V1:
          //   1차는 단일 콘텐츠만 지원 — 1개 선택 시에만 활성(2개+ 비활성 + 아래 안내).
          ...(showPdfExport ? [{
            key: 'pdf',
            label: '인쇄용 PDF 만들기',
            icon: <Printer size={14} />,
            onClick: handlePdfExport,
            disabled: selected.size !== 1,
          }] : []),
          ...(showRemoveButton ? [{
            key: 'remove',
            label: '선택 삭제',
            icon: <Trash2 size={14} />,
            variant: 'danger' as const,
            onClick: handleRemove,
          }] : []),
        ]}
      />

      {/* WO-O4O-KPA-CONTENT-LIST-INLINE-QR-CREATE-V1 / INLINE-POP: QR·POP 만들기 선택 안내 */}
      {(showInlineQr || showInlinePop) && selected.size >= 2 && (
        <p style={styles.pdfHint}>QR-code · POP은 콘텐츠 1개를 선택해 주세요.</p>
      )}
      {showInlineQr && selected.size === 1 && !qrEligible && (
        <p style={styles.pdfHint}>가져온 콘텐츠(운영자 제공/커뮤니티)는 QR-code 대상이 아닙니다(POP은 가능). 내가 만든 콘텐츠/제작 자료를 선택하면 QR도 만들 수 있습니다.</p>
      )}

      {/* 인쇄용 PDF 는 콘텐츠 1개 선택 시 사용 가능 — 복수 선택 시 안내 */}
      {showPdfExport && selected.size >= 2 && (
        <p style={styles.pdfHint}>인쇄용 PDF 만들기는 콘텐츠 1개 선택 시 사용할 수 있습니다.</p>
      )}

      <DataTable<DocumentRow>
        columns={columns}
        dataSource={rows}
        rowKey="selectionKey"
        loading={loading}
        emptyText={searchQuery ? '검색 결과가 없습니다' : '가져온 문서형 콘텐츠가 없습니다'}
        rowSelection={{
          selectedRowKeys: Array.from(selected),
          onChange: (keys: string[]) => setSelected(new Set(keys)),
        }}
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        total={total}
      />

      {/* WO-O4O-KPA-STORE-LIBRARY-CONTENTS-PDF-EXPORT-OPTIONS-V1: 옵션 모달 */}
      {showPdfExport && (
        <ContentPdfExportModal
          open={!!pdfTarget}
          content={pdfTarget}
          onClose={() => setPdfTarget(null)}
        />
      )}

      {/* WO-O4O-KPA-CONTENT-LIST-INLINE-QR-CREATE-V1: 인라인 QR 생성 모달 (생성 성공 시 선택 해제) */}
      {showInlineQr && (
        <StoreQrCreateModal
          open={!!qrTarget}
          target={qrTarget}
          onClose={() => setQrTarget(null)}
          onCreated={() => setSelected(new Set())}
        />
      )}

      {/* WO-O4O-KPA-CONTENT-LIST-INLINE-POP-CREATE-V1: 인라인 POP 생성 모달 (생성 성공 시 선택 해제) */}
      {showInlinePop && (
        <StorePopCreateModal
          open={!!popTarget}
          target={popTarget}
          onClose={() => setPopTarget(null)}
          onCreated={() => setSelected(new Set())}
        />
      )}
    </section>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  subTabBar: {
    display: 'flex',
    gap: '0',
    borderBottom: `1px solid ${colors.neutral200}`,
    marginTop: '16px',
    marginBottom: '0',
  },
  subTabBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    marginBottom: '-1px',
    transition: 'color 0.15s, border-color 0.15s',
  },
  subTabBtnActive: {
    color: colors.primary,
    borderBottomColor: colors.primary,
  },
  subTabBtnInactive: {
    color: colors.neutral500,
  },
  section: {
    marginTop: '16px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  countBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: 500,
    color: colors.neutral600,
    background: colors.neutral100,
    borderRadius: '999px',
  },
  pdfHint: {
    fontSize: '12px',
    color: colors.neutral500,
    margin: '0 0 10px',
    padding: '8px 12px',
    background: colors.neutral100,
    borderRadius: '6px',
  },
  infoBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    background: '#EFF6FF',
    border: `1px solid #BFDBFE`,
    borderRadius: '8px',
    fontSize: '13px',
    color: '#1D4ED8',
    marginBottom: '14px',
  },
  searchWrap: {
    position: 'relative',
    minWidth: '220px',
  },
  searchIcon: {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    color: colors.neutral400,
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px 8px 30px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    background: colors.white,
    boxSizing: 'border-box',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    marginBottom: '10px',
    flexWrap: 'wrap',
  },
  startBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    background: colors.primary,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.white,
    fontWeight: 500,
    cursor: 'pointer',
  },
  bulkDeleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  clearBtn: {
    padding: '8px 10px',
    background: 'transparent',
    border: 'none',
    fontSize: '13px',
    color: colors.neutral500,
    cursor: 'pointer',
  },
  titleLink: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral800,
    textDecoration: 'none',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  metaText: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 6px',
    fontSize: '11px',
    fontWeight: 500,
    borderRadius: '4px',
    flexShrink: 0,
  },
  // WO-O4O-KPA-CONTENT-LIST-TAG-FIELD-AND-DISPLAY-V1: 태그 chip (단순 표시)
  tagChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 500,
    background: '#EFF6FF',
    color: '#1D4ED8',
    border: '1px solid #BFDBFE',
    borderRadius: '999px',
    flexShrink: 0,
  },
  tagMore: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '11px',
    fontWeight: 500,
    color: '#6B7280',
    flexShrink: 0,
  },
  // WO-O4O-KPA-CONTENT-LIST-TAG-SEARCH-FILTER-V1
  tagChipClickable: {
    cursor: 'pointer',
    border: '1px solid #BFDBFE',
    background: '#EFF6FF',
  },
  sourceTabBar: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    padding: '4px 0 10px',
    borderBottom: '1px solid #F1F5F9',
    marginBottom: 10,
  },
  sourceTab: {
    padding: '5px 12px',
    fontSize: '13px',
    fontWeight: 600,
    borderRadius: '999px',
    cursor: 'pointer',
    border: '1px solid transparent',
  },
  sourceTabActive: {
    background: '#1D4ED8',
    color: '#fff',
    borderColor: '#1D4ED8',
  },
  sourceTabInactive: {
    background: '#F8FAFC',
    color: '#475569',
    borderColor: '#E2E8F0',
  },
  activeTagChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 6px 3px 10px',
    fontSize: '12px',
    fontWeight: 600,
    background: '#EFF6FF',
    color: '#1D4ED8',
    border: '1px solid #BFDBFE',
    borderRadius: '999px',
  },
  activeTagRemove: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    height: 16,
    border: 'none',
    background: 'transparent',
    color: '#1D4ED8',
    cursor: 'pointer',
    fontSize: '14px',
    lineHeight: 1,
    padding: 0,
  },
  viewBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 10px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '12px',
    color: colors.neutral700,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral600,
    margin: '0 0 8px',
  },
  emptyDesc: {
    fontSize: '13px',
    color: colors.neutral400,
    margin: 0,
    maxWidth: '360px',
    lineHeight: 1.6,
  },
};

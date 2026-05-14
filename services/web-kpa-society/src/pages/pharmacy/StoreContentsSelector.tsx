/**
 * StoreContentsSelector — 콘텐츠/강의 선택 canonical 셀렉터 (공유)
 *
 * WO-O4O-STORE-PRODUCTION-MATERIALS-CONTENT-SELECTOR-MODAL-V1
 *
 * `/store/library/contents` 페이지와 `/store/library/production-materials`의
 * "새 제작 자료 만들기" 모달이 같은 selector 구조를 공유한다.
 *
 * 이전: StoreLibraryContentsPage 내부에 DocumentsSection / LessonsSection / TopTabBar / SubTabBar
 *       가 정의되어 있었음. 이 파일로 추출 — 페이지/모달 양쪽에서 mount.
 *
 * 데이터 source / 페이지네이션 / 검색 / row selection / "제작 시작" 호출 흐름 모두 동일.
 * mode='modal' 시 destructive action(선택 제거) 및 내부 router Link 를 안전한 형태로 대체.
 */

import { useEffect, useMemo, useRef, useState, useCallback, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Sparkles, Trash2, Search, FileText, Info } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { DataTable, Pagination } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import {
  storeAssetControlApi,
  storeLibraryApi,
  type StoreAssetItem,
  type LibraryContentItem,
} from '../../api/assetSnapshot';
import { colors } from '../../styles/theme';
import type { ProductionSourceItem } from './productionTargets';

const PAGE_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

// ─── Tab Types ───────────────────────────────────────────────────────────────

type TopTab = 'contents' | 'lessons';
type ContentsSubTab = 'document' | 'course-resource';

// ─── Row Types ───────────────────────────────────────────────────────────────

type RowOrigin = 'snapshot' | 'direct';
type DocSourceType = 'cms' | 'content' | 'direct';

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
}

interface LessonRow {
  id: string;
  selectionKey: string;
  title: string;
  instructorName: string;
  lessonCount: number | null;
  createdAt: string;
  lifecycleStatus: string | null;
  href: string;
}

const keyOf = (origin: RowOrigin, id: string) => `${origin}:${id}`;

const SOURCE_TYPE_LABEL: Record<DocSourceType, string> = {
  cms: '커뮤니티 (CMS)',
  content: '커뮤니티 (콘텐츠 허브)',
  direct: '매장 직접 작성',
};

function readString(json: unknown, key: string): string {
  if (!json || typeof json !== 'object') return '';
  const v = (json as Record<string, unknown>)[key];
  return typeof v === 'string' ? v : '';
}

function readNumber(json: unknown, key: string): number | null {
  if (!json || typeof json !== 'object') return null;
  const v = (json as Record<string, unknown>)[key];
  return typeof v === 'number' ? v : null;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ko-KR');
}

function toDocumentRow(it: LibraryContentItem): DocumentRow {
  const sourceType: DocSourceType =
    it.origin === 'direct' ? 'direct' : it.assetType === 'content' ? 'content' : 'cms';
  const href = it.origin === 'direct' ? `/store/content/direct/${it.id}` : `/view/${it.id}`;
  const authorName = it.origin === 'direct' ? '내 매장' : readString(it.contentJson, 'authorName') || '-';
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
  };
}

function toLessonRow(s: StoreAssetItem): LessonRow {
  const publicUrl = readString(s.contentJson, 'publicUrl');
  return {
    id: s.id,
    selectionKey: keyOf('snapshot', s.id),
    title: s.title || readString(s.contentJson, 'title') || '(제목 없음)',
    instructorName: readString(s.contentJson, 'instructorName') || '-',
    lessonCount: readNumber(s.contentJson, 'lessonCount'),
    createdAt: s.createdAt,
    lifecycleStatus: s.lifecycleStatus ?? null,
    href: publicUrl || `/lms/course/${readString(s.contentJson, 'courseId') || s.id}`,
  };
}

// ─── Tab Bars ────────────────────────────────────────────────────────────────

function TopTabBar({
  active,
  onChange,
}: {
  active: TopTab;
  onChange: (t: TopTab) => void;
}) {
  const TAB_META: { key: TopTab; label: string; desc: string }[] = [
    { key: 'contents', label: '콘텐츠', desc: 'Full Copy 자산' },
    { key: 'lessons',  label: '강의',   desc: 'LMS 참조 자산' },
  ];

  return (
    <div style={styles.segmentedWrapper}>
      <div style={styles.segmentedGroup}>
        {TAB_META.map(({ key, label, desc }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              style={{
                ...styles.segmentedBtn,
                ...(isActive ? styles.segmentedBtnActive : styles.segmentedBtnInactive),
              }}
            >
              <span
                style={{
                  ...styles.segmentedLabel,
                  color: isActive ? colors.neutral800 : colors.neutral500,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  ...styles.segmentedDesc,
                  ...(isActive ? styles.segmentedDescActive : styles.segmentedDescInactive),
                }}
              >
                {desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SubTabBar({
  active,
  onChange,
}: {
  active: ContentsSubTab;
  onChange: (t: ContentsSubTab) => void;
}) {
  return (
    <div style={styles.subTabBar}>
      {(['document', 'course-resource'] as ContentsSubTab[]).map((tab) => {
        const label = tab === 'document' ? '문서형' : '코스형';
        const isActive = active === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            style={{
              ...styles.subTabBtn,
              ...(isActive ? styles.subTabBtnActive : styles.subTabBtnInactive),
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
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
}

export function StoreContentsSelector({
  reloadKey = 0,
  onStartProduction,
  onRemoveSnapshots,
  onAfterRemove,
  mode = 'page',
  startButtonLabel,
}: StoreContentsSelectorProps) {
  const [topTab, setTopTab] = useState<TopTab>('contents');
  const [contentsSubTab, setContentsSubTab] = useState<ContentsSubTab>('document');

  return (
    <>
      <TopTabBar active={topTab} onChange={setTopTab} />

      {topTab === 'contents' && (
        <>
          <SubTabBar active={contentsSubTab} onChange={setContentsSubTab} />

          {contentsSubTab === 'document' && (
            <DocumentsSection
              reloadKey={reloadKey}
              onStartProduction={onStartProduction}
              onAfterRemove={onAfterRemove}
              onRemoveSnapshots={onRemoveSnapshots}
              mode={mode}
              startButtonLabel={startButtonLabel}
            />
          )}

          {contentsSubTab === 'course-resource' && <CourseResourceEmptySection />}
        </>
      )}

      {topTab === 'lessons' && (
        <LessonsSection
          reloadKey={reloadKey}
          onStartProduction={onStartProduction}
          onAfterRemove={onAfterRemove}
          onRemoveSnapshots={onRemoveSnapshots}
          mode={mode}
          startButtonLabel={startButtonLabel}
        />
      )}
    </>
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
}: {
  reloadKey: number;
  onStartProduction: (items: ProductionSourceItem[]) => void;
  onAfterRemove?: () => void;
  onRemoveSnapshots?: (snapshotIds: string[]) => Promise<number>;
  mode: 'page' | 'modal';
  startButtonLabel?: string;
}) {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
  }, [page, searchQuery, reloadKey]);

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
      .map((r) => ({ id: r.id, title: r.title, origin: r.origin }));
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

  const columns: ListColumnDef<DocumentRow>[] = useMemo(
    () => [
      {
        key: 'title',
        header: '제목',
        sortable: true,
        sortAccessor: (row) => row.title,
        render: (_v, row) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {row.origin === 'direct' ? (
              <FileText size={14} style={{ color: colors.accentGreen, flexShrink: 0 }} />
            ) : (
              <BookOpen size={14} style={{ color: colors.primary, flexShrink: 0 }} />
            )}
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
            {row.lifecycleStatus === 'archived' && (
              <span style={{ ...styles.badge, background: '#FEF3C7', color: '#D97706' }}>보관</span>
            )}
            {row.lifecycleStatus === 'expired' && (
              <span style={{ ...styles.badge, background: '#FEE2E2', color: '#DC2626' }}>만료</span>
            )}
          </div>
        ),
      },
      {
        key: 'authorName',
        header: '작성자',
        width: '140px',
        sortable: true,
        sortAccessor: (row) => row.authorName,
        render: (_v, row) => <span style={styles.metaText}>{row.authorName}</span>,
      },
      {
        key: 'sourceType',
        header: '원본 유형',
        width: '180px',
        sortable: true,
        sortAccessor: (row) => SOURCE_TYPE_LABEL[row.sourceType],
        render: (_v, row) => <span style={styles.metaText}>{SOURCE_TYPE_LABEL[row.sourceType]}</span>,
      },
      {
        key: 'createdAt',
        header: '가져온 날짜',
        width: '120px',
        sortable: true,
        sortAccessor: (row) => row.createdAt,
        render: (_v, row) => <span style={styles.metaText}>{formatDate(row.createdAt)}</span>,
      },
      {
        key: '_actions',
        header: '액션',
        system: true,
        align: 'center',
        width: '80px',
        onCellClick: () => {},
        render: (_v, row) => (
          <a
            href={row.href}
            target={mode === 'modal' ? '_blank' : undefined}
            rel={mode === 'modal' ? 'noreferrer' : undefined}
            style={styles.viewBtn}
            aria-label="자료 보기"
          >
            보기
          </a>
        ),
      },
    ],
    [mode],
  );

  const showRemoveButton = mode === 'page' && !!onRemoveSnapshots;

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <span style={styles.countBadge}>{total}건</span>
        <div style={styles.searchWrap}>
          <Search size={14} style={styles.searchIcon} />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="제목 검색"
            style={styles.searchInput}
          />
        </div>
      </div>

      {selected.size > 0 && (
        <div style={styles.toolbar}>
          <span style={{ fontSize: 13, color: colors.neutral700 }}>{selected.size}개 선택됨</span>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={handleStart} style={styles.startBtn}>
            <Sparkles size={14} />
            {startButtonLabel ?? '제작 시작'}
          </button>
          {showRemoveButton && (
            <button type="button" onClick={handleRemove} style={styles.bulkDeleteBtn}>
              <Trash2 size={14} />
              선택 삭제
            </button>
          )}
          <button type="button" onClick={() => setSelected(new Set())} style={styles.clearBtn}>
            선택 해제
          </button>
        </div>
      )}

      <DataTable<DocumentRow>
        columns={columns}
        data={rows}
        rowKey="selectionKey"
        loading={loading}
        emptyMessage={searchQuery ? '검색 결과가 없습니다' : '가져온 문서형 콘텐츠가 없습니다'}
        tableId={mode === 'modal' ? 'kpa-store-library-documents-modal' : 'kpa-store-library-documents'}
        selectable
        selectedKeys={selected}
        onSelectionChange={setSelected}
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        total={total}
      />
    </section>
  );
}

// ─── CourseResourceEmptySection ──────────────────────────────────────────────

function CourseResourceEmptySection() {
  return (
    <section style={styles.section}>
      <div style={styles.emptyState}>
        <BookOpen size={32} style={{ color: colors.neutral300, marginBottom: 12 }} />
        <p style={styles.emptyTitle}>코스형 콘텐츠</p>
        <p style={styles.emptyDesc}>
          콘텐츠 허브에서 코스형 콘텐츠(CONTENT_RESOURCE)를 가져오면 여기에 표시됩니다.
        </p>
      </div>
    </section>
  );
}

// ─── LessonsSection ──────────────────────────────────────────────────────────

function LessonsSection({
  reloadKey,
  onStartProduction,
  onAfterRemove,
  onRemoveSnapshots,
  mode,
  startButtonLabel,
}: {
  reloadKey: number;
  onStartProduction: (items: ProductionSourceItem[]) => void;
  onAfterRemove?: () => void;
  onRemoveSnapshots?: (snapshotIds: string[]) => Promise<number>;
  mode: 'page' | 'modal';
  startButtonLabel?: string;
}) {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<LessonRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
      const res = await storeAssetControlApi
        .list({ type: 'lesson', page, limit: PAGE_LIMIT, search: searchQuery || undefined })
        .catch(() => null);
      if (cancelled || myReq !== reqIdRef.current) return;
      const snapshots: StoreAssetItem[] = res?.data?.items ?? [];
      setRows(snapshots.map(toLessonRow));
      setTotal(res?.data?.total ?? 0);
      setTotalPages(Math.max(1, res?.data?.totalPages ?? 1));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [page, searchQuery, reloadKey]);

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
      .map((r) => ({ id: r.id, title: r.title, origin: 'snapshot' }));
    onStartProduction(items);
  }, [selected, rows, onStartProduction]);

  const handleRemove = useCallback(async () => {
    if (!onRemoveSnapshots) return;
    const ids = rows.filter((r) => selected.has(r.selectionKey)).map((r) => r.id);
    if (ids.length === 0) return;
    if (!confirm(`선택한 ${ids.length}개 강의를 내 자료함에서 삭제하시겠습니까?`)) return;
    try {
      const n = await onRemoveSnapshots(ids);
      if (n > 0) {
        toast.success(`${n}개 강의를 내 자료함에서 삭제했습니다`);
        setSelected(new Set());
        onAfterRemove?.();
      }
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    }
  }, [selected, rows, onRemoveSnapshots, onAfterRemove]);

  const columns: ListColumnDef<LessonRow>[] = useMemo(
    () => [
      {
        key: 'title',
        header: '강의명',
        sortable: true,
        sortAccessor: (row) => row.title,
        render: (_v, row) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <BookOpen size={14} style={{ color: colors.primary, flexShrink: 0 }} />
            <a href={row.href} target="_blank" rel="noreferrer" style={styles.titleLink} title={row.title}>
              {row.title}
            </a>
            {row.lifecycleStatus === 'archived' && (
              <span style={{ ...styles.badge, background: '#FEF3C7', color: '#D97706' }}>보관</span>
            )}
            {row.lifecycleStatus === 'expired' && (
              <span style={{ ...styles.badge, background: '#FEE2E2', color: '#DC2626' }}>만료</span>
            )}
          </div>
        ),
      },
      {
        key: 'instructorName',
        header: '강사',
        width: '140px',
        sortable: true,
        sortAccessor: (row) => row.instructorName,
        render: (_v, row) => <span style={styles.metaText}>{row.instructorName}</span>,
      },
      {
        key: 'lessonCount',
        header: '레슨 수',
        width: '90px',
        align: 'center',
        sortable: true,
        sortAccessor: (row) => row.lessonCount ?? -1,
        render: (_v, row) => (
          <span style={styles.metaText}>{row.lessonCount == null ? '-' : `${row.lessonCount}개`}</span>
        ),
      },
      {
        key: 'createdAt',
        header: '가져온 날짜',
        width: '120px',
        sortable: true,
        sortAccessor: (row) => row.createdAt,
        render: (_v, row) => <span style={styles.metaText}>{formatDate(row.createdAt)}</span>,
      },
      {
        key: '_actions',
        header: '액션',
        system: true,
        align: 'center',
        width: '80px',
        onCellClick: () => {},
        render: (_v, row) => (
          <a
            href={row.href}
            target="_blank"
            rel="noreferrer"
            style={styles.viewBtn}
            aria-label="강의 보기"
          >
            보기
          </a>
        ),
      },
    ],
    [],
  );

  const showRemoveButton = mode === 'page' && !!onRemoveSnapshots;

  return (
    <section style={styles.section}>
      <div style={styles.infoBar}>
        <Info size={14} style={{ color: colors.primary, flexShrink: 0 }} />
        <span>강의는 LMS 참조 자산입니다. 강의 본문은 LMS 원본에서 확인합니다.</span>
      </div>

      <div style={styles.sectionHeader}>
        <span style={styles.countBadge}>{total}건</span>
        <div style={styles.searchWrap}>
          <Search size={14} style={styles.searchIcon} />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="강의명 검색"
            style={styles.searchInput}
          />
        </div>
      </div>

      {selected.size > 0 && (
        <div style={styles.toolbar}>
          <span style={{ fontSize: 13, color: colors.neutral700 }}>{selected.size}개 선택됨</span>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={handleStart} style={styles.startBtn}>
            <Sparkles size={14} />
            {startButtonLabel ?? '제작 시작'}
          </button>
          {showRemoveButton && (
            <button type="button" onClick={handleRemove} style={styles.bulkDeleteBtn}>
              <Trash2 size={14} />
              선택 삭제
            </button>
          )}
          <button type="button" onClick={() => setSelected(new Set())} style={styles.clearBtn}>
            선택 해제
          </button>
        </div>
      )}

      <DataTable<LessonRow>
        columns={columns}
        data={rows}
        rowKey="selectionKey"
        loading={loading}
        emptyMessage={searchQuery ? '검색 결과가 없습니다' : '가져온 강의가 없습니다'}
        tableId={mode === 'modal' ? 'kpa-store-library-lessons-modal' : 'kpa-store-library-lessons'}
        selectable
        selectedKeys={selected}
        onSelectionChange={setSelected}
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        total={total}
      />
    </section>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  segmentedWrapper: {
    marginBottom: '20px',
  },
  segmentedGroup: {
    display: 'inline-flex',
    gap: '3px',
    background: colors.neutral100,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '10px',
    padding: '3px',
  },
  segmentedBtn: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '1px',
    padding: '8px 20px',
    border: 'none',
    borderRadius: '7px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    minWidth: '96px',
  },
  segmentedBtnActive: {
    background: colors.white,
    boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
  },
  segmentedBtnInactive: {
    background: 'transparent',
  },
  segmentedLabel: {
    fontSize: '14px',
    fontWeight: 600,
    lineHeight: 1.3,
  },
  segmentedDesc: {
    fontSize: '11px',
    lineHeight: 1.2,
  },
  segmentedDescActive: {
    color: colors.primary,
  },
  segmentedDescInactive: {
    color: colors.neutral400,
  },
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

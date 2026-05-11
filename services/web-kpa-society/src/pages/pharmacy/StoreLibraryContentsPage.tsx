/**
 * StoreLibraryContentsPage — 내 자료함 / 콘텐츠
 *
 * WO-O4O-STORE-LIBRARY-CONTENTS-CANONICAL-TABLE-SPLIT-V1
 *   - 문서형 콘텐츠 / 코스형 콘텐츠를 독립 섹션 + 독립 DataTable 로 분리
 *   - 카드형 snapshot UI / 혼합 리스트 / 임시 badge 기반 type filter 제거
 *   - operator-ux-core DataTable + Pagination canonical 적용
 *   - 선택 / bulk 제작 시작 / 선택 제거 — 섹션별 독립 selection
 *   - row key = libraryItemId 기반 (snapshot.id 또는 direct.id, origin prefix 로 충돌 회피)
 *   - duplicate 허용 정책 유지 (WO-O4O-STORE-LIBRARY-COPY-INDEPENDENCE-ALIGN-V1)
 *
 * 이전 WO 흐름 보존:
 *   WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1: cms + content snapshot 통합 표시
 *   WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1:       lesson Reference Metadata 노출
 *   WO-O4O-KPA-STORE-LIBRARY-CONTENTS-REMOVE-FLOW-FIX-V1:
 *     "선택 제거" = snapshot hidden 처리. direct 콘텐츠 삭제는 매장 제작 자료 화면 전담.
 *
 * 제작 시작 flow: 자료 선택 → "제작 시작" → StartProductionModal → 편집기 route 이동
 */

import { useEffect, useState, useCallback, useMemo, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Sparkles, Trash2, RefreshCw, Search, FileText } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { DataTable, Pagination } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import {
  storeAssetControlApi,
  directContentApi,
  type StoreAssetItem,
} from '../../api/assetSnapshot';
import { colors } from '../../styles/theme';
import { StartProductionModal, type ProductionSource, type ProductionSourceItem } from './StartProductionModal';

const PAGE_SIZE = 10;
// 백엔드 GET /assets limit 상한 (asset-copy-core controller 기준 100).
// 단일 매장 자료함 보유량은 일반적으로 이 한도 내 — 한도 초과 시 server pagination 도입은 후속 WO.
const FETCH_LIMIT = 100;

// ─── Row Types ───────────────────────────────────────────────────────────────

interface DirectItem {
  id: string;
  sourceType: string;
  snapshotId: string | null;
  title: string;
  updatedAt: string;
}

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

interface CourseRow {
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

function buildDocumentRows(
  cmsSnaps: StoreAssetItem[],
  contentSnaps: StoreAssetItem[],
  directs: DirectItem[],
): DocumentRow[] {
  const snapshotRows: DocumentRow[] = [...cmsSnaps, ...contentSnaps].map((s) => {
    const sourceType: DocSourceType = s.assetType === 'content' ? 'content' : 'cms';
    return {
      id: s.id,
      origin: 'snapshot',
      selectionKey: keyOf('snapshot', s.id),
      title: s.title || '(제목 없음)',
      authorName: readString(s.contentJson, 'authorName') || '-',
      sourceType,
      createdAt: s.createdAt,
      lifecycleStatus: s.lifecycleStatus ?? null,
      href: `/view/${s.id}`,
    };
  });
  const directRows: DocumentRow[] = directs.map((d) => ({
    id: d.id,
    origin: 'direct',
    selectionKey: keyOf('direct', d.id),
    title: d.title || '(제목 없음)',
    authorName: '내 매장',
    sourceType: 'direct',
    createdAt: d.updatedAt,
    lifecycleStatus: null,
    href: `/store/content/direct/${d.id}`,
  }));
  return [...snapshotRows, ...directRows].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function buildCourseRows(lessonSnaps: StoreAssetItem[]): CourseRow[] {
  return lessonSnaps
    .map((s) => {
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
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function StoreLibraryContentsPage() {
  const navigate = useNavigate();
  const [cmsSnaps, setCmsSnaps] = useState<StoreAssetItem[]>([]);
  const [contentSnaps, setContentSnaps] = useState<StoreAssetItem[]>([]);
  const [lessonSnaps, setLessonSnaps] = useState<StoreAssetItem[]>([]);
  const [directs, setDirects] = useState<DirectItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Production modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSource, setModalSource] = useState<ProductionSource | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const emptyPage = { items: [] as StoreAssetItem[], total: 0, page: 1, limit: FETCH_LIMIT };
      const [cmsRes, contentRes, lessonRes, directRes] = await Promise.all([
        storeAssetControlApi.list({ type: 'cms', limit: FETCH_LIMIT }).catch(() => ({ data: emptyPage })),
        storeAssetControlApi.list({ type: 'content', limit: FETCH_LIMIT }).catch(() => ({ data: emptyPage })),
        storeAssetControlApi.list({ type: 'lesson', limit: FETCH_LIMIT }).catch(() => ({ data: emptyPage })),
        directContentApi.list().catch(() => ({ data: [] as DirectItem[] })),
      ]);
      setCmsSnaps(cmsRes.data?.items ?? []);
      setContentSnaps(contentRes.data?.items ?? []);
      setLessonSnaps(lessonRes.data?.items ?? []);
      setDirects(((directRes.data as DirectItem[] | undefined) ?? []).filter((it) => it.sourceType === 'direct'));
    } catch (e: any) {
      toast.error(e?.message || '불러오는 데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const documentRows = useMemo(
    () => buildDocumentRows(cmsSnaps, contentSnaps, directs),
    [cmsSnaps, contentSnaps, directs],
  );
  const courseRows = useMemo(() => buildCourseRows(lessonSnaps), [lessonSnaps]);

  // ── 제작 시작 (공통) ─────────────────────────────────────────────────
  const openProduction = useCallback((items: ProductionSourceItem[]) => {
    if (items.length === 0) return;
    setModalSource({ fromLibrary: 'contents', items });
    setModalOpen(true);
  }, []);

  // ── 선택 제거 (snapshot 만 hidden 처리) ─────────────────────────────
  const removeSnapshots = useCallback(async (snapshotIds: string[]): Promise<number> => {
    if (snapshotIds.length === 0) return 0;
    await Promise.all(snapshotIds.map((id) => storeAssetControlApi.updatePublishStatus(id, 'hidden')));
    return snapshotIds.length;
  }, []);

  // 부모가 fetchAll 을 다시 호출하므로 섹션은 상태를 직접 비우지 않음
  const handleAfterRemove = useCallback(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.breadcrumb}>
            <span>내 자료함</span>
            <span style={{ color: colors.neutral300 }}>/</span>
            <span style={{ color: colors.neutral700 }}>콘텐츠</span>
          </div>
          <h1 style={styles.title}>
            <BookOpen size={20} style={{ color: colors.primary }} />
            콘텐츠
          </h1>
          <p style={styles.subtitle}>
            문서형/코스형 콘텐츠를 분리해 보여드립니다. 선택 후 "제작 시작" 으로 POP / QR / 블로그 / 상품 상세설명을 만들 수 있습니다.
          </p>
        </div>
        <button onClick={fetchAll} style={styles.refreshBtn} disabled={loading}>
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      <DocumentsSection
        rows={documentRows}
        loading={loading}
        onStartProduction={openProduction}
        onBulkRemove={async (ids) => {
          const n = await removeSnapshots(ids).catch((e: any) => {
            toast.error(e?.message || '제거에 실패했습니다');
            return 0;
          });
          if (n > 0) {
            toast.success(`${n}개 콘텐츠를 내 자료함에서 제거했습니다`);
            handleAfterRemove();
          }
        }}
        navigate={navigate}
      />

      <CoursesSection
        rows={courseRows}
        loading={loading}
        onStartProduction={openProduction}
        onBulkRemove={async (ids) => {
          const n = await removeSnapshots(ids).catch((e: any) => {
            toast.error(e?.message || '제거에 실패했습니다');
            return 0;
          });
          if (n > 0) {
            toast.success(`${n}개 강의를 내 자료함에서 제거했습니다`);
            handleAfterRemove();
          }
        }}
      />

      <StartProductionModal
        open={modalOpen}
        source={modalSource}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

// ─── DocumentsSection ────────────────────────────────────────────────────────

function DocumentsSection({
  rows,
  loading,
  onStartProduction,
  onBulkRemove,
  navigate,
}: {
  rows: DocumentRow[];
  loading: boolean;
  onStartProduction: (items: ProductionSourceItem[]) => void;
  onBulkRemove: (snapshotIds: string[]) => void | Promise<void>;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.title.toLowerCase().includes(q) || r.authorName.toLowerCase().includes(q));
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  // 검색 변경 시 page reset, 또한 보이지 않는 항목 selection 정리
  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    // 데이터가 갱신되어 더 이상 존재하지 않는 selection 정리
    setSelected((prev) => {
      const validKeys = new Set(rows.map((r) => r.selectionKey));
      let changed = false;
      const next = new Set<string>();
      for (const k of prev) {
        if (validKeys.has(k)) next.add(k);
        else changed = true;
      }
      return changed ? next : prev;
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
    const snapshotIds = rows
      .filter((r) => selected.has(r.selectionKey) && r.origin === 'snapshot')
      .map((r) => r.id);
    const directCount = selected.size - snapshotIds.length;
    if (snapshotIds.length === 0) {
      toast.error('제거 가능한 항목이 없습니다 (직접 작성 콘텐츠는 매장 제작 자료에서 제거)');
      return;
    }
    if (!confirm(`선택한 ${snapshotIds.length}개 콘텐츠를 내 자료함에서 제거하시겠습니까?${directCount > 0 ? `\n(직접 작성 ${directCount}개는 매장 제작 자료에서 제거)` : ''}`)) return;
    await onBulkRemove(snapshotIds);
    setSelected(new Set());
  }, [selected, rows, onBulkRemove]);

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
            <Link to={row.href} style={styles.titleLink} title={row.title}>
              {row.title}
            </Link>
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
          <button
            type="button"
            onClick={() => navigate(row.href)}
            style={styles.viewBtn}
            aria-label="자료 보기"
          >
            보기
          </button>
        ),
      },
    ],
    [navigate],
  );

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>
          <FileText size={16} style={{ color: colors.primary }} />
          문서형 콘텐츠
          <span style={styles.countBadge}>{filtered.length}건</span>
        </h2>
        <div style={styles.searchWrap}>
          <Search size={14} style={styles.searchIcon} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="제목·작성자 검색"
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
            제작 시작
          </button>
          <button type="button" onClick={handleRemove} style={styles.bulkDeleteBtn}>
            <Trash2 size={14} />
            선택 제거
          </button>
          <button type="button" onClick={() => setSelected(new Set())} style={styles.clearBtn}>
            선택 해제
          </button>
        </div>
      )}

      <DataTable<DocumentRow>
        columns={columns}
        data={pageRows}
        rowKey="selectionKey"
        loading={loading}
        emptyMessage="가져온 문서형 콘텐츠가 없습니다"
        tableId="kpa-store-library-documents"
        selectable
        selectedKeys={selected}
        onSelectionChange={setSelected}
      />

      <Pagination
        page={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
        total={filtered.length}
      />
    </section>
  );
}

// ─── CoursesSection ──────────────────────────────────────────────────────────

function CoursesSection({
  rows,
  loading,
  onStartProduction,
  onBulkRemove,
}: {
  rows: CourseRow[];
  loading: boolean;
  onStartProduction: (items: ProductionSourceItem[]) => void;
  onBulkRemove: (snapshotIds: string[]) => void | Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.title.toLowerCase().includes(q) || r.instructorName.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    setSelected((prev) => {
      const validKeys = new Set(rows.map((r) => r.selectionKey));
      let changed = false;
      const next = new Set<string>();
      for (const k of prev) {
        if (validKeys.has(k)) next.add(k);
        else changed = true;
      }
      return changed ? next : prev;
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
    const ids = rows.filter((r) => selected.has(r.selectionKey)).map((r) => r.id);
    if (ids.length === 0) return;
    if (!confirm(`선택한 ${ids.length}개 강의를 내 자료함에서 제거하시겠습니까?`)) return;
    await onBulkRemove(ids);
    setSelected(new Set());
  }, [selected, rows, onBulkRemove]);

  const columns: ListColumnDef<CourseRow>[] = useMemo(
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

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>
          <BookOpen size={16} style={{ color: colors.primary }} />
          코스형 콘텐츠
          <span style={styles.countBadge}>{filtered.length}건</span>
        </h2>
        <div style={styles.searchWrap}>
          <Search size={14} style={styles.searchIcon} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="강의명·강사 검색"
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
            제작 시작
          </button>
          <button type="button" onClick={handleRemove} style={styles.bulkDeleteBtn}>
            <Trash2 size={14} />
            선택 제거
          </button>
          <button type="button" onClick={() => setSelected(new Set())} style={styles.clearBtn}>
            선택 해제
          </button>
        </div>
      )}

      <DataTable<CourseRow>
        columns={columns}
        data={pageRows}
        rowKey="selectionKey"
        loading={loading}
        emptyMessage="가져온 코스형 콘텐츠가 없습니다"
        tableId="kpa-store-library-courses"
        selectable
        selectedKeys={selected}
        onSelectionChange={setSelected}
      />

      <Pagination
        page={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
        total={filtered.length}
      />
    </section>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: colors.neutral400,
    marginBottom: '6px',
  },
  title: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '20px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: colors.neutral500,
    margin: '6px 0 0',
  },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  section: {
    marginBottom: '32px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  sectionTitle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
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
};

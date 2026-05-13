/**
 * StoreLibraryContentsPage — 내 자료함 / 콘텐츠
 *
 * WO-O4O-STORE-LIBRARY-CONTENTS-TAB-RESTRUCTURE-V1
 *   - 상위 탭: [콘텐츠] [강의]
 *   - 콘텐츠 탭 내부: [문서형] [코스형]
 *   - 강의 탭: LMS 참조 자산 단일 리스트 + 안내 문구
 *   - 이중 세로 section 구조 제거
 *
 * 이전 WO 흐름 보존:
 *   WO-O4O-STORE-LIBRARY-CONTENTS-CANONICAL-TABLE-SPLIT-V1
 *   WO-O4O-STORE-LIBRARY-SERVER-PAGINATION-V1: server-side pagination + search
 *   WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1: 가상 type='document' = cms+content 통합
 *   WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1: lesson Reference Metadata 노출
 *   WO-O4O-KPA-STORE-LIBRARY-CONTENTS-REMOVE-FLOW-FIX-V1
 *   WO-O4O-STORE-LIBRARY-COPY-INDEPENDENCE-ALIGN-V1: duplicate 허용 유지
 *
 * 제작 시작 flow: 자료 선택 → "제작 시작" → StartProductionModal
 *   → 편집기 route 이동 또는 AI 제작 자료 초안 만들기 (AiContentModal)
 * WO-O4O-STORE-PRODUCTION-MATERIALS-FLOW-REALIGN-V1:
 *   StartProductionModal onAiAction 추가. 콘텐츠 선택 → AI 제작 자료 초안 → production-materials 저장.
 */

import { useEffect, useState, useCallback, useMemo, useRef, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Sparkles, Trash2, RefreshCw, Search, FileText, PenSquare, Info } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { DataTable, Pagination } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { AiContentModal } from '@o4o/content-editor';
import {
  storeAssetControlApi,
  storeLibraryApi,
  type StoreAssetItem,
  type LibraryContentItem,
} from '../../api/assetSnapshot';
import { getAccessToken } from '../../contexts/AuthContext';
import { colors } from '../../styles/theme';
import { StartProductionModal, type ProductionSource, type ProductionSourceItem } from './StartProductionModal';
import { CreateContentFromResourcesModal } from './CreateContentFromResourcesModal';
import { composeSourceTextFromItems } from './productionTargets';

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

// ─── Tab Bar ─────────────────────────────────────────────────────────────────

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

// ─── Page Component ──────────────────────────────────────────────────────────

export default function StoreLibraryContentsPage() {
  const navigate = useNavigate();

  const [topTab, setTopTab] = useState<TopTab>('contents');
  const [contentsSubTab, setContentsSubTab] = useState<ContentsSubTab>('document');

  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalSource, setModalSource] = useState<ProductionSource | null>(null);
  const [createFromResourcesOpen, setCreateFromResourcesOpen] = useState(false);

  // WO-O4O-STORE-PRODUCTION-MATERIALS-FLOW-RECOVERY-V1:
  // AI 흐름은 in-page AiContentModal 호출 → onInsert 시 ProductionMaterialEditorPage 로 결과 HTML 전달.
  // (이전 구현: 프롬프트 텍스트를 editor 초기값으로 직접 navigate → AI 생성 단계가 사라졌던 문제 복구)
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInitialText, setAiInitialText] = useState('');
  const [aiSourceMetadata, setAiSourceMetadata] = useState<
    { sourceContentId?: string; sourceTitle?: string; sourceOrigin?: string } | null
  >(null);

  const openProduction = useCallback((items: ProductionSourceItem[]) => {
    if (items.length === 0) return;
    setModalSource({ fromLibrary: 'contents', items });
    setModalOpen(true);
  }, []);

  const handleAiAction = useCallback((source: ProductionSource) => {
    const text = composeSourceTextFromItems(source.items);
    const first = source.items[0];
    setAiInitialText(text);
    setAiSourceMetadata(
      first
        ? { sourceContentId: first.id, sourceTitle: first.title, sourceOrigin: first.origin }
        : null,
    );
    setModalOpen(false);
    setAiOpen(true);
  }, []);

  const handleAiInsert = useCallback(
    (data: { html: string; title: string }) => {
      setAiOpen(false);
      navigate('/store/library/production-materials/new', {
        state: {
          generatedHtml: data.html,
          title: data.title || undefined,
          sourceMetadata: aiSourceMetadata ?? undefined,
        },
      });
    },
    [navigate, aiSourceMetadata],
  );

  const removeSnapshots = useCallback(async (snapshotIds: string[]): Promise<number> => {
    if (snapshotIds.length === 0) return 0;
    await Promise.all(snapshotIds.map((id) => storeAssetControlApi.updatePublishStatus(id, 'hidden')));
    return snapshotIds.length;
  }, []);

  const subtitleByTab: Record<TopTab, string> = {
    contents: '콘텐츠(Full Copy 자산)를 문서형/코스형으로 구분해 보여드립니다. 선택 후 "제작 시작"으로 POP / QR / 블로그 / 상품 상세설명을 만들 수 있습니다.',
    lessons: 'LMS 참조 자산입니다. 강의 본문은 LMS 원본에서 확인합니다.',
  };

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
          <p style={styles.subtitle}>{subtitleByTab[topTab]}</p>
        </div>
        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={() => setCreateFromResourcesOpen(true)}
            style={styles.createBtn}
          >
            <PenSquare size={14} />
            콘텐츠 제작
          </button>
          <button onClick={reload} style={styles.refreshBtn}>
            <RefreshCw size={14} />
            새로고침
          </button>
        </div>
      </div>

      {/* 상위 탭: 콘텐츠 / 강의 */}
      <TopTabBar active={topTab} onChange={setTopTab} />

      {/* 콘텐츠 탭 */}
      {topTab === 'contents' && (
        <>
          {/* 하위 탭: 문서형 / 코스형 */}
          <SubTabBar active={contentsSubTab} onChange={setContentsSubTab} />

          {contentsSubTab === 'document' && (
            <DocumentsSection
              reloadKey={reloadKey}
              onStartProduction={openProduction}
              onAfterRemove={reload}
              onRemoveSnapshots={removeSnapshots}
              navigate={navigate}
            />
          )}

          {contentsSubTab === 'course-resource' && (
            <CourseResourceEmptySection />
          )}
        </>
      )}

      {/* 강의 탭 */}
      {topTab === 'lessons' && (
        <LessonsSection
          reloadKey={reloadKey}
          onStartProduction={openProduction}
          onAfterRemove={reload}
          onRemoveSnapshots={removeSnapshots}
        />
      )}

      <StartProductionModal
        open={modalOpen}
        source={modalSource}
        onClose={() => setModalOpen(false)}
        onAiAction={handleAiAction}
      />

      <CreateContentFromResourcesModal
        open={createFromResourcesOpen}
        onClose={() => setCreateFromResourcesOpen(false)}
        onCreated={reload}
      />

      {/* WO-O4O-STORE-PRODUCTION-MATERIALS-FLOW-RECOVERY-V1
          콘텐츠/강의 선택 → StartProductionModal 의 AI 카드 → 본 모달에서 AI 생성 →
          onInsert 시 ProductionMaterialEditorPage 로 결과 HTML 전달 */}
      <AiContentModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        editor={null}
        onInsert={handleAiInsert}
        initialText={aiInitialText}
        headerLabel="AI 매장 제작 자료 초안"
        aiRequestHeaders={(() => {
          const token = getAccessToken();
          return token ? { Authorization: `Bearer ${token}` } : undefined;
        })()}
      />

    </div>
  );
}

// ─── DocumentsSection — server-side paginated ────────────────────────────────

function DocumentsSection({
  reloadKey,
  onStartProduction,
  onAfterRemove,
  onRemoveSnapshots,
  navigate,
}: {
  reloadKey: number;
  onStartProduction: (items: ProductionSourceItem[]) => void;
  onAfterRemove: () => void;
  onRemoveSnapshots: (snapshotIds: string[]) => Promise<number>;
  navigate: ReturnType<typeof useNavigate>;
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
    const snapshotIds = rows
      .filter((r) => selected.has(r.selectionKey) && r.origin === 'snapshot')
      .map((r) => r.id);
    const directCount = selected.size - snapshotIds.length;
    if (snapshotIds.length === 0) {
      toast.error('제거 가능한 항목이 없습니다 (직접 작성 콘텐츠는 매장 제작 자료에서 제거)');
      return;
    }
    if (
      !confirm(
        `선택한 ${snapshotIds.length}개 콘텐츠를 내 자료함에서 제거하시겠습니까?${
          directCount > 0 ? `\n(직접 작성 ${directCount}개는 매장 제작 자료에서 제거)` : ''
        }`,
      )
    )
      return;
    try {
      const n = await onRemoveSnapshots(snapshotIds);
      if (n > 0) {
        toast.success(`${n}개 콘텐츠를 내 자료함에서 제거했습니다`);
        setSelected(new Set());
        onAfterRemove();
      }
    } catch (e: any) {
      toast.error(e?.message || '제거에 실패했습니다');
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
        data={rows}
        rowKey="selectionKey"
        loading={loading}
        emptyMessage={searchQuery ? '검색 결과가 없습니다' : '가져온 문서형 콘텐츠가 없습니다'}
        tableId="kpa-store-library-documents"
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

// ─── CourseResourceEmptySection — 코스형 콘텐츠 (확장 대비) ──────────────────

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

// ─── LessonsSection — server-side paginated ───────────────────────────────────

function LessonsSection({
  reloadKey,
  onStartProduction,
  onAfterRemove,
  onRemoveSnapshots,
}: {
  reloadKey: number;
  onStartProduction: (items: ProductionSourceItem[]) => void;
  onAfterRemove: () => void;
  onRemoveSnapshots: (snapshotIds: string[]) => Promise<number>;
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
    const ids = rows.filter((r) => selected.has(r.selectionKey)).map((r) => r.id);
    if (ids.length === 0) return;
    if (!confirm(`선택한 ${ids.length}개 강의를 내 자료함에서 제거하시겠습니까?`)) return;
    try {
      const n = await onRemoveSnapshots(ids);
      if (n > 0) {
        toast.success(`${n}개 강의를 내 자료함에서 제거했습니다`);
        setSelected(new Set());
        onAfterRemove();
      }
    } catch (e: any) {
      toast.error(e?.message || '제거에 실패했습니다');
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

  return (
    <section style={styles.section}>
      {/* 안내 문구: 강의는 LMS 참조 자산 */}
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

      <DataTable<LessonRow>
        columns={columns}
        data={rows}
        rowKey="selectionKey"
        loading={loading}
        emptyMessage={searchQuery ? '검색 결과가 없습니다' : '가져온 강의가 없습니다'}
        tableId="kpa-store-library-lessons"
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
    marginBottom: '20px',
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
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  createBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    background: colors.primary,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: colors.white,
    cursor: 'pointer',
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
  // Top segmented button group
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
  // Sub tab bar
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

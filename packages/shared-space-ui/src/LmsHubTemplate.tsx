/**
 * LmsHubTemplate — /lms HUB 공통 템플릿
 *
 * WO-O4O-LMS-HUB-TEMPLATE-FOUNDATION-V1
 *
 * KPA-Society EducationPage를 canonical 기준으로 추출.
 * 서비스별 차이(제목, 경로, API, 옵션)는 LmsHubConfig로 주입.
 *
 * 확장 패턴:
 *   <LmsHubTemplate config={serviceConfig} />
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import {
  BaseTable,
  ActionBar,
  PageSection,
  PageContainer,
  type O4OColumn,
  type ActionBarAction,
} from '@o4o/ui';

// ─── Shared Course Interface ─────────────────────────────────────────────────

export interface LmsHubCourse {
  id: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  /** 수준 (beginner / intermediate / advanced 등) */
  level?: string;
  /** 상태 (published / draft / archived) */
  status?: string;
  /** 총 재생시간(분) */
  duration?: number;
  /** 강의 수 (lesson count) */
  lessonCount?: number;
  /** 카테고리 */
  category?: string;
  /** 강사 표시명 */
  instructorName?: string;
  /** 강사 ID (소유 여부 판정용) */
  instructorId?: string | null;
  createdAt?: string;
}

export interface LmsHubFetchParams {
  search?: string;
  level?: string;
  page?: number;
  limit?: number;
}

// ─── Config Interface ─────────────────────────────────────────────────────────

export interface LmsHubConfig {
  /** 페이지 제목 */
  title: string;
  /** 페이지 부제 */
  subtitle: string;
  /** 강의 상세 경로 생성 함수 */
  courseDetailPath: (courseId: string) => string;
  /** 강의 목록 조회 함수 — 서비스별 API 어댑터 */
  fetchCourses: (params: LmsHubFetchParams) => Promise<{ data: LmsHubCourse[]; totalPages: number }>;
  /**
   * 행(row) 단위 추가 액션 렌더러 (optional)
   * KPA instructor 소유 강의 수정/종료 버튼 등 서비스 고유 기능에 사용.
   */
  renderRowActions?: (course: LmsHubCourse, reload: () => void) => React.ReactNode;
}

// ─── Status label/color helpers ───────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: '준비중',
  published: '공개',
  archived: '종료',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  published: { bg: '#ecfdf5', text: '#059669' },
  draft: { bg: '#fef3c7', text: '#92400e' },
  archived: { bg: '#f1f5f9', text: '#64748b' },
};

// ─── Template Component ───────────────────────────────────────────────────────

export function LmsHubTemplate({ config }: { config: LmsHubConfig }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [courses, setCourses] = useState<LmsHubCourse[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentSearch = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState(currentSearch);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const result = await config.fetchCourses({
        search: currentSearch || undefined,
        page: currentPage,
        limit: 20,
      });
      setCourses(result.data);
      setTotalPages(result.totalPages);
    } catch {
      setCourses([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [config, currentPage, currentSearch]);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  // ── Handlers ──

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams((prev) => {
      if (searchInput.trim()) prev.set('search', searchInput.trim());
      else prev.delete('search');
      prev.set('page', '1');
      return prev;
    });
  };

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => {
      prev.set('page', String(page));
      return prev;
    });
  };

  const handleBulkCopy = useCallback(() => {
    const urls = Array.from(selectedKeys)
      .map((id) => `${window.location.origin}${config.courseDetailPath(id)}`)
      .join('\n');
    navigator.clipboard.writeText(urls).catch(() => {});
  }, [selectedKeys, config]);

  // ── Columns ──

  const columns = useMemo((): O4OColumn<LmsHubCourse>[] => [
    {
      key: 'title',
      header: '제목',
      width: '30%',
      sortable: true,
      sortAccessor: (row) => row.title,
      render: (_v, row) => (
        <Link
          to={config.courseDetailPath(row.id)}
          style={colStyles.titleLink}
        >
          {row.title}
        </Link>
      ),
    },
    {
      key: 'instructorName',
      header: '강사',
      width: '15%',
      sortable: true,
      sortAccessor: (row) => row.instructorName || '',
      render: (_v, row) => (
        <span style={colStyles.cell}>{row.instructorName || '-'}</span>
      ),
    },
    {
      key: 'category',
      header: '유형',
      width: '12%',
      render: (_v, row) => {
        const label = row.category || row.level || '-';
        return (
          <span style={colStyles.badge}>{label}</span>
        );
      },
    },
    {
      key: 'lessonCount',
      header: '강의수',
      width: '8%',
      align: 'center',
      sortable: true,
      sortAccessor: (row) => row.lessonCount ?? 0,
      render: (_v, row) => (
        <span style={colStyles.cell}>
          {row.lessonCount != null ? `${row.lessonCount}개` : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      width: '10%',
      align: 'center',
      render: (_v, row) => {
        const s = row.status || 'draft';
        const c = STATUS_COLORS[s] || STATUS_COLORS.draft;
        return (
          <span style={{ ...colStyles.badge, backgroundColor: c.bg, color: c.text }}>
            {STATUS_LABELS[s] || s}
          </span>
        );
      },
    },
    {
      key: '_actions',
      header: '',
      width: '140px',
      align: 'center',
      system: true,
      render: (_v, row) => (
        <div style={colStyles.actionsCell}>
          <Link to={config.courseDetailPath(row.id)} style={colStyles.enrollBtn}>
            수강하기
          </Link>
          {config.renderRowActions?.(row, loadCourses)}
        </div>
      ),
    },
  ], [config, loadCourses]);

  // ── Bulk Actions ──

  const bulkActions: ActionBarAction[] = [
    {
      key: 'copy',
      label: '복사',
      icon: <Link2 size={14} />,
      onClick: handleBulkCopy,
    },
  ];

  return (
    <PageSection last>
      <PageContainer>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>{config.title}</h1>
            <p style={styles.subtitle}>{config.subtitle}</p>
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} style={styles.searchRow}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="강의 검색..."
            style={styles.searchInput}
          />
          <button type="submit" style={styles.searchBtn}>검색</button>
        </form>

        {/* Bulk ActionBar (선택 시에만 표시) */}
        {selectedKeys.size > 0 && (
          <ActionBar
            selectedCount={selectedKeys.size}
            actions={bulkActions}
            onClearSelection={() => setSelectedKeys(new Set())}
          />
        )}

        {/* Table */}
        {loading ? (
          <div style={styles.loading}>강의를 불러오는 중...</div>
        ) : (
          <>
            <div style={styles.tableWrap}>
              <BaseTable<LmsHubCourse>
                columns={columns}
                data={courses}
                rowKey={(row) => row.id}
                selectable
                selectedKeys={selectedKeys}
                onSelectionChange={setSelectedKeys}
                emptyMessage={
                  <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8' }}>
                    {currentSearch
                      ? `"${currentSearch}"에 대한 검색 결과가 없습니다`
                      : '등록된 강의가 없습니다'}
                  </div>
                }
              />
            </div>
            {totalPages > 1 && (
              <div style={styles.paginationWrap}>
                <div style={styles.paginationRow}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      style={{
                        ...styles.pageBtn,
                        ...(p === currentPage ? styles.pageBtnActive : {}),
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </PageContainer>
    </PageSection>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const colStyles: Record<string, React.CSSProperties> = {
  titleLink: {
    color: '#2563eb',
    fontWeight: 600,
    textDecoration: 'none',
    fontSize: '14px',
  },
  cell: {
    fontSize: '14px',
    color: '#475569',
  },
  badge: {
    padding: '2px 8px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  actionsCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  enrollBtn: {
    padding: '4px 12px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#ffffff',
    backgroundColor: '#2563eb',
    textDecoration: 'none',
    borderRadius: '6px',
    whiteSpace: 'nowrap' as const,
  },
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 0 16px',
    borderBottom: '1px solid #e2e8f0',
    marginBottom: '16px',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: 0,
    color: '#0f172a',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  searchRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  searchInput: {
    flex: 1,
    padding: '10px 16px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
  },
  searchBtn: {
    padding: '10px 20px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    flexShrink: 0,
  },
  tableWrap: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#94a3b8',
  },
  paginationWrap: {
    marginTop: '16px',
  },
  paginationRow: {
    display: 'flex',
    gap: '4px',
    justifyContent: 'center',
  },
  pageBtn: {
    padding: '6px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontSize: '13px',
    cursor: 'pointer',
  },
  pageBtnActive: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    borderColor: '#2563eb',
  },
};

export default LmsHubTemplate;

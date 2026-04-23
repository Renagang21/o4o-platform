/**
 * EducationPage - 강의 목록 (O4O HUB 테이블 표준)
 *
 * WO-KPA-LMS-HUB-RESTRUCTURE-V1
 * - 카드 UI → BaseTable 전환
 * - 강사 자격 확인 → 강의 등록 버튼
 *
 * WO-LMS-HUB-TABLE-STANDARD-V1
 * - selectable + ActionBar (복사/삭제) + RowActionMenu 추가
 * - 👍👁💬: Course 타입에 해당 필드 없음 → 보류
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Link2, Trash2 } from 'lucide-react';
import { BaseTable, ActionBar, RowActionMenu, PageSection, PageContainer, type O4OColumn, type ActionBarAction, type RowActionItem } from '@o4o/ui';
import { Pagination } from '../../components/common';
import { lmsApi } from '../../api';
import { lmsInstructorApi } from '../../api/lms-instructor';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';
import { colors, spacing, typography } from '../../styles/theme';
import type { Course } from '../../types';

const STATUS_LABELS: Record<string, string> = {
  draft: '준비중',
  published: '공개',
  archived: '종료',
};

export function EducationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [courses, setCourses] = useState<Course[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentSearch = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState(currentSearch);

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await lmsApi.getCourses({
        status: 'published',
        search: currentSearch || undefined,
        page: currentPage,
        limit: 20,
      });
      setCourses(res.data || []);
      const pag = (res as any).pagination;
      setTotalPages(pag?.totalPages || res.totalPages || 1);
    } catch {
      setCourses([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentSearch]);

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

  const handleDeleteCourse = useCallback(async (id: string) => {
    try {
      await lmsInstructorApi.deleteCourse(id);
      toast.success('강의가 삭제되었습니다');
      setSelectedKeys((prev) => { const next = new Set(prev); next.delete(id); return next; });
      loadCourses();
    } catch {
      toast.error('삭제에 실패했습니다');
    }
  }, [loadCourses]);

  const handleBulkCopy = useCallback(() => {
    const urls = Array.from(selectedKeys)
      .map((id) => `${window.location.origin}/lms/course/${id}`)
      .join('\n');
    navigator.clipboard.writeText(urls)
      .then(() => toast.success(`${selectedKeys.size}개 링크가 복사되었습니다`))
      .catch(() => toast.error('복사에 실패했습니다'));
  }, [selectedKeys]);

  const handleBulkDelete = useCallback(async () => {
    try {
      await Promise.all(Array.from(selectedKeys).map((id) => lmsInstructorApi.deleteCourse(id)));
      toast.success(`${selectedKeys.size}개가 삭제되었습니다`);
      setSelectedKeys(new Set());
      loadCourses();
    } catch {
      toast.error('삭제에 실패했습니다');
    }
  }, [selectedKeys, loadCourses]);

  // ── Columns ──
  // 👍👁💬: Course 타입에 like_count/view_count/comment_count 없음 → 보류

  const columns = useMemo((): O4OColumn<Course>[] => [
    {
      key: 'title',
      header: '제목',
      width: '30%',
      sortable: true,
      sortAccessor: (row) => row.title,
      render: (_v, row) => (
        <Link
          to={`/lms/course/${row.id}`}
          style={{ color: colors.primary, fontWeight: 600, textDecoration: 'none', fontSize: '14px' }}
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
      sortAccessor: (row) => (row as any).instructor?.name || row.instructorName || '',
      render: (_v, row) => (
        <span style={{ fontSize: '14px', color: colors.neutral700 }}>
          {(row as any).instructor?.name || row.instructorName || '-'}
        </span>
      ),
    },
    {
      key: 'category',
      header: '유형',
      width: '12%',
      render: (_v, row) => (
        <span style={{
          padding: '2px 8px',
          backgroundColor: colors.neutral100,
          color: colors.neutral700,
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 500,
        }}>
          {row.category || '-'}
        </span>
      ),
    },
    {
      key: 'lessonCount',
      header: '강의수',
      width: '8%',
      align: 'center',
      sortable: true,
      sortAccessor: (row) => row.lessonCount,
      render: (_v, row) => (
        <span style={{ fontSize: '14px', color: colors.neutral600 }}>{row.lessonCount}개</span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      width: '10%',
      align: 'center',
      render: (_v, row) => {
        const statusColors: Record<string, { bg: string; text: string }> = {
          published: { bg: '#ecfdf5', text: '#059669' },
          draft: { bg: '#fef3c7', text: '#92400e' },
          archived: { bg: colors.neutral100, text: colors.neutral500 },
        };
        const c = statusColors[row.status] || statusColors.draft;
        return (
          <span style={{
            padding: '2px 8px',
            backgroundColor: c.bg,
            color: c.text,
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 500,
          }}>
            {STATUS_LABELS[row.status] || row.status}
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
      render: (_v, row) => {
        const isOwner = !!(user && (row as any).instructor?.id === user.id);
        const rowActions: RowActionItem[] = isOwner ? [
          {
            key: 'edit',
            label: '수정',
            onClick: () => navigate(`/instructor/courses/${row.id}/edit`),
          },
          {
            key: 'delete',
            label: '삭제',
            variant: 'danger',
            onClick: () => handleDeleteCourse(row.id),
            confirm: {
              title: '강의 삭제',
              message: '이 강의를 삭제하시겠습니까?',
              variant: 'danger',
            },
          },
        ] : [];
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Link
              to={`/lms/course/${row.id}`}
              style={{
                padding: '4px 12px',
                fontSize: '13px',
                fontWeight: 500,
                color: colors.white,
                backgroundColor: colors.primary,
                textDecoration: 'none',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              수강하기
            </Link>
            {isOwner && <RowActionMenu actions={rowActions} />}
          </div>
        );
      },
    },
  ], [user, navigate, handleDeleteCourse]);

  // ── Bulk Actions ──

  const bulkActions: ActionBarAction[] = [
    {
      key: 'copy',
      label: '복사',
      icon: <Link2 size={14} />,
      onClick: handleBulkCopy,
    },
    {
      key: 'delete',
      label: '삭제',
      variant: 'danger',
      icon: <Trash2 size={14} />,
      onClick: handleBulkDelete,
      confirm: {
        title: '삭제 확인',
        message: `선택한 ${selectedKeys.size}개를 삭제하시겠습니까?`,
        variant: 'danger',
      },
    },
  ];

  return (
    <PageSection last>
      <PageContainer>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>강의</h1>
          <p style={styles.subtitle}>보수교육, 온라인 세미나, 실무 강의</p>
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
            <BaseTable<Course>
              columns={columns}
              data={courses}
              rowKey={(row) => row.id}
              selectable
              selectedKeys={selectedKeys}
              onSelectionChange={setSelectedKeys}
              emptyMessage={
                <div style={{ padding: '40px 0', textAlign: 'center', color: colors.neutral500 }}>
                  {currentSearch ? `"${currentSearch}"에 대한 검색 결과가 없습니다` : '등록된 강의가 없습니다'}
                </div>
              }
            />
          </div>
          {totalPages > 1 && (
            <div style={styles.paginationWrap}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}

      </PageContainer>
    </PageSection>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: `0 ${spacing.lg} ${spacing.xl}`,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${spacing.xl} 0 ${spacing.lg}`,
    borderBottom: `1px solid ${colors.neutral200}`,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headingL,
    margin: 0,
    color: colors.neutral900,
  },
  subtitle: {
    margin: `${spacing.xs} 0 0`,
    fontSize: '0.875rem',
    color: colors.neutral500,
  },
  searchRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  searchInput: {
    flex: 1,
    padding: '10px 16px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
  },
  searchBtn: {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    flexShrink: 0,
  },
  tableWrap: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    border: `1px solid ${colors.neutral200}`,
    overflow: 'hidden',
  },
  loading: {
    padding: spacing.xl,
    textAlign: 'center',
    color: colors.neutral500,
  },
  paginationWrap: {
    marginTop: spacing.lg,
  },
};

export default EducationPage;

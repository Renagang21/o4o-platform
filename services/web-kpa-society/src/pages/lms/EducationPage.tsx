/**
 * EducationPage - 강의 목록 (O4O HUB 테이블 표준)
 *
 * WO-KPA-LMS-HUB-RESTRUCTURE-V1
 * - 카드 UI → BaseTable 전환
 * - 강사 자격 확인 → 강의 등록 버튼
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { BaseTable, type O4OColumn } from '@o4o/ui';
import { Pagination } from '../../components/common';
import { lmsApi } from '../../api';
import { qualificationApi } from '../../api/qualification';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography } from '../../styles/theme';
import type { Course } from '../../types';

type LevelFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';

const LEVEL_LABELS: Record<string, string> = {
  beginner: '입문',
  intermediate: '중급',
  advanced: '고급',
};

const STATUS_LABELS: Record<string, string> = {
  draft: '준비중',
  published: '공���',
  archived: '종료',
};

const COLUMNS: O4OColumn<Course>[] = [
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
      <span style={{ fontSize: '14px', color: colors.neutral700 }}>{(row as any).instructor?.name || row.instructorName || '-'}</span>
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
    key: 'level',
    header: '레벨',
    width: '10%',
    sortable: true,
    sortAccessor: (row) => row.level,
    render: (_v, row) => (
      <span style={{
        padding: '2px 8px',
        backgroundColor: '#e0f2fe',
        color: '#0369a1',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
      }}>
        {LEVEL_LABELS[row.level] || row.level}
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
    width: '10%',
    align: 'center',
    render: (_v, row) => (
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
        }}
      >
        수강하기
      </Link>
    ),
  },
];

export function EducationPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [courses, setCourses] = useState<Course[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // LMS 제작자 자격 확인
  const [hasLmsCreator, setHasLmsCreator] = useState(false);
  const [showQualificationPrompt, setShowQualificationPrompt] = useState(false);

  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentLevel = (searchParams.get('level') || 'all') as LevelFilter;
  const currentSearch = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState(currentSearch);

  // LMS 제작자 자격 확인 (WO-LMS-CREATOR-QUALIFICATION-FLOW-REFORM-V1)
  useEffect(() => {
    if (isAuthenticated) {
      qualificationApi.getMyQualifications()
        .then((res: any) => {
          if (res.data.success) {
            const approved = (res.data.data as any[]).some(
              (q) => q.qualification_type === 'lms_creator' && q.status === 'approved',
            );
            setHasLmsCreator(approved);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  // Load courses
  useEffect(() => {
    loadCourses();
  }, [currentPage, currentLevel, currentSearch]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const res = await lmsApi.getCourses({
        level: currentLevel !== 'all' ? currentLevel : undefined,
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
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams((prev) => {
      if (searchInput.trim()) prev.set('search', searchInput.trim());
      else prev.delete('search');
      prev.set('page', '1');
      return prev;
    });
  };

  const handleLevelFilter = (level: LevelFilter) => {
    setSearchParams((prev) => {
      if (level === 'all') prev.delete('level');
      else prev.set('level', level);
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

  const handleCreateClick = () => {
    if (hasLmsCreator) {
      navigate('/instructor/courses/new');
    } else {
      setShowQualificationPrompt(true);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>강의</h1>
          <p style={styles.subtitle}>보수교육, 온라인 세미나, 실무 강의</p>
        </div>
        {isAuthenticated && (
          <button onClick={handleCreateClick} style={styles.createBtn}>
            + 강의 등록
          </button>
        )}
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

      {/* Level filter chips */}
      <div style={styles.filterRow}>
        {(['all', 'beginner', 'intermediate', 'advanced'] as LevelFilter[]).map((level) => (
          <button
            key={level}
            onClick={() => handleLevelFilter(level)}
            style={{
              ...styles.filterChip,
              ...(currentLevel === level ? styles.filterChipActive : {}),
            }}
          >
            {level === 'all' ? '전체' : LEVEL_LABELS[level]}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={styles.loading}>강의를 불러오는 ��...</div>
      ) : (
        <>
          <div style={styles.tableWrap}>
            <BaseTable<Course>
              columns={COLUMNS}
              data={courses}
              rowKey={(row) => row.id}
              emptyMessage={
                <div style={{ padding: '40px 0', textAlign: 'center', color: colors.neutral500 }}>
                  {currentSearch ? `"${currentSearch}"에 대한 검색 결과가 없��니다` : '등록된 강의가 없습니다'}
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

      {/* Qualification prompt modal (WO-LMS-CREATOR-QUALIFICATION-FLOW-REFORM-V1) */}
      {showQualificationPrompt && (
        <div style={styles.overlay} onClick={() => setShowQualificationPrompt(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>LMS 제작자 자격이 필요합니다</h3>
            <p style={styles.modalDesc}>
              LMS에서 강의, 콘텐츠, 설문/퀴즈를 등록하려면<br />
              제작자 자격이 필요합니다.
            </p>
            <div style={styles.modalActions}>
              <button onClick={() => setShowQualificationPrompt(false)} style={styles.modalCancelBtn}>
                닫기
              </button>
              <Link to="/mypage/qualifications" style={styles.modalApplyBtn}>
                자격 신청하기
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
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
  createBtn: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
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
  filterRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
  },
  filterChip: {
    padding: '6px 16px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '20px',
    backgroundColor: colors.white,
    color: colors.neutral600,
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    color: colors.white,
    borderColor: colors.primary,
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
  // Modal
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '400px',
    width: '90%',
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: colors.neutral900,
    margin: '0 0 12px',
  },
  modalDesc: {
    fontSize: '14px',
    color: colors.neutral600,
    lineHeight: 1.6,
    margin: '0 0 24px',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral600,
    backgroundColor: colors.neutral100,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  modalApplyBtn: {
    display: 'inline-block',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.primary,
    textDecoration: 'none',
    borderRadius: '8px',
  },
};

export default EducationPage;

/**
 * CourseHubPage - Course 허브 (공개 탐색 페이지)
 *
 * WO-CONTENT-COURSE-HUB-DESIGN-V1
 *
 * 플랫폼 내 모든 공개 Course를 콘텐츠처럼 탐색.
 * - /courses 경로
 * - 미인증: 로그인 유도
 * - 인증: 검색 + 필터 + 카드 그리드
 * - Core/DB/API 변경 없음
 */

import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Card } from '../../components/common';
import { lmsApi } from '../../api';
import { useAuth } from '../../contexts';
import { useAuthModal } from '../../contexts/LoginModalContext';
import { colors, typography } from '../../styles/theme';
import type { Course } from '../../types';

type PriceFilter = 'all' | 'free' | 'paid';

const LEVEL_LABELS: Record<string, string> = {
  beginner: '입문',
  intermediate: '중급',
  advanced: '고급',
};

export function CourseHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { openLoginModal } = useAuthModal();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentSearch = searchParams.get('search') || '';
  const currentPrice = (searchParams.get('price') || 'all') as PriceFilter;

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, currentPage, currentSearch]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await lmsApi.getCourses({
        search: currentSearch || undefined,
        page: currentPage,
        limit: 12,
      });
      setCourses(res.data || []);
      setTotalPages(res.totalPages || 1);
    } catch {
      setCourses([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Client-side price filter (API doesn't support isPaid filter)
  const filteredCourses = useMemo(() => {
    if (currentPrice === 'all') return courses;
    return courses.filter(c =>
      currentPrice === 'free' ? !c.isPaid : !!c.isPaid
    );
  }, [courses, currentPrice]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(prev => {
      if (searchInput.trim()) {
        prev.set('search', searchInput.trim());
      } else {
        prev.delete('search');
      }
      prev.set('page', '1');
      return prev;
    });
  };

  const handlePriceFilter = (filter: PriceFilter) => {
    setSearchParams(prev => {
      if (filter === 'all') {
        prev.delete('price');
      } else {
        prev.set('price', filter);
      }
      prev.set('page', '1');
      return prev;
    });
  };

  const handlePageChange = (page: number) => {
    setSearchParams(prev => {
      prev.set('page', String(page));
      return prev;
    });
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
    return `${m}분`;
  };

  // 미인증 상태
  if (!isAuthenticated && !loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loginPrompt}>
          <div style={styles.loginIcon}>📚</div>
          <h2 style={styles.loginTitle}>강좌를 탐색하려면</h2>
          <p style={styles.loginSubtitle}>로그인이 필요합니다</p>
          <button style={styles.loginButton} onClick={openLoginModal}>
            로그인
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="강좌 목록을 불러오는 중..." />;
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="강좌"
        description="플랫폼 교육 콘텐츠를 탐색하세요"
        breadcrumb={[{ label: '홈', href: '/' }, { label: '강좌' }]}
      />

      {/* Search */}
      <form onSubmit={handleSearch} style={styles.searchForm}>
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="강좌 검색..."
          style={styles.searchInput}
        />
        <button type="submit" style={styles.searchButton}>
          검색
        </button>
      </form>

      {/* Price filter chips */}
      <div style={styles.filterRow}>
        {(['all', 'free', 'paid'] as PriceFilter[]).map(filter => (
          <button
            key={filter}
            onClick={() => handlePriceFilter(filter)}
            style={{
              ...styles.filterChip,
              ...(currentPrice === filter ? styles.filterChipActive : {}),
            }}
          >
            {filter === 'all' ? '전체' : filter === 'free' ? '무료' : '유료'}
          </button>
        ))}
      </div>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <EmptyState
          icon="📋"
          title={currentSearch ? '검색 결과가 없습니다' : '등록된 강좌가 없습니다'}
          description={currentSearch
            ? `"${currentSearch}"에 대한 검색 결과가 없습니다.`
            : '곧 새로운 강좌가 등록될 예정입니다.'
          }
        />
      ) : (
        <>
          <div style={styles.courseGrid}>
            {filteredCourses.map(course => (
              <Link key={course.id} to={`/courses/${course.id}`} style={styles.courseLink}>
                <Card hover padding="none">
                  <div style={styles.courseThumbnail}>
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={course.title} style={styles.thumbnailImage} />
                    ) : (
                      <div style={styles.thumbnailPlaceholder}>📚</div>
                    )}
                  </div>
                  <div style={styles.courseContent}>
                    <div style={styles.courseHeader}>
                      <span style={styles.levelBadge}>{LEVEL_LABELS[course.level] || course.level}</span>
                      {course.isPaid ? (
                        <span style={styles.paidBadge}>
                          유료{course.price ? ` ₩${course.price.toLocaleString()}` : ''}
                        </span>
                      ) : (
                        <span style={styles.freeBadge}>무료</span>
                      )}
                    </div>
                    <h3 style={styles.courseTitle}>{course.title}</h3>
                    <p style={styles.courseDescription}>{course.description}</p>
                    <div style={styles.courseMeta}>
                      <span>👤 {course.instructorName}</span>
                      <span>📖 {course.lessonCount}개 강의</span>
                      <span>⏱ {formatDuration(course.duration)}</span>
                    </div>
                    <div style={styles.courseFooter}>
                      <span style={styles.enrollCount}>
                        {course.enrollmentCount > 0 ? `${course.enrollmentCount}명 수강중` : '새 강좌'}
                      </span>
                      <span style={styles.detailLink}>자세히 보기 →</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },

  // Login prompt
  loginPrompt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    textAlign: 'center',
  },
  loginIcon: {
    fontSize: '64px',
    marginBottom: '24px',
  },
  loginTitle: {
    ...typography.headingL,
    color: colors.neutral900,
    margin: 0,
    marginBottom: '8px',
  },
  loginSubtitle: {
    ...typography.bodyL,
    color: colors.neutral500,
    margin: 0,
    marginBottom: '32px',
  },
  loginButton: {
    padding: '14px 48px',
    backgroundColor: colors.primary,
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
  },

  // Search
  searchForm: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  searchInput: {
    flex: 1,
    padding: '12px 16px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
  },
  searchButton: {
    padding: '12px 24px',
    backgroundColor: colors.primary,
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    flexShrink: 0,
  },

  // Filters
  filterRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
  },
  filterChip: {
    padding: '8px 20px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '20px',
    backgroundColor: '#ffffff',
    color: colors.neutral600,
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    color: '#ffffff',
    borderColor: colors.primary,
  },

  // Grid
  courseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
  },
  courseLink: {
    textDecoration: 'none',
    color: 'inherit',
  },
  courseThumbnail: {
    height: '160px',
    backgroundColor: colors.neutral100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  thumbnailPlaceholder: {
    fontSize: '48px',
  },
  courseContent: {
    padding: '20px',
  },
  courseHeader: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  levelBadge: {
    padding: '2px 8px',
    backgroundColor: colors.primary,
    color: '#ffffff',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  freeBadge: {
    padding: '2px 8px',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  paidBadge: {
    padding: '2px 8px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  courseTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
    marginBottom: '8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  courseDescription: {
    ...typography.bodyS,
    color: colors.neutral500,
    marginBottom: '12px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  courseMeta: {
    display: 'flex',
    gap: '12px',
    ...typography.bodyS,
    color: colors.neutral500,
    flexWrap: 'wrap',
  },
  courseFooter: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: `1px solid ${colors.neutral100}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enrollCount: {
    ...typography.bodyS,
    color: colors.accentGreen,
    fontWeight: 500,
  },
  detailLink: {
    ...typography.bodyS,
    color: colors.primary,
    fontWeight: 500,
  },
};

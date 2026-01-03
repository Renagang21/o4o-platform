/**
 * LmsCoursesPage - 교육 과정 목록 페이지
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Card } from '../../components/common';
import { lmsApi } from '../../api';
import { colors, typography } from '../../styles/theme';
import type { Course } from '../../types';

export function LmsCoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentCategory = searchParams.get('category') || '';
  const currentLevel = searchParams.get('level') || '';

  useEffect(() => {
    loadData();
  }, [currentPage, currentCategory, currentLevel]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await lmsApi.getCourses({
        category: currentCategory || undefined,
        level: currentLevel || undefined,
        page: currentPage,
        limit: 12,
      });

      setCourses(res.data);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setSearchParams(prev => {
      prev.set('page', String(page));
      return prev;
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    setSearchParams(prev => {
      if (value) {
        prev.set(key, value);
      } else {
        prev.delete(key);
      }
      prev.set('page', '1');
      return prev;
    });
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      beginner: '입문',
      intermediate: '중급',
      advanced: '고급',
    };
    return labels[level] || level;
  };

  if (loading) {
    return <LoadingSpinner message="교육 과정을 불러오는 중..." />;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="오류가 발생했습니다"
          description={error}
          action={{ label: '다시 시도', onClick: loadData }}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="교육 과정"
        description="다양한 전문 교육 과정을 수강하세요"
        breadcrumb={[{ label: '홈', href: '/' }, { label: '교육' }]}
      />

      <div style={styles.filters}>
        <select
          style={styles.filterSelect}
          value={currentLevel}
          onChange={e => handleFilterChange('level', e.target.value)}
        >
          <option value="">전체 레벨</option>
          <option value="beginner">입문</option>
          <option value="intermediate">중급</option>
          <option value="advanced">고급</option>
        </select>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon="📚"
          title="등록된 과정이 없습니다"
          description="곧 새로운 교육 과정이 등록될 예정입니다."
        />
      ) : (
        <>
          <div style={styles.courseGrid}>
            {courses.map(course => (
              <Link key={course.id} to={`/lms/course/${course.id}`} style={styles.courseLink}>
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
                      <span style={styles.levelBadge}>{getLevelLabel(course.level)}</span>
                      <span style={styles.categoryBadge}>{course.category}</span>
                    </div>
                    <h3 style={styles.courseTitle}>{course.title}</h3>
                    <p style={styles.courseDescription}>{course.description}</p>
                    <div style={styles.courseMeta}>
                      <span>👤 {course.instructorName}</span>
                      <span>📖 {course.lessonCount}개 강의</span>
                      <span>⏱ {Math.floor(course.duration / 60)}시간</span>
                    </div>
                    <div style={styles.courseFooter}>
                      <span style={styles.enrollCount}>
                        {course.enrollmentCount}명 수강중
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
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
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  filterSelect: {
    padding: '10px 16px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: colors.white,
  },
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
    color: colors.white,
    borderRadius: '4px',
    fontSize: '12px',
  },
  categoryBadge: {
    padding: '2px 8px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '4px',
    fontSize: '12px',
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
  },
  enrollCount: {
    ...typography.bodyS,
    color: colors.accentGreen,
    fontWeight: 500,
  },
};

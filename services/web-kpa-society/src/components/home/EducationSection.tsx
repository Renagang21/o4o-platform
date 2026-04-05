/**
 * EducationSection — Home 허브 교육/강의 요약 블록
 *
 * WO-KPA-A-PUBLIC-HOME-INTEGRATION-AND-MENU-SIMPLIFICATION-V1
 * WO-KPA-A-HOME-HUB-ENHANCEMENT-V1: 반응형 CSS + empty state 개선
 * lmsApi.getCourses() 독립 호출
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { lmsApi } from '../../api/lms';
import { colors, spacing, typography } from '../../styles/theme';

const responsiveStyles = `
  .edu-course-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }
  @media (min-width: 768px) {
    .edu-course-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
`;

interface CourseItem {
  id: string;
  title: string;
  category?: string;
  level?: string;
  thumbnailUrl?: string;
  instructorName?: string;
}

export function EducationSection() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const styleId = 'edu-section-responsive-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = responsiveStyles;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    lmsApi.getCourses({ limit: 3 })
      .then((res: any) => {
        const items = res?.data?.data ?? res?.data ?? [];
        setCourses(Array.isArray(items) ? items : []);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>교육/강의</h2>
        <Link to="/lms" style={styles.sectionLink}>전체 보기 →</Link>
      </div>
      {courses.length > 0 ? (
        <div className="edu-course-grid">
          {courses.map((course) => (
            <Link key={course.id} to={`/lms/course/${course.id}`} style={styles.courseCard}>
              {course.thumbnailUrl ? (
                <div style={styles.courseThumb}>
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    style={styles.courseImg}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              ) : (
                <div style={{ ...styles.courseThumb, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '24px', color: colors.neutral300 }}>📚</span>
                </div>
              )}
              <div style={styles.courseBody}>
                {course.category && <span style={styles.courseBadge}>{course.category}</span>}
                <p style={styles.courseTitle}>{course.title}</p>
                {course.instructorName && (
                  <p style={styles.courseInstructor}>{course.instructorName}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div style={styles.emptyWrap}>
          <p style={styles.emptyIcon}>📚</p>
          <p style={styles.empty}>등록된 강의가 없습니다.</p>
          <p style={styles.emptyHint}>새로운 강의가 등록되면 여기에 표시됩니다.</p>
          <Link to="/lms" style={styles.emptyAction}>강의 페이지 바로가기 →</Link>
        </div>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {},
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.headingS,
    color: colors.neutral800,
    margin: 0,
  },
  sectionLink: {
    fontSize: 13,
    color: colors.primary,
    textDecoration: 'none',
    fontWeight: 500,
  },
  courseCard: {
    display: 'block',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    textDecoration: 'none',
    transition: 'box-shadow 0.2s',
  },
  courseThumb: {
    width: '100%',
    height: '100px',
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  courseImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  courseBody: {
    padding: '10px 12px',
  },
  courseBadge: {
    display: 'inline-block',
    padding: '1px 6px',
    fontSize: '10px',
    fontWeight: 500,
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    borderRadius: '4px',
    marginBottom: '4px',
  },
  courseTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral700,
    margin: '0 0 4px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as any,
  },
  courseInstructor: {
    fontSize: '11px',
    color: colors.neutral400,
    margin: 0,
  },
  emptyWrap: {
    textAlign: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: '1.5rem',
    margin: '0 0 8px',
    textAlign: 'center',
  },
  empty: {
    color: colors.neutral500,
    fontSize: '14px',
    textAlign: 'center',
    margin: 0,
  },
  emptyHint: {
    textAlign: 'center',
    color: colors.neutral400,
    fontSize: '0.8rem',
    margin: `${spacing.xs} 0 0`,
  },
  emptyAction: {
    display: 'inline-block',
    marginTop: spacing.sm,
    fontSize: '0.813rem',
    color: colors.primary,
    textDecoration: 'none',
  },
};

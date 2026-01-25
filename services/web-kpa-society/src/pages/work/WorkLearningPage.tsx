/**
 * WorkLearningPage - 개인 학습/교육 현황
 *
 * WO-KPA-WORK-IMPLEMENT-V1
 * - 개인 수강 LMS 목록
 * - 수료 현황
 * - 추천 콘텐츠 (정보성)
 */

import { Link } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../../styles/theme';
import { useAuth, TestUser } from '../../contexts/AuthContext';

// Mock 학습 데이터
const mockLearningData = {
  inProgress: [
    {
      id: 'c1',
      title: '2025 약사 보수교육',
      category: '보수교육',
      progress: 65,
      totalLessons: 20,
      completedLessons: 13,
      deadline: '2025-03-31',
    },
    {
      id: 'c2',
      title: '복약지도 심화과정',
      category: '전문과정',
      progress: 30,
      totalLessons: 15,
      completedLessons: 5,
      deadline: '2025-04-15',
    },
    {
      id: 'c3',
      title: '약국 서비스 품질 관리',
      category: '일반과정',
      progress: 10,
      totalLessons: 8,
      completedLessons: 1,
      deadline: null,
    },
  ],
  completed: [
    { id: 'cc1', title: '2024 약사 보수교육', completedDate: '2024-12-15', certificateId: 'cert-001' },
    { id: 'cc2', title: '당뇨병 환자 복약지도', completedDate: '2024-11-20', certificateId: 'cert-002' },
  ],
  recommended: [
    { id: 'r1', title: '당뇨병 환자 관리', category: '전문과정', duration: '8시간' },
    { id: 'r2', title: '고혈압 약물 치료', category: '전문과정', duration: '6시간' },
    { id: 'r3', title: 'AI 시대 약국 혁신', category: '일반과정', duration: '4시간' },
  ],
};

export function WorkLearningPage() {
  const { user } = useAuth();
  const testUser = user as TestUser | null;
  const userName = testUser?.name || '약사';

  const data = mockLearningData;

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <Link to="/work" style={styles.backLink}>← 내 업무</Link>
        <div style={styles.headerMain}>
          <div>
            <h1 style={styles.pageTitle}>학습 / 교육</h1>
            <p style={styles.subTitle}>{userName}님의 학습 현황</p>
          </div>
          <div style={styles.statsRow}>
            <div style={styles.statBadge}>
              <span style={styles.statNumber}>{data.inProgress.length}</span>
              <span style={styles.statLabel}>진행중</span>
            </div>
            <div style={styles.statBadge}>
              <span style={styles.statNumber}>{data.completed.length}</span>
              <span style={styles.statLabel}>수료</span>
            </div>
          </div>
        </div>
      </header>

      {/* 진행중 과정 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>진행중인 과정</h2>
        <div style={styles.courseList}>
          {data.inProgress.map(course => (
            <div key={course.id} style={styles.courseCard}>
              <div style={styles.courseHeader}>
                <span style={styles.courseCategory}>{course.category}</span>
                {course.deadline && (
                  <span style={styles.courseDeadline}>마감: {course.deadline}</span>
                )}
              </div>
              <h3 style={styles.courseTitle}>{course.title}</h3>
              <div style={styles.progressSection}>
                <div style={styles.progressInfo}>
                  <span style={styles.progressLabel}>
                    {course.completedLessons}/{course.totalLessons} 강의
                  </span>
                  <span style={styles.progressPercent}>{course.progress}%</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{
                    ...styles.progressFill,
                    width: `${course.progress}%`,
                  }} />
                </div>
              </div>
              <Link to={`/demo/lms/course/${course.id}`} style={styles.continueButton}>
                이어서 학습
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 수료 과정 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>수료 과정</h2>
        <div style={styles.completedList}>
          {data.completed.map(course => (
            <div key={course.id} style={styles.completedCard}>
              <div style={styles.completedInfo}>
                <h3 style={styles.completedTitle}>{course.title}</h3>
                <span style={styles.completedDate}>수료: {course.completedDate}</span>
              </div>
              <Link to="/demo/lms/certificate" style={styles.certButton}>
                수료증
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 추천 콘텐츠 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>추천 콘텐츠</h2>
        <p style={styles.sectionDesc}>관심 분야에 맞는 과정을 추천합니다.</p>
        <div style={styles.recommendList}>
          {data.recommended.map(course => (
            <div key={course.id} style={styles.recommendCard}>
              <div style={styles.recommendInfo}>
                <span style={styles.recommendCategory}>{course.category}</span>
                <h3 style={styles.recommendTitle}>{course.title}</h3>
                <span style={styles.recommendDuration}>{course.duration}</span>
              </div>
              <Link to="/demo/lms/courses" style={styles.viewButton}>
                보기
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    marginBottom: '32px',
  },
  backLink: {
    color: colors.primary,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
    display: 'inline-block',
    marginBottom: '12px',
  },
  headerMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  subTitle: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    margin: '4px 0 0',
  },
  statsRow: {
    display: 'flex',
    gap: '12px',
  },
  statBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
  },
  statNumber: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.primary,
  },
  statLabel: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: colors.neutral800,
    marginBottom: '16px',
  },
  sectionDesc: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    margin: '-8px 0 16px',
  },
  courseList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  courseCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    padding: '20px',
  },
  courseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  courseCategory: {
    padding: '4px 10px',
    backgroundColor: colors.primary + '15',
    color: colors.primary,
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  courseDeadline: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },
  courseTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.neutral800,
    margin: '0 0 16px',
  },
  progressSection: {
    marginBottom: '16px',
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  progressLabel: {
    fontSize: '0.8125rem',
    color: colors.neutral600,
  },
  progressPercent: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: colors.primary,
  },
  progressBar: {
    height: '8px',
    backgroundColor: colors.neutral200,
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: '4px',
  },
  continueButton: {
    display: 'block',
    textAlign: 'center',
    padding: '10px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: borderRadius.md,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  completedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  completedCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
  },
  completedInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  completedTitle: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: colors.neutral800,
    margin: 0,
  },
  completedDate: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
  },
  certButton: {
    padding: '8px 16px',
    backgroundColor: colors.success + '15',
    color: colors.success,
    borderRadius: borderRadius.md,
    textDecoration: 'none',
    fontSize: '0.8125rem',
    fontWeight: 500,
  },
  recommendList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  recommendCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.primary}20`,
  },
  recommendInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  recommendCategory: {
    fontSize: '0.6875rem',
    color: colors.primary,
    fontWeight: 500,
  },
  recommendTitle: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: colors.neutral800,
    margin: 0,
  },
  recommendDuration: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },
  viewButton: {
    padding: '8px 16px',
    backgroundColor: colors.white,
    color: colors.primary,
    border: `1px solid ${colors.primary}`,
    borderRadius: borderRadius.md,
    textDecoration: 'none',
    fontSize: '0.8125rem',
    fontWeight: 500,
  },
};

/**
 * InstructorProfilePage - 강사 공개 프로필
 *
 * WO-CONTENT-INSTRUCTOR-PUBLIC-PROFILE-V1
 *
 * 승인된 강사의 공개 프로필 + 게시된 강좌 목록.
 * - /instructors/:userId 경로
 * - 인증 불필요 (공개 페이지)
 * - 비승인 강사 접근 시 404
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CourseCard, type CourseCardView } from '@o4o/lms-ui';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { lmsApi } from '../../api';
import { colors, typography } from '../../styles/theme';
import type { InstructorPublicProfile, InstructorCourseItem } from '../../types';


/**
 * WO-O4O-COMMUNITY-LMS-COURSE-LIST-AND-HUB-VIEW-COMMONIZATION-V1:
 * 지역 CourseCard(카드 JSX/배지/메타/푸터 중복)를 공통 `CourseCard`(@o4o/lms-ui)로 수렴.
 * 강사 고유 정보(학점)는 badgeSlot 으로 주입한다.
 */
const toCardView = (course: InstructorCourseItem): CourseCardView => ({
  id: course.id,
  title: course.title,
  description: course.description,
  thumbnailUrl: course.thumbnail,
  durationMinutes: course.duration,
  enrollmentCount: course.currentEnrollments,
  isPaid: course.isPaid,
});

export function InstructorProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<InstructorPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) return;
    loadProfile(userId);
  }, [userId]);

  const loadProfile = async (id: string) => {
    try {
      setLoading(true);
      setNotFound(false);
      const res = await lmsApi.getInstructorProfile(id);
      if (res.success && res.data) {
        setProfile(res.data);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="강사 프로필을 불러오는 중..." />;
  }

  if (notFound || !profile) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="🔍"
          title="강사를 찾을 수 없습니다"
          description="존재하지 않거나 아직 공개되지 않은 프로필입니다."
        />
        <div style={styles.backRow}>
          <Link to="/courses" style={styles.backLink}>강좌 목록으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  const { instructor, stats, courses } = profile;

  return (
    <div style={styles.container}>
      <PageHeader
        title={instructor.name}
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '강좌', href: '/courses' },
          { label: instructor.name },
        ]}
      />

      {/* A. Hero */}
      <Card padding="large" style={{ marginBottom: '24px' }}>
        <div style={styles.hero}>
          {instructor.avatar ? (
            <img src={instructor.avatar} alt={instructor.name} style={styles.avatar} />
          ) : (
            <div style={styles.avatarPlaceholder}>👤</div>
          )}
          <div style={styles.heroInfo}>
            <h1 style={styles.heroName}>{instructor.name}</h1>
            {instructor.nickname && (
              <p style={styles.heroNickname}>{instructor.nickname}</p>
            )}
            <span style={styles.instructorBadge}>공인 강사</span>
          </div>
        </div>
      </Card>

      {/* B. Stats */}
      <div style={styles.statsRow}>
        <StatBox label="개설 강좌" value={stats.courseCount} />
        <StatBox label="총 수강생" value={stats.totalStudents} />
        <StatBox label="무료 강좌" value={stats.freeCourses} />
        <StatBox label="유료 강좌" value={stats.paidCourses} />
      </div>

      {/* C. Course Grid */}
      <h2 style={styles.sectionTitle}>
        {instructor.name}의 강좌
      </h2>

      {courses.length === 0 ? (
        <EmptyState
          icon="📋"
          title="아직 강좌가 없습니다"
          description="이 강사의 강좌가 곧 등록될 예정입니다."
        />
      ) : (
        <div style={styles.courseGrid}>
          {courses.map(course => (
            <CourseCard
              key={course.id}
              course={toCardView(course)}
              href={`/courses/${course.id}`}
              accent={colors.primary}
              freeBadge
              priceLabel={course.price ? `₩${course.price.toLocaleString()}` : undefined}
              badgeSlot={course.credits > 0 ? <span style={styles.creditBadge}>🎓 {course.credits}학점</span> : undefined}
              footerSlot={
                <>
                  <span style={styles.enrollCount}>
                    {course.currentEnrollments > 0 ? `${course.currentEnrollments}명 수강중` : '새 강좌'}
                  </span>
                  <span style={styles.detailLink}>자세히 보기 →</span>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <Card padding="medium" style={{ flex: '1 1 140px', textAlign: 'center' }}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </Card>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },

  // Back link
  backRow: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '24px',
  },
  backLink: {
    ...typography.bodyM,
    color: colors.primary,
    textDecoration: 'none',
    fontWeight: 500,
  },

  // Hero
  hero: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
  },
  avatarPlaceholder: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: colors.neutral100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '36px',
    flexShrink: 0,
  },
  heroInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  heroName: {
    ...typography.headingL,
    color: colors.neutral900,
    margin: 0,
  },
  heroNickname: {
    ...typography.bodyM,
    color: colors.neutral500,
    margin: 0,
  },
  instructorBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: colors.primary,
    color: '#ffffff',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    marginTop: '4px',
    width: 'fit-content',
  },

  // Stats
  statsRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '32px',
    flexWrap: 'wrap',
  },
  statValue: {
    ...typography.headingL,
    color: colors.neutral900,
  },
  statLabel: {
    ...typography.bodyS,
    color: colors.neutral500,
    marginTop: '4px',
  },

  // Section
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    margin: 0,
    marginBottom: '20px',
  },

  // Grid (CourseHubPage와 동일)
  courseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
  },
  courseFooter: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: `1px solid ${colors.neutral100}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditBadge: {
    padding: '2px 10px',
    borderRadius: '9999px',
    backgroundColor: '#eef2ff',
    color: '#4338ca',
    fontSize: '12px',
    fontWeight: 600,
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

/**
 * Dashboard (Home) 페이지
 * 약사회 SaaS - 사용자 대시보드
 *
 * 섹션 구성:
 * A. Hero - 사용자 환영
 * B. Quick Menu - 주요 기능 바로가기
 * C. User Activity - 나의 활동
 * D. Org News - 지부/분회 소식
 * E. KPA News - 전체 약사회 소식
 * F. Recommended Courses - 추천 교육
 * G. Active Groupbuys - 진행중 공동구매
 * H. Organization Info - 조직 안내
 */

import { Link } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../styles/theme';

// Mock user data
const mockUser = {
  name: '홍길동',
  organization: '서울지부',
  branch: '강남분회',
  role: '일반회원',
};

// Quick Menu items
const quickMenuItems = [
  { icon: '📢', label: '공지사항', href: '/news/notice', color: '#2563EB' },
  { icon: '🛒', label: '공동구매', href: '/groupbuy', color: '#059669' },
  { icon: '🎓', label: '교육/연수', href: '/lms', color: '#7C3AED' },
  { icon: '💬', label: '포럼', href: '/forum', color: '#F59E0B' },
  { icon: '📁', label: '자료실', href: '/docs', color: '#EC4899' },
  { icon: '📝', label: '신상신고', href: '/mypage/profile', color: '#6366F1' },
];

// Mock activity data
const mockActivity = {
  unreadNotices: 3,
  ongoingCourses: [
    { id: 1, title: '약물요법 심화과정', progress: 65 },
  ],
  activeGroupbuys: [
    { id: 1, title: '겨울철 건강식품 공동구매', progress: 78, daysLeft: 5 },
  ],
  recentForumPosts: [
    { id: 1, title: '신규 약사 취업 관련 질문', category: '자유게시판' },
  ],
};

// Mock org news
const mockOrgNews = [
  { id: 1, title: '강남분회 12월 정기모임 안내', date: '2024-12-18', hasImage: true },
  { id: 2, title: '서울지부 송년회 일정 공지', date: '2024-12-15' },
  { id: 3, title: '분회장 인사말씀', date: '2024-12-10' },
];

// Mock KPA news
const mockKpaNews = [
  { id: 1, title: '2025년 약사 연수교육 일정 발표', date: '2024-12-20', isImportant: true },
  { id: 2, title: '의약품 안전관리 지침 개정 안내', date: '2024-12-18' },
  { id: 3, title: '전국 약사회 정기총회 결과 보고', date: '2024-12-15' },
];

// Mock recommended courses
const mockCourses = [
  { id: 1, title: '2024 필수 연수교육', duration: '8시간', thumbnail: '🎓', isRequired: true },
  { id: 2, title: '복약지도 실무과정', duration: '4시간', thumbnail: '💊' },
  { id: 3, title: '약국 경영 세미나', duration: '2시간', thumbnail: '📊' },
];

// Mock groupbuys
const mockGroupbuys = [
  { id: 1, title: '겨울철 건강식품 세트', price: '45,000원', progress: 78, endDate: '12/25' },
  { id: 2, title: '약국용 소모품 패키지', price: '120,000원', progress: 45, endDate: '12/30' },
  { id: 3, title: '2025년 달력/다이어리', price: '15,000원', progress: 92, endDate: '12/20' },
];

export function DashboardPage() {
  return (
    <div style={styles.container}>
      {/* A. Hero Section */}
      <section style={styles.heroSection}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>
            안녕하세요, <span style={styles.userName}>{mockUser.name}</span>님
          </h1>
          <p style={styles.heroSubtitle}>
            {mockUser.organization} {'>'} {mockUser.branch}
          </p>
          <div style={styles.heroStats}>
            <div style={styles.heroStat}>
              <span style={styles.heroStatValue}>{mockActivity.unreadNotices}</span>
              <span style={styles.heroStatLabel}>미확인 공지</span>
            </div>
            <div style={styles.heroStat}>
              <span style={styles.heroStatValue}>{mockActivity.ongoingCourses.length}</span>
              <span style={styles.heroStatLabel}>진행중 교육</span>
            </div>
            <div style={styles.heroStat}>
              <span style={styles.heroStatValue}>{mockActivity.activeGroupbuys.length}</span>
              <span style={styles.heroStatLabel}>참여 공동구매</span>
            </div>
          </div>
        </div>
      </section>

      {/* B. Quick Menu */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>주요 기능 바로가기</h2>
        <div style={styles.quickMenuGrid}>
          {quickMenuItems.map((item) => (
            <Link key={item.label} to={item.href} style={styles.quickMenuItem}>
              <span style={{ ...styles.quickMenuIcon, backgroundColor: item.color }}>
                {item.icon}
              </span>
              <span style={styles.quickMenuLabel}>{item.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* C. User Activity */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>나의 활동</h2>
        <div style={styles.activityGrid}>
          {/* 미확인 공지 */}
          <div style={styles.activityCard}>
            <div style={styles.activityHeader}>
              <span style={styles.activityIcon}>📢</span>
              <span style={styles.activityLabel}>미확인 공지</span>
            </div>
            <div style={styles.activityValue}>{mockActivity.unreadNotices}건</div>
            <Link to="/news/notice" style={styles.activityLink}>확인하기 →</Link>
          </div>

          {/* 진행중 교육 */}
          <div style={styles.activityCard}>
            <div style={styles.activityHeader}>
              <span style={styles.activityIcon}>🎓</span>
              <span style={styles.activityLabel}>진행중 교육</span>
            </div>
            {mockActivity.ongoingCourses.map((course) => (
              <div key={course.id}>
                <div style={styles.activityCourseTitle}>{course.title}</div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${course.progress}%` }} />
                </div>
                <div style={styles.progressText}>{course.progress}% 완료</div>
              </div>
            ))}
          </div>

          {/* 참여 공동구매 */}
          <div style={styles.activityCard}>
            <div style={styles.activityHeader}>
              <span style={styles.activityIcon}>🛒</span>
              <span style={styles.activityLabel}>참여 공동구매</span>
            </div>
            {mockActivity.activeGroupbuys.map((gb) => (
              <div key={gb.id}>
                <div style={styles.activityCourseTitle}>{gb.title}</div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${gb.progress}%`, backgroundColor: colors.accentGreen }} />
                </div>
                <div style={styles.progressText}>D-{gb.daysLeft} | {gb.progress}% 달성</div>
              </div>
            ))}
          </div>

          {/* 최근 본 포럼 */}
          <div style={styles.activityCard}>
            <div style={styles.activityHeader}>
              <span style={styles.activityIcon}>💬</span>
              <span style={styles.activityLabel}>최근 본 글</span>
            </div>
            {mockActivity.recentForumPosts.map((post) => (
              <div key={post.id}>
                <div style={styles.activityCourseTitle}>{post.title}</div>
                <div style={styles.activityMeta}>{post.category}</div>
              </div>
            ))}
            <Link to="/forum" style={styles.activityLink}>포럼 가기 →</Link>
          </div>
        </div>
      </section>

      {/* D & E. News Section (2 columns) */}
      <div style={styles.newsGrid}>
        {/* D. Org News */}
        <section style={styles.newsSection}>
          <div style={styles.newsSectionHeader}>
            <h2 style={styles.sectionTitle}>지부/분회 소식</h2>
            <Link to="/news/branch-news" style={styles.moreLink}>더보기 →</Link>
          </div>
          <div style={styles.newsList}>
            {mockOrgNews.map((news) => (
              <Link key={news.id} to={`/news/branch-news/${news.id}`} style={styles.newsItem}>
                <div style={styles.newsContent}>
                  <span style={styles.newsTitle}>{news.title}</span>
                  <span style={styles.newsDate}>{news.date}</span>
                </div>
                {news.hasImage && <span style={styles.newsImageBadge}>📷</span>}
              </Link>
            ))}
          </div>
        </section>

        {/* E. KPA News */}
        <section style={styles.newsSection}>
          <div style={styles.newsSectionHeader}>
            <h2 style={styles.sectionTitle}>전체 약사회 소식</h2>
            <Link to="/news/kpa-news" style={styles.moreLink}>더보기 →</Link>
          </div>
          <div style={styles.newsList}>
            {mockKpaNews.map((news) => (
              <Link key={news.id} to={`/news/kpa-news/${news.id}`} style={styles.newsItem}>
                <div style={styles.newsContent}>
                  {news.isImportant && <span style={styles.importantBadge}>중요</span>}
                  <span style={styles.newsTitle}>{news.title}</span>
                  <span style={styles.newsDate}>{news.date}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* F. Recommended Courses */}
      <section style={styles.section}>
        <div style={styles.newsSectionHeader}>
          <h2 style={styles.sectionTitle}>추천 교육</h2>
          <Link to="/lms/courses" style={styles.moreLink}>전체보기 →</Link>
        </div>
        <div style={styles.coursesGrid}>
          {mockCourses.map((course) => (
            <Link key={course.id} to={`/lms/course/${course.id}`} style={styles.courseCard}>
              <div style={styles.courseThumbnail}>{course.thumbnail}</div>
              <div style={styles.courseInfo}>
                <div style={styles.courseTitleRow}>
                  {course.isRequired && <span style={styles.requiredBadge}>필수</span>}
                  <span style={styles.courseTitle}>{course.title}</span>
                </div>
                <span style={styles.courseDuration}>{course.duration}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* G. Active Groupbuys */}
      <section style={styles.section}>
        <div style={styles.newsSectionHeader}>
          <h2 style={styles.sectionTitle}>진행중 공동구매</h2>
          <Link to="/groupbuy" style={styles.moreLink}>전체보기 →</Link>
        </div>
        <div style={styles.groupbuyGrid}>
          {mockGroupbuys.map((gb) => (
            <Link key={gb.id} to={`/groupbuy/${gb.id}`} style={styles.groupbuyCard}>
              <div style={styles.groupbuyHeader}>
                <span style={styles.groupbuyTitle}>{gb.title}</span>
                <span style={styles.groupbuyEndDate}>~{gb.endDate}</span>
              </div>
              <div style={styles.groupbuyPrice}>{gb.price}</div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${gb.progress}%`, backgroundColor: colors.accentGreen }} />
              </div>
              <div style={styles.groupbuyProgress}>{gb.progress}% 달성</div>
            </Link>
          ))}
        </div>
      </section>

      {/* H. Organization Info */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>조직 안내</h2>
        <div style={styles.orgInfoGrid}>
          <Link to="/organization" style={styles.orgInfoCard}>
            <span style={styles.orgInfoIcon}>🏢</span>
            <span style={styles.orgInfoLabel}>조직 소개</span>
          </Link>
          <Link to="/organization/branches" style={styles.orgInfoCard}>
            <span style={styles.orgInfoIcon}>📍</span>
            <span style={styles.orgInfoLabel}>지부/분회 현황</span>
          </Link>
          <Link to="/organization/officers" style={styles.orgInfoCard}>
            <span style={styles.orgInfoIcon}>👥</span>
            <span style={styles.orgInfoLabel}>임원 안내</span>
          </Link>
          <Link to="/organization/contact" style={styles.orgInfoCard}>
            <span style={styles.orgInfoIcon}>📞</span>
            <span style={styles.orgInfoLabel}>연락처</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 16px 48px',
  },

  // Hero Section
  heroSection: {
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
    borderRadius: borderRadius.lg,
    padding: '32px',
    marginTop: '24px',
    marginBottom: '32px',
    color: colors.white,
  },
  heroContent: {
    maxWidth: '600px',
  },
  heroTitle: {
    fontSize: '1.75rem',
    fontWeight: 600,
    marginBottom: '8px',
  },
  userName: {
    color: '#93C5FD',
  },
  heroSubtitle: {
    fontSize: '1rem',
    opacity: 0.9,
    marginBottom: '24px',
  },
  heroStats: {
    display: 'flex',
    gap: '24px',
  },
  heroStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.md,
  },
  heroStatValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  heroStatLabel: {
    fontSize: '0.75rem',
    opacity: 0.9,
  },

  // Section
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '16px',
  },

  // Quick Menu
  quickMenuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '12px',
  },
  quickMenuItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 12px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    boxShadow: shadows.sm,
    textDecoration: 'none',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: `1px solid ${colors.gray200}`,
  },
  quickMenuIcon: {
    width: '48px',
    height: '48px',
    borderRadius: borderRadius.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    marginBottom: '8px',
  },
  quickMenuLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral700,
  },

  // Activity Grid
  activityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },
  activityCard: {
    padding: '20px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.gray200}`,
  },
  activityHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  activityIcon: {
    fontSize: '20px',
  },
  activityLabel: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.neutral700,
  },
  activityValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.primary,
    marginBottom: '8px',
  },
  activityCourseTitle: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral900,
    marginBottom: '8px',
  },
  activityMeta: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },
  activityLink: {
    fontSize: '0.875rem',
    color: colors.primary,
    textDecoration: 'none',
    fontWeight: 500,
  },

  // Progress Bar
  progressBar: {
    height: '6px',
    backgroundColor: colors.gray200,
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '4px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: '3px',
    transition: 'width 0.3s',
  },
  progressText: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },

  // News Grid
  newsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  },
  newsSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: '20px',
    boxShadow: shadows.sm,
    border: `1px solid ${colors.gray200}`,
  },
  newsSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  newsList: {
    display: 'flex',
    flexDirection: 'column',
  },
  newsItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: `1px solid ${colors.gray200}`,
    textDecoration: 'none',
  },
  newsContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  newsTitle: {
    fontSize: '0.875rem',
    color: colors.neutral900,
    fontWeight: 500,
  },
  newsDate: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },
  newsImageBadge: {
    fontSize: '14px',
  },
  importantBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    backgroundColor: colors.accentRed,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '0.625rem',
    fontWeight: 600,
    marginBottom: '4px',
  },
  moreLink: {
    fontSize: '0.875rem',
    color: colors.primary,
    textDecoration: 'none',
    fontWeight: 500,
  },

  // Courses Grid
  coursesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  courseCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.gray200}`,
    textDecoration: 'none',
  },
  courseThumbnail: {
    width: '56px',
    height: '56px',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
  },
  courseInfo: {
    flex: 1,
  },
  courseTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  courseTitle: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: colors.neutral900,
  },
  courseDuration: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },
  requiredBadge: {
    padding: '2px 6px',
    backgroundColor: colors.accentRed,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '0.625rem',
    fontWeight: 600,
  },

  // Groupbuy Grid
  groupbuyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  groupbuyCard: {
    padding: '20px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.gray200}`,
    textDecoration: 'none',
  },
  groupbuyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  groupbuyTitle: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: colors.neutral900,
  },
  groupbuyEndDate: {
    fontSize: '0.75rem',
    color: colors.accentRed,
    fontWeight: 500,
  },
  groupbuyPrice: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: colors.primary,
    marginBottom: '12px',
  },
  groupbuyProgress: {
    fontSize: '0.75rem',
    color: colors.accentGreen,
    fontWeight: 600,
  },

  // Org Info Grid
  orgInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
  },
  orgInfoCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 16px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.gray200}`,
    textDecoration: 'none',
  },
  orgInfoIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  orgInfoLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral700,
  },
};

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
 * F. External Services - 제휴 서비스 (교육/공동구매 배너)
 * G. Organization Info - 조직 안내
 *
 * WO-KPA-MENU-CLEANUP-V1: 교육/공동구매 메뉴 제거 → 배너 전환
 */

import { Link } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../styles/theme';
import { useAuth, TestUser } from '../contexts/AuthContext';
import { AiSummaryButton } from '../components/ai';
import { ExternalServiceSection } from '../components/ServiceBanner';
import { MyServicesSection } from '../components/MyServicesSection';
// PharmacyOnboardingBanner removed — WO-KPA-UNIFIED-AUTH-PHARMACY-GATE-V1
// 약국 신청은 PharmacyApprovalGatePage에서 처리

// Mock user data (fallback when not logged in)
const mockUser = {
  name: '홍길동',
  organization: '서울지부',
  branch: '강남분회',
  role: '일반회원',
};

// 직책 한글명 매핑
const positionLabels: Record<string, string> = {
  vice_president: '지부 부회장',
  director: '분회 이사',
  president: '회장',
  secretary: '총무',
};

// 임원 전용 Mock 데이터
const mockOfficerData = {
  upcomingMeetings: [
    { id: 1, title: '12월 정기 임원회의', date: '2024-12-20', time: '14:00', location: '약사회관 3층' },
    { id: 2, title: '신년 사업계획 논의', date: '2025-01-05', time: '10:00', location: '온라인(Zoom)' },
  ],
  officerNotices: [
    { id: 1, title: '2025년 임원 업무분장 안내', date: '2024-12-18', isNew: true },
    { id: 2, title: '회비 징수 현황 보고', date: '2024-12-15' },
    { id: 3, title: '지부장 연석회의 결과 공유', date: '2024-12-10' },
  ],
  taskSummary: {
    pendingApprovals: 0,  // 임원은 승인 권한 없음
    myReports: 2,
    upcomingEvents: 3,
  },
};

// Quick Menu items
// WO-KPA-MENU-CLEANUP-V1: 공동구매/교육 제거 (배너로 전환)
const quickMenuItems = [
  { icon: '📢', label: '공지사항', href: '/news/notice', color: '#2563EB' },
  { icon: '💬', label: '포럼', href: '/forum', color: '#F59E0B' },
  { icon: '📁', label: '자료실', href: '/docs', color: '#EC4899' },
  { icon: '📝', label: '신상신고', href: '/mypage/status-report', color: '#6366F1' },
  { icon: '🏢', label: '조직소개', href: '/organization', color: '#8B5CF6' },
  { icon: '📞', label: '연락처', href: '/organization/contact', color: '#10B981' },
];

// Mock activity data
// WO-KPA-MENU-CLEANUP-V1: ongoingCourses, activeGroupbuys 제거
const mockActivity = {
  unreadNotices: 3,
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

// WO-KPA-MENU-CLEANUP-V1: mockCourses, mockGroupbuys 제거 (배너 전환)

export function DashboardPage() {
  const { user } = useAuth();

  // 테스트 계정 타입 감지
  const testUser = user as TestUser | null;

  // 임원 여부 확인 (position 필드가 있으면 임원)
  const isOfficer = testUser?.position !== undefined;
  const officerPosition = testUser?.position;
  const positionLabel = officerPosition ? positionLabels[officerPosition] || officerPosition : '';

  // 표시용 사용자 정보
  const displayUser = user ? {
    name: user.name,
    organization: isOfficer && officerPosition === 'vice_president' ? '서울지부' : '서울지부',
    branch: isOfficer && officerPosition === 'director' ? '강남분회' : '강남분회',
    role: isOfficer ? positionLabel : '일반회원',
  } : mockUser;

  return (
    <div style={styles.container}>
      {/* A. Hero Section - 경기도약사회 스타일 */}
      <section style={styles.heroSection}>
        <div style={styles.heroOverlay} />
        <div style={styles.heroPattern} />
        <div style={styles.heroContent}>
          <div style={styles.heroBadge}>KPA-Society</div>
          <h1 style={styles.heroTitle}>
            약사회는 회원 여러분과<br />함께합니다
          </h1>
          <p style={styles.heroSubtitle}>
            지역 약사회의 공식 업무 지원 플랫폼
          </p>
          <p style={styles.heroDescription}>
            공지사항, 교육연수, 공동구매, 회원관리를 하나의 플랫폼에서
          </p>
          <div style={styles.heroButtons}>
            <a href="/news/notice" style={styles.heroPrimaryButton}>
              공지사항 확인
            </a>
            <a href="/organization" style={styles.heroSecondaryButton}>
              약사회 소개
            </a>
          </div>
        </div>
        {/* 우측 장식 요소 */}
        <div style={styles.heroDecoration}>
          <div style={styles.decorCircle1} />
          <div style={styles.decorCircle2} />
          <div style={styles.decorCircle3} />
        </div>
      </section>

      {/* 환영 메시지 카드 */}
      <section style={styles.welcomeCard}>
        <div style={styles.welcomeContent}>
          <div style={styles.welcomeText}>
            <span style={styles.welcomeGreeting}>
              안녕하세요, <strong>{displayUser.name}</strong>님
              {isOfficer && <span style={styles.officerBadge}>{positionLabel}</span>}
            </span>
            <span style={styles.welcomeOrg}>
              {displayUser.organization} &gt; {displayUser.branch}
            </span>
          </div>
          {/* WO-KPA-MENU-CLEANUP-V1: 교육/공동구매 통계 제거 */}
          <div style={styles.welcomeStats}>
            <AiSummaryButton contextLabel="약사회 활동 현황" />
            <div style={styles.welcomeStat}>
              <span style={styles.welcomeStatValue}>{mockActivity.unreadNotices}</span>
              <span style={styles.welcomeStatLabel}>미확인 공지</span>
            </div>
            <div style={styles.welcomeStat}>
              <span style={styles.welcomeStatValue}>{mockActivity.recentForumPosts.length}</span>
              <span style={styles.welcomeStatLabel}>최근 활동</span>
            </div>
          </div>
        </div>
      </section>

      {/* 임원 전용 섹션 - 임원으로 로그인한 경우에만 표시 */}
      {isOfficer && (
        <section style={styles.officerSection}>
          <div style={styles.officerSectionHeader}>
            <h2 style={styles.officerSectionTitle}>
              <span style={styles.officerIcon}>👔</span>
              {positionLabel} 업무 현황
            </h2>
            <span style={styles.officerNote}>임원 전용 정보</span>
          </div>

          <div style={styles.officerGrid}>
            {/* 임원 회의 일정 */}
            <div style={styles.officerCard}>
              <div style={styles.officerCardHeader}>
                <span style={styles.officerCardIcon}>📅</span>
                <span style={styles.officerCardTitle}>임원 회의 일정</span>
              </div>
              <div style={styles.officerCardContent}>
                {mockOfficerData.upcomingMeetings.map((meeting) => (
                  <div key={meeting.id} style={styles.meetingItem}>
                    <div style={styles.meetingTitle}>{meeting.title}</div>
                    <div style={styles.meetingMeta}>
                      {meeting.date} {meeting.time} · {meeting.location}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 임원 전용 공지 */}
            <div style={styles.officerCard}>
              <div style={styles.officerCardHeader}>
                <span style={styles.officerCardIcon}>📋</span>
                <span style={styles.officerCardTitle}>임원 전용 공지</span>
              </div>
              <div style={styles.officerCardContent}>
                {mockOfficerData.officerNotices.map((notice) => (
                  <div key={notice.id} style={styles.noticeItem}>
                    <div style={styles.noticeTitleRow}>
                      {notice.isNew && <span style={styles.newBadge}>NEW</span>}
                      <span style={styles.noticeTitle}>{notice.title}</span>
                    </div>
                    <div style={styles.noticeDate}>{notice.date}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 임원 업무 요약 */}
            <div style={styles.officerCard}>
              <div style={styles.officerCardHeader}>
                <span style={styles.officerCardIcon}>📊</span>
                <span style={styles.officerCardTitle}>업무 요약</span>
              </div>
              <div style={styles.taskSummaryGrid}>
                <div style={styles.taskSummaryItem}>
                  <span style={styles.taskSummaryValue}>{mockOfficerData.taskSummary.myReports}</span>
                  <span style={styles.taskSummaryLabel}>작성 보고서</span>
                </div>
                <div style={styles.taskSummaryItem}>
                  <span style={styles.taskSummaryValue}>{mockOfficerData.taskSummary.upcomingEvents}</span>
                  <span style={styles.taskSummaryLabel}>예정 행사</span>
                </div>
              </div>
              <div style={styles.officerNotice}>
                <strong>참고:</strong> 임원은 직책이며, 관리 권한은 별도로 부여됩니다.
              </div>
            </div>
          </div>
        </section>
      )}

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

      {/* C. User Activity - WO-KPA-MENU-CLEANUP-V1: 교육/공동구매 카드 제거 */}
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

          {/* 신상신고 */}
          <div style={styles.activityCard}>
            <div style={styles.activityHeader}>
              <span style={styles.activityIcon}>📝</span>
              <span style={styles.activityLabel}>신상신고</span>
            </div>
            <div style={styles.activityCourseTitle}>2025년 신상신고</div>
            <div style={styles.activityMeta}>제출 마감: 1월 31일</div>
            <Link to="/mypage/status-report" style={styles.activityLink}>신고하기 →</Link>
          </div>

          {/* 회원 정보 */}
          <div style={styles.activityCard}>
            <div style={styles.activityHeader}>
              <span style={styles.activityIcon}>👤</span>
              <span style={styles.activityLabel}>회원 정보</span>
            </div>
            <div style={styles.activityCourseTitle}>프로필 관리</div>
            <div style={styles.activityMeta}>연락처, 근무지 정보 관리</div>
            <Link to="/mypage/profile" style={styles.activityLink}>프로필 보기 →</Link>
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

      {/* F. Platform Services - 이용 중 / 추천 서비스 (WO-PLATFORM-SERVICE-CATALOG-AND-MY-V1) */}
      <section style={styles.section}>
        <MyServicesSection />
      </section>

      {/* G. External Services - 제휴 서비스 배너 (WO-KPA-MENU-CLEANUP-V1) */}
      <ExternalServiceSection />

      {/* G. Organization Info */}
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

  // Hero Section - 경기도약사회 스타일 (크게)
  heroSection: {
    position: 'relative',
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
    borderRadius: 0,
    padding: '80px 40px',
    marginTop: 0,
    marginLeft: 'calc(-50vw + 50%)',
    marginRight: 'calc(-50vw + 50%)',
    width: '100vw',
    marginBottom: '0',
    color: colors.white,
    overflow: 'hidden',
    minHeight: '400px',
    display: 'flex',
    alignItems: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)',
    pointerEvents: 'none',
  },
  heroPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 40%)`,
    pointerEvents: 'none',
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '700px',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: '20px',
  },
  heroBadge: {
    display: 'inline-block',
    padding: '8px 20px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '30px',
    fontSize: '0.875rem',
    fontWeight: 600,
    marginBottom: '24px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.3)',
  },
  heroTitle: {
    fontSize: '2.75rem',
    fontWeight: 700,
    marginBottom: '16px',
    lineHeight: 1.3,
    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  heroSubtitle: {
    fontSize: '1.25rem',
    opacity: 0.95,
    marginBottom: '12px',
    fontWeight: 500,
  },
  heroDescription: {
    fontSize: '1rem',
    opacity: 0.85,
    marginBottom: '32px',
    lineHeight: 1.6,
  },
  heroButtons: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  heroPrimaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '14px 32px',
    backgroundColor: colors.white,
    color: colors.primary,
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  heroSecondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '14px 32px',
    backgroundColor: 'transparent',
    color: colors.white,
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    textDecoration: 'none',
    border: '2px solid rgba(255,255,255,0.5)',
    transition: 'background-color 0.2s, border-color 0.2s',
  },
  heroDecoration: {
    position: 'absolute',
    right: '5%',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '400px',
    height: '400px',
    pointerEvents: 'none',
  },
  decorCircle1: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.15)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  },
  decorCircle2: {
    position: 'absolute',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: '30%',
    left: '60%',
    transform: 'translate(-50%, -50%)',
  },
  decorCircle3: {
    position: 'absolute',
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: '70%',
    left: '40%',
    transform: 'translate(-50%, -50%)',
  },

  // Welcome Card
  welcomeCard: {
    maxWidth: '1200px',
    margin: '-40px auto 32px',
    padding: '0 16px',
    position: 'relative',
    zIndex: 2,
  },
  welcomeContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 32px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.lg,
    border: `1px solid ${colors.gray200}`,
    flexWrap: 'wrap',
    gap: '20px',
  },
  welcomeText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  welcomeGreeting: {
    fontSize: '1.125rem',
    color: colors.neutral900,
  },
  welcomeOrg: {
    fontSize: '0.875rem',
    color: colors.neutral500,
  },
  welcomeStats: {
    display: 'flex',
    gap: '32px',
  },
  welcomeStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 16px',
  },
  welcomeStatValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.primary,
  },
  welcomeStatLabel: {
    fontSize: '0.75rem',
    color: colors.neutral500,
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

  // Officer Badge (in welcome)
  officerBadge: {
    display: 'inline-block',
    marginLeft: '8px',
    padding: '4px 10px',
    backgroundColor: '#f59e0b',
    color: '#fff',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },

  // Officer Section
  officerSection: {
    backgroundColor: '#fffbeb',
    border: '2px solid #f59e0b',
    borderRadius: borderRadius.lg,
    padding: '24px',
    marginBottom: '32px',
  },
  officerSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  officerSectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#92400e',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: 0,
  },
  officerIcon: {
    fontSize: '1.25rem',
  },
  officerNote: {
    fontSize: '0.75rem',
    color: '#b45309',
    backgroundColor: '#fef3c7',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  officerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  officerCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: '20px',
    boxShadow: shadows.sm,
    border: '1px solid #fcd34d',
  },
  officerCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #fef3c7',
  },
  officerCardIcon: {
    fontSize: '20px',
  },
  officerCardTitle: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: colors.neutral900,
  },
  officerCardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  meetingItem: {
    padding: '8px 0',
    borderBottom: `1px solid ${colors.gray200}`,
  },
  meetingTitle: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral900,
    marginBottom: '4px',
  },
  meetingMeta: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },
  noticeItem: {
    padding: '8px 0',
    borderBottom: `1px solid ${colors.gray200}`,
  },
  noticeTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  newBadge: {
    padding: '2px 6px',
    backgroundColor: '#ef4444',
    color: '#fff',
    borderRadius: '4px',
    fontSize: '0.625rem',
    fontWeight: 600,
  },
  noticeTitle: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral900,
  },
  noticeDate: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },
  taskSummaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '16px',
  },
  taskSummaryItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#fef3c7',
    borderRadius: borderRadius.md,
  },
  taskSummaryValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#b45309',
  },
  taskSummaryLabel: {
    fontSize: '0.75rem',
    color: '#92400e',
    marginTop: '4px',
  },
  officerNotice: {
    padding: '12px',
    backgroundColor: '#fef3c7',
    borderRadius: borderRadius.md,
    fontSize: '0.75rem',
    color: '#92400e',
    lineHeight: 1.5,
  },
};

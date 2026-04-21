/**
 * WorkPage - 근무약사 전용 업무 화면
 *
 * WO-KPA-WORK-IMPLEMENT-V1
 * - 개인 기준 업무 화면 (약국·경영과 명확히 분리)
 * - 경영/결정 기능 배제
 * - 5개 카드: 오늘의 업무, 학습/교육, 디지털 사이니지, 커뮤니티, 공지/정보
 *
 * 핵심 원칙:
 * - "/work는 개인 업무 화면이며, 경영과 결정을 다루지 않는다."
 * - /pharmacy → /work 이동 허용, /work → /pharmacy 직접 링크 제공 ❌
 */

import { Link } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../../styles/theme';
import { useAuth, TestUser } from '../../contexts/AuthContext';

// Mock 개인 업무 데이터
const mockWorkData = {
  tasks: {
    today: [
      { id: 't1', title: '처방전 검토 완료', done: true },
      { id: 't2', title: '재고 현황 확인', done: false },
      { id: 't3', title: '고객 상담 기록 정리', done: false },
    ],
    pharmacyRef: '강남중앙약국', // 참고 정보로만
  },
  learning: {
    inProgress: [
      { id: 'l1', title: '2025 약사 보수교육', progress: 65 },
      { id: 'l2', title: '복약지도 심화과정', progress: 30 },
    ],
    completed: 12,
    recommended: [
      { id: 'r1', title: '당뇨병 환자 관리' },
    ],
  },
  signage: {
    displays: [
      { id: 'd1', name: '메인 디스플레이', status: 'active', myRole: 'viewer' },
      { id: 'd2', name: '대기실 모니터', status: 'pending', myRole: 'contributor' },
    ],
  },
  community: {
    myPosts: 8,
    myComments: 23,
    unreadNotifications: 3,
    recentActivity: [
      { id: 'a1', type: 'comment', content: '내 글에 새 댓글' },
    ],
  },
  notices: {
    items: [
      { id: 'n1', title: '2025년 1분기 정책 변경 안내', date: '2025-01-20', isNew: true },
      { id: 'n2', title: '보수교육 일정 공지', date: '2025-01-15', isNew: false },
    ],
    marketTrail: [
      { id: 'm1', title: '건강기능식품 시장 동향', source: '약사회 리서치' },
    ],
  },
};

export function WorkPage() {
  const { user } = useAuth();
  const testUser = user as TestUser | null;
  const userName = testUser?.name || '약사';

  const data = mockWorkData;
  const completedTasks = data.tasks.today.filter(t => t.done).length;
  const totalTasks = data.tasks.today.length;

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.greeting}>
            <h1 style={styles.pageTitle}>내 업무</h1>
            <p style={styles.subTitle}>{userName}님의 업무 현황</p>
          </div>
          <div style={styles.roleBadge}>근무약사</div>
        </div>
      </header>

      {/* 5개 카드 그리드 */}
      <div style={styles.cardGrid}>
        {/* 카드 1: 오늘의 업무 */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>📋</span>
            <h2 style={styles.cardTitle}>오늘의 업무</h2>
          </div>
          <div style={styles.cardBody}>
            <div style={styles.taskSummary}>
              <span style={styles.taskCount}>{completedTasks}/{totalTasks}</span>
              <span style={styles.taskLabel}>완료</span>
            </div>
            <ul style={styles.taskList}>
              {data.tasks.today.map(task => (
                <li key={task.id} style={styles.taskItem}>
                  <span style={{
                    ...styles.checkbox,
                    backgroundColor: task.done ? colors.primary : 'transparent',
                    borderColor: task.done ? colors.primary : colors.neutral300,
                  }}>
                    {task.done && '✓'}
                  </span>
                  <span style={{
                    ...styles.taskText,
                    textDecoration: task.done ? 'line-through' : 'none',
                    color: task.done ? colors.neutral400 : colors.neutral700,
                  }}>
                    {task.title}
                  </span>
                </li>
              ))}
            </ul>
            <div style={styles.refInfo}>
              <span style={styles.refLabel}>소속:</span>
              <span style={styles.refValue}>{data.tasks.pharmacyRef}</span>
            </div>
          </div>
          <div style={styles.cardFooter}>
            <Link to="/work/tasks" style={styles.cardLink}>
              업무 관리 →
            </Link>
          </div>
        </div>

        {/* 카드 2: 학습/교육 */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>📚</span>
            <h2 style={styles.cardTitle}>학습 / 교육</h2>
          </div>
          <div style={styles.cardBody}>
            <div style={styles.learningStats}>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{data.learning.inProgress.length}</span>
                <span style={styles.statLabel}>진행중</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{data.learning.completed}</span>
                <span style={styles.statLabel}>수료</span>
              </div>
            </div>
            <div style={styles.courseList}>
              {data.learning.inProgress.map(course => (
                <div key={course.id} style={styles.courseItem}>
                  <span style={styles.courseName}>{course.title}</span>
                  <div style={styles.progressBar}>
                    <div style={{
                      ...styles.progressFill,
                      width: `${course.progress}%`,
                    }} />
                  </div>
                  <span style={styles.progressText}>{course.progress}%</span>
                </div>
              ))}
            </div>
            {data.learning.recommended.length > 0 && (
              <div style={styles.recommendedSection}>
                <span style={styles.recommendedLabel}>추천 콘텐츠</span>
                <span style={styles.recommendedTitle}>
                  {data.learning.recommended[0].title}
                </span>
              </div>
            )}
          </div>
          <div style={styles.cardFooter}>
            <Link to="/work/learning" style={styles.cardLink}>
              학습 현황 →
            </Link>
          </div>
        </div>

        {/* 카드 3: 디지털 사이니지 */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>🖥️</span>
            <h2 style={styles.cardTitle}>디지털 사이니지</h2>
          </div>
          <div style={styles.cardBody}>
            <p style={styles.signageDesc}>
              내가 관여 중인 디스플레이
            </p>
            <div style={styles.displayList}>
              {data.signage.displays.map(display => (
                <div key={display.id} style={styles.displayItem}>
                  <div style={styles.displayInfo}>
                    <span style={styles.displayName}>{display.name}</span>
                    <span style={{
                      ...styles.displayStatus,
                      backgroundColor: display.status === 'active'
                        ? colors.success + '20'
                        : colors.warning + '20',
                      color: display.status === 'active'
                        ? colors.success
                        : colors.warning,
                    }}>
                      {display.status === 'active' ? '활성' : '대기'}
                    </span>
                  </div>
                  <span style={styles.displayRole}>
                    {display.myRole === 'viewer' ? '열람' : '기여자'}
                  </span>
                </div>
              ))}
            </div>
            <div style={styles.signageNotice}>
              배포·승인 권한은 개설약사에게 있습니다.
            </div>
          </div>
          <div style={styles.cardFooter}>
            <Link to="/work/display" style={styles.cardLink}>
              디스플레이 확인 →
            </Link>
          </div>
        </div>

        {/* 카드 4: 커뮤니티 */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>💬</span>
            <h2 style={styles.cardTitle}>커뮤니티</h2>
          </div>
          <div style={styles.cardBody}>
            <div style={styles.communityStats}>
              <div style={styles.communityStat}>
                <span style={styles.communityValue}>{data.community.myPosts}</span>
                <span style={styles.communityLabel}>내 글</span>
              </div>
              <div style={styles.communityStat}>
                <span style={styles.communityValue}>{data.community.myComments}</span>
                <span style={styles.communityLabel}>댓글</span>
              </div>
              <div style={styles.communityStat}>
                {data.community.unreadNotifications > 0 && (
                  <span style={styles.notificationBadge}>
                    {data.community.unreadNotifications}
                  </span>
                )}
                <span style={styles.communityLabel}>알림</span>
              </div>
            </div>
            {data.community.recentActivity.length > 0 && (
              <div style={styles.recentActivity}>
                <span style={styles.activityIcon}>🔔</span>
                <span style={styles.activityText}>
                  {data.community.recentActivity[0].content}
                </span>
              </div>
            )}
          </div>
          <div style={styles.cardFooter}>
            <Link to="/work/community" style={styles.cardLink}>
              포럼 활동 →
            </Link>
          </div>
        </div>

        {/* 카드 5: 공지/정보 */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>📢</span>
            <h2 style={styles.cardTitle}>공지 / 정보</h2>
          </div>
          <div style={styles.cardBody}>
            <div style={styles.noticeList}>
              {data.notices.items.map(notice => (
                <div key={notice.id} style={styles.noticeItem}>
                  <div style={styles.noticeTitle}>
                    {notice.isNew && <span style={styles.newBadge}>NEW</span>}
                    {notice.title}
                  </div>
                  <span style={styles.noticeDate}>{notice.date}</span>
                </div>
              ))}
            </div>
            {data.notices.marketTrail.length > 0 && (
              <div style={styles.marketTrailSection}>
                <span style={styles.marketTrailLabel}>시장 정보</span>
                <div style={styles.marketTrailItem}>
                  <span>{data.notices.marketTrail[0].title}</span>
                  <span style={styles.marketTrailSource}>
                    {data.notices.marketTrail[0].source}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div style={styles.cardFooter}>
            <Link to="/" style={styles.cardLink}>
              공지사항 →
            </Link>
          </div>
        </div>
      </div>

      {/* 안내 문구 */}
      <div style={styles.notice}>
        <span style={styles.noticeIcon}>ℹ️</span>
        <span style={styles.noticeText}>
          이 화면은 개인 업무 관리용입니다. 약국 운영 화면은 개설약사 전용입니다.
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
  },

  // Header
  header: {
    marginBottom: '24px',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
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
    margin: 0,
  },
  roleBadge: {
    padding: '6px 14px',
    backgroundColor: colors.info + '15',
    color: colors.info,
    borderRadius: '16px',
    fontSize: '0.8125rem',
    fontWeight: 600,
  },

  // Card Grid
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 20px',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  cardIcon: {
    fontSize: '1.25rem',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  cardBody: {
    padding: '16px 20px',
    flex: 1,
  },
  cardFooter: {
    padding: '12px 20px',
    borderTop: `1px solid ${colors.neutral100}`,
    backgroundColor: colors.neutral50,
  },
  cardLink: {
    color: colors.primary,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
  },

  // Task Card
  taskSummary: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
    marginBottom: '12px',
  },
  taskCount: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.primary,
  },
  taskLabel: {
    fontSize: '0.875rem',
    color: colors.neutral500,
  },
  taskList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  taskItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    borderRadius: '4px',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    color: colors.white,
    flexShrink: 0,
  },
  taskText: {
    fontSize: '0.875rem',
  },
  refInfo: {
    marginTop: '12px',
    padding: '8px 12px',
    backgroundColor: colors.neutral50,
    borderRadius: borderRadius.sm,
    display: 'flex',
    gap: '6px',
    fontSize: '0.75rem',
  },
  refLabel: {
    color: colors.neutral500,
  },
  refValue: {
    color: colors.neutral700,
    fontWeight: 500,
  },

  // Learning Card
  learningStats: {
    display: 'flex',
    gap: '24px',
    marginBottom: '16px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.neutral800,
  },
  statLabel: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },
  courseList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  courseItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  courseName: {
    fontSize: '0.8125rem',
    color: colors.neutral700,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  progressBar: {
    width: '60px',
    height: '6px',
    backgroundColor: colors.neutral200,
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: '3px',
  },
  progressText: {
    fontSize: '0.75rem',
    color: colors.neutral500,
    width: '32px',
    textAlign: 'right',
  },
  recommendedSection: {
    marginTop: '12px',
    padding: '10px 12px',
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.sm,
  },
  recommendedLabel: {
    display: 'block',
    fontSize: '0.6875rem',
    color: colors.primary,
    fontWeight: 600,
    marginBottom: '4px',
  },
  recommendedTitle: {
    fontSize: '0.8125rem',
    color: colors.neutral700,
  },

  // Signage Card
  signageDesc: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
    margin: '0 0 12px',
  },
  displayList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  displayItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: colors.neutral50,
    borderRadius: borderRadius.sm,
  },
  displayInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  displayName: {
    fontSize: '0.875rem',
    color: colors.neutral700,
    fontWeight: 500,
  },
  displayStatus: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '0.6875rem',
    fontWeight: 500,
  },
  displayRole: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },
  signageNotice: {
    marginTop: '12px',
    fontSize: '0.75rem',
    color: colors.neutral400,
    fontStyle: 'italic',
  },

  // Community Card
  communityStats: {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: '16px',
  },
  communityStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  communityValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: colors.neutral800,
  },
  communityLabel: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },
  notificationBadge: {
    backgroundColor: colors.error,
    color: colors.white,
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '10px',
    minWidth: '20px',
    textAlign: 'center',
  },
  recentActivity: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.sm,
  },
  activityIcon: {
    fontSize: '0.875rem',
  },
  activityText: {
    fontSize: '0.8125rem',
    color: colors.neutral700,
  },

  // Notice Card
  noticeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  noticeItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '10px',
  },
  noticeTitle: {
    fontSize: '0.875rem',
    color: colors.neutral700,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  newBadge: {
    backgroundColor: colors.error,
    color: colors.white,
    fontSize: '0.625rem',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '4px',
  },
  noticeDate: {
    fontSize: '0.75rem',
    color: colors.neutral400,
    flexShrink: 0,
  },
  marketTrailSection: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: colors.neutral50,
    borderRadius: borderRadius.sm,
  },
  marketTrailLabel: {
    display: 'block',
    fontSize: '0.6875rem',
    color: colors.neutral500,
    fontWeight: 600,
    marginBottom: '8px',
  },
  marketTrailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '0.8125rem',
    color: colors.neutral700,
  },
  marketTrailSource: {
    fontSize: '0.6875rem',
    color: colors.neutral400,
  },

  // Notice
  notice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '16px 20px',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
  },
  noticeIcon: {
    fontSize: '16px',
    flexShrink: 0,
  },
  noticeText: {
    fontSize: '0.875rem',
    color: colors.neutral600,
    lineHeight: 1.5,
  },
};

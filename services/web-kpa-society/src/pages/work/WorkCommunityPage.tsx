/**
 * WorkCommunityPage - 커뮤니티 활동
 *
 * WO-KPA-WORK-IMPLEMENT-V1
 * - 포럼 활동 요약
 * - 내가 쓴 글 / 댓글
 * - 알림
 */

import { Link } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../../styles/theme';
import { useAuth, TestUser } from '../../contexts/AuthContext';

// Mock 커뮤니티 데이터
const mockCommunityData = {
  stats: {
    posts: 8,
    comments: 23,
    likes: 45,
  },
  myPosts: [
    {
      id: 'p1',
      title: '복약지도 경험 공유합니다',
      category: '자유게시판',
      date: '2025-01-23',
      views: 156,
      comments: 12,
      likes: 8,
    },
    {
      id: 'p2',
      title: '당뇨 환자 상담 질문',
      category: '질문/답변',
      date: '2025-01-20',
      views: 89,
      comments: 5,
      likes: 3,
    },
    {
      id: 'p3',
      title: '신규 건강기능식품 정보',
      category: '정보공유',
      date: '2025-01-15',
      views: 234,
      comments: 8,
      likes: 15,
    },
  ],
  recentComments: [
    {
      id: 'c1',
      postTitle: '약국 운영 팁 모음',
      content: '좋은 정보 감사합니다!',
      date: '2025-01-24',
    },
    {
      id: 'c2',
      postTitle: '2025년 약사 보수교육 일정',
      content: '일정 공유 감사드립니다.',
      date: '2025-01-22',
    },
  ],
  notifications: [
    { id: 'n1', type: 'comment', content: '내 글에 새 댓글이 달렸습니다', date: '2025-01-24', isRead: false },
    { id: 'n2', type: 'like', content: '내 글에 좋아요가 추가되었습니다', date: '2025-01-24', isRead: false },
    { id: 'n3', type: 'reply', content: '내 댓글에 답글이 달렸습니다', date: '2025-01-23', isRead: true },
  ],
};

export function WorkCommunityPage() {
  const { user } = useAuth();
  const testUser = user as TestUser | null;
  const userName = testUser?.name || '약사';

  const data = mockCommunityData;
  const unreadCount = data.notifications.filter(n => !n.isRead).length;

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <Link to="/work" style={styles.backLink}>← 내 업무</Link>
        <div style={styles.headerMain}>
          <div>
            <h1 style={styles.pageTitle}>커뮤니티</h1>
            <p style={styles.subTitle}>{userName}님의 포럼 활동</p>
          </div>
          <div style={styles.statsRow}>
            <div style={styles.statBadge}>
              <span style={styles.statNumber}>{data.stats.posts}</span>
              <span style={styles.statLabel}>게시글</span>
            </div>
            <div style={styles.statBadge}>
              <span style={styles.statNumber}>{data.stats.comments}</span>
              <span style={styles.statLabel}>댓글</span>
            </div>
            <div style={styles.statBadge}>
              <span style={styles.statNumber}>{data.stats.likes}</span>
              <span style={styles.statLabel}>좋아요</span>
            </div>
          </div>
        </div>
      </header>

      {/* 알림 */}
      {unreadCount > 0 && (
        <section style={styles.notificationSection}>
          <div style={styles.notificationHeader}>
            <h2 style={styles.sectionTitle}>알림</h2>
            <span style={styles.unreadBadge}>{unreadCount}개 읽지 않음</span>
          </div>
          <div style={styles.notificationList}>
            {data.notifications.filter(n => !n.isRead).map(notif => (
              <div key={notif.id} style={styles.notificationCard}>
                <span style={styles.notifIcon}>
                  {notif.type === 'comment' ? '💬' : notif.type === 'like' ? '❤️' : '↩️'}
                </span>
                <div style={styles.notifContent}>
                  <span style={styles.notifText}>{notif.content}</span>
                  <span style={styles.notifDate}>{notif.date}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 내 게시글 */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>내 게시글</h2>
          <Link to="/forum" style={styles.viewAllLink}>전체 보기 →</Link>
        </div>
        <div style={styles.postList}>
          {data.myPosts.map(post => (
            <Link key={post.id} to={`/forum/post/${post.id}`} style={styles.postCard}>
              <div style={styles.postHeader}>
                <span style={styles.postCategory}>{post.category}</span>
                <span style={styles.postDate}>{post.date}</span>
              </div>
              <h3 style={styles.postTitle}>{post.title}</h3>
              <div style={styles.postStats}>
                <span style={styles.postStat}>👁️ {post.views}</span>
                <span style={styles.postStat}>💬 {post.comments}</span>
                <span style={styles.postStat}>❤️ {post.likes}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 최근 댓글 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>최근 댓글</h2>
        <div style={styles.commentList}>
          {data.recentComments.map(comment => (
            <div key={comment.id} style={styles.commentCard}>
              <div style={styles.commentHeader}>
                <span style={styles.commentPostTitle}>{comment.postTitle}</span>
                <span style={styles.commentDate}>{comment.date}</span>
              </div>
              <p style={styles.commentContent}>"{comment.content}"</p>
            </div>
          ))}
        </div>
      </section>

      {/* 포럼 바로가기 */}
      <div style={styles.writeSection}>
        <Link to="/forum" style={styles.writeButton}>
          💊 포럼 둘러보기
        </Link>
      </div>
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
    flexWrap: 'wrap',
    gap: '16px',
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
    padding: '12px 16px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    minWidth: '70px',
  },
  statNumber: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: colors.primary,
  },
  statLabel: {
    fontSize: '0.6875rem',
    color: colors.neutral500,
  },
  section: {
    marginBottom: '32px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  viewAllLink: {
    color: colors.primary,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  notificationSection: {
    marginBottom: '32px',
    padding: '20px',
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.lg,
  },
  notificationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  unreadBadge: {
    backgroundColor: colors.error,
    color: colors.white,
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  notificationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  notificationCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
  },
  notifIcon: {
    fontSize: '1.25rem',
  },
  notifContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
  },
  notifText: {
    fontSize: '0.875rem',
    color: colors.neutral700,
  },
  notifDate: {
    fontSize: '0.75rem',
    color: colors.neutral400,
  },
  postList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  postCard: {
    display: 'block',
    padding: '16px 20px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    textDecoration: 'none',
    transition: 'transform 0.2s',
  },
  postHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  postCategory: {
    padding: '4px 10px',
    backgroundColor: colors.primary + '15',
    color: colors.primary,
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  postDate: {
    fontSize: '0.75rem',
    color: colors.neutral400,
  },
  postTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.neutral800,
    margin: '0 0 12px',
  },
  postStats: {
    display: 'flex',
    gap: '16px',
  },
  postStat: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
  },
  commentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  commentCard: {
    padding: '16px 20px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  commentPostTitle: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
  },
  commentDate: {
    fontSize: '0.75rem',
    color: colors.neutral400,
  },
  commentContent: {
    fontSize: '0.9375rem',
    color: colors.neutral700,
    margin: 0,
    fontStyle: 'italic',
  },
  writeSection: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '16px',
  },
  writeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: borderRadius.md,
    textDecoration: 'none',
    fontSize: '0.9375rem',
    fontWeight: 500,
  },
};

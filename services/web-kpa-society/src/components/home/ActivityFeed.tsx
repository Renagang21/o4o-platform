/**
 * ActivityFeed - 활동 피드
 *
 * 최근 포럼 글, 공지/중요 알림 표시
 * - 로그인 전: 공개 글만
 * - 로그인 후: 개인화 (향후)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { forumApi, newsApi } from '../../api';
import type { ForumPost, Notice } from '../../types';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

export function ActivityFeed() {
  const { isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    forumApi.getPosts({ limit: 5 })
      .then((res) => {
        if (res.data) setPosts(res.data);
      })
      .catch(() => {});

    newsApi.getNotices({ limit: 3 })
      .then((res) => {
        if (res.data) setNotices(res.data);
      })
      .catch(() => {});
  }, []);

  return (
    <section style={styles.container}>
      <div style={styles.grid}>
        {/* 최근 글 */}
        <div style={styles.feedCard}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>최근 글</h2>
            <Link to="/forum" style={styles.moreLink}>더보기</Link>
          </div>
          {posts.length === 0 ? (
            <p style={styles.empty}>자료가 없습니다</p>
          ) : (
            <ul style={styles.list}>
              {posts.map((post) => (
                <li key={post.id} style={styles.listItem}>
                  <Link to={`/forum/post/${post.id}`} style={styles.postLink}>
                    <span style={styles.category}>{post.categoryName}</span>
                    <span style={styles.postTitle}>{post.title}</span>
                  </Link>
                  <div style={styles.meta}>
                    <span>{post.authorName}</span>
                    <span style={styles.dot}>·</span>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 공지/알림 */}
        <div style={styles.feedCard}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>공지사항</h2>
            <Link to="/news" style={styles.moreLink}>더보기</Link>
          </div>
          {notices.length === 0 ? (
            <p style={styles.empty}>자료가 없습니다</p>
          ) : (
            <ul style={styles.list}>
              {notices.map((notice) => (
                <li key={notice.id} style={styles.listItem}>
                  <Link to={`/news/${notice.id}`} style={styles.postLink}>
                    <span style={styles.postTitle}>{notice.title}</span>
                  </Link>
                  <div style={styles.meta}>
                    <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {isAuthenticated && (
            <div style={styles.personalNote}>
              내 알림과 참여 현황은 마이페이지에서 확인하세요.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.xl} 0`,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: spacing.lg,
  },
  feedCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    boxShadow: shadows.sm,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  cardTitle: {
    ...typography.headingS,
    margin: 0,
    color: colors.neutral900,
  },
  moreLink: {
    fontSize: '0.875rem',
    color: colors.primary,
    textDecoration: 'none',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  listItem: {
    padding: `${spacing.sm} 0`,
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  postLink: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    textDecoration: 'none',
    color: colors.neutral800,
  },
  category: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
    fontSize: '0.75rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  postTitle: {
    fontSize: '0.875rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  meta: {
    display: 'flex',
    gap: spacing.xs,
    marginTop: '4px',
    fontSize: '0.75rem',
    color: colors.neutral400,
    paddingLeft: '0',
  },
  dot: {
    color: colors.neutral300,
  },
  personalNote: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.neutral50,
    borderRadius: borderRadius.sm,
    fontSize: '0.813rem',
    color: colors.neutral500,
    textAlign: 'center',
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral500,
    padding: spacing.xl,
    margin: 0,
  },
};

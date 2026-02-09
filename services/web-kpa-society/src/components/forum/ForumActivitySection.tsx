/**
 * ForumActivitySection - 포럼 최근 활동 (포럼의 핵심)
 *
 * ActivitySection 패턴: 최근 글 + 인기 글 2열 그리드
 * 로그인 전: 공개 글만 / 로그인 후: 개인화 (향후)
 *
 * WO-FIX-FORUM-LINKS: 현재 경로에 따라 링크 동적 생성
 * - /forum/* → /forum/* (커뮤니티)
 * - /demo/forum/* → /demo/forum/* (데모)
 */

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { forumApi } from '../../api';
import type { ForumPost } from '../../types';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

// 포럼 베이스 경로
function useForumBasePath(): string {
  return '/forum';
}

function PostItem({ post, basePath }: { post: ForumPost; basePath: string }) {
  return (
    <li style={styles.listItem}>
      <Link to={`${basePath}/post/${post.id}`} style={styles.postLink}>
        {post.isPinned && <span style={styles.pinnedBadge}>공지</span>}
        <span style={styles.categoryBadge}>{post.categoryName}</span>
        <span style={styles.postTitle}>{post.title}</span>
      </Link>
      <div style={styles.meta}>
        <span>{post.authorName}</span>
        <span style={styles.dot}>·</span>
        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
        {post.likeCount > 0 && (
          <>
            <span style={styles.dot}>·</span>
            <span>좋아요 {post.likeCount}</span>
          </>
        )}
        <span style={styles.dot}>·</span>
        <span>댓글 {post.commentCount}</span>
      </div>
    </li>
  );
}

export function ForumActivitySection() {
  const basePath = useForumBasePath();
  const [recentPosts, setRecentPosts] = useState<ForumPost[]>([]);
  const [popularPosts, setPopularPosts] = useState<ForumPost[]>([]);

  useEffect(() => {
    forumApi.getPosts({ limit: 5 })
      .then((res) => {
        if (res.data) setRecentPosts(res.data);
      })
      .catch(() => {});

    forumApi.getPosts({ limit: 5 })
      .then((res) => {
        if (res.data) {
          const sorted = [...res.data].sort((a, b) => b.viewCount - a.viewCount);
          setPopularPosts(sorted);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section style={styles.container}>
      <h2 style={styles.sectionTitle}>최근 활동</h2>
      <div style={styles.grid}>
        {/* 최근 글 */}
        <div style={styles.feedCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>최근 글</h3>
            <Link to={`${basePath}?view=all`} style={styles.moreLink}>더보기</Link>
          </div>
          {recentPosts.length === 0 ? (
            <p style={styles.empty}>자료가 없습니다</p>
          ) : (
            <ul style={styles.list}>
              {recentPosts.map((post) => (
                <PostItem key={post.id} post={post} basePath={basePath} />
              ))}
            </ul>
          )}
        </div>

        {/* 인기 글 */}
        <div style={styles.feedCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>인기 글</h3>
            <Link to={`${basePath}?sort=popular`} style={styles.moreLink}>더보기</Link>
          </div>
          {popularPosts.length === 0 ? (
            <p style={styles.empty}>자료가 없습니다</p>
          ) : (
            <ul style={styles.list}>
              {popularPosts.map((post) => (
                <PostItem key={`popular-${post.id}`} post={post} basePath={basePath} />
              ))}
            </ul>
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
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    marginBottom: spacing.lg,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
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
  pinnedBadge: {
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.accentRed || '#ef4444',
    color: colors.white,
    fontSize: '0.688rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  categoryBadge: {
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
  },
  dot: {
    color: colors.neutral300,
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral500,
    padding: spacing.xl,
    margin: 0,
  },
};

/**
 * RecentForumPosts - 최근 포럼 글 목록
 *
 * ActivitySection 하위 컴포넌트
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { forumApi } from '../../../api';
import type { ForumPost } from '../../../types';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';

export function RecentForumPosts() {
  const [posts, setPosts] = useState<ForumPost[]>([]);

  useEffect(() => {
    forumApi.getPosts({ limit: 3 })
      .then((res) => {
        if (res.data) setPosts(res.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <div style={styles.header}>
        <h3 style={styles.title}>최근 글</h3>
        <Link to="/forum" style={styles.moreLink}>포럼에서 소통하기 →</Link>
      </div>
      {posts.length === 0 ? (
        <div style={styles.emptyWrap}>
          <p style={styles.empty}>아직 글이 없습니다.</p>
          <p style={styles.emptyHint}>커뮤니티에서 첫 글을 작성해보세요.</p>
          <Link to="/forum" style={styles.emptyAction}>포럼 바로가기 →</Link>
        </div>
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
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  title: {
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
  },
  dot: {
    color: colors.neutral300,
  },
  emptyWrap: {
    textAlign: 'center',
    padding: spacing.xl,
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral500,
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

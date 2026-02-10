/**
 * ForumCategorySection - 카테고리 탭 + 글 목록
 *
 * 카테고리를 탭으로 표시하고, 선택된 탭의 글 목록을 아래에 표시
 * "전체" 탭 포함, 각 탭 클릭 시 해당 카테고리 글 10건 로드
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { forumApi } from '../../api';
import type { ForumCategory, ForumPost } from '../../types';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

export function ForumCategorySection() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    forumApi.getCategories()
      .then((res) => {
        if (res.data) setCategories(res.data);
      })
      .catch(() => {});
  }, []);

  const loadPosts = useCallback(async (categoryId: string) => {
    try {
      setLoading(true);
      const params: { categoryId?: string; limit: number } = { limit: 10 };
      if (categoryId) params.categoryId = categoryId;
      const res = await forumApi.getPosts(params);
      setPosts(res.data || []);
      setTotalCount(res.total || res.data?.length || 0);
    } catch {
      setPosts([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts(selectedCategoryId);
  }, [selectedCategoryId, loadPosts]);

  const handleTabClick = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
  };

  const allLink = selectedCategoryId
    ? `/forum/all?category=${selectedCategoryId}`
    : '/forum/all';

  return (
    <section style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.sectionTitle}>게시판</h2>
        <Link to={allLink} style={styles.moreLink}>전체 글 보기 →</Link>
      </div>

      {/* Category Tabs */}
      <div style={styles.tabBar}>
        <button
          style={{
            ...styles.tab,
            ...(selectedCategoryId === '' ? styles.tabActive : {}),
          }}
          onClick={() => handleTabClick('')}
        >
          전체
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            style={{
              ...styles.tab,
              ...(selectedCategoryId === cat.id ? styles.tabActive : {}),
            }}
            onClick={() => handleTabClick(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Post List */}
      <div style={styles.listCard}>
        {loading ? (
          <div style={styles.emptyWrap}>
            <p style={styles.emptyText}>불러오는 중...</p>
          </div>
        ) : posts.length === 0 ? (
          <div style={styles.emptyWrap}>
            <p style={styles.emptyText}>등록된 글이 없습니다</p>
          </div>
        ) : (
          <>
            <ul style={styles.list}>
              {posts.map((post) => (
                <li key={post.id} style={styles.listItem}>
                  <Link to={`/forum/post/${post.id}`} style={styles.postLink}>
                    {post.isPinned && <span style={styles.pinnedBadge}>공지</span>}
                    <span style={styles.categoryBadge}>{post.categoryName}</span>
                    <span style={styles.postTitle}>{post.title}</span>
                    {post.commentCount > 0 && (
                      <span style={styles.commentCount}>[{post.commentCount}]</span>
                    )}
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
                    <span>조회 {post.viewCount}</span>
                  </div>
                </li>
              ))}
            </ul>
            {totalCount > 10 && (
              <div style={styles.moreWrap}>
                <Link to={allLink} style={styles.moreBtn}>
                  더보기 ({totalCount}건)
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.lg} 0`,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    margin: 0,
  },
  moreLink: {
    fontSize: '0.813rem',
    color: colors.primary,
    textDecoration: 'none',
  },
  tabBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  tab: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '20px',
    backgroundColor: colors.white,
    color: colors.neutral700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: colors.white,
  },
  listCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.neutral100}`,
    overflow: 'hidden',
  },
  emptyWrap: {
    padding: spacing.xl,
    textAlign: 'center' as const,
  },
  emptyText: {
    color: colors.neutral500,
    margin: 0,
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  listItem: {
    padding: `${spacing.sm} ${spacing.lg}`,
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
    flexShrink: 0,
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
    flexShrink: 0,
  },
  postTitle: {
    fontSize: '0.875rem',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  commentCount: {
    fontSize: '0.813rem',
    color: colors.primary,
    fontWeight: 500,
    flexShrink: 0,
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
  moreWrap: {
    padding: `${spacing.md} ${spacing.lg}`,
    textAlign: 'center' as const,
    borderTop: `1px solid ${colors.neutral100}`,
  },
  moreBtn: {
    fontSize: '0.875rem',
    color: colors.primary,
    textDecoration: 'none',
    fontWeight: 500,
  },
};

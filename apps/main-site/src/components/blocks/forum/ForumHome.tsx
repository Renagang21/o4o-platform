/**
 * ForumHome Block Renderer
 *
 * Renders forum homepage with categories, stats, pinned posts, and recent activity.
 * Uses injected data from CMSBlockWrapper.
 * Styled with CMS Theme tokens (CSS variables).
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
  icon?: string;
  color?: string;
}

interface ForumPostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  authorName?: string;
  authorAvatar?: string;
  categoryName?: string;
  isPinned: boolean;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  createdAt: string;
}

interface ForumStats {
  totalPosts: number;
  totalComments: number;
  totalUsers: number;
  onlineUsers?: number;
}

interface ForumHomeData {
  categories: ForumCategory[];
  pinnedPosts: ForumPostSummary[];
  recentPosts: ForumPostSummary[];
  stats: ForumStats;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (days > 7) return date.toLocaleDateString('ko-KR');
  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return '방금 전';
}

// Theme-aware styles using CSS variables
const styles = {
  card: {
    backgroundColor: 'var(--forum-bg-primary)',
    borderColor: 'var(--forum-border-light)',
    boxShadow: 'var(--forum-shadow-sm)',
    borderRadius: 'var(--forum-radius-lg)',
  },
  cardHover: {
    boxShadow: 'var(--forum-shadow-md)',
  },
  heading: {
    color: 'var(--forum-text-primary)',
  },
  text: {
    color: 'var(--forum-text-secondary)',
  },
  textMuted: {
    color: 'var(--forum-text-muted)',
  },
  link: {
    color: 'var(--forum-text-link)',
  },
  statPosts: {
    backgroundColor: 'var(--forum-stat-posts-bg)',
    color: 'var(--forum-stat-posts-text)',
  },
  statComments: {
    backgroundColor: 'var(--forum-stat-comments-bg)',
    color: 'var(--forum-stat-comments-text)',
  },
  statUsers: {
    backgroundColor: 'var(--forum-stat-users-bg)',
    color: 'var(--forum-stat-users-text)',
  },
  badgePinned: {
    backgroundColor: 'var(--forum-badge-pinned-bg)',
    color: 'var(--forum-badge-pinned-text)',
  },
};

export const ForumHomeBlock = ({ node }: BlockRendererProps) => {
  const {
    showStats = true,
    showCategories = true,
    showPinnedPosts = true,
    showRecentPosts = true,
    recentPostsLimit = 10,
    categoryColumns = 3,
    data,
  } = node.props;

  const forumData: ForumHomeData = data || {
    categories: [],
    pinnedPosts: [],
    recentPosts: [],
    stats: { totalPosts: 0, totalComments: 0, totalUsers: 0 },
  };

  const columnClass = categoryColumns === 2 ? 'md:grid-cols-2' : categoryColumns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3';

  return (
    <div className="forum-home py-6">
      {/* Stats Overview */}
      {showStats && (
        <section className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              className="rounded-lg border p-4 text-center"
              style={styles.card}
            >
              <div className="text-2xl font-bold" style={styles.statPosts}>
                {forumData.stats.totalPosts}
              </div>
              <div className="text-sm" style={styles.textMuted}>게시글</div>
            </div>
            <div
              className="rounded-lg border p-4 text-center"
              style={styles.card}
            >
              <div className="text-2xl font-bold" style={styles.statComments}>
                {forumData.stats.totalComments}
              </div>
              <div className="text-sm" style={styles.textMuted}>댓글</div>
            </div>
            <div
              className="rounded-lg border p-4 text-center"
              style={styles.card}
            >
              <div className="text-2xl font-bold" style={styles.statUsers}>
                {forumData.stats.totalUsers}
              </div>
              <div className="text-sm" style={styles.textMuted}>회원</div>
            </div>
            {forumData.stats.onlineUsers !== undefined && (
              <div
                className="rounded-lg border p-4 text-center"
                style={styles.card}
              >
                <div className="text-2xl font-bold" style={{ color: 'var(--forum-warning)' }}>
                  {forumData.stats.onlineUsers}
                </div>
                <div className="text-sm" style={styles.textMuted}>접속중</div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Categories */}
      {showCategories && forumData.categories.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4" style={styles.heading}>카테고리</h2>
          <div className={`grid grid-cols-1 ${columnClass} gap-4`}>
            {forumData.categories.map((category) => (
              <a
                key={category.id}
                href={`/forum/category/${category.slug}`}
                className="rounded-lg border p-4 transition-shadow hover:shadow-md"
                style={styles.card}
              >
                <div className="flex items-start gap-3">
                  {category.icon && (
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                      style={{ backgroundColor: category.color || 'var(--forum-primary)' }}
                    >
                      {category.icon}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold" style={styles.heading}>{category.name}</h3>
                    {category.description && (
                      <p className="text-sm mt-1 line-clamp-2" style={styles.text}>{category.description}</p>
                    )}
                    <p className="text-xs mt-2" style={styles.textMuted}>{category.postCount} 게시글</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Pinned Posts */}
      {showPinnedPosts && forumData.pinnedPosts.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4" style={styles.heading}>공지사항</h2>
          <div className="space-y-3">
            {forumData.pinnedPosts.map((post) => (
              <a
                key={post.id}
                href={`/forum/post/${post.slug}`}
                className="block rounded-lg border p-4 transition-shadow hover:shadow-md"
                style={styles.card}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                    style={{ backgroundColor: 'var(--forum-bg-tertiary)', color: 'var(--forum-text-secondary)' }}
                  >
                    {post.authorAvatar ? (
                      <img src={post.authorAvatar} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      post.authorName?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={styles.badgePinned}
                      >
                        고정
                      </span>
                      <h3 className="font-semibold" style={styles.heading}>{post.title}</h3>
                    </div>
                    {post.excerpt && (
                      <p className="text-sm mt-1 line-clamp-2" style={styles.text}>{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs" style={styles.textMuted}>
                      <span>{post.authorName || '익명'}</span>
                      <span>{formatRelativeTime(post.createdAt)}</span>
                      <span>조회 {post.viewCount}</span>
                      <span>댓글 {post.commentCount}</span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Recent Posts */}
      {showRecentPosts && forumData.recentPosts.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4" style={styles.heading}>최근 게시글</h2>
          <div className="space-y-3">
            {forumData.recentPosts.slice(0, recentPostsLimit).map((post) => (
              <a
                key={post.id}
                href={`/forum/post/${post.slug}`}
                className="block rounded-lg border p-4 transition-shadow hover:shadow-md"
                style={styles.card}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                    style={{ backgroundColor: 'var(--forum-bg-tertiary)', color: 'var(--forum-text-secondary)' }}
                  >
                    {post.authorAvatar ? (
                      <img src={post.authorAvatar} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      post.authorName?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold" style={styles.heading}>{post.title}</h3>
                    {post.excerpt && (
                      <p className="text-sm mt-1 line-clamp-2" style={styles.text}>{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs" style={styles.textMuted}>
                      <span>{post.authorName || '익명'}</span>
                      {post.categoryName && <span style={styles.link}>{post.categoryName}</span>}
                      <span>{formatRelativeTime(post.createdAt)}</span>
                      <span>조회 {post.viewCount}</span>
                      <span>댓글 {post.commentCount}</span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

/**
 * YaksaForumPostList - Post List Page
 *
 * Displays posts filtered by category and organization.
 * Includes moderation features for operators.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  YaksaCategoryList,
  YaksaOrgNavigation,
  YaksaRoleBadge,
  YaksaStatusBadge,
  yaksaStyles,
  applyYaksaTheme,
} from '@/components/yaksa/forum';
import {
  fetchYaksaPosts,
  fetchYaksaCategories,
  fetchYaksaUserProfile,
  hasRoleAccess,
  type YaksaPost,
  type YaksaCategory,
  type YaksaUser,
  type YaksaPostListResult,
  type YaksaOrganization,
} from '@/lib/yaksa/forum-data';

interface YaksaForumPostListProps {
  orgId: string;
  categorySlug?: string;
}

const SORT_OPTIONS = [
  { value: 'newest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'commented', label: '댓글순' },
];

export function YaksaForumPostList({
  orgId: initialOrgId,
  categorySlug,
}: YaksaForumPostListProps) {
  const [orgId, setOrgId] = useState(initialOrgId);
  const [posts, setPosts] = useState<YaksaPost[]>([]);
  const [categories, setCategories] = useState<YaksaCategory[]>([]);
  const [user, setUser] = useState<YaksaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    hasMore: false,
  });
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'commented'>('newest');
  const [currentCategory, setCurrentCategory] = useState<YaksaCategory | null>(null);

  useEffect(() => {
    applyYaksaTheme();
  }, []);

  // Load user profile
  useEffect(() => {
    async function loadUser() {
      const profile = await fetchYaksaUserProfile();
      setUser(profile);
    }
    loadUser();
  }, []);

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      const cats = await fetchYaksaCategories(orgId);
      setCategories(cats);
      if (categorySlug) {
        const cat = cats.find((c) => c.slug === categorySlug);
        setCurrentCategory(cat || null);
      }
    }
    loadCategories();
  }, [orgId, categorySlug]);

  // Load posts
  useEffect(() => {
    async function loadPosts() {
      setLoading(true);
      try {
        const result: YaksaPostListResult = await fetchYaksaPosts(orgId, {
          categoryId: currentCategory?.id,
          sortBy,
          page: pagination.currentPage,
        });
        setPosts(result.posts);
        setPagination(result.pagination);
      } catch (error) {
        console.error('Error loading posts:', error);
      } finally {
        setLoading(false);
      }
    }
    loadPosts();
  }, [orgId, currentCategory?.id, sortBy, pagination.currentPage]);

  const handleOrgChange = (org: YaksaOrganization) => {
    setOrgId(org.id);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isOperator = !!(user && hasRoleAccess(user.role, 'operator'));

  return (
    <div
      className="yaksa-forum-post-list min-h-screen"
      style={{ backgroundColor: 'var(--yaksa-surface-secondary)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b shadow-sm"
        style={{
          backgroundColor: 'var(--yaksa-primary)',
          borderColor: 'var(--yaksa-primary-dark)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <a href="/yaksa/forum" className="text-white hover:opacity-80">
              ← 홈
            </a>
            <h1 className="text-lg font-bold text-white">
              {currentCategory?.name || '전체 게시글'}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Organization Navigation */}
        <div className="mb-4">
          <YaksaOrgNavigation
            currentOrgId={orgId}
            onOrgChange={handleOrgChange}
            compact
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div
              className="p-4 rounded-lg border sticky top-20"
              style={{
                backgroundColor: 'var(--yaksa-surface)',
                borderColor: 'var(--yaksa-border)',
              }}
            >
              <h3 className="text-sm font-semibold mb-3" style={yaksaStyles.textPrimary}>
                게시판
              </h3>
              <YaksaCategoryList
                categories={categories}
                currentCategoryId={currentCategory?.id}
                userRole={user?.role || 'guest'}
                compact
              />
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Category Info & Controls */}
            <div
              className="p-4 rounded-lg border mb-4"
              style={{
                backgroundColor: 'var(--yaksa-surface)',
                borderColor: 'var(--yaksa-border)',
              }}
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-semibold" style={yaksaStyles.textPrimary}>
                    {currentCategory?.icon} {currentCategory?.name || '전체 게시글'}
                  </h2>
                  {currentCategory?.description && (
                    <p className="text-sm mt-1" style={yaksaStyles.textMuted}>
                      {currentCategory.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Sort Options */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="px-3 py-1.5 rounded border text-sm"
                    style={{
                      borderColor: 'var(--yaksa-border)',
                      backgroundColor: 'var(--yaksa-surface)',
                    }}
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {/* Write Button */}
                  {user && hasRoleAccess(user.role, currentCategory?.requiredRole || 'member') && (
                    <a
                      href={`/yaksa/forum/write?orgId=${orgId}&categoryId=${currentCategory?.id || ''}`}
                      className="px-4 py-1.5 rounded text-sm font-medium"
                      style={yaksaStyles.buttonPrimary}
                    >
                      글쓰기
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Post List */}
            <div
              className="rounded-lg border overflow-hidden"
              style={{
                backgroundColor: 'var(--yaksa-surface)',
                borderColor: 'var(--yaksa-border)',
              }}
            >
              {loading ? (
                <PostListLoading />
              ) : posts.length === 0 ? (
                <div className="p-8 text-center">
                  <p style={yaksaStyles.textMuted}>게시글이 없습니다.</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--yaksa-border)' }}>
                  {posts.map((post) => (
                    <PostListItem
                      key={post.id}
                      post={post}
                      isOperator={isOperator}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {!loading && pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-1.5 rounded text-sm disabled:opacity-50"
                  style={yaksaStyles.buttonSecondary}
                >
                  이전
                </button>
                <span className="px-4 py-1.5 text-sm" style={yaksaStyles.textMuted}>
                  {pagination.currentPage} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasMore}
                  className="px-3 py-1.5 rounded text-sm disabled:opacity-50"
                  style={yaksaStyles.buttonSecondary}
                >
                  다음
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Post List Item
function PostListItem({ post, isOperator }: { post: YaksaPost; isOperator: boolean }) {
  return (
    <a
      href={`/yaksa/forum/post/${post.slug}`}
      className="block p-4 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start gap-4">
        {/* Author Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
          style={{
            backgroundColor: 'var(--yaksa-surface-tertiary)',
            color: 'var(--yaksa-text-secondary)',
          }}
        >
          {post.author.avatar ? (
            <img src={post.author.avatar} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            post.author.name.charAt(0)
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {post.isPinned && <span title="고정글">📌</span>}
            {post.isLocked && <span title="잠금글">🔒</span>}
            <h3 className="font-medium truncate" style={yaksaStyles.textPrimary}>
              {post.title}
            </h3>
            {post.commentCount > 0 && (
              <span className="text-sm" style={{ color: 'var(--yaksa-accent)' }}>
                [{post.commentCount}]
              </span>
            )}
            {isOperator && post.status !== 'approved' && (
              <YaksaStatusBadge status={post.status} />
            )}
          </div>

          {/* Meta Row */}
          <div className="flex items-center gap-3 mt-1 text-xs" style={yaksaStyles.textMuted}>
            <span className="flex items-center gap-1">
              <span>{post.author.name}</span>
              {post.author.role !== 'guest' && post.author.role !== 'member' && (
                <YaksaRoleBadge role={post.author.role} size="sm" showLabel={false} />
              )}
            </span>
            <span>{formatRelativeTime(post.createdAt)}</span>
            <span>조회 {post.viewCount}</span>
            {post.likeCount > 0 && (
              <span style={{ color: 'var(--yaksa-critical)' }}>♥ {post.likeCount}</span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

// Loading State
function PostListLoading() {
  return (
    <div className="divide-y animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
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

export default YaksaForumPostList;

/**
 * ForumListPage
 *
 * 포럼 게시글 목록 페이지
 * - 조직별 필터링
 * - 카테고리별 필터링
 * - 검색 기능
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { useOrganization } from '@/context';
import { PageHeader, Pagination, EmptyState } from '@/components/common';

// 게시글 타입
interface ForumPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  author?: {
    id: string;
    username: string;
    name?: string;
  };
  viewCount: number;
  commentCount: number;
  likeCount: number;
  isPinned: boolean;
  isNotice: boolean;
  status: string;
  createdAt: string;
  publishedAt?: string;
  tags?: string[];
}

// 카테고리 타입
interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
  isActive: boolean;
}

export function ForumListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { organization, getOrganizationId } = useOrganization();

  // 상태
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1,
    totalCount: 0,
  });

  // URL 파라미터
  const categorySlug = searchParams.get('category');
  const searchQuery = searchParams.get('q') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sort') || 'latest';

  // 카테고리 로드
  const loadCategories = useCallback(async () => {
    try {
      const orgId = getOrganizationId();
      const params = new URLSearchParams();
      if (orgId) params.append('organizationId', orgId);

      const response = await authClient.api.get(`/forum/categories?${params}`);
      setCategories(response.data || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, [getOrganizationId]);

  // 게시글 로드
  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const orgId = getOrganizationId();
      const params = new URLSearchParams();

      if (orgId) params.append('organizationId', orgId);
      if (categorySlug) {
        const category = categories.find(c => c.slug === categorySlug);
        if (category) params.append('categoryId', category.id);
      }
      if (searchQuery) params.append('query', searchQuery);
      params.append('page', currentPage.toString());
      params.append('limit', '20');
      params.append('sortBy', sortBy);

      const response = await authClient.api.get(`/forum/posts?${params}`);

      setPosts(response.data.posts || []);
      setPagination({
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
        totalPages: response.data.pagination.totalPages,
        totalCount: response.data.totalCount,
      });
    } catch (err: any) {
      console.error('Failed to load posts:', err);
      setError('게시글을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [getOrganizationId, categorySlug, searchQuery, currentPage, sortBy, categories]);

  // 초기 로드
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // 게시글 로드 (카테고리 로드 후)
  useEffect(() => {
    if (categories.length >= 0) {
      loadPosts();
    }
  }, [loadPosts, categories.length, organization?.id]);

  // 페이지 변경
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    setSearchParams(params);
  };

  // 카테고리 필터 변경
  const handleCategoryChange = (slug: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (slug) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  // 정렬 변경
  const handleSortChange = (sort: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', sort);
    params.set('page', '1');
    setSearchParams(params);
  };

  // 검색
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('search') as string;

    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  // 날짜 포맷
  const formatDate = (dateString: string): string => {
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
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="커뮤니티"
        subtitle={organization ? `${organization.name} 게시판` : '게시판'}
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '커뮤니티' },
        ]}
        actions={
          <Link
            to="/forum/write"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            글쓰기
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* 사이드바: 카테고리 */}
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">카테고리</h3>
              {isLoading && categories.length === 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-9 bg-gray-100 rounded-md animate-pulse" />
                  ))}
                </div>
              ) : (
                <ul className="space-y-1">
                  <li>
                    <button
                      type="button"
                      onClick={() => handleCategoryChange(null)}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors
                        ${!categorySlug
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      <span>전체</span>
                      <span className="text-xs text-gray-500">{pagination.totalCount}</span>
                    </button>
                  </li>
                  {categories.map((category) => (
                    <li key={category.id}>
                      <button
                        type="button"
                        onClick={() => handleCategoryChange(category.slug)}
                        className={`
                          w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors
                          ${categorySlug === category.slug
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                          }
                        `}
                      >
                        <span>{category.name}</span>
                        <span className="text-xs text-gray-500">{category.postCount}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          {/* 메인 콘텐츠 */}
          <main className="flex-1">
            {/* 검색 및 정렬 */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* 검색 */}
                <form onSubmit={handleSearch} className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      name="search"
                      defaultValue={searchQuery}
                      placeholder="검색어를 입력하세요"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </form>

                {/* 정렬 */}
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="latest">최신순</option>
                  <option value="popular">인기순</option>
                  <option value="trending">트렌딩</option>
                  <option value="oldest">오래된순</option>
                </select>
              </div>
            </div>

            {/* 게시글 목록 */}
            {isLoading && posts.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-5 w-12 bg-gray-100 rounded animate-pulse" />
                      <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <div className="h-5 bg-gray-100 rounded animate-pulse mb-2" style={{ width: `${60 + (i % 3) * 15}%` }} />
                    <div className="h-4 bg-gray-50 rounded animate-pulse w-3/4 mb-3" />
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-16 bg-gray-50 rounded animate-pulse" />
                      <div className="h-3 w-20 bg-gray-50 rounded animate-pulse" />
                      <div className="h-3 w-14 bg-gray-50 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
                <p className="text-red-800 mb-4">{error}</p>
                <button
                  type="button"
                  onClick={() => loadPosts()}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                >
                  다시 시도
                </button>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200">
                <EmptyState
                  icon="📝"
                  title="게시글이 없습니다"
                  description={searchQuery ? '검색 결과가 없습니다. 다른 검색어로 시도해보세요.' : '첫 번째 게시글을 작성해보세요.'}
                  action={
                    <Link
                      to="/forum/write"
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      글쓰기
                    </Link>
                  }
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                {posts.map((post) => (
                  <article key={post.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <Link to={`/forum/post/${post.slug}`}>
                      <div className="flex items-start gap-4">
                        {/* 메인 콘텐츠 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {/* 배지 */}
                            {post.isPinned && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                                고정
                              </span>
                            )}
                            {post.isNotice && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded">
                                공지
                              </span>
                            )}
                            {/* 카테고리 */}
                            {post.category && (
                              <span className="text-xs text-gray-500">
                                [{post.category.name}]
                              </span>
                            )}
                          </div>

                          {/* 제목 */}
                          <h3 className="text-base font-medium text-gray-900 truncate hover:text-blue-600">
                            {post.title}
                            {post.commentCount > 0 && (
                              <span className="ml-1 text-blue-600 text-sm">
                                [{post.commentCount}]
                              </span>
                            )}
                          </h3>

                          {/* 발췌 */}
                          {post.excerpt && (
                            <p className="mt-1 text-sm text-gray-600 line-clamp-1">
                              {post.excerpt}
                            </p>
                          )}

                          {/* 메타 정보 */}
                          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                            <span>{post.author?.username || post.author?.name || '익명'}</span>
                            <span>|</span>
                            <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                            <span>|</span>
                            <span>조회 {post.viewCount}</span>
                            <span>|</span>
                            <span>좋아요 {post.likeCount}</span>
                          </div>

                          {/* 태그 */}
                          {post.tags && post.tags.length > 0 && (
                            <div className="mt-2 flex items-center gap-1 flex-wrap">
                              {post.tags.slice(0, 3).map((tag, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {post.tags.length > 3 && (
                                <span className="text-xs text-gray-400">
                                  +{post.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            )}

            {/* 페이지네이션 */}
            {pagination.totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default ForumListPage;

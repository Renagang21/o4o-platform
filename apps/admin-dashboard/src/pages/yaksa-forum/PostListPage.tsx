/**
 * Yaksa Forum Post List Page
 *
 * 약사 포럼 게시글 목록 페이지
 * - 게시글 카드 그리드/리스트
 * - 카테고리 필터
 * - 검색/정렬
 * - 반응형 레이아웃
 *
 * Phase 9-B: Web Business Template 복제 검증
 * Template Reference: cosmetics-products/ProductListPage.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGInput,
  AGSelect,
  AGTag,
  AGTablePagination,
} from '@o4o/ui';
import {
  MessageSquare,
  Search,
  RefreshCw,
  Grid,
  List,
  ChevronRight,
  AlertCircle,
  Eye,
  ThumbsUp,
  Clock,
} from 'lucide-react';

/**
 * API Response Types (OpenAPI 계약 기반)
 */
interface Author {
  id: string;
  name: string;
  avatar?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount?: number;
}

type PostStatus = 'draft' | 'published' | 'archived' | 'hidden';

interface PostSummary {
  id: string;
  title: string;
  content?: string;
  excerpt?: string;
  author: Author;
  category?: Category;
  status: PostStatus;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

interface PostListResponse {
  data: PostSummary[];
  meta: PaginationMeta;
}

interface CategoryListResponse {
  data: Category[];
}

const statusLabels: Record<PostStatus, string> = {
  draft: '초안',
  published: '게시됨',
  archived: '보관됨',
  hidden: '숨김',
};

const statusColors: Record<PostStatus, 'gray' | 'green' | 'yellow' | 'red'> = {
  draft: 'gray',
  published: 'green',
  archived: 'yellow',
  hidden: 'red',
};

const PostListPage: React.FC = () => {
  const api = authClient.api;
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'viewCount' | 'likeCount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  // Fetch categories for filter dropdown
  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get<CategoryListResponse>('/api/v1/forum/categories');
      if (response.data) {
        setCategories(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, [api]);

  // Fetch posts with filters
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(itemsPerPage));
      params.set('sort', sortBy);
      params.set('order', sortOrder);

      if (categoryFilter !== 'all') {
        params.set('categoryId', categoryFilter);
      }
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (searchTerm.length >= 2) {
        params.set('q', searchTerm);
      }

      const response = await api.get<PostListResponse>(`/api/v1/forum/posts?${params.toString()}`);

      if (response.data) {
        setPosts(response.data.data);
        setTotalItems(response.data.meta.total);
        setTotalPages(response.data.meta.totalPages);
      }
    } catch (err: any) {
      console.error('Failed to fetch posts:', err);
      setError(err.message || '게시글 목록을 불러오는데 실패했습니다.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [api, currentPage, categoryFilter, statusFilter, sortBy, sortOrder, searchTerm]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, statusFilter, sortBy, sortOrder, searchTerm]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return formatDate(dateString);
  };

  if (loading && posts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <AGPageHeader
        title="Forum"
        description="약사 커뮤니티 게시판"
        icon={<MessageSquare className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <AGButton
              variant="ghost"
              size="sm"
              onClick={fetchPosts}
              iconLeft={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            >
              새로고침
            </AGButton>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Filters */}
        <AGSection>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <AGInput
                type="text"
                placeholder="게시글 검색 (2자 이상)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <AGSelect
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-40"
              >
                <option value="all">전체 카테고리</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </AGSelect>
              <AGSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PostStatus | 'all')}
                className="w-32"
              >
                <option value="all">전체 상태</option>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </AGSelect>
              <AGSelect
                value={`${sortBy}_${sortOrder}`}
                onChange={(e) => {
                  const [sort, order] = e.target.value.split('_') as ['createdAt' | 'viewCount' | 'likeCount', 'asc' | 'desc'];
                  setSortBy(sort);
                  setSortOrder(order);
                }}
                className="w-36"
              >
                <option value="createdAt_desc">최신순</option>
                <option value="createdAt_asc">오래된순</option>
                <option value="viewCount_desc">조회수순</option>
                <option value="likeCount_desc">인기순</option>
              </AGSelect>
            </div>
          </div>
        </AGSection>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            총 <span className="font-medium">{totalItems}</span>개 게시글
          </p>
        </div>

        {/* Post Grid/List */}
        <AGSection>
          {posts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>게시글이 없습니다</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.map((post) => (
                <Link key={post.id} to={`/yaksa-forum/${post.id}`}>
                  <AGCard hoverable padding="md" className="h-full">
                    <div className="flex flex-col h-full">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        {post.isPinned && (
                          <AGTag color="blue" size="sm">고정</AGTag>
                        )}
                        <AGTag color={statusColors[post.status]} size="sm">
                          {statusLabels[post.status]}
                        </AGTag>
                        {post.category && (
                          <span className="text-xs text-gray-500">{post.category.name}</span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-medium text-gray-900 line-clamp-2 mb-2 flex-1">
                        {post.title}
                      </h3>

                      {/* Excerpt */}
                      {post.excerpt && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                          {post.excerpt}
                        </p>
                      )}

                      {/* Meta */}
                      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t">
                        <span>{post.author.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {post.viewCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            {post.likeCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(post.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </AGCard>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map((post) => (
                <Link key={post.id} to={`/yaksa-forum/${post.id}`}>
                  <AGCard hoverable padding="md">
                    <div className="flex items-center gap-4">
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {post.isPinned && (
                            <AGTag color="blue" size="sm">고정</AGTag>
                          )}
                          <AGTag color={statusColors[post.status]} size="sm">
                            {statusLabels[post.status]}
                          </AGTag>
                          {post.category && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              {post.category.name}
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-gray-900 truncate">{post.title}</h3>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>{post.author.name}</span>
                          <span>{formatRelativeTime(post.createdAt)}</span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm text-gray-400 flex-shrink-0">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {post.viewCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4" />
                          {post.likeCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {post.commentCount}
                        </span>
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </AGCard>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
              <AGTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </AGSection>
      </div>
    </div>
  );
};

export default PostListPage;

import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useInfinitePosts } from '../hooks/usePosts';
import { useCategories } from '../hooks/useCategories';
import { PostType, PostStatus } from '@o4o/forum-types';
import { 
  Filter, 
  Search, 
  ChevronDown,
  FileText,
  MessageSquare,
  Eye,
  Heart,
  Calendar
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@o4o/utils';

const PostListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: categories } = useCategories({ isActive: true });
  
  const [filters, setFilters] = useState({
    type: searchParams.get('type') as PostType | null,
    categoryId: searchParams.get('category') || undefined,
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
    search: searchParams.get('search') || '',
  });

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfinitePosts({
    ...filters,
    status: PostStatus.PUBLISHED,
    limit: 20,
  });

  const posts = data?.pages.flatMap(page => page.posts) || [];

  const updateFilter = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, String(v));
    });
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-4">게시글</h1>
        
        {/* Filters */}
        <div className="bg-white rounded-lg border p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="검색어를 입력하세요..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            
            {/* Category Filter */}
            <select
              value={filters.categoryId || ''}
              onChange={(e) => updateFilter('categoryId', e.target.value || undefined)}
              className="input"
            >
              <option value="">모든 카테고리</option>
              {categories?.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            
            {/* Type Filter */}
            <select
              value={filters.type || ''}
              onChange={(e) => updateFilter('type', e.target.value || null)}
              className="input"
            >
              <option value="">모든 유형</option>
              <option value={PostType.DISCUSSION}>토론</option>
              <option value={PostType.QUESTION}>질문</option>
              <option value={PostType.ANNOUNCEMENT}>공지</option>
              <option value={PostType.POLL}>투표</option>
              <option value={PostType.GUIDE}>가이드</option>
            </select>
          </div>
          
          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">정렬:</span>
            <div className="flex gap-2">
              <button
                onClick={() => updateFilter('sortBy', 'createdAt')}
                className={cn(
                  'btn btn-sm',
                  filters.sortBy === 'createdAt' ? 'btn-primary' : 'btn-ghost'
                )}
              >
                최신순
              </button>
              <button
                onClick={() => updateFilter('sortBy', 'viewCount')}
                className={cn(
                  'btn btn-sm',
                  filters.sortBy === 'viewCount' ? 'btn-primary' : 'btn-ghost'
                )}
              >
                조회순
              </button>
              <button
                onClick={() => updateFilter('sortBy', 'likeCount')}
                className={cn(
                  'btn btn-sm',
                  filters.sortBy === 'likeCount' ? 'btn-primary' : 'btn-ghost'
                )}
              >
                인기순
              </button>
              <button
                onClick={() => updateFilter('sortBy', 'commentCount')}
                className={cn(
                  'btn btn-sm',
                  filters.sortBy === 'commentCount' ? 'btn-primary' : 'btn-ghost'
                )}
              >
                댓글순
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-lg" />
          ))
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">게시글이 없습니다.</p>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/posts/${post.slug}`}
                className="block bg-white rounded-lg border hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        'badge text-xs',
                        post.type === PostType.ANNOUNCEMENT ? 'badge-primary' : 'badge-secondary'
                      )}>
                        {post.type === PostType.DISCUSSION && '토론'}
                        {post.type === PostType.QUESTION && '질문'}
                        {post.type === PostType.ANNOUNCEMENT && '공지'}
                        {post.type === PostType.POLL && '투표'}
                        {post.type === PostType.GUIDE && '가이드'}
                      </span>
                      {post.isPinned && (
                        <span className="text-xs text-primary-600 font-medium">📌 고정됨</span>
                      )}
                      {post.category && (
                        <span className="text-xs text-gray-500">
                          {post.category.name}
                        </span>
                      )}
                    </div>
                    
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
                      {post.title}
                    </h2>
                    
                    {post.excerpt && (
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                    
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex gap-2 mb-3">
                        {post.tags.map(tag => (
                          <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="font-medium">{post.authorName}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {post.viewCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {post.commentCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {post.likeCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDistanceToNow(new Date(post.createdAt), { 
                          addSuffix: true,
                          locale: ko 
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            
            {/* Load More */}
            {hasNextPage && (
              <div className="text-center py-4">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="btn btn-secondary"
                >
                  {isFetchingNextPage ? '로딩 중...' : '더 보기'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PostListPage;
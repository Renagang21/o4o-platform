/**
 * Forum List Page
 * =============================================================================
 * Displays list of forum threads.
 * Demonstrates Forum API integration via authClient.
 * =============================================================================
 */

import { Link, useSearchParams } from 'react-router-dom';
import { useThreads, useCategories } from '../hooks/useForumData';
import { useAuth } from '../stores/AuthContext';

export function ForumListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const category = searchParams.get('category') || undefined;

  const { threads, pagination, isLoading, error } = useThreads({ page, category });
  const { categories } = useCategories();
  const { isAuthenticated } = useAuth();

  const handleCategoryChange = (newCategory: string) => {
    if (newCategory) {
      setSearchParams({ category: newCategory, page: '1' });
    } else {
      setSearchParams({});
    }
  };

  const handlePageChange = (newPage: number) => {
    const params: Record<string, string> = { page: newPage.toString() };
    if (category) params.category = category;
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">포럼</h1>

        {isAuthenticated && (
          <Link
            to="/forum/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            새 글 작성
          </Link>
        )}
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">카테고리:</span>
          <button
            onClick={() => handleCategoryChange('')}
            className={`px-3 py-1 rounded-full text-sm ${
              !category
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-3 py-1 rounded-full text-sm ${
                category === cat.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Thread List */}
      <div className="bg-white rounded-lg shadow divide-y">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : threads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">게시글이 없습니다.</div>
        ) : (
          threads.map((thread) => (
            <Link
              key={thread.id}
              to={`/forum/${thread.id}`}
              className="block p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {thread.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {thread.authorName} • {new Date(thread.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>조회 {thread.viewCount}</span>
                  <span>댓글 {thread.replyCount}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="px-4 py-2 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
          >
            이전
          </button>
          <span className="px-4 py-2">
            {page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= pagination.totalPages}
            className="px-4 py-2 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
          >
            다음
          </button>
        </div>
      )}

      {/* Login prompt for non-authenticated users */}
      {!isAuthenticated && (
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <p className="text-blue-700">
            <Link to="/login" className="font-medium hover:underline">
              로그인
            </Link>
            하시면 새 글을 작성할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}

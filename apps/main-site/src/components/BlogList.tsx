import { useState, FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: Record<string, unknown>;
  author?: {
    name: string;
    avatar?: string;
  };
  categoryId?: string;
  category?: {
    name: string;
    slug: string;
  };
  featuredImage?: string;
  createdAt: string;
  updatedAt: string;
}

interface BlogListProps {
  postsPerPage?: number;
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.neture.co.kr/api',
});

const fetchPosts = async (page: number, limit: number): Promise<{ posts: Post[]; total: number }> => {
  const { data } = await apiClient.get('/posts', {
    params: {
      page,
      limit,
      status: 'published',
      orderBy: 'createdAt',
      order: 'DESC'
    }
  });
  return {
    posts: data.data || [],
    total: data.total || 0
  };
};

const BlogList: FC<BlogListProps> = ({ postsPerPage = 10 }) => {
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['posts', currentPage, postsPerPage],
    queryFn: () => fetchPosts(currentPage, postsPerPage),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">글을 불러올 수 없습니다</h2>
          <p className="text-gray-600">잠시 후 다시 시도해주세요.</p>
        </div>
      </div>
    );
  }

  const { posts = [], total = 0 } = data || {};
  const totalPages = Math.ceil(total / postsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">블로그</h1>
          <p className="text-xl text-gray-600">최신 소식과 유용한 정보를 확인하세요</p>
        </header>

        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">아직 작성된 글이 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="space-y-8">
              {posts.map((post: any) => (
                <article key={post.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <Link to={`/blog/${post.slug}`} className="block p-6">
                    <div className="flex items-start space-x-6">
                      {post.featuredImage && (
                        <div className="flex-shrink-0">
                          <img
                            src={post.featuredImage}
                            alt={post.title}
                            className="w-48 h-32 object-cover rounded-lg"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                          {post.category && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {post.category.name}
                            </span>
                          )}
                          <time>
                            {formatDistanceToNow(new Date(post.createdAt), {
                              addSuffix: true,
                              locale: ko
                            })}
                          </time>
                          {post.author && (
                            <span>by {post.author.name}</span>
                          )}
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                          {post.title}
                        </h2>
                        {post.excerpt && (
                          <p className="text-gray-600 line-clamp-2">{post.excerpt}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>

            {totalPages > 1 && (
              <nav className="mt-12 flex justify-center">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    이전
                  </button>
                  
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 2 && page <= currentPage + 2)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-4 py-2 border rounded-md ${
                            currentPage === page
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 3 ||
                      page === currentPage + 3
                    ) {
                      return <span key={page} className="px-2">...</span>;
                    }
                    return null;
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    다음
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BlogList;
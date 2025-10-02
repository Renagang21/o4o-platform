import { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

interface BlogListProps {
  postsPerPage?: number;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    name: string;
  };
}

const BlogList: FC<BlogListProps> = ({ postsPerPage = 10 }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['posts', postsPerPage],
    queryFn: async () => {
      const response = await apiClient.get('/posts', {
        params: { limit: postsPerPage }
      });
      return response.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">게시물을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            게시물을 불러올 수 없습니다
          </h2>
          <p className="text-gray-600">잠시 후 다시 시도해 주세요.</p>
        </div>
      </div>
    );
  }

  const posts = data?.data || [];

  if (posts.length === 0) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            게시물이 없습니다
          </h2>
          <p className="text-gray-600">아직 게시된 글이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">최신 글</h1>
      <div className="space-y-8">
        {posts.map((post: Post) => (
          <article key={post.id} className="border-b border-gray-200 pb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              <a href={`/posts/${post.slug}`} className="hover:text-blue-600">
                {post.title}
              </a>
            </h2>
            {post.excerpt && (
              <p className="text-gray-600 mb-4">{post.excerpt}</p>
            )}
            <div className="flex items-center text-sm text-gray-500">
              {post.author && (
                <span className="mr-4">작성자: {post.author.name}</span>
              )}
              <time dateTime={post.createdAt}>
                {new Date(post.createdAt).toLocaleDateString('ko-KR')}
              </time>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default BlogList;
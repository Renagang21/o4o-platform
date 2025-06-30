/**
 * [recent-posts] 숏코드 컴포넌트
 * Pages API와 연동하여 최근 콘텐츠 렌더링
 */

import React, { useState, useEffect } from 'react';
import { ShortcodeRendererProps } from '../../lib/shortcode/renderer';

interface Page {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  publishedAt: string;
  author: {
    name: string;
  };
  type: string;
  status: string;
}

const RecentPostsShortcode: React.FC<ShortcodeRendererProps> = ({
  shortcode,
  apiClient,
  editorMode = false
}) => {
  const [posts, setPosts] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    count = 5,
    category = '',
    type = 'post',
    show_excerpt = true,
    show_author = true,
    show_date = true,
    order = 'desc',
    className = ''
  } = shortcode.attributes;

  useEffect(() => {
    if (!apiClient) {
      setError('API client is required');
      setLoading(false);
      return;
    }

    loadRecentPosts();
  }, [apiClient, count, category, type, order]);

  const loadRecentPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('limit', count.toString());
      params.append('status', 'published');
      if (type) params.append('type', type);
      if (category) params.append('category', category);
      params.append('orderBy', 'publishedAt');
      params.append('order', order);

      const response = await apiClient.get(`/admin/pages?${params.toString()}`);
      
      if (response.data.success) {
        setPosts(response.data.data);
      } else {
        setError('Failed to load posts');
      }
    } catch (err) {
      console.error('Error loading recent posts:', err);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const truncateExcerpt = (text: string, maxLength: number = 150): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  if (loading) {
    const skeletonItems = Array.from({ length: Number(count) }, (_, i) => (
      <article key={i} className="recent-post-skeleton animate-pulse">
        <div className="bg-gray-200 h-6 rounded mb-2"></div>
        <div className="bg-gray-200 h-4 rounded mb-1 w-3/4"></div>
        <div className="bg-gray-200 h-4 rounded mb-3 w-1/2"></div>
        <div className="bg-gray-200 h-3 rounded mb-1"></div>
        <div className="bg-gray-200 h-3 rounded w-4/5"></div>
      </article>
    ));

    return (
      <div className={`recent-posts-shortcode loading ${className}`}>
        <div className="space-y-6">
          {skeletonItems}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`recent-posts-shortcode error ${className}`}>
        <div className="recent-posts-error bg-red-50 border border-red-200 rounded p-4 text-center">
          <svg className="w-8 h-8 text-red-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-red-600 text-sm">{error}</p>
          {editorMode && (
            <p className="text-xs text-gray-500 mt-1">Type: {type}, Category: {category || 'All'}</p>
          )}
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={`recent-posts-shortcode empty ${className}`}>
        <div className="recent-posts-empty bg-gray-50 border border-gray-200 rounded p-6 text-center">
          <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
          </svg>
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Posts Found</h3>
          <p className="text-gray-500">No posts match the specified criteria.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`recent-posts-shortcode ${editorMode ? 'editor-mode' : ''} ${className}`}>
      <div className="recent-posts-list space-y-6">
        {posts.map((post) => (
          <article
            key={post.id}
            className="recent-post bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
          >
            {/* Post Header */}
            <header className="post-header mb-3">
              <h3 className="post-title text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                <a href={`/${post.slug}`}>
                  {post.title}
                </a>
              </h3>
              
              {(show_date || show_author) && (
                <div className="post-meta flex items-center text-sm text-gray-500 space-x-4">
                  {show_date && post.publishedAt && (
                    <time dateTime={post.publishedAt} className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(post.publishedAt)}
                    </time>
                  )}
                  
                  {show_author && post.author && (
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {post.author.name}
                    </span>
                  )}
                </div>
              )}
            </header>

            {/* Post Excerpt */}
            {show_excerpt && post.excerpt && (
              <div className="post-excerpt">
                <p className="text-gray-700 line-height-relaxed">
                  {truncateExcerpt(post.excerpt)}
                </p>
              </div>
            )}

            {/* Read More Link */}
            <footer className="post-footer mt-4">
              <a
                href={`/${post.slug}`}
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                Read More
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </footer>
          </article>
        ))}
      </div>
      
      {editorMode && (
        <div className="shortcode-editor-overlay">
          <div className="shortcode-info bg-blue-500 text-white text-xs px-2 py-1 rounded">
            Recent Posts: {posts.length} items ({type})
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentPostsShortcode;
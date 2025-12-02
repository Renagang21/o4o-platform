import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User } from 'lucide-react';
import { API_BASE_URL } from '../../../config/api';

interface Post {
  id: number;
  title: string;
  excerpt?: string;
  slug: string;
  date: string;
  author?: string;
  featuredImage?: string;
}

interface RecentPostsWidgetProps {
  data?: {
    title?: string;
    postCount?: number;
    showDate?: boolean;
    showExcerpt?: boolean;
    showThumbnail?: boolean;
    categoryId?: number;
    customClass?: string;
  };
}

export const RecentPostsWidget: React.FC<RecentPostsWidgetProps> = ({ data = {} }) => {
  const {
    title = 'Recent Posts',
    postCount = 5,
    showDate = true,
    showExcerpt = false,
    showThumbnail = true,
    categoryId,
    customClass = ''
  } = data;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const params = new URLSearchParams({
          limit: postCount.toString(),
          ...(categoryId && { category: categoryId.toString() })
        });

        const response = await fetch(`${API_BASE_URL}/posts?${params}`);
        
        if (response.ok) {
          const data = await response.json();
          setPosts(data.posts || []);
        }
      } catch (error) {
        console.error('Failed to fetch recent posts:', error);
        // Mock data for fallback
        setPosts([
          {
            id: 1,
            title: 'Sample Blog Post Title',
            excerpt: 'This is a brief excerpt of the blog post content...',
            slug: 'sample-blog-post',
            date: new Date().toISOString(),
            author: 'John Doe'
          },
          {
            id: 2,
            title: 'Another Blog Post',
            excerpt: 'Another interesting excerpt from our blog...',
            slug: 'another-blog-post',
            date: new Date(Date.now() - 86400000).toISOString(),
            author: 'Jane Smith'
          }
        ].slice(0, postCount));
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [postCount, categoryId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={`footer-widget footer-widget--recent-posts ${customClass}`}>
        {title && <h3 className="footer-widget__title">{title}</h3>}
        <div className="footer-widget__loading">Loading posts...</div>
      </div>
    );
  }

  return (
    <div className={`footer-widget footer-widget--recent-posts ${customClass}`}>
      {title && (
        <h3 className="footer-widget__title">{title}</h3>
      )}
      <ul className="footer-posts">
        {posts.map(post => (
          <li key={post.id} className="footer-posts__item">
            <article className="footer-post">
              {showThumbnail && post.featuredImage && (
                <Link to={`/post/${post.slug}`} className="footer-post__thumbnail">
                  <img src={post.featuredImage} alt={post.title} />
                </Link>
              )}
              <div className="footer-post__content">
                <Link to={`/post/${post.slug}`} className="footer-post__title">
                  {post.title}
                </Link>
                {showDate && (
                  <div className="footer-post__meta">
                    <Calendar size={12} />
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                  </div>
                )}
                {showExcerpt && post.excerpt && (
                  <p className="footer-post__excerpt">{post.excerpt}</p>
                )}
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
};
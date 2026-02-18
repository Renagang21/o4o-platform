/**
 * StoreBlogPostPage — Public Blog Post Detail
 *
 * WO-STORE-BLOG-CHANNEL-V1
 *
 * 경로: /store/:slug/blog/:postSlug
 * 공개 페이지 — 인증 불필요
 * SEO-friendly slug 기반 게시글 상세 뷰
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchBlogPost, type BlogPost } from '../../api/blog';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** WO-KPA-STORE-CHANNEL-INTEGRATION-V1: service prop for KPA reuse */
export function StoreBlogPostPage({ service }: { service?: string }) {
  const { slug, postSlug } = useParams<{ slug: string; postSlug: string }>();
  const storePrefix = service === 'kpa' ? '/kpa/store' : '/store';
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !postSlug) return;
    setLoading(true);
    fetchBlogPost(slug, postSlug, service)
      .then((data) => {
        setPost(data);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, postSlug]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
        불러오는 중...
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '48px 16px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '20px', color: '#1e293b', marginBottom: '8px' }}>
          게시글을 찾을 수 없습니다
        </h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>{error || '존재하지 않는 게시글입니다.'}</p>
        <Link
          to={`${storePrefix}/${slug}/blog`}
          style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px' }}
        >
          블로그 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 16px' }}>
      {/* Back link */}
      <Link
        to={`${storePrefix}/${slug}/blog`}
        style={{ display: 'inline-flex', alignItems: 'center', color: '#3b82f6', textDecoration: 'none', fontSize: '14px', marginBottom: '24px' }}
      >
        &larr; 블로그 목록
      </Link>

      {/* Title */}
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b', marginBottom: '12px', lineHeight: 1.4 }}>
        {post.title}
      </h1>

      {/* Date */}
      <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '32px' }}>
        {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}
      </div>

      {/* Content */}
      <div
        style={{
          fontSize: '16px',
          lineHeight: 1.8,
          color: '#334155',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {post.content}
      </div>
    </div>
  );
}

export default StoreBlogPostPage;

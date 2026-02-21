/**
 * StoreBlogPage — Public Blog List
 *
 * WO-STORE-BLOG-CHANNEL-V1
 *
 * 경로: /store/:slug/blog
 * 공개 페이지 — 인증 불필요
 * 발행된 게시글 목록을 카드 형태로 표시
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchBlogPosts, type BlogPost } from '../../api/blog';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** WO-STORE-SLUG-UNIFICATION-V1: unified URL */
export function StoreBlogPage() {
  const { slug } = useParams<{ slug: string }>();
  const storePrefix = '/store';
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchBlogPosts(slug, { page, limit: 10 })
      .then((res) => {
        setPosts(res.data);
        setTotalPages(res.meta.totalPages);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, page]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
          블로그
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b' }}>
          매장 소식과 유용한 정보를 확인하세요.
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '14px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
          불러오는 중...
        </div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: '#94a3b8', fontSize: '15px' }}>
            아직 게시된 글이 없습니다.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {posts.map((post) => (
            <Link
              key={post.id}
              to={`${storePrefix}/${slug}/blog/${post.slug}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <article
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  transition: 'border-color 0.15s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                onMouseOut={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
              >
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px', lineHeight: 1.6 }}>
                    {post.excerpt.length > 150 ? post.excerpt.substring(0, 150) + '...' : post.excerpt}
                  </p>
                )}
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                  {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}
                </span>
              </article>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '32px' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ ...paginationBtn, opacity: page === 1 ? 0.4 : 1 }}
          >
            이전
          </button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: '#64748b', padding: '0 12px' }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ ...paginationBtn, opacity: page === totalPages ? 0.4 : 1 }}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

const paginationBtn: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  backgroundColor: '#fff',
  fontSize: '14px',
  cursor: 'pointer',
  color: '#334155',
};

export default StoreBlogPage;

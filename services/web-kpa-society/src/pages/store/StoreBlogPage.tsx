/**
 * StoreBlogPage — Public Blog List
 *
 * WO-STORE-BLOG-CHANNEL-V1
 * WO-STORE-SLUG-UNIFICATION-V1: unified URL
 * WO-O4O-KPA-STORE-BLOG-PUBLIC-HEADER-V1: 매장 identity 헤더 + 템플릿 2종 + SEO meta
 *
 * 경로: /store/:slug/blog
 * 공개 페이지 — 인증 불필요
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { fetchBlogPosts, fetchPublicStoreInfo, type BlogPost, type PublicStoreInfo } from '../../api/blog';
import { BlogPublicHeader } from './blog/BlogPublicHeader';
import { BlogList, resolveBlogTemplateKey } from './blog/blogTemplates';
import { useBlogSeo } from './blog/useBlogSeo';

export function StoreBlogPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const templateKey = resolveBlogTemplateKey(searchParams.get('template'));

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [storeInfo, setStoreInfo] = useState<PublicStoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      fetchBlogPosts(slug, { page, limit: 10 }),
      fetchPublicStoreInfo(slug).catch(() => null),
    ])
      .then(([list, info]) => {
        setPosts(list.data);
        setTotalPages(list.meta.totalPages);
        setStoreInfo(info);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, page]);

  // SEO meta — 매장 정보 로드 후 동기화
  const seoTitle = storeInfo ? `${storeInfo.name} 칼럼` : '블로그';
  const seoDescription = storeInfo?.description || '전문가가 직접 작성하는 매장 콘텐츠 채널입니다.';
  const seoUrl = typeof window !== 'undefined' && slug ? `${window.location.origin}/store/${slug}/blog` : null;
  useBlogSeo({
    title: seoTitle,
    description: seoDescription,
    ogImage: storeInfo?.hero_image || storeInfo?.logo || null,
    url: seoUrl,
  });

  return (
    <div style={{ minHeight: '100vh', background: '#fafbfc' }}>
      <BlogPublicHeader storeSlug={slug || ''} storeInfo={storeInfo} />

      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '0 16px 64px' }}>
        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              color: '#dc2626',
              fontSize: 14,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
            불러오는 중...
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: '#94a3b8', fontSize: 15 }}>아직 게시된 글이 없습니다.</p>
          </div>
        ) : (
          <BlogList template={templateKey} storeSlug={slug || ''} posts={posts} />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              marginTop: 40,
              paddingTop: 24,
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ ...paginationBtn, opacity: page === 1 ? 0.4 : 1 }}
            >
              이전
            </button>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: 14,
                color: '#64748b',
                padding: '0 12px',
              }}
            >
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
      </main>
    </div>
  );
}

const paginationBtn: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  backgroundColor: '#fff',
  fontSize: 14,
  cursor: 'pointer',
  color: '#334155',
};

export default StoreBlogPage;

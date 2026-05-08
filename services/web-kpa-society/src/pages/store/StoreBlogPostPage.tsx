/**
 * StoreBlogPostPage — Public Blog Post Detail
 *
 * WO-STORE-BLOG-CHANNEL-V1
 * WO-STORE-SLUG-UNIFICATION-V1: unified URL
 * WO-O4O-KPA-STORE-BLOG-PUBLIC-HEADER-V1: 매장 identity 헤더 + 템플릿 2종 + SEO meta
 *
 * 경로: /store/:slug/blog/:postSlug
 * 공개 페이지 — 인증 불필요
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { fetchBlogPost, fetchPublicStoreInfo, type BlogPost, type PublicStoreInfo } from '../../api/blog';
import { BlogPublicHeader } from './blog/BlogPublicHeader';
import { BlogPost as BlogPostTemplate, resolveBlogTemplateKey } from './blog/blogTemplates';
import { useBlogSeo } from './blog/useBlogSeo';

export function StoreBlogPostPage() {
  const { slug, postSlug } = useParams<{ slug: string; postSlug: string }>();
  const [searchParams] = useSearchParams();
  const templateKey = resolveBlogTemplateKey(searchParams.get('template'));

  const [post, setPost] = useState<BlogPost | null>(null);
  const [storeInfo, setStoreInfo] = useState<PublicStoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !postSlug) return;
    setLoading(true);
    Promise.all([
      fetchBlogPost(slug, postSlug),
      fetchPublicStoreInfo(slug).catch(() => null),
    ])
      .then(([data, info]) => {
        setPost(data);
        setStoreInfo(info);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, postSlug]);

  // SEO meta — 게시글 + 매장 정보 결합
  const seoTitle = post && storeInfo
    ? `${post.title} | ${storeInfo.name}`
    : post?.title || null;
  const seoDescription = post?.excerpt || (post?.content ? post.content.slice(0, 160) : null) || storeInfo?.description || null;
  const seoUrl = typeof window !== 'undefined' && slug && postSlug
    ? `${window.location.origin}/store/${slug}/blog/${postSlug}`
    : null;
  useBlogSeo({
    title: seoTitle,
    description: seoDescription,
    ogImage: storeInfo?.hero_image || storeInfo?.logo || null,
    url: seoUrl,
  });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafbfc' }}>
        <BlogPublicHeader storeSlug={slug || ''} storeInfo={storeInfo} compact />
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
          불러오는 중...
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafbfc' }}>
        <BlogPublicHeader storeSlug={slug || ''} storeInfo={storeInfo} compact />
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 16px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, color: '#1e293b', marginBottom: 8 }}>
            게시글을 찾을 수 없습니다
          </h2>
          <p style={{ color: '#64748b', marginBottom: 24 }}>{error || '존재하지 않는 게시글입니다.'}</p>
          <Link
            to={`/store/${slug}/blog`}
            style={{ color: '#3b82f6', textDecoration: 'none', fontSize: 14 }}
          >
            블로그 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafbfc' }}>
      <BlogPublicHeader storeSlug={slug || ''} storeInfo={storeInfo} compact />

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '0 16px 64px' }}>
        {/* Back link */}
        <Link
          to={`/store/${slug}/blog`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            color: '#64748b',
            textDecoration: 'none',
            fontSize: 13,
            marginBottom: 24,
          }}
        >
          ← 블로그 목록
        </Link>

        <BlogPostTemplate template={templateKey} post={post} />
      </main>
    </div>
  );
}

export default StoreBlogPostPage;

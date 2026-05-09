/**
 * StoreBlogPostPage — Public Blog Post Detail
 *
 * WO-STORE-BLOG-CHANNEL-V1
 * WO-STORE-SLUG-UNIFICATION-V1: unified URL
 * WO-O4O-KPA-STORE-BLOG-PUBLIC-HEADER-V1: 매장 identity 헤더 + 템플릿 2종 + SEO meta
 * WO-O4O-KPA-STORE-BLOG-META-V1: Blog settings (이름·소개·heroImage·defaultTemplate) 연결
 *
 * 경로: /store/:slug/blog/:postSlug
 * 공개 페이지 — 인증 불필요
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
// WO-O4O-BLOG-UI-PARTIAL-EXTRACT-V1: Blog public layer 는 @o4o/shared-space-ui 로 이전됨
import {
  fetchBlogPost,
  fetchPublicStoreInfo,
  fetchPublicBlogSettings,
  BlogPublicHeader,
  BlogPostTemplate,
  pickBlogTemplate,
  useBlogSeo,
  type BlogPost,
  type PublicStoreInfo,
  type PublicBlogSettings,
} from '@o4o/shared-space-ui';

export function StoreBlogPostPage() {
  const { slug, postSlug } = useParams<{ slug: string; postSlug: string }>();
  const [searchParams] = useSearchParams();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [storeInfo, setStoreInfo] = useState<PublicStoreInfo | null>(null);
  // WO-O4O-KPA-STORE-BLOG-META-V1
  const [blogSettings, setBlogSettings] = useState<PublicBlogSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 우선순위: query > settings.defaultTemplate > 'professional'
  const templateKey = pickBlogTemplate(searchParams.get('template'), blogSettings?.defaultTemplate);

  useEffect(() => {
    if (!slug || !postSlug) return;
    setLoading(true);
    Promise.all([
      fetchBlogPost(slug, postSlug),
      fetchPublicStoreInfo(slug).catch(() => null),
      fetchPublicBlogSettings(slug).catch(() => null),
    ])
      .then(([data, info, settings]) => {
        setPost(data);
        setStoreInfo(info);
        setBlogSettings(settings);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, postSlug]);

  // SEO meta — settings → store info fallback
  const blogName = blogSettings?.blogName?.trim() || storeInfo?.name?.trim() || null;
  const seoTitle = post && blogName
    ? `${post.title} | ${blogName}`
    : post?.title || null;
  const stripTags = (s: string | null | undefined): string =>
    (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const rawDesc = post?.excerpt || post?.content || blogSettings?.description || storeInfo?.description || '';
  const cleanDesc = stripTags(rawDesc).slice(0, 160);
  const seoDescription = cleanDesc || null;
  const seoUrl = typeof window !== 'undefined' && slug && postSlug
    ? `${window.location.origin}/store/${slug}/blog/${postSlug}`
    : null;
  useBlogSeo({
    title: seoTitle,
    description: seoDescription,
    ogImage: blogSettings?.heroImage || storeInfo?.hero_image || storeInfo?.logo || null,
    url: seoUrl,
  });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafbfc' }}>
        <BlogPublicHeader storeSlug={slug || ''} storeInfo={storeInfo} blogSettings={blogSettings} compact />
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
          불러오는 중...
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafbfc' }}>
        <BlogPublicHeader storeSlug={slug || ''} storeInfo={storeInfo} blogSettings={blogSettings} compact />
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
      <BlogPublicHeader storeSlug={slug || ''} storeInfo={storeInfo} blogSettings={blogSettings} compact />

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

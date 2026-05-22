/**
 * StoreBlogPostPage — Public Blog Post Detail (K-Cosmetics)
 *
 * WO-O4O-KCOS-STORE-EXECUTION-CANONICAL-ALIGNMENT-V1
 *
 * 경로: /store/:slug/blog/:postSlug
 * 공개 페이지 — 인증 불필요.
 *
 * Pure @o4o/shared-space-ui — service-agnostic.
 * Canonical pattern: identical to GlycoPharm StoreBlogPostPage.
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
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

export default function StoreBlogPostPage() {
  const { slug, postSlug } = useParams<{ slug: string; postSlug: string }>();
  const [searchParams] = useSearchParams();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [storeInfo, setStoreInfo] = useState<PublicStoreInfo | null>(null);
  const [blogSettings, setBlogSettings] = useState<PublicBlogSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const blogName = blogSettings?.blogName?.trim() || storeInfo?.name?.trim() || null;
  const seoTitle = post && blogName ? `${post.title} | ${blogName}` : post?.title || null;
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

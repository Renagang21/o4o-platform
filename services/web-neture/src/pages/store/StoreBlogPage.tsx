/**
 * StoreBlogPage — Public Blog Post Detail (Neture canonical align)
 *
 * WO-O4O-STORE-BLOG-SYSTEM-V1
 * WO-O4O-NETURE-BLOG-CANONICAL-ALIGN-V1: KPA canonical 패턴 정렬
 *   - BlogPublicHeader (compact) / blogTemplates(Pro+Modern) / useBlogSeo / BlogContentBody 적용
 *   - Neture override: route param 이름이 `storeSlug` (KPA는 `slug`)
 *
 * 경로: /store/:storeSlug/blog/:postSlug
 * 공개 페이지 — 인증 불필요
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  fetchBlogPost,
  fetchPublicStoreInfo,
  fetchPublicBlogSettings,
  type BlogPost,
  type PublicStoreInfo,
  type PublicBlogSettings,
} from '../../api/blog';
import { BlogPublicHeader } from './blog/BlogPublicHeader';
import { BlogPost as BlogPostTemplate, pickBlogTemplate } from './blog/blogTemplates';
import { useBlogSeo } from './blog/useBlogSeo';

export default function StoreBlogPage() {
  const { storeSlug, postSlug } = useParams<{ storeSlug: string; postSlug: string }>();
  const [searchParams] = useSearchParams();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [storeInfo, setStoreInfo] = useState<PublicStoreInfo | null>(null);
  const [blogSettings, setBlogSettings] = useState<PublicBlogSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const templateKey = pickBlogTemplate(searchParams.get('template'), blogSettings?.defaultTemplate);

  useEffect(() => {
    if (!storeSlug || !postSlug) return;
    setLoading(true);
    Promise.all([
      fetchBlogPost(storeSlug, postSlug),
      fetchPublicStoreInfo(storeSlug).catch(() => null),
      fetchPublicBlogSettings(storeSlug).catch(() => null),
    ])
      .then(([data, info, settings]) => {
        setPost(data);
        setStoreInfo(info);
        setBlogSettings(settings);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [storeSlug, postSlug]);

  const blogName = blogSettings?.blogName?.trim() || storeInfo?.name?.trim() || null;
  const seoTitle = post && blogName ? `${post.title} | ${blogName}` : post?.title || null;
  const stripTags = (s: string | null | undefined): string =>
    (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const rawDesc = post?.excerpt || post?.content || blogSettings?.description || storeInfo?.description || '';
  const cleanDesc = stripTags(rawDesc).slice(0, 160);
  const seoDescription = cleanDesc || null;
  const seoUrl = typeof window !== 'undefined' && storeSlug && postSlug
    ? `${window.location.origin}/store/${storeSlug}/blog/${postSlug}`
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
        <BlogPublicHeader storeSlug={storeSlug || ''} storeInfo={storeInfo} blogSettings={blogSettings} compact />
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
          불러오는 중...
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafbfc' }}>
        <BlogPublicHeader storeSlug={storeSlug || ''} storeInfo={storeInfo} blogSettings={blogSettings} compact />
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 16px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, color: '#1e293b', marginBottom: 8 }}>
            게시글을 찾을 수 없습니다
          </h2>
          <p style={{ color: '#64748b', marginBottom: 24 }}>{error || '존재하지 않는 게시글입니다.'}</p>
          <Link
            to={`/store/${storeSlug}/blog`}
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
      <BlogPublicHeader storeSlug={storeSlug || ''} storeInfo={storeInfo} blogSettings={blogSettings} compact />

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '0 16px 64px' }}>
        <Link
          to={`/store/${storeSlug}/blog`}
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

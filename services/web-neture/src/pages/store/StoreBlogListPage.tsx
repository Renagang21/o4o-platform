/**
 * StoreBlogListPage — Public Blog List (Neture canonical align)
 *
 * WO-O4O-STORE-BLOG-SYSTEM-V1
 * WO-O4O-NETURE-BLOG-CANONICAL-ALIGN-V1: KPA canonical 패턴 정렬
 *   - BlogPublicHeader / blogTemplates(Professional+Modern) / useBlogSeo 적용
 *   - Neture override: route param 이름이 `storeSlug` (KPA는 `slug`)
 *
 * 경로: /store/:storeSlug/blog
 * 공개 페이지 — 인증 불필요 (unified-store-public 경유)
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
// WO-O4O-BLOG-UI-PARTIAL-EXTRACT-V1: Blog public layer 는 @o4o/shared-space-ui 로 이전됨
import {
  fetchBlogPosts,
  fetchPublicStoreInfo,
  fetchPublicBlogSettings,
  BlogPublicHeader,
  BlogList,
  pickBlogTemplate,
  useBlogSeo,
  type BlogPost,
  type PublicStoreInfo,
  type PublicBlogSettings,
} from '@o4o/shared-space-ui';

export default function StoreBlogListPage() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const [searchParams] = useSearchParams();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [storeInfo, setStoreInfo] = useState<PublicStoreInfo | null>(null);
  const [blogSettings, setBlogSettings] = useState<PublicBlogSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const templateKey = pickBlogTemplate(searchParams.get('template'), blogSettings?.defaultTemplate);

  useEffect(() => {
    if (!storeSlug) return;
    setLoading(true);
    Promise.all([
      fetchBlogPosts(storeSlug, { page, limit: 10 }),
      fetchPublicStoreInfo(storeSlug).catch(() => null),
      fetchPublicBlogSettings(storeSlug).catch(() => null),
    ])
      .then(([list, info, settings]) => {
        setPosts(list.data);
        setTotalPages(list.meta.totalPages);
        setStoreInfo(info);
        setBlogSettings(settings);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [storeSlug, page]);

  const seoBlogName = blogSettings?.blogName?.trim() || storeInfo?.name?.trim() || null;
  const seoTitle = seoBlogName ? `${seoBlogName} 칼럼` : '블로그';
  const seoDescription =
    blogSettings?.description?.trim() || storeInfo?.description?.trim() ||
    '전문가가 직접 작성하는 매장 콘텐츠 채널입니다.';
  const seoUrl = typeof window !== 'undefined' && storeSlug ? `${window.location.origin}/store/${storeSlug}/blog` : null;
  useBlogSeo({
    title: seoTitle,
    description: seoDescription,
    ogImage: blogSettings?.heroImage || storeInfo?.hero_image || storeInfo?.logo || null,
    url: seoUrl,
  });

  return (
    <div style={{ minHeight: '100vh', background: '#fafbfc' }}>
      <BlogPublicHeader storeSlug={storeSlug || ''} storeInfo={storeInfo} blogSettings={blogSettings} />

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
          <BlogList template={templateKey} storeSlug={storeSlug || ''} posts={posts} />
        )}

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

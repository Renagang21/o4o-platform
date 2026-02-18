/**
 * StorefrontHomePage — Public Store Home (Block-based)
 *
 * WO-STORE-TEMPLATE-PROFILE-V1
 *
 * 경로: /store/:slug
 * 공개 페이지 — 인증 불필요
 *
 * Template Profile에 따라 블록 순서/구성이 달라짐:
 * - BASIC: Hero → Featured Products → Blog Preview → Tablet 안내 → Footer
 * - COMMERCE_FOCUS: Hero → Featured Products → Categories → Blog Preview → Footer
 * - CONTENT_FOCUS: Hero → Blog Preview → About → Featured Products → Footer
 * - MINIMAL: Hero → Featured Products → Footer
 */

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

// ============================================================================
// Types
// ============================================================================

type TemplateProfile = 'BASIC' | 'COMMERCE_FOCUS' | 'CONTENT_FOCUS' | 'MINIMAL';
type BlockType = 'HERO' | 'FEATURED_PRODUCTS' | 'BLOG_PREVIEW' | 'ABOUT' | 'TABLET_NOTICE';

interface StoreData {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  hero_image?: string;
  templateProfile: TemplateProfile;
}

interface Product {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  images?: Array<{ url: string }>;
  category: string;
}

interface BlogPostPreview {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: string;
}

// ============================================================================
// Template → Block Order Mapping
// ============================================================================

const TEMPLATE_BLOCKS: Record<TemplateProfile, BlockType[]> = {
  BASIC: ['HERO', 'FEATURED_PRODUCTS', 'BLOG_PREVIEW', 'TABLET_NOTICE'],
  COMMERCE_FOCUS: ['HERO', 'FEATURED_PRODUCTS', 'BLOG_PREVIEW'],
  CONTENT_FOCUS: ['HERO', 'BLOG_PREVIEW', 'ABOUT', 'FEATURED_PRODUCTS'],
  MINIMAL: ['HERO', 'FEATURED_PRODUCTS'],
};

// ============================================================================
// API Helpers
// ============================================================================

/** WO-KPA-STORE-CHANNEL-INTEGRATION-V1: service parameter for KPA reuse */
function getApiBase(service: string = 'glycopharm'): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/${service}`;
}

async function fetchJson(url: string) {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Request failed');
  return json;
}

/** Prefix for internal links (/store or /kpa/store) */
function getStorePrefix(service: string = 'glycopharm'): string {
  return service === 'kpa' ? '/kpa/store' : '/store';
}

function getTabletPrefix(service: string = 'glycopharm'): string {
  return service === 'kpa' ? '/kpa/tablet' : '/tablet';
}

// ============================================================================
// Block Components
// ============================================================================

function HeroBlock({ store }: { store: StoreData }) {
  const bgStyle = store.hero_image
    ? {
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url(${store.hero_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined;

  return (
    <div
      style={{
        borderRadius: '12px',
        margin: '16px',
        overflow: 'hidden',
        ...bgStyle,
      }}
    >
      <div
        style={{
          padding: '32px 24px',
          color: '#fff',
          ...(store.hero_image ? {} : { background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }),
        }}
      >
        {store.logo && (
          <img
            src={store.logo}
            alt={store.name}
            style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.5)', marginBottom: '12px', objectFit: 'cover' }}
          />
        )}
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>{store.name}</h1>
        {store.description && (
          <p style={{ fontSize: '14px', opacity: 0.9, maxWidth: '400px', lineHeight: 1.6 }}>
            {store.description}
          </p>
        )}
      </div>
    </div>
  );
}

function FeaturedProductsBlock({ slug, products, storePrefix }: { slug: string; products: Product[]; storePrefix: string }) {
  const navigate = useNavigate();
  if (products.length === 0) return null;

  return (
    <div style={{ padding: '0 16px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>추천 상품</h2>
        <Link to={`${storePrefix}/${slug}/products`} style={{ fontSize: '13px', color: '#3b82f6', textDecoration: 'none' }}>
          전체보기
        </Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {products.slice(0, 4).map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`${storePrefix}/${slug}/products/${p.id}`)}
            style={{
              backgroundColor: '#fff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              textAlign: 'left',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <div style={{ aspectRatio: '1', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {p.images?.[0]?.url ? (
                <img src={p.images[0].url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '32px', color: '#cbd5e1' }}>📦</span>
              )}
            </div>
            <div style={{ padding: '10px' }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </p>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>
                {(p.sale_price || p.price).toLocaleString()}원
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function BlogPreviewBlock({ slug, posts, storePrefix }: { slug: string; posts: BlogPostPreview[]; storePrefix: string }) {
  if (posts.length === 0) return null;

  return (
    <div style={{ padding: '0 16px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>블로그</h2>
        <Link to={`${storePrefix}/${slug}/blog`} style={{ fontSize: '13px', color: '#3b82f6', textDecoration: 'none' }}>
          전체보기
        </Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {posts.slice(0, 3).map((post) => (
          <Link
            key={post.id}
            to={`${storePrefix}/${slug}/blog/${post.slug}`}
            style={{
              display: 'block',
              padding: '12px 16px',
              backgroundColor: '#fff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>{post.title}</p>
            {post.excerpt && (
              <p style={{ fontSize: '13px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {post.excerpt}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

function AboutBlock({ store }: { store: StoreData }) {
  if (!store.description) return null;

  return (
    <div style={{ padding: '0 16px', marginBottom: '24px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>매장 소개</h2>
      <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px' }}>
        <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {store.description}
        </p>
      </div>
    </div>
  );
}

function TabletNoticeBlock({ slug, tabletPrefix }: { slug: string; tabletPrefix: string }) {
  return (
    <div style={{ padding: '0 16px', marginBottom: '24px' }}>
      <Link
        to={`${tabletPrefix}/${slug}`}
        style={{
          display: 'block',
          padding: '16px',
          backgroundColor: '#eff6ff',
          borderRadius: '10px',
          border: '1px solid #bfdbfe',
          textDecoration: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>📱</span>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e40af' }}>매장 태블릿 주문</p>
            <p style={{ fontSize: '13px', color: '#3b82f6' }}>태블릿에서 바로 주문 요청하기</p>
          </div>
        </div>
      </Link>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export function StorefrontHomePage({ service }: { service?: string }) {
  const { slug } = useParams<{ slug: string }>();
  const apiBase = getApiBase(service);
  const storePrefix = getStorePrefix(service);
  const tabletPfx = getTabletPrefix(service);
  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPostPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const load = async () => {
      try {
        // Fetch store info + template profile in parallel
        const [storeRes, templateRes] = await Promise.all([
          fetchJson(`${apiBase}/stores/${encodeURIComponent(slug)}`),
          fetchJson(`${apiBase}/stores/${encodeURIComponent(slug)}/template`).catch(() => ({ data: { templateProfile: 'BASIC' } })),
        ]);

        const storeData: StoreData = {
          name: storeRes.data.name,
          slug: storeRes.data.slug || slug,
          description: storeRes.data.description,
          logo: storeRes.data.logo,
          hero_image: storeRes.data.hero_image,
          templateProfile: templateRes.data.templateProfile || 'BASIC',
        };
        setStore(storeData);

        // Fetch products and blog posts in parallel
        const blocks = TEMPLATE_BLOCKS[storeData.templateProfile] || TEMPLATE_BLOCKS.BASIC;

        const promises: Promise<void>[] = [];

        if (blocks.includes('FEATURED_PRODUCTS')) {
          promises.push(
            fetchJson(`${apiBase}/stores/${encodeURIComponent(slug)}/products/featured`)
              .then((res) => setProducts(res.data || []))
              .catch(() => setProducts([])),
          );
        }

        if (blocks.includes('BLOG_PREVIEW')) {
          promises.push(
            fetchJson(`${apiBase}/stores/${encodeURIComponent(slug)}/blog?limit=3`)
              .then((res) => setBlogPosts(res.data || []))
              .catch(() => setBlogPosts([])),
          );
        }

        await Promise.all(promises);
        setError(null);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug, apiBase]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#94a3b8', fontSize: '15px' }}>불러오는 중...</div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>매장을 찾을 수 없습니다</h2>
          <p style={{ color: '#64748b', fontSize: '14px' }}>{error || '존재하지 않는 매장입니다.'}</p>
        </div>
      </div>
    );
  }

  const blocks = TEMPLATE_BLOCKS[store.templateProfile] || TEMPLATE_BLOCKS.BASIC;

  // Block renderer
  const renderBlock = (block: BlockType) => {
    switch (block) {
      case 'HERO':
        return <HeroBlock key="hero" store={store} />;
      case 'FEATURED_PRODUCTS':
        return <FeaturedProductsBlock key="products" slug={slug!} products={products} storePrefix={storePrefix} />;
      case 'BLOG_PREVIEW':
        return <BlogPreviewBlock key="blog" slug={slug!} posts={blogPosts} storePrefix={storePrefix} />;
      case 'ABOUT':
        return <AboutBlock key="about" store={store} />;
      case 'TABLET_NOTICE':
        return <TabletNoticeBlock key="tablet" slug={slug!} tabletPrefix={tabletPfx} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 16px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {store.logo ? (
              <img src={store.logo} alt={store.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
            ) : (
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{store.name.charAt(0)}</span>
              </div>
            )}
            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '15px' }}>{store.name}</span>
          </div>
        </div>
      </header>

      {/* Content — block-based rendering */}
      <main style={{ maxWidth: '640px', margin: '0 auto' }}>
        {blocks.map(renderBlock)}
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '48px', padding: '24px 16px', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: '#94a3b8' }}>{store.name}의 스토어프론트</p>
        <p style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>Powered by O4O Platform</p>
      </footer>
    </div>
  );
}

export default StorefrontHomePage;

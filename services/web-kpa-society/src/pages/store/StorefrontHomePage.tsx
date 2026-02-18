/**
 * StorefrontHomePage — Public Store Home (Block Engine)
 *
 * WO-STORE-BLOCK-ENGINE-V1
 * WO-STORE-BLOCK-REGISTRY-V1: Registry 기반 렌더링
 * WO-STORE-ENGINE-HARDENING-V1: channels 가시성 제어
 *
 * 경로: /store/:slug
 * 공개 페이지 — 인증 불필요
 *
 * StoreBlockRegistry에서 블록 컴포넌트를 lookup하여 렌더링.
 * visibilityGuard로 채널 미활성 블록 자동 숨김.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  StoreBlockRegistry,
  type StoreBlock,
  type StoreBlockType,
  type StoreChannels,
  type BlockRenderContext,
  type StoreData,
  type Product,
  type BlogPostPreview,
} from '@o4o/ui';

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

function getSignagePrefix(service: string = 'glycopharm'): string {
  return service === 'kpa' ? '/signage' : '/signage';
}

/** 블록 배열에서 특정 타입이 enabled인지 확인 */
function isBlockEnabled(blocks: StoreBlock[], type: StoreBlockType): boolean {
  return blocks.some((b) => b.type === type && b.enabled);
}

/** 블록의 config 값 조회 */
function getBlockConfig(blocks: StoreBlock[], type: StoreBlockType): Record<string, any> {
  return blocks.find((b) => b.type === type)?.config || {};
}

// ============================================================================
// Main Page Component
// ============================================================================

export function StorefrontHomePage({ service }: { service?: string }) {
  const { slug } = useParams<{ slug: string }>();
  const apiBase = getApiBase(service);
  const storePrefix = getStorePrefix(service);
  const tabletPfx = getTabletPrefix(service);
  const signagePfx = getSignagePrefix(service);
  const [store, setStore] = useState<StoreData | null>(null);
  const [blocks, setBlocks] = useState<StoreBlock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPostPreview[]>([]);
  const [storeId, setStoreId] = useState('');
  const [channels, setChannels] = useState<StoreChannels>({ B2C: true, TABLET: true, SIGNAGE: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const load = async () => {
      try {
        // Fetch store info + layout in parallel
        const [storeRes, layoutRes] = await Promise.all([
          fetchJson(`${apiBase}/stores/${encodeURIComponent(slug)}`),
          fetchJson(`${apiBase}/stores/${encodeURIComponent(slug)}/layout`).catch(() => ({
            data: { blocks: [{ type: 'HERO', enabled: true }, { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } }] },
          })),
        ]);

        const storeData: StoreData = {
          name: storeRes.data.name,
          slug: storeRes.data.slug || slug,
          description: storeRes.data.description,
          logo: storeRes.data.logo,
          hero_image: storeRes.data.hero_image,
        };
        setStore(storeData);

        const layoutBlocks: StoreBlock[] = layoutRes.data.blocks || [];
        setBlocks(layoutBlocks);
        setStoreId(layoutRes.data.storeId || '');
        setChannels(layoutRes.data.channels || { B2C: true, TABLET: true, SIGNAGE: true });

        // Fetch data for enabled blocks
        const promises: Promise<void>[] = [];

        if (isBlockEnabled(layoutBlocks, 'PRODUCT_GRID')) {
          promises.push(
            fetchJson(`${apiBase}/stores/${encodeURIComponent(slug)}/products/featured`)
              .then((res) => setProducts(res.data || []))
              .catch(() => setProducts([])),
          );
        }

        if (isBlockEnabled(layoutBlocks, 'BLOG_LIST')) {
          const blogConfig = getBlockConfig(layoutBlocks, 'BLOG_LIST');
          const blogLimit = blogConfig.limit || 3;
          promises.push(
            fetchJson(`${apiBase}/stores/${encodeURIComponent(slug)}/blog?limit=${blogLimit}`)
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

  // Build render context — shared by all blocks
  const context: BlockRenderContext = {
    store,
    slug: slug!,
    products,
    blogPosts,
    storePrefix,
    tabletPrefix: tabletPfx,
    signagePrefix: signagePfx,
    service: service || 'glycopharm',
    storeId,
    channels,
  };

  // Registry-based block renderer — no switch/case, with visibility guard
  const renderBlock = (block: StoreBlock) => {
    if (!block.enabled) return null;
    const definition = StoreBlockRegistry[block.type];
    if (!definition) return null;
    // WO-STORE-ENGINE-HARDENING-V1: policy/channel guard
    if (definition.visibilityGuard && !definition.visibilityGuard(context)) return null;
    const BlockComponent = definition.component;
    return <BlockComponent key={block.type} block={block} context={context} />;
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

      {/* Content — registry-based block rendering */}
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

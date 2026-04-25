/**
 * Product Grid Block — 추천 상품 그리드
 * WO-STORE-BLOCK-REGISTRY-V1
 */

import { Link, useNavigate } from 'react-router-dom';
import type { StoreBlockDefinition, BlockComponentProps } from '../types';

function ProductGridBlockComponent({ block, context }: BlockComponentProps) {
  const navigate = useNavigate();
  const { slug, products, storePrefix } = context;
  const config = block.config || {};
  if (products.length === 0) return null;
  const limit = config.limit || 4;

  return (
    <div style={{ padding: '0 16px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--sf-heading, #1e293b)' }}>추천 상품</h2>
        <Link to={`${storePrefix}/${slug}/products`} style={{ fontSize: '13px', color: 'var(--sf-primary, #3b82f6)', textDecoration: 'none' }}>
          전체보기
        </Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {products.slice(0, limit).map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`${storePrefix}/${slug}/products/${p.id}`)}
            style={{
              backgroundColor: 'var(--sf-surface, #fff)',
              borderRadius: '10px',
              border: '1px solid var(--sf-border, #e2e8f0)',
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
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--sf-text, #1e293b)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </p>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--sf-primary, #2563eb)', marginTop: '4px' }}>
                {(p.sale_price || p.price).toLocaleString()}원
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export const ProductGridBlockDef: StoreBlockDefinition = {
  type: 'PRODUCT_GRID',
  label: '추천 상품',
  description: '상품 그리드 (B2C 상품)',
  defaultConfig: { limit: 4 },
  visibilityGuard: (ctx) => !!ctx.channels?.B2C,
  component: ProductGridBlockComponent,
};

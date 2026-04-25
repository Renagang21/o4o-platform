/**
 * Tablet Promo Block — 태블릿 상품 안내
 * WO-STORE-BLOCK-REGISTRY-V1
 * WO-O4O-STORE-TABLET-UX-CONSOLIDATION-V1: 주문 → 관심 요청 용어 통일
 */

import { Link } from 'react-router-dom';
import type { StoreBlockDefinition, BlockComponentProps } from '../types';

function TabletPromoBlockComponent({ context }: BlockComponentProps) {
  const { slug, tabletPrefix } = context;

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
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e40af' }}>매장 상품 안내</p>
            <p style={{ fontSize: '13px', color: '#3b82f6' }}>태블릿에서 관심 상품을 확인하세요</p>
          </div>
        </div>
      </Link>
    </div>
  );
}

export const TabletPromoBlockDef: StoreBlockDefinition = {
  type: 'TABLET_PROMO',
  label: '태블릿 상품 안내',
  description: '매장 태블릿 안내 링크',
  defaultConfig: {},
  visibilityGuard: (ctx) => !!ctx.channels?.TABLET,
  component: TabletPromoBlockComponent,
};

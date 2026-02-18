/**
 * Tablet Promo Block — 태블릿 주문 안내
 * WO-STORE-BLOCK-REGISTRY-V1
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
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e40af' }}>매장 태블릿 주문</p>
            <p style={{ fontSize: '13px', color: '#3b82f6' }}>태블릿에서 바로 주문 요청하기</p>
          </div>
        </div>
      </Link>
    </div>
  );
}

export const TabletPromoBlockDef: StoreBlockDefinition = {
  type: 'TABLET_PROMO',
  label: '태블릿 주문 안내',
  description: '매장 태블릿 주문 링크',
  defaultConfig: {},
  visibilityGuard: (ctx) => !!ctx.channels?.TABLET,
  component: TabletPromoBlockComponent,
};

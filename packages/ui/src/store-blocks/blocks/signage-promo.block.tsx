/**
 * Signage Promo Block — 디지털 사이니지 안내
 * WO-STORE-BLOCK-REGISTRY-V1
 */

import { Link } from 'react-router-dom';
import type { StoreBlockDefinition, BlockComponentProps } from '../types';

function SignagePromoBlockComponent({ context }: BlockComponentProps) {
  const { signagePrefix } = context;

  return (
    <div style={{ padding: '0 16px', marginBottom: '24px' }}>
      <Link
        to={signagePrefix}
        style={{
          display: 'block',
          padding: '16px',
          backgroundColor: '#f0fdf4',
          borderRadius: '10px',
          border: '1px solid #bbf7d0',
          textDecoration: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>🖥️</span>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#166534' }}>디지털 사이니지</p>
            <p style={{ fontSize: '13px', color: '#16a34a' }}>매장 디스플레이 콘텐츠 보기</p>
          </div>
        </div>
      </Link>
    </div>
  );
}

export const SignagePromoBlockDef: StoreBlockDefinition = {
  type: 'SIGNAGE_PROMO',
  label: '디지털 사이니지',
  description: '사이니지 콘텐츠 허브 링크',
  defaultConfig: {},
  visibilityGuard: (ctx) => !!ctx.channels?.SIGNAGE,
  component: SignagePromoBlockComponent,
};

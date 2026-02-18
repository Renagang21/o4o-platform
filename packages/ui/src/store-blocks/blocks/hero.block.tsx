/**
 * Hero Block — 매장 히어로 배너
 * WO-STORE-BLOCK-REGISTRY-V1
 */

import type { StoreBlockDefinition, BlockComponentProps } from '../types';

function HeroBlockComponent({ context }: BlockComponentProps) {
  const { store } = context;
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

export const HeroBlockDef: StoreBlockDefinition = {
  type: 'HERO',
  label: '히어로 배너',
  description: '매장 이름, 로고, 소개 배너',
  defaultConfig: {},
  component: HeroBlockComponent,
};

/**
 * Info Section Block — 매장 소개
 * WO-STORE-BLOCK-REGISTRY-V1
 */

import type { StoreBlockDefinition, BlockComponentProps } from '../types';

function InfoSectionBlockComponent({ context }: BlockComponentProps) {
  const { store } = context;
  if (!store.description) return null;

  return (
    <div style={{ padding: '0 16px', marginBottom: '24px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--sf-heading, #1e293b)', marginBottom: '12px' }}>매장 소개</h2>
      <div style={{ backgroundColor: 'var(--sf-surface, #fff)', borderRadius: '10px', border: '1px solid var(--sf-border, #e2e8f0)', padding: '16px' }}>
        <p style={{ fontSize: '14px', color: 'var(--sf-text-secondary, #475569)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {store.description}
        </p>
      </div>
    </div>
  );
}

export const InfoSectionBlockDef: StoreBlockDefinition = {
  type: 'INFO_SECTION',
  label: '매장 소개',
  description: '매장 설명 텍스트',
  defaultConfig: {},
  component: InfoSectionBlockComponent,
};

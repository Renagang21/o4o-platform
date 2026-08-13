/**
 * PopLocalProductSection — 매장 자체 상품(origin='local') 진입 섹션
 * WO-O4O-MY-STORE-POP-COMPOSER-KCOS-GP-COMMONIZATION-V1
 *
 * 로딩/실패/차단을 빈 폼으로 위장하지 않는다(WO-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1).
 */

import { PopInlineError, PopInlineLoading } from './PopStateBlocks';
import { popSectionHeaderStyle, popSectionStyle } from './popStyles';
import type { PopAccentTheme, PopLocalProductItem } from './types';

export interface PopLocalProductSectionProps {
  accent: PopAccentTheme;
  items: PopLocalProductItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onRemove: (id: string) => void;
}

export function PopLocalProductSection({
  accent, items, loading, error, onRetry, onRemove,
}: PopLocalProductSectionProps) {
  if (!loading && !error && items.length === 0) return null;

  return (
    <section style={popSectionStyle}>
      <div style={popSectionHeaderStyle}>
        <span style={{ fontWeight: 600, color: '#1e293b' }}>매장 자체 상품</span>
      </div>

      {loading && <PopInlineLoading message="상품 정보를 불러오는 중..." />}

      {error && !loading && <PopInlineError message={error} onRetry={onRetry} />}

      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                border: `2px solid ${accent.color}`, backgroundColor: accent.softBg,
                borderRadius: 10, padding: '12px 14px',
              }}
            >
              {p.imageUrl && (
                <img
                  src={p.imageUrl}
                  alt={p.title}
                  style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                />
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>{p.title}</p>
                {p.description && (
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{p.description}</p>
                )}
              </div>
              <button
                onClick={() => onRemove(p.id)}
                style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
              >
                제외
              </button>
            </div>
          ))}
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
            생성된 POP 은 내 자료함(제작 자료)에 저장되어 다시 열고 출력할 수 있습니다.
          </p>
        </div>
      )}
    </section>
  );
}

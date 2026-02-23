/**
 * CoreServiceBanners — 핵심 서비스 (2x2 카드 그리드)
 *
 * WO-O4O-HUB-REVENUE-PRIORITY-IMPLEMENTATION-V1
 * WO-O4O-HUB-LIST-UI-UNIFICATION-V1: 가로리스트 → 2x2 카드 그리드
 *
 * 4개 핵심 서비스를 2열 카드 레이아웃으로 표시.
 */

import type { CoreServiceBannersProps } from '../types.js';
import { NEUTRALS, SHADOWS } from '../theme.js';
import { injectExplorationStyles } from '../utils/style-inject.js';

const S = {
  sectionTitle: {
    margin: '0 0 16px',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: NEUTRALS[900],
  } as const,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  } as const,
  card: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    background: '#ffffff',
    border: `1px solid ${NEUTRALS[200]}`,
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: SHADOWS.sm,
    textAlign: 'left' as const,
    width: '100%',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    transition: 'box-shadow 0.2s, border-color 0.2s',
  } as const,
  icon: {
    flexShrink: 0,
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    background: NEUTRALS[100],
    borderRadius: '8px',
  } as const,
  content: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  } as const,
  itemTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: NEUTRALS[800],
  } as const,
  itemDesc: {
    fontSize: '0.75rem',
    color: NEUTRALS[500],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as const,
  badge: {
    flexShrink: 0,
    alignSelf: 'flex-start',
    fontSize: '0.6875rem',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '4px',
    color: NEUTRALS[500],
    background: NEUTRALS[100],
  } as const,
  empty: {
    padding: '40px 20px',
    textAlign: 'center' as const,
    fontSize: '0.875rem',
    color: NEUTRALS[400],
  } as const,
};

export function CoreServiceBanners({ banners, title = '핵심 서비스' }: CoreServiceBannersProps) {
  injectExplorationStyles();

  return (
    <div>
      <h2 style={S.sectionTitle}>{title}</h2>
      {banners.length === 0 ? (
        <div style={S.empty}>등록된 서비스가 없습니다.</div>
      ) : (
        <div className="hub-explore-core-grid" style={S.grid}>
          {banners.map(b => (
            <button
              key={b.id}
              className="hub-core-card"
              style={{
                ...S.card,
                cursor: b.onClick ? 'pointer' : 'default',
              }}
              onClick={b.onClick}
              disabled={!b.onClick}
              type="button"
            >
              {b.icon && (
                <span style={S.icon}>
                  {b.icon}
                </span>
              )}
              <div style={S.content}>
                <span style={S.itemTitle}>{b.title}</span>
                {b.description && <span style={S.itemDesc}>{b.description}</span>}
              </div>
              {b.badge && <span style={S.badge}>{b.badge}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

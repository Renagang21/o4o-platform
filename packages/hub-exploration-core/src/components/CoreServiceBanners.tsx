/**
 * CoreServiceBanners — 핵심 서비스 (가로형 리스트)
 *
 * WO-O4O-HUB-REVENUE-PRIORITY-IMPLEMENTATION-V1: 카드 → 가로형 전환
 *
 * 순서 고정: B2B → 사이니지 → 콘텐츠 → 캠페인
 */

import type { CoreServiceBannersProps } from '../types.js';
import { NEUTRALS } from '../theme.js';

export function CoreServiceBanners({
  banners,
  title = '핵심 서비스',
}: CoreServiceBannersProps) {
  return (
    <div>
      <h2 style={S.sectionTitle}>{title}</h2>
      {banners.length === 0 ? (
        <div style={S.empty}>등록된 서비스가 없습니다.</div>
      ) : (
        <div style={S.list}>
          {banners.map((b, i) => (
            <button
              key={b.id}
              style={{
                ...S.item,
                borderBottom: i < banners.length - 1 ? `1px solid ${NEUTRALS[200]}` : 'none',
              }}
              onClick={b.onClick}
              disabled={!b.onClick}
              type="button"
            >
              {b.icon && (
                <span style={S.icon}>
                  {typeof b.icon === 'string' ? b.icon : b.icon}
                </span>
              )}
              <div style={S.content}>
                <span style={S.itemTitle}>{b.title}</span>
                {b.description && <span style={S.itemDesc}>{b.description}</span>}
              </div>
              {b.badge && <span style={S.badge}>{b.badge}</span>}
              {b.onClick && <span style={S.arrow}>&rarr;</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: '1.125rem',
    fontWeight: 700,
    color: NEUTRALS[900],
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    background: '#ffffff',
    borderRadius: '12px',
    border: `1px solid ${NEUTRALS[200]}`,
    overflow: 'hidden',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    transition: 'background 0.15s',
  },
  icon: {
    fontSize: '24px',
    flexShrink: 0,
    width: '32px',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  itemTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: NEUTRALS[800],
  },
  itemDesc: {
    fontSize: '0.75rem',
    color: NEUTRALS[500],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.6875rem',
    fontWeight: 500,
    color: NEUTRALS[500],
    backgroundColor: NEUTRALS[100],
    borderRadius: '4px',
    flexShrink: 0,
  },
  arrow: {
    fontSize: '1rem',
    color: NEUTRALS[400],
    flexShrink: 0,
  },
  empty: {
    padding: '40px 20px',
    textAlign: 'center',
    fontSize: '0.875rem',
    color: NEUTRALS[400],
  },
};

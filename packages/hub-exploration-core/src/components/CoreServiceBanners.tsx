import type { CoreServiceBannersProps } from '../types.js';
import { NEUTRALS, SHADOWS } from '../theme.js';
import { injectExplorationStyles } from '../utils/style-inject.js';

export function CoreServiceBanners({
  banners,
  title = '핵심 서비스',
}: CoreServiceBannersProps) {
  injectExplorationStyles();

  return (
    <div>
      <h2 style={S.sectionTitle}>{title}</h2>
      {banners.length === 0 ? (
        <div style={S.empty}>등록된 서비스가 없습니다.</div>
      ) : (
        <div className="hub-explore-service-grid" style={S.grid}>
          {banners.map(b => (
            <button
              key={b.id}
              style={S.card}
              onClick={b.onClick}
              disabled={!b.onClick}
            >
              {b.icon && (
                <div style={S.iconWrap}>
                  {typeof b.icon === 'string' ? (
                    <span style={S.emoji}>{b.icon}</span>
                  ) : b.icon}
                </div>
              )}
              <div style={S.content}>
                <div style={S.titleRow}>
                  <span style={S.cardTitle}>{b.title}</span>
                  {b.badge && <span style={S.badge}>{b.badge}</span>}
                </div>
                {b.description && <p style={S.cardDesc}>{b.description}</p>}
              </div>
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
    margin: '0 0 16px',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: NEUTRALS[900],
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: `1px solid ${NEUTRALS[200]}`,
    boxShadow: SHADOWS.sm,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'box-shadow 0.15s, border-color 0.15s',
    width: '100%',
    fontFamily: 'inherit',
    fontSize: 'inherit',
  },
  iconWrap: {
    flexShrink: 0,
  },
  emoji: {
    fontSize: '32px',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: NEUTRALS[900],
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.6875rem',
    fontWeight: 500,
    color: NEUTRALS[500],
    backgroundColor: NEUTRALS[100],
    borderRadius: '4px',
  },
  cardDesc: {
    margin: '4px 0 0',
    fontSize: '0.8125rem',
    color: NEUTRALS[500],
    lineHeight: 1.5,
  },
  arrow: {
    fontSize: '1.125rem',
    color: NEUTRALS[400],
    flexShrink: 0,
  },
  empty: {
    padding: '40px 20px',
    textAlign: 'center' as const,
    fontSize: '0.875rem',
    color: NEUTRALS[400],
  },
};

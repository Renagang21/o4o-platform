import type { ServicePromotionBannersProps } from '../types.js';
import { NEUTRALS, SHADOWS } from '../theme.js';
import { injectExplorationStyles } from '../utils/style-inject.js';

export function ServicePromotionBanners({
  banners,
  title = '서비스 프로모션',
}: ServicePromotionBannersProps) {
  injectExplorationStyles();

  if (banners.length === 0) return null;

  return (
    <div>
      <h2 style={S.sectionTitle}>{title}</h2>
      <div className="hub-explore-promo-grid" style={S.grid}>
        {banners.map(b => (
          <button
            key={b.id}
            style={S.card}
            onClick={b.onClick}
            disabled={!b.onClick}
          >
            <img src={b.imageUrl} alt={b.alt} style={S.image} />
            {(b.title || b.subtitle) && (
              <div style={S.overlay}>
                {b.title && <span style={S.title}>{b.title}</span>}
                {b.subtitle && <span style={S.subtitle}>{b.subtitle}</span>}
              </div>
            )}
          </button>
        ))}
      </div>
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
    position: 'relative',
    display: 'block',
    width: '100%',
    padding: 0,
    border: `1px solid ${NEUTRALS[200]}`,
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    backgroundColor: '#ffffff',
    boxShadow: SHADOWS.sm,
    fontFamily: 'inherit',
    textAlign: 'left',
  },
  image: {
    width: '100%',
    height: '180px',
    objectFit: 'cover',
    display: 'block',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '16px',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  title: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#ffffff',
  },
  subtitle: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.8)',
  },
};

import type { AdSectionProps } from '../types.js';
import { NEUTRALS, SHADOWS } from '../theme.js';
import { injectExplorationStyles } from '../utils/style-inject.js';

export function AdSection({
  ads,
  title = '광고',
}: AdSectionProps) {
  injectExplorationStyles();

  if (ads.length === 0) return null;

  const premium = ads.filter(a => a.tier === 'premium');
  const normal = ads.filter(a => a.tier === 'normal');

  return (
    <div>
      {title && <h2 style={S.sectionTitle}>{title}</h2>}

      {/* Premium: 2-column */}
      {premium.length > 0 && (
        <div className="hub-explore-ad-premium" style={S.premiumGrid}>
          {premium.map(ad => (
            <button key={ad.id} style={S.adCard} onClick={ad.onClick} disabled={!ad.onClick}>
              <img src={ad.imageUrl} alt={ad.alt} style={S.premiumImg} />
            </button>
          ))}
        </div>
      )}

      {/* Normal: 4-column */}
      {normal.length > 0 && (
        <div
          className="hub-explore-ad-normal"
          style={{ ...S.normalGrid, marginTop: premium.length > 0 ? '16px' : undefined }}
        >
          {normal.map(ad => (
            <button key={ad.id} style={S.adCard} onClick={ad.onClick} disabled={!ad.onClick}>
              <img src={ad.imageUrl} alt={ad.alt} style={S.normalImg} />
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
  premiumGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  normalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
  },
  adCard: {
    display: 'block',
    width: '100%',
    padding: 0,
    border: `1px solid ${NEUTRALS[200]}`,
    borderRadius: '10px',
    overflow: 'hidden',
    cursor: 'pointer',
    backgroundColor: '#ffffff',
    boxShadow: SHADOWS.sm,
    fontFamily: 'inherit',
  },
  premiumImg: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    display: 'block',
  },
  normalImg: {
    width: '100%',
    height: '120px',
    objectFit: 'cover',
    display: 'block',
  },
};

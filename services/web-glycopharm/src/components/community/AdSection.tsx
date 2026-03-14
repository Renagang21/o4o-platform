/**
 * AdSection — Community Hub Page Ads Grid
 *
 * WO-GLYCOPHARM-COMMUNITY-HUB-IMPLEMENTATION-V1
 */

import type { CSSProperties } from 'react';
import type { CommunityAd } from '../../services/communityApi';

interface Props {
  ads: CommunityAd[];
}

export function AdSection({ ads }: Props) {
  if (ads.length === 0) return null;

  const cols = ads.length >= 3 ? 3 : ads.length;

  return (
    <section style={styles.section}>
      <div style={{ ...styles.grid, gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {ads.slice(0, 3).map((ad) => (
          <a
            key={ad.id}
            href={ad.linkUrl ?? undefined}
            target={ad.linkUrl ? '_blank' : undefined}
            rel={ad.linkUrl ? 'noopener noreferrer' : undefined}
            style={styles.card}
          >
            <img src={ad.imageUrl} alt={ad.title} style={styles.image} />
            <p style={styles.title}>{ad.title}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  section: {
    marginBottom: 32,
  },
  grid: {
    display: 'grid',
    gap: 12,
  },
  card: {
    display: 'block',
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    textDecoration: 'none',
    backgroundColor: 'white',
  },
  image: {
    width: '100%',
    height: 140,
    objectFit: 'cover' as const,
  },
  title: {
    fontSize: 13,
    fontWeight: 500,
    color: '#334155',
    padding: '8px 12px',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
};

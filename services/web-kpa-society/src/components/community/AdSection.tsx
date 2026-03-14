/**
 * AdSection — Community Hub Page Ad Slots
 *
 * WO-KPA-A-COMMUNITY-HUB-IMPLEMENTATION-V1
 * - Up to 3 ad slots in responsive grid
 * - Hidden when no ads available
 */

import { CSSProperties } from 'react';
import type { CommunityAd } from '../../api/community';
import { spacing } from '../../styles/theme';

interface Props {
  ads: CommunityAd[];
}

export function AdSection({ ads }: Props) {
  if (ads.length === 0) return null;

  const displayAds = ads.slice(0, 3);

  return (
    <section style={styles.container}>
      <div style={{
        ...styles.grid,
        gridTemplateColumns: displayAds.length === 1
          ? '1fr'
          : displayAds.length === 2
            ? '1fr 1fr'
            : '1fr 1fr 1fr',
      }}>
        {displayAds.map((ad) => (
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
  container: {
    marginBottom: spacing.lg,
  },
  grid: {
    display: 'grid',
    gap: 16,
  },
  card: {
    display: 'block',
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    textDecoration: 'none',
    backgroundColor: 'white',
    transition: 'box-shadow 0.2s',
  },
  image: {
    width: '100%',
    height: 160,
    objectFit: 'cover',
  },
  title: {
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 500,
    color: '#334155',
    margin: 0,
  },
};

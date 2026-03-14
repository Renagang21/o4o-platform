/**
 * SponsorBar — Community Hub Sponsor Logos
 *
 * WO-GLYCOPHARM-COMMUNITY-HUB-IMPLEMENTATION-V1
 */

import type { CSSProperties } from 'react';
import type { CommunitySponsor } from '../../services/communityApi';

interface Props {
  sponsors: CommunitySponsor[];
}

export function SponsorBar({ sponsors }: Props) {
  if (sponsors.length === 0) return null;

  return (
    <section style={styles.section}>
      <p style={styles.heading}>Sponsored by</p>
      <div style={styles.row}>
        {sponsors.map((s) => (
          <a
            key={s.id}
            href={s.linkUrl ?? undefined}
            target={s.linkUrl ? '_blank' : undefined}
            rel={s.linkUrl ? 'noopener noreferrer' : undefined}
            style={styles.logo}
          >
            <img src={s.logoUrl} alt={s.name} style={styles.img} />
          </a>
        ))}
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  section: {
    marginTop: 32,
    paddingTop: 24,
    borderTop: '1px solid #e2e8f0',
    textAlign: 'center' as const,
  },
  heading: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 12,
  },
  row: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    flexWrap: 'wrap' as const,
  },
  logo: {
    display: 'block',
    opacity: 0.6,
    transition: 'opacity 0.2s',
  },
  img: {
    height: 28,
    maxWidth: 100,
    objectFit: 'contain' as const,
  },
};

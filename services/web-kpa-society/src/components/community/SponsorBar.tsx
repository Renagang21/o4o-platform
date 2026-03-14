/**
 * SponsorBar — Community Hub Sponsor Logo Bar
 *
 * WO-KPA-A-COMMUNITY-HUB-IMPLEMENTATION-V1
 * - Horizontal scroll of sponsor logos
 * - Click opens linkUrl in new tab
 * - Hidden when no sponsors
 */

import { CSSProperties } from 'react';
import type { CommunitySponsor } from '../../api/community';
import { spacing } from '../../styles/theme';

interface Props {
  sponsors: CommunitySponsor[];
}

export function SponsorBar({ sponsors }: Props) {
  if (sponsors.length === 0) return null;

  return (
    <section style={styles.container}>
      <p style={styles.label}>Sponsors</p>
      <div style={styles.scrollContainer}>
        <div style={styles.logoRow}>
          {sponsors.map((s) => (
            <a
              key={s.id}
              href={s.linkUrl ?? undefined}
              target={s.linkUrl ? '_blank' : undefined}
              rel={s.linkUrl ? 'noopener noreferrer' : undefined}
              style={styles.logoLink}
              title={s.name}
            >
              <img src={s.logoUrl} alt={s.name} style={styles.logo} />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    marginTop: spacing.lg,
    padding: '20px 0',
    borderTop: '1px solid #e2e8f0',
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    margin: '0 0 12px',
    textAlign: 'center' as const,
  },
  scrollContainer: {
    overflowX: 'auto' as const,
    WebkitOverflowScrolling: 'touch' as const,
  },
  logoRow: {
    display: 'flex',
    gap: 24,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 'min-content',
    padding: '0 16px',
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logo: {
    height: 36,
    maxWidth: 120,
    objectFit: 'contain' as const,
    opacity: 0.7,
    transition: 'opacity 0.2s',
  },
};

/**
 * HeroBannerSection — Community Hub Hero Banner Carousel
 *
 * WO-KPA-A-COMMUNITY-HUB-IMPLEMENTATION-V1
 * - Auto-rotate every 5s, arrow navigation, dot indicator
 * - Falls back to static hero when no ads
 */

import { useState, useEffect, useCallback, CSSProperties } from 'react';
import type { CommunityAd } from '../../api/community';
import { colors, spacing } from '../../styles/theme';

interface Props {
  ads: CommunityAd[];
}

export function HeroBannerSection({ ads }: Props) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % ads.length);
  }, [ads.length]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + ads.length) % ads.length);
  }, [ads.length]);

  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, ads.length]);

  // No ads: show default hero
  if (ads.length === 0) {
    return (
      <section style={styles.defaultHero}>
        <div style={styles.defaultContent}>
          <span style={styles.badge}>대한약사회</span>
          <h1 style={styles.title}>약사회 통합 서비스</h1>
          <p style={styles.subtitle}>포럼 · 교육 · 사이니지 · 약국 서비스를 한 곳에서</p>
        </div>
      </section>
    );
  }

  const ad = ads[current];

  return (
    <section style={styles.container}>
      <a
        href={ad.linkUrl ?? undefined}
        target={ad.linkUrl ? '_blank' : undefined}
        rel={ad.linkUrl ? 'noopener noreferrer' : undefined}
        style={styles.slideLink}
      >
        <img src={ad.imageUrl} alt={ad.title} style={styles.image} />
        <div style={styles.overlay}>
          <p style={styles.adTitle}>{ad.title}</p>
        </div>
      </a>

      {ads.length > 1 && (
        <>
          <button onClick={prev} style={{ ...styles.arrow, left: 12 }} aria-label="Previous">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button onClick={next} style={{ ...styles.arrow, right: 12 }} aria-label="Next">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="9 6 15 12 9 18" /></svg>
          </button>
          <div style={styles.dots}>
            {ads.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                style={{
                  ...styles.dot,
                  backgroundColor: i === current ? 'white' : 'rgba(255,255,255,0.5)',
                }}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  slideLink: {
    display: 'block',
    width: '100%',
    height: '100%',
    textDecoration: 'none',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '24px 20px',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
  },
  adTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 600,
    margin: 0,
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(0,0,0,0.3)',
    border: 'none',
    borderRadius: '50%',
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 2,
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 6,
    zIndex: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  defaultHero: {
    background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
    borderRadius: 16,
    padding: '48px 32px',
    textAlign: 'center' as const,
    marginBottom: spacing.lg,
  },
  defaultContent: {
    maxWidth: 600,
    margin: '0 auto',
  },
  badge: {
    display: 'inline-block',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 12px',
    borderRadius: 20,
    marginBottom: 12,
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: 700,
    margin: '0 0 8px',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    margin: 0,
  },
};

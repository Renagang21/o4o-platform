/**
 * HeroBannerSection — 공통 Hero 광고 캐러셀
 *
 * WO-O4O-HERO-BANNER-COMMONIZE-V1
 *
 * 공통화 대상:
 *   - carousel engine (autoplay 5s, arrow/dot navigation)
 *   - responsive layout / overlay 구조
 *   - fallback 정적 hero (콘텐츠만 서비스별)
 *
 * 서비스별 유지:
 *   - fallbackContent (badge/title/subtitle/colors)
 *   - 광고 데이터 source (각 서비스 API)
 */

import { useState, useEffect, useCallback, type CSSProperties } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

/** 광고 슬라이드 데이터. CommunityAd (KPA/K-Cosmetics) 와 동일 구조. */
export interface HeroBannerAd {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  displayOrder?: number;
}

/** 광고 없을 때 표시할 서비스별 정적 hero 콘텐츠 */
export interface HeroBannerFallback {
  badge: string;
  title: string;
  subtitle: string;
  /** 배지 + 타이틀 강조 색. 기본값 var(--color-primary, #2563EB) */
  primaryColor?: string;
  /** fallback hero 배경색. 기본값 var(--color-bg-secondary, #f8fafc) */
  bgColor?: string;
  /** fallback hero 테두리 색. 기본값 var(--color-border-default, #e2e8f0) */
  borderColor?: string;
}

export interface HeroBannerSectionProps {
  ads: HeroBannerAd[];
  fallback: HeroBannerFallback;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function HeroBannerSection({ ads, fallback }: HeroBannerSectionProps) {
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

  // No ads: show service-specific static hero
  if (ads.length === 0) {
    const primary = fallback.primaryColor ?? 'var(--color-primary, #2563EB)';
    return (
      <section
        style={{
          ...styles.defaultHero,
          background: fallback.bgColor ?? 'var(--color-bg-secondary, #f8fafc)',
          border: `1px solid ${fallback.borderColor ?? 'var(--color-border-default, #e2e8f0)'}`,
        }}
      >
        <div style={styles.defaultContent}>
          <span style={{ ...styles.badge, background: primary }}>
            {fallback.badge}
          </span>
          <h1 style={{ ...styles.title, color: primary }}>{fallback.title}</h1>
          <p style={styles.subtitle}>{fallback.subtitle}</p>
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button onClick={next} style={{ ...styles.arrow, right: 12 }} aria-label="Next">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <polyline points="9 6 15 12 9 18" />
            </svg>
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 0,
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
    borderRadius: 16,
    padding: '64px 32px',
    textAlign: 'center' as const,
    marginBottom: 0,
  },
  defaultContent: {
    maxWidth: 600,
    margin: '0 auto',
  },
  badge: {
    display: 'inline-block',
    color: 'white',
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 12px',
    borderRadius: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    margin: '0 0 12px',
  },
  subtitle: {
    color: '#475569',
    fontSize: 16,
    margin: 0,
  },
};

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
  /**
   * WO-KPA-HOME-HERO-COLOR-COMPOSITION-REFINE-V1
   * 장식형 fallback hero. true 일 때 외부 blue band + 떠 있는 white card +
   * 은은한 gradient/circle accent 로 렌더링한다 (텍스트/구조 동일, 색상 계층만 강화).
   * 미지정 시 기존 평면 fallback 을 그대로 유지한다 (다른 서비스 영향 없음).
   * blue 계열 accent 는 KPA 브랜드 톤 기준 — opt-in 서비스만 사용한다.
   */
  decorated?: boolean;
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

    // WO-KPA-HOME-HERO-COLOR-COMPOSITION-REFINE-V2:
    // card-based visual hero — 일관된 soft blue band 위에 명확히 떠 있는 white card.
    // band 는 끝까지 blue 톤을 유지해 white card 가 또렷이 대비되도록 한다 (V1: 중앙이
    // white 로 fade 되어 card 대비가 사라졌던 문제 해소).
    // 장식(wave/circle/dots)은 zIndex 0, 콘텐츠는 zIndex 1 — 가독성 우선.
    if (fallback.decorated) {
      return (
        <section style={styles.decoratedBand}>
          <div style={styles.decoratedCard}>
            <div style={styles.accentCircle} aria-hidden="true" />
            <div style={styles.accentWave} aria-hidden="true" />
            <div style={styles.accentDots} aria-hidden="true" />
            <div style={styles.decoratedContent}>
              <span style={styles.decoratedBadge}>{fallback.badge}</span>
              <h1 style={styles.decoratedTitle}>{fallback.title}</h1>
              <p style={styles.decoratedSubtitle}>{fallback.subtitle}</p>
            </div>
          </div>
        </section>
      );
    }

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

  // ─── WO-KPA-HOME-HERO-COLOR-COMPOSITION-REFINE-V3 (decorated fallback) ───
  // V3: white 중심 + 절제된 blue 포인트로 재정비. (V2 는 band·accent 의 blue 가
  // 넓고 강해 전체가 한 덩어리 파란 배경처럼 무거웠음.)
  // 외부 band: 거의 white 에 가까운 cool 톤 → 하단을 white 로 fade 해 콘텐츠와 연결.
  decoratedBand: {
    borderRadius: 24,
    padding: 'clamp(14px, 2.5vw, 26px)',
    background: 'linear-gradient(180deg, #f6faff 0%, #ffffff 52%, #f8fbff 100%)',
    marginBottom: 0,
  },
  // 내부 card: white 중심 + 아주 연한 border + 중립(neutral) soft shadow.
  // (V2 의 진한 blue shadow 가 band 와 겹쳐 무거웠음 → slate 계열 shadow 로 정리.)
  decoratedCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    minHeight: 'clamp(240px, 27vw, 300px)',
    padding: 'clamp(36px, 6vw, 60px) clamp(22px, 5vw, 44px)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffff',
    border: '1px solid #e7edf6',
    boxShadow:
      '0 18px 44px -26px rgba(15,23,42,0.22), 0 4px 12px -8px rgba(15,23,42,0.08)',
    textAlign: 'center' as const,
  },
  // 우측 pale-blue circle — 절제된 포인트 (크기·강도 축소).
  accentCircle: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 240,
    height: 240,
    pointerEvents: 'none',
    background:
      'radial-gradient(circle, rgba(96,165,250,0.18) 0%, rgba(96,165,250,0.05) 48%, rgba(96,165,250,0) 72%)',
    zIndex: 0,
  },
  // 좌하단 soft wave — card 하단에 아주 약하게만.
  accentWave: {
    position: 'absolute',
    bottom: -80,
    left: -60,
    width: 280,
    height: 220,
    pointerEvents: 'none',
    background:
      'radial-gradient(ellipse at bottom left, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0.03) 52%, rgba(99,102,241,0) 72%)',
    zIndex: 0,
  },
  // 좌상단 dot pattern — 은은하게 (강조 아님).
  accentDots: {
    position: 'absolute',
    top: 26,
    left: 30,
    width: 96,
    height: 72,
    pointerEvents: 'none',
    backgroundImage:
      'radial-gradient(circle, rgba(37,99,235,0.20) 1.5px, transparent 1.6px)',
    backgroundSize: '15px 15px',
    opacity: 0.5,
    zIndex: 0,
  },
  decoratedContent: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 680,
    margin: '0 auto',
  },
  // Badge: vivid blue gradient + white text.
  decoratedBadge: {
    display: 'inline-block',
    color: 'white',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.2,
    padding: '5px 14px',
    borderRadius: 20,
    marginBottom: 18,
    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
    boxShadow: '0 4px 10px -3px rgba(37,99,235,0.45)',
  },
  // Headline: strong navy.
  decoratedTitle: {
    fontSize: 'clamp(24px, 4.2vw, 32px)',
    fontWeight: 800,
    letterSpacing: -0.3,
    lineHeight: 1.25,
    color: '#1e3a8a',
    margin: '0 0 14px',
  },
  // Sub headline: slate.
  decoratedSubtitle: {
    color: '#475569',
    fontSize: 'clamp(15px, 2.5vw, 17px)',
    lineHeight: 1.6,
    margin: 0,
  },
};

import { useState, useEffect, useCallback } from 'react';
import type { HeroCarouselProps } from '../types.js';
import { NEUTRALS } from '../theme.js';

export function HeroCarousel({
  slides,
  autoInterval = 5000,
  height = '320px',
}: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const count = slides.length;

  const goTo = useCallback((index: number) => {
    setActiveIndex((index + count) % count);
  }, [count]);

  // Auto-transition
  useEffect(() => {
    if (autoInterval <= 0 || count <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % count);
    }, autoInterval);
    return () => clearInterval(timer);
  }, [autoInterval, count]);

  if (count === 0) return null;

  return (
    <div style={{ ...S.container, height }}>
      {slides.map((slide, i) => {
        const isActive = i === activeIndex;
        const bg: React.CSSProperties = slide.backgroundImage
          ? { backgroundImage: `url(${slide.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { backgroundColor: slide.backgroundColor ?? '#1E3A8A' };

        return (
          <div
            key={slide.id}
            style={{
              ...S.slide,
              ...bg,
              opacity: isActive ? 1 : 0,
              zIndex: isActive ? 1 : 0,
              transition: 'opacity 0.5s ease-in-out',
            }}
          >
            <div style={S.content}>
              <h1 style={S.title}>{slide.title}</h1>
              {slide.subtitle && <p style={S.subtitle}>{slide.subtitle}</p>}
              {slide.ctaLabel && slide.onCtaClick && (
                <button onClick={slide.onCtaClick} style={S.cta}>
                  {slide.ctaLabel}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Navigation dots */}
      {count > 1 && (
        <div style={S.dots}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={i === activeIndex ? { ...S.dot, ...S.dotActive } : S.dot}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Arrows */}
      {count > 1 && (
        <>
          <button onClick={() => goTo(activeIndex - 1)} style={{ ...S.arrow, left: '16px' }} aria-label="Previous">
            &#8249;
          </button>
          <button onClick={() => goTo(activeIndex + 1)} style={{ ...S.arrow, right: '16px' }} aria-label="Next">
            &#8250;
          </button>
        </>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    borderRadius: '16px',
  },
  slide: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    padding: '0 48px',
  },
  content: {
    maxWidth: '600px',
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 700,
    color: '#ffffff',
    lineHeight: 1.3,
  },
  subtitle: {
    margin: '12px 0 0',
    fontSize: '1rem',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 1.5,
  },
  cta: {
    marginTop: '20px',
    padding: '10px 24px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: NEUTRALS[800],
    backgroundColor: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'opacity 0.15s',
  },
  dots: {
    position: 'absolute',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '8px',
    zIndex: 2,
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.4)',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  dotActive: {
    backgroundColor: '#ffffff',
    width: '24px',
    borderRadius: '4px',
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '50%',
    fontSize: '1.25rem',
    cursor: 'pointer',
    zIndex: 2,
    fontFamily: 'inherit',
    transition: 'background-color 0.15s',
  },
};

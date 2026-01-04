/**
 * HeroSection - 메인 히어로 영역
 * WO-KPA-INTRANET-MAIN-V1-FINAL
 *
 * 권한: 지부/분회 각자 자율 관리
 */

import { useState, useEffect } from 'react';
import { colors } from '../../styles/theme';
import { HeroSlide } from '../../types/mainpage';

interface HeroSectionProps {
  slides: HeroSlide[];
  canEdit?: boolean;
  onEdit?: () => void;
}

export function HeroSection({ slides, canEdit = false, onEdit }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeSlides = slides.filter((s) => s.isActive).sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (activeSlides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeSlides.length]);

  if (activeSlides.length === 0) {
    return (
      <div style={styles.emptyHero}>
        <div style={styles.emptyContent}>
          <span style={styles.emptyIcon}>🖼️</span>
          <p style={styles.emptyText}>등록된 슬라이드가 없습니다.</p>
          {canEdit && (
            <button style={styles.addButton} onClick={onEdit}>
              슬라이드 추가
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentSlide = activeSlides[currentIndex];

  return (
    <div
      style={{
        ...styles.hero,
        backgroundColor: currentSlide.backgroundColor || colors.primary,
        backgroundImage: currentSlide.imageUrl ? `url(${currentSlide.imageUrl})` : undefined,
      }}
    >
      <div style={styles.overlay}>
        <div style={styles.content}>
          <h1 style={styles.title}>{currentSlide.title}</h1>
          {currentSlide.subtitle && <p style={styles.subtitle}>{currentSlide.subtitle}</p>}
          {currentSlide.linkUrl && currentSlide.linkText && (
            <a href={currentSlide.linkUrl} style={styles.ctaButton}>
              {currentSlide.linkText}
            </a>
          )}
        </div>

        {/* 슬라이드 인디케이터 */}
        {activeSlides.length > 1 && (
          <div style={styles.indicators}>
            {activeSlides.map((_, idx) => (
              <button
                key={idx}
                style={{
                  ...styles.indicator,
                  backgroundColor: idx === currentIndex ? colors.white : 'rgba(255,255,255,0.5)',
                }}
                onClick={() => setCurrentIndex(idx)}
              />
            ))}
          </div>
        )}

        {/* 편집 버튼 */}
        {canEdit && (
          <button style={styles.editButton} onClick={onEdit}>
            ✏️ 편집
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    position: 'relative',
    height: '280px',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    borderRadius: '16px',
    overflow: 'hidden',
    marginBottom: '24px',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '40px',
  },
  content: {},
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: colors.white,
    margin: '0 0 12px 0',
    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  subtitle: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.9)',
    margin: '0 0 24px 0',
    maxWidth: '500px',
  },
  ctaButton: {
    display: 'inline-block',
    padding: '12px 28px',
    backgroundColor: colors.white,
    color: colors.primary,
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '14px',
    transition: 'transform 0.2s',
  },
  indicators: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '8px',
  },
  indicator: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  editButton: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    padding: '8px 16px',
    backgroundColor: 'rgba(255,255,255,0.9)',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    color: colors.neutral700,
  },
  emptyHero: {
    height: '200px',
    backgroundColor: colors.neutral100,
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '24px',
    border: `2px dashed ${colors.neutral300}`,
  },
  emptyContent: {
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  emptyText: {
    color: colors.neutral500,
    fontSize: '14px',
    margin: '0 0 16px 0',
  },
  addButton: {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

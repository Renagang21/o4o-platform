/**
 * ProductDevelopmentSection — 제품개발 참여 블록
 *
 * WO-O4O-HUB-REVENUE-PRIORITY-IMPLEMENTATION-V1
 *
 * Neture 연동 제품개발 프로젝트 미리보기.
 * WO-O4O-HUB-LIST-UI-UNIFICATION-V1: 항상 표시 (empty state)
 * items가 비어있으면 empty state 표시.
 */

import type { ProductDevelopmentSectionProps } from '../types.js';
import { NEUTRALS, SHADOWS } from '../theme.js';
import { injectExplorationStyles } from '../utils/style-inject.js';

const ACCENT = '#059669'; // Emerald-600

const styles = {
  container: {
    background: `${ACCENT}08`,
    borderRadius: '16px',
    padding: '24px',
    border: `1px solid ${ACCENT}20`,
  } as const,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  } as const,
  title: {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: 700,
    color: NEUTRALS[900],
  } as const,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  } as const,
  card: {
    display: 'flex',
    gap: '12px',
    background: '#ffffff',
    border: `1px solid ${NEUTRALS[200]}`,
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    boxShadow: SHADOWS.sm,
    textAlign: 'left' as const,
    width: '100%',
    fontFamily: 'inherit',
    alignItems: 'center',
  } as const,
  image: {
    width: '64px',
    height: '64px',
    borderRadius: '8px',
    objectFit: 'cover' as const,
    flexShrink: 0,
  } as const,
  imagePlaceholder: {
    width: '64px',
    height: '64px',
    borderRadius: '8px',
    background: `${ACCENT}15`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    flexShrink: 0,
  } as const,
  cardContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    minWidth: 0,
  } as const,
  cardTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: NEUTRALS[800],
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as const,
  cardDesc: {
    fontSize: '0.75rem',
    color: NEUTRALS[500],
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as const,
  badge: {
    display: 'inline-block',
    fontSize: '0.6875rem',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '4px',
    color: ACCENT,
    background: `${ACCENT}15`,
    alignSelf: 'flex-start',
  } as const,
  cta: {
    display: 'block',
    width: '100%',
    marginTop: '16px',
    padding: '10px',
    background: 'transparent',
    border: `1px solid ${ACCENT}40`,
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: ACCENT,
    cursor: 'pointer',
    textAlign: 'center' as const,
    fontFamily: 'inherit',
  } as const,
  empty: {
    padding: '40px 20px',
    textAlign: 'center' as const,
    color: NEUTRALS[400],
    fontSize: '0.875rem',
    lineHeight: 1.6,
  } as const,
};

export function ProductDevelopmentSection({ items, title, ctaLabel, onCtaClick }: ProductDevelopmentSectionProps) {
  injectExplorationStyles();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>{title || '제품개발 참여'}</h2>
      </div>

      {items.length === 0 ? (
        <div style={styles.empty}>
          현재 참여 가능한 프로젝트가 준비 중입니다.<br />
          곧 새로운 개발 프로젝트가 공개됩니다.
        </div>
      ) : (
      <div className="hub-explore-productdev-grid" style={styles.grid}>
        {items.slice(0, 3).map(item => (
          <button
            key={item.id}
            style={styles.card}
            onClick={item.onClick}
            type="button"
          >
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.title} style={styles.image} />
            ) : (
              <div style={styles.imagePlaceholder}>🧪</div>
            )}
            <div style={styles.cardContent}>
              {item.badge && <span style={styles.badge}>{item.badge}</span>}
              <p style={styles.cardTitle}>{item.title}</p>
              {item.description && <p style={styles.cardDesc}>{item.description}</p>}
            </div>
          </button>
        ))}
      </div>
      )}

      {ctaLabel && onCtaClick && (
        <button style={styles.cta} onClick={onCtaClick} type="button">
          {ctaLabel} →
        </button>
      )}
    </div>
  );
}

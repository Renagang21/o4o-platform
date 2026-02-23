/**
 * B2BRevenueSection — B2B 매출 기회 블록
 *
 * WO-O4O-HUB-REVENUE-PRIORITY-IMPLEMENTATION-V1
 *
 * Hub 최상단 핵심 블록. 매출 연결 상품 미리보기.
 * items가 비어있으면 null 반환 (optional section).
 */

import type { B2BRevenueSectionProps } from '../types.js';
import { NEUTRALS, SHADOWS } from '../theme.js';
import { injectExplorationStyles } from '../utils/style-inject.js';

const styles = {
  container: {
    background: NEUTRALS[50],
    borderRadius: '16px',
    padding: '24px',
  } as const,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  } as const,
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 700,
    color: NEUTRALS[900],
  } as const,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  } as const,
  card: {
    display: 'flex',
    flexDirection: 'column' as const,
    background: '#ffffff',
    border: `1px solid ${NEUTRALS[200]}`,
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    boxShadow: SHADOWS.sm,
    transition: 'box-shadow 0.2s',
    textAlign: 'left' as const,
    padding: 0,
    width: '100%',
    fontFamily: 'inherit',
  } as const,
  imagePlaceholder: {
    width: '100%',
    height: '120px',
    background: NEUTRALS[100],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    color: NEUTRALS[300],
  } as const,
  image: {
    width: '100%',
    height: '120px',
    objectFit: 'cover' as const,
  } as const,
  cardBody: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  } as const,
  cardName: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: NEUTRALS[800],
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
    alignSelf: 'flex-start',
  } as const,
  price: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: NEUTRALS[900],
    margin: 0,
  } as const,
  supplier: {
    fontSize: '0.75rem',
    color: NEUTRALS[400],
    margin: 0,
  } as const,
  cta: {
    display: 'block',
    width: '100%',
    marginTop: '16px',
    padding: '12px',
    background: 'transparent',
    border: `1px solid ${NEUTRALS[300]}`,
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: NEUTRALS[700],
    cursor: 'pointer',
    textAlign: 'center' as const,
    fontFamily: 'inherit',
  } as const,
};

export function B2BRevenueSection({ items, title, ctaLabel, onCtaClick }: B2BRevenueSectionProps) {
  injectExplorationStyles();

  if (items.length === 0) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>{title || 'B2B 공급 기회'}</h2>
      </div>

      <div className="hub-explore-b2b-grid" style={styles.grid}>
        {items.slice(0, 6).map(item => (
          <button
            key={item.id}
            style={styles.card}
            onClick={item.onClick}
            type="button"
          >
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} style={styles.image} />
            ) : (
              <div style={styles.imagePlaceholder}>📦</div>
            )}
            <div style={styles.cardBody}>
              {item.badge && (
                <span style={{
                  ...styles.badge,
                  color: item.badgeColor || '#2563EB',
                  background: `${item.badgeColor || '#2563EB'}15`,
                }}>
                  {item.badge}
                </span>
              )}
              <p style={styles.cardName}>{item.name}</p>
              {item.price && <p style={styles.price}>{item.price}</p>}
              {item.supplierName && <p style={styles.supplier}>{item.supplierName}</p>}
            </div>
          </button>
        ))}
      </div>

      {ctaLabel && onCtaClick && (
        <button style={styles.cta} onClick={onCtaClick} type="button">
          {ctaLabel} →
        </button>
      )}
    </div>
  );
}

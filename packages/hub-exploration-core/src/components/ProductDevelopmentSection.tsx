/**
 * ProductDevelopmentSection — 제품개발 참여 전략 블록
 *
 * WO-O4O-HUB-REVENUE-PRIORITY-IMPLEMENTATION-V1
 * WO-O4O-HUB-LIST-UI-UNIFICATION-V1: 항상 표시 (empty state)
 * WO-O4O-HUB-STRATEGIC-DUAL-BLOCK-REALIGNMENT-V1: B2B 동급 전략 블록
 *
 * B2B와 동일한 시각 무게, 배경 색상만 차별화.
 * 2열 grid, max 4개, 카드에 2 CTA 지원.
 */

import type { ProductDevelopmentSectionProps } from '../types.js';
import { NEUTRALS, SHADOWS } from '../theme.js';
import { injectExplorationStyles } from '../utils/style-inject.js';

const ACCENT = '#059669'; // Emerald-600

const S = {
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
    flexDirection: 'column' as const,
    background: '#ffffff',
    border: `1px solid ${NEUTRALS[200]}`,
    borderRadius: '12px',
    padding: '0',
    overflow: 'hidden',
    boxShadow: SHADOWS.sm,
    textAlign: 'left' as const,
    width: '100%',
  } as const,
  cardImage: {
    width: '100%',
    height: '120px',
    objectFit: 'cover' as const,
  } as const,
  cardImagePlaceholder: {
    width: '100%',
    height: '120px',
    background: `${ACCENT}10`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
  } as const,
  cardBody: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    padding: '14px 16px',
    flex: 1,
  } as const,
  cardTitle: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: NEUTRALS[800],
    margin: 0,
  } as const,
  cardDesc: {
    fontSize: '0.8125rem',
    color: NEUTRALS[500],
    margin: 0,
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
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
  meta: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    marginTop: '4px',
  } as const,
  metaText: {
    fontSize: '0.75rem',
    color: NEUTRALS[600],
    margin: 0,
  } as const,
  cardActions: {
    display: 'flex',
    gap: '8px',
    padding: '0 16px 14px',
  } as const,
  btnDetail: {
    flex: 1,
    padding: '7px 0',
    background: 'transparent',
    border: `1px solid ${NEUTRALS[300]}`,
    borderRadius: '6px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: NEUTRALS[600],
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'center' as const,
  } as const,
  btnAction: {
    flex: 1,
    padding: '7px 0',
    background: ACCENT,
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#ffffff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'center' as const,
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
    <div style={S.container}>
      <div style={S.header}>
        <h2 style={S.title}>{title || '제품개발 참여'}</h2>
      </div>

      {items.length === 0 ? (
        <div style={S.empty}>
          현재 참여 가능한 프로젝트가 준비 중입니다.<br />
          곧 새로운 개발 프로젝트가 공개됩니다.
        </div>
      ) : (
        <div className="hub-explore-productdev-grid" style={S.grid}>
          {items.slice(0, 4).map(item => (
            <div key={item.id} style={S.card}>
              {/* Image */}
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.title} style={S.cardImage} />
              ) : (
                <div style={S.cardImagePlaceholder}>🧪</div>
              )}

              {/* Body */}
              <div style={S.cardBody}>
                {item.badge && <span style={S.badge}>{item.badge}</span>}
                <p style={S.cardTitle}>{item.title}</p>
                {item.description && <p style={S.cardDesc}>{item.description}</p>}

                {/* Meta: margin + recruitment */}
                {(item.marginInfo || item.recruitmentStatus) && (
                  <div style={S.meta}>
                    {item.marginInfo && <p style={S.metaText}>{item.marginInfo}</p>}
                    {item.recruitmentStatus && (
                      <p style={{ ...S.metaText, color: ACCENT, fontWeight: 600 }}>
                        {item.recruitmentStatus}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Dual CTA */}
              {(item.onDetail || item.onAction) && (
                <div style={S.cardActions}>
                  {item.onDetail && (
                    <button style={S.btnDetail} onClick={item.onDetail} type="button">
                      {item.detailLabel || '상세 보기'}
                    </button>
                  )}
                  {item.onAction && (
                    <button style={S.btnAction} onClick={item.onAction} type="button">
                      {item.actionLabel || '참여 신청'}
                    </button>
                  )}
                </div>
              )}

              {/* Fallback: single click */}
              {!item.onDetail && !item.onAction && item.onClick && (
                <div style={S.cardActions}>
                  <button
                    style={{ ...S.btnAction, flex: 'none', width: '100%' }}
                    onClick={item.onClick}
                    type="button"
                  >
                    자세히 보기
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {ctaLabel && onCtaClick && (
        <button style={S.cta} onClick={onCtaClick} type="button">
          {ctaLabel} →
        </button>
      )}
    </div>
  );
}

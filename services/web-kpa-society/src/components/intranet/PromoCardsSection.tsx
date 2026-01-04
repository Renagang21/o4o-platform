/**
 * PromoCardsSection - 광고/강좌/설문 안내 영역
 * WO-KPA-INTRANET-MAIN-V1-FINAL
 *
 * 정책:
 * - 관리자 화면 없음
 * - 약사공론 → 운영자에게 요청 → 운영자가 시스템에 반영
 * - 지부/분회는 결과만 노출 받음 (수정/개입 불가)
 */

import { colors } from '../../styles/theme';
import { PromoCard, PROMO_TYPE_LABELS } from '../../types/mainpage';

interface PromoCardsSectionProps {
  promoCards: PromoCard[];
}

export function PromoCardsSection({ promoCards }: PromoCardsSectionProps) {
  // 현재 날짜 기준으로 유효한 카드만 필터링
  const now = new Date();
  const activeCards = promoCards.filter((card) => {
    const start = new Date(card.startDate);
    const end = new Date(card.endDate);
    return card.isActive && now >= start && now <= end;
  });

  if (activeCards.length === 0) {
    return null;
  }

  const getTypeIcon = (type: PromoCard['type']) => {
    switch (type) {
      case 'ad': return '📢';
      case 'course': return '📚';
      case 'survey': return '📋';
      case 'announcement': return '📣';
      default: return '📌';
    }
  };

  const getTypeColor = (type: PromoCard['type']) => {
    switch (type) {
      case 'ad': return colors.accentYellow;
      case 'course': return colors.primary;
      case 'survey': return colors.accentGreen;
      case 'announcement': return colors.accentRed;
      default: return colors.neutral500;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>📌 안내</h3>
      </div>

      <div style={styles.cardsWrapper}>
        {activeCards.slice(0, 3).map((card) => (
          <div key={card.id} style={styles.card}>
            {card.imageUrl && (
              <div style={styles.cardImageWrapper}>
                <img
                  src={card.imageUrl}
                  alt={card.title}
                  style={styles.cardImage}
                />
              </div>
            )}
            <div style={styles.cardContent}>
              <div style={styles.cardHeader}>
                <span
                  style={{
                    ...styles.typeBadge,
                    backgroundColor: getTypeColor(card.type),
                  }}
                >
                  {getTypeIcon(card.type)} {PROMO_TYPE_LABELS[card.type]}
                </span>
              </div>
              <h4 style={styles.cardTitle}>{card.title}</h4>
              {card.description && (
                <p style={styles.cardDescription}>{card.description}</p>
              )}
              {card.linkUrl && (
                <a
                  href={card.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.cardLink}
                >
                  자세히 보기 →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '24px',
  },
  header: {
    marginBottom: '12px',
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  cardsWrapper: {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    paddingBottom: '8px',
  },
  card: {
    flex: '0 0 280px',
    backgroundColor: colors.white,
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: `1px solid ${colors.neutral200}`,
  },
  cardImageWrapper: {
    width: '100%',
    height: '120px',
    overflow: 'hidden',
    backgroundColor: colors.neutral100,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  cardContent: {
    padding: '16px',
  },
  cardHeader: {
    marginBottom: '8px',
  },
  typeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500,
    color: colors.white,
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 8px 0',
    lineHeight: 1.4,
  },
  cardDescription: {
    fontSize: '13px',
    color: colors.neutral600,
    margin: '0 0 12px 0',
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  cardLink: {
    fontSize: '13px',
    color: colors.primary,
    textDecoration: 'none',
    fontWeight: 500,
  },
};

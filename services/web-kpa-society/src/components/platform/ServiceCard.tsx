/**
 * ServiceCard - 개별 서비스 카드 컴포넌트
 *
 * WO-KPA-HOME-FOUNDATION-V1
 * WO-KPA-HOME-SERVICE-SECTION-V1: 서비스 섹션 정비
 */

export type ServiceBadgeType =
  | 'demo'              // 도입 검토용 데모 (약사회 지부 서비스 전용)
  | 'independent'       // 독립 운영 가능 (분회 서비스 전용)
  | 'none';             // 배지 없음

export interface ServiceCardCTA {
  label: string;
  href: string;
  primary?: boolean;
}

export interface ServiceCardProps {
  icon: string;
  title: string;
  description: string;
  href: string;
  /** @deprecated Use badgeType instead */
  badge?: string;
  /** 배지 타입 */
  badgeType?: ServiceBadgeType;
  /** CTA 버튼들 */
  ctas?: ServiceCardCTA[];
  /** 하위 텍스트 (선택 참여 프로그램 등) */
  subText?: string;
}

const BADGE_CONFIG: Record<Exclude<ServiceBadgeType, 'none'>, { text: string; style: React.CSSProperties }> = {
  demo: {
    text: '도입 검토용 데모',
    style: {
      fontSize: '0.7rem',
      fontWeight: 500,
      backgroundColor: '#fef3c7',
      color: '#92400e',
      padding: '2px 8px',
      borderRadius: '12px',
    },
  },
  independent: {
    text: '독립 운영 가능',
    style: {
      fontSize: '0.7rem',
      fontWeight: 500,
      backgroundColor: '#d1fae5',
      color: '#065f46',
      padding: '2px 8px',
      borderRadius: '12px',
    },
  },
};

export function ServiceCard({
  icon,
  title,
  description,
  href,
  badge,
  badgeType = 'none',
  ctas,
  subText,
}: ServiceCardProps) {
  const badgeConfig = badgeType !== 'none' ? BADGE_CONFIG[badgeType] : null;
  // 레거시 badge prop 지원
  const showLegacyBadge = !badgeConfig && badge;

  return (
    <div style={styles.card}>
      <div style={styles.iconWrapper}>{icon}</div>
      <h3 style={styles.title}>
        {title}
        {badgeConfig && <span style={badgeConfig.style}>{badgeConfig.text}</span>}
        {showLegacyBadge && <span style={styles.legacyBadge}>{badge}</span>}
      </h3>
      <p style={styles.description}>{description}</p>
      {subText && <p style={styles.subText}>{subText}</p>}
      {ctas && ctas.length > 0 && (
        <div style={styles.ctaContainer}>
          {ctas.map((cta, idx) => (
            <a
              key={idx}
              href={cta.href}
              style={cta.primary ? styles.ctaPrimary : styles.ctaSecondary}
            >
              {cta.label}
            </a>
          ))}
        </div>
      )}
      {!ctas && href && href !== '#' && (
        <a href={href} style={styles.ctaSecondary}>
          자세히 보기
        </a>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    color: 'inherit',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  },
  iconWrapper: {
    fontSize: '2rem',
    marginBottom: '12px',
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 8px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  legacyBadge: {
    fontSize: '0.75rem',
    fontWeight: 500,
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  description: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.6,
    flex: 1,
  },
  subText: {
    fontSize: '0.8rem',
    color: '#6366f1',
    margin: '8px 0 0 0',
    fontWeight: 500,
  },
  ctaContainer: {
    display: 'flex',
    gap: '8px',
    marginTop: '16px',
    flexWrap: 'wrap',
  },
  ctaPrimary: {
    display: 'inline-block',
    padding: '8px 16px',
    backgroundColor: '#2563eb',
    color: '#fff',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'background-color 0.2s',
  },
  ctaSecondary: {
    display: 'inline-block',
    padding: '8px 16px',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'background-color 0.2s',
    marginTop: '16px',
  },
};

export default ServiceCard;

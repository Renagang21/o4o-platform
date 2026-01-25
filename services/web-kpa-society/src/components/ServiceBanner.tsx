/**
 * ServiceBanner - 외부 서비스 연결 배너
 *
 * WO-KPA-MENU-CLEANUP-V1: 메뉴에서 제거된 기능을 배너로 전환
 * - 약사회 공식 서비스가 아님을 명확히 표시
 * - 외부 서비스로 연결
 */

import { colors, borderRadius } from '../styles/theme';

interface ServiceBannerProps {
  icon: string;
  title: string;
  description: string;
  linkUrl: string;
  linkText: string;
  variant?: 'primary' | 'secondary';
}

export function ServiceBanner({
  icon,
  title,
  description,
  linkUrl,
  linkText,
  variant = 'primary',
}: ServiceBannerProps) {
  const isPrimary = variant === 'primary';

  return (
    <div style={{
      ...styles.banner,
      backgroundColor: isPrimary ? colors.gray50 : colors.white,
      borderColor: isPrimary ? colors.primary : colors.gray300,
    }}>
      <div style={styles.bannerContent}>
        <span style={styles.bannerIcon}>{icon}</span>
        <div style={styles.bannerText}>
          <h3 style={styles.bannerTitle}>{title}</h3>
          <p style={styles.bannerDescription}>{description}</p>
        </div>
      </div>
      <div style={styles.bannerAction}>
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...styles.bannerLink,
            backgroundColor: isPrimary ? colors.primary : colors.white,
            color: isPrimary ? colors.white : colors.primary,
            borderColor: colors.primary,
          }}
        >
          {linkText} →
        </a>
      </div>
      <div style={styles.disclaimer}>
        본 서비스는 약사회 공식 서비스가 아니며, 거래·운영·책임은 해당 서비스 운영 주체에 있습니다.
      </div>
    </div>
  );
}

/**
 * ExternalServiceSection - 외부 서비스 배너 모음
 * 대시보드에 표시할 외부 서비스 배너 섹션
 */
export function ExternalServiceSection() {
  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>제휴 서비스</h2>
      <p style={styles.sectionDesc}>
        아래 서비스는 약사회 공식 서비스가 아닌 외부 제휴 서비스입니다.
      </p>
      <div style={styles.bannerGrid}>
        <ServiceBanner
          icon="🎓"
          title="교육/연수 서비스"
          description="약사 연수교육, 보수교육, 전문교육 과정을 제공합니다."
          linkUrl="/demo/lms"
          linkText="교육 서비스 이용하기"
          variant="primary"
        />
        <ServiceBanner
          icon="🛒"
          title="공동구매 서비스"
          description="약국 운영에 필요한 물품을 합리적인 가격에 공동구매합니다."
          linkUrl="/demo/groupbuy"
          linkText="공동구매 이용하기"
          variant="secondary"
        />
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '8px',
  },
  sectionDesc: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    marginBottom: '16px',
  },
  bannerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '16px',
  },
  banner: {
    position: 'relative',
    padding: '24px',
    borderRadius: borderRadius.lg,
    border: '2px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  bannerContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
  },
  bannerIcon: {
    fontSize: '40px',
    flexShrink: 0,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 8px 0',
  },
  bannerDescription: {
    fontSize: '0.875rem',
    color: colors.neutral600,
    margin: 0,
    lineHeight: 1.5,
  },
  bannerAction: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  bannerLink: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 20px',
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    fontWeight: 600,
    textDecoration: 'none',
    border: '1px solid',
    transition: 'opacity 0.2s',
  },
  disclaimer: {
    fontSize: '0.75rem',
    color: colors.neutral400,
    padding: '8px 12px',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.sm,
    textAlign: 'center',
    lineHeight: 1.4,
  },
};

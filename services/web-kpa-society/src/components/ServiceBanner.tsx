/**
 * ServiceBanner - 외부 서비스 연결 배너
 *
 * WO-KPA-MENU-CLEANUP-V1: 메뉴에서 제거된 기능을 배너로 전환
 * WO-KPA-PHARMACY-MANAGEMENT-V1: 약국 경영지원 배너 추가
 * - 약사회 공식 서비스가 아님을 명확히 표시
 * - 외부 서비스로 연결
 */

import { Link } from 'react-router-dom';
import { colors, borderRadius } from '../styles/theme';

interface ServiceBannerProps {
  icon: string;
  title: string;
  description: string;
  linkUrl: string;
  linkText: string;
  variant?: 'primary' | 'secondary';
  showDisclaimer?: boolean;
  isInternal?: boolean;
}

export function ServiceBanner({
  icon,
  title,
  description,
  linkUrl,
  linkText,
  variant = 'primary',
  showDisclaimer = true,
  isInternal = false,
}: ServiceBannerProps) {
  const isPrimary = variant === 'primary';

  const linkStyle = {
    ...styles.bannerLink,
    backgroundColor: isPrimary ? colors.primary : colors.white,
    color: isPrimary ? colors.white : colors.primary,
    borderColor: colors.primary,
  };

  return (
    <div style={{
      ...styles.banner,
      backgroundColor: isPrimary ? colors.gray100 : colors.white,
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
        {isInternal ? (
          <Link to={linkUrl} style={linkStyle}>
            {linkText} →
          </Link>
        ) : (
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
          >
            {linkText} →
          </a>
        )}
      </div>
      {showDisclaimer && (
        <div style={styles.disclaimer}>
          본 서비스는 약사회 공식 서비스가 아니며, 거래·운영·책임은 해당 서비스 운영 주체에 있습니다.
        </div>
      )}
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
      {/* 약국 경영지원 (WO-KPA-PHARMACY-LOCATION-V1: /pharmacy 단일 기준 경로) */}
      <h2 style={styles.sectionTitle}>약국 경영지원</h2>
      <p style={styles.sectionDesc}>
        약국 운영에 필요한 모든 기능을 한 곳에서 관리하세요.
      </p>
      <div style={{ marginBottom: '24px' }}>
        <ServiceBanner
          icon="💊"
          title="내 약국 운영하기"
          description="B2B 구매, 약국 몰 관리, 연결 서비스를 통합 관리합니다."
          linkUrl="/pharmacy"
          linkText="내 약국 운영하기"
          variant="primary"
          showDisclaimer={false}
          isInternal={true}
        />
      </div>

      {/* 약사회 서비스 */}
      <h2 style={styles.sectionTitle}>약사회 서비스</h2>
      <p style={styles.sectionDesc}>
        모든 지부·분회 회원에게 제공되는 약사회 기본 서비스입니다.
      </p>
      <div style={styles.bannerGrid}>
        <ServiceBanner
          icon="🎓"
          title="교육/연수 서비스"
          description="약사 연수교육, 보수교육, 전문교육 과정을 제공합니다."
          linkUrl="/lms"
          linkText="교육 서비스 이용하기"
          variant="primary"
          showDisclaimer={false}
          isInternal={true}
        />
        <ServiceBanner
          icon="🛒"
          title="이벤트 상품"
          description="약국 운영에 필요한 물품을 합리적인 가격에 이벤트로 제공합니다."
          linkUrl="/hub/event-offers"
          linkText="이벤트 보기"
          variant="secondary"
          showDisclaimer={false}
          isInternal={true}
        />
        {/* WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY-MIGRATION-V1
            Market Trial 실행은 Neture로 통합. KPA에서는 외부 진입점만 유지. */}
        <ServiceBanner
          icon="🧪"
          title="유통 참여형 펀딩 (Market Trial) 참여"
          description="공급자의 신제품을 먼저 체험하고 의견을 공유하세요. (Neture 통합 허브)"
          linkUrl="https://neture.co.kr/market-trial"
          linkText="Neture에서 보기"
          variant="secondary"
          showDisclaimer={false}
          isInternal={false}
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

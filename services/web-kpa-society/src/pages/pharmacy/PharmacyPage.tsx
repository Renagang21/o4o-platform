/**
 * PharmacyPage - 약국경영 페이지
 *
 * 상태 분기:
 * - 로그인 전: PharmacyPublicView (정보 카드만)
 * - 로그인 후 약국 미연결: PharmacyUnlinkedView
 * - 로그인 후 약국 연결: PharmacyDashboard (경영 서비스 허브)
 *
 * glycopharm 약국 경영 패턴 참고:
 * - PharmacySummary (약국 상태)
 * - ActiveServicesSection (사용 중 서비스)
 * - AvailableServicesSection (사용 가능 서비스)
 * - PharmacyUtilitySection (알림/안내)
 *
 * WO-KPA-PHARMACY-MANAGEMENT-V1
 * WO-KPA-COMMUNITY-HOME-V1: 3-state branching
 */

import { Link } from 'react-router-dom';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';
import { useAuth, TestUser } from '../../contexts/AuthContext';
import { isPharmacyOwner, PharmacistFeeCategory } from '../../types';
import { PharmacyPublicView } from '../../components/pharmacy/PharmacyPublicView';
import { PharmacyUnlinkedView } from '../../components/pharmacy/PharmacyUnlinkedView';

export function PharmacyPage() {
  const { isAuthenticated, user } = useAuth();
  const testUser = user as TestUser | null;

  if (!isAuthenticated) {
    return <PharmacyPublicView />;
  }

  // 약사 role이 있으면 약국 연결로 판단
  const hasPharmacyLink = testUser?.role === 'pharmacist' || testUser?.role === 'pharmacy_owner';
  if (!hasPharmacyLink) {
    return <PharmacyUnlinkedView />;
  }

  return <PharmacyDashboard />;
}

// 서비스 카드 데이터
interface ManagementCard {
  title: string;
  description: string;
  icon: string;
  href: string;
  status: string;
  statusType: 'active' | 'ready' | 'coming';
  ownerOnly?: boolean;
  /** true면 외부 URL (새 창으로 열기) */
  external?: boolean;
}

const activeServices: ManagementCard[] = [
  {
    title: '상품 관리',
    description: '약국 판매 상품 등록·가격·재고 관리',
    icon: '📦',
    href: '/pharmacy/store',
    status: '운영중',
    statusType: 'active',
  },
  {
    title: 'B2B 구매',
    description: '공급자 연결 및 도매 상품 구매',
    icon: '🏭',
    href: '/pharmacy/b2b',
    status: '이용 가능',
    statusType: 'active',
  },
  {
    title: '주문 관리',
    description: '접수·처리·배송 주문 상태 관리',
    icon: '📋',
    href: '/pharmacy/store',
    status: '운영중',
    statusType: 'active',
  },
  {
    title: '고객 관리',
    description: '약국 고객 정보 및 구매 이력',
    icon: '👥',
    href: '/pharmacy/services',
    status: '이용 가능',
    statusType: 'active',
    ownerOnly: true,
  },
];

const availableServices: ManagementCard[] = [
  {
    title: '디지털 사이니지',
    description: '매장 디지털 디스플레이 콘텐츠 관리',
    icon: '📺',
    href: '/pharmacy/services',
    status: '참여 가능',
    statusType: 'ready',
  },
  {
    title: '매출 분석',
    description: '약국 경영 현황 리포트 (예정)',
    icon: '📊',
    href: '/pharmacy',
    status: '준비중',
    statusType: 'coming',
    ownerOnly: true,
  },
];

const GLUCOSEVIEW_URL = import.meta.env.DEV
  ? 'http://localhost:4101'
  : 'https://glucoseview.neture.co.kr';

/** 약국 경영 지원 서비스 (외부, 새 창) */
const supportServices: ManagementCard[] = [
  {
    title: '혈당관리 지원 약국',
    description: '(사)한국당뇨협회와 함께 하는 혈당관리 약국 서비스',
    icon: '🩸',
    href: GLUCOSEVIEW_URL,
    status: '참여 가능',
    statusType: 'ready',
    external: true,
  },
];

/**
 * PharmacyDashboard - 약국 연결 상태의 경영 허브
 */
function PharmacyDashboard() {
  const { user } = useAuth();
  const testUser = user as TestUser | null;

  const userFeeCategory: PharmacistFeeCategory =
    testUser?.role === 'pharmacist' ? 'B1_pharmacy_employee' : 'A1_pharmacy_owner';
  const isOwner = isPharmacyOwner(userFeeCategory);
  const roleLabel = isOwner ? '개설약사' : '근무약사';

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        {/* PharmacySummary */}
        <div style={styles.summary}>
          <div style={styles.summaryLeft}>
            <h1 style={styles.pharmacyName}>{user?.name || '약국'}님의 약국</h1>
            <p style={styles.pharmacyAddr}>약국 정보를 불러올 수 없습니다</p>
          </div>
          <div style={styles.summaryRight}>
            <span style={styles.statusBadge}>운영중</span>
            <span style={styles.roleBadge}>{roleLabel}</span>
            <span style={styles.userName}>{user?.name || '사용자'}님</span>
          </div>
        </div>

        {/* ActiveServicesSection */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>경영 서비스</h2>
          <div style={styles.cardGrid}>
            {activeServices
              .filter((s) => !s.ownerOnly || isOwner)
              .map((card) => (
                <ServiceCard key={card.title} card={card} />
              ))}
          </div>
        </section>

        {/* AvailableServicesSection */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>추가 서비스</h2>
          <div style={styles.cardGrid}>
            {availableServices
              .filter((s) => !s.ownerOnly || isOwner)
              .map((card) => (
                <ServiceCard key={card.title} card={card} />
              ))}
          </div>
        </section>

        {/* 약국 경영 지원 서비스 (외부) */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>약국 경영 지원 서비스</h2>
          <div style={styles.cardGrid}>
            {supportServices.map((card) => (
              <ServiceCard key={card.title} card={card} />
            ))}
          </div>
        </section>

        {/* PharmacyUtilitySection */}
        <div style={styles.utility}>
          <p style={styles.utilityText}>
            {isOwner
              ? '약국 운영에 필요한 서비스를 한 곳에서 관리하세요. 향후 추가 서비스가 제공됩니다.'
              : '약국 운영 관련 서비스를 확인할 수 있습니다. 일부 기능은 개설약사만 접근 가능합니다.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ card }: { card: ManagementCard }) {
  const statusStyle = card.statusType === 'active'
    ? styles.cardStatusActive
    : card.statusType === 'ready'
      ? styles.cardStatusReady
      : styles.cardStatusComing;

  const isComing = card.statusType === 'coming';

  function handleClick() {
    if (isComing) return;
    if (card.external) {
      window.open(card.href, '_blank', 'noopener,noreferrer');
    }
    // 내부 링크는 Link 컴포넌트가 처리
  }

  const cardContent = (
    <>
      <div style={styles.cardHeader}>
        <span style={styles.cardIcon}>{card.icon}</span>
        <span style={{ ...styles.cardStatus, ...statusStyle }}>{card.status}</span>
      </div>
      <h3 style={styles.cardTitle}>{card.title}</h3>
      <p style={styles.cardDesc}>{card.description}</p>
      {!isComing ? (
        <span style={styles.cardCta}>
          {card.external ? '새 창으로 열기 ↗' : '바로가기 →'}
        </span>
      ) : (
        <span style={styles.cardCtaDisabled}>준비중</span>
      )}
    </>
  );

  // 외부 링크 또는 비활성 카드
  if (card.external || isComing) {
    return (
      <div
        style={{
          ...styles.card,
          ...(isComing ? styles.cardDisabled : { cursor: 'pointer' }),
        }}
        onClick={handleClick}
      >
        {cardContent}
      </div>
    );
  }

  // 내부 링크 카드
  return (
    <Link to={card.href} style={{ textDecoration: 'none' }}>
      <div style={{ ...styles.card, cursor: 'pointer' }}>
        {cardContent}
      </div>
    </Link>
  );
}

export default PharmacyPage;

const styles: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: colors.neutral50,
  },
  wrapper: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: `0 ${spacing.lg} ${spacing.xl}`,
  },

  // PharmacySummary
  summary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${spacing.xl} 0 ${spacing.lg}`,
    borderBottom: `1px solid ${colors.neutral200}`,
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryLeft: {},
  pharmacyName: {
    ...typography.headingL,
    margin: 0,
    color: colors.neutral900,
  },
  pharmacyAddr: {
    margin: `${spacing.xs} 0 0`,
    fontSize: '0.875rem',
    color: colors.neutral500,
  },
  summaryRight: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusBadge: {
    padding: `2px ${spacing.sm}`,
    fontSize: '0.75rem',
    fontWeight: 600,
    borderRadius: borderRadius.sm,
    backgroundColor: '#ecfdf5',
    color: '#059669',
  },
  roleBadge: {
    padding: `2px ${spacing.sm}`,
    fontSize: '0.75rem',
    fontWeight: 600,
    borderRadius: borderRadius.sm,
    backgroundColor: `${colors.primary}10`,
    color: colors.primary,
  },
  userName: {
    fontSize: '0.875rem',
    color: colors.neutral700,
  },

  // Section
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: colors.neutral800,
    margin: `0 0 ${spacing.md}`,
  },

  // Card Grid
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: spacing.md,
  },

  // ServiceCard
  card: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: '1.5rem',
  },
  cardStatus: {
    fontSize: '0.7rem',
    fontWeight: 600,
    padding: `2px ${spacing.sm}`,
    borderRadius: borderRadius.sm,
  },
  cardStatusActive: {
    backgroundColor: '#ecfdf5',
    color: '#059669',
  },
  cardStatusReady: {
    backgroundColor: `${colors.primary}10`,
    color: colors.primary,
  },
  cardStatusComing: {
    backgroundColor: colors.neutral100,
    color: colors.neutral400,
  },
  cardTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.neutral900,
  },
  cardDesc: {
    margin: 0,
    fontSize: '0.875rem',
    color: colors.neutral500,
    lineHeight: 1.5,
  },
  cardCta: {
    alignSelf: 'flex-start',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.primary,
    textDecoration: 'none',
    marginTop: spacing.xs,
  },
  cardCtaDisabled: {
    alignSelf: 'flex-start',
    fontSize: '0.875rem',
    color: colors.neutral400,
    marginTop: spacing.xs,
  },

  // Utility
  utility: {
    padding: spacing.md,
    backgroundColor: colors.neutral100,
    borderRadius: borderRadius.md,
  },
  utilityText: {
    margin: 0,
    fontSize: '0.813rem',
    color: colors.neutral600,
    lineHeight: 1.5,
  },
};

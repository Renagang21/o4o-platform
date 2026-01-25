/**
 * PharmacyPage - 약국 경영지원 첫 화면
 *
 * WO-KPA-PHARMACY-MANAGEMENT-V1
 * - 약국 개설자/근무약사 공통 화면 (역할에 따라 노출 정보 다름)
 * - 단일 URL / 단일 화면 / 역할별 레이어 분리
 *
 * 카드 구성:
 * 1. B2B 구매 - 공급자/상품 접근
 * 2. 내 약국 몰 - B2C 몰, 태블릿, 키오스크 관리
 * 3. 내 약국 서비스 - LMS, 사이니지, 포럼
 * 4. 약국 운영 요약 (개설약사 전용)
 */

import { Link } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../../styles/theme';
import { useAuth, TestUser } from '../../contexts/AuthContext';
import { isPharmacyOwner, PharmacistFeeCategory } from '../../types';

// Mock 약국 데이터
const mockPharmacyData = {
  name: '강남중앙약국',
  ownerName: '홍길동',
  address: '서울시 강남구 역삼동 123-45',
  b2b: {
    supplierCount: 12,
    recentProducts: [
      { id: 1, name: '비타민C 1000mg', supplier: '대웅제약' },
      { id: 2, name: '오메가3', supplier: '종근당건강' },
    ],
    pendingOrders: 3,
  },
  mall: {
    status: 'active',
    lastUpdated: '2025-01-20',
    productCount: 156,
    tabletConnected: true,
    kioskConnected: false,
  },
  services: {
    lms: { enrolled: 2, completed: 5, inProgress: 1 },
    signage: { screens: 2, lastSync: '2025-01-24' },
    forum: { recentPosts: 3, myPosts: 12 },
  },
  summary: {
    monthlyRevenue: 45000000,
    monthlyPurchase: 32000000,
    groupBuyParticipation: 2,
  },
};

export function PharmacyPage() {
  const { user } = useAuth();
  const testUser = user as TestUser | null;

  // 역할 판단: 약국 개설자 vs 근무약사
  // 실제로는 PharmacistFeeCategory 기반으로 판단
  // 데모에서는 role 기반 간이 판단
  const userFeeCategory: PharmacistFeeCategory =
    testUser?.role === 'pharmacist' ? 'B1_pharmacy_employee' : 'A1_pharmacy_owner';
  const isOwner = isPharmacyOwner(userFeeCategory);

  // 표시 정보
  const pharmacy = mockPharmacyData;
  const roleLabel = isOwner ? '개설약사' : '근무약사';

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.pharmacyInfo}>
            <h1 style={styles.pharmacyName}>{pharmacy.name}</h1>
            <span style={styles.subLabel}>· 운영 화면</span>
          </div>
          <div style={styles.roleInfo}>
            <span style={styles.roleBadge}>{roleLabel}</span>
            <span style={styles.userName}>{user?.name || '사용자'}님</span>
          </div>
        </div>
      </header>

      {/* 카드 그리드 */}
      <div style={styles.cardGrid}>
        {/* ① B2B 구매 */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>🏭</span>
            <div>
              <h2 style={styles.cardTitle}>B2B 구매</h2>
              <p style={styles.cardSubtitle}>내 약국에서 이용 가능한 공급자 및 상품</p>
            </div>
          </div>
          <div style={styles.cardBody}>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>이용 가능 공급자</span>
              <span style={styles.statValue}>{pharmacy.b2b.supplierCount}곳</span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>추천 상품</span>
              <span style={styles.statValue}>{pharmacy.b2b.recentProducts.length}개</span>
            </div>
            {isOwner && pharmacy.b2b.pendingOrders > 0 && (
              <div style={styles.alertRow}>
                <span style={styles.alertBadge}>{pharmacy.b2b.pendingOrders}</span>
                <span style={styles.alertText}>진행중 주문</span>
              </div>
            )}
          </div>
          <div style={styles.cardFooter}>
            <Link to="/demo/groupbuy" style={styles.cardLink}>
              {isOwner ? '구매하기 →' : '상품 보기 →'}
            </Link>
          </div>
        </div>

        {/* ② 내 약국 몰 */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>🏪</span>
            <div>
              <h2 style={styles.cardTitle}>내 약국 몰</h2>
              <p style={styles.cardSubtitle}>고객에게 노출되는 약국 화면 관리</p>
            </div>
          </div>
          <div style={styles.cardBody}>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>운영 상태</span>
              <span style={{
                ...styles.statusBadge,
                backgroundColor: pharmacy.mall.status === 'active' ? '#dcfce7' : '#fee2e2',
                color: pharmacy.mall.status === 'active' ? '#166534' : '#991b1b',
              }}>
                {pharmacy.mall.status === 'active' ? '운영중' : '중지'}
              </span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>등록 상품</span>
              <span style={styles.statValue}>{pharmacy.mall.productCount}개</span>
            </div>
            <div style={styles.deviceRow}>
              <span style={{
                ...styles.deviceBadge,
                opacity: pharmacy.mall.tabletConnected ? 1 : 0.4,
              }}>📱 태블릿</span>
              <span style={{
                ...styles.deviceBadge,
                opacity: pharmacy.mall.kioskConnected ? 1 : 0.4,
              }}>🖥️ 키오스크</span>
            </div>
          </div>
          <div style={styles.cardFooter}>
            <Link to="/pharmacy/mall" style={styles.cardLink}>
              진열 관리 →
            </Link>
          </div>
        </div>

        {/* ③ 내 약국 서비스 */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>🔧</span>
            <div>
              <h2 style={styles.cardTitle}>내 약국 서비스</h2>
              <p style={styles.cardSubtitle}>약국 운영을 위한 연결 서비스</p>
            </div>
          </div>
          <div style={styles.cardBody}>
            {/* LMS */}
            <div style={styles.serviceItem}>
              <div style={styles.serviceHeader}>
                <span style={styles.serviceIcon}>🎓</span>
                <span style={styles.serviceName}>교육 (LMS)</span>
              </div>
              <div style={styles.serviceStats}>
                <span>수강중 {pharmacy.services.lms.inProgress}</span>
                <span>·</span>
                <span>수료 {pharmacy.services.lms.completed}</span>
              </div>
            </div>

            {/* 사이니지 */}
            <div style={styles.serviceItem}>
              <div style={styles.serviceHeader}>
                <span style={styles.serviceIcon}>📺</span>
                <span style={styles.serviceName}>디지털 사이니지</span>
              </div>
              <div style={styles.serviceStats}>
                <span>연결 화면 {pharmacy.services.signage.screens}대</span>
              </div>
            </div>

            {/* 포럼 */}
            <div style={styles.serviceItem}>
              <div style={styles.serviceHeader}>
                <span style={styles.serviceIcon}>💬</span>
                <span style={styles.serviceName}>포럼</span>
              </div>
              <div style={styles.serviceStats}>
                <span>내 글 {pharmacy.services.forum.myPosts}</span>
              </div>
            </div>
          </div>
          <div style={styles.cardFooter}>
            <Link to="/demo/lms" style={styles.cardLinkSecondary}>교육</Link>
            <Link to="/pharmacy/signage" style={styles.cardLinkSecondary}>사이니지</Link>
            <Link to="/demo/forum" style={styles.cardLinkSecondary}>포럼</Link>
          </div>
        </div>

        {/* ④ 약국 운영 요약 (개설약사 전용) */}
        {isOwner && (
          <div style={{ ...styles.card, ...styles.ownerCard }}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>📊</span>
              <div>
                <h2 style={styles.cardTitle}>약국 운영 요약</h2>
                <p style={styles.cardSubtitle}>이번 달 운영 현황</p>
              </div>
              <span style={styles.ownerBadge}>개설약사 전용</span>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.summaryGrid}>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>매출</span>
                  <span style={styles.summaryValue}>
                    {(pharmacy.summary.monthlyRevenue / 10000).toLocaleString()}만원
                  </span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>구매</span>
                  <span style={styles.summaryValue}>
                    {(pharmacy.summary.monthlyPurchase / 10000).toLocaleString()}만원
                  </span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>공동구매</span>
                  <span style={styles.summaryValue}>
                    {pharmacy.summary.groupBuyParticipation}건 참여
                  </span>
                </div>
              </div>
            </div>
            <div style={styles.cardFooter}>
              <Link to="/pharmacy/analytics" style={styles.cardLink}>
                상세 보기 →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 안내 문구 */}
      <div style={styles.notice}>
        <span style={styles.noticeIcon}>ℹ️</span>
        <span style={styles.noticeText}>
          {isOwner
            ? '약국 운영에 필요한 모든 기능을 한 곳에서 관리하세요.'
            : '약국 운영 관련 기능을 확인하고 관리할 수 있습니다. 일부 기능은 개설약사만 접근 가능합니다.'}
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 16px 48px',
  },
  header: {
    marginBottom: '32px',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  pharmacyInfo: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  pharmacyName: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  subLabel: {
    fontSize: '1rem',
    color: colors.neutral500,
  },
  roleInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  roleBadge: {
    padding: '6px 12px',
    backgroundColor: colors.primary + '15',
    color: colors.primary,
    borderRadius: '16px',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  userName: {
    fontSize: '0.9375rem',
    color: colors.neutral700,
  },

  // Card Grid
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.md,
    border: `1px solid ${colors.gray200}`,
    overflow: 'hidden',
  },
  ownerCard: {
    borderColor: colors.primary,
    borderWidth: '2px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '20px 20px 0',
    position: 'relative',
  },
  cardIcon: {
    fontSize: '28px',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 4px',
  },
  cardSubtitle: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
    margin: 0,
  },
  ownerBadge: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    padding: '4px 8px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '0.6875rem',
    fontWeight: 600,
  },
  cardBody: {
    padding: '16px 20px',
  },
  cardFooter: {
    padding: '12px 20px 20px',
    display: 'flex',
    gap: '12px',
  },
  cardLink: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.primary,
    textDecoration: 'none',
  },
  cardLinkSecondary: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: colors.neutral600,
    textDecoration: 'none',
    padding: '6px 12px',
    backgroundColor: colors.gray100,
    borderRadius: '6px',
  },

  // Stats
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: `1px solid ${colors.gray100}`,
  },
  statLabel: {
    fontSize: '0.875rem',
    color: colors.neutral600,
  },
  statValue: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: colors.neutral900,
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  alertRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
    padding: '10px 12px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
  },
  alertBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '22px',
    height: '22px',
    backgroundColor: '#f59e0b',
    color: colors.white,
    borderRadius: '50%',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  alertText: {
    fontSize: '0.8125rem',
    color: '#92400e',
    fontWeight: 500,
  },
  deviceRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },
  deviceBadge: {
    padding: '6px 10px',
    backgroundColor: colors.gray100,
    borderRadius: '6px',
    fontSize: '0.75rem',
    color: colors.neutral700,
  },

  // Services
  serviceItem: {
    padding: '10px 0',
    borderBottom: `1px solid ${colors.gray100}`,
  },
  serviceHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  serviceIcon: {
    fontSize: '16px',
  },
  serviceName: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.neutral800,
  },
  serviceStats: {
    display: 'flex',
    gap: '8px',
    fontSize: '0.75rem',
    color: colors.neutral500,
    paddingLeft: '24px',
  },

  // Summary (owner only)
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 8px',
    backgroundColor: colors.gray100,
    borderRadius: '8px',
  },
  summaryLabel: {
    fontSize: '0.75rem',
    color: colors.neutral500,
    marginBottom: '4px',
  },
  summaryValue: {
    fontSize: '1rem',
    fontWeight: 700,
    color: colors.primary,
  },

  // Notice
  notice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '16px 20px',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    marginTop: '8px',
  },
  noticeIcon: {
    fontSize: '16px',
    flexShrink: 0,
  },
  noticeText: {
    fontSize: '0.8125rem',
    color: colors.neutral600,
    lineHeight: 1.5,
  },
};

export default PharmacyPage;

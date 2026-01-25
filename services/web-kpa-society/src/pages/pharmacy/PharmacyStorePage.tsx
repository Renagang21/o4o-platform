/**
 * PharmacyStorePage - 내 약국 몰 진열/상태 화면
 *
 * WO-KPA-PHARMACY-DEPTH-V1
 * - "우리 약국이 고객에게 어떻게 보이고 있는가"를 한 눈에 확인
 * - B2C 몰, 태블릿, 키오스크 상태 표시
 * - 상품 CRUD, 디자인/편집 UI는 제외
 */

import { Link } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../../styles/theme';
import { useAuth, TestUser } from '../../contexts/AuthContext';
import { isPharmacyOwner, PharmacistFeeCategory } from '../../types';

// Mock 몰 상태 데이터
const mockStoreStatus = {
  mall: {
    status: 'active',
    lastUpdated: '2025-01-20 14:32',
    productCount: 156,
    activePromotions: 3,
    todayOrders: 12,
    weeklyRevenue: 2450000,
  },
  tablet: {
    connected: true,
    deviceName: '갤럭시탭 S9',
    lastSync: '2025-01-24 09:15',
    batteryLevel: 78,
    displayMode: 'catalog',
  },
  kiosk: {
    connected: false,
    deviceName: null,
    lastSync: null,
  },
};

// Mock 약국 정보
const mockPharmacy = {
  name: '강남중앙약국',
};

export function PharmacyStorePage() {
  const { user } = useAuth();
  const testUser = user as TestUser | null;

  const userFeeCategory: PharmacistFeeCategory =
    testUser?.role === 'pharmacist' ? 'B1_pharmacy_employee' : 'A1_pharmacy_owner';
  const isOwner = isPharmacyOwner(userFeeCategory);
  const roleLabel = isOwner ? '개설약사' : '근무약사';

  const store = mockStoreStatus;

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/pharmacy" style={styles.backLink}>← 돌아가기</Link>
          <div style={styles.headerMain}>
            <div style={styles.pharmacyInfo}>
              <h1 style={styles.pharmacyName}>{mockPharmacy.name}</h1>
              <span style={styles.subLabel}>· 내 약국 몰</span>
            </div>
            <div style={styles.roleInfo}>
              <span style={styles.roleBadge}>{roleLabel}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 채널 상태 그리드 */}
      <div style={styles.channelGrid}>
        {/* B2C 몰 상태 */}
        <div style={styles.channelCard}>
          <div style={styles.channelHeader}>
            <div style={styles.channelIcon}>🛒</div>
            <div style={styles.channelTitleGroup}>
              <h2 style={styles.channelTitle}>B2C 몰</h2>
              <span style={{
                ...styles.channelStatus,
                backgroundColor: store.mall.status === 'active' ? '#dcfce7' : '#fef3c7',
                color: store.mall.status === 'active' ? '#166534' : '#92400e',
              }}>
                {store.mall.status === 'active' ? '운영중' : '일시중지'}
              </span>
            </div>
          </div>
          <div style={styles.channelBody}>
            <div style={styles.statGrid}>
              <div style={styles.stat}>
                <span style={styles.statValue}>{store.mall.productCount}</span>
                <span style={styles.statLabel}>등록 상품</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statValue}>{store.mall.activePromotions}</span>
                <span style={styles.statLabel}>진행 프로모션</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statValue}>{store.mall.todayOrders}</span>
                <span style={styles.statLabel}>오늘 주문</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statValue}>
                  {(store.mall.weeklyRevenue / 10000).toLocaleString()}만
                </span>
                <span style={styles.statLabel}>주간 매출</span>
              </div>
            </div>
            <div style={styles.channelMeta}>
              <span style={styles.metaLabel}>최근 수정</span>
              <span style={styles.metaValue}>{store.mall.lastUpdated}</span>
            </div>
          </div>
          <div style={styles.channelFooter}>
            <button style={styles.primaryButton}>
              {isOwner ? '몰 관리하기' : '상태 보기'}
            </button>
          </div>
        </div>

        {/* 태블릿 상태 */}
        <div style={styles.channelCard}>
          <div style={styles.channelHeader}>
            <div style={styles.channelIcon}>📱</div>
            <div style={styles.channelTitleGroup}>
              <h2 style={styles.channelTitle}>태블릿</h2>
              <span style={{
                ...styles.channelStatus,
                backgroundColor: store.tablet.connected ? '#dcfce7' : '#fee2e2',
                color: store.tablet.connected ? '#166534' : '#991b1b',
              }}>
                {store.tablet.connected ? '연결됨' : '연결안됨'}
              </span>
            </div>
          </div>
          <div style={styles.channelBody}>
            {store.tablet.connected ? (
              <>
                <div style={styles.deviceInfo}>
                  <div style={styles.deviceRow}>
                    <span style={styles.deviceLabel}>기기</span>
                    <span style={styles.deviceValue}>{store.tablet.deviceName}</span>
                  </div>
                  <div style={styles.deviceRow}>
                    <span style={styles.deviceLabel}>배터리</span>
                    <span style={styles.deviceValue}>{store.tablet.batteryLevel}%</span>
                  </div>
                  <div style={styles.deviceRow}>
                    <span style={styles.deviceLabel}>표시 모드</span>
                    <span style={styles.deviceValue}>
                      {store.tablet.displayMode === 'catalog' ? '카탈로그' : '프로모션'}
                    </span>
                  </div>
                </div>
                <div style={styles.channelMeta}>
                  <span style={styles.metaLabel}>최근 동기화</span>
                  <span style={styles.metaValue}>{store.tablet.lastSync}</span>
                </div>
              </>
            ) : (
              <div style={styles.disconnectedMessage}>
                <span style={styles.disconnectedIcon}>📴</span>
                <span style={styles.disconnectedText}>연결된 태블릿이 없습니다</span>
              </div>
            )}
          </div>
          <div style={styles.channelFooter}>
            <button style={store.tablet.connected ? styles.primaryButton : styles.disabledButton}>
              {store.tablet.connected ? '화면 관리' : '기기 연결'}
            </button>
          </div>
        </div>

        {/* 키오스크 상태 */}
        <div style={styles.channelCard}>
          <div style={styles.channelHeader}>
            <div style={styles.channelIcon}>🖥️</div>
            <div style={styles.channelTitleGroup}>
              <h2 style={styles.channelTitle}>키오스크</h2>
              <span style={{
                ...styles.channelStatus,
                backgroundColor: store.kiosk.connected ? '#dcfce7' : '#fee2e2',
                color: store.kiosk.connected ? '#166534' : '#991b1b',
              }}>
                {store.kiosk.connected ? '연결됨' : '연결안됨'}
              </span>
            </div>
          </div>
          <div style={styles.channelBody}>
            {store.kiosk.connected ? (
              <>
                <div style={styles.deviceInfo}>
                  <div style={styles.deviceRow}>
                    <span style={styles.deviceLabel}>기기</span>
                    <span style={styles.deviceValue}>{store.kiosk.deviceName}</span>
                  </div>
                </div>
                <div style={styles.channelMeta}>
                  <span style={styles.metaLabel}>최근 동기화</span>
                  <span style={styles.metaValue}>{store.kiosk.lastSync}</span>
                </div>
              </>
            ) : (
              <div style={styles.disconnectedMessage}>
                <span style={styles.disconnectedIcon}>📴</span>
                <span style={styles.disconnectedText}>연결된 키오스크가 없습니다</span>
                {isOwner && (
                  <span style={styles.disconnectedHint}>키오스크 도입 문의: 1588-1234</span>
                )}
              </div>
            )}
          </div>
          <div style={styles.channelFooter}>
            <button style={store.kiosk.connected ? styles.primaryButton : styles.disabledButton}>
              {store.kiosk.connected ? '화면 관리' : '도입 문의'}
            </button>
          </div>
        </div>
      </div>

      {/* 안내 */}
      <div style={styles.notice}>
        <span style={styles.noticeIcon}>ℹ️</span>
        <span style={styles.noticeText}>
          {isOwner
            ? '각 채널의 진열 상태를 확인하고 관리할 수 있습니다.'
            : '약국의 채널 운영 상태를 확인할 수 있습니다. 진열 관리는 개설약사에게 문의하세요.'}
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    marginBottom: '24px',
  },
  headerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  backLink: {
    color: colors.primary,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  headerMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pharmacyInfo: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  pharmacyName: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  subLabel: {
    fontSize: '1rem',
    color: colors.neutral500,
    fontWeight: 500,
  },
  roleInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  roleBadge: {
    padding: '4px 12px',
    backgroundColor: colors.primary + '15',
    color: colors.primary,
    borderRadius: '16px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },

  // Channel Grid
  channelGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  channelCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.md,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  channelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  channelIcon: {
    fontSize: '32px',
  },
  channelTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  channelTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  channelStatus: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  channelBody: {
    padding: '20px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  // Stats
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
  },
  statValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: colors.neutral900,
  },
  statLabel: {
    fontSize: '0.75rem',
    color: colors.neutral500,
    marginTop: '4px',
  },

  // Device Info
  deviceInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  deviceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceLabel: {
    fontSize: '0.875rem',
    color: colors.neutral500,
  },
  deviceValue: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral800,
  },

  // Disconnected
  disconnectedMessage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    textAlign: 'center',
    flex: 1,
  },
  disconnectedIcon: {
    fontSize: '32px',
    marginBottom: '8px',
    opacity: 0.5,
  },
  disconnectedText: {
    fontSize: '0.875rem',
    color: colors.neutral500,
  },
  disconnectedHint: {
    fontSize: '0.75rem',
    color: colors.neutral400,
    marginTop: '8px',
  },

  // Meta
  channelMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: `1px solid ${colors.neutral100}`,
    marginTop: 'auto',
  },
  metaLabel: {
    fontSize: '0.75rem',
    color: colors.neutral400,
  },
  metaValue: {
    fontSize: '0.75rem',
    color: colors.neutral600,
  },

  // Footer
  channelFooter: {
    padding: '16px 20px',
    borderTop: `1px solid ${colors.neutral100}`,
    backgroundColor: colors.gray100 + '50',
  },
  primaryButton: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  disabledButton: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: colors.neutral200,
    color: colors.neutral500,
    border: 'none',
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'not-allowed',
  },

  // Notice
  notice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '16px 20px',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
  },
  noticeIcon: {
    fontSize: '16px',
    flexShrink: 0,
  },
  noticeText: {
    fontSize: '0.875rem',
    color: colors.neutral600,
    lineHeight: 1.5,
  },
};

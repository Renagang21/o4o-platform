/**
 * SellerDashboardPage - 판매자 대시보드
 */

import { Link } from 'react-router-dom';

export function SellerDashboardPage() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>판매자 대시보드</h1>
        <p style={styles.subtitle}>채널별 판매 현황과 운영 상태를 확인하세요</p>
      </div>

      {/* 통계 카드 */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🛒</div>
          <div style={styles.statValue}>89</div>
          <div style={styles.statLabel}>오늘 주문</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📊</div>
          <div style={styles.statValue}>345</div>
          <div style={styles.statLabel}>판매중 상품</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>⭐</div>
          <div style={styles.statValue}>4.8</div>
          <div style={styles.statLabel}>평균 평점</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>💰</div>
          <div style={styles.statValue}>₩5.6M</div>
          <div style={styles.statLabel}>이번달 매출</div>
        </div>
      </div>

      {/* 채널 현황 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>채널별 현황</h2>
        <div style={styles.channelGrid}>
          <div style={styles.channelCard}>
            <div style={styles.channelHeader}>
              <span style={styles.channelIcon}>🏪</span>
              <span style={styles.channelName}>네이버 스토어</span>
            </div>
            <div style={styles.channelStats}>
              <div style={styles.channelStat}>
                <span style={styles.channelStatValue}>42</span>
                <span style={styles.channelStatLabel}>오늘 주문</span>
              </div>
              <div style={styles.channelStat}>
                <span style={styles.channelStatValue}>₩2.1M</span>
                <span style={styles.channelStatLabel}>매출</span>
              </div>
            </div>
          </div>
          <div style={styles.channelCard}>
            <div style={styles.channelHeader}>
              <span style={styles.channelIcon}>🛍️</span>
              <span style={styles.channelName}>쿠팡</span>
            </div>
            <div style={styles.channelStats}>
              <div style={styles.channelStat}>
                <span style={styles.channelStatValue}>31</span>
                <span style={styles.channelStatLabel}>오늘 주문</span>
              </div>
              <div style={styles.channelStat}>
                <span style={styles.channelStatValue}>₩1.8M</span>
                <span style={styles.channelStatLabel}>매출</span>
              </div>
            </div>
          </div>
          <div style={styles.channelCard}>
            <div style={styles.channelHeader}>
              <span style={styles.channelIcon}>📦</span>
              <span style={styles.channelName}>11번가</span>
            </div>
            <div style={styles.channelStats}>
              <div style={styles.channelStat}>
                <span style={styles.channelStatValue}>16</span>
                <span style={styles.channelStatLabel}>오늘 주문</span>
              </div>
              <div style={styles.channelStat}>
                <span style={styles.channelStatValue}>₩1.7M</span>
                <span style={styles.channelStatLabel}>매출</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 퀵 메뉴 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>빠른 관리</h2>
        <div style={styles.menuGrid}>
          <Link to="/seller/orders" style={styles.menuCard}>
            <span style={styles.menuIcon}>📋</span>
            <span style={styles.menuLabel}>주문 관리</span>
          </Link>
          <Link to="/seller/products" style={styles.menuCard}>
            <span style={styles.menuIcon}>📦</span>
            <span style={styles.menuLabel}>상품 관리</span>
          </Link>
          <Link to="/seller/channels" style={styles.menuCard}>
            <span style={styles.menuIcon}>🔗</span>
            <span style={styles.menuLabel}>채널 연동</span>
          </Link>
          <Link to="/seller/reviews" style={styles.menuCard}>
            <span style={styles.menuIcon}>💬</span>
            <span style={styles.menuLabel}>리뷰 관리</span>
          </Link>
          <Link to="/seller/settlement" style={styles.menuCard}>
            <span style={styles.menuIcon}>💳</span>
            <span style={styles.menuLabel}>정산 내역</span>
          </Link>
          <Link to="/seller/analytics" style={styles.menuCard}>
            <span style={styles.menuIcon}>📈</span>
            <span style={styles.menuLabel}>판매 분석</span>
          </Link>
        </div>
      </div>

      {/* 처리 필요 알림 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>처리 필요</h2>
        <div style={styles.alertList}>
          <div style={styles.alertItem}>
            <span style={{ ...styles.alertBadge, ...styles.alertWarning }}>긴급</span>
            <span style={styles.alertText}>미답변 문의 3건</span>
            <Link to="/seller/inquiries" style={styles.alertLink}>확인하기</Link>
          </div>
          <div style={styles.alertItem}>
            <span style={{ ...styles.alertBadge, ...styles.alertInfo }}>알림</span>
            <span style={styles.alertText}>재고 부족 상품 5개</span>
            <Link to="/seller/products?filter=low-stock" style={styles.alertLink}>확인하기</Link>
          </div>
          <div style={styles.alertItem}>
            <span style={{ ...styles.alertBadge, ...styles.alertInfo }}>알림</span>
            <span style={styles.alertText}>새 리뷰 12건</span>
            <Link to="/seller/reviews" style={styles.alertLink}>확인하기</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    marginBottom: '40px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#1a1a1a',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748B',
    margin: 0,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
  },
  statIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: PRIMARY_COLOR,
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#64748B',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '20px',
  },
  channelGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  channelCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
  },
  channelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
  },
  channelIcon: {
    fontSize: '24px',
  },
  channelName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  channelStats: {
    display: 'flex',
    gap: '24px',
  },
  channelStat: {
    display: 'flex',
    flexDirection: 'column',
  },
  channelStatValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: PRIMARY_COLOR,
  },
  channelStatLabel: {
    fontSize: '12px',
    color: '#64748B',
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '16px',
  },
  menuCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    textDecoration: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  menuIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  menuLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1a1a1a',
  },
  alertList: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  alertItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: '1px solid #f1f5f9',
    gap: '12px',
  },
  alertBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
  },
  alertWarning: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
  },
  alertInfo: {
    backgroundColor: '#DBEAFE',
    color: PRIMARY_COLOR,
  },
  alertText: {
    flex: 1,
    fontSize: '14px',
    color: '#1a1a1a',
  },
  alertLink: {
    fontSize: '13px',
    color: PRIMARY_COLOR,
    textDecoration: 'none',
    fontWeight: 500,
  },
};

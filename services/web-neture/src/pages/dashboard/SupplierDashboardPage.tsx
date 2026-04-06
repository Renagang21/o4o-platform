/**
 * SupplierDashboardPage - 공급자 대시보드
 */

import { Link } from 'react-router-dom';
import { AiSummaryButton } from '../../components/ai';

export function SupplierDashboardPage() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h1 style={styles.title}>공급자 대시보드</h1>
            <p style={styles.subtitle}>상품 등록 및 주문 현황을 관리하세요</p>
          </div>
          <AiSummaryButton contextLabel="공급자 운영 현황" serviceId="neture" />
        </div>
        <div style={styles.roleGuide}>
          <span style={styles.roleGuideText}>
            이 화면은 공급자의 운영 관리를 위한 공간입니다.
          </span>
          <Link to="/supplier/products" style={styles.roleGuideLink}>
            콘텐츠 반응 및 인사이트 확인하기 →
          </Link>
        </div>
      </div>

      {/* 통계 카드 */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📦</div>
          <div style={styles.statValue}>156</div>
          <div style={styles.statLabel}>등록 상품</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📋</div>
          <div style={styles.statValue}>42</div>
          <div style={styles.statLabel}>진행중 주문</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>✅</div>
          <div style={styles.statValue}>1,234</div>
          <div style={styles.statLabel}>완료 주문</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>💰</div>
          <div style={styles.statValue}>₩8.2M</div>
          <div style={styles.statLabel}>이번달 정산</div>
        </div>
      </div>

      {/* 퀵 메뉴 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>빠른 관리</h2>
        <div style={styles.menuGrid}>
          <Link to="/supplier/products" style={styles.menuCard}>
            <span style={styles.menuIcon}>📦</span>
            <span style={styles.menuLabel}>상품 관리</span>
          </Link>
          <Link to="/supplier/products/new" style={styles.menuCard}>
            <span style={styles.menuIcon}>➕</span>
            <span style={styles.menuLabel}>상품 등록</span>
          </Link>
          <Link to="/supplier/orders" style={styles.menuCard}>
            <span style={styles.menuIcon}>📋</span>
            <span style={styles.menuLabel}>주문 관리</span>
          </Link>
          <Link to="/supplier/orders" style={styles.menuCard}>
            <span style={styles.menuIcon}>🚚</span>
            <span style={styles.menuLabel}>배송 관리</span>
          </Link>
          <Link to="/supplier/orders" style={styles.menuCard}>
            <span style={styles.menuIcon}>💳</span>
            <span style={styles.menuLabel}>정산 내역</span>
          </Link>
          <Link to="/supplier/profile" style={styles.menuCard}>
            <span style={styles.menuIcon}>🏢</span>
            <span style={styles.menuLabel}>업체 정보</span>
          </Link>
        </div>
      </div>

      {/* 대기 중인 주문 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>대기 중인 주문</h2>
        <div style={styles.orderList}>
          <div style={styles.orderItem}>
            <div style={styles.orderInfo}>
              <span style={styles.orderId}>#ORD-2024-0892</span>
              <span style={styles.orderProduct}>K-뷰티 세럼 x 50</span>
            </div>
            <span style={{ ...styles.orderStatus, ...styles.statusPending }}>출고 대기</span>
          </div>
          <div style={styles.orderItem}>
            <div style={styles.orderInfo}>
              <span style={styles.orderId}>#ORD-2024-0891</span>
              <span style={styles.orderProduct}>마스크팩 세트 x 30</span>
            </div>
            <span style={{ ...styles.orderStatus, ...styles.statusPending }}>출고 대기</span>
          </div>
          <div style={styles.orderItem}>
            <div style={styles.orderInfo}>
              <span style={styles.orderId}>#ORD-2024-0890</span>
              <span style={styles.orderProduct}>선크림 x 100</span>
            </div>
            <span style={{ ...styles.orderStatus, ...styles.statusShipping }}>배송 중</span>
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
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  roleGuide: {
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '8px',
  },
  roleGuideText: {
    fontSize: '13px',
    color: '#64748b',
  },
  roleGuideLink: {
    fontSize: '13px',
    color: PRIMARY_COLOR,
    textDecoration: 'none',
    fontWeight: 500,
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
  orderList: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  orderItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #f1f5f9',
  },
  orderInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  orderId: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  orderProduct: {
    fontSize: '13px',
    color: '#64748B',
  },
  orderStatus: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  statusShipping: {
    backgroundColor: '#DBEAFE',
    color: PRIMARY_COLOR,
  },
};

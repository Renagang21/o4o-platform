/**
 * SupplierDashboardPage - K-Cosmetics 공급자 대시보드
 */

import { Link } from 'react-router-dom';

export function SupplierDashboardPage() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>공급자 대시보드</h1>
        <p style={styles.subtitle}>상품 공급 및 파트너 매장 관리</p>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📦</div>
          <div style={styles.statValue}>245</div>
          <div style={styles.statLabel}>등록 상품</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🏪</div>
          <div style={styles.statValue}>32</div>
          <div style={styles.statLabel}>입점 매장</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📋</div>
          <div style={styles.statValue}>58</div>
          <div style={styles.statLabel}>진행중 주문</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>💰</div>
          <div style={styles.statValue}>₩12.8M</div>
          <div style={styles.statLabel}>이번달 매출</div>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>빠른 관리</h2>
        <div style={styles.menuGrid}>
          <Link to="/supplier/products" style={styles.menuCard}>
            <span style={styles.menuIcon}>📦</span>
            <span style={styles.menuLabel}>상품 관리</span>
          </Link>
          <Link to="/supplier/orders" style={styles.menuCard}>
            <span style={styles.menuIcon}>📋</span>
            <span style={styles.menuLabel}>주문 관리</span>
          </Link>
          <Link to="/supplier/stores" style={styles.menuCard}>
            <span style={styles.menuIcon}>🏪</span>
            <span style={styles.menuLabel}>매장 현황</span>
          </Link>
          <Link to="/supplier/settlement" style={styles.menuCard}>
            <span style={styles.menuIcon}>💳</span>
            <span style={styles.menuLabel}>정산 내역</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

const PRIMARY_COLOR = '#FF6B9D';

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
};
